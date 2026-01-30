# # app/services/account_compare.py

# import re
# from difflib import SequenceMatcher
# from typing import Dict, Any, Optional, Tuple, List


# def _norm_spaces(s: str) -> str:
#     return re.sub(r"\s+", " ", (s or "").strip())


# def norm_text(s: Optional[str]) -> str:
#     s = (s or "").lower()
#     s = re.sub(r"[^a-z0-9\s]", " ", s)
#     return _norm_spaces(s)


# def norm_name(s: Optional[str]) -> str:
#     s = (s or "").lower()
#     s = re.sub(r"[^a-z\s]", " ", s)
#     s = _norm_spaces(s)
#     # light cleanup
#     drop = {"mr", "mrs", "ms", "miss"}
#     toks = [t for t in s.split() if t and t not in drop]
#     return " ".join(toks)


# def norm_cnic(s: Optional[str]) -> str:
#     digits = re.sub(r"\D", "", (s or ""))
#     if len(digits) != 13:
#         return ""
#     return f"{digits[:5]}-{digits[5:12]}-{digits[12]}"


# def sim(a: str, b: str) -> float:
#     if not a or not b:
#         return 0.0
#     return SequenceMatcher(None, a, b).ratio()


# def _pick_expected(expected: Dict[str, Any], keys: List[str]) -> str:
#     for k in keys:
#         v = expected.get(k)
#         if isinstance(v, str) and v.strip():
#             return v.strip()
#     return ""


# def _pick_extracted(extracted: Dict[str, Any], keys: List[str]) -> str:
#     for k in keys:
#         v = extracted.get(k)
#         if isinstance(v, str) and v.strip():
#             return v.strip()
#     return ""


# def compare_extracted_to_expected(doc_kind: str, expected: Dict[str, Any], extracted: Dict[str, Any]) -> Dict[str, Any]:
#     """
#     Registry-free, tolerant comparisons.
#     Returns PASS/REVIEW + matches + admin_report.
#     """

#     issues: List[str] = []
#     matches: Dict[str, Any] = {}

#     # Common expected inputs (you can rename keys in your frontend JSON)
#     exp_name = _pick_expected(expected, ["name", "user_name"])
#     exp_cnic = _pick_expected(expected, ["cnic", "user_cnic"])
#     exp_dob = _pick_expected(expected, ["dob", "date_of_birth"])
#     exp_address = _pick_expected(expected, ["address_line_1", "address", "mailing_address"])
#     exp_employer = _pick_expected(expected, ["employer_name", "name_of_employer"])
#     exp_iban = _pick_expected(expected, ["iban", "user_iban"])
#     exp_bank = _pick_expected(expected, ["bank_name", "user_bank_name"])
#     exp_ntn = _pick_expected(expected, ["ntn"])
#     exp_tax_year = _pick_expected(expected, ["tax_year"])

#     # Extracted from Gemini (keys vary by doc_kind, so we try multiple)
#     got_name = _pick_extracted(extracted, ["name", "account_title", "account_holder", "customer_name"])
#     got_cnic = _pick_extracted(extracted, ["cnic", "identity_number"])
#     got_dob = _pick_extracted(extracted, ["dob", "date_of_birth"])
#     got_address = _pick_extracted(extracted, ["address", "residential_address", "mailing_address"])
#     got_employer = _pick_extracted(extracted, ["employer", "employer_name", "company"])
#     got_iban = _pick_extracted(extracted, ["iban"])
#     got_bank = _pick_extracted(extracted, ["bank_name", "bank"])
#     got_ntn = _pick_extracted(extracted, ["ntn"])
#     got_tax_year = _pick_extracted(extracted, ["tax_year", "year"])

#     # Compare rules by doc_kind
#     def name_check():
#         if not exp_name or not got_name:
#             return None
#         s = sim(norm_name(exp_name), norm_name(got_name))
#         return (s >= 0.88, s)

#     def bank_check():
#         if not exp_bank or not got_bank:
#             return None
#         s = sim(norm_text(exp_bank), norm_text(got_bank))
#         return (s >= 0.82, s)

#     def iban_check():
#         if not exp_iban or not got_iban:
#             return None
#         a = re.sub(r"[^A-Z0-9]", "", exp_iban.upper())
#         b = re.sub(r"[^A-Z0-9]", "", got_iban.upper())
#         ok = (a == b) and len(a) >= 15
#         return (ok, 1.0 if ok else 0.0)

#     def cnic_check():
#         if not exp_cnic or not got_cnic:
#             return None
#         ok = (norm_cnic(exp_cnic) == norm_cnic(got_cnic))
#         return (ok, 1.0 if ok else 0.0)

#     # Minimal checks per doc
#     checks = []
#     if doc_kind in ("cnic_front", "cnic_back"):
#         checks = [("cnic", cnic_check), ("name", name_check)]
#     elif doc_kind == "proof_of_address":
#         checks = [("name", name_check)]
#         if exp_address and got_address:
#             s = sim(norm_text(exp_address), norm_text(got_address))
#             checks.append(("address", lambda: (s >= 0.70, s)))
#     elif doc_kind == "proof_of_employment":
#         checks = [("name", name_check)]
#         if exp_employer and got_employer:
#             s = sim(norm_text(exp_employer), norm_text(got_employer))
#             checks.append(("employer", lambda: (s >= 0.75, s)))
#     elif doc_kind == "signature_proof":
#         checks = [("name", name_check)]  # signature presence should be done by Gemini in issues/admin_report
#     elif doc_kind == "undertaking":
#         checks = [("name", name_check), ("cnic", cnic_check)]
#     elif doc_kind == "zakat_declaration":
#         checks = [("name", name_check), ("cnic", cnic_check)]
#     elif doc_kind == "bank_statement":
#         checks = [("iban", iban_check), ("bank", bank_check), ("name", name_check)]
#     elif doc_kind == "tax_return":
#         checks = [("name", name_check)]
#         if exp_ntn and got_ntn:
#             ok = norm_text(exp_ntn) == norm_text(got_ntn)
#             checks.append(("ntn", lambda: (ok, 1.0 if ok else 0.0)))
#         if exp_tax_year and got_tax_year:
#             ok = norm_text(exp_tax_year) == norm_text(got_tax_year)
#             checks.append(("tax_year", lambda: (ok, 1.0 if ok else 0.0)))
#     else:
#         checks = [("name", name_check)]

#     # Evaluate
#     hard_miss = False
#     for field, fn in checks:
#         r = fn()
#         if r is None:
#             matches[field] = {"match": None, "score": None, "note": "missing expected or extracted"}
#             hard_miss = True
#             continue
#         ok, score = r
#         matches[field] = {"match": bool(ok), "score": round(float(score), 3)}
#         if not ok:
#             issues.append(f"{doc_kind}: {field} mismatch")
#             hard_miss = True

#     verdict = "PASS" if not hard_miss else "REVIEW"

#     admin_report = ""
#     if verdict != "PASS":
#         admin_report = f"{doc_kind}: review required. " + "; ".join(issues[:3]) + ". Ask user to re-upload clearer/correct document."

#     return {
#         "verdict": verdict,
#         "matches": matches,
#         "issues": issues,
#         "admin_report": admin_report,
#     }
