"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type AccountType = "normal" | "sahulat" | "minor" | "roshan";

export default function AccountTypePage() {
  const router = useRouter();
  const sp = useSearchParams();
  const kycId = sp.get("kyc_id") || "demo";
  const flow = sp.get("flow") || "new";
  const mode = sp.get("mode") || "conventional";

  const [atype, setAtype] = useState<AccountType | null>(null);

  function goNext(selectedType: AccountType) {
    setAtype(selectedType);
    router.push(
      `/open-account/assistance?kyc_id=${encodeURIComponent(
        kycId
      )}&flow=${encodeURIComponent(flow)}&mode=${encodeURIComponent(
        mode
      )}&type=${encodeURIComponent(selectedType)}`
    );
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-slate-50 text-slate-800 pb-20">
        <div
          className="absolute inset-0 z-0 bg-white opacity-40 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(rgb(226, 232, 240) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <section className="relative z-10 mx-auto max-w-4xl px-6 pt-8 pb-10 text-center">

          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-6">
            Select Account Type
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Choose the specific account package that best fits your needs.
          </p>
        </section>

        <section className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            <Pick
              title="Normal Account"
              desc="Full-service account with no Investment Limit."
              badge="Standard"
              image="/assets/normal.png"
              selected={atype === "normal"}
              onClick={() => goNext("normal")}
            />
            <Pick
              title="Sahulat Account"
              desc="Open your Sahulat Account by just submitting a copy of your valid CNICMaximum Investment limit Rs 1,000,000"
              badge="Easy"
              image="/assets/sahulat.jpg"
              selected={atype === "sahulat"}
              onClick={() => goNext("sahulat")}
            />
            <Pick
              title="Minor Account"
              desc="For individuals under 18 (guardianship required)."
              badge="Restricted"
              image="/assets/minor.png"
              selected={atype === "minor"}
              onClick={() => goNext("minor")}
            />
            <Pick
              title="Roshan Digital"
              desc="For Non-Resident Pakistanis via RDA."
              badge="Overseas"
              image="/assets/foreign.jpg"
              selected={atype === "roshan"}
              onClick={() => goNext("roshan")}
            />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

function Pick({
  title,
  desc,
  badge,
  image,
  selected,
  onClick,
}: {
  title: string;
  desc: string;
  badge: string;
  image: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative text-left rounded-3xl border p-6 transition-all duration-300 w-full hover:shadow-xl hover:-translate-y-1 ${
        selected
          ? "border-blue-600 bg-blue-50/30 ring-4 ring-blue-500/10 shadow-lg shadow-blue-500/10"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-slate-200/50"
      }`}
    >
      <div className="flex flex-col h-full">
         <div className="flex items-start justify-between mb-4">
             <div className="h-16 w-16 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-1">
                 {/* eslint-disable-next-line @next/next/no-img-element */}
                 <img src={image} alt={title} className="h-full w-full object-contain" />
             </div>
             <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                 selected ? 'bg-blue-100 text-blue-700 ring-blue-700/10' : 'bg-slate-50 text-slate-600 ring-slate-500/10'
             }`}>
                {badge}
             </span>
         </div>
         
         <div className="flex items-center justify-between">
            <h3 className={`text-xl font-bold transition-colors ${selected ? 'text-blue-700' : 'text-slate-900'}`}>
                {title}
            </h3>
            <div className="text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-blue-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
            </div>
         </div>
         
         <p className="mt-2 text-sm text-slate-500 leading-relaxed">
            {desc}
         </p>
      </div>
    </button>
  );
}
