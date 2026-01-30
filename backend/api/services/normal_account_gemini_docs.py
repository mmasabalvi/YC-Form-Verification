# app/services/account_gemini_docs.py

import os
import re
import json
import logging
from typing import Any, Dict, Optional, Tuple, List
from datetime import datetime, timedelta

import anyio

logger = logging.getLogger("account_docs_gemini")

DEBUG_GEMINI_RAW = os.getenv("DEBUG_GEMINI_RAW", "0") in ("1", "true", "True")
RAW_DUMP_DIR = os.getenv("GEMINI_RAW_DUMP_DIR", os.path.join("app", "reports", "gemini_raw"))


def _get_api_key() -> Optional[str]:
    return os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")


def _guess_mime(b: bytes, filename: Optional[str]) -> str:
    name = (filename or "").lower().strip()
    if name.endswith(".pdf") or b[:4] == b"%PDF":
        return "application/pdf"
    if name.endswith(".docx"):
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    if name.endswith(".doc"):
        return "application/msword"
    if b[:8] == b"\x89PNG\r\n\x1a\n" or name.endswith(".png"):
        return "image/png"
    if b[:3] == b"\xff\xd8\xff" or name.endswith(".jpg") or name.endswith(".jpeg"):
        return "image/jpeg"
    return "application/octet-stream"


def _strip_code_fences(text: str) -> str:
    t = (text or "").strip()
    t = re.sub(r"^```json\s*", "", t, flags=re.IGNORECASE).strip()
    t = re.sub(r"^```\s*", "", t).strip()
    t = re.sub(r"\s*```$", "", t).strip()
    return t


def _sanitize_text(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text)
    text = text.replace(""", '"').replace(""", '"').replace("'", "'")
    return text


def _extract_text(resp: Any) -> str:
    txt = getattr(resp, "text", None)
    if isinstance(txt, str) and txt.strip():
        return txt.strip()

    parts: List[str] = []
    try:
        for c in (getattr(resp, "candidates", []) or []):
            content = getattr(c, "content", None)
            if not content:
                continue
            for p in (getattr(content, "parts", None) or []):
                t = getattr(p, "text", None)
                if isinstance(t, str) and t.strip():
                    parts.append(t)
    except Exception:
        pass

    return "\n".join(parts).strip()


def _repair_json_loose(s: str) -> str:
    if not s:
        return ""
    for _ in range(6):
        s2 = re.sub(r",\s*([}\]])", r"\1", s)
        if s2 == s:
            break
        s = s2
    return s


def _close_unbalanced(s: str) -> str:
    if not s:
        return ""

    s = s.strip()
    if not s.startswith("{"):
        return s

    in_str = False
    esc = False
    depth = 0

    for ch in s:
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
        else:
            if ch == '"':
                in_str = True
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1

    if in_str:
        s += '"'
    if depth > 0:
        s += "}" * depth

    return s


def _first_json_candidate(text: str) -> str:
    s = _sanitize_text(_strip_code_fences(text))
    if not s:
        return ""

    start = s.find("{")
    if start == -1:
        return ""

    in_str = False
    esc = False
    depth = 0
    for i in range(start, len(s)):
        ch = s[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
        else:
            if ch == '"':
                in_str = True
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    return s[start : i + 1]

    tail = s[start:]
    return _close_unbalanced(tail)


def _safe_json(text: str) -> Dict[str, Any]:
    cand = _repair_json_loose(_first_json_candidate(text))
    if not cand:
        return {}

    try:
        obj = json.loads(cand)
        return obj if isinstance(obj, dict) else {}
    except Exception:
        m = re.search(r"\{.*\}", cand, flags=re.DOTALL)
        if not m:
            return {}
        blob = _repair_json_loose(_close_unbalanced(m.group(0)))
        try:
            obj = json.loads(blob)
            return obj if isinstance(obj, dict) else {}
        except Exception:
            return {}


def _dump_raw(doc_kind: str, filename: str, raw_text: str) -> str:
    try:
        os.makedirs(RAW_DUMP_DIR, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        safe_name = re.sub(r"[^a-zA-Z0-9._-]+", "_", filename or "file")
        safe_kind = re.sub(r"[^a-zA-Z0-9._-]+", "_", doc_kind or "unknown")
        out_path = os.path.join(RAW_DUMP_DIR, f"{ts}_{safe_kind}_{safe_name}.txt")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(raw_text or "")
        return out_path
    except Exception as e:
        logger.warning("Failed to dump raw Gemini output: %s", e)
        return ""


def _is_date_within_90_days(date_str: str) -> bool:
    """Check if a date string is within the last 3 months (90 days)."""
    if not date_str:
        return False
    
    # Try multiple date formats
    formats = ["%d-%m-%Y", "%d.%m.%Y", "%Y-%m-%d", "%d/%m/%Y"]
    doc_date = None
    
    for fmt in formats:
        try:
            doc_date = datetime.strptime(date_str.strip(), fmt)
            break
        except ValueError:
            continue
    
    if not doc_date:
        return False
    
    # Check if date is within last 90 days
    today = datetime.now()
    three_months_ago = today - timedelta(days=90)
    
    return three_months_ago <= doc_date <= today


# ---------------------------
# Enhanced Doc-specific prompts
# ---------------------------

def _schema(doc_kind: str) -> str:
    return (
        "Return ONLY a single JSON object. No markdown. No extra text.\n"
        "Do NOT invent. If unreadable/unclear -> set verdict='REVIEW'. Never output FAIL.\n"
        "Keep extracted values short (<= 80 chars). Do NOT include tables/paragraphs/transactions.\n"
        "JSON schema (keys must match exactly):\n"
        "{"
        f"\"ok\":true,"
        f"\"doc_kind\":\"{doc_kind}\","
        "\"verdict\":\"PASS|REVIEW\","
        "\"confidence\":0.0,"
        "\"doc_type_detected\":\"cnic_front|cnic_back|proof_of_address|proof_of_employment|proof_of_income|signature_proof|undertaking|zakat_declaration|bank_statement|cheque_leaf|account_maintenance_certificate|tax_return|next_of_kin_cnic_front|next_of_kin_cnic_back|attorney_cnic_front|attorney_cnic_back|other|unknown\","
        "\"tamper\":false,"
        "\"issues\":[],"
        "\"extracted\":{},"
        "\"admin_report\":{\"title\":\"\",\"issues\":[],\"action_required\":\"\"}"
        "}\n"
    )


def _prompt_for(doc_kind: str, typed: Dict[str, Any]) -> str:
    dk = (doc_kind or "").lower().strip()

    full_name = (typed.get("full_name", "") or "").strip()
    cnic = (typed.get("cnic", "") or "").strip()
    iban = (typed.get("iban", "") or "").strip()
    bank_name = (typed.get("bank_name", "") or "").strip()
    mail_address = (typed.get("mail_address", "") or "").strip()
    employer_name = (typed.get("employer_name", "") or "").strip()
    ntn = (typed.get("ntn", "") or "").strip()
    tax_year = (typed.get("tax_year", "") or "").strip()

    if dk == "cnic_front":
        return (
            _schema("cnic_front")
            + "Task: Verify CNIC FRONT.\n"
            + f"Reference: name='{full_name}', cnic='{cnic}'.\n"
            + "Extract (if visible): name, cnic, dob, issue_date, expiry_date.\n"
            + "If blackout/overwriting/patch/edited area on key fields -> tamper=true and verdict=REVIEW.\n"
            + "If extracted name/cnic mismatches reference -> verdict=REVIEW + issues.\n"
        )

    if dk == "cnic_back":
        return (
            _schema("cnic_back")
            + "Task: Verify CNIC BACK.\n"
            + f"Reference: cnic='{cnic}'.\n"
            + "Extract (if visible): cnic, issue_date, expiry_date.\n"
            + "If document looks like CNIC FRONT or unrelated -> doc_type_detected='other', verdict=REVIEW.\n"
        )

    if dk == "proof_of_address":
        return (
            _schema("proof_of_address")
            + "Task: Verify Proof of Address (MUST be from last 3 months).\n"
            + f"Reference: name='{full_name}', address='{mail_address}'.\n"
            + "Extract ONLY (short): name, address, date.\n"
            + "CRITICAL: Check the document date. If date is older than 90 days from today -> verdict=REVIEW + issue 'Document is older than 3 months'.\n"
            + "If name/address missing or mismatches strongly -> verdict=REVIEW + issues.\n"
        )

    if dk == "proof_of_employment":
        occ = (typed.get("occupation", "") or "").strip().lower()
        return (
            _schema("proof_of_employment")
            + "Task: Verify Proof of Employment (salary certificate OR business letterhead).\n"
            + f"Reference: name='{full_name}', cnic='{cnic}', occupation='{occ}', employer_or_business='{employer_name}'.\n"
            + "Extract ONLY (short): name, cnic(if shown), employer_name/business_name, employment_start_date(if shown), stamp_present(true/false/unknown), signature_present(true/false/unknown).\n"
            + "If unrelated -> doc_type_detected='other', verdict=REVIEW.\n"
        )

    if dk == "proof_of_income":
        return (
            _schema("proof_of_income")
            + "Task: Verify Proof of Income (salary slip/certificate OR business letterhead).\n"
            + f"Reference: name='{full_name}', cnic='{cnic}'.\n"
            + "Extract ONLY: name, cnic, income_amount, document_date, stamp_present(true/false), signature_present(true/false), document_type(salary/business).\n"
            + "For salary docs: Check employer name matches. For business letterhead: Check for proprietor/partner statement.\n"
            + "CRITICAL: MUST have stamp AND signature. Missing either -> verdict=REVIEW.\n"
            + "Name/CNIC mismatch -> verdict=REVIEW.\n"
        )

    if dk == "signature_proof":
        return (
            _schema("signature_proof")
            + "Task: Verify Signature Proof (signature specimen).\n"
            + "Do NOT validate against any name.\n"
            + "Extract ONLY (short): signature_present(true/false/unknown), signature_style(handwritten/digital/unknown).\n"
            + "If document is unrelated -> doc_type_detected='other', verdict=REVIEW.\n"
        )

    if dk == "undertaking":
        return (
            _schema("undertaking")
            + "Task: Verify Undertaking.\n"
            + f"Reference: name='{full_name}', cnic='{cnic}'.\n"
            + "Extract ONLY (short): name, cnic (if visible).\n"
            + "If document is unrelated -> verdict=REVIEW and explain.\n"
        )

    if dk == "zakat_declaration":
        return (
            _schema("zakat_declaration")
            + "Task: Verify Zakat Declaration.\n"
            + f"Reference: name='{full_name}', cnic='{cnic}'.\n"
            + "Extract ONLY (short): name, cnic, declaration_date, format_type(e_stamp_with_qr|stamp_paper|unknown), has_signature(true/false), has_stamp(true/false).\n"
            + "CRITICAL CHECKS:\n"
            + "1. Identify if document uses E-Stamp with QR code OR traditional Stamp Paper.\n"
            + "2. If format_type='stamp_paper' -> add issue: 'Stamp paper format detected. Backside verification required showing stamp details.'\n"
            + "3. Document MUST have signature. If has_signature=false -> verdict=REVIEW + issue.\n"
            + "4. Document MUST have stamp (either e-stamp or physical). If has_stamp=false -> verdict=REVIEW + issue.\n"
            + "If document is unrelated -> verdict=REVIEW and explain.\n"
        )

    if dk == "zakat_declaration_back":
        return (
            _schema("zakat_declaration_back")
            + "Task: Verify BACKSIDE of Zakat Declaration (for stamp paper format only).\n"
            + f"Reference: name='{full_name}', cnic='{cnic}'.\n"
            + "Extract ONLY (short): stamp_visible(true/false), stamp_details(brief description).\n"
            + "If this is the front side or unrelated document -> doc_type_detected='other', verdict=REVIEW.\n"
            + "If stamp not clearly visible -> verdict=REVIEW + issue 'Stamp not clearly visible on backside'.\n"
        )

    if dk == "bank_statement":
        return (
            _schema("bank_statement")
            + "Task: Verify IBAN proof document.\n"
            + f"Reference: name='{full_name}', iban='{iban}', bank='{bank_name}'.\n"
            + "First classify doc_type_detected as one of: bank_statement | cheque_leaf | account_maintenance_certificate | other.\n"
            + "Extract ONLY (short): iban, bank_name, account_title, cnic(if present), computer_generated_phrase_present(true/false/unknown).\n"
            + "Do NOT output transactions, tables, long lines, or any arrays.\n"
            + "Important: If computer_generated wording is missing, that ALONE should NOT cause REVIEW.\n"
            + "If iban/bank mismatch strongly -> verdict=REVIEW + issues.\n"
        )

    if dk == "tax_return":
        return (
            _schema("tax_return")
            + "Task: Verify Tax Return / FBR document.\n"
            + f"Reference: name='{full_name}', cnic='{cnic}', ntn='{ntn}', tax_year='{tax_year}'.\n"
            + "Extract ONLY (short): name, cnic, ntn, tax_year.\n"
            + "If reference ntn or tax_year are empty -> do NOT flag mismatch on those.\n"
            + "If unrelated -> verdict=REVIEW and explain.\n"
        )

    if dk == "next_of_kin_cnic_front":
        nok_name = (typed.get("next_of_kin_name", "") or "").strip()
        nok_cnic = (typed.get("next_of_kin_cnic", "") or "").strip()
        nok_relation = (typed.get("next_of_kin_relation", "") or "").strip()
        return (
            _schema("next_of_kin_cnic_front")
            + "Task: Verify Next of Kin CNIC FRONT.\n"
            + f"Reference: next_of_kin_name='{nok_name}', next_of_kin_cnic='{nok_cnic}', relation='{nok_relation}'.\n"
            + "Extract (if visible): name, cnic, dob, issue_date, expiry_date.\n"
            + "If blackout/overwriting/patch/edited area on key fields -> tamper=true and verdict=REVIEW.\n"
            + "If extracted name/cnic mismatches reference -> verdict=REVIEW + issues.\n"
        )

    if dk == "next_of_kin_cnic_back":
        nok_cnic = (typed.get("next_of_kin_cnic", "") or "").strip()
        return (
            _schema("next_of_kin_cnic_back")
            + "Task: Verify Next of Kin CNIC BACK.\n"
            + f"Reference: next_of_kin_cnic='{nok_cnic}'.\n"
            + "Extract (if visible): cnic, issue_date, expiry_date.\n"
            + "If document looks like CNIC FRONT or unrelated -> doc_type_detected='other', verdict=REVIEW.\n"
        )

    if dk == "attorney_cnic_front":
        attorney_name = (typed.get("attorney_name", "") or "").strip()
        attorney_cnic = (typed.get("attorney_cnic", "") or "").strip()
        attorney_relation = (typed.get("attorney_relation", "") or "").strip()
        return (
            _schema("attorney_cnic_front")
            + "Task: Verify Attorney CNIC FRONT.\n"
            + f"Reference: attorney_name='{attorney_name}', attorney_cnic='{attorney_cnic}', relation='{attorney_relation}'.\n"
            + "Extract (if visible): name, cnic, dob, issue_date, expiry_date.\n"
            + "If blackout/overwriting/patch/edited area on key fields -> tamper=true and verdict=REVIEW.\n"
            + "If extracted name/cnic mismatches reference -> verdict=REVIEW + issues.\n"
        )

    if dk == "attorney_cnic_back":
        attorney_cnic = (typed.get("attorney_cnic", "") or "").strip()
        return (
            _schema("attorney_cnic_back")
            + "Task: Verify Attorney CNIC BACK.\n"
            + f"Reference: attorney_cnic='{attorney_cnic}'.\n"
            + "Extract (if visible): cnic, issue_date, expiry_date.\n"
            + "If document looks like CNIC FRONT or unrelated -> doc_type_detected='other', verdict=REVIEW.\n"
        )

    return _schema(dk or "unknown") + "If unclear/unrelated -> verdict=REVIEW.\n"


def _extract_from_resp(resp: Any) -> Tuple[Dict[str, Any], str]:
    parsed = getattr(resp, "parsed", None)
    if isinstance(parsed, dict) and parsed:
        raw = json.dumps(parsed, ensure_ascii=False)
        return parsed, raw

    text = _sanitize_text(_extract_text(resp))
    data = _safe_json(text)
    return data, text


def _call_gemini(
    file_bytes: bytes,
    filename: str,
    doc_kind: str,
    prompt_text: str
) -> Tuple[Dict[str, Any], str, Optional[str], str]:
    api_key = _get_api_key()
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    if not api_key:
        return {}, "", "GEMINI_API_KEY (or GOOGLE_API_KEY) is not set", ""

    try:
        from google import genai
        from google.genai import types
    except Exception as e:
        return {}, "", f"Gemini SDK import failed. Install: pip install google-genai. Details: {e}", ""

    client = genai.Client(api_key=api_key)
    mime = _guess_mime(file_bytes, filename)

    file_part = types.Part.from_bytes(data=file_bytes, mime_type=mime)

    cfg = types.GenerateContentConfig(
        response_mime_type="application/json",
        temperature=0.0,
        max_output_tokens=4096,
    )

    try:
        resp = client.models.generate_content(
            model=model,
            contents=[prompt_text, file_part],
            config=cfg,
        )
    except Exception as e:
        return {}, "", f"Gemini request error: {e}", ""

    data, raw_text = _extract_from_resp(resp)

    dump_path = ""
    if DEBUG_GEMINI_RAW or not data:
        dump_path = _dump_raw(doc_kind, filename, raw_text)

    logger.info(
        "Gemini doc=%s file=%s mime=%s model=%s raw_len=%s",
        doc_kind, filename, mime, model, len(raw_text or "")
    )
    logger.info("Gemini raw_preview=%s", (raw_text or "")[:500].replace("\n", "\\n"))
    logger.info("Gemini parsed_keys=%s", list(data.keys()) if isinstance(data, dict) else [])

    return data, raw_text, None, dump_path


def _normalize_result(doc_kind: str, data: Dict[str, Any], raw: str, err: Optional[str], dump_path: str, typed: Dict[str, Any]) -> Dict[str, Any]:
    if err:
        out = {
            "doc_kind": doc_kind,
            "verdict": "REVIEW",
            "confidence": None,
            "extracted": None,
            "issues": [err],
            "admin_report": {
                "title": f"{doc_kind}: Gemini call failed",
                "issues": [err],
                "action_required": "Ask user to re-upload or admin to check API/network.",
            },
        }
        if dump_path:
            out["raw_dump_path"] = dump_path
        if DEBUG_GEMINI_RAW:
            out["raw_preview"] = _strip_code_fences(raw)[:1200]
        return out

    if not isinstance(data, dict) or not data:
        out = {
            "doc_kind": doc_kind,
            "verdict": "REVIEW",
            "confidence": None,
            "extracted": None,
            "issues": ["Gemini output could not be parsed as JSON."],
            "admin_report": {
                "title": f"{doc_kind}: Unparseable Gemini output",
                "issues": [
                    "Gemini output was not valid JSON (or was truncated).",
                    "Check raw_dump_path for the exact Gemini response.",
                ],
                "action_required": "Admin: open raw_dump_path; if unreadable ask user to re-upload clearer document.",
            },
        }
        if dump_path:
            out["raw_dump_path"] = dump_path
        out["raw_preview"] = _strip_code_fences(raw)[:1200]
        return out

    verdict = str(data.get("verdict") or "REVIEW").upper()
    if verdict not in ("PASS", "REVIEW"):
        verdict = "REVIEW"

    extracted = data.get("extracted") if isinstance(data.get("extracted"), dict) else {}
    issues = data.get("issues") if isinstance(data.get("issues"), list) else []

    # Additional validation for proof_of_address date
    if doc_kind == "proof_of_address" and extracted.get("date"):
        date_str = extracted.get("date")
        if not _is_date_within_90_days(date_str):
            verdict = "REVIEW"
            issues.append(f"Document date '{date_str}' is older than 3 months. Please provide recent proof of address.")

    # Additional validation for zakat declaration
    if doc_kind == "zakat_declaration":
        format_type = extracted.get("format_type", "unknown")
        if format_type == "stamp_paper":
            issues.append("Stamp paper format detected. Please also upload the backside of the zakat form showing stamp details.")
        
        if not extracted.get("has_signature"):
            verdict = "REVIEW"
            issues.append("Signature is missing on zakat declaration form.")
        
        if not extracted.get("has_stamp"):
            verdict = "REVIEW"
            issues.append("Stamp is missing on zakat declaration form.")

    # Validation for proof_of_income
    if doc_kind == "proof_of_income":
        if not extracted.get("stamp_present"):
            verdict = "REVIEW"
            issues.append("Official stamp is missing on proof of income document.")
        
        if not extracted.get("signature_present"):
            verdict = "REVIEW"
            issues.append("Signature is missing on proof of income document.")

    out = {
        "doc_kind": doc_kind,
        "verdict": verdict,
        "confidence": data.get("confidence", None),
        "extracted": extracted,
        "issues": issues,
        "admin_report": data.get("admin_report") if isinstance(data.get("admin_report"), dict) else {
            "title": f"{doc_kind}: Review required" if verdict == "REVIEW" else f"{doc_kind}: OK",
            "issues": issues,
            "action_required": "Admin should contact user." if verdict == "REVIEW" else "",
        },
    }

    if dump_path:
        out["raw_dump_path"] = dump_path
    if DEBUG_GEMINI_RAW:
        out["raw_preview"] = _strip_code_fences(raw)[:1200]

    return out


def _sync_check(file_bytes: bytes, filename: str, doc_kind: str, typed: Dict[str, Any]) -> Dict[str, Any]:
    prompt_text = _prompt_for(doc_kind, typed)
    data, raw, err, dump_path = _call_gemini(file_bytes, filename, doc_kind, prompt_text)
    return _normalize_result(doc_kind, data, raw, err, dump_path, typed)


async def gemini_check_document(
    file_bytes: bytes,
    filename: str,
    doc_type: str,
    typed: Dict[str, Any],
) -> Dict[str, Any]:
    return await anyio.to_thread.run_sync(_sync_check, file_bytes, filename, doc_type, typed)