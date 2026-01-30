# app/services/gemini_service.py

import json
import os
import re
import logging
from typing import Any, Dict, List, Optional, Tuple

import anyio

log = logging.getLogger("gemini")

# -------------------------
# Allowed fields
# -------------------------
CNIC_FIELDS = ["cnic", "name", "dob", "issue_date", "expiry_date", "lifetime_validity", "gender", "date_of_birth"]

IBAN_FIELDS = ["iban", "bank_name", "account_title"]

# extracted["fields"]["relative_name"/"relationship"/"relative_cnic"].
REL_FIELDS = ["relative_name", "relationship", "relative_cnic"]

# Extra relationship fields (new) – additive only, doesn't affect existing functionality
REL_EXTRA_FIELDS = [
    "doc_type",
    "customer_name",
    "customer_cnic",
    "father_name",
    "husband_name",
    "spouse_name",
    "relationship_proven",
    "proof_basis",
]


def _get_api_key() -> Optional[str]:
    return os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")


def _guess_mime(file_bytes: bytes, filename: Optional[str] = None) -> str:
    name = (filename or "").lower().strip()
    if name.endswith(".pdf") or file_bytes[:4] == b"%PDF":
        return "application/pdf"
    if name.endswith(".docx"):
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    if name.endswith(".doc"):
        return "application/msword"
    if file_bytes[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if file_bytes[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if name.endswith(".png"):
        return "image/png"
    if name.endswith(".jpg") or name.endswith(".jpeg"):
        return "image/jpeg"
    return "application/octet-stream"


def _extract_full_text(resp: Any) -> str:
    txt = (getattr(resp, "text", None) or "").strip()
    if txt:
        return txt

    parts: List[str] = []
    try:
        cands = getattr(resp, "candidates", []) or []
        for c in cands:
            content = getattr(c, "content", None)
            if not content:
                continue
            for p in (getattr(content, "parts", None) or []):
                t = getattr(p, "text", None)
                if t:
                    parts.append(str(t))
    except Exception:
        pass

    return "\n".join(parts).strip()


def _strip_code_fences(text: str) -> str:
    if not text:
        return ""
    t = text.strip()
    t = re.sub(r"^```json\s*", "", t, flags=re.IGNORECASE).strip()
    t = re.sub(r"^```\s*", "", t).strip()
    t = re.sub(r"\s*```$", "", t).strip()
    return t


def _safe_json_load(text: str) -> Dict[str, Any]:
    """
    More tolerant JSON loader:
    - accepts dict
    - if list returned, picks first dict
    - if extra chatter exists, extracts first {...} or [...] region
    """
    if not text:
        return {}
    t = _strip_code_fences(text).strip()

    # 1) direct parse
    try:
        obj = json.loads(t)
        if isinstance(obj, dict):
            return obj
        if isinstance(obj, list) and obj and isinstance(obj[0], dict):
            return obj[0]
        return {"raw": obj}
    except Exception:
        pass

    # 2) extract first JSON object {...}
    m = re.search(r"\{.*\}", t, flags=re.DOTALL)
    if m:
        try:
            obj = json.loads(m.group(0))
            if isinstance(obj, dict):
                return obj
            if isinstance(obj, list) and obj and isinstance(obj[0], dict):
                return obj[0]
            return {"raw": obj}
        except Exception:
            pass

    # 3) extract first JSON array [...]
    m2 = re.search(r"\[.*\]", t, flags=re.DOTALL)
    if m2:
        try:
            obj = json.loads(m2.group(0))
            if isinstance(obj, list) and obj and isinstance(obj[0], dict):
                return obj[0]
            return {"raw": obj}
        except Exception:
            pass

    return {}


def _looks_truncated_json(text: str) -> bool:
    if not text:
        return True
    t = _strip_code_fences(text)
    if not t.endswith("}"):
        return True
    return t.count("{") != t.count("}")


def _call_gemini_once(
    file_bytes: bytes,
    filename: Optional[str],
    prompt_text: str,
    *,
    max_output_tokens: int = 900,
) -> Tuple[Optional[Dict[str, Any]], str, Optional[str]]:
    api_key = _get_api_key()
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    if not api_key:
        return None, "", "GEMINI_API_KEY (or GOOGLE_API_KEY) is not set"

    try:
        from google import genai
        from google.genai import types
    except Exception as e:
        return None, "", f"Gemini SDK import failed. Install: pip install google-genai. Details: {e}"

    client = genai.Client(api_key=api_key)
    mime = _guess_mime(file_bytes, filename=filename)

    log.info("Gemini model=%s mime=%s file=%s", model, mime, filename or "-")

    file_part = types.Part.from_bytes(data=file_bytes, mime_type=mime)
    cfg = types.GenerateContentConfig(
        response_mime_type="application/json",
        temperature=0.0,
        max_output_tokens=max_output_tokens,
    )
    try:
        resp = client.models.generate_content(
            model=model,
            contents=[file_part, prompt_text],
            config=cfg,
        )
    except Exception as e:
        err_str = str(e).upper()
        if "503" in err_str or "UNAVAILABLE" in err_str or "OVERLOADED" in err_str:
             return None, "", "SERVICE_UNAVAILABLE"
        return None, "", f"Gemini request error: {e}"

    text = _extract_full_text(resp)
    log.info("Gemini Raw Text Response: %s", text)

    data = _safe_json_load(text)

    if data:
        log.info("Gemini parsed keys: %s", list(data.keys()))
    else:
        log.warning("Gemini returned unparseable/empty JSON")

    return (data if data else None), text, None


# =========================================================
# CNIC extraction + tamper check
# =========================================================
def _prompt_cnic_with_tamper_check(id_variant: str) -> str:
    return f"""
Return ONLY ONE-LINE valid JSON. No markdown. No extra text.

You are verifying a Pakistani {id_variant.upper()} image.
Extract ONLY what is clearly readable AND detect tampering/obfuscation.

Tampering includes:
- Photocopy or unoriginal image
- Black marker/ink covering a field (especially name/cnic)
- Blurred/overlaid text, erased area, unnatural patch, mismatched fonts in one field
- Visible editing artifacts

Output schema (one line):
{{"ok":true,
  "confidence":0.0,
  "fields":{{"cnic":null,"name":null,"date_of_birth":null,"gender":null,"issue_date":null,"expiry_date":null,"lifetime_validity":false}},
  "tamper":{{"tampered":false,"reason":null}},
  "notes":[]
}}

Rules:
- Do NOT invent values.
- If any critical field (cnic or name) looks covered/edited, set tamper.tampered=true.
- If tampered, still try to extract other fields but keep null where not readable.
- Dates in DD.MM.YYYY preferred.
- gender: "M" or "F" (or "X" if visible).
- lifetime_validity true if expiry indicates lifetime.
""".strip()


def _normalize_cnic_result(data: Dict[str, Any]) -> Dict[str, Any]:
    fields = data.get("fields") if isinstance(data.get("fields"), dict) else {}
    tamper = data.get("tamper") if isinstance(data.get("tamper"), dict) else {}

    safe_fields = {k: fields.get(k) for k in CNIC_FIELDS}
    safe_tamper = {
        "tampered": bool(tamper.get("tampered", False)),
        "reason": tamper.get("reason"),
    }
    return {
        "ok": bool(data.get("ok", True)),
        "confidence": float(data.get("confidence", 0.0) or 0.0),
        "fields": safe_fields,
        "tamper": safe_tamper,
        "notes": data.get("notes", []) if isinstance(data.get("notes"), list) else [],
    }


def _sync_extract_cnic_with_gemini(file_bytes: bytes, filename: Optional[str], id_variant: str) -> Dict[str, Any]:
    prompt1 = _prompt_cnic_with_tamper_check(id_variant=id_variant)

    data1, text1, err1 = _call_gemini_once(file_bytes, filename, prompt1, max_output_tokens=900)
    if err1:
        return {"ok": False, "error": err1}

    if data1 and not _looks_truncated_json(text1):
        return _normalize_cnic_result(data1)

    prompt2 = (prompt1 + " IMPORTANT: OUTPUT MUST BE SINGLE LINE JSON ONLY.").strip()
    data2, text2, err2 = _call_gemini_once(file_bytes, filename, prompt2, max_output_tokens=1200)
    if err2:
        return {"ok": False, "error": err2}
    if data2:
        return _normalize_cnic_result(data2)

    return {"ok": False, "error": "Gemini returned empty/unparseable JSON"}


async def extract_cnic_with_gemini(
    file_bytes: bytes,
    filename: Optional[str] = None,
    id_variant: str = "cnic",
) -> Dict[str, Any]:
    return await anyio.to_thread.run_sync(_sync_extract_cnic_with_gemini, file_bytes, filename, id_variant)


# =========================================================
# IBAN proof extraction: doc_type + computer-generated requirement
# =========================================================
def _prompt_iban_with_doc_type(
    typed_iban: Optional[str],
    typed_bank_name: Optional[str],
    typed_account_name: Optional[str],
) -> str:
    return f"""
Return ONLY ONE-LINE valid JSON. No markdown. No extra text.

You are verifying a Pakistani IBAN proof document.
Document type MUST be one of:
1) CHEQUE_LEAF
2) ACCOUNT_MAINTENANCE_CERTIFICATE
3) BANK_STATEMENT
If you cannot classify, set doc_type=UNKNOWN.

Tasks:
A) Identify doc_type.
B) Extract ONLY clearly visible:
   - iban (PK.. full; remove spaces/hyphens)
   - bank_name (bank name, not branch)
   - account_title (account holder name)
C) For BANK_STATEMENT and ACCOUNT_MAINTENANCE_CERTIFICATE:
   - Confirm the document includes explicit wording indicating it is computer-generated
     (e.g., "computer generated", "system generated", "no signature required", "printed" or equivalent).
   - If not present, computer_generated_present=false and compliance="FAIL".
D) For CHEQUE_LEAF:
   - computer_generated_present=null (not required)
   - compliance can PASS if fields are readable.

Output schema (one line):
{{"ok":true,
  "doc_type":"CHEQUE_LEAF|ACCOUNT_MAINTENANCE_CERTIFICATE|BANK_STATEMENT|UNKNOWN",
  "confidence":0.0,
  "fields":{{"iban":null,"bank_name":null,"account_title":null}},
  "computer_generated_present":true,
  "computer_generated_phrase":null,
  "compliance":"PASS|REVIEW|FAIL",
  "notes":[]
}}

Rules:
- Do NOT invent values.
- If text is not clearly visible, return null.
- If doc_type is UNKNOWN => compliance="REVIEW".
- If BANK_STATEMENT/AMC missing computer-generated wording => compliance="FAIL".
- If CHEQUE_LEAF and at least iban is visible => compliance can PASS/REVIEW based on completeness.
Typed hints (reference only):
- typed_iban: {typed_iban or "null"}
- typed_bank_name: {typed_bank_name or "null"}
- typed_account_name: {typed_account_name or "null"}
""".strip()


def _normalize_iban_result(data: Dict[str, Any]) -> Dict[str, Any]:
    fields = data.get("fields") if isinstance(data.get("fields"), dict) else {}
    safe_fields = {k: fields.get(k) for k in IBAN_FIELDS}
    return {
        "ok": bool(data.get("ok", True)),
        "doc_type": data.get("doc_type", "UNKNOWN"),
        "confidence": float(data.get("confidence", 0.0) or 0.0),
        "fields": safe_fields,
        "computer_generated_present": data.get("computer_generated_present"),
        "computer_generated_phrase": data.get("computer_generated_phrase"),
        "compliance": data.get("compliance", "REVIEW"),
        "notes": data.get("notes", []) if isinstance(data.get("notes"), list) else [],
    }


def _sync_extract_iban_with_gemini(
    file_bytes: bytes,
    filename: Optional[str],
    typed_iban: Optional[str],
    typed_bank_name: Optional[str],
    typed_account_name: Optional[str],
) -> Dict[str, Any]:
    prompt1 = _prompt_iban_with_doc_type(typed_iban, typed_bank_name, typed_account_name)
    data1, text1, err1 = _call_gemini_once(file_bytes, filename, prompt1, max_output_tokens=1200)
    if err1:
        return {"ok": False, "error": err1}
    if data1 and not _looks_truncated_json(text1):
        return _normalize_iban_result(data1)

    prompt2 = (prompt1 + " IMPORTANT: OUTPUT MUST BE SINGLE LINE JSON ONLY.").strip()
    data2, text2, err2 = _call_gemini_once(file_bytes, filename, prompt2, max_output_tokens=1400)
    if err2:
        return {"ok": False, "error": err2}
    if data2:
        return _normalize_iban_result(data2)

    return {"ok": False, "error": "Gemini returned empty/unparseable JSON"}


async def extract_iban_with_gemini(
    file_bytes: bytes,
    filename: Optional[str] = None,
    typed_iban: Optional[str] = None,
    typed_bank_name: Optional[str] = None,
    typed_account_name: Optional[str] = None,
) -> Dict[str, Any]:
    return await anyio.to_thread.run_sync(
        _sync_extract_iban_with_gemini,
        file_bytes,
        filename,
        typed_iban,
        typed_bank_name,
        typed_account_name,
    )


# =========================================================
# Relationship proof extraction (for when Self Mobile is unchecked)
# =========================================================
def _prompt_relationship_proof(
    typed_relative_name: str,
    typed_relationship: str,
    typed_relative_cnic: str,
    typed_customer_name: str,
    typed_customer_cnic: str,
) -> str:
    return f"""
Analyze this document (Undertaking, Affidavit, handwritten note, or ID).
It is submitted to prove a relationship between:
Customer: "{typed_customer_name}"
Relative: "{typed_relative_name}"
Relationship: "{typed_relationship}"

Task:
1. Look for the names "{typed_customer_name}" and "{typed_relative_name}" (or similar spellings).
2. Look for ANY indication of the relationship "{typed_relationship}" (e.g., "father", "son", "spouse", "wife", "husband", or context implying it).

Return ONE LINE JSON  (no markdown, no explanation):
{{"doc_type": "UNDERTAKING|AFFIDAVIT|ID|OTHER", "names_found": false, "relationship_indicated": false, "customer_name": null, "relative_name": null}}

Rules:
- If BOTH names are roughly present, set "names_found": true.
- If the relationship is mentioned or implied, set "relationship_indicated": true.
- Be LENIENT. Handwritten notes are acceptable.
""".strip()


def _normalize_relationship_result(data: Dict[str, Any]) -> Dict[str, Any]:
    # LENIENT LOGIC:
    # If names are found, we generally PASS. 
    # We want to be non-blocking.
    
    names_found = bool(data.get("names_found", False))
    rel_indicated = bool(data.get("relationship_indicated", False))
    
    # We trust it if names are found.
    # Confidence is high if names found.
    conf = 0.9 if names_found else 0.0
    
    extra = {
        "doc_type": data.get("doc_type", "OTHER"),
        "names_found": names_found,
        "relationship_indicated": rel_indicated,
        "customer_name": data.get("customer_name"),
        "relative_name": data.get("relative_name"),
    }

    return {
        "ok": True, # Always return structure, let caller decide verdict based on confidence
        "confidence": conf,
        "fields": {
            "relative_name": data.get("relative_name"),
            "customer_name": data.get("customer_name")
        },
        "extra": extra,
        "notes": [],
    }


def _sync_extract_relationship_with_gemini(
    file_bytes: bytes,
    filename: Optional[str],
    typed_relative_name: str,
    typed_relationship: str,
    typed_relative_cnic: str,
    typed_customer_name: str,
    typed_customer_cnic: str,
) -> Dict[str, Any]:
    prompt = _prompt_relationship_proof(
        typed_relative_name=typed_relative_name,
        typed_relationship=typed_relationship,
        typed_relative_cnic=typed_relative_cnic,
        typed_customer_name=typed_customer_name,
        typed_customer_cnic=typed_customer_cnic,
    )

    data1, text1, err1 = _call_gemini_once(file_bytes, filename, prompt, max_output_tokens=500)
    if err1:
        return {"ok": False, "error": err1}
    if data1 and not _looks_truncated_json(text1):
        return _normalize_relationship_result(data1)

    prompt2 = ("Return ONE LINE JSON ONLY. Start with { and end with }. No other text. " + prompt).strip()
    data2, text2, err2 = _call_gemini_once(file_bytes, filename, prompt2, max_output_tokens=650)
    if err2:
        return {"ok": False, "error": err2}
    if data2:
        return _normalize_relationship_result(data2)

    return {"ok": False, "error": "Gemini returned empty/unparseable JSON"}


async def extract_relationship_with_gemini(
    file_bytes: bytes,
    filename: Optional[str] = None,
    typed_relative_name: str = "",
    typed_relationship: str = "",
    typed_relative_cnic: str = "",
    typed_customer_name: str = "",
    typed_customer_cnic: str = "",
) -> Dict[str, Any]:
    return await anyio.to_thread.run_sync(
        _sync_extract_relationship_with_gemini,
        file_bytes,
        filename,
        typed_relative_name,
        typed_relationship,
        typed_relative_cnic,
        typed_customer_name,
        typed_customer_cnic,
    )


# Backward-compatible aliases
async def verify_ocr_with_gemini(
    image_bytes: bytes,
    ocr_fields: Dict[str, Any],
    id_variant: str = "cnic",
    filename: Optional[str] = None,
) -> Dict[str, Any]:
    return await extract_cnic_with_gemini(file_bytes=image_bytes, filename=filename, id_variant=id_variant)


async def verify_iban_with_gemini(
    file_bytes: bytes,
    filename: Optional[str] = None,
    typed_iban: Optional[str] = None,
    typed_bank_name: Optional[str] = None,
    typed_account_name: Optional[str] = None,
) -> Dict[str, Any]:
    return await extract_iban_with_gemini(
        file_bytes=file_bytes,
        filename=filename,
        typed_iban=typed_iban,
        typed_bank_name=typed_bank_name,
        typed_account_name=typed_account_name,
    )


def extract_cnic_with_gemini_sync(file_bytes: bytes, filename: str = None, id_variant: str = "cnic") -> Dict[str, Any]:
    return _sync_extract_cnic_with_gemini(file_bytes, filename, id_variant)


def extract_iban_with_gemini_sync(
    file_bytes: bytes,
    filename: str = None,
    typed_iban: str = None,
    typed_bank_name: str = None,
    typed_account_name: str = None,
) -> Dict[str, Any]:
    return _sync_extract_iban_with_gemini(file_bytes, filename, typed_iban, typed_bank_name, typed_account_name)


def extract_relationship_with_gemini_sync(
    file_bytes: bytes,
    filename: str = None,
    typed_relative_name: str = "",
    typed_relationship: str = "",
    typed_relative_cnic: str = "",
    typed_customer_name: str = "",
    typed_customer_cnic: str = "",
) -> Dict[str, Any]:
    return _sync_extract_relationship_with_gemini(
        file_bytes,
        filename,
        typed_relative_name,
        typed_relationship,
        typed_relative_cnic,
        typed_customer_name,
        typed_customer_cnic,
    )
