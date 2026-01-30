"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function readSelection(kycId: string) {
  if (!kycId) return null;
  const key = `kyc:${kycId}:account_selection`;
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

export default function SummaryPage() {
  const router = useRouter();
  const params = useSearchParams();

  const kycId = params.get("kyc_id") || "";
  const flow = params.get("flow") || "";
  const mode = params.get("mode") || "";
  const accountType = params.get("account_type") || "";

  const stored = useMemo(() => readSelection(kycId), [kycId]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-slate-50 text-slate-800 pb-20">
        <div
          className="absolute inset-0 z-0 bg-white opacity-40 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(rgb(226, 232, 240) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <section className="relative z-10 mx-auto max-w-3xl px-6 pt-16 pb-8 text-center">
          <div className="text-6xl mb-3">✅</div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">Selection Saved</h1>
          <p className="mt-3 text-slate-600">
            Next phase of the account opening form will be placed here.
          </p>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-left">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Summary</div>

            <div className="mt-4 grid grid-cols-1 gap-3 text-sm">
              <Row label="KYC ID" value={kycId || "-"} mono />
              <Row label="Flow" value={flow || stored?.flow || "-"} />
              <Row label="Mode" value={mode || stored?.mode || "-"} />
              <Row label="Account Type" value={accountType || stored?.account_type || "-"} />
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => router.push(`/open-account/kyc`)}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-100 transition-all"
              >
                Back to KYC
              </button>
              <button
                type="button"
                onClick={() => alert("Next form step will be implemented next.")}
                className="flex-1 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
              >
                Continue
              </button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/40 px-4 py-3">
      <div className="text-slate-500 font-semibold">{label}</div>
      <div className={`text-slate-900 font-extrabold ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
