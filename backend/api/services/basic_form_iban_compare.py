import re
from difflib import SequenceMatcher
from typing import Any, Dict

IBAN_REGEX = re.compile(r"\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b", re.IGNORECASE)


def normalize_spaces(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip())


def normalize_name(s: str) -> str:
    s = (s or "").lower()
    s = re.sub(r"[^a-z\s]", " ", s)
    s = normalize_spaces(s)
    drop = {"mr", "mrs", "ms", "miss"}
    tokens = [t for t in s.split() if t and t not in drop]
    return " ".join(tokens)


def normalize_bank_name(s: str) -> str:
    s = (s or "").lower()
    s = re.sub(r"[^a-z0-9\s&().-]", " ", s)
    s = normalize_spaces(s)
    s = s.replace("limited", "ltd")
    s = s.replace("pakistan", "").strip()
    return normalize_spaces(s)


def normalize_iban(s: str) -> str:
    s = (s or "").upper()
    s = re.sub(r"[^A-Z0-9]", "", s)
    return s.strip()


def iban_checksum_valid(iban: str) -> bool:
    iban = normalize_iban(iban)
    if len(iban) < 5:
        return False

    rearranged = iban[4:] + iban[:4]

    digits = []
    for ch in rearranged:
        if ch.isdigit():
            digits.append(ch)
        elif "A" <= ch <= "Z":
            digits.append(str(ord(ch) - ord("A") + 10))
        else:
            return False

    remainder = 0
    for c in "".join(digits):
        remainder = (remainder * 10 + int(c)) % 97
    return remainder == 1


def similarity(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()


def token_overlap_ok(a: str, b: str, min_common: int = 2) -> bool:
    a_tokens = {t for t in normalize_name(a).split() if len(t) >= 3}
    b_tokens = {t for t in normalize_name(b).split() if len(t) >= 3}
    if len(a_tokens) < 2 or len(b_tokens) < 2:
        return True
    return len(a_tokens.intersection(b_tokens)) >= min_common


def _acronym(s: str) -> str:
    """
    Generate acronym from bank name.
    Examples:
    - "United Bank Limited" => "ubl"
    - "UBL" => "ubl" (already an acronym, return as-is)
    - "HBL" => "hbl" (already an acronym)
    """
    s_clean = s.strip()
    
    # If it's already likely an acronym (short, all caps, no spaces or very few),
    # just return it lowercased
    if len(s_clean) <= 5 and s_clean.isupper() and ' ' not in s_clean:
        return s_clean.lower()
    
    # Otherwise, create acronym from words
    words = [w for w in re.sub(r"[^a-zA-Z\s]", " ", s).split() if w]
    return "".join(w[0] for w in words).lower()


def compare_iban_bundle(
    user_name: str,
    user_iban: str,
    user_bank_name: str,
    extracted: Dict[str, Any],
    name_threshold: float = 0.88,
    bank_threshold: float = 0.84,
) -> Dict[str, Any]:
    u_iban = normalize_iban(user_iban)
    e_iban = normalize_iban(extracted.get("iban", ""))

    iban_ok = bool(u_iban and e_iban and u_iban == e_iban)
    checksum_ok = iban_checksum_valid(u_iban) if u_iban else False

    # Bank match: typed vs extracted (registry-free)
def _extract_aliases(s: str) -> list[str]:
    """
    Returns [full_clean_name, alias1, alias2...]
    Example: "United Bank (UBL)" -> ["United Bank", "UBL"]
    """
    s = (s or "")
    # Find text in parens
    aliases = re.findall(r"\((.*?)\)", s)
    # Remove parens to get main part
    main = re.sub(r"\(.*?\)", "", s).strip()
    
    candidates = [main] + aliases
    return [c.strip() for c in candidates if c.strip()]


def normalize_bank_name(s: str) -> str:
    s = (s or "").lower()
    s = re.sub(r"[^a-z0-9\s&.-]", " ", s) # Removed () from allowed chars to strip them if not handled by alias logic
    s = normalize_spaces(s)
    s = s.replace("limited", "ltd")
    s = s.replace("pakistan", "").strip()
    return normalize_spaces(s)


# ... (keep other helpers mostly same, but update compare logic) ...


def compare_iban_bundle(
    user_name: str,
    user_iban: str,
    user_bank_name: str,
    extracted: Dict[str, Any],
    name_threshold: float = 0.88,
    bank_threshold: float = 0.84,
) -> Dict[str, Any]:
    u_iban = normalize_iban(user_iban)
    e_iban = normalize_iban(extracted.get("iban", ""))

    iban_ok = bool(u_iban and e_iban and u_iban == e_iban)
    checksum_ok = iban_checksum_valid(u_iban) if u_iban else False

    # Bank match: typed vs extracted (registry-free)
    # Handle aliases in user input (e.g. "United Bank (UBL)")
    u_candidates = _extract_aliases(user_bank_name)
    e_bank = normalize_bank_name(extracted.get("bank_name", ""))
    
    bank_match = False
    bank_score = 0.0
    acr_ok = False
    
    # Try all user candidates (e.g. "United Bank", "UBL") against extracted
    best_candidate = ""
    
    for u_cand in u_candidates:
        u_norm = normalize_bank_name(u_cand)
        if not u_norm or not e_bank:
            continue
            
        # 1. Similarity
        sim = similarity(u_norm, e_bank)
        if sim > bank_score:
            bank_score = sim
            best_candidate = u_cand
            
        # 2. Acronym
        acr_u = _acronym(u_cand)
        acr_e = _acronym(extracted.get("bank_name") or "")
        if acr_u and acr_e and acr_u == acr_e:
            acr_ok = True
    
    # Debug logging
    import logging
    logger = logging.getLogger("gemini")
    logger.info("BANK COMPARISON DETAILS:")
    logger.info("  Typed Raw: '%s'", user_bank_name)
    logger.info("  Candidates: %s", u_candidates)
    logger.info("  Extracted Normalized: '%s'", e_bank)
    logger.info("  Max Similarity: %.3f (using '%s')", bank_score, best_candidate)
    logger.info("  Acronym match found: %s", acr_ok)

    bank_reason = "Compared typed bank name vs document bank name"
    if not e_bank:
        bank_match = False
        bank_reason += " (document bank missing)"
    else:
        bank_match = (bank_score >= bank_threshold) or acr_ok

    # Account title match
    u_name_norm = normalize_name(user_name)
    e_name_norm = normalize_name(extracted.get("account_title", ""))

    name_score = similarity(u_name_norm, e_name_norm) if (u_name_norm and e_name_norm) else 0.0
    overlap_ok = token_overlap_ok(user_name, extracted.get("account_title", ""))
    name_match = (name_score >= name_threshold) and overlap_ok

    fields_report = {
        "iban": {
            "user": u_iban,
            "extracted": e_iban,
            "checksum_valid": checksum_ok,
            "match": iban_ok,
        },
        "bank": {
            "user": user_bank_name,
            "extracted": extracted.get("bank_name"),
            "score": round(bank_score, 3),
            "acronym_match": acr_ok,
            "match": bank_match,
            "reason": bank_reason,
        },
        "account_title": {
            "user": user_name,
            "extracted": extracted.get("account_title"),
            "score": round(name_score, 3),
            "token_overlap_ok": overlap_ok,
            "match": name_match,
        },
    }

    # Verdict policy
    if not checksum_ok:
        verdict = "FAIL"
        failed_step = "iban_checksum"
    elif not iban_ok:
        verdict = "REVIEW"
        failed_step = "iban_mismatch"
    elif name_match and bank_match:
        verdict = "PASS"
        failed_step = None
    else:
        verdict = "REVIEW"
        failed_step = "compare"

    mismatches = []
    if not iban_ok:
        mismatches.append("IBAN does not match document")
    if not bank_match:
        mismatches.append("Bank name mismatch (typed vs document)")
    if not name_match:
        mismatches.append("Account title name mismatch")

    return {
        "verdict": verdict,
        "failed_step": failed_step,
        "mismatches": mismatches,
        "fields_report": fields_report,
    }
