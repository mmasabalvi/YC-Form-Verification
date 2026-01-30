"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useRouter } from "next/navigation";
import DocumentRequirementsModal from "@/components/DocumentRequirementsModal";


type Verdict = "PASS" | "FAIL" | "REVIEW" | "-";

type ApiResponse = {
  kyc_id?: string;
  final_verdict?: string;
  messages?: string[];
  error_fields?: string[];
  relationship?: { verdict?: string };
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.trim() || "http://127.0.0.1:8000";

const docs = [
  { document: "CNIC Front", format: "JPEG / PNG", instructions: "", remarks: "Upload Original front CNIC image" },
  { document: "CNIC Back", format: "JPEG / PNG", instructions: "", remarks: "Upload Original back CNIC image" },
  { document: "Digital Signature", format: "JPEG / PNG", instructions: "Plain white paper, signature as per CNIC", remarks: "" },
  { document: "Zakat Form", format: "PDF", instructions: "File size should not exceed 600KB\n• **Signed & stamped**\n• If older manual format, upload full front & back.", remarks: "" },
  { document: "Income Proof", format: "JPEG / PNG", instructions: "• Salaried: Salary Certificate / Slip\n• Businessman: Business Cover Letter (Template provided ahead)\n• All: **Signed & Stamped**", remarks: "" },
  { document: "Mailing Address", format: "JPEG / PNG", instructions: "Utility bill / Internet bill can also be used", remarks: "If different from CNIC/NADRA record. Preferably last month's bill " },
];

// Comprehensive list of countries with ISO2 codes for flags
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

const BANK_IBAN_MAP: Record<string, string> = {
  "AIIN": "Al Baraka Bank (Pakistan)",
  "ABPA": "Allied Bank",
  "ASCM": "Askari Bank",
  "ALFH": "Bank Alfalah",
  "BAHL": "Bank Al-Habib",
  "BKIP": "BankIslami Pakistan",
  "KHYB": "The Bank of Khyber",
  "BPUN": "The Bank of Punjab",
  "BKCH": "Bank of China (Karachi Branch)",
  "CITI": "Citibank N.A. Pakistan",
  "DEUT": "Deutsche Bank",
  "DUIB": "Dubai Islamic Bank Pakistan",
  "FAYS": "Faysal Bank",
  "FWOM": "First Women Bank",
  "HABB": "Habib Bank (HBL)",
  "MPBL": "Habib Metropolitan Bank",
  "1CBK": "Industrial & Commercial Bank of China (ICBC)",
  "JAZZ": "JazzCash",
  "JSBL": "JS Bank",
  "MUCB": "MCB Bank",
  "MCIB": "MCB Islamic Bank",
  "MEZN": "Meezan Bank",
  "NBPA": "National Bank of Pakistan (NBP)",
  "SAMB": "Samba Bank",
  "SAUD": "Silkbank",
  "SIND": "Sindh Bank",
  "SMES": "SME Bank",
  "SONE": "Soneri Bank",
  "SCBL": "Standard Chartered Bank (Pakistan)",
  "SUMB": "Summit Bank",
  "TMFB": "Easypaisa (Telenor Microfinance Bank)",
  "BOTK": "MUFG Bank",
  "UNIL": "United Bank (UBL)",
  "ZTBL": "Zarai Taraqiati Bank (ZTBL)"
};


function formatCNIC(val: string) {
  let v = val.replace(/\D/g, "");
  if (v.length > 13) v = v.substring(0, 13);

  // XXXXX-XXXXXXX-X
  if (v.length > 12) return `${v.slice(0, 5)}-${v.slice(5, 12)}-${v.slice(12)}`;
  if (v.length > 5) return `${v.slice(0, 5)}-${v.slice(5)}`;
  return v;
}

function formatDate(val: string) {
  let v = val.replace(/\D/g, "");
  if (v.length > 8) v = v.substring(0, 8);

  // DD.MM.YYYY
  if (v.length > 4) return `${v.slice(0, 2)}.${v.slice(2, 4)}.${v.slice(4)}`;
  if (v.length > 2) return `${v.slice(0, 2)}.${v.slice(2)}`;
  return v;
}

function formatPakistanPhone(val: string) {
  let v = val.replace(/\D/g, "");
  if (v.length > 10) v = v.substring(0, 10);

  // XXX XXXXXXX (3 digits space 7 digits)
  if (v.length > 3) return `${v.slice(0, 3)} ${v.slice(3)}`;
  return v;
}

function pillClass(v: Verdict) {
  if (v === "PASS") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (v === "FAIL") return "bg-rose-100 text-rose-800 border-rose-200";
  if (v === "REVIEW") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

export default function KycPage() {
  const router = useRouter();

  // Form state
  // Default changed to 'cnic' as requested (was 'smart_card')
  const [idVariant, setIdVariant] = useState<"cnic" | "smart_card" | "poc" | "nicop" | "">("");
  const [residentialStatus, setResidentialStatus] = useState<
    "resident" | "non_resident" | "foreigner" | ""
  >("");

  const [fullName, setFullName] = useState("");
  const [fatherHusbandName, setFatherHusbandName] = useState("");
  const [userCnic, setUserCnic] = useState("");
  const [lifeValid, setLifeValid] = useState(false);
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const [cnicFile, setCnicFile] = useState<File | null>(null);
  const [cnicBackFile, setCnicBackFile] = useState<File | null>(null);

  const [bankName, setBankName] = useState("");
  const [iban, setIban] = useState("");
  const [bankFile, setBankFile] = useState<File | null>(null);

  const [countryCode, setCountryCode] = useState("+92");
  const [mobile, setMobile] = useState("");
  const [selfMobile, setSelfMobile] = useState(true);

  const [relName, setRelName] = useState("");
  const [relType, setRelType] = useState("");
  const [relCnic, setRelCnic] = useState("");
  const [relFile, setRelFile] = useState<File | null>(null);

  // Hidden Auto-fill Fields (to be passed to CGP form via backend)
  const [extractedGender, setExtractedGender] = useState("");
  const [extractedDob, setExtractedDob] = useState("");

  const [reqOpen, setReqOpen] = useState(true);

  // UI state
  const [showResultBox, setShowResultBox] = useState(false);
  const [overallVerdict, setOverallVerdict] = useState<Verdict>("-");
  const [relVerdict, setRelVerdict] = useState<Verdict>("-");
  const [messages, setMessages] = useState<string[]>([]);

  // Modal
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"loading" | "result">("loading");
  const [modalVerdict, setModalVerdict] = useState<Verdict>("-");
  const [modalTitle, setModalTitle] = useState("Please wait…");
  const [modalDesc, setModalDesc] = useState("Verifying documents (Gemini AI)…");
  const [modalIcon, setModalIcon] = useState("⏳");
  const [modalActionLabel, setModalActionLabel] = useState("Continue");
  const [modalActionKind, setModalActionKind] = useState<"primary" | "neutral">(
    "primary"
  );
  const [timeLeft, setTimeLeft] = useState(45);
  const [kycId, setKycId] = useState<string | null>(null);

  // Auto-fill state
  const [extracting, setExtracting] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);
  const [extractionError, setExtractionError] = useState(false);
  const [extractionError503, setExtractionError503] = useState(false);

  const [errorFields, setErrorFields] = useState<string[]>([]);
  const resultBoxRef = useRef<HTMLDivElement>(null);
  const [tempRequestId, setTempRequestId] = useState<string | null>(null);

  async function handleCnicUpload(f: File | null) {
      setCnicFile(f);
      
      // Clear ALL fields when CNIC front is REMOVED
      if (!f) {
          setAutoFilled(false);
          setExtractionError(false);
          setExtractionError503(false);
          setTempRequestId(null);
          
          // Clear Personal Information
          setFullName("");
          setFatherHusbandName("");
          setUserCnic("");
          setIssueDate("");
          setExpiryDate("");
          
          // Clear Hidden fields
          setExtractedGender("");
          setExtractedDob("");
          
          // Clear Banking details and phone
          setIban("");
          setBankName("");
          setBankFile(null); // Clear IBAN proof
          setMobile("");
          
          // Clear File Uploads
          setCnicBackFile(null);
          setRelFile(null);
          
          return;
      }
      
      setExtracting(true);
      setAutoFilled(false);
      setExtractionError(false);
      setExtractionError503(false);
      setTempRequestId(null);

      try {
          const fd = new FormData();
          fd.append("cnic_image", f);
          const res = await fetch(`${API_BASE}/api/extract-cnic`, { method: "POST", body: fd });
          
          if (res.status === 503) {
             setExtractionError503(true);
             return;
          }
          
          if (!res.ok) throw new Error("Extraction failed");
          
          const data = await res.json();

          // Check if we actually got meaningful data
          const hasData = !!(data.full_name || data.cnic_number || data.date_of_issue);

          if (hasData) {
            // Auto-fill fields if data is returned
            if (data.full_name) setFullName(data.full_name);
            if (data.father_husband_name) setFatherHusbandName(data.father_husband_name);
            if (data.cnic_number) setUserCnic(formatCNIC(data.cnic_number));
            if (data.date_of_issue) setIssueDate(formatDate(data.date_of_issue));
            if (data.date_of_expiry) setExpiryDate(formatDate(data.date_of_expiry));
            
            // Catch hidden fields
            if (data.gender) setExtractedGender(data.gender);
            if (data.date_of_birth) setExtractedDob(data.date_of_birth);
            
            if (data.request_id) setTempRequestId(data.request_id);
            
            setAutoFilled(true);
          } else {
             setExtractionError(true);
          }

      } catch (e) {
          console.error("Extraction failed", e);
          setExtractionError(true);
      } finally {
          setExtracting(false);
      }
  }

  const isFormValid = useMemo(() => {
    // 0. Metadata mandatory
    if (!idVariant) return false;
    if (!residentialStatus) return false;

    // All Personal fields mandatory
    if (!fullName.trim()) return false;
    if (!fatherHusbandName.trim()) return false;
    if (formatCNIC(userCnic).replace(/\D/g, "").length !== 13) return false;
    if (!cnicFile) return false;
    if (!cnicBackFile) return false;
    // Skip date validation for old format CNIC
    if (idVariant !== "cnic") {
      if (!issueDate) return false;
      if (!lifeValid && !expiryDate) return false;
    }

    // All Banking fields mandatory
    if (!bankName.trim()) return false;
    if (iban.length < 15 || iban.length > 34) return false;
    // if (!bankFile) return false; // IBAN proof is now optional

    // Mobile mandatory
    if (!mobile.trim()) return false;

    // Relationship mandatory ONLY if not self mobile
    if (!selfMobile) {
        if (!relName.trim()) return false;
        if (!relType.trim()) return false;
        if (formatCNIC(relCnic).replace(/\D/g, "").length !== 13) return false;
        if (!relFile) return false;
    }

    return true;
  }, [idVariant, residentialStatus, fullName, fatherHusbandName, userCnic, cnicFile, cnicBackFile, issueDate, expiryDate, lifeValid, bankName, iban, bankFile, mobile, selfMobile, relName, relType, relCnic, relFile]);

  // Calculate completion percentage
  const completionPercent = useMemo(() => {
    let total = 0;
    let filled = 0;

    const check = (condition: boolean) => {
        total++;
        if (condition) filled++;
    };

    // 1. ID Variant (always selected)
    check(!!idVariant); 
    // 2. Residential (always selected)
    check(!!residentialStatus);

    // 3. Personal
    check(fullName.trim().length > 0);
    check(fatherHusbandName.trim().length > 0);
    check(formatCNIC(userCnic).replace(/\D/g, "").length === 13);
    // Skip date checks for old format CNIC
    if (idVariant !== "cnic") {
      check(issueDate.length === 10);
      check(lifeValid || expiryDate.length === 10); // expiration logic
    }
    check(!!cnicFile);
    check(!!cnicBackFile);

    // 4. Banking
    check(bankName.trim().length > 0);
    check(
      iban.length >= 15 && iban.length <= 34 &&
      (iban.startsWith("PK") ? iban.length === 24 : true)
    );
    // check(!!bankFile); // IBAN proof is optional, doesn't count towards progress

    // 5. Mobile
    check(
      mobile.trim().length > 0 &&
      (countryCode === "+92" ? mobile.replace(/\D/g, "").length === 10 : true)
    );
    
    // 6. Relationship
    if (!selfMobile) {
        check(relName.trim().length > 0);
        check(relType.trim().length > 0);
        check(formatCNIC(relCnic).replace(/\D/g, "").length === 13);
        check(!!relFile);
    }

    if (total === 0) return 0;
    return Math.round((filled / total) * 100);
  }, [idVariant, residentialStatus, fullName, fatherHusbandName, userCnic, cnicFile, cnicBackFile, issueDate, expiryDate, lifeValid, bankName, iban, bankFile, mobile, selfMobile, relName, relType, relCnic, relFile]);

  // Clear date fields when old format CNIC is selected
  useEffect(() => {
    if (idVariant === "cnic") {
      setIssueDate("");
      setExpiryDate("");
      setLifeValid(false);
    }
  }, [idVariant]);

  // Countdown effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (modalMode === "loading" && overlayOpen && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [modalMode, overlayOpen, timeLeft]);

  // Prevent accidental refresh during verification
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (modalMode === "loading") {
        e.preventDefault();
        e.returnValue = ""; // Required for Chrome
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [modalMode]);

  function openLoading() {
    setOverlayOpen(true);
    setModalMode("loading");
    setTimeLeft(45);
    setModalIcon("⏳");
    setModalTitle("Verifying Documents");
    setModalDesc("Analyzing validity and checking details...");
  }

  function openResult(v: Verdict, opts?: { kycId?: string }) {
    setModalMode("result");
    setModalVerdict(v);

    if (v === "PASS") {
      setModalIcon("/assets/confirm.png");
      setModalTitle("Verification Successful");
      setModalDesc("Identity verified. Proceeding to next step.");
      setModalActionLabel("Continue");
      setModalActionKind("primary");
      setKycId(opts?.kycId || null);
    } else if (v === "FAIL") {
      setModalIcon("/assets/fail.png");
      setModalTitle("Verification Failed");
      setModalDesc("Some checks failed. Please fix and re-upload.");
      setModalActionLabel("Close & Fix");
      setModalActionKind("neutral");
    } else {
      setModalIcon("/assets/fail.png");
      setModalTitle("Review Required");
      setModalDesc("Some documents require manual review or re-upload.");
      setModalActionLabel("Close & Fix");
      setModalActionKind("neutral");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Build FormData
    const fd = new FormData();
    if (tempRequestId) {
        fd.append("temp_request_id", tempRequestId);
    }

    fd.append("id_variant", idVariant);
    fd.append("residential_status", residentialStatus);

    fd.append("user_name", fullName);
    fd.append("father_husband_name", fatherHusbandName);

    fd.append("user_cnic", formatCNIC(userCnic));
    fd.append("user_lifetime_validity", String(lifeValid));
    fd.append("user_issue_date", issueDate || "");
    fd.append("user_expiry_date", lifeValid ? "" : (expiryDate || ""));

    if (cnicFile) fd.append("cnic_file", cnicFile);
    if (cnicBackFile) fd.append("cnic_back_file", cnicBackFile);

    // Hidden fields for CGP Auto-fill
    if (extractedGender) fd.append("extracted_gender", extractedGender);
    if (extractedDob) fd.append("extracted_dob", extractedDob);

    fd.append("user_bank_name", bankName);
    fd.append("user_iban", iban);
    if (bankFile) fd.append("bank_file", bankFile);

    // Combine Country Code and Mobile
    const fullMobile = `${countryCode}-${mobile}`;
    fd.append("user_mobile", fullMobile);
    fd.append("self_mobile", String(selfMobile));

    if (!selfMobile) {
      fd.append("relative_name", relName || "");
      fd.append("relationship", relType || "");
      fd.append("relative_cnic", formatCNIC(relCnic) || "");
      if (relFile) fd.append("relationship_file", relFile);
    }

    // Reset UI
    setShowResultBox(false);
    setMessages([]);
    setErrorFields([]);
    setOverallVerdict("-");
    setRelVerdict("-");

    openLoading();

    try {
      const res = await fetch(`${API_BASE}/api/submit-kyc`, {
        method: "POST",
        body: fd,
      });

      let data: ApiResponse = {};
      try {
        data = await res.json();
      } catch {
        // non-json response
      }

      const verdictRaw = (data.final_verdict || "REVIEW").toUpperCase();
      const verdict: Verdict =
        verdictRaw === "PASS" || verdictRaw === "FAIL" || verdictRaw === "REVIEW"
          ? verdictRaw
          : "REVIEW";

      const relVRaw = (data.relationship?.verdict || "-").toUpperCase();
      const relV: Verdict =
        relVRaw === "PASS" || relVRaw === "FAIL" || relVRaw === "REVIEW"
          ? relVRaw
          : "-";

      setOverallVerdict(verdict);
      setRelVerdict(relV);
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      setErrorFields(Array.isArray(data.error_fields) ? data.error_fields : []);
      setShowResultBox(true);
      
      // Precise scrolling to results
      setTimeout(() => {
        resultBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);

      const newKycId = data.kyc_id || "demo";
      openResult(verdict, { kycId: newKycId });
    } catch (err: any) {
      setModalMode("result");
      setModalVerdict("FAIL");
      setModalIcon("❌");
      setModalTitle("Error");
      setModalDesc(`Submission failed: ${String(err?.message || err)}`);
      setModalActionLabel("Close");
      setModalActionKind("neutral");
      // Scroll to top on error too
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function onModalAction() {
    if (modalMode !== "result") return;

    if (modalVerdict === "PASS") {
      const id = kycId || "demo";
      router.push(`/open-account/account-selection?kyc_id=${encodeURIComponent(id)}`);
      return;
    }

    setOverlayOpen(false);
  }

  return (
    <>
      <Navbar />

      {/* Extracting Toast Notification */}
      {extracting && (
        <div className="fixed top-24 right-6 z-50 w-80 animate-in slide-in-from-right-10 fade-in duration-300">
          <div className="relative overflow-hidden rounded-xl border border-blue-200 bg-white p-4 shadow-2xl shadow-blue-100/50">
            <div className="absolute inset-y-0 left-0 w-1.5 bg-blue-500" />
            <div className="flex items-start gap-3 pl-2">
              <div className="mt-0.5 rounded-full bg-blue-50 p-1.5">
                 <div className="w-5 h-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"/>
              </div>
              <div className="flex-1">
                <h4 className="text-base font-bold text-blue-900">Extracting Data...</h4>
                <p className="mt-1 text-sm font-medium text-blue-700 leading-relaxed">
                  Analyzing your document.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auto-fill Toast Notification */}
      {autoFilled && !extracting && (
        <div className="fixed top-24 right-6 z-50 w-80 animate-in slide-in-from-right-10 fade-in duration-300">
          <div className="relative overflow-hidden rounded-xl border border-emerald-200 bg-white p-4 shadow-2xl shadow-emerald-100/50">
            <div className="absolute inset-y-0 left-0 w-1.5 bg-emerald-500" />
            <div className="flex items-start gap-3 pl-2">
              <div className="mt-0.5 rounded-full bg-emerald-100 p-1">
                <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-base font-bold text-emerald-900">Details Auto-filled!</h4>
                <p className="mt-1 text-sm font-medium text-emerald-700 leading-relaxed">
                  Please review the extracted information below and correct any errors.
                </p>
              </div>
              <button 
                onClick={() => setAutoFilled(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                type="button"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="min-h-screen bg-slate-50 text-slate-800 pb-20">
        <div className="absolute inset-0 z-0 bg-white opacity-40 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(rgb(226, 232, 240) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />

        <section className="relative z-10 mx-auto max-w-6xl px-6 pt-8 pb-8 text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900">
            Account Verification
          </h1>
          <p className="mt-4 text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Please fill in your details to complete the KYC process. Ensure all information matches your official documents.
          </p>
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
            
            <div className="bg-slate-50/50 border-b border-slate-100 px-8 py-5 flex items-center justify-between rounded-t-2xl">
               <h2 className="text-2xl font-bold text-slate-800">Application Form</h2>
               <div className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                 Secure & Encrypted
               </div>
            </div>

            {/* Progress Bar */}
            <div className="sticky top-20 z-40 bg-white/95 backdrop-blur-sm px-8 pt-4 pb-4 border-b border-slate-100">
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
              {/* Result Box */}
              {showResultBox && (
                <div ref={resultBoxRef} className={`mb-8 rounded-xl border p-4 ${
                  overallVerdict === 'PASS' ? 'bg-emerald-50 border-emerald-200' :
                  overallVerdict === 'FAIL' ? 'bg-rose-50 border-rose-200' :
                  'bg-amber-50 border-amber-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                      {overallVerdict === 'PASS' ? '✅' : overallVerdict === 'FAIL' ? '❌' : '⚠️'}
                      </span>
                      <div className="text-base font-bold text-slate-800">Verification Status</div>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-lg border px-3 py-1 text-sm font-bold tracking-wide ${pillClass(
                        overallVerdict
                      )}`}
                    >
                      {overallVerdict}
                    </span>
                  </div>

                  <div className="mt-4 border-t border-black/5 pt-3">
                     <ul className="list-disc space-y-1.5 pl-5 text-base text-slate-700">
                       {messages.length ? (
                         messages.map((m, i) => <li key={i}>{m}</li>)
                       ) : (
                         <li>No messages returned.</li>
                       )}
                     </ul>
                  </div>

                  {!selfMobile && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-slate-500 bg-white/50 p-2 rounded-lg inline-flex border border-black/5">
                      <span>Relationship Verification:</span>
                      <span
                        className={`font-extrabold ${
                          relVerdict === 'PASS' ? 'text-emerald-600' : 
                          relVerdict === 'FAIL' ? 'text-rose-600' : 'text-slate-600'
                        }`}
                      >
                        {relVerdict === "-" ? "Pending" : relVerdict}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Form */}
              <form onSubmit={onSubmit} className="space-y-10">
                {/* Section 1: Identifiers & CNIC Upload */}
                <div>
                  <h3 className="mb-5 text-base font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <span className="w-6 h-px bg-slate-200"></span> Identity Document
                  </h3>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FieldSelect
                      label="ID Document Type"
                      value={idVariant}
                      onChange={(v) => setIdVariant(v as any)}
                      options={[
                        { value: "", label: "Select Document Type" },
                        { value: "cnic", label: "CNIC (Old Format)" },
                        { value: "smart_card", label: "SNIC (Chip-based)" },
                        { value: "poc", label: "POC (Pakistan Origin Card)" },
                        { value: "nicop", label: "NICOP (Overseas Card)" },
                      ]}
                      valid={!!idVariant}
                      error={errorFields.includes("id_variant")}
                    />
                    <FieldSelect
                      label="Residential Status"
                      value={residentialStatus}
                      onChange={(v) => setResidentialStatus(v as any)}
                      options={[
                        { value: "", label: "Select Status" },
                        { value: "resident", label: "Resident Pakistani" },
                        { value: "non_resident", label: "Non-Resident Pakistani" },
                        { value: "foreigner", label: "Foreigner" },
                      ]}
                      valid={!!residentialStatus}
                      error={errorFields.includes("residential_status")}
                    />
                  </div>
                  
                  <div className="mt-8 p-6 bg-blue-50/50 rounded-2xl border border-blue-100">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h4 className="text-base font-bold text-blue-900 uppercase tracking-wide">Upload {idVariant ? idVariant.toUpperCase().replace("_", " ") : "Document"} Front</h4>
                            <p className="text-sm text-blue-600 mt-1">We will extract your details automatically from the image.</p>
                        </div>
                    </div>
                    
                    <FileInput
                      label=""
                      accept="image/*"
                      required
                      file={cnicFile}
                      onChange={handleCnicUpload}
                      hint={extracting ? "Processing... Please wait" : "Upload a clear JPEG or PNG of the front side"}
                      valid={!!cnicFile}
                      disabled={extracting}
                      error={errorFields.includes("cnic_file")}
                    />
                    


                    {extractionError503 && !extracting && !autoFilled && (
                        <div className="mt-4 flex items-start gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl animate-in fade-in slide-in-from-top-2">
                             <div className="mt-0.5 min-w-5">
                                <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                             </div>
                             <div>
                                <p className="text-sm font-bold text-rose-800">verification bot is not available at the moment, please try again in a few minutes</p>
                             </div>
                        </div>
                    )}

                    {extractionError && !extractionError503 && !extracting && !autoFilled && (
                        <div className="mt-4 flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl animate-in fade-in slide-in-from-top-2">
                             <div className="mt-0.5 min-w-5">
                                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                             </div>
                             <div>
                                <p className="text-sm font-bold text-amber-800">Could not extract details</p>
                                <p className="text-xs text-amber-700 mt-0.5">We couldn't read your document clearly or the document type doesn't match. Please enter your details manually.</p>
                             </div>
                        </div>

                    )}
                    
                    {/* CNIC Back Upload */}
                    <div className="mt-6 border-t border-blue-200 pt-6">
                        <h4 className="text-base font-bold text-blue-900 uppercase tracking-wide mb-1">
                            Upload {idVariant ? idVariant.toUpperCase().replace("_", " ") : "Document"} Back
                        </h4>
                        <p className="text-sm text-blue-600 mb-4">Required for address verification.</p>
                        
                        <FileInput
                            label=""
                            accept="image/*"
                            required
                            file={cnicBackFile}
                            onChange={setCnicBackFile}
                            hint="Upload a clear JPEG or PNG of the back side"
                            valid={!!cnicBackFile}
                            error={errorFields.includes("cnic_back_file")}
                        />
                    </div>
                  </div>
                </div>

                {/* Section 2: Personal Info */}
                <div>
                  <h3 className="mb-5 text-base font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <span className="w-6 h-px bg-slate-200"></span> Personal Details
                  </h3>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FieldInput
                      label="Full Name"
                      placeholder="e.g. Ali Khan"
                      value={fullName}
                      onChange={setFullName}
                      required
                      disabled={extracting}
                      valid={fullName.trim().length > 0}
                      error={errorFields.includes("user_name")}
                    />
                    <FieldInput
                      label="Father / Husband Name"
                      placeholder="Father/Husband Name"
                      value={fatherHusbandName}
                      onChange={setFatherHusbandName}
                      required
                      disabled={extracting}
                      valid={fatherHusbandName.trim().length > 0}
                      error={errorFields.includes("father_husband_name")}
                    />
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FieldInput
                      label="CNIC/SNIC Number"
                      placeholder="61101-1234567-8"
                      value={userCnic}
                      onChange={(v) => setUserCnic(formatCNIC(v))}
                      required
                      disabled={extracting}
                      maxLength={15}
                      valid={formatCNIC(userCnic).replace(/\D/g, "").length === 13}
                      error={errorFields.includes("user_cnic")}
                    />

                    <div className="pt-7">
                        <ToggleRow
                        checked={lifeValid}
                        onChange={(v) => {
                            setLifeValid(v);
                            if (v) setExpiryDate("");
                        }}
                        label="Lifetime Validity"
                        disabled={extracting || idVariant === "cnic"}
                        />
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FieldInput
                      label="Date of Issue (DD.MM.YYYY)"
                      placeholder="DD.MM.YYYY"
                      value={issueDate}
                      onChange={(v) => setIssueDate(formatDate(v))}
                      maxLength={10}
                      required={idVariant !== "cnic"}
                      disabled={extracting || idVariant === "cnic"}
                      helper={idVariant === "cnic" ? "Not available on old format CNIC" : undefined}
                      valid={idVariant === "cnic" || issueDate.length === 10}
                      error={errorFields.includes("user_issue_date")}
                    />
                    <FieldInput
                      label="Date of Expiry (DD.MM.YYYY)"
                      placeholder="DD.MM.YYYY"
                      value={expiryDate}
                      onChange={(v) => setExpiryDate(formatDate(v))}
                      maxLength={10}
                      disabled={lifeValid || extracting || idVariant === "cnic"}
                      helper={
                        idVariant === "cnic" 
                          ? "Not available on old format CNIC" 
                          : lifeValid 
                          ? "Disabled because Lifetime Validity is checked" 
                          : undefined
                      }
                      required={idVariant !== "cnic" && !lifeValid}
                      valid={idVariant === "cnic" || lifeValid || expiryDate.length === 10}
                      error={errorFields.includes("user_expiry_date")}
                    />
                  </div>
                </div>

                <Divider />

                {/* Section 3: Banking Info */}
                <div>
                   <h3 className="mb-5 text-base font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <span className="w-6 h-px bg-slate-200"></span> Banking Information
                  </h3>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FieldInput
                      label="IBAN Number"
                      placeholder="PK00UNIL000..."
                      value={iban}
                      onChange={(v) => {
                          const val = v.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
                          setIban(val);
                          
                          // Auto-fill Bank Name based on 4-char code
                          // Pakistan IBAN: PKxx CODE xxxxxxxxxxxxxxxx (Total 24 chars)
                          // Code is at chars 4-8 (0-indexed) i.e. 5th to 8th char
                          if (val.length >= 8) {
                             const code = val.substring(4, 8);
                             const name = BANK_IBAN_MAP[code];
                             if (name) {
                                 setBankName(name);
                             }
                          }
                      }}
                      maxLength={iban.startsWith("PK") ? 24 : 34}
                      helper={
                        iban.startsWith("PK") && iban.length > 0 && iban.length !== 24
                          ? "Pakistani IBAN must be exactly 24 characters"
                          : "15 to 34 characters, no spaces allowed"
                      }
                      required
                      valid={
                        iban.length >= 15 && iban.length <= 34 &&
                        (iban.startsWith("PK") ? iban.length === 24 : true)
                      }
                      error={errorFields.includes("user_iban")}
                    />
                    <FieldInput
                      label="Bank Name"
                      placeholder="e.g. United Bank Limited"
                      value={bankName}
                      onChange={setBankName}
                      required
                      valid={
                        bankName.trim().length > 0 && 
                        !bankName.toLowerCase().includes('sadapay') && 
                        !bankName.toLowerCase().includes('nayapay')
                      }
                      helper="⚠️ SADAPAY and NAYAPAY IBANs are not accepted by NCCPL."
                      error={errorFields.includes("user_bank_name")}
                    />
                  </div>

                  <div className="mt-8">
                    <FileInput
                      label="Proof of IBAN (Chequebook Leaf / Account Management Certificate / Account Statement) (Optional)"
                      file={bankFile}
                      onChange={setBankFile}
                      hint="Upload Image of cheque or statement"
                      accept="image/*,.pdf,.doc,.docx"
                      valid={!!bankFile}
                      error={errorFields.includes("bank_file")}
                    />
                  </div>
                </div>

                <Divider />

                {/* Section 4: Contact / Relationship */}
                <div>
                   <h3 className="mb-5 text-base font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <span className="w-6 h-px bg-slate-200"></span> Contact Verification
                  </h3>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    
                    {/* Phone Input with Custom Country Selector */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">
                            Mobile Number <span className="text-rose-500">*</span>
                        </label>
                        <div className="flex gap-2">
                             <div className="relative w-36">
                                <CustomCountrySelect value={countryCode} onChange={setCountryCode} error={errorFields.includes("user_mobile_country_code")} />
                             </div>
                             <div className="relative flex-1">
                                <input
                                    value={mobile}
                                    onChange={(e) => {
                                      const formatted = countryCode === "+92" ? formatPakistanPhone(e.target.value) : e.target.value;
                                      setMobile(formatted);
                                    }}
                                    placeholder={countryCode === "+92" ? "300 1234567" : "Enter phone number"}
                                    className={`w-full rounded-xl border bg-white px-4 py-3.5 text-base text-slate-900 placeholder:text-slate-400 outline-none focus:ring-4 transition-all shadow-sm ${
                                        errorFields.includes("user_mobile")
                                            ? "border-rose-500 ring-rose-500/10 focus:border-rose-600 focus:ring-rose-500/20" 
                                            : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/10"
                                    }`}
                                />
                                {mobile.trim().length > 0 && (countryCode === "+92" ? mobile.replace(/\D/g, "").length === 10 : true) && (
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

                    <div className="pt-7">
                        <ToggleRow
                            checked={selfMobile}
                            onChange={setSelfMobile}
                            label="This mobile is registered in my name"
                        />
                    </div>
                  </div>

                  {/* Relative info */}
                  {!selfMobile && (
                    <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50/50 p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="text-base font-bold text-amber-900">
                          Proof of Relationship Required
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <FieldInput
                          label="Relative Name"
                          placeholder="Relative Name"
                          value={relName}
                          onChange={setRelName}
                          required
                          valid={relName.trim().length > 0}
                          error={errorFields.includes("relative_name")}
                        />
                        <FieldSelect
                          label="Relationship"
                          value={relType}
                          onChange={setRelType}
                          options={[
                            {value:"", label:"Select Relation"},
                            {value:"Father", label:"Father"},
                            {value:"Mother", label:"Mother"},
                            {value:"Son", label:"Son"},
                            {value:"Daughter", label:"Daughter"},
                            {value:"Husband", label:"Husband"},
                            {value:"Wife", label:"Wife"}
                          ]}

                          valid={!!relType}
                          error={errorFields.includes("relationship")}
                        />
                      </div>
                      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                        <FieldInput
                          label="Relative CNIC"
                          placeholder="61101-1234567-8"
                          value={relCnic}
                          onChange={(v) => setRelCnic(formatCNIC(v))}
                          maxLength={15}
                          required
                          valid={formatCNIC(relCnic).replace(/\D/g, "").length === 13}
                          error={errorFields.includes("relative_cnic")}
                        />
                        <FileInput
                          label="Proof of Relationship (undertaking/affidavit)"
                          file={relFile}
                          onChange={setRelFile}
                          hint="ID card of relative or other proof"
                          accept="image/*,.pdf,.doc,.docx"
                          required
                          valid={!!relFile}
                          error={errorFields.includes("relationship_file")}
                        />
                      </div>

                      <div className="mt-4 text-sm text-amber-700/80">
                        * Relationship verification will be performed after submission.
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-6">
                    <button
                    type="submit"
                    disabled={!isFormValid || completionPercent < 100}
                    className="w-full rounded-xl bg-slate-900 text-white font-bold py-4 text-lg tracking-wide hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-slate-200"
                    >
                    SUBMIT VERIFICATION FILES
                    </button>
                    <p className="mt-4 text-center text-sm text-slate-400">
                        By submitting, you agree to the processing of your data for KYC purposes.
                    </p>
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* Overlay Modal */}
        {overlayOpen && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/5">
              <div className="p-8 text-center">

                {modalMode === "loading" ? (
                  <div className="py-6">
                    {/* Animated Spinner with Countdown */}
                    <div className="relative mx-auto mb-8 h-24 w-24">
                        <svg className="h-full w-full rotate-[-90deg]" viewBox="0 0 100 100">
                            {/* Background Circle */}
                            <circle cx="50" cy="50" r="45" fill="none" stroke="#E2E8F0" strokeWidth="8" />
                            {/* Progress Circle */}
                            <circle 
                                cx="50" cy="50" r="45" fill="none" stroke="#3B82F6" strokeWidth="8" 
                                strokeLinecap="round"
                                strokeDasharray="283"
                                strokeDashoffset={283 - (283 * timeLeft) / 45}
                                className="transition-all duration-1000 ease-linear"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-bold text-slate-900 tabular-nums tracking-tighter animate-in zoom-in duration-300" key={timeLeft}>
                                {timeLeft}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Seconds</span>
                        </div>
                    </div>

                    <div className="text-2xl font-bold text-slate-800 animate-pulse">{modalTitle}</div>
                    <div className="mt-2 text-sm font-medium text-slate-500">{modalDesc}</div>
                  </div>
                ) : (
                  <>
                    {typeof modalIcon === 'string' && modalIcon.startsWith('/') ? (
                      <div className="mb-4 mx-auto w-24 h-24 relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={modalIcon} alt="Result" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="text-6xl mb-4">{modalIcon}</div>
                    )}
                    <div className="text-xl font-bold text-slate-900">{modalTitle}</div>
                    <div className="mt-2 text-sm text-slate-500 max-w-[80%] mx-auto">{modalDesc}</div>

                    <button
                      onClick={onModalAction}
                      className={
                        modalActionKind === "primary"
                          ? "mt-8 w-full rounded-xl bg-blue-600 py-3.5 font-bold text-white hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
                          : "mt-8 w-full rounded-xl bg-slate-800 py-3.5 font-bold text-white hover:bg-slate-900 shadow-lg transition-all"
                      }
                    >
                      {modalActionLabel}
                    </button>

                    {modalVerdict === "PASS" && (
                      <div className="mt-4 text-xs text-slate-400 bg-slate-50 py-2 rounded-lg border border-slate-100">
                        Ref ID: <span className="text-slate-600 font-mono font-bold">{kycId || "demo"}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <DocumentRequirementsModal open={reqOpen} onClose={() => setReqOpen(false)} docs={docs} />
      <Footer />
    </>
  );
}


/* ---------- Small UI helpers ---------- */


function CustomCountrySelect({ value, onChange, error }: { value: string, onChange: (v: string) => void, error?: boolean }) {
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
                className={`flex w-full items-center justify-between rounded-xl border bg-white px-3 py-3.5 text-sm text-slate-900 outline-none focus:ring-4 shadow-sm transition-all ${
                    error 
                        ? "border-rose-500 ring-rose-500/10 focus:border-rose-600 focus:ring-rose-500/20" 
                        : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/10"
                }`}
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

function Divider() {
  return <div className="h-px w-full bg-slate-100 my-2" />;
}

function FieldInput({
  label,
  placeholder,
  value,
  onChange,
  required,
  maxLength,
  disabled,
  helper,
  valid,
  error,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  maxLength?: number;
  disabled?: boolean;
  helper?: string;
  valid?: boolean;
  error?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </label>
      <div className="relative">
        <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            disabled={disabled}
            className={`w-full rounded-xl border bg-white px-4 py-3.5 text-base text-slate-900 placeholder:text-slate-400 outline-none focus:ring-4 transition-all shadow-sm ${
                error 
                    ? "border-rose-500 ring-rose-500/10 focus:border-rose-600 focus:ring-rose-500/20" 
                    : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/10"
            } disabled:bg-slate-50 disabled:text-slate-400`}
        />
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
  label,
  value,
  onChange,
  options,
  valid,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  valid?: boolean;
  error?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">{label}</label>
      <div className="relative">
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full appearance-none rounded-xl border bg-white px-4 py-3.5 text-base text-slate-900 outline-none focus:ring-4 shadow-sm transition-all ${
                error 
                    ? "border-rose-500 ring-rose-500/10 focus:border-rose-600 focus:ring-rose-500/20" 
                    : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/10"
            }`}
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

function ToggleRow({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      className={`group flex w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
        disabled ? "opacity-50 cursor-not-allowed bg-slate-50 border-slate-100" :
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
      <span className={`text-base font-semibold ${checked ? 'text-blue-800' : 'text-slate-600'}`}>
        {label}
      </span>
    </div>
  );
}

function FileInput({
  label,
  accept,
  required,
  file,
  onChange,
  hint,
  valid,
  disabled,
  error,
}: {
  label: string;
  accept: string;
  required?: boolean;
  file: File | null;
  onChange: (f: File | null) => void;
  hint?: string;
  valid?: boolean;
  error?: boolean;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </label>
 
      <div className={`group relative mt-1 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all ${
        error
            ? "border-rose-300 bg-rose-50/50 hover:border-rose-400 hover:bg-rose-50"
            : file 
                ? "border-blue-300 bg-blue-50/50" 
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
        <input
          type="file"
          accept={accept}
          required={required}
          disabled={disabled}
          onChange={(e) => onChange(e.target.files?.[0] || null)}
          className={`absolute inset-0 z-10 h-full w-full opacity-0 ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
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
        
        {file ? (
            <div className="flex items-center gap-3 text-blue-700">
                <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div className="text-left">
                    <div className="text-base font-bold truncate max-w-[200px]">{file.name}</div>
                    <div className="text-sm text-blue-500 font-medium">Click to replace</div>
                </div>
            </div>
        ) : (
            <div className="space-y-2">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 group-hover:scale-110 transition-transform">
                    <svg className="h-5 w-5 text-slate-400 group-hover:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                </div>
                <div className="text-base font-semibold text-slate-600">
                    <span className="text-blue-600 hover:underline">Click to upload</span> or drag and drop
                </div>
                <div className="text-xs text-slate-400 font-medium">{hint}</div>
            </div>
        )}
      </div>
    </div>
  );
}
