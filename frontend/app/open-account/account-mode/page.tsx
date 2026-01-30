"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function AccountModePage() {
  const router = useRouter();
  const sp = useSearchParams();
  const kycId = sp.get("kyc_id") || "demo";
  const flow = sp.get("flow") || "new";

  const [mode, setMode] = useState<"conventional" | "shariah" | null>(null);

  function goNext(selectedMode: "conventional" | "shariah") {
    setMode(selectedMode);
    router.push(
      `/open-account/account-type?kyc_id=${encodeURIComponent(
        kycId
      )}&flow=${encodeURIComponent(flow)}&mode=${encodeURIComponent(selectedMode)}`
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
            Select Account Category
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Choose the type of account structure that suits your investment preferences.
          </p>
        </section>

        <section className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PickCard
              title="Standard Account"
              desc="Standard investment account with access to all market instruments."
              image="/assets/conventional.png"
              selected={mode === "conventional"}
              onClick={() => goNext("conventional")}
            />
            <PickCard
              title="Shariah Compliant"
              desc="Invest strictly in Shariah-compliant equities and instruments."
              image="/assets/masjid.png"
              selected={mode === "shariah"}
              imgClassName="scale-110"
              onClick={() => goNext("shariah")}
            />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

function PickCard({
  title,
  desc,
  image,
  selected,
  imgClassName,
  onClick,
}: {
  title: string;
  desc: string;
  image: string;
  selected: boolean;
  imgClassName?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative text-left rounded-3xl border p-8 transition-all duration-300 w-full hover:shadow-xl hover:-translate-y-1 ${
        selected
          ? "border-blue-600 bg-blue-50/30 ring-4 ring-blue-500/10 shadow-lg shadow-blue-500/10"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-slate-200/50"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`h-20 w-20 rounded-2xl border flex items-center justify-center transition-all overflow-hidden p-3 ${
            selected
              ? "bg-blue-600 border-blue-600"
              : "bg-slate-50 border-slate-100 group-hover:bg-white group-hover:border-slate-200"
          }`}
        >
           <div className="relative w-full h-full"> 
               {/* eslint-disable-next-line @next/next/no-img-element */}
               <img src={image} alt={title} className={`w-full h-full object-contain ${imgClassName || ''}`} />
           </div>
        </div>
        
        <div className="flex-1 pt-1">
          <div className="flex items-center justify-between">
            <h3 className={`text-lg font-bold transition-colors ${selected ? 'text-blue-700' : 'text-slate-900'}`}>
                {title}
            </h3>
            <div className="text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-blue-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
            </div>
          </div>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed group-hover:text-slate-600">
            {desc}
          </p>
        </div>
      </div>
    </button>
  );
}
