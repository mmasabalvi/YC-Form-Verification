# # api/services/pdf_report_generator.py

# from reportlab.lib.pagesizes import letter, A4
# from reportlab.lib import colors
# from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
# from reportlab.lib.units import inch
# from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, KeepTogether
# from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
# from datetime import datetime
# from typing import Dict, Any, List


# def generate_kyc_pdf_report(data: Dict[str, Any], output_path: str) -> str:
#     """
#     Generate a comprehensive PDF report from KYC data focusing on document verification status.
    
#     Args:
#         data: Dictionary containing complete KYC verification data
#         output_path: Full path where PDF should be saved
        
#     Returns:
#         Path to generated PDF file
#     """
#     doc = SimpleDocTemplate(
#         output_path,
#         pagesize=letter,
#         rightMargin=0.5*inch,
#         leftMargin=0.5*inch,
#         topMargin=0.5*inch,
#         bottomMargin=0.5*inch,
#     )
    
#     elements = []
#     styles = getSampleStyleSheet()
    
#     # Custom styles
#     title_style = ParagraphStyle(
#         'CustomTitle',
#         parent=styles['Heading1'],
#         fontSize=20,
#         textColor=colors.HexColor('#1e293b'),
#         spaceAfter=6,
#         alignment=TA_CENTER,
#         fontName='Helvetica-Bold',
#     )
    
#     subtitle_style = ParagraphStyle(
#         'Subtitle',
#         parent=styles['Heading2'],
#         fontSize=12,
#         textColor=colors.HexColor('#64748b'),
#         spaceAfter=12,
#         alignment=TA_CENTER,
#     )
    
#     section_style = ParagraphStyle(
#         'Section',
#         parent=styles['Heading2'],
#         fontSize=12,
#         textColor=colors.white,
#         backgroundColor=colors.HexColor('#1e293b'),
#         spaceAfter=8,
#         spaceBefore=12,
#         fontName='Helvetica-Bold',
#         leftIndent=6,
#         rightIndent=6,
#     )
    
#     normal_style = ParagraphStyle(
#         'CustomNormal',
#         parent=styles['Normal'],
#         fontSize=9,
#         textColor=colors.HexColor('#475569'),
#         spaceAfter=4,
#     )
    
#     # Extract data
#     kyc_id = data.get("kyc_id", "N/A")
#     final_verdict = data.get("final_verdict", "REVIEW")
#     verified_profile = data.get("verified_profile", {})
#     documents = data.get("documents", {})
#     timestamp = data.get("timestamp", datetime.now().strftime("%Y%m%d_%H%M%S"))
    
#     # Header
#     elements.append(Paragraph("YOUNGS CAPITAL", title_style))
#     elements.append(Paragraph("KYC Verification Report", subtitle_style))
#     elements.append(Spacer(1, 0.1*inch))
    
#     # Status Banner
#     status_color = {
#         "PASS": colors.HexColor('#10b981'),
#         "FAIL": colors.HexColor('#ef4444'),
#         "REVIEW": colors.HexColor('#f59e0b'),
#     }.get(final_verdict, colors.grey)
    
#     status_symbol = {
#         "PASS": "✅",
#         "FAIL": "❌",
#         "REVIEW": "⚠️",
#     }.get(final_verdict, "•")
    
#     status_data = [[
#         Paragraph(f"<b>{status_symbol} OVERALL STATUS: {final_verdict}</b>", normal_style),
#         Paragraph(f"Date: {datetime.now().strftime('%B %d, %Y at %H:%M')}", normal_style),
#         Paragraph(f"KYC ID: {kyc_id}", normal_style)
#     ]]
    
#     status_table = Table(status_data, colWidths=[2.5*inch, 2.5*inch, 2.5*inch])
#     status_table.setStyle(TableStyle([
#         ('BACKGROUND', (0, 0), (-1, -1), status_color),
#         ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
#         ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
#         ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
#         ('FONTSIZE', (0, 0), (-1, -1), 10),
#         ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
#         ('TOPPADDING', (0, 0), (-1, -1), 10),
#         ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
#     ]))
    
#     elements.append(status_table)
#     elements.append(Spacer(1, 0.2*inch))
    
#     # Customer Information
#     elements.append(Paragraph("■ CUSTOMER INFORMATION", section_style))
#     elements.append(Spacer(1, 0.05*inch))
    
#     customer_data = [
#         ["Full Name:", verified_profile.get("full_name", "N/A")],
#         ["CNIC:", verified_profile.get("cnic", "N/A")],
#         ["Date of Birth:", verified_profile.get("dob", "N/A")],
#         ["Mobile:", verified_profile.get("mobile", "N/A")],
#         ["Nationality:", verified_profile.get("nationality", "N/A")],
#     ]
    
#     customer_table = Table(customer_data, colWidths=[1.8*inch, 5.7*inch])
#     customer_table.setStyle(TableStyle([
#         ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f1f5f9')),
#         ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#1e293b')),
#         ('ALIGN', (0, 0), (0, -1), 'LEFT'),
#         ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
#         ('FONTSIZE', (0, 0), (-1, -1), 8),
#         ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
#         ('TOPPADDING', (0, 0), (-1, -1), 4),
#         ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
#     ]))
    
#     elements.append(customer_table)
#     elements.append(Spacer(1, 0.15*inch))
    
#     # DOCUMENT VERIFICATION CHECKLIST - THE MAIN FOCUS
#     elements.append(Paragraph("■ DOCUMENT VERIFICATION CHECKLIST", section_style))
#     elements.append(Spacer(1, 0.05*inch))
    
#     # Summary counts
#     pass_count = sum(1 for doc in documents.values() if doc.get("verdict") == "PASS")
#     review_count = sum(1 for doc in documents.values() if doc.get("verdict") == "REVIEW")
#     fail_count = sum(1 for doc in documents.values() if doc.get("verdict") == "FAIL")
#     total_count = len(documents)
    
#     summary_text = f"<b>Total Documents:</b> {total_count} | <b>✅ PASS:</b> {pass_count} | <b>⚠️ REVIEW:</b> {review_count} | <b>❌ FAIL:</b> {fail_count}"
#     elements.append(Paragraph(summary_text, normal_style))
#     elements.append(Spacer(1, 0.1*inch))
    
#     # Document details
#     for doc_kind, doc_data in documents.items():
#         verdict = doc_data.get("verdict", "UNKNOWN")
#         confidence = doc_data.get("confidence")
#         issues = doc_data.get("issues", [])
#         admin_report = doc_data.get("admin_report", {})
#         action_required = admin_report.get("action_required", "")
        
#         # Doc name formatting
#         doc_name = doc_kind.replace("_", " ").title()
        
#         # Status icon and color
#         if verdict == "PASS":
#             icon = "✅"
#             bg_color = colors.HexColor('#ecfdf5')
#             border_color = colors.HexColor('#10b981')
#         elif verdict == "FAIL":
#             icon = "❌"
#             bg_color = colors.HexColor('#fef2f2')
#             border_color = colors.HexColor('#ef4444')
#         else:  # REVIEW
#             icon = "⚠️"
#             bg_color = colors.HexColor('#fffbeb')
#             border_color = colors.HexColor('#f59e0b')
        
#         # Build doc info
#         conf_text = f"Confidence: {int(confidence*100)}%" if confidence is not None else "Confidence: N/A"
        
#         doc_header = [[Paragraph(f"<b>{icon} {doc_name}</b>", normal_style), Paragraph(f"<b>{verdict}</b> | {conf_text}", normal_style)]]
#         doc_table = Table(doc_header, colWidths=[5*inch, 2.5*inch])
#         doc_table.setStyle(TableStyle([
#             ('BACKGROUND', (0, 0), (-1, -1), bg_color),
#             ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#1e293b')),
#             ('ALIGN', (0, 0), (0, 0), 'LEFT'),
#             ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
#             ('FONTSIZE', (0, 0), (-1, -1), 9),
#             ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
#             ('TOPPADDING', (0, 0), (-1, -1), 6),
#             ('LEFTPADDING', (0, 0), (-1, -1), 8),
#             ('RIGHTPADDING', (0, 0), (-1, -1), 8),
#             ('BOX', (0, 0), (-1, -1), 2, border_color),
#         ]))
        
#         elements.append(doc_table)
        
#         # Issues and actions
#         if issues:
#             elements.append(Spacer(1, 0.05*inch))
#             issues_text = "<b>Issues:</b><br/>" + "<br/>".join([f"• {issue}" for issue in issues])
#             elements.append(Paragraph(issues_text, normal_style))
        
#         if action_required:
#             elements.append(Spacer(1, 0.05*inch))
#             action_style = ParagraphStyle('Action', parent=normal_style, textColor=colors.HexColor('#dc2626'), fontName='Helvetica-Bold')
#             elements.append(Paragraph(f"<b>⚡ ACTION REQUIRED:</b> {action_required}", action_style))
        
#         elements.append(Spacer(1, 0.1*inch))
    
#     # Employment & Income Info
#     elements.append(Paragraph("■ EMPLOYMENT & INCOME", section_style))
#     elements.append(Spacer(1, 0.05*inch))
    
#     employment_data = [
#         ["Occupation:", verified_profile.get("occupation", "N/A")],
#         ["Employer:", verified_profile.get("employer_name", "N/A")],
#         ["Job Title:", verified_profile.get("job_title", "N/A")],
#         ["Annual Income:", verified_profile.get("gross_annual_income", "N/A")],
#         ["Source of Income:", verified_profile.get("source_of_income", "N/A")],
#     ]
    
#     employment_table = Table(employment_data, colWidths=[1.8*inch, 5.7*inch])
#     employment_table.setStyle(TableStyle([
#         ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f1f5f9')),
#         ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
#         ('FONTSIZE', (0, 0), (-1, -1), 8),
#         ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
#         ('TOPPADDING', (0, 0), (-1, -1), 4),
#         ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
#     ]))
    
#     elements.append(employment_table)
#     elements.append(Spacer(1, 0.15*inch))
    
#     # Banking Information
#     elements.append(Paragraph("■ BANKING INFORMATION", section_style))
#     elements.append(Spacer(1, 0.05*inch))
    
#     banking_data = [
#         ["Bank Name:", verified_profile.get("bank_name", "N/A")],
#         ["IBAN:", verified_profile.get("iban", "N/A")],
#     ]
    
#     banking_table = Table(banking_data, colWidths=[1.8*inch, 5.7*inch])
#     banking_table.setStyle(TableStyle([
#         ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f1f5f9')),
#         ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
#         ('FONTSIZE', (0, 0), (-1, -1), 8),
#         ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
#         ('TOPPADDING', (0, 0), (-1, -1), 4),
#         ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
#     ]))
    
#     elements.append(banking_table)
#     elements.append(Spacer(1, 0.15*inch))
    
#     # Address Information
#     elements.append(Paragraph("■ ADDRESS INFORMATION", section_style))
#     elements.append(Spacer(1, 0.05*inch))
    
#     address_data = [
#         ["Permanent Address:", verified_profile.get("permanent_address_full", "N/A")],
#         ["Mailing Address:", verified_profile.get("mailing_address_full", "N/A") if not verified_profile.get("mailing_address_same") else "Same as permanent"],
#     ]
    
#     address_table = Table(address_data, colWidths=[1.8*inch, 5.7*inch])
#     address_table.setStyle(TableStyle([
#         ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f1f5f9')),
#         ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
#         ('FONTSIZE', (0, 0), (-1, -1), 8),
#         ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
#         ('TOPPADDING', (0, 0), (-1, -1), 4),
#         ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
#         ('VALIGN', (0, 0), (-1, -1), 'TOP'),
#     ]))
    
#     elements.append(address_table)
#     elements.append(Spacer(1, 0.15*inch))
    
#     # Tax & Compliance
#     elements.append(Paragraph("■ TAX & COMPLIANCE", section_style))
#     elements.append(Spacer(1, 0.05*inch))
    
#     tax_data = [
#         ["FATCA Status:", verified_profile.get("fatca_us_citizen", "N/A")],
#         ["Tax Residence:", verified_profile.get("fatca_tax_residence_country", "N/A")],
#         ["PEP Status:", verified_profile.get("is_pep", "N/A")],
#         ["Zakat Status:", verified_profile.get("zakat_status", "N/A")],
#     ]
    
#     tax_table = Table(tax_data, colWidths=[1.8*inch, 5.7*inch])
#     tax_table.setStyle(TableStyle([
#         ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f1f5f9')),
#         ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
#         ('FONTSIZE', (0, 0), (-1, -1), 8),
#         ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
#         ('TOPPADDING', (0, 0), (-1, -1), 4),
#         ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
#     ]))
    
#     elements.append(tax_table)
#     elements.append(Spacer(1, 0.2*inch))
    
#     # NEXT STEPS - Action Required Summary
#     elements.append(Paragraph("■ NEXT STEPS & REQUIRED ACTIONS", section_style))
#     elements.append(Spacer(1, 0.05*inch))
    
#     # Collect all action requireds
#     actions_needed = []
#     for doc_kind, doc_data in documents.items():
#         if doc_data.get("verdict") in ["REVIEW", "FAIL"]:
#             admin_report = doc_data.get("admin_report", {})
#             action = admin_report.get("action_required")
#             if action:
#                 doc_name = doc_kind.replace("_", " ").title()
#                 actions_needed.append(f"• <b>{doc_name}:</b> {action}")
    
#     if actions_needed:
#         next_steps_html = "<b>Documents requiring action:</b><br/><br/>" + "<br/>".join(actions_needed)
#         next_steps_html += "<br/><br/><b>Contact Customer:</b> Request the required documents/corrections."
#     else:
#         next_steps_html = "<b>Status: ALL DOCUMENTS VERIFIED ✅</b><br/><br/>All documents have passed verification. Customer is ready to proceed to account opening."
    
#     next_steps_html += "<br/><br/><b>Contact Operations Team:</b><br/>Email: operations@youngscapital.com<br/>Phone: +92-21-1234567"
    
#     elements.append(Paragraph(next_steps_html, normal_style))
    
#     # Footer
#     elements.append(Spacer(1, 0.2*inch))
#     footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=7, textColor=colors.HexColor('#94a3b8'), alignment=TA_CENTER)
#     elements.append(Paragraph("━" * 100, footer_style))
#     elements.append(Paragraph(f"Generated by Youngs Capital KYC System | Report ID: {kyc_id} | Timestamp: {timestamp}", footer_style))
    
#     # Build PDF
#     doc.build(elements)
    
#     return output_path
