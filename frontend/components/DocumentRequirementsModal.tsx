"use client";

import { useEffect, useState } from "react";

type DocRow = {
  document: string;
  format: string;
  instructions: string;
  remarks: string;
};

export default function DocumentRequirementsModal({
  open,
  onClose,
  docs,
}: {
  open: boolean;
  onClose: () => void;
  docs: DocRow[];
}) {
  const [visible, setVisible] = useState(false);
  const [language, setLanguage] = useState<"en" | "ur">("en");

  const urduMapping: Record<string, { document: string; instructions: string }> = {
    "CNIC Front": {
      document: "CNIC فرنٹ",
      instructions: "اصل CNIC کی فرنٹ سائیڈ کی واضح تصویر اپلوڈ کریں"
    },
    "CNIC Back": {
        document: "CNIC بیک",
        instructions: "اصل CNIC کی بیک سائیڈ کی واضح تصویر اپلوڈ کریں"
    },
    "Digital Signature": {
        document: "ڈیجیٹل دستخط (Digital Signature)",
        instructions: "سفید سادہ کاغذ پر CNIC کے مطابق دستخط کریں اور واضح تصویر اپلوڈ کریں"
    },
    "Zakat Form": {
        document: "زکوٰۃ فارم (Zakat Form)",
        instructions: "فائل سائز **600KB** سے زیادہ نہ ہو\n• **دستخط شدہ اور مُہر شدہ** ہو\n• اگر پرانا **مینول فارمیٹ** ہے تو مکمل **فرنٹ اور بیک** اپلوڈ کریں"
    },
    "Income Proof": {
        document: "آمدن کا ثبوت (Income Proof)",
        instructions: "• ملازمت پیشہ: **Salary Certificate / Salary Slip**\n• کاروباری فرد: **Business Cover Letter** (ٹیمپلیٹ آگے فراہم کیا جائے گا)\n• تمام صورتوں میں: **دستخط شدہ اور مُہر شدہ**"
    },
    "Mailing Address": {
        document: "میلنگ ایڈریس (Mailing Address)",
        instructions: "**Utility Bill / Internet Bill** بھی استعمال ہو سکتا ہے\nاگر CNIC/NADRA ریکارڈ سے مختلف ہو تو لازمی اپلوڈ کریں\nترجیحاً **پچھلے مہینے** کا بل"
    }
  };

  useEffect(() => {
    if (open) {
        setVisible(true);
    } else {
        const timer = setTimeout(() => setVisible(false), 200);
        return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!visible && !open) return null;

  return (
    <div className={`fixed inset-0 z-[80] flex items-center justify-center p-4 transition-all duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      <div className={`relative w-full max-w-5xl rounded-3xl border border-white/60 bg-white/90 backdrop-blur-xl shadow-2xl shadow-slate-900/10 overflow-hidden ring-1 ring-slate-900/5 transition-all duration-300 transform ${open ? 'scale-100' : 'scale-95'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-white/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {language === "en" ? "Helper Guide" : "رہنمائی"}
                </span>
            </div>
            <div className={`text-2xl font-bold text-slate-800 ${language === "ur" ? 'font-urdu' : ''}`}>
                {language === "en" ? "Required Documents" : "مطلوبہ دستاویزات (Required Documents)"}
            </div>
            <p className={`text-sm text-slate-500 mt-1 ${language === "ur" ? 'text-right' : ''}`}>
                {language === "en" 
                    ? "Please ensure your files match these requirements to avoid rejection." 
                    : "براہِ کرم ریجیکشن سے بچنے کے لیے یقینی بنائیں کہ آپ کی فائلیں درج ذیل شرائط کے مطابق ہوں۔"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="inline-flex p-1.5 bg-slate-200/50 rounded-2xl ring-1 ring-slate-900/5 shadow-inner">
              <button
                onClick={() => setLanguage("en")}
                className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all ${
                  language === "en"
                    ? "bg-white text-blue-600 shadow-lg border border-blue-100 transform scale-105"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLanguage("ur")}
                className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all ${
                  language === "ur"
                    ? "bg-white text-emerald-600 shadow-lg border border-emerald-100 transform scale-105"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                اردو
              </button>
            </div>
            <button
                onClick={onClose}
                className="group rounded-full p-2 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
                aria-label="Close"
            >
                <svg className="w-5 h-5 text-slate-400 group-hover:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div 
            className="p-8 overflow-auto max-h-[65vh] custom-scrollbar"
            style={{ direction: language === "ur" ? "rtl" : "ltr" }}
        >
          <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
            <div className={`grid grid-cols-12 bg-slate-50/80 border-b border-slate-200 px-6 py-4 text-sm font-bold text-slate-600 uppercase tracking-wider ${language === "ur" ? 'text-right font-urdu' : 'text-left'}`}>
              <div className="col-span-12 md:col-span-4">
                {language === "en" ? "Document Type" : "دستاویز کی قسم"}
              </div>
              <div className="col-span-6 md:col-span-3">
                {language === "en" ? "Accepted Format" : "قابلِ قبول فارمیٹ"}
              </div>
              <div className="col-span-6 md:col-span-5">
                {language === "en" ? "Requirements & Instructions" : "شرائط اور ہدایات"}
              </div>
            </div>

            <div className="divide-y divide-slate-100 bg-white">
              {docs.map((d, i) => {
                const mapped = language === "ur" ? urduMapping[d.document] : null;
                const docName = mapped ? mapped.document : d.document;
                const docInstructions = mapped ? mapped.instructions : d.instructions;

                return (
                    <div key={d.document} className={`grid grid-cols-12 px-6 py-5 text-base hover:bg-slate-50/50 transition-colors`}>
                    <div className={`col-span-12 md:col-span-4 font-semibold text-slate-800 flex items-center gap-3 mb-2 md:mb-0 ${language === "ur" ? 'font-urdu' : ''}`}>
                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        {docName}
                    </div>
                    <div className="col-span-6 md:col-span-3 text-slate-500 self-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-sm font-mono font-medium">
                            {d.format}
                        </span>
                    </div>
                    <div className={`col-span-6 md:col-span-5 text-slate-700 text-[15px] leading-relaxed self-center px-2 ${language === "ur" ? 'font-urdu text-right' : 'text-left'}`}>
                        {docInstructions && (
                            <div className="mb-2 whitespace-pre-line animate-in fade-in slide-in-from-right-2 duration-500">
                                <span className="font-medium text-slate-900">
                                    {docInstructions.split('\n').map((line, i) => (
                                        <div key={i}>
                                            {line.split('**').map((part, j) => 
                                                j % 2 === 1 ? <strong key={j} className="text-slate-900 font-extrabold">{part}</strong> : part
                                            )}
                                        </div>
                                    ))}
                                </span>
                            </div>
                        )}
                        {d.remarks && language === "en" && (
                            <div className={`flex items-start gap-2 ${!d.instructions ? '' : 'mt-2 pt-2 border-t border-slate-100'}`}>
                                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-2 shrink-0 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                                <span className="font-semibold text-slate-700">{d.remarks}</span>
                            </div>
                        )}
                        {!docInstructions && !d.remarks && <span className="text-slate-400 italic text-sm">No special instructions</span>}
                    </div>
                    </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/50 p-4 flex gap-4 items-start">
            <div className="p-2 bg-amber-100 rounded-full shrink-0 text-amber-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <div className={language === "ur" ? 'text-right' : 'text-left'}>
                <div className={`text-sm font-bold text-slate-800 mb-1 ${language === "ur" ? 'font-urdu' : ''}`}>
                    {language === "en" ? "Important Naming Convention" : "اہم فائل نام رکھنے کا اصول (Important Naming Convention)"}
                </div>
                <div className={`text-sm text-slate-600 ${language === "ur" ? 'font-urdu' : ''}`}>
                    {language === "en" 
                        ? "File names should ideally contain the customer name to ensure accurate processing." 
                        : "درست پراسیسنگ کے لیے فائل کے نام میں بہتر ہے کہ کسٹمر کا نام شامل ہوں۔"}
                    <br />
                    {language === "en" ? "Example:" : "مثال:"} <span className="text-slate-900 font-mono font-medium bg-white px-1.5 rounded border border-amber-200/50 text-xs">Tanveer Ahmed - Zakat Form.pdf</span>
                </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 rounded-b-3xl">
          <button
            onClick={onClose}
            className={`rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-slate-800 shadow-lg shadow-slate-200 hover:shadow-xl transition-all active:scale-[0.98] ${language === "ur" ? 'font-urdu' : ''}`}
          >
            {language === "en" ? "I Understand" : "میں سمجھ گیا"}
          </button>
        </div>
      </div>
    </div>
  );
}
