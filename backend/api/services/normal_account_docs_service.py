# # app/services/account_docs_service.py

# from typing import Dict, Any, Optional
# import anyio

# from app.services.normal_account_gemini_docs import gemini_check_document


# DOC_SPECS = {
#     "cnic_front": {"doc_type": "CNIC_FRONT"},
#     "cnic_back": {"doc_type": "CNIC_BACK"},
#     "proof_address": {"doc_type": "PROOF_ADDRESS"},
#     "proof_employment": {"doc_type": "PROOF_EMPLOYMENT"},
#     "signature_proof": {"doc_type": "SIGNATURE_PROOF"},
#     "undertaking": {"doc_type": "UNDERTAKING"},
#     "zakat_declaration": {"doc_type": "ZAKAT_DECLARATION"},
#     "bank_statement": {"doc_type": "BANK_STATEMENT"},
#     "tax_return": {"doc_type": "TAX_RETURN"},
# }


# async def verify_account_documents(
#     typed: Dict[str, Any],
#     files: Dict[str, Dict[str, Any]],
#     relationship_proof: Optional[Dict[str, Any]] = None,
# ) -> Dict[str, Any]:

#     documents_out: Dict[str, Any] = {}
#     any_review = False
#     messages = []

#     async def _check_one(key: str):
#         nonlocal any_review
#         spec = DOC_SPECS[key]
#         b = files[key]["bytes"]
#         fn = files[key]["filename"]
#         r = await gemini_check_document(
#             file_bytes=b,
#             filename=fn,
#             doc_type=spec["doc_type"],
#             typed=typed,
#         )
#         documents_out[key] = r
#         if (r.get("verdict") or "REVIEW") != "PASS":
#             any_review = True

#     # Run sequential to keep it simple (you can parallelize later)
#     for k in DOC_SPECS.keys():
#         await _check_one(k)

#     # Relationship proof only if self_mobile is false
#     if not bool(typed.get("self_mobile", True)):
#         if relationship_proof and relationship_proof.get("bytes"):
#             rel = await gemini_check_document(
#                 file_bytes=relationship_proof["bytes"],
#                 filename=relationship_proof.get("filename", ""),
#                 doc_type="RELATIONSHIP_PROOF",
#                 typed=typed,
#             )
#             documents_out["relationship_proof"] = rel
#             if (rel.get("verdict") or "REVIEW") != "PASS":
#                 any_review = True
#         else:
#             documents_out["relationship_proof"] = {
#                 "verdict": "REVIEW",
#                 "admin_report": {
#                     "title": "Missing relationship proof",
#                     "issues": ["Self Mobile was unchecked but no relationship proof document was uploaded."],
#                     "action_required": "Ask user to upload relationship proof document.",
#                     "extracted": {},
#                 }
#             }
#             any_review = True

#     final_verdict = "PASS" if not any_review else "REVIEW"
#     if final_verdict == "PASS":
#         messages = ["Submitted successfully. All documents passed."]
#     else:
#         messages = ["Submitted successfully, but one or more documents require admin review."]

#     return {
#         "final_verdict": final_verdict,
#         "messages": messages,
#         "documents": documents_out,
#     }
