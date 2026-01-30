# # app/services/gemini_account_form.py

# import json
# import os
# import re
# import logging
# from typing import Any, Dict, Optional, Tuple, List

# import anyio

# log = logging.getLogger("gemini_account")


# def _get_api_key() -> Optional[str]:
#     return os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")


# def _guess_mime(file_bytes: bytes, filename: Optional[str] = None) -> str:
#     name = (filename or "").lower().strip()
#     if name.endswith(".pdf") or file_bytes[:4] == b"%PDF":
#         return "application/pdf"
#     if name.endswith(".docx"):
#         return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
#     if name.endswith(".doc"):
#         return "application/msword"
#     if file_bytes[:8] == b"\x89PNG\r\n\x1a\n" or name.endswith(".png"):
#         return "image/png"
#     if file_bytes[:3] == b"\xff\xd8\xff" or name.endswith(".jpg") or name.endswith(".jpeg"):
#         return "image/jpeg"
#     return "application/octet-stream"


# def _extract_full_text(resp: Any) -> str:
#     txt = (getattr(resp, "text", None) or "").strip()
#     if txt:
#         return txt
#     parts: List[str] = []
#     try:
#         cands = getattr(resp, "candidates", []) or []
#         for c in cands:
#             content = getattr(c, "content", None)
#             if not content:
#                 continue
#             for p in (getattr(content, "parts", None) or []):
#                 t = getattr(p, "text", None)
#                 if t:
#                     parts.append(str(t))
#     except Exception:
#         pass
#     return "\n".join(parts).strip()


# def _strip_code_fences(text: str) -> str:
#     t = (text or "").strip()
#     t = re.sub(r"^```json\s*", "", t, flags=re.IGNORECASE).strip()
#     t = re.sub(r"^```\s*", "", t).strip()
#     t = re.sub(r"\s*```$", "", t).strip()
#     return t


# def _safe_json_load(text: str) -> Dict[str, Any]:
#     t = _strip_code_fences(text)
#     if not t:
#         return {}
#     try:
#         obj = json.loads(t)
#         return obj if isinstance(obj, dict) else {"raw": obj}
#     except Exception:
#         pass
#     m = re.search(r"\{.*\}", t, flags=re.DOTALL)
#     if m:
#         try:
#             obj = json.loads(m.group(0))
#             return obj if isinstance(obj, dict) else {"raw": obj}
#         except Exception:
#             return {}
#     return {}


# def _call_gemini_once(file_bytes: bytes, filename: str, prompt: str, max_output_tokens: int = 900) -> Tuple[Optional[Dict[str, Any]], str, Optional[str]]:
#     api_key = _get_api_key()
#     model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

#     if not api_key:
#         return None, "", "GEMINI_API_KEY (or GOOGLE_API_KEY) is not set"

#     try:
#         from google import genai
#         from google.genai import types
#     except Exception as e:
#         return None, "", f"Gemini SDK import failed. Install: pip install google-genai. Details: {e}"

#     client = genai.Client(api_key=api_key)
#     mime = _guess_mime(file_bytes, filename=filename)
#     part = types.Part.from_bytes(data=file_bytes, mime_type=mime)

#     cfg = types.GenerateContentConfig(
#         response_mime_type="application/json",
#         temperature=0.0,
#         max_output_tokens=max_output_tokens,
#     )

#     log.info("Gemini model=%s mime=%s file=%s", model, mime, filename)

#     try:
#         resp = client.models.generate_content(
#             model=model,
#             contents=[prompt, part],
#             config=cfg,
#         )
#     except Exception as e:
#         return None, "", f"Gemini request error: {e}"

#     text = _extract_full_text(resp)
#     data = _safe_json_load(text)
#     return (data if data else None), text, None


# def _prompt_account_doc(doc_kind: str, expected_fields: Dict[str, Any]) -> str:
#     """
#     One prompt works for all Form-2 docs.
#     Gemini must:
#       - Identify doc_kind
#       - Extract relevant fields from the document (short)
#       - Produce admin_report when something doesn't match or looks suspicious
#     """
#     # Keep expected_fields small-ish in prompt: include only common keys if present
#     # You can extend this list anytime.
#     allow_keys = [
#         "user_name", "name", "father_name", "husband_name", "dob", "cnic",
#         "nationality", "occupation", "employer_name", "job_title",
#         "address_line_1", "address_line_2", "city", "country",
#         "iban", "bank_name", "ntn", "tax_year"
#     ]
#     hinted = {k: expected_fields.get(k) for k in allow_keys if expected_fields.get(k)}

#     return f"""
# Return ONLY ONE-LINE JSON. No markdown. No extra text.

# You are verifying an account-opening document.
# Document kind: {doc_kind}

# Your job:
# 1) Extract ONLY clearly visible key fields relevant to this document kind.
# 2) Compare them against the user-typed fields (provided below).
# 3) If there is a mismatch, or the document looks edited/tampered/unreliable, DO NOT FAIL the user.
#    Instead set verdict="REVIEW" and write a short admin_report explaining the issue and what to ask the user to re-upload.

# Output schema (ONE LINE):
# {{"ok":true,
#   "doc_kind":"{doc_kind}",
#   "confidence":0.0,
#   "extracted":{{}},
#   "verdict":"PASS|REVIEW",
#   "issues":[],
#   "admin_report":""
# }}

# Rules:
# - Do NOT invent values. If not clearly visible, omit that key from extracted.
# - Keep extracted SHORT: include only relevant keys for the doc kind (max ~10 keys).
# - Look for tampering/overwrites/black marks/erasures/obvious edits; if found => verdict=REVIEW and mention it in admin_report.
# - For BANK_STATEMENT: if it does not clearly appear system/computer generated, mark REVIEW and mention risk of editable statement.

# User typed fields (hints):
# {json.dumps(hinted, ensure_ascii=False)}
# """.strip()


# def _normalize_result(data: Dict[str, Any]) -> Dict[str, Any]:
#     extracted = data.get("extracted") if isinstance(data.get("extracted"), dict) else {}
#     issues = data.get("issues") if isinstance(data.get("issues"), list) else []
#     return {
#         "ok": bool(data.get("ok", True)),
#         "doc_kind": str(data.get("doc_kind") or ""),
#         "confidence": float(data.get("confidence", 0.0) or 0.0),
#         "extracted": extracted,
#         "verdict": str(data.get("verdict") or "REVIEW"),
#         "issues": issues,
#         "admin_report": str(data.get("admin_report") or "").strip(),
#     }


# def _sync_verify_doc(file_bytes: bytes, filename: str, doc_kind: str, expected_fields: Dict[str, Any]) -> Dict[str, Any]:
#     prompt = _prompt_account_doc(doc_kind=doc_kind, expected_fields=expected_fields)

#     data1, text1, err1 = _call_gemini_once(file_bytes, filename, prompt, max_output_tokens=900)
#     if err1:
#         return {"ok": False, "error": err1}

#     if not data1:
#         raw = _strip_code_fences(text1)[:900]
#         return {"ok": False, "error": "Gemini returned empty/unparseable JSON", "raw_text": raw}

#     res = _normalize_result(data1)

#     # Log useful fields (safe)
#     log.info("Gemini %s verdict=%s conf=%.2f extracted_keys=%s",
#              doc_kind, res.get("verdict"), res.get("confidence"), list((res.get("extracted") or {}).keys()))

#     # If admin_report is empty and verdict is REVIEW, add a generic one
#     if res.get("verdict") == "REVIEW" and not res.get("admin_report"):
#         res["admin_report"] = f"{doc_kind}: mismatch or low confidence. Ask user to re-upload clearer document."

#     return res


# async def verify_doc_with_gemini(
#     file_bytes: bytes,
#     filename: str,
#     doc_kind: str,
#     expected_fields: Dict[str, Any],
# ) -> Dict[str, Any]:
#     return await anyio.to_thread.run_sync(_sync_verify_doc, file_bytes, filename or "", doc_kind, expected_fields)
