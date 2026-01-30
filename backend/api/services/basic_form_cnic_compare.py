import re
from datetime import datetime
from difflib import SequenceMatcher
from typing import Dict, Any, Optional


def _sim(a: str, b: str) -> float:
    return SequenceMatcher(None, a, b).ratio()


def normalize_cnic(v: Optional[str]) -> Optional[str]:
    if not v:
        return None
    digits = re.sub(r"\D", "", v)
    if len(digits) != 13:
        return None
    return f"{digits[:5]}-{digits[5:12]}-{digits[12]}"


def normalize_name(v: Optional[str]) -> Optional[str]:
    if not v:
        return None
    s = v.strip()
    s = re.sub(r"([a-z])([A-Z])", r"\1 \2", s)
    s = re.sub(r"[^A-Za-z\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    if len(s) < 4:
        return None
    return s.lower()


def normalize_date(v: Optional[str]) -> Optional[str]:
    if not v:
        return None
    s = v.strip().upper()
    if s == "LIFETIME":
        return "LIFETIME"
    s = s.replace("-", ".").replace("/", ".")
    try:
        d = datetime.strptime(s, "%d.%m.%Y")
        return d.strftime("%d.%m.%Y")
    except Exception:
        return None


def compare_fields(user_fields: Dict[str, Any], ocr_fields: Dict[str, Any]) -> Dict[str, Any]:

    u_cnic = normalize_cnic(user_fields.get("cnic"))
    o_cnic = normalize_cnic(ocr_fields.get("cnic"))

    u_name = normalize_name(user_fields.get("name"))
    o_name = normalize_name(ocr_fields.get("name"))

    u_issue = normalize_date(user_fields.get("issue_date"))
    o_issue = normalize_date(ocr_fields.get("issue_date"))

    u_exp = normalize_date(user_fields.get("expiry_date"))
    o_exp = normalize_date(ocr_fields.get("expiry_date"))

    NAME_SIM_THRESHOLD = 0.95  # stricter

    name_sim = 0.0
    name_match = False
    if u_name and o_name:
        name_sim = _sim(u_name, o_name)
        name_match = name_sim >= NAME_SIM_THRESHOLD
    else:
        name_match = False

    cnic_match = (u_cnic is not None and o_cnic is not None and u_cnic == o_cnic)

    # dates optional: if user didn't provide, don't force mismatch
    issue_match = True
    if (user_fields.get("issue_date") or "").strip():
        issue_match = (u_issue is not None and o_issue is not None and u_issue == o_issue)

    expiry_match = True
    if (user_fields.get("expiry_date") or "").strip():
        expiry_match = (u_exp is not None and o_exp is not None and u_exp == o_exp)

    result = {
        "fields": {
            "cnic": {"user": u_cnic, "ocr": o_cnic, "match": cnic_match},
            "name": {"user": u_name, "ocr": o_name, "match": name_match, "similarity": round(name_sim, 3)},
            "issue_date": {"user": u_issue, "ocr": o_issue, "match": issue_match},
            "expiry_date": {"user": u_exp, "ocr": o_exp, "match": expiry_match},
        }
    }

    # Overall verdict: require CNIC + NAME at minimum
    required = ["cnic", "name"]
    hard_fail = any(result["fields"][k]["match"] is False for k in required)

    result["overall"] = {"verdict": "PASS" if not hard_fail else "REVIEW", "required": required}
    return result
