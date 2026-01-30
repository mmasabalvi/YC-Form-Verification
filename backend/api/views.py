# api/views.py

import json
import os
import re
import logging
import inspect
import threading
from datetime import datetime
from typing import Any, Dict, List, Optional

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .services.basic_form_image_checks import check_image_quality, check_document_completeness
from .services.basic_form_cnic_compare import compare_fields
from .services.basic_form_iban_compare import compare_iban_bundle
from .services.basic_form_relationship_compare import compare_relationship_bundle

from .services.basic_form_gemini_service import (
    extract_cnic_with_gemini_sync,
    extract_iban_with_gemini_sync,
    extract_relationship_with_gemini_sync,
)

from .services.normal_account_gemini_docs import gemini_check_document  # async or sync (both ok)
from .services.cnic_extraction_service import extract_cnic_details, extract_cnic_back_details, extract_cnic_number_only
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser


log = logging.getLogger("api.views")


# -------------------------
# Common helpers
# -------------------------
def _backend_base_dir() -> str:
    # backend/   (since api/ is backend/api/)
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _reports_dir() -> str:
    return os.path.join(_backend_base_dir(), "reports")


def _kyc_docs_dir() -> str:
    path = os.path.join(_reports_dir(), "kyc_docs")
    os.makedirs(path, exist_ok=True)
    return path


def _parse_bool(val: Any, default: bool = False) -> bool:
    if val is None:
        return default
    if isinstance(val, bool):
        return val
    s = str(val).strip().lower()
    return s in ("1", "true", "yes", "on")


def _is_pdf(filename: str, file_bytes: Optional[bytes] = None) -> bool:
    name = (filename or "").lower()
    if name.endswith(".pdf"):
        return True
    if file_bytes and file_bytes[:4] == b"%PDF":
        return True
    return False


def save_verified_profile(kyc_id: str, verified_profile: dict) -> str:
    reports_dir = _reports_dir()
    os.makedirs(reports_dir, exist_ok=True)

    # Extract Name/CNIC for filename
    name = (verified_profile.get("full_name") or "Unknown").strip()
    cnic = (verified_profile.get("cnic") or "Unknown").strip()
    
    # Sanitize
    import re
    safe_name = re.sub(r"[^a-zA-Z0-9_\-]", "_", name)
    safe_cnic = re.sub(r"[^a-zA-Z0-9_\-]", "_", cnic)
    
    # New format: verified_{kyc_id}_{Name}_{CNIC}.json
    # This allows easy lookup by kyc_id (prefix) but gives meaningful names
    filename = f"verified_{kyc_id}_{safe_name}_{safe_cnic}.json"
    path = os.path.join(reports_dir, filename)
    
    # Cleanup old file for this kyc_id if it exists with a different name
    # (e.g. if name changed/corrected)
    for f in os.listdir(reports_dir):
        if f.startswith(f"verified_{kyc_id}") and f.endswith(".json") and f != filename:
            try:
                os.remove(os.path.join(reports_dir, f))
            except OSError:
                pass

    with open(path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "saved_at": datetime.now().strftime("%Y%m%d_%H%M%S"),
                "kyc_id": kyc_id,
                "verified_profile": verified_profile,
            },
            f,
            ensure_ascii=False,
            indent=2,
        )
    return path


def _load_verified_profile(kyc_id: str) -> Dict[str, Any]:
    reports_dir = _reports_dir()
    if not os.path.exists(reports_dir):
        return {}
        
    # Search for any file starting with verified_{kyc_id}_
    target_file = None
    for f in os.listdir(reports_dir):
        if f.startswith(f"verified_{kyc_id}") and f.endswith(".json"):
            target_file = f
            break
    
    # Fallback to old format just in case
    if not target_file:
        old_path = os.path.join(reports_dir, f"verified_{kyc_id}.json")
        if os.path.exists(old_path):
            target_path = old_path
        else:
            return {}
    else:
        target_path = os.path.join(reports_dir, target_file)

    try:
        with open(target_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        prof = data.get("verified_profile") or {}
        return prof if isinstance(prof, dict) else {}
    except Exception as e:
        log.error(f"Error loading profile {kyc_id}: {e}")
        return {}


def _save_admin_report(kyc_id: str, payload: Dict[str, Any]) -> str:
    os.makedirs(_reports_dir(), exist_ok=True)

    prof = payload.get("verified_profile", {}) or {}
    name = (prof.get("full_name") or "Unknown").strip()
    cnic = (prof.get("cnic") or "Unknown").strip()

    safe_name = re.sub(r"[^a-zA-Z0-9_\-]", "_", name)
    safe_cnic = re.sub(r"[^a-zA-Z0-9_\-]", "_", cnic)

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_filename = f"{safe_name}_{safe_cnic}_{ts}.json"

    out_path = os.path.join(_reports_dir(), report_filename)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    return out_path


def _missing_doc(doc_kind: str) -> Dict[str, Any]:
    return {
        "doc_kind": doc_kind,
        "verdict": "REVIEW",
        "confidence": None,
        "extracted": None,
        "issues": ["Document not uploaded"],
        "admin_report": {
            "title": "Missing Document",
            "issues": ["User did not upload this document."],
            "action_required": "Ask user to upload.",
        },
    }


async def _maybe_await(fn, *args, **kwargs):
    """
    Allows you to call either async or sync functions safely.
    """
    res = fn(*args, **kwargs)
    if inspect.isawaitable(res):
        return await res
    return res


def process_cnic_back_background(kyc_id: str, temp_image_path: str, user_cnic: str):
    """
    Background task to extract and translate addresses from CNIC Back.
    Updates the existing verified_profile JSON.
    """
    try:
        log.info(f"Background task started for KYC: {kyc_id}")
        
        # 1. Extract details from back image
        back_data = extract_cnic_back_details(temp_image_path)
        log.info(f"Background extraction complete for {kyc_id}: {back_data}")

        # 2. Load existing profile
        current_profile = _load_verified_profile(kyc_id)
        if not current_profile:
            log.warning(f"No existing verified profile found for {kyc_id}, creating partial.")
            current_profile = {}

        # 3. Update with new fields
        current_profile["permanent_address_translated"] = back_data.get("permanent_address_english")
        current_profile["current_address_english"] = back_data.get("current_address_english")
        
        # Optional: Check CNIC match log
        back_cnic = back_data.get("cnic_number")
        if back_cnic:
            # simple cleanup for comparison
            c1 = re.sub(r"\D", "", str(back_cnic))
            c2 = re.sub(r"\D", "", str(user_cnic))
            match = (c1 == c2)
            current_profile["back_cnic_match"] = match
            log.info(f"Back CNIC Match for {kyc_id}: {match} ({c1} vs {c2})")
        
        # 4. Save updated profile
        save_verified_profile(kyc_id, current_profile)
        
        # Cleanup temp file
        if os.path.exists(temp_image_path):
            os.remove(temp_image_path)
            log.info(f"Cleaned up temp back image: {temp_image_path}")

    except Exception as e:
        log.error(f"Background CNIC processing failed for {kyc_id}: {e}")


# -------------------------
# Views
# -------------------------
@csrf_exempt
def health_check(request):
    return JsonResponse({"status": "healthy"})


class ExtractCNICDetailsView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        file_obj = request.FILES.get('cnic_image')
        if not file_obj:
            return Response({"error": "No image provided"}, status=400)
        
        try:
            data = extract_cnic_details(file_obj)
            if data.get("error") == "SERVICE_UNAVAILABLE":
                return Response({"error": "SERVICE_UNAVAILABLE"}, status=503)
            return Response(data)
        except Exception as e:
            return Response({"error": str(e)}, status=500)


@csrf_exempt
def submit_kyc(request):
    """
    POST /api/submit-kyc
    multipart/form-data
    Matches your Next.js form field names.
    """
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    # -----------------------
    # Read form fields
    # -----------------------
    data = request.POST

    kyc_id = data.get("kyc_id") or f"kyc_{int(datetime.now().timestamp())}"

    id_variant = data.get("id_variant", "cnic")
    residential_status = data.get("residential_status", "resident")

    user_name = (data.get("user_name") or "").strip()
    father_husband_name = (data.get("father_husband_name") or "").strip()
    user_cnic = (data.get("user_cnic") or "").strip()
    user_issue_date = data.get("user_issue_date") or None
    user_expiry_date = data.get("user_expiry_date") or None
    user_lifetime_validity = _parse_bool(data.get("user_lifetime_validity"), False)

    user_iban = (data.get("user_iban") or "").strip()
    user_bank_name = (data.get("user_bank_name") or "").strip()

    self_mobile = _parse_bool(data.get("self_mobile"), True)
    relative_name = data.get("relative_name") or None
    relationship = data.get("relationship") or None
    relative_cnic = data.get("relative_cnic") or None

    user_mobile = data.get("user_mobile") or None
    user_mail_address = data.get("user_mail_address") or None
    
    # Hidden extracted fields for CGP
    extracted_gender = data.get("extracted_gender") or None
    extracted_dob = data.get("extracted_dob") or None

    # -----------------------
    # Validate id_variant
    # -----------------------
    if id_variant not in {"cnic", "smart_card", "poc", "nicop"}:
        return JsonResponse(
            {"final_verdict": "FAIL", "messages": ["Invalid id_variant (use 'cnic', 'smart_card', 'poc', or 'nicop')"]},
            status=400,
        )

    # -----------------------
    # Files
    # -----------------------
    cnic_file = request.FILES.get("cnic_file")
    bank_file = request.FILES.get("bank_file")
    relationship_file = request.FILES.get("relationship_file")

    if not cnic_file:
        return JsonResponse(
            {"final_verdict": "FAIL", "messages": ["Missing required files: cnic_file"]},
            status=400,
        )

    # CNIC Back (Optional but recommended)
    cnic_back_file = request.FILES.get("cnic_back_file")

    cnic_bytes = cnic_file.read()
    bank_bytes = bank_file.read() if bank_file else None
    rel_bytes = relationship_file.read() if relationship_file else None

    # CNIC Back Sync Check (Blocking)
    temp_back_path = None
    if cnic_back_file:
         try:
            # 1. Verification
            back_cnic_number = extract_cnic_number_only(cnic_back_file)
            log.info(f"CNIC Back Sync Extraction: {back_cnic_number} vs User: {user_cnic}")
            
            # Reset pointer after read
            if hasattr(cnic_back_file, 'seek'):
                cnic_back_file.seek(0)
            
            if back_cnic_number and user_cnic:
                import re
                clean_back = re.sub(r"\D", "", back_cnic_number)
                clean_front = re.sub(r"\D", "", user_cnic)
                if clean_back != clean_front:
                    return JsonResponse({
                        "final_verdict": "FAIL",
                        "messages": [f"CNIC mismatch: Front ({user_cnic}) vs Back ({back_cnic_number})"]
                    }, status=400)
            
            # 2. Save for Background
            reports_dir = _reports_dir()
            os.makedirs(reports_dir, exist_ok=True)
            ext = os.path.splitext(cnic_back_file.name)[1] or ".jpg"
            temp_back_path = os.path.join(reports_dir, f"temp_back_{kyc_id}{ext}")
            with open(temp_back_path, "wb") as f:
                for chunk in cnic_back_file.chunks():
                    f.write(chunk)
         except Exception as e:
             log.error(f"Failed during CNIC Back sync check: {e}")
             # Fail open or closed? User wants strict check.
             # If check failed due to error, let's allow proceed but log it? 
             # Or block? "Blocking condition" -> Block on error.
             return JsonResponse({
                 "final_verdict": "FAIL",
                 "messages": ["Failed to verify CNIC Back image. Please try again."]
             }, status=400)

    # -----------------------
    # Step 1: CNIC image checks
    # -----------------------
    cnic_quality = check_image_quality(cnic_bytes)
    if not cnic_quality.get("passed", False):
        return JsonResponse(
            {
                "final_verdict": "FAIL",
                "messages": ["CNIC image quality failed", cnic_quality.get("reason", "Invalid CNIC image")],
                "error_fields": ["cnic_file"]
            },
            status=200,
        )

    cnic_completeness = check_document_completeness(cnic_bytes)  # non-blocking

    # -----------------------
    # Step 2: Bank doc checks (only if image and provided)
    # -----------------------
    bank_is_pdf = False
    bank_quality = {"passed": True, "metrics": {}, "warning": None}
    bank_completeness = {"passed": True, "message": "Skipped", "metrics": {}}

    if bank_file:
        bank_is_pdf = _is_pdf(bank_file.name, bank_bytes)

        if not bank_is_pdf:
            bank_quality = check_image_quality(bank_bytes)
            if not bank_quality.get("passed", False):
                return JsonResponse(
                    {
                        "final_verdict": "FAIL",
                        "messages": [
                            "Bank document image quality failed",
                            bank_quality.get("reason", "Invalid bank document image"),
                        ],
                        "error_fields": ["bank_file"]
                    },
                    status=200,
                )
            bank_completeness = check_document_completeness(bank_bytes)
    else:
        # No bank file provided - reset pointer for safety if it was ever read (it wasn't)
        pass

    # -----------------------
    # -----------------------
    # Step 3: CNIC Extraction (Optimization: Use Temp File if available)
    # -----------------------
    temp_request_id = data.get("temp_request_id")
    cnic_fields = {}
    cnic_tamper = {}
    
    # Try to use temp file to skip Gemini call
    skipped_gemini = False
    if temp_request_id:
        try:
            reports_dir = _reports_dir()
            temp_path = os.path.join(reports_dir, f"temp_extraction_{temp_request_id}.json")
            
            if os.path.exists(temp_path):
                import difflib
                with open(temp_path, "r", encoding="utf-8") as f:
                    original_data = json.load(f)
                
                org_name = (original_data.get("full_name") or "").strip().lower()
                org_cnic = (original_data.get("cnic_number") or "").strip()
                
                user_name_chk = user_name.strip().lower()
                user_cnic_chk = user_cnic.strip()
                
                # Similarity Check ( > 98% )
                name_sim = difflib.SequenceMatcher(None, org_name, user_name_chk).ratio()
                cnic_sim = difflib.SequenceMatcher(None, org_cnic, user_cnic_chk).ratio()
                
                log.info(f"Similarity Check: Name={name_sim*100:.2f}%, CNIC={cnic_sim*100:.2f}%")
                
                if name_sim >= 0.98 and cnic_sim >= 0.98:
                    skipped_gemini = True
                    cnic_fields = {
                        "name": original_data.get("full_name"),
                        "cnic": original_data.get("cnic_number"),
                        "issue_date": original_data.get("date_of_issue"),
                        "expiry_date": original_data.get("date_of_expiry"),
                        "lifetime_validity": False
                    }
                else:
                    log.warning("Similarity check failed. Falling back to Gemini.")
                    
        except Exception as e:
            log.error(f"Temp file check failed: {e}")

    # Fallback to Gemini if check failed or no ID
    if not skipped_gemini:
        cnic_extract = extract_cnic_with_gemini_sync(
            file_bytes=cnic_bytes,
            filename=cnic_file.name,
            id_variant=id_variant,
        )
        if not cnic_extract.get("ok", False):
            if cnic_extract.get("error") == "SERVICE_UNAVAILABLE":
                return JsonResponse(
                    {
                        "final_verdict": "FAIL",
                        "messages": ["verification bot is not available at the moment, please try again in a few minutes"],
                        "error": "SERVICE_UNAVAILABLE"
                    },
                    status=503,
                )
            return JsonResponse(
                {
                    "final_verdict": "FAIL",
                    "messages": ["Gemini CNIC extraction failed", cnic_extract.get("error", "Unknown error")],
                    "error_fields": ["cnic_file"]
                },
                status=200,
            )
        cnic_fields = cnic_extract.get("fields") or {}
        cnic_tamper = cnic_extract.get("tamper") or {}
    if bool(cnic_tamper.get("tampered", False)):
        return JsonResponse(
            {
                "final_verdict": "FAIL",
                "messages": ["CNIC appears tampered", cnic_tamper.get("reason", "Tamper suspected")],
                "cnic": {
                    "verdict": "FAIL",
                    "extracted": {"cnic": cnic_fields.get("cnic"), "name": cnic_fields.get("name")},
                },
                "bank": {"verdict": "REVIEW", "extracted": {}},
                "relationship": {"verdict": "REVIEW"},
            },
            status=200,
        )

    # -----------------------
    # Step 4: Gemini extract IBAN proof (doc_type + computer_generated rules) - OPTIONAL
    # -----------------------
    iban_fields = {}
    iban_compliance = "PASS"
    iban_extract = {"ok": True, "doc_type": "N/A", "compliance": "PASS"} # Default if skipped
    
    if bank_file:
        iban_extract = extract_iban_with_gemini_sync(
            file_bytes=bank_bytes,
            filename=bank_file.name,
            typed_iban=user_iban,
            typed_bank_name=user_bank_name,
            typed_account_name=user_name,
        )
        if not iban_extract.get("ok", False):
            return JsonResponse(
                {
                    "final_verdict": "FAIL",
                    "messages": ["Gemini bank document extraction failed", iban_extract.get("error", "Unknown error")],
                },
                status=200,
            )

        iban_fields = iban_extract.get("fields") or {}
        iban_compliance = (iban_extract.get("compliance") or "REVIEW").upper()
        
        if iban_compliance == "FAIL":
            return JsonResponse(
                {
                    "final_verdict": "FAIL",
                    "messages": [
                        "IBAN proof document compliance failed (missing 'computer generated' wording for statement/AMC)"
                    ],
                    "cnic": {
                        "verdict": "PASS",
                        "extracted": {"cnic": cnic_fields.get("cnic"), "name": cnic_fields.get("name")},
                    },
                    "bank": {
                        "verdict": "FAIL",
                        "extracted": {
                            "iban": iban_fields.get("iban"),
                            "bank_name": iban_fields.get("bank_name"),
                            "account_title": iban_fields.get("account_title"),
                        },
                    },
                    "relationship": {"verdict": "REVIEW"},
                    "error_fields": ["bank_file"]
                },
                status=200,
            )

    # -----------------------
    # Step 5: Compare CNIC typed vs extracted
    # -----------------------
    exp = "LIFETIME" if bool(user_lifetime_validity) else (user_expiry_date or "")
    user_cnic_fields = {
        "name": user_name,
        "cnic": user_cnic,
        "issue_date": user_issue_date,
        "expiry_date": exp,
        "lifetime_validity": bool(user_lifetime_validity),
    }
    cnic_compare = compare_fields(user_fields=user_cnic_fields, ocr_fields=cnic_fields)
    cnic_verdict = (cnic_compare.get("overall") or {}).get("verdict", "REVIEW")

    # -----------------------
    # Step 6: Compare IBAN typed vs extracted
    # -----------------------
    # -----------------------
    # Step 6: Compare IBAN typed vs extracted (if file exists)
    # -----------------------
    iban_verdict = "PASS" # Default if optional (no file)
    iban_compare: Dict[str, Any] = {"verdict": "PASS"}

    if bank_file:
        # Debug log to see what Gemini extracted
        import logging
        logger = logging.getLogger("gemini")
        logger.info("=" * 80)
        logger.info("IBAN COMPARISON DEBUG")
        logger.info("-" * 80)
        logger.info("Typed bank name: '%s'", user_bank_name or "")
        logger.info("Extracted bank name: '%s'", iban_fields.get("bank_name") or "")
        logger.info("Full iban_fields: %s", iban_fields)
        logger.info("-" * 80)
        
        iban_compare = compare_iban_bundle(
            user_name=user_name or "",
            user_iban=user_iban or "",
            user_bank_name=user_bank_name or "",
            extracted=iban_fields,
        )
        
        logger.info("IBAN comparison result: %s", iban_compare)
        logger.info("=" * 80)
        
        iban_verdict = (iban_compare.get("verdict") or "REVIEW").upper()

    # -----------------------
    # Step 7: Relationship verification (only if self_mobile is False)
    # -----------------------
    rel_block: Dict[str, Any] = {"verdict": "PASS" if self_mobile else "REVIEW"}
    rel_verdict = "PASS"

    if not self_mobile:
        if not (relationship_file and rel_bytes):
            rel_verdict = "FAIL"
            rel_block = {"verdict": "FAIL"}
        else:
            rel_extract = extract_relationship_with_gemini_sync(
                file_bytes=rel_bytes,
                filename=relationship_file.name,
                typed_relative_name=relative_name or "",
                typed_relationship=relationship or "",
                typed_relative_cnic=relative_cnic or "",
                typed_customer_name=user_name or "",
                typed_customer_cnic=user_cnic or "",
            )
            if not rel_extract.get("ok", False):
                rel_verdict = "REVIEW"
                rel_block = {"verdict": "REVIEW"}
            else:
                # Pass the entire extraction result (includes both "fields" and "extra")
                rel_compare = compare_relationship_bundle(
                    typed_relative_name=relative_name or "",
                    typed_relationship=relationship or "",
                    typed_relative_cnic=relative_cnic or "",
                    extracted=rel_extract,  # Pass complete extraction result with "extra" field
                    typed_customer_name=user_name or "",  # Add customer name for spouse comparison
                    typed_customer_cnic=user_cnic or "",  # Add customer CNIC for CNIC-based proof
                )
                rel_verdict = (rel_compare.get("verdict") or "REVIEW").upper()
                
                # Extract fields for backward compatible output
                rel_fields = rel_extract.get("fields") or {}
                rel_extra = rel_extract.get("extra") or {}
                
                rel_block = {
                    "verdict": rel_verdict,
                    "extracted": {
                        "relative_name": rel_fields.get("relative_name"),
                        "relationship": rel_fields.get("relationship"),
                        "relative_cnic": rel_fields.get("relative_cnic"),
                        "computer_generated_present": rel_extract.get("computer_generated_present"),
                    },
                }

    # -----------------------
    # Final verdict
    # -----------------------
    messages: List[str] = []
    error_fields: List[str] = []

    if cnic_verdict != "PASS":
        fields = (cnic_compare.get("fields") or {})
        if fields.get("cnic", {}).get("match") is False:
            messages.append("CNIC number mismatch")
            error_fields.append("user_cnic")
        if fields.get("name", {}).get("match") is False:
            messages.append("CNIC name mismatch")
            error_fields.append("user_name")
        if (user_issue_date or "").strip() and fields.get("issue_date", {}).get("match") is False:
            messages.append("CNIC issue date mismatch")
            error_fields.append("user_issue_date")
        if (exp or "").strip() and fields.get("expiry_date", {}).get("match") is False:
            messages.append("CNIC expiry date mismatch")
            error_fields.append("user_expiry_date")

    if iban_verdict != "PASS":
        mismatches = iban_compare.get("mismatches") or []
        for m in mismatches:
            messages.append(m)
        
        # Highlight specific fields based on mismatches
        fields_rep = iban_compare.get("fields_report") or {}
        if fields_rep.get("iban", {}).get("match") is False:
            error_fields.append("user_iban")
        if fields_rep.get("bank", {}).get("match") is False:
            error_fields.append("user_bank_name")
        if fields_rep.get("account_title", {}).get("match") is False:
            error_fields.append("user_name")
        
        # Fallback if no specific match flagged but verdict is not pass
        if not error_fields and mismatches:
             error_fields.append("user_iban")

    if not self_mobile and rel_verdict != "PASS":
        messages.append("Relationship info / proof verification failed or needs review")
        error_fields.extend(["relative_name", "relationship", "relative_cnic", "relationship_file"])

    if cnic_verdict == "PASS" and iban_verdict == "PASS" and (rel_verdict == "PASS"):
        final_verdict = "PASS"
        if not messages:
            messages = ["Verification successful"]
    else:
        if iban_verdict == "FAIL" or rel_verdict == "FAIL":
            final_verdict = "FAIL"
        else:
            final_verdict = "REVIEW"
        if not messages:
            messages = ["Verification requires review"]

    # Add error_fields to the final response later... 
    # But wait, I need to make sure I add them to the failing responses.
    # Actually, the failing responses above are for immediate quality/extraction failures.
    # I should also modify the return call at the end? Oh wait, this view doesn't have a single exit point.
    # Ah, I see a return call around line 760. Let me check that.


    verified_path = None
    if final_verdict == "PASS":
        verified_profile = {
            "full_name": user_name,
            "father_husband_name": father_husband_name,
            "cnic": user_cnic,
            "iban": user_iban,
            "bank_name": user_bank_name,
            "mobile": user_mobile or "",
            "mail_address": user_mail_address or "",
            "employer_name": "N/A",
            "employer_address": "N/A",
            "ntn": "",
            "tax_year": "",
            "self_mobile": bool(self_mobile),
            "relative_name": relative_name or "",
            "relationship": relationship or "",
            "relative_cnic": relative_cnic or "",
            # Hidden extracted fields for CGP
            "gender": extracted_gender,
            "date_of_birth": extracted_dob,
            "residential_status": residential_status,
        }
        verified_path = save_verified_profile(kyc_id=kyc_id, verified_profile=verified_profile)
        verified_path = save_verified_profile(kyc_id=kyc_id, verified_profile=verified_profile)
        log.info("Saved verified profile JSON: %s", verified_path)

        # -------------------------
        # NEW: Save CNIC images for reuse in CGP
        # -------------------------
        try:
            kdocs = _kyc_docs_dir()
            
            # Save Front (we have bytes)
            front_ext = os.path.splitext(cnic_file.name)[1] or ".jpg"
            front_path = os.path.join(kdocs, f"{kyc_id}_front{front_ext}")
            with open(front_path, "wb") as f:
                f.write(cnic_bytes)
            log.info(f"Saved KYC Front Doc: {front_path}")

            # Save Back (copy from temp or read if available)
            if cnic_back_file and temp_back_path and os.path.exists(temp_back_path):
                import shutil
                back_ext = os.path.splitext(cnic_back_file.name)[1] or ".jpg"
                back_path = os.path.join(kdocs, f"{kyc_id}_back{back_ext}")
                shutil.copy(temp_back_path, back_path)
                log.info(f"Saved KYC Back Doc: {back_path}")
                
        except Exception as e:
            log.error(f"Failed to save KYC docs for reuse: {e}")

        # Trigger background processing for CNIC Back if available
        if temp_back_path:
             t = threading.Thread(
                 target=process_cnic_back_background,
                 args=(kyc_id, temp_back_path, user_cnic),
                 daemon=True
             )
             t.start()
        
        # Generate Excel report with Name_CNIC_Timestamp format
        try:
            from .services.excel_report_service import generate_individual_excel_report
            import re
            
            # Build filename: Name_CNIC_Timestamp.xlsx
            safe_name = re.sub(r"[^a-zA-Z0-9_\-]", "_", user_name)
            safe_cnic = re.sub(r"[^a-zA-Z0-9_\-]", "_", user_cnic)
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            excel_filename = f"{safe_name}_{safe_cnic}_{ts}.xlsx"
            excel_path = os.path.join(_reports_dir(), excel_filename)
            
            # Prepare data for Excel
            report_data = {
                "kyc_id": kyc_id,
                "final_verdict": final_verdict,
                "timestamp": datetime.now().strftime("%B %d, %Y at %H:%M:%S"),
                "messages": messages,
                "verified_profile": verified_profile,
                "documents": results,
            }
            
            generate_individual_excel_report(report_data, excel_path)
            log.info(f"Generated Excel report: {excel_path}")
            
        except Exception as e:
            log.error(f"Failed to generate Excel report: {e}")
            # Continue even if Excel fails

    return JsonResponse(
        {
            "kyc_id": kyc_id,
            "final_verdict": final_verdict,
            "messages": messages,
            "verified_profile_saved": verified_path,
            "cnic": {
                "verdict": cnic_verdict,
                "extracted": {
                    "cnic": cnic_fields.get("cnic"),
                    "name": cnic_fields.get("name"),
                    "issue_date": cnic_fields.get("issue_date"),
                    "expiry_date": cnic_fields.get("expiry_date"),
                    "lifetime_validity": cnic_fields.get("lifetime_validity"),
                },
            },
            "bank": {
                "verdict": iban_verdict,
                "doc_type": iban_extract.get("doc_type"),
                "extracted": {
                    "iban": iban_fields.get("iban"),
                    "bank_name": iban_fields.get("bank_name"),
                    "account_title": iban_fields.get("account_title"),
                },
            },
            "relationship": rel_block,
            "error_fields": error_fields,
            "meta": {
                "cnic_quality_passed": bool(cnic_quality.get("passed", False)),
                "cnic_completeness_warning": cnic_completeness.get("warning"),
                "bank_quality_passed": bool(bank_quality.get("passed", True)),
                "bank_completeness_warning": bank_completeness.get("warning"),
            },
        },
        status=200,
    )


@csrf_exempt
def get_kyc_data(request):
    """
    GET /api/get-kyc-data?kyc_id=...
    Returns the verified profile JSON for auto-filling the next form.
    """
    kyc_id = request.GET.get("kyc_id")
    if not kyc_id:
        return JsonResponse({"error": "kyc_id is required"}, status=400)

    profile = _load_verified_profile(kyc_id)
    if not profile:
        return JsonResponse({"error": "Profile not found"}, status=404)
    
    return JsonResponse(profile)


@csrf_exempt
async def submit_account_form(request):
    """
    POST /api/submit-account-form
    multipart/form-data
    This is your CGP / Normal Account "main form" submission endpoint.

    IMPORTANT:
    - It requires a PASS verified_{kyc_id}.json created by submit_kyc (basic KYC)
    - It verifies 9 documents via Gemini checker (we'll add the 4 py files next)
    """
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    if gemini_check_document is None:
        return JsonResponse(
            {"detail": "normal_account_gemini_docs.gemini_check_document is not wired yet. We'll add the 4 files next."},
            status=500,
        )

    data = request.POST
    kyc_id = (data.get("kyc_id") or "").strip()
    if not kyc_id:
        return JsonResponse({"detail": "kyc_id is required"}, status=400)

    verified = _load_verified_profile(kyc_id)
    if not verified or not verified.get("cnic") or not verified.get("full_name"):
        return JsonResponse(
            {"detail": f"Verified profile not found/invalid for kyc_id='{kyc_id}'. Submit basic KYC (PASS) first."},
            status=400,
        )

    # -------------------------
    # Collect Form-2 fields
    # -------------------------
    father_husband_name = data.get("father_husband_name")
    mother_maiden_name = data.get("mother_maiden_name")
    dob = data.get("dob")
    place_of_birth = data.get("place_of_birth")
    gender = data.get("gender")
    marital_status = data.get("marital_status")
    nationality = data.get("nationality")
    religion = data.get("religion")

    # Permanent Address
    perm_country = data.get("perm_country")
    perm_province = data.get("perm_province")
    perm_city = data.get("perm_city")
    perm_addr1 = data.get("perm_addr1")
    perm_addr2 = data.get("perm_addr2")
    perm_addr3 = data.get("perm_addr3")
    
    # Mailing Address (conditional)
    mailing_address_same = data.get("mailing_address_same", "true").lower() == "true"
    mail_country = data.get("mail_country")
    mail_province = data.get("mail_province")
    mail_city = data.get("mail_city")
    mail_addr1 = data.get("mail_addr1")
    mail_addr2 = data.get("mail_addr2")
    mail_addr3 = data.get("mail_addr3")



    occupation = data.get("occupation")
    job_title = data.get("job_title")
    employer_name = data.get("employer_name")
    department = data.get("department")
    employer_country = data.get("employer_country")
    employer_city = data.get("employer_city")
    employer_address = data.get("employer_address")
    gross_annual_income = data.get("gross_annual_income")
    source_of_income = data.get("source_of_income")

    ntn = data.get("ntn")
    tax_year = data.get("tax_year")
    zakat_status = data.get("zakat_status")
    zakat_declaration_date = data.get("zakat_declaration_date")  # conditional
    filer_status = data.get("filer_status")  # New field
    cdc_access = data.get("cdc_access")
    profit_sharing = data.get("profit_sharing")
    remittance = data.get("remittance")

    
    # Nominee/Next of Kin details
    add_nominee = data.get("add_nominee")
    nominee_name = data.get("nominee_name")
    nominee_cnic = data.get("nominee_cnic")
    nominee_mobile = data.get("nominee_mobile")
    nominee_relation = data.get("nominee_relation")
    nominee_cnic_issuance = data.get("nominee_cnic_issuance")
    nominee_cnic_expiry = data.get("nominee_cnic_expiry")
    
    # Attorney details
    add_attorney = data.get("add_attorney")
    attorney_name = data.get("attorney_name")
    attorney_cnic = data.get("attorney_cnic")
    attorney_mobile = data.get("attorney_mobile")
    attorney_relation = data.get("attorney_relation")
    attorney_cnic_issuance = data.get("attorney_cnic_issuance")
    attorney_cnic_expiry = data.get("attorney_cnic_expiry")
    
    # FATCA fields
    fatca_us_citizen = data.get("fatca_us_citizen")
    fatca_us_country_of_birth = data.get("fatca_us_country_of_birth")
    fatca_power_of_attorney = data.get("fatca_power_of_attorney")
    fatca_us_address = data.get("fatca_us_address")
    fatca_us_telephone = data.get("fatca_us_telephone")
    fatca_tax_residence_country = data.get("fatca_tax_residence_country")
    fatca_taxpayer_id = data.get("fatca_taxpayer_id")
    
    # Standard Due Diligence fields
    is_pep = data.get("is_pep")
    pep_details = data.get("pep_details")
    account_refused = data.get("account_refused")
    account_refused_details = data.get("account_refused_details")
    offshore_tax_links = data.get("offshore_tax_links")
    offshore_tax_links_details = data.get("offshore_tax_links_details")
    high_value_dealing = data.get("high_value_dealing")
    high_value_dealing_details = data.get("high_value_dealing_details")
    is_dual_national = data.get("is_dual_national")
    dual_nationality_country = data.get("dual_nationality_country")

    # Build full permanent address
    perm_parts = [
        (perm_addr1 or "").strip(),
        (perm_addr2 or "").strip(),
        (perm_addr3 or "").strip(),
        (perm_city or "").strip(),
        (perm_province or "").strip(),
        (perm_country or "").strip(),
    ]
    perm_addr_full = ", ".join([p for p in perm_parts if p]).strip()
    
    # Build full mailing address (if different)
    if mailing_address_same:
        m_addr_full = perm_addr_full
    else:
        mail_parts = [
            (mail_addr1 or "").strip(),
            (mail_addr2 or "").strip(),
            (mail_addr3 or "").strip(),
            (mail_city or "").strip(),
            (mail_province or "").strip(),
            (mail_country or "").strip(),
        ]
        m_addr_full = ", ".join([p for p in mail_parts if p]).strip()



    typed = {
        "kyc_id": kyc_id,
        "full_name": (verified.get("full_name") or "").strip(),
        "cnic": (verified.get("cnic") or "").strip(),
        "iban": (verified.get("iban") or "").strip(),
        "bank_name": (verified.get("bank_name") or "").strip(),
        "mobile": (verified.get("mobile") or "").strip(),  # Use verified mobile for docs

        "mail_address": m_addr_full,
        "occupation": (occupation or "").strip(),
        "job_title": (job_title or "").strip(),
        "department": (department or "").strip(),
        "employer_name": (employer_name or "").strip(),
        "employer_address": (employer_address or "").strip(),
        "ntn": ((verified.get("ntn") or ntn) or "").strip(),
        "tax_year": ((verified.get("tax_year") or tax_year) or "").strip(),
        "father_name": father_husband_name,
        "dob": dob,
        
        # Nominee/Next of Kin reference data
        "next_of_kin_name": (nominee_name or "").strip() if add_nominee else "",
        "next_of_kin_cnic": (nominee_cnic or "").strip() if add_nominee else "",
        "next_of_kin_relation": (nominee_relation or "").strip() if add_nominee else "",
        
        # Attorney reference data
        "attorney_name": (attorney_name or "").strip() if add_attorney else "",
        "attorney_cnic": (attorney_cnic or "").strip() if add_attorney else "",
        "attorney_relation": (attorney_relation or "").strip() if add_attorney else "",
    }

    # -------------------------
    # Files (documents)
    # Frontend should send with these keys (same as your old FastAPI)
    # -------------------------
    docs_map = {
        "cnic_front": request.FILES.get("cnic_front"),
        "cnic_back": request.FILES.get("cnic_back"),
        "proof_of_employment": request.FILES.get("proof_of_employment"),
        "proof_of_income": request.FILES.get("proof_of_income"),
        "signature_proof": request.FILES.get("signature_proof"),
        "undertaking": request.FILES.get("undertaking"),
        # "zakat_declaration" is added conditionally below
        "bank_statement": request.FILES.get("bank_statement"),
        "tax_return": request.FILES.get("tax_return"),
    }

    if zakat_status == "non_deductible":
        docs_map["zakat_declaration"] = request.FILES.get("zakat_declaration")
    
    # Only include proof_of_address if mailing address is different from permanent
    if not mailing_address_same:
        docs_map["proof_of_address"] = request.FILES.get("proof_of_address")
    
    # Add nominee CNIC documents if nominee is added
    if add_nominee:
        docs_map["next_of_kin_cnic_front"] = request.FILES.get("nominee_cnic_front")
        docs_map["next_of_kin_cnic_back"] = request.FILES.get("nominee_cnic_back")
    
    # Add attorney CNIC documents if attorney is added
    if add_attorney:
        docs_map["attorney_cnic_front"] = request.FILES.get("attorney_cnic_front")
        docs_map["attorney_cnic_back"] = request.FILES.get("attorney_cnic_back")

    if add_attorney:
        docs_map["attorney_cnic_front"] = request.FILES.get("attorney_cnic_front")
        docs_map["attorney_cnic_back"] = request.FILES.get("attorney_cnic_back")

    # -------------------------
    # Check for reusing KYC Docs (if missing in request)
    # -------------------------
    if kyc_id:
        kdocs = _kyc_docs_dir()
        
        # Helper to find existing file
        def _get_existing_kyc_doc(suffix_pattern):
            # suffix_pattern e.g. "_front"
            # look for {kyc_id}_front.*
            for f in os.listdir(kdocs):
                if f.startswith(f"{kyc_id}{suffix_pattern}."):
                    return os.path.join(kdocs, f)
            return None

        # 1. CNIC Front
        if not docs_map["cnic_front"]:
            existing = _get_existing_kyc_doc("_front")
            if existing:
                log.info(f"Reusing KYC Front Doc: {existing}")
                # Create a pseudo-file object that mimics Django UploadedFile interface slightly
                # sufficient for the loop below which calls .read() and .name
                class ReusedFile:
                    def __init__(self, path):
                        self.path = path
                        self.name = os.path.basename(path)
                    def read(self):
                        with open(self.path, "rb") as f:
                            return f.read()
                docs_map["cnic_front"] = ReusedFile(existing)

        # 2. CNIC Back
        if not docs_map["cnic_back"]:
            existing = _get_existing_kyc_doc("_back")
            if existing:
                log.info(f"Reusing KYC Back Doc: {existing}")
                class ReusedFile:
                     def __init__(self, path):
                        self.path = path
                        self.name = os.path.basename(path)
                     def read(self):
                        with open(self.path, "rb") as f:
                            return f.read()
                docs_map["cnic_back"] = ReusedFile(existing)

    results: Dict[str, Any] = {}
    raw_results: List[Dict[str, Any]] = []

    for doc_kind, up in docs_map.items():
        if up is None:
            r = _missing_doc(doc_kind)
            results[doc_kind] = r
            raw_results.append(r)
            continue

        file_bytes = up.read()
        if not file_bytes:
            r = _missing_doc(doc_kind)
            results[doc_kind] = r
            raw_results.append(r)
            continue

        try:
            r = await _maybe_await(
                gemini_check_document,
                file_bytes=file_bytes,
                filename=getattr(up, "name", "file"),
                doc_type=doc_kind,
                typed=typed,
            )
        except Exception as e:
            err_msg = str(e)
            if err_msg == "SERVICE_UNAVAILABLE":
                r = {
                    "doc_kind": doc_kind,
                    "verdict": "REVIEW",
                    "confidence": None,
                    "extracted": None,
                    "issues": ["verification bot is not available at the moment, please try again in a few minutes"],
                    "error": "SERVICE_UNAVAILABLE",
                    "admin_report": {
                        "title": f"{doc_kind}: Service Unavailable",
                        "issues": ["Gemini API returned 503"],
                        "action_required": "Please try again in a few minutes.",
                    },
                }
            else:
                log.exception("Gemini check failed for %s", doc_kind)
                r = {
                    "doc_kind": doc_kind,
                    "verdict": "REVIEW",
                    "confidence": None,
                    "extracted": None,
                    "issues": [f"Server error during Gemini check: {e}"],
                    "admin_report": {
                        "title": f"{doc_kind}: Server error",
                        "issues": [str(e)],
                        "action_required": "Admin: inspect server logs.",
                    },
                }

        results[doc_kind] = r
        raw_results.append(r)

    final_verdict = "PASS" if all((v.get("verdict") == "PASS") for v in results.values()) else "REVIEW"

    payload = {
        "timestamp": datetime.now().strftime("%Y%m%d_%H%M%S"),
        "kyc_id": kyc_id,
        "verified_profile": {
            # Inherited from KYC
            "full_name": typed["full_name"],
            "cnic": typed["cnic"],
            "iban": typed["iban"],
            "bank_name": typed["bank_name"],
            "mobile": typed.get("mobile", ""),

            # Form-2 Personal
            "father_husband_name": father_husband_name,
            "mother_maiden_name": mother_maiden_name,
            "dob": dob,
            "place_of_birth": place_of_birth,
            "gender": gender,
            "marital_status": marital_status,
            "nationality": nationality,
            "religion": religion,

            # Form-2 Permanent Address
            "permanent_address_full": perm_addr_full,
            "perm_country": perm_country,
            "perm_province": perm_province,
            "perm_city": perm_city,
            "perm_addr1": perm_addr1,
            "perm_addr2": perm_addr2,
            "perm_addr3": perm_addr3,
            
            # Form-2 Mailing Address
            "mailing_address_same": mailing_address_same,
            "mailing_address_full": m_addr_full,
            "mail_country": mail_country if not mailing_address_same else perm_country,
            "mail_province": mail_province if not mailing_address_same else perm_province,
            "mail_city": mail_city if not mailing_address_same else perm_city,
            "mail_addr1": mail_addr1 if not mailing_address_same else perm_addr1,
            "mail_addr2": mail_addr2 if not mailing_address_same else perm_addr2,
            "mail_addr3": mail_addr3 if not mailing_address_same else perm_addr3,

            # Form-2 Employment
            "occupation": occupation,
            "job_title": job_title,
            "employer_name": employer_name,
            "department": department,
            "employer_country": employer_country,
            "employer_city": employer_city,
            "employer_address": employer_address,
            "gross_annual_income": gross_annual_income,
            "source_of_income": source_of_income,

            # Form-2 Tax/Account
            "ntn": typed.get("ntn", ""),
            "tax_year": typed.get("tax_year", ""),
            "zakat_status": zakat_status,
            "zakat_declaration_date": zakat_declaration_date if zakat_status == "non_deductible" else None,
            "filer_status": filer_status, # New Field
            "cdc_access": cdc_access,
            "profit_sharing": profit_sharing,
            "remittance": remittance,
            
            # Nominee/Next of Kin
            "add_nominee": bool(add_nominee),
            "nominee_name": nominee_name if add_nominee else None,
            "nominee_cnic": nominee_cnic if add_nominee else None,
            "nominee_mobile": nominee_mobile if add_nominee else None,
            "nominee_relation": nominee_relation if add_nominee else None,
            "nominee_cnic_issuance": nominee_cnic_issuance if add_nominee else None,
            "nominee_cnic_expiry": nominee_cnic_expiry if add_nominee else None,
            
            # Attorney
            "add_attorney": bool(add_attorney),
            "attorney_name": attorney_name if add_attorney else None,
            "attorney_cnic": attorney_cnic if add_attorney else None,
            "attorney_mobile": attorney_mobile if add_attorney else None,
            "attorney_relation": attorney_relation if add_attorney else None,
            "attorney_cnic_issuance": attorney_cnic_issuance if add_attorney else None,
            "attorney_cnic_expiry": attorney_cnic_expiry if add_attorney else None,
            
            # FATCA
            "fatca_us_citizen": fatca_us_citizen,
            "fatca_us_country_of_birth": fatca_us_country_of_birth,
            "fatca_power_of_attorney": fatca_power_of_attorney,
            "fatca_us_address": fatca_us_address,
            "fatca_us_telephone": fatca_us_telephone,
            "fatca_tax_residence_country": fatca_tax_residence_country,
            "fatca_taxpayer_id": fatca_taxpayer_id,
            
            # Standard Due Diligence
            "is_pep": is_pep,
            "pep_details": pep_details if is_pep == "yes" else None,
            "account_refused": account_refused,
            "account_refused_details": account_refused_details if account_refused == "yes" else None,
            "offshore_tax_links": offshore_tax_links,
            "offshore_tax_links_details": offshore_tax_links_details if offshore_tax_links == "yes" else None,
            "high_value_dealing": high_value_dealing,
            "high_value_dealing_details": high_value_dealing_details if high_value_dealing == "yes" else None,
            "is_dual_national": is_dual_national,
            "dual_nationality_country": dual_nationality_country if is_dual_national == "yes" else None,

            "account_opening_date": datetime.now().strftime("%d.%m.%Y"),  # Auto-set to current date,
        },
        "final_verdict": final_verdict,
        "documents": results,
        "raw_results": raw_results,
    }

    report_path = _save_admin_report(kyc_id, payload)
    payload["admin_report_path"] = report_path

    return JsonResponse(payload, status=200)


@csrf_exempt
def transfer_intent(request):
    """
    POST /api/transfer-intent
    JSON payload: { kyc_id: string, accounts: [] }
    """
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body)
        kyc_id = data.get("kyc_id")
        accounts = data.get("accounts", [])

        if not kyc_id:
            return JsonResponse({"detail": "kyc_id is required"}, status=400)

        # Save to reports as transfer_{kyc_id}.json
        report_path = os.path.join(_reports_dir(), f"transfer_{kyc_id}.json")
        with open(report_path, "w") as f:
            json.dump({
                "kyc_id": kyc_id,
                "accounts": accounts,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }, f, indent=4)

        log.info("Saved transfer intent for kyc_id=%s to %s", kyc_id, report_path)
        return JsonResponse({"status": "success", "path": report_path})

    except Exception as e:
        log.error("Failed to save transfer intent: %s", e)
        return JsonResponse({"detail": str(e)}, status=500)


@csrf_exempt
def request_callback(request):
    """
    POST /api/request-callback
    JSON payload: { name: string, mobile: string, email: string, preferred_time: string }
    """
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body)
        name = data.get("name")
        mobile = data.get("mobile")
        email = data.get("email")
        preferred_time = data.get("preferred_time")

        if not name or not mobile:
            return JsonResponse({"detail": "Name and mobile are required"}, status=400)

        # For now, just log and save to a JSON file in reports
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        reports_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "reports")
        os.makedirs(reports_dir, exist_ok=True)
        report_path = os.path.join(reports_dir, f"callback_{ts}.json")
        
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump({
                "name": name,
                "mobile": mobile,
                "email": email,
                "preferred_time": preferred_time,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }, f, indent=4)

        log.info("Received callback request from %s (%s). Saved to %s", name, mobile, report_path)
        return JsonResponse({"status": "success", "message": "Callback request received"})

    except Exception as e:
        log.error("Failed to process callback request: %s", e)
        return JsonResponse({"detail": str(e)}, status=500)

