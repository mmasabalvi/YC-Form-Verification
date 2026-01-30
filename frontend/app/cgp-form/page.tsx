"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import DocumentRequirementsModal from "@/components/DocumentRequirementsModal";
import { useSearchParams } from "next/navigation";
import { PAKISTAN_CITIES } from "./pakistan-cities";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

// Document requirements for the modal
// Document requirements for the modal
const docs = [
  { document: "CNIC Front", format: "JPEG / PNG", instructions: "", remarks: "Upload Original front CNIC image" },
  { document: "CNIC Back", format: "JPEG / PNG", instructions: "", remarks: "Upload Original back CNIC image" },
  { document: "Digital Signature", format: "JPEG / PNG", instructions: "Plain white paper, signature as per CNIC", remarks: "" },
  { document: "Zakat Form", format: "PDF", instructions: "File size should not exceed 600KB\n• **Signed & stamped**\n• If older manual format, upload full front & back.", remarks: "" },
  { document: "Income Proof", format: "JPEG / PNG", instructions: "• Salaried: Salary Certificate / Slip\n• Businessman: Business Cover Letter (Template provided ahead)\n• All: **Signed & Stamped**", remarks: "" },
  { document: "Mailing Address", format: "JPEG / PNG", instructions: "Utility bill / Internet bill can also be used", remarks: "If different from CNIC/NADRA record. Preferably last month's bill" },
];

function formatDate(val: string) {
  let v = val.replace(/\D/g, "");
  if (v.length > 8) v = v.substring(0, 8);
  if (v.length > 4) return `${v.slice(0, 2)}.${v.slice(2, 4)}.${v.slice(4)}`;
  if (v.length > 2) return `${v.slice(0, 2)}.${v.slice(2)}`;
  return v;
}

function formatCNIC(val: string) {
  let v = val.replace(/\D/g, "");
  if (v.length > 13) v = v.substring(0, 13);

  // XXXXX-XXXXXXX-X
  if (v.length > 12) return `${v.slice(0, 5)}-${v.slice(5, 12)}-${v.slice(12)}`;
  if (v.length > 5) return `${v.slice(0, 5)}-${v.slice(5)}`;
  return v;
}

function formatPakistanPhone(val: string) {
  let v = val.replace(/\D/g, "");
  if (v.length > 10) v = v.substring(0, 10);

  // XXX XXXXXXX (3 digits space 7 digits)
  if (v.length > 3) return `${v.slice(0, 3)} ${v.slice(3)}`;
  return v;
}

// Country list for phone codes
const ALL_COUNTRIES = [
    { code: "+92", iso: "pk", name: "Pakistan" },
    { code: "+1", iso: "us", name: "United States" },
    { code: "+44", iso: "gb", name: "United Kingdom" },
    { code: "+971", iso: "ae", name: "United Arab Emirates" },
    { code: "+966", iso: "sa", name: "Saudi Arabia" },
    { code: "+1", iso: "ca", name: "Canada" },
    { code: "+86", iso: "cn", name: "China" },
    { code: "+61", iso: "au", name: "Australia" },
    { code: "+49", iso: "de", name: "Germany" },
    { code: "+33", iso: "fr", name: "France" },
    { code: "+39", iso: "it", name: "Italy" },
    { code: "+81", iso: "jp", name: "Japan" },
    { code: "+91", iso: "in", name: "India" },
    { code: "+90", iso: "tr", name: "Turkey" },
    { code: "+974", iso: "qa", name: "Qatar" },
    { code: "+973", iso: "bh", name: "Bahrain" },
    { code: "+968", iso: "om", name: "Oman" },
    { code: "+965", iso: "kw", name: "Kuwait" },
    { code: "+60", iso: "my", name: "Malaysia" },
    { code: "+65", iso: "sg", name: "Singapore" },
    { code: "+34", iso: "es", name: "Spain" },
    { code: "+31", iso: "nl", name: "Netherlands" },
    { code: "+46", iso: "se", name: "Sweden" },
    { code: "+47", iso: "no", name: "Norway" },
    { code: "+353", iso: "ie", name: "Ireland" },
    { code: "+64", iso: "nz", name: "New Zealand" },
    { code: "+82", iso: "kr", name: "South Korea" },
    { code: "+7", iso: "ru", name: "Russia" },
    { code: "+55", iso: "br", name: "Brazil" },
    { code: "+27", iso: "za", name: "South Africa" },
].sort((a, b) => a.name.localeCompare(b.name));

export default function CgpFormPage() {
  const sp = useSearchParams();
  const kycId = sp.get("kyc_id") || "";
  
  // New State for City Dropdown Condition
  const [residentialStatus, setResidentialStatus] = useState<string>("");
  
  // Data Fetching State
  const [dataFetched, setDataFetched] = useState(false);

  // Form State
  const [fullName, setFullName] = useState("");
  const [fatherHusbandName, setFatherHusbandName] = useState("");
  const [motherMaidenName, setMotherMaidenName] = useState("");
  const [dob, setDob] = useState("");
  const [placeOfBirth, setPlaceOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [nationality, setNationality] = useState("Pakistan");
  const [religion, setReligion] = useState("");
  const [otherReligion, setOtherReligion] = useState("");

  // Permanent Address
  const [permCountry, setPermCountry] = useState("");
  const [permProvince, setPermProvince] = useState("");
  const [permCity, setPermCity] = useState("");
  const [permAddr1, setPermAddr1] = useState("");
  const [permAddr2, setPermAddr2] = useState("");
  const [permAddr3, setPermAddr3] = useState("");

  // Mailing Address (conditional)
  const [mailingAddressSame, setMailingAddressSame] = useState(true);
  const [mailCountry, setMailCountry] = useState("");
  const [mailProvince, setMailProvince] = useState("");
  const [mailCity, setMailCity] = useState("");
  const [mailAddr1, setMailAddr1] = useState("");
  const [mailAddr2, setMailAddr2] = useState("");
  const [mailAddr3, setMailAddr3] = useState("");

  const [occupation, setOccupation] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [employerName, setEmployerName] = useState("");
  const [department, setDepartment] = useState("");
  const [employerCountry, setEmployerCountry] = useState("");
  const [employerCity, setEmployerCity] = useState("");
  const [employerAddress, setEmployerAddress] = useState("");
  const [grossAnnualIncome, setGrossAnnualIncome] = useState("");
  const [sourceOfIncome, setSourceOfIncome] = useState("");

  const [zakatStatus, setZakatStatus] = useState("");
  const [zakatDeclarationDate, setZakatDeclarationDate] = useState("");
  const [filerStatus, setFilerStatus] = useState(""); // "Filer" | "Non-Filer"
  const [cdcAccess, setCdcAccess] = useState("");
  const [profitSharing, setProfitSharing] = useState("");
  const [remittance, setRemittance] = useState("");

  // FATCA
  const [fatcaUsCitizen, setFatcaUsCitizen] = useState("no");
  const [fatcaUsCountryOfBirth, setFatcaUsCountryOfBirth] = useState("no");
  const [fatcaPowerOfAttorney, setFatcaPowerOfAttorney] = useState("no");
  const [fatcaUsAddress, setFatcaUsAddress] = useState("no");
  const [fatcaUsTelephone, setFatcaUsTelephone] = useState("no");
  const [fatcaTaxResidenceCountry, setFatcaTaxResidenceCountry] = useState("PAKISTAN");
  const [fatcaTaxpayerId, setFatcaTaxpayerId] = useState("N/A");

  // Standard Due Diligence
  const [isPep, setIsPep] = useState("no");
  const [pepDetails, setPepDetails] = useState("");
  const [accountRefused, setAccountRefused] = useState("no");
  const [accountRefusedDetails, setAccountRefusedDetails] = useState("");
  const [offshoreTaxLinks, setOffshoreTaxLinks] = useState("no");
  const [offshoreTaxLinksDetails, setOffshoreTaxLinksDetails] = useState("");
  const [highValueDealing, setHighValueDealing] = useState("no");
  const [highValueDealingDetails, setHighValueDealingDetails] = useState("");
  const [isDualNational, setIsDualNational] = useState("no");
  const [dualNationalityCountry, setDualNationalityCountry] = useState("");

  
  const [addNominee, setAddNominee] = useState(true);
  const [nomineeName, setNomineeName] = useState("");
  const [nomineeCnic, setNomineeCnic] = useState("");
  const [nomineeMobile, setNomineeMobile] = useState("");
  const [nomineeCountryCode, setNomineeCountryCode] = useState("+92");
  const [nomineeRelation, setNomineeRelation] = useState("");
  const [nomineeCnicIssuance, setNomineeCnicIssuance] = useState("");
  const [nomineeCnicExpiry, setNomineeCnicExpiry] = useState("");
  const [nomineeCnicFrontFile, setNomineeCnicFrontFile] = useState<File | null>(null);
  const [nomineeCnicBackFile, setNomineeCnicBackFile] = useState<File | null>(null);

  const [addAttorney, setAddAttorney] = useState(false);
  const [attorneyName, setAttorneyName] = useState("");
  const [attorneyCnic, setAttorneyCnic] = useState("");
  const [attorneyMobile, setAttorneyMobile] = useState("");
  const [attorneyRelation, setAttorneyRelation] = useState("");
  const [attorneyCnicIssuance, setAttorneyCnicIssuance] = useState("");
  const [attorneyCnicExpiry, setAttorneyCnicExpiry] = useState("");
  const [attorneyCnicFrontFile, setAttorneyCnicFrontFile] = useState<File | null>(null);
  const [attorneyCnicBackFile, setAttorneyCnicBackFile] = useState<File | null>(null);

  const [cnicFrontFile, setCnicFrontFile] = useState<File | null>(null);
  const [cnicBackFile, setCnicBackFile] = useState<File | null>(null);
  const [proofAddrFile, setProofAddrFile] = useState<File | null>(null);
  const [proofEmpFile, setProofEmpFile] = useState<File | null>(null);
  const [proofOfIncomeFile, setProofOfIncomeFile] = useState<File | null>(null);
  const [signFile, setSignFile] = useState<File | null>(null);
  const [undertakingFile, setUndertakingFile] = useState<File | null>(null);
  const [zakatFile, setZakatFile] = useState<File | null>(null);
  const [bankStatementFile, setBankStatementFile] = useState<File | null>(null);
  const [taxReturnFile, setTaxReturnFile] = useState<File | null>(null);

  // UI State
  const [reqOpen, setReqOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"loading" | "result">("loading");
  const [modalTitle, setModalTitle] = useState("Please wait…");
  const [modalDesc, setModalDesc] = useState("Submitting your application…");
  const [modalIcon, setModalIcon] = useState("⏳");
  const [showResultBox, setShowResultBox] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showAutoFillToast, setShowAutoFillToast] = useState(false);

  // Terms & Conditions States
  const [acceptGeneral, setAcceptGeneral] = useState(false);
  const [acceptHouse, setAcceptHouse] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [termsType, setTermsType] = useState<"general" | "house" | null>(null);



  function openTerms(type: "general" | "house") {
    setTermsType(type);
    setTermsModalOpen(true);
  }

  function handleTermsAccept() {
    if (termsType === "general") setAcceptGeneral(true);
    if (termsType === "house") setAcceptHouse(true);
    setTermsModalOpen(false);
  }

  // Lock scroll when terms modal is open
  useEffect(() => {
    if (termsModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [termsModalOpen]);

  // Auto-open requirements modal on mount
  useEffect(() => {
    setReqOpen(true);
  }, []);

  // Prevent accidental refresh during form filling or submission
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      // Trigger warning if submitting OR if name/occupation is filled (indicating form usage)
      if (submitting || fullName.length > 0 || occupation.length > 0) {
        e.preventDefault();
        e.returnValue = ""; // Required for Chrome
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [submitting, fullName, occupation]);

  // FETCH KYC DATA (Auto-fill with Polling)
  useEffect(() => {
    if (!kycId || dataFetched) return;

    let attempts = 0;
    const maxAttempts = 15; // 30 seconds max
    
    // We declare a function to handle the fetch
    const fetchWithRetry = () => {
        fetch(`${API_BASE}/api/get-kyc-data?kyc_id=${kycId}`)
        .then(res => res.json())
        .then(data => {
            // Backend returns the profile dict DIRECTLY (not wrapped in verified_profile)
            if (data && (data.full_name || data.permanent_address_translated || data.error)) {
                 if (data.error) {
                     // 404 or other error - retry
                     if (attempts < maxAttempts) {
                        attempts++;
                        setTimeout(fetchWithRetry, 2000);
                     }
                     return;
                 }

                const p = data; // The data IS the profile
                
                // CHECK IF ADDRESS IS READY
                // The background task might still be running. 
                // We typically look for 'permanent_address_translated'
                if (!p.permanent_address_translated && attempts < maxAttempts) {
                    attempts++;
                    setTimeout(fetchWithRetry, 2000); // Retry in 2s
                    return;
                }

                // DATA READY OR TIMEOUT
                
                // 1. Basic Info
                if (p.full_name) setFullName(p.full_name);
                if (p.father_husband_name) setFatherHusbandName(p.father_husband_name);

                // Auto-fill DOB and Gender
                if (p.date_of_birth) setDob(formatDate(p.date_of_birth));
                
                if (p.gender) {
                    const g = p.gender.toUpperCase();
                    if (g === "M" || g.includes("MALE")) setGender("male");
                    else if (g === "F" || g.includes("FEMALE")) setGender("female");
                }

                // 2. Permanent Address (Translated)
                if (p.permanent_address_translated) {
                    const parts = p.permanent_address_translated.split(",").map((s: string) => s.trim()).filter((s: string) => s);
                    setPermAddr1(parts[0] || "");
                    setPermAddr2(parts[1] || "");
                    setPermAddr3(parts.slice(2).join(", "));
                    setPermCountry("Pakistan"); 
                }

                // 3. Current Address
                if (p.current_address_english) {
                    if (p.current_address_english !== p.permanent_address_translated) {
                        setMailingAddressSame(false);
                        const parts = p.current_address_english.split(",").map((s: string) => s.trim()).filter((s: string) => s);
                        setMailAddr1(parts[0] || "");
                        setMailAddr2(parts[1] || "");
                        setMailAddr3(parts.slice(2).join(", "));
                        setMailCountry("Pakistan");
                    }
                }
                
                if (p.residential_status) setResidentialStatus(p.residential_status);
                
                setDataFetched(true);
                setShowAutoFillToast(true);
                // Scroll to top to ensure they see the prompt? Optional.
            } else {
                 // No profile yet? Retry
                 if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(fetchWithRetry, 2000);
                 }
            }
        })
        .catch(err => {
            console.error("Failed to auto-fill", err);
            // Retry on network error too?
            if (attempts < maxAttempts) {
                attempts++;
                setTimeout(fetchWithRetry, 2000);
            }
        });
    };

    // Start polling
    fetchWithRetry();

    // Cleanup not strictly needed as dataFetched flag stops re-runs
  }, [kycId, dataFetched]);

  // Validation for submit button
  const isFormValid = useMemo(() => {
    // Required personal details
    if (!fullName || !fatherHusbandName || !motherMaidenName || !dob || !placeOfBirth) return false;
    if (!gender || !maritalStatus || !nationality) return false;
    
    // Religion check
    if (!religion) return false;
    if (religion === "Other" && !otherReligion) return false;
    
    // Permanent address
    if (!permCountry || !permProvince || !permCity || !permAddr1) return false;
    
    // Mailing address (if different)
    if (!mailingAddressSame) {
      if (!mailCountry || !mailProvince || !mailCity || !mailAddr1) return false;
    }
    
    // Employment
    // Employment
    if (!occupation) return false;
    if (occupation !== "HOUSE WIFE" && !jobTitle) return false;
    if (!grossAnnualIncome || !sourceOfIncome) return false;
    
    // Tax & Account
    // Relaxed validation: Removed cdcAccess, profitSharing, remittance checks as fields are hidden
    if (!zakatStatus) return false;
    if (zakatStatus === "non_deductible" && !zakatDeclarationDate) return false;
    if (!filerStatus) return false;
    
    // FATCA - Country and TIN required
    if (!fatcaTaxResidenceCountry) return false;
    
    // Standard Due Diligence - conditional validations
    if (isPep === "yes" && !pepDetails) return false;
    if (accountRefused === "yes" && !accountRefusedDetails) return false;
    if (offshoreTaxLinks === "yes" && !offshoreTaxLinksDetails) return false;
    if (highValueDealing === "yes" && !highValueDealingDetails) return false;
    if (isDualNational === "yes" && !dualNationalityCountry) return false;
    
    // Nominee validation (if added)
    if (addNominee) {
      if (!nomineeName || !nomineeRelation || !nomineeCnic || !nomineeMobile) return false;
      if (!nomineeCnicIssuance || !nomineeCnicExpiry) return false;
    }

    // Terms Acceptance
    if (!acceptGeneral || !acceptHouse) return false;
    
    // Attorney validation (if added)
    // if (addAttorney) {
    //   if (!attorneyName || !attorneyRelation || !attorneyCnic || !attorneyMobile) return false;
    //   if (!attorneyCnicIssuance || !attorneyCnicExpiry) return false;
    // }
    
    return true;
  }, [fatherHusbandName, motherMaidenName, dob, placeOfBirth, gender, maritalStatus, nationality, religion, otherReligion, permCountry, permProvince, permCity, permAddr1, mailingAddressSame, mailCountry, mailProvince, mailCity, mailAddr1, occupation, jobTitle, grossAnnualIncome, sourceOfIncome, zakatStatus, zakatDeclarationDate, cdcAccess, profitSharing, remittance, addNominee, nomineeName, nomineeRelation, nomineeCnic, nomineeMobile, nomineeCnicIssuance, nomineeCnicExpiry, addAttorney, attorneyName, attorneyRelation, attorneyCnic, attorneyMobile, attorneyCnicIssuance, attorneyCnicExpiry, fatcaTaxResidenceCountry, isPep, pepDetails, accountRefused, accountRefusedDetails, offshoreTaxLinks, offshoreTaxLinksDetails, highValueDealing, highValueDealingDetails, isDualNational, dualNationalityCountry, acceptGeneral, acceptHouse]);

  // Completion calculation
  const completionPercent = useMemo(() => {
    let total = 0;
    let filled = 0;
    const check = (c: boolean) => { total++; if(c) filled++; };

    check(!!fullName); check(!!fatherHusbandName); check(!!motherMaidenName); check(dob.length === 10); check(!!placeOfBirth);
    check(!!gender); check(!!maritalStatus); check(!!nationality); 
    
    // Custom religion check
    if (religion === "Other") {
        check(!!otherReligion);
    } else {
        check(!!religion);
    }

    check(!!permCountry); check(!!permProvince); check(!!permCity); check(!!permAddr1);
    if (!mailingAddressSame) {
      check(!!mailCountry); check(!!mailProvince); check(!!mailCity); check(!!mailAddr1);
    }
    
    check(!!occupation); 
    if (occupation !== "HOUSE WIFE") {
      check(!!jobTitle);
    }
    
    check(!!grossAnnualIncome); check(!!sourceOfIncome);
    check(!!zakatStatus); 
    if (zakatStatus === "non_deductible") {
        check(!!zakatDeclarationDate);
        check(!!zakatFile);
    }
    
    check(!!filerStatus);
    check(!!fatcaTaxResidenceCountry);
    check(!!acceptGeneral);
    check(!!acceptHouse);

    check(!!cnicFrontFile); check(!!cnicBackFile); 
    
    if (!mailingAddressSame) {
        check(!!proofAddrFile);
    }
    
    check(!!proofEmpFile);
    check(!!proofOfIncomeFile); check(!!signFile); 
    
    if (filerStatus === "Non-Filer") {
        check(!!undertakingFile); 
    }
    
    check(!!bankStatementFile);

    if (addNominee) {
        check(!!nomineeName);
        check(!!nomineeRelation);
        check(!!nomineeCnic && nomineeCnic.length === 15);
        check(!!nomineeMobile);
        check(!!nomineeCnicIssuance);
        check(!!nomineeCnicExpiry);
        check(!!nomineeCnicFrontFile);
        check(!!nomineeCnicBackFile);
    }

    if(total === 0) return 0;
    return Math.round((filled / total) * 100);
  }, [fullName, fatherHusbandName, motherMaidenName, dob, placeOfBirth, gender, maritalStatus, nationality, religion, otherReligion, permCountry, permProvince, permCity, permAddr1, mailingAddressSame, mailCountry, mailProvince, mailCity, mailAddr1, occupation, jobTitle, grossAnnualIncome, sourceOfIncome, zakatStatus, zakatDeclarationDate, zakatFile, filerStatus, fatcaTaxResidenceCountry, acceptGeneral, acceptHouse, cnicFrontFile, cnicBackFile, proofAddrFile, proofEmpFile, proofOfIncomeFile, signFile, undertakingFile, bankStatementFile, addNominee, nomineeName, nomineeRelation, nomineeCnic, nomineeMobile, nomineeCnicIssuance, nomineeCnicExpiry, nomineeCnicFrontFile, nomineeCnicBackFile]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    
    // Validation for Other Religion
    if (religion === "Other") {
        const forbidden = ["islam", "christianity", "hinduism"];
        if (forbidden.includes(otherReligion.trim().toLowerCase())) {
            alert("Please select the appropriate religion from the dropdown list.");
            setSubmitting(false);
            return;
        }
        if (!otherReligion.trim()) {
            alert("Please specify your religion.");
            setSubmitting(false);
            return;
        }
    }

    setOverlayOpen(true);
    setModalMode("loading");
    setModalIcon("⏳");
    setModalTitle("Please wait…");
    setModalDesc("Uploading documents and data...");

    const fd = new FormData();
    fd.append("kyc_id", kycId);
    fd.append("full_name", fullName);
    fd.append("father_husband_name", fatherHusbandName);
    fd.append("mother_maiden_name", motherMaidenName);
    fd.append("dob", dob);
    fd.append("place_of_birth", placeOfBirth);
    fd.append("gender", gender);
    fd.append("marital_status", maritalStatus);
    fd.append("nationality", nationality);
    fd.append("religion", religion === "Other" ? otherReligion : religion);
    
    fd.append("perm_country", permCountry);
    fd.append("perm_province", permProvince);
    fd.append("perm_city", permCity);
    fd.append("perm_addr1", permAddr1);
    fd.append("perm_addr2", permAddr2);
    fd.append("perm_addr3", permAddr3);
    
    fd.append("mailing_address_same", mailingAddressSame ? "true" : "false");
    if (!mailingAddressSame) {
      fd.append("mail_country", mailCountry);
      fd.append("mail_province", mailProvince);
      fd.append("mail_city", mailCity);
      fd.append("mail_addr1", mailAddr1);
      fd.append("mail_addr2", mailAddr2);
      fd.append("mail_addr3", mailAddr3);
    }
    fd.append("occupation", occupation);
    fd.append("job_title", jobTitle);
    fd.append("employer_name", employerName);
    fd.append("department", department);
    fd.append("employer_country", employerCountry);
    fd.append("employer_city", employerCity);
    fd.append("employer_address", employerAddress);
    fd.append("gross_annual_income", grossAnnualIncome);
    fd.append("source_of_income", sourceOfIncome);
    
    // Removed NTN / Tax Year
    
    fd.append("zakat_status", zakatStatus);
    if (zakatStatus === "non_deductible") {
      fd.append("zakat_declaration_date", zakatDeclarationDate);
    }
    fd.append("filer_status", filerStatus);
    fd.append("cdc_access", cdcAccess);
    fd.append("profit_sharing", profitSharing);
    fd.append("remittance", remittance);
    
    // FATCA
    fd.append("fatca_us_citizen", fatcaUsCitizen);
    fd.append("fatca_us_country_of_birth", fatcaUsCountryOfBirth);
    fd.append("fatca_power_of_attorney", fatcaPowerOfAttorney);
    fd.append("fatca_us_address", fatcaUsAddress);
    fd.append("fatca_us_telephone", fatcaUsTelephone);
    fd.append("fatca_tax_residence_country", fatcaTaxResidenceCountry);
    fd.append("fatca_taxpayer_id", fatcaTaxpayerId);
    
    // Standard Due Diligence
    fd.append("is_pep", isPep);
    if (isPep === "yes") fd.append("pep_details", pepDetails);
    fd.append("account_refused", accountRefused);
    if (accountRefused === "yes") fd.append("account_refused_details", accountRefusedDetails);
    fd.append("offshore_tax_links", offshoreTaxLinks);
    if (offshoreTaxLinks === "yes") fd.append("offshore_tax_links_details", offshoreTaxLinksDetails);
    fd.append("high_value_dealing", highValueDealing);
    if (highValueDealing === "yes") fd.append("high_value_dealing_details", highValueDealingDetails);
    fd.append("is_dual_national", isDualNational);
    if (isDualNational === "yes") fd.append("dual_nationality_country", dualNationalityCountry);
    
    if(addNominee) {
        fd.append("add_nominee", "true");
        fd.append("nominee_name", nomineeName);
        fd.append("nominee_cnic", nomineeCnic);
        fd.append("nominee_mobile", `${nomineeCountryCode}-${nomineeMobile}`);
        fd.append("nominee_relation", nomineeRelation);
        fd.append("nominee_cnic_issuance", nomineeCnicIssuance);
        fd.append("nominee_cnic_expiry", nomineeCnicExpiry);
        if(nomineeCnicFrontFile) fd.append("nominee_cnic_front", nomineeCnicFrontFile);
        if(nomineeCnicBackFile) fd.append("nominee_cnic_back", nomineeCnicBackFile);
    }
    
    // if(addAttorney) {
    //     fd.append("add_attorney", "true");
    //     fd.append("attorney_name", attorneyName);
    //     fd.append("attorney_cnic", attorneyCnic);
    //     fd.append("attorney_mobile", attorneyMobile);
    //     fd.append("attorney_relation", attorneyRelation);
    //     fd.append("attorney_cnic_issuance", attorneyCnicIssuance);
    //     fd.append("attorney_cnic_expiry", attorneyCnicExpiry);
    //     if(attorneyCnicFrontFile) fd.append("attorney_cnic_front", attorneyCnicFrontFile);
    //     if(attorneyCnicBackFile) fd.append("attorney_cnic_back", attorneyCnicBackFile);
    // }

    if(cnicFrontFile) fd.append("cnic_front", cnicFrontFile);
    if(cnicBackFile) fd.append("cnic_back", cnicBackFile);
    if(proofAddrFile) fd.append("proof_of_address", proofAddrFile);
    if(proofEmpFile) fd.append("proof_of_employment", proofEmpFile);
    if(proofOfIncomeFile) fd.append("proof_of_income", proofOfIncomeFile);
    if(signFile) fd.append("signature_proof", signFile);
    if(undertakingFile && filerStatus === "Non-Filer") fd.append("undertaking", undertakingFile);
    if(zakatFile) fd.append("zakat_declaration", zakatFile);
    if(bankStatementFile) fd.append("bank_statement", bankStatementFile);
    if(taxReturnFile) fd.append("tax_return", taxReturnFile);

    try {
        const res = await fetch(`${API_BASE}/api/submit-account-form`, {
            method: "POST",
            body: fd,
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            throw new Error(data?.detail || "Submission failed");
        }
        
        setModalMode("result");
        setModalIcon("✅");
        setModalTitle("Application Submitted");
        setModalDesc("Your account application has been received successfully.");
        setIsSuccess(true);
        setShowResultBox(true);
        window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (err: any) {
        setModalMode("result");
        setModalIcon("❌");
        setModalTitle("Submission Failed");
        setModalDesc(err.message || "An error occurred.");
        setIsSuccess(false);
        setShowResultBox(true);
        setOverlayOpen(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
        setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      <div className="absolute inset-0 z-0 bg-white opacity-40 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(rgb(226, 232, 240) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      />
      
      {showAutoFillToast && (
        <div className="fixed top-24 right-6 z-50 w-80 animate-in slide-in-from-right-10 duration-500">
             <div className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-slate-200">
                 <div className="absolute top-0 left-0 h-1 w-full bg-emerald-500" />
                 <button onClick={() => setShowAutoFillToast(false)} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                 </button>
                 <div className="flex items-start gap-4">
                     <div className="mt-1 h-8 w-8 shrink-0 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                         </svg>
                     </div>
                     <div>
                         <h4 className="font-bold text-slate-900">Details Auto-filled</h4>
                         <p className="mt-1 text-xs text-slate-500 leading-relaxed">We have pre-filled your address and basic details. Please verify.</p>
                     </div>
                 </div>
             </div>
        </div>
      )}

      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-8 pb-8 text-center">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900">
          Standard Account Form
        </h1>
        <p className="mt-4 text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Complete your profile details below to open your account.
        </p>
        {kycId && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-500">
            <span>KYC ID:</span>
            <span className="font-mono text-slate-900">{kycId}</span>
          </div>
        )}
        <div className="mt-8 flex flex-col items-center gap-4">
          <button
           type="button"
           onClick={() => setReqOpen(true)}
           className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-base font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 transition-all active:scale-[0.98]"
          >
           <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
           </svg>
           View Document Requirements
          </button>
          <div className="flex items-center gap-6 text-base font-bold text-slate-700">
              <a href="/faqs" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Account Opening FAQs
              </a>
              <a href="https://www.youtube.com/watch?v=ChR8QQJ99nw" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-red-600 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                  </svg>
                  How to Open an Account?
              </a>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
          
           <div className="bg-slate-50/50 border-b border-slate-100 px-8 py-5 flex items-center justify-between">
             <h2 className="text-2xl font-bold text-slate-800">Application Form</h2>
             <div className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
               Secure & Encrypted
             </div>
          </div>

          {/* Sticky Progress Bar */}
          <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm px-8 pt-4 pb-4 border-b border-slate-100">
              <div className="flex justify-between items-center text-base font-bold text-slate-700 mb-2">
                  <span>Completion</span>
                  <span>{completionPercent}%</span>
              </div>
              <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div 
                      className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                      style={{ width: `${completionPercent}%` }}
                  />
              </div>
          </div>

          <div className="p-6 md:p-10">
            {showResultBox && (
              <div className={`mb-8 rounded-xl border p-4 ${
                isSuccess ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{isSuccess ? '✅' : '❌'}</span>
                    <div className="text-base font-bold text-slate-800">
                      {isSuccess ? 'Success!' : 'Submission Failed'}
                    </div>
                  </div>
                </div>
                <div className="mt-4 border-t border-black/5 pt-3 text-sm text-slate-700">
                  {isSuccess ? 'Your application has been submitted successfully. Our team will contact you shortly.' : 'Please try again or contact support.'}
                </div>
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-10">
              
              {/* Auto-fill Notification */}


              {/* Personal Details */}
              <div>
                <h3 className="mb-5 text-base font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <span className="w-6 h-px bg-slate-200"></span> Personal Details
                </h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FieldInput label="Full Name" value={fullName} onChange={setFullName} required valid={!!fullName} placeholder="Your full name as per CNIC" />
                  <FieldInput label="Father / Husband Name" value={fatherHusbandName} onChange={setFatherHusbandName} required valid={!!fatherHusbandName} />
                  <FieldInput label="Mother's Maiden Name" value={motherMaidenName} onChange={setMotherMaidenName} required valid={!!motherMaidenName} />
                  <FieldInput label="Date of Birth (DD.MM.YYYY)" value={dob} onChange={(v) => setDob(formatDate(v))} placeholder="DD.MM.YYYY" maxLength={10} required valid={dob.length === 10} />
                  {residentialStatus === "resident" ? (
                    <SearchableCitySelect label="Place of Birth (City)" value={placeOfBirth} onChange={setPlaceOfBirth} required valid={!!placeOfBirth} />
                  ) : (
                    <FieldInput label="Place of Birth (City)" value={placeOfBirth} onChange={setPlaceOfBirth} required valid={!!placeOfBirth} />
                  )}

                  <FieldSelect label="Gender" value={gender} onChange={setGender} options={[{value:"", label:"Select Gender"}, {value:"male", label:"Male"}, {value:"female", label:"Female"}, {value:"other", label:"Other"}]} required valid={!!gender} />
                  <FieldSelect label="Marital Status" value={maritalStatus} onChange={setMaritalStatus} options={[{value:"", label:"Select Status"}, {value:"single", label:"Single"}, {value:"married", label:"Married"}, {value:"divorced", label:"Divorced"}]} required valid={!!maritalStatus} />
                  
                  
                  {/* Nationality with Searchable Dropdown */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">
                        Nationality <span className="text-rose-500">*</span>
                    </label>
                    <SearchableCountrySelect value={nationality} onChange={setNationality} valid={!!nationality} />
                  </div>
                  <div className={religion === "Other" ? "col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6" : ""}>
                      <FieldSelect label="Religion" value={religion} onChange={setReligion} options={[{value:"", label:"Select Religion"}, {value:"Islam", label:"Islam"}, {value:"Christianity", label:"Christianity"}, {value:"Hinduism", label:"Hinduism"}, {value:"Other", label:"Other"}]} required valid={!!religion} />
                      {religion === "Other" && (
                          <FieldInput label="Specify Religion" value={otherReligion} onChange={setOtherReligion} required valid={!!otherReligion} placeholder="Enter your religion" />
                      )}
                  </div>
                </div>
              </div>

              <Divider />

              {/* Permanent Address */}
              <div>
                <h3 className="mb-5 text-base font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <span className="w-6 h-px bg-slate-200"></span> Permanent Address
                </h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FieldInput label="Country" value={permCountry} onChange={setPermCountry} required valid={!!permCountry} />
                  <FieldSelect label="Province / State" value={permProvince} onChange={setPermProvince} options={[{value: "", label: "Select Province"}, ...["Azad Kashmir", "Balochistan", "Federal", "Gilgit Baltistan", "KPK", "Punjab", "Sindh"].map(p => ({value: p, label: p}))]} required valid={!!permProvince} />
                  {residentialStatus === "resident" ? (
                    <SearchableCitySelect label="City" value={permCity} onChange={setPermCity} required valid={!!permCity} />
                  ) : (
                    <FieldInput label="City" value={permCity} onChange={setPermCity} required valid={!!permCity} />
                  )}
                  <FieldInput label="Address Line 1" value={permAddr1} onChange={setPermAddr1} placeholder="House #, Street #" required valid={!!permAddr1} />
                  <FieldInput label="Address Line 2" value={permAddr2} onChange={setPermAddr2} placeholder="Area / Block (Optional)" valid={false} />
                  <FieldInput label="Address Line 3" value={permAddr3} onChange={setPermAddr3} placeholder="Landmark (Optional)" valid={false} />
                </div>

                <div className="mt-4 flex items-center gap-2 text-sm font-medium text-amber-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Note: Please ensure the address entered matches your CNIC exactly to avoid verification delays.</span>
                </div>
                
                <div className="mt-6">
                  <ToggleRow label="Mailing address same as permanent address" checked={mailingAddressSame} onChange={setMailingAddressSame} />
                </div>
                
                {!mailingAddressSame && (
                  <div className="mt-6 bg-slate-50 p-6 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-top-2">
                    <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">Mailing Address</h4>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <FieldInput label="Country" value={mailCountry} onChange={setMailCountry} required valid={!!mailCountry} />
                      <FieldSelect label="Province / State" value={mailProvince} onChange={setMailProvince} options={[{value: "", label: "Select Province"}, ...["Azad Kashmir", "Balochistan", "Federal", "Gilgit Baltistan", "KPK", "Punjab", "Sindh"].map(p => ({value: p, label: p}))]} required valid={!!mailProvince} />
                      {residentialStatus === "resident" ? (
                        <SearchableCitySelect label="City" value={mailCity} onChange={setMailCity} required valid={!!mailCity} />
                      ) : (
                        <FieldInput label="City" value={mailCity} onChange={setMailCity} required valid={!!mailCity} />
                      )}
                      <FieldInput label="Address Line 1" value={mailAddr1} onChange={setMailAddr1} placeholder="House #, Street #" required valid={!!mailAddr1} />
                      <FieldInput label="Address Line 2" value={mailAddr2} onChange={setMailAddr2} placeholder="Area / Block (Optional)" valid={false} />
                      <FieldInput label="Address Line 3" value={mailAddr3} onChange={setMailAddr3} placeholder="Landmark (Optional)" valid={false} />
                    </div>
                  </div>
                )}
              </div>

              <Divider />

              {/* Employment */}
              <div>
                <h3 className="mb-5 text-base font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <span className="w-6 h-px bg-slate-200"></span> Employment Information
                </h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FieldSelect label="Occupation" value={occupation} onChange={setOccupation} options={[
                    {value:"", label:"Select Occupation"},
                    {value:"AGRICULTURIST", label:"AGRICULTURIST"},
                    {value:"BUSINESS", label:"BUSINESS"},
                    {value:"BUSINESS EXECUTIVE", label:"BUSINESS EXECUTIVE"},
                    {value:"GOVT./PUBLIC SECTOR", label:"GOVT./PUBLIC SECTOR"},
                    {value:"HOUSE HOLD", label:"HOUSE HOLD"},
                    {value:"HOUSE WIFE", label:"HOUSE WIFE"},
                    {value:"INDUSTRIALIST", label:"INDUSTRIALIST"},
                    {value:"PROFESSIONAL", label:"PROFESSIONAL"},
                    {value:"RETIRED PERSON", label:"RETIRED PERSON"},
                    {value:"SERVICE", label:"SERVICE"},
                    {value:"STUDENT", label:"STUDENT"}
                  ]} required valid={!!occupation} />
                  
                  {occupation !== "HOUSE WIFE" && (
                    <>
                      <FieldInput 
                        label={occupation === "STUDENT" ? "Degree / Class" : "Job Title / Designation"} 
                        value={jobTitle} 
                        onChange={setJobTitle} 
                        required 
                        valid={!!jobTitle} 
                        spellCheck={true}
                        textarea={true}
                      />
                      <FieldInput 
                        label={occupation === "STUDENT" ? "Institute / University Name" : "Employer / Business Name"} 
                        value={employerName} 
                        onChange={setEmployerName} 
                        valid={!!employerName} 
                      />
                      <FieldInput 
                        label={occupation === "STUDENT" ? "Department / Major" : "Department"} 
                        value={department} 
                        onChange={setDepartment} 
                        valid={!!department} 
                        spellCheck={true}
                        textarea={true}
                      />
                    </>
                  )}
                </div>
                
                {occupation !== "HOUSE WIFE" && (
                  <div className="mt-6">
                    <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-600">
                      {occupation === "STUDENT" ? "Institute Address" : "Employer Address"}
                    </h4>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <FieldInput label="Country" value={employerCountry} onChange={setEmployerCountry} valid={!!employerCountry} />
                      {residentialStatus === "resident" ? (
                        <SearchableCitySelect label="City" value={employerCity} onChange={setEmployerCity} valid={!!employerCity} />
                      ) : (
                        <FieldInput label="City" value={employerCity} onChange={setEmployerCity} valid={!!employerCity} />
                      )}
                    </div>
                    <div className="mt-6">
                      <FieldInput label="Address" value={employerAddress} onChange={setEmployerAddress} valid={!!employerAddress} placeholder={occupation === "STUDENT" ? "Detailed institute address" : "Detailed employer address"} />
                    </div>
                  </div>
                )}

                
                {(occupation === "BUSINESS" || occupation === "BUSINESS EXECUTIVE") && (
                   <div className="mt-6 p-5 bg-amber-50 border border-amber-200 rounded-xl flex flex-col md:flex-row items-center justify-between gap-5">
                      <div>
                          <p className="text-sm font-bold text-amber-900">Income Proof Requirement</p>
                          <p className="text-sm text-amber-700 mt-1">Please upload the Business Cover Letter as income proof.</p>
                      </div>
                      <a 
                        href="/Business Cover Letter - Template.docx" 
                        download
                        className="px-5 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-xl transition-colors flex items-center gap-2 text-xs font-bold shadow-sm"
                      >
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0L8 8m4-4v12" /></svg>
                         Download Template
                      </a>
                   </div>
                )}

                <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FieldSelect label="Gross Annual Income (Monthly Income × 12)" value={grossAnnualIncome} onChange={setGrossAnnualIncome} options={[
                    {value:"", label:"Select Any One"},
                    {value:"UP TO 1,200,000", label:"UP TO 1,200,000"},
                    {value:"1,200,001 - 3,000,000", label:"1,200,001 - 3,000,000"},
                    {value:"3,000,001 - 6,000,000", label:"3,000,001 - 6,000,000"},
                    {value:"6,000,001 - 12,000,000", label:"6,000,001 - 12,000,000"},
                    {value:"12,000,001 - 30,000,000", label:"12,000,001 - 30,000,000"},
                    {value:"Above 30,000,000", label:"Above 30,000,000"}
                  ]} required valid={!!grossAnnualIncome} />
                  <FieldInput label="Source of Income" value={sourceOfIncome} onChange={setSourceOfIncome} placeholder="Salary, Rent, Business, etc" valid={!!sourceOfIncome} textarea={true} spellCheck={true} />
                </div>
              </div>

              <Divider />

              {/* Tax & Account */}
              <div>
                <h3 className="mb-5 text-base font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <span className="w-6 h-px bg-slate-200"></span> Tax & Account Details
                </h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FieldSelect label="Zakat Status" value={zakatStatus} onChange={setZakatStatus} options={[
                    {value:"", label:"Select Zakat Status"},
                    {value:"deductible", label:"Muslim Zakat Deductible"},
                    {value:"non_deductible", label:"Muslim Zakat Non-Deductible"},
                    {value:"not_applicable", label:"Not Applicable"}
                  ]} required valid={!!zakatStatus} />
                  {zakatStatus === "non_deductible" && (
                    <>
                      <FieldInput label="Zakat Declaration Date (DD.MM.YYYY)" value={zakatDeclarationDate} onChange={(v) => setZakatDeclarationDate(formatDate(v))} placeholder="DD.MM.YYYY" maxLength={10} required valid={zakatDeclarationDate.length === 10} />
                      <div className="col-span-1 md:col-span-2 p-5 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col md:flex-row items-center justify-between gap-5 animate-in fade-in slide-in-from-top-2">
                        <div>
                            <p className="text-sm font-bold text-emerald-900">Zakat Declaration Requirement</p>
                            <p className="text-sm text-emerald-700 mt-1">You must submit a Zakat Declaration Form (CZ-50). Please download the template.</p>
                        </div>
                         <a
                            href="/Zakat Declaration Form - Specimen.pdf"
                            download
                            className="px-5 py-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl transition-colors flex items-center gap-2 text-xs font-bold shadow-sm"
                         >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Download Template
                         </a>
                      </div>
                    </>
                  )}
                  
                  <FieldSelect label="Filer Status" value={filerStatus} onChange={setFilerStatus} options={[{value:"", label:"Select Status"}, {value:"Filer", label:"Filer"}, {value:"Non-Filer", label:"Non-Filer"}]} required valid={!!filerStatus} />
                  
                  {filerStatus === "Non-Filer" && (
                     <div className="col-span-1 md:col-span-2 p-5 bg-indigo-50 border border-indigo-200 rounded-xl flex flex-col md:flex-row items-center justify-between gap-5 animate-in fade-in slide-in-from-top-2">
                        <div>
                            <p className="text-sm font-bold text-indigo-900">Non-Filer Requirement</p>
                            <p className="text-sm text-indigo-700 mt-1">You must submit an undertaking form. Please download the template.</p>
                        </div>
                        <a 
                          href="/Undertaking - Template.docx" 
                          download
                          className="px-5 py-2.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-xl transition-colors flex items-center gap-2 text-xs font-bold shadow-sm"
                        >
                           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0L8 8m4-4v12" /></svg>
                           Download Template
                        </a>
                     </div>
                  )}
                  {/* 
                  <FieldSelect label="CDC Access" value={cdcAccess} onChange={setCdcAccess} options={[{value:"", label:"Select Option"}, {value:"yes", label:"Yes"}, {value:"no", label:"No"}]} required valid={!!cdcAccess} />
                  <FieldSelect label="Profit Sharing" value={profitSharing} onChange={setProfitSharing} options={[{value:"", label:"Select Option"}, {value:"yes", label:"Yes"}, {value:"no", label:"No"}]} required valid={!!profitSharing} />
                  <FieldSelect label="Remittance" value={remittance} onChange={setRemittance} options={[{value:"", label:"Select Option"}, {value:"local", label:"Local (Non-Repatriable)"}, {value:"repatriable", label:"Foreigner (Repatriable)"}, {value:"non_repatriable", label:"Non-Resident (Repatriable)"}]} required valid={!!remittance} />
                  */}
                </div>
                <div className="mt-6 flex flex-col gap-6">
                  <p className="text-sm font-medium text-slate-500 mb-2">💡 If you don't want to add a nominee at this point in time, uncheck the box below</p>
                  <ToggleRow label="Add Nominee?" checked={addNominee} onChange={setAddNominee} />
                  {addNominee && (
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-top-2">
                        <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">Next of Kin Details</h4>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                          <FieldInput label="Nominee Name" value={nomineeName} onChange={setNomineeName} required valid={!!nomineeName} />
                          <FieldSelect label="Relation" value={nomineeRelation} onChange={setNomineeRelation} options={[
                            {value:"", label:"Select Relation"},
                            {value:"Father", label:"Father"},
                            {value:"Mother", label:"Mother"},
                            {value:"Son", label:"Son"},
                            {value:"Daughter", label:"Daughter"},
                            {value:"Brother", label:"Brother"},
                            {value:"Sister", label:"Sister"},
                            {value:"Husband", label:"Husband"},
                            {value:"Wife", label:"Wife"}
                          ]} required valid={!!nomineeRelation} />

                          <FieldInput 
                            label="CNIC" 
                            value={nomineeCnic} 
                            onChange={(v) => setNomineeCnic(formatCNIC(v))} 
                            required 
                            valid={formatCNIC(nomineeCnic).replace(/\D/g, "").length === 13} 
                            maxLength={15} 
                            placeholder="12345-1234567-1" 
                          />
                          
                          {/* Phone Input with Custom Country Selector */}
                          <div>
                              <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">
                                  Mobile Number <span className="text-rose-500">*</span>
                              </label>
                              <div className="flex gap-2">
                                   <div className="relative w-36">
                                      <CustomCountrySelect value={nomineeCountryCode} onChange={setNomineeCountryCode} />
                                   </div>
                                   <div className="relative flex-1">
                                      <input
                                          value={nomineeMobile}
                                          onChange={(e) => {
                                            const formatted = nomineeCountryCode === "+92" ? formatPakistanPhone(e.target.value) : e.target.value;
                                            setNomineeMobile(formatted);
                                          }}
                                          placeholder={nomineeCountryCode === "+92" ? "300 1234567" : "Enter phone number"}
                                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                                      />
                                      {nomineeMobile.trim().length > 0 && (
                                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                              <div className="rounded-full bg-emerald-100 p-0.5">
                                                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                  </svg>
                                              </div>
                                          </div>
                                      )}
                                   </div>
                              </div>
                          </div>
                          <FieldInput label="CNIC Issuance Date (DD.MM.YYYY)" value={nomineeCnicIssuance} onChange={(v) => setNomineeCnicIssuance(formatDate(v))} placeholder="DD.MM.YYYY" maxLength={10} required valid={nomineeCnicIssuance.length === 10} />
                          <FieldInput label="CNIC Expiry Date (DD.MM.YYYY)" value={nomineeCnicExpiry} onChange={(v) => setNomineeCnicExpiry(formatDate(v))} placeholder="DD.MM.YYYY" maxLength={10} required valid={nomineeCnicExpiry.length === 10} />
                        </div>
                        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                          <FileInput label="Nominee CNIC Front" file={nomineeCnicFrontFile} onChange={setNomineeCnicFrontFile} accept="image/*" valid={!!nomineeCnicFrontFile} hint="Clear front image" />
                          <FileInput label="Nominee CNIC Back" file={nomineeCnicBackFile} onChange={setNomineeCnicBackFile} accept="image/*" valid={!!nomineeCnicBackFile} hint="Clear back image" />
                        </div>
                      </div>
                  )}

                  {/* 
                  <ToggleRow label="Add Attorney?" checked={addAttorney} onChange={setAddAttorney} />
                  {addAttorney && (
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-top-2">
                        <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">Attorney Details</h4>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                          <FieldInput label="Attorney Name" value={attorneyName} onChange={setAttorneyName} required valid={!!attorneyName} />
                          <FieldInput label="Relation" value={attorneyRelation} onChange={setAttorneyRelation} required valid={!!attorneyRelation} />
                          <FieldInput label="CNIC" value={attorneyCnic} onChange={setAttorneyCnic} required valid={!!attorneyCnic} maxLength={15} placeholder="12345-1234567-1" />
                          <FieldInput label="Mobile Number" value={attorneyMobile} onChange={setAttorneyMobile} required valid={!!attorneyMobile} placeholder="03XX-XXXXXXX" />
                          <FieldInput label="CNIC Issuance Date" value={attorneyCnicIssuance} onChange={(v) => setAttorneyCnicIssuance(formatDate(v))} placeholder="DD.MM.YYYY" maxLength={10} required valid={attorneyCnicIssuance.length === 10} />
                          <FieldInput label="CNIC Expiry Date" value={attorneyCnicExpiry} onChange={(v) => setAttorneyCnicExpiry(formatDate(v))} placeholder="DD.MM.YYYY" maxLength={10} required valid={attorneyCnicExpiry.length === 10} />
                        </div>
                        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                          <FileInput label="Attorney CNIC Front" file={attorneyCnicFrontFile} onChange={setAttorneyCnicFrontFile} accept="image/*" valid={!!attorneyCnicFrontFile} hint="Clear front image" />
                          <FileInput label="Attorney CNIC Back" file={attorneyCnicBackFile} onChange={setAttorneyCnicBackFile} accept="image/*" valid={!!attorneyCnicBackFile} hint="Clear back image" />
                        </div>
                      </div>
                  )}
                  */}
                </div>
              </div>

              <Divider />

              {/* FATCA */}
              <div>
                <h3 className="mb-5 text-base font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <span className="w-6 h-px bg-slate-200"></span> FATCA - Foreign Account Tax Compliance Act
                </h3>
                <div className="space-y-6">
                  <RadioField label="Are You A US Citizen/Resident/Green Card Holder?" value={fatcaUsCitizen} onChange={setFatcaUsCitizen} />
                  <RadioField label="Is Your Country Of Birth USA?" value={fatcaUsCountryOfBirth} onChange={setFatcaUsCountryOfBirth} />
                  <RadioField label="Do You Have Any Power Of Attorney/ Authorized Signatory/ Mandate Holder Having USA Address?" value={fatcaPowerOfAttorney} onChange={setFatcaPowerOfAttorney} />
                  <RadioField label="Do You Have USA Residence/ Mailing/ Sole Hold Mail Address?" value={fatcaUsAddress} onChange={setFatcaUsAddress} />
                  <RadioField label="Do You Have USA Telephone Number?" value={fatcaUsTelephone} onChange={setFatcaUsTelephone} />
                  
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 mt-6">
                    <FieldInput label="Country of Tax Residence (If Country Of Residence Is Other Than USA)" value={fatcaTaxResidenceCountry} onChange={setFatcaTaxResidenceCountry} required valid={!!fatcaTaxResidenceCountry} placeholder="PAKISTAN" />
                    <FieldInput label="Taxpayer Identification Number (Enter N/A If Not Applicable)" value={fatcaTaxpayerId} onChange={setFatcaTaxpayerId} valid={!!fatcaTaxpayerId} placeholder="Enter N/A if not applicable" />
                  </div>
                </div>
              </div>

              <Divider />

              {/* Standard Due Diligence */}
              <div>
                <h3 className="mb-5 text-base font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <span className="w-6 h-px bg-slate-200"></span> Standard Due Diligence
                </h3>
                <div className="space-y-6">
                  <RadioFieldWithDetails 
                    label="Are You A Public Figure/Politically Exposed Person/ Family Member/ Close Associate of PEP?" 
                    value={isPep} 
                    onChange={setIsPep} 
                    details={pepDetails}
                    onDetailsChange={setPepDetails}
                  />
                  <RadioFieldWithDetails 
                    label="Has Any Financial Institution Ever Refused To Open Your Account?" 
                    value={accountRefused} 
                    onChange={setAccountRefused} 
                    details={accountRefusedDetails}
                    onDetailsChange={setAccountRefusedDetails}
                  />
                  <RadioFieldWithDetails 
                    label="Do You Have Any Financial Links To Offshore Tax Haven Countries?" 
                    value={offshoreTaxLinks} 
                    onChange={setOffshoreTaxLinks} 
                    details={offshoreTaxLinksDetails}
                    onDetailsChange={setOffshoreTaxLinksDetails}
                  />
                  <RadioFieldWithDetails 
                    label="Do You Deal In High Value Items Such As Silver, Gold, Real Estate, Etc.?" 
                    value={highValueDealing} 
                    onChange={setHighValueDealing} 
                    details={highValueDealingDetails}
                    onDetailsChange={setHighValueDealingDetails}
                  />
                  <div>
                    <RadioField label="Are You A Dual National?" value={isDualNational} onChange={setIsDualNational} />
                    {isDualNational === "yes" && (
                      <div className="mt-4 ml-6">
                        <FieldInput label="Country of Dual Nationality" value={dualNationalityCountry} onChange={setDualNationalityCountry} required valid={!!dualNationalityCountry} placeholder="Enter country" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Divider />

              {/* Documents */}
              <div>
                <h3 className="mb-5 text-base font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <span className="w-6 h-px bg-slate-200"></span> Document Uploads
                </h3>
                <div className="mb-6 text-sm text-slate-600 pl-1">
                  Please upload <span className="font-bold text-slate-900 bg-yellow-100 px-1.5 py-0.5 rounded border border-yellow-200">ORIGINAL DOCUMENTS</span> - clear images or PDFs.
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FileInput 
                    label="CNIC Front" 
                    file={cnicFrontFile} 
                    onChange={setCnicFrontFile} 
                    accept="image/jpeg,image/png" 
                    valid={!!cnicFrontFile || !!kycId} 
                    hint="JPEG/PNG only"
                    disabled={!!kycId}
                    lockedMessage="Already submitted in KYC"
                  />
                  <FileInput 
                    label="CNIC Back" 
                    file={cnicBackFile} 
                    onChange={setCnicBackFile} 
                    accept="image/jpeg,image/png" 
                    valid={!!cnicBackFile || !!kycId} 
                    hint="JPEG/PNG only"
                    disabled={!!kycId}
                    lockedMessage="Already submitted in KYC"
                  />

                  {addNominee && (
                    <>
                      <FileInput 
                        label="Nominee CNIC Front" 
                        file={nomineeCnicFrontFile} 
                        onChange={setNomineeCnicFrontFile} 
                        accept="image/jpeg,image/png" 
                        valid={!!nomineeCnicFrontFile} 
                        hint="JPEG/PNG only"
                        disabled={!!nomineeCnicFrontFile}
                        lockedMessage="Already submitted above"
                      />
                      <FileInput 
                        label="Nominee CNIC Back" 
                        file={nomineeCnicBackFile} 
                        onChange={setNomineeCnicBackFile} 
                        accept="image/jpeg,image/png" 
                        valid={!!nomineeCnicBackFile} 
                        hint="JPEG/PNG only"
                        disabled={!!nomineeCnicBackFile}
                        lockedMessage="Already submitted above"
                      />
                    </>
                  )}
                  
                  {/* Proof of Address only required if mailing address is different */}
                  {!mailingAddressSame && (
                    <FileInput label="Proof of Address" file={proofAddrFile} onChange={setProofAddrFile} accept="image/*,.pdf,.doc,.docx" valid={!!proofAddrFile} hint="Utility/Internet bill (JPEG/PNG) - Last month" />
                  )}
                  
                  <FileInput label="Proof of Employment" file={proofEmpFile} onChange={setProofEmpFile} accept="image/*,.pdf,.doc,.docx" valid={!!proofEmpFile} hint="(JPEG/PNG/PDF)" />
                  {occupation === "BUSINESS" && (
                      <div className="col-span-1 md:col-span-2 p-5 bg-amber-50 border border-amber-200 rounded-xl flex flex-col md:flex-row items-center justify-between gap-5 animate-in fade-in slide-in-from-top-2">
                        <div>
                            <p className="text-sm font-bold text-amber-900">Business Cover Letter Requirement</p>
                            <p className="text-sm text-amber-700 mt-1">Please upload the Business Cover Letter as income proof.</p>
                        </div>
                         <a
                            href="/Business Cover Letter - Template.docx"
                            download
                            className="px-5 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-xl transition-colors flex items-center gap-2 text-xs font-bold shadow-sm"
                         >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Download Template
                         </a>
                      </div>
                  )}
                  <FileInput label="Proof of Income / Business Cover Letter" file={proofOfIncomeFile} onChange={setProofOfIncomeFile} accept="image/*,.pdf,.doc,.docx" valid={!!proofOfIncomeFile} hint="Salary slip (JPEG/PNG) - Signed & Stamped" />
                  <FileInput label="Signature Specimen" file={signFile} onChange={setSignFile} accept="image/*,.pdf,.doc,.docx" valid={!!signFile} hint="Plain white paper (JPEG/PNG)" />
                  {filerStatus === "Non-Filer" && (
                     <FileInput label="Undertaking" file={undertakingFile} onChange={setUndertakingFile} accept="image/*,.pdf,.doc,.docx" valid={!!undertakingFile} hint="Signed & stamped" />
                  )}
                  {zakatStatus === "non_deductible" && (
                     <FileInput label="Zakat Declaration (CZ-50)" file={zakatFile} onChange={setZakatFile} accept="image/*,.pdf,.doc,.docx" valid={!!zakatFile} hint="PDF only (max 600KB) - Signed & Stamped - All pages in one file" />
                  )}
                  <FileInput label="Bank Statement / IBAN (Optional)" file={bankStatementFile} onChange={setBankStatementFile} accept="image/*,.pdf,.doc,.docx" valid={!!bankStatementFile} hint="IBAN proof" />
                  {/* <FileInput label="Tax Return" file={taxReturnFile} onChange={setTaxReturnFile} accept="image/*,.pdf" valid={!!taxReturnFile} hint="Optional" /> */}
                </div>
              </div>

              <div className="pt-6">
                  <div className="space-y-4 mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                     <div className="flex items-center gap-3">
                        <input 
                            type="checkbox" 
                            id="terms-general"
                            checked={acceptGeneral}
                            onChange={(e) => setAcceptGeneral(e.target.checked)}
                            className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <label htmlFor="terms-general" className="text-sm font-medium text-slate-700 select-none">
                            Accept <button type="button" onClick={() => openTerms("general")} className="text-blue-600 hover:text-blue-700 hover:underline uppercase transition-colors">GENERAL TERMS AND CONDITIONS.</button>
                        </label>
                     </div>
                     <div className="flex items-center gap-3">
                        <input 
                            type="checkbox" 
                            id="terms-house"
                            checked={acceptHouse}
                            onChange={(e) => setAcceptHouse(e.target.checked)}
                            className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <label htmlFor="terms-house" className="text-sm font-medium text-slate-700 select-none">
                            Accept <button type="button" onClick={() => openTerms("house")} className="text-blue-600 hover:text-blue-700 hover:underline uppercase transition-colors">HOUSE SPECIFIC TERMS AND CONDITIONS.</button>
                        </label>
                     </div>
                  </div>

                  <button
                  type="submit"
                  disabled={submitting || !isFormValid}
                  className="w-full rounded-xl bg-slate-900 text-white font-bold py-4 text-lg tracking-wide hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-slate-200"
                  >
                  {submitting ? "SUBMITTING..." : "SUBMIT APPLICATION"}
                  </button>
                  {!isFormValid && (
                    <p className="mt-3 text-center text-xs text-amber-600 font-medium">
                      ⚠️ Please fill all mandatory fields to enable submission
                    </p>
                  )}
                  <p className="mt-4 text-center text-xs text-slate-400">
                      By submitting, you agree to the processing of your data for account opening purposes.
                  </p>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Modal Overlay */}
      {overlayOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/5">
            <div className="p-8 text-center">
              {modalMode === "loading" ? (
                <>
                  <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-slate-100 border-t-blue-600" />
                  <div className="text-xl font-bold text-slate-900">{modalTitle}</div>
                  <div className="mt-2 text-sm text-slate-500">{modalDesc}</div>
                </>
              ) : (
                <>
                  <div className="text-6xl mb-4">{modalIcon}</div>
                  <div className="text-xl font-bold text-slate-900">{modalTitle}</div>
                  <div className="mt-2 text-sm text-slate-500 max-w-[80%] mx-auto">{modalDesc}</div>

                  <button
                    onClick={() => setOverlayOpen(false)}
                    className={isSuccess 
                      ? "mt-8 w-full rounded-xl bg-blue-600 py-3.5 font-bold text-white hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
                      : "mt-8 w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 font-bold text-slate-700 hover:bg-slate-100 transition-all"
                    }
                  >
                    {isSuccess ? "Continue" : "Close & Fix"}
                  </button>
                </>
              )}

              {modalMode !== "loading" && (
                <button
                  onClick={() => setOverlayOpen(false)}
                  className="mt-3 w-full rounded-xl py-2.5 text-sm font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Terms Modal */}
      {termsModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
                 <h3 className="text-lg font-bold text-slate-900">Terms and Conditions</h3>
                 <button 
                    onClick={() => setTermsModalOpen(false)}
                    className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                 >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                 </button>
              </div>
              
              {/* Content */}
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                 <div className="prose prose-sm prose-slate max-w-none">
                    {termsType === "general" ? (
                        <GeneralTerms />
                    ) : (
                        <HouseTerms />
                    )}
                 </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex justify-end gap-3">
                 <button 
                    onClick={() => {
                        if (termsType === "general") setAcceptGeneral(false);
                        if (termsType === "house") setAcceptHouse(false);
                        setTermsModalOpen(false);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-slate-500 hover:bg-slate-600 text-white font-bold text-sm shadow-sm transition-all"
                 >
                    I Don&apos;t Accept
                 </button>
                 <button 
                    onClick={handleTermsAccept}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-blue-200 shadow-lg transition-all"
                 >
                    I Accept
                 </button>
              </div>
           </div>
        </div>
      )}



      {/* Document Requirements Modal */}
      <DocumentRequirementsModal open={reqOpen} onClose={() => setReqOpen(false)} docs={docs} />
    </div>
  );
}

function Divider() {
  return <div className="h-px w-full bg-slate-100 my-2" />;
}

function FieldInput({
  label, placeholder, value, onChange, required, maxLength, disabled, helper, valid, spellCheck, textarea,
}: {
  label: string; placeholder?: string; value: string; onChange: (v: string) => void;
  required?: boolean; maxLength?: number; disabled?: boolean; helper?: string; valid?: boolean; spellCheck?: boolean; textarea?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </label>
      <div className="relative">
        {textarea ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            disabled={disabled}
            spellCheck={spellCheck}
            rows={1}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-400 transition-all shadow-sm resize-none"
          />
        ) : (
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            disabled={disabled}
            spellCheck={spellCheck}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-400 transition-all shadow-sm"
          />
        )}
        {valid && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none animate-in fade-in zoom-in duration-200">
                <div className="rounded-full bg-emerald-100 p-0.5">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            </div>
        )}
      </div>
      {helper ? <div className="mt-1.5 text-xs text-slate-500 font-medium">{helper}</div> : null}
    </div>
  );
}

function FieldSelect({
  label, value, onChange, options, valid,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; valid?: boolean; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">{label}</label>
      <div className="relative">
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm"
        >
            {options.map((o) => (
            <option key={o.value} value={o.value}>
                {o.label}
            </option>
            ))}
        </select>
        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-slate-400">
            {valid && (
                <div className="rounded-full bg-emerald-100 p-0.5 animate-in fade-in zoom-in duration-200">
                    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            )}
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
        </div>
      </div>
    </div>
  );
}

function SearchableCitySelect({ 
    label, 
    value, 
    onChange, 
    required, 
    valid 
}: { 
    label: string; 
    value: string; 
    onChange: (v: string) => void; 
    required?: boolean; 
    valid?: boolean; 
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [isOther, setIsOther] = useState(value !== "" && !PAKISTAN_CITIES.includes(value));
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Initial check for 'Other'
    useEffect(() => {
        if (value && !PAKISTAN_CITIES.includes(value) && value !== "Other") {
            setIsOther(true);
        }
    }, [value]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filtered = PAKISTAN_CITIES.filter(c => 
        c.toLowerCase().includes(search.toLowerCase())
    );

    const displayValue = isOther ? "Other" : (value || "Select City");

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">
                    {label} {required ? <span className="text-rose-500">*</span> : null}
                </label>
                <div ref={wrapperRef} className="relative w-full">
                    <button
                        type="button"
                        onClick={() => setOpen(!open)}
                        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-base outline-none transition-all shadow-sm ${
                            open ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                    >
                        <span className={`truncate ${!value ? 'text-slate-400' : 'text-slate-900 font-medium'}`}>
                            {displayValue}
                        </span>
                        <div className="flex items-center gap-2">
                            {valid && !isOther && (
                                <div className="rounded-full bg-emerald-100 p-0.5 animate-in fade-in zoom-in duration-200">
                                    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}
                            <svg className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </button>

                    {open && (
                        <div className="absolute top-[110%] left-0 z-[60] w-full rounded-xl border border-slate-100 bg-white p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
                            <input
                                autoFocus
                                value={search}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search city..."
                                className="mb-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400"
                            />
                            <div className="max-h-60 overflow-y-auto space-y-0.5 custom-scrollbar">
                                {filtered.map((city) => (
                                    <button
                                        key={city}
                                        type="button"
                                        onClick={() => {
                                            onChange(city);
                                            setIsOther(false);
                                            setOpen(false);
                                            setSearch("");
                                        }}
                                        className={`flex w-full items-center px-3 py-2 text-left rounded-lg transition-colors hover:bg-slate-50 text-sm font-medium ${value === city ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}`}
                                    >
                                        {city}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsOther(true);
                                        onChange("");
                                        setOpen(false);
                                        setSearch("");
                                    }}
                                    className={`flex w-full items-center px-3 py-2 text-left rounded-lg transition-colors hover:bg-rose-50 text-sm font-bold border-t border-slate-50 mt-1 ${isOther ? 'bg-rose-50 text-rose-700' : 'text-rose-600'}`}
                                >
                                    Other
                                </button>
                                {filtered.length === 0 && (
                                    <div className="p-3 text-center text-xs text-slate-400">No cities found matching &quot;{search}&quot;</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {isOther && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                    <FieldInput 
                        label="Specify Other City" 
                        placeholder="Enter your city name" 
                        value={value} 
                        onChange={onChange} 
                        required 
                        valid={!!value}
                    />
                </div>
            )}
        </div>
    );
}

function ToggleRow({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className={`group flex w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
        checked ? "bg-blue-50 border-blue-200" : "bg-white border-slate-200 hover:border-slate-300"
      }`}
    >
      <div
        className={`relative flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
          checked ? "bg-blue-600 border-blue-600" : "bg-white border-slate-300 group-hover:border-slate-400"
        }`}
      >
        {checked && (
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
        )}
      </div>
      <span className={`text-sm font-semibold ${checked ? 'text-blue-800' : 'text-slate-600'}`}>
        {label}
      </span>
    </div>
  );
}

function CustomCountrySelect({ value, onChange }: { value: string, onChange: (v: string) => void }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);
    
    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
          if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
            setOpen(false);
          }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
          document.removeEventListener("mousedown", handleClickOutside);
        };
      }, [wrapperRef]);

    const selected = ALL_COUNTRIES.find(c => c.code === value) || ALL_COUNTRIES.find(c => c.code === "+92")!;

    const filtered = ALL_COUNTRIES.filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase()) || 
        c.code.includes(search)
    );

    return (
        <div ref={wrapperRef} className="relative w-full">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm transition-all"
            >
                <div className="flex items-center gap-2">
                    <img 
                        src={`https://flagcdn.com/w40/${selected.iso}.png`} 
                        alt={selected.iso} 
                        className="h-4 w-6 rounded-sm object-cover border border-slate-100" 
                    />
                    <span className="font-medium text-slate-700">{selected.code}</span>
                </div>
                <svg className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open && (
                <div className="absolute top-[110%] left-0 z-50 w-64 rounded-xl border border-slate-100 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                    <input
                        autoFocus
                        value={search}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search country..."
                        className="mb-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-blue-400"
                    />
                    <div className="max-h-60 overflow-y-auto space-y-0.5 custom-scrollbar">
                        {filtered.length > 0 ? filtered.map((c) => (
                            <button
                                key={c.iso}
                                type="button"
                                onClick={() => {
                                    onChange(c.code);
                                    setOpen(false);
                                    setSearch("");
                                }}
                                className={`flex w-full items-center gap-3 px-2 py-2 text-left rounded-lg transition-colors hover:bg-slate-50 ${value === c.code ? 'bg-blue-50/50' : ''}`}
                            >
                                <img 
                                    src={`https://flagcdn.com/w40/${c.iso}.png`} 
                                    alt={c.iso} 
                                    className="h-3.5 w-6 rounded-sm object-cover border border-slate-100 shrink-0" 
                                />
                                <span className="flex-1 truncate text-xs font-medium text-slate-700">{c.name}</span>
                                <span className="text-[10px] mobile:hidden text-slate-400 font-mono">{c.code}</span>
                            </button>
                        )) : (
                            <div className="p-2 text-center text-xs text-slate-400">No results found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function SearchableCountrySelect({ value, onChange, valid }: { value: string, onChange: (v: string) => void, valid?: boolean }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
          if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
            setOpen(false);
          }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
          document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    // Value is Country Name (e.g. "Pakistan")
    const selected = ALL_COUNTRIES.find(c => c.name === value) || ALL_COUNTRIES.find(c => c.name === "Pakistan")!;

    const filtered = ALL_COUNTRIES.filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div ref={wrapperRef} className="relative w-full">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm transition-all"
            >
                <div className="flex items-center gap-2">
                    <img 
                        src={`https://flagcdn.com/w40/${selected.iso}.png`} 
                        alt={selected.iso} 
                        className="h-4 w-6 rounded-sm object-cover border border-slate-100" 
                    />
                    <span className="font-medium text-slate-700">{selected.name}</span>
                </div>
                <div className="flex items-center gap-2">
                    {valid && (
                        <div className="rounded-full bg-emerald-100 p-0.5 animate-in fade-in zoom-in duration-200">
                            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    )}
                    <svg className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {open && (
                <div className="absolute top-[110%] left-0 z-50 w-full rounded-xl border border-slate-100 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                    <input
                        autoFocus
                        value={search}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search country..."
                        className="mb-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-blue-400"
                    />
                    <div className="max-h-60 overflow-y-auto space-y-0.5 custom-scrollbar">
                        {filtered.length > 0 ? filtered.map((c) => (
                            <button
                                key={c.iso}
                                type="button"
                                onClick={() => {
                                    onChange(c.name);
                                    setOpen(false);
                                    setSearch("");
                                }}
                                className={`flex w-full items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors hover:bg-slate-50 ${value === c.name ? 'bg-blue-50/50' : ''}`}
                            >
                                <img 
                                    src={`https://flagcdn.com/w40/${c.iso}.png`} 
                                    alt={c.iso} 
                                    className="h-3.5 w-6 rounded-sm object-cover border border-slate-100 shrink-0" 
                                />
                                <span className="flex-1 truncate text-xs font-medium text-slate-700">{c.name}</span>
                            </button>
                        )) : (
                            <div className="p-2 text-center text-xs text-slate-400">No results found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function FileInput({
  label, accept, required, file, onChange, hint, valid, disabled, lockedMessage
}: {
  label: string; accept: string; required?: boolean; file: File | null;
  onChange: (f: File | null) => void; hint?: string; valid?: boolean;
  disabled?: boolean; lockedMessage?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </label>

      <div className={`group relative mt-1 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all ${
        disabled
            ? "border-slate-200 bg-slate-50 cursor-not-allowed"
            : file 
                ? "border-blue-300 bg-blue-50/50" 
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}>
        <input
          type="file"
          accept={accept}
          required={required && !disabled}
          disabled={disabled}
          onChange={(e) => onChange(e.target.files?.[0] || null)}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
        
        {valid && (
            <div className="absolute right-4 top-4 z-20 pointer-events-none animate-in fade-in zoom-in duration-200">
                <div className="rounded-full bg-emerald-100 p-0.5 shadow-sm border border-emerald-200">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            </div>
        )}
        
        {disabled ? (
             <div className="flex flex-col items-center gap-2 text-slate-400">
                  <div className="p-2 bg-slate-100 rounded-lg">
                      {/* Lock Icon */}
                      <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                  </div>
                  <div className="text-sm font-semibold text-slate-500">
                      {lockedMessage || "Locked"}
                  </div>
             </div>
        ) : file ? (
            <div className="flex items-center gap-3 text-blue-700">
                <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div className="text-left">
                    <div className="text-sm font-bold truncate max-w-[200px]">{file.name}</div>
                    <div className="text-xs text-blue-500 font-medium">Click to replace</div>
                </div>
            </div>
        ) : (
            <div className="space-y-2">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 group-hover:scale-110 transition-transform">
                    <svg className="h-5 w-5 text-slate-400 group-hover:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                </div>
                <div className="text-sm font-semibold text-slate-600">
                    <span className="text-blue-600 hover:underline">Click to upload</span> or drag and drop
                </div>
                <div className="text-xs text-slate-400 font-medium">{hint}</div>
            </div>
        )}
      </div>
    </div>
  );
}

function RadioField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-3">
        {label} <span className="text-rose-500">*</span>
      </label>
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer group">
          <div className={`relative flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
            value === "yes" ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white group-hover:border-slate-400"
          }`}>
            {value === "yes" && (
              <div className="h-2 w-2 rounded-full bg-white"></div>
            )}
          </div>
          <input
            type="radio"
            name={`radio-${label}`}
            value="yes"
            checked={value === "yes"}
            onChange={() => onChange("yes")}
            className="sr-only"
          />
          <span className="text-sm font-medium text-slate-600">Yes</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer group">
          <div className={`relative flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
            value === "no" ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white group-hover:border-slate-400"
          }`}>
            {value === "no" && (
              <div className="h-2 w-2 rounded-full bg-white"></div>
            )}
          </div>
          <input
            type="radio"
            name={`radio-${label}`}
            value="no"
            checked={value === "no"}
            onChange={() => onChange("no")}
            className="sr-only"
          />
          <span className="text-sm font-medium text-slate-600">No</span>
        </label>
      </div>
    </div>

  );
}

function HouseTerms() {
  return (
    <div className="space-y-4 text-sm text-slate-600 leading-relaxed font-normal">
      <h4 className="font-bold text-slate-800 mt-2 text-lg">TRANSMISSION OF TRADE CONFIRMATION MEMO</h4>
      <p className="italic text-slate-500 text-xs mb-2">(Compliance of rule 4.19 PSX Rule Book and the law on the subject)</p>
      
      <p>
        Reference above, we will be transmitting details (as required under the Law) of your Daily Executed Trades to you at your given email address, within 24 hours of your trade. You are advised to view your reported trades daily and in the event of any discrepancy, the matter may be reported to the Trec-Holder, for its resolution, without any loss of time.
      </p>

      <h4 className="font-bold text-slate-800 mt-6 text-lg">TERMS OF AGREEMENT</h4>
      <p className="italic text-slate-500 text-xs mb-2">(With reference to Rule 4.19, 4.19.1 and 4.19.1(a) of the Rule Book)</p>
      
      <ul className="list-disc pl-5 space-y-3">
        <li>TREC-Holder agrees with & assures the client(s) that sale proceeds of his / her / its securities or any other amount of the client(s), shall be paid to the client(s) on demand (through cross cheque a/c payee only) as soon as it becomes due, under the Rules and Regulations of the SECP / PSX.</li>
        <li>If, despite above, the client(s) fails to demand his / her / their payment, the client(s) agree(s) to forego his / her / their entitlement (if any) that may arise to the Trec-Holder, on account of client's funds, deposited in bank, in the form of profit or any other benefit.</li>
        <li>That according to faith / belief of the client(s) (including beneficial owner(s) / authorized representative(s) of the account), Riba (in whatever form) is abominable and thus assure Trec-Holder that either presently or in future would have no claim over the profit / interest / markup or any other benefit that has arisen or may arise to the Trec-Holder.</li>
      </ul>
    </div>
  );
}

function GeneralTerms() {
  return (
    <div className="space-y-4 text-sm text-slate-600 leading-relaxed font-normal">
      <p className="font-semibold text-slate-800">
        These Terms and Conditions shall constitute a Contract between the Parties hereto. This Contract shall govern opening, maintenance and operations of Trading Account, CDC Sub-Account(s) and sharing of UIN and KYC information to/from NCCPL and ancillary matters connected therewith.
      </p>
      
      <h4 className="font-bold text-slate-800 mt-6 text-lg">GENERAL - General Terms and Conditions</h4>
      
      <ol className="list-decimal pl-5 space-y-3">
        <li>All Trades, Transactions, including non-Exchange Transactions, Derivative Contracts and deals (jointly referred to as "Transactions") between the Parties and Clearing and Settlement thereof and opening, maintenance and operations of Sub-Account in the CDS shall be subject to the Securities Act, 2015, Central Depositories Act, 1997, Pakistan Stock Exchange Limited (PSX) Regulations, Central Depository Company of Pakistan Limited (CDC) Regulations, CKO Regulations, 2017, National Clearing Company of Pakistan Limited (NCCPL) Regulations and the Securities Brokers (Licensing and Operations) Regulation, 2016 including Procedures, Manuals, Polices, Guidelines, Circulars, Directives, and Notifications issued and as amended) thereunder by the Securities and Exchange Commission of Pakistan (SECP), PSX, CDC or NCCPL from time to time.</li>
        <li>The information provided in KYC application form and/or CRF shall be in addition to and not in derogation of the requirements prescribed under Anti-Money Laundering and Countering Financing of Terrorism Regulations, 2020.</li>
        <li>The Securities Broker/Participant shall ensure provision of copies of all the relevant laws, rules and regulations at its office for access to the Sub-Account Holder(s)/Customer(s) during working hours. The Securities Broker/Participant shall ensure that its website contains hyperlinks to the websites/pages on the website of PSX, CDC, NCCPL and the SECP displaying above said regulatory framework for reference of the Customers.</li>
        <li>In case of a Joint Account, all obligations and liabilities of the Applicants under these Terms and Conditions shall be joint and several.</li>
        <li>These Terms and Conditions shall be binding on the nominee, legal representative, successors in interest and/or permitted assigns of the respective Parties hereto.</li>
        <li>The Securities Broker/Participant shall provide a list of its Registered Offices and Representatives authorized and employees designated to deal with the Sub-Account Holder(s)/Customer(s) along with their authorized mobile/landline/fax number(s), email and registered addresses. Any change(s) therein shall be intimated in writing to the Sub-Account Holder(s)/Customer(s) with immediate effect.</li>
        <li>Subject to applicable laws, the Securities Broker/Participant shall maintain strict confidentiality of the Customer related information and shall not disclose the same to any third party. However, in case the SECP, PSX, CDC or any competent authority under the law, as the case may be, requires any such information, the Securities Broker/ Participant shall be obliged to disclose the same for which the Customer shall not raise any objection whatsoever.</li>
        <li>The Securities Broker/Participant shall independently verify any of the Customer's related information provided in this Form and under the relevant laws, rules and regulations for the purpose of KYC.</li>
        <li>In case of any change in the Customer's related information provided in this Form, the Customer shall provide necessary details to the Participant/Securities Broker. Upon receipt of instruction from the Customer, the Participant/Securities Broker shall give effect to such changes in the manner prescribed under the relevant regulations. The Participant/Securities Broker shall have the right to incorporate any change(s) in the Sub-Account Holder(s)/Customer's information in the CDS as sent by NCCPL as CKO and that such change(s) shall be deemed to have been authorized by the Sub-Account Holder(s)/Customer(s). In case of any change in the Participant's/Securities Broker's address or contact numbers or any other related information, the Securities Broker/Participant shall immediately notify the Sub-Account Holder(s)/Customer(s).</li>
        <li>Any change in this Form or these Terms and Conditions by virtue of any changes in the aforesaid legal frameworks shall be deemed to have been incorporated and modified the rights and duties of the Parties hereto. Such change(s) shall be immediately communicated by the Securities Broker/Participant to the Sub-Account Holder(s)/Customer(s).</li>
        <li>The Securities Broker/Participant and the Customer shall be entitled to terminate this Contract without giving any reasons to each other after giving notice in writing of not less than one month to the other Party. Notwithstanding any such termination, all rights, liabilities and obligations of the Parties arising out of or in respect of Transactions entered into prior to the termination of this Contract shall continue to subsist and vest in /be binding on the respective Parties or his /her/ its respective heirs, executors, administrators, legal representatives or successors in interest and permissible assigns, as the case may be. Closure of Sub-Account of the Customer under this clause shall be subject to the condition that neither any corporate action is pending at that point of time in connection with any Book-entry Securities in the Sub-Account nor any Book-Entry Securities are in Pledged Position and that the outstanding dues, if any, payable by any Party to the other Party is cleared and that the Customer has transferred or withdrawn all the Book- Entry Securities from his/her Sub-Account.</li>
        <li>Where applicable, the terms "Sub-Account Holder" and "Participant" used in this Form shall include the "Customer" and "Securities Broker/TRE Certificate Holder" respectively.</li>
        <li>The Securities Broker/Participant should ensure due protection to the Sub-Account Holder / Customer regarding rights to dividend, rights or bonus shares etc. in respect of transactions routed through it and not do anything which is likely to harm the interest of the Sub-Account Holder with/from whom it may have had transactions in securities.</li>
        <li>The Participant/Securities Broker shall ensure that duly filled in and signed copy of this form along with the acknowledgement receipt is provided to the Sub-Account Holder.</li>
      </ol>
    </div>
  );
}






function RadioFieldWithDetails({
  label,
  value,
  onChange,
  details,
  onDetailsChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  details: string;
  onDetailsChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-3">
        {label} <span className="text-rose-500">*</span>
      </label>
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer group">
          <div className={`relative flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
            value === "yes" ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white group-hover:border-slate-400"
          }`}>
            {value === "yes" && (
              <div className="h-2 w-2 rounded-full bg-white"></div>
            )}
          </div>
          <input
            type="radio"
            name={`radio-${label}`}
            value="yes"
            checked={value === "yes"}
            onChange={() => onChange("yes")}
            className="sr-only"
          />
          <span className="text-sm font-medium text-slate-600">Yes</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer group">
          <div className={`relative flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
            value === "no" ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white group-hover:border-slate-400"
          }`}>
            {value === "no" && (
              <div className="h-2 w-2 rounded-full bg-white"></div>
            )}
          </div>
          <input
            type="radio"
            name={`radio-${label}`}
            value="no"
            checked={value === "no"}
            onChange={() => onChange("no")}
            className="sr-only"
          />
          <span className="text-sm font-medium text-slate-600">No</span>
        </label>
      </div>
      {value === "yes" && (
        <div className="mt-4">
          <textarea
            value={details}
            onChange={(e) => onDetailsChange(e.target.value)}
            placeholder="If Yes, Please Provide Details (Enter N/A if not applicable)"
            rows={3}
            spellCheck={true}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
          />
        </div>
      )}
    </div>
  );
}
