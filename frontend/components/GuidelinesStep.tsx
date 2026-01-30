"use client";

import { useState } from "react";
import Link from "next/link";
import DocumentRequirementsModal from "./DocumentRequirementsModal";

const docs = [
  { document: "Digital Signature", format: "JPEG / PNG", instructions: "Plain white paper, signature as per CNIC", remarks: "" },
  { document: "Zakat Form", format: "PDF", instructions: "File size should not exceed 600KB", remarks: "Signed & Stamped" },
  { document: "Income Proof", format: "JPEG / PNG", instructions: "", remarks: "Signed & Stamped" },
  { document: "Mailing Address", format: "JPEG / PNG", instructions: "Utility bill, Internet bill can also be used", remarks: "Last month bill" },
  { document: "Permanent Address", format: "JPEG / PNG", instructions: "", remarks: "If different from CNIC/NADRA record" },
];

export default function GuidelinesStep() {
  const [open, setOpen] = useState(false);

  return (
    <main className="min-h-[80vh] bg-slate-50 text-slate-800 relative z-0">
      <section className="relative overflow-hidden py-16 md:py-24">
        {/* Background Gradients */}
        <div className="absolute inset-0 pointer-events-none">
             <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl mix-blend-multiply" />
             <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-100/50 rounded-full blur-3xl mix-blend-multiply" />
        </div>
        
        <div className="mx-auto max-w-6xl px-6 relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 shadow-sm mb-6">
                <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                Step 1 of 4
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6">
              Account Opening <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Guidelines</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
              Review required documents and formats before you begin your digital onboarding journey.
            </p>
          </div>

          <div className="mx-auto max-w-5xl rounded-3xl border border-white/60 bg-white/70 backdrop-blur-2xl shadow-xl shadow-slate-200/50 p-8 md:p-10 ring-1 ring-slate-900/5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8 border-b border-slate-100 pb-8">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Requirements Checklist</div>
                <div className="text-2xl font-bold text-slate-800">Mandatory Documents</div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setOpen(true)}
                  className="inline-flex justify-center items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-[0.98]"
                >
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Detailed Guide
                </button>

                <Link
                  href="/open-account/kyc"
                  className="inline-flex justify-center items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-[0.98]"
                >
                  Start Application
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/50 shadow-sm">
              <div className="grid grid-cols-12 bg-slate-50/80 border-b border-slate-100 px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <div className="col-span-12 md:col-span-5">Document Name</div>
                <div className="col-span-6 md:col-span-3">Format</div>
                <div className="col-span-6 md:col-span-4">Instructions</div>
              </div>
              <div className="divide-y divide-slate-100">
                {docs.map((d, i) => (
                  <div key={d.document} className={`grid grid-cols-12 px-6 py-4 text-sm transition-colors hover:bg-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                    <div className="col-span-12 md:col-span-5 font-semibold text-slate-800 flex items-center gap-3 mb-2 md:mb-0">
                        <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                        {d.document}
                    </div>
                    <div className="col-span-6 md:col-span-3 text-slate-500 font-mono text-xs bg-slate-100 w-fit px-2 py-1 rounded border border-slate-200 self-start">
                        {d.format}
                    </div>
                    <div className="col-span-6 md:col-span-4 text-slate-600 text-xs leading-relaxed self-center">
                        {d.remarks || d.instructions || <span className="text-slate-300 italic">No special remarks</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-xl bg-blue-50/50 p-4 border border-blue-100">
                <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-slate-600">
                    <p className="font-semibold text-blue-900 mb-0.5">Pro Tip:</p>
                    File names should ideally include the customer name for faster processing (e.g.{" "}
                    <span className="text-slate-900 font-mono font-medium px-1.5 py-0.5 bg-white rounded border border-blue-100 text-xs">Tanveer Ahmed - Zakat Form.pdf</span>)
                </div>
            </div>
          </div>
        </div>
      </section>

      <DocumentRequirementsModal open={open} onClose={() => setOpen(false)} docs={docs} />
    </main>
  );
}
