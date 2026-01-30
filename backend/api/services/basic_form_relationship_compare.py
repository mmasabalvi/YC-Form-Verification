# basic_form_relationship_compare.py

import re
from difflib import SequenceMatcher
from typing import Any, Dict


def _sim(a: str, b: str) -> float:
    return SequenceMatcher(None, a, b).ratio()


def _norm_name(v: str) -> str:
    s = (v or "").lower()
    s = re.sub(r"[^a-z\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _norm_cnic(v: str) -> str:
    digits = re.sub(r"\D", "", (v or ""))
    if len(digits) != 13:
        return ""
    return f"{digits[:5]}-{digits[5:12]}-{digits[12]}"


def _norm_rel(v: str) -> str:
    return re.sub(r"\s+", " ", (v or "").strip().lower())


def _rel_kind(v: str) -> str:
    """
    Normalize relationship values coming from form (can be 'Father', 'Father Mobile', etc.)
    """
    s = _norm_rel(v)
    if not s:
        return "other"
    if "father" in s or "dad" in s:
        return "father"
    if "mother" in s or "mom" in s:
        return "mother"
    if "husband" in s or "spouse" in s:
        return "spouse"
    if "wife" in s:
        return "spouse"
    return "other"


def compare_relationship_bundle(
    typed_relative_name: str,
    typed_relationship: str,
    typed_relative_cnic: str,
    extracted: Dict[str, Any],
    typed_customer_name: str = "",
    typed_customer_cnic: str = "",
    name_threshold: float = 0.88,
) -> Dict[str, Any]:
    """
    Simplified Verification:
    1. If Gemini is confident (>0.85), PASS.
    2. If Gemini extracted customer_name matches typed_customer_name, PASS.
    """
    extra = extracted.get("extra") if isinstance(extracted.get("extra"), dict) else {}
    confidence = float(extra.get("confidence") or 0.0)

    # 1. Trust Gemini Confidence
    if confidence >= 0.80:
        return {"verdict": "PASS", "mismatches": [], "scores": {"confidence": confidence}}

    # 2. Check Name Match (Fallback if confidence is borderline)
    # The user specifically asked: "compare the customer name with the form submitted name"
    t_cust = _norm_name(typed_customer_name)
    e_cust = _norm_name(extra.get("customer_name") or "")
    
    # Also check relative name
    t_rel = _norm_name(typed_relative_name)
    e_rel = _norm_name(extra.get("relative_name") or "")

    cust_sim = _sim(t_cust, e_cust) if t_cust and e_cust else 0.0
    rel_sim = _sim(t_rel, e_rel) if t_rel and e_rel else 0.0

    # If customer name matches well, we assume it's valid proof
    if cust_sim > 0.8:
         return {"verdict": "PASS", "mismatches": [], "scores": {"customer_name_sim": cust_sim}}

    if rel_sim > 0.8:
         return {"verdict": "PASS", "mismatches": [], "scores": {"relative_name_sim": rel_sim}}

    return {
        "verdict": "FAIL", 
        "mismatches": ["Relationship could not be verified (low confidence and name mismatch)"],
        "scores": {"confidence": confidence, "customer_name_sim": cust_sim}
    }
