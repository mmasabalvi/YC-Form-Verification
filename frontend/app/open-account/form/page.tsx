"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function OpenAccountFormPage() {
  const searchParams = useSearchParams();
  const kycId = searchParams.get("kyc_id");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!kycId) return;

    setLoading(true);
    fetch(`${API_BASE}/api/get-kyc-data?kyc_id=${kycId}`)
      .then(async res => {
         if (!res.ok) throw new Error("Failed to load KYC data");
         return res.json();
      })
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [kycId]);

  return (
    <>
      <Navbar />
      <main className="min-h-[70vh] bg-slate-50">
        <section className="mx-auto max-w-6xl px-6 py-10">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Main Account Form</h1>
          <p className="mt-2 text-slate-600">
             This is where the detailed account opening form (CGP/Normal) will live.
          </p>

          {!kycId && (
              <div className="mt-8 p-4 bg-amber-50 text-amber-800 rounded-xl border border-amber-200">
                  ⚠️ No KYC ID found. Please complete the KYC step first.
              </div>
          )}

          {loading && (
              <div className="mt-8 p-8 text-center bg-white rounded-2xl shadow-sm border border-slate-200">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"/>
                  <p className="mt-2 text-sm text-slate-500 font-medium">Loading Verified Profile...</p>
              </div>
          )}
          
          {data && (
            <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-100 flex items-center gap-3">
                    <div className="bg-emerald-100 p-1.5 rounded-full">
                        <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-emerald-900">Pre-filled Data (Ready for Auto-fill)</h3>
                        <p className="text-xs text-emerald-700">Fetched from verified_{kycId}.json</p>
                    </div>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase">CNIC Back (Translated)</label>
                        <div className="mt-1 p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm font-mono text-slate-700 space-y-2">
                             <p><span className="font-bold text-slate-900">Permanent:</span> {data.permanent_address_translated || "Extracted in background..."}</p>
                             <p><span className="font-bold text-slate-900">Current:</span> {data.current_address_english || "Extracted in background..."}</p>
                             <p><span className="font-bold text-slate-900">CNIC Match:</span> {data.back_cnic_match === undefined ? "Checking..." : String(data.back_cnic_match)}</p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase">Profile Dump</label>
                        <pre className="mt-1 p-3 bg-slate-50 rounded-lg border border-slate-100 text-[10px] text-slate-600 overflow-auto max-h-40">
                            {JSON.stringify(data, null, 2)}
                        </pre>
                    </div>
                </div>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
