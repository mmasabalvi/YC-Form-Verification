"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useRouter, useSearchParams } from "next/navigation";

export default function AccountSelectionPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const kycId = sp.get("kyc_id") || "demo";

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

        <section className="relative z-10 mx-auto max-w-5xl px-6 pt-8 pb-10 text-center">

          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-6">
            Choose Your Path
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Select how you would like to proceed with your account opening journey.
          </p>
          <div className="mt-4 text-sm font-mono text-slate-400">
            Ref ID: <span className="font-bold text-slate-600">{kycId}</span>
          </div>
        </section>

        <section className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ChoiceCard
                title="Open New Account"
                desc="Start a fresh account opening process with Youngs Capital."
                image="/assets/new-account.png"
                color="blue"
                onClick={() =>
                  router.push(
                    `/open-account/account-mode?kyc_id=${encodeURIComponent(
                      kycId
                    )}&flow=new`
                  )
                }
              />

              <ChoiceCard
                title="Transfer Existing"
                desc="Move your existing account from another brokerage to us."
                image="/assets/transfer.jpg"
                color="indigo"
                imgClassName="scale-125"
                onClick={() =>
                  router.push(
                    `/open-account/transfer-details?kyc_id=${encodeURIComponent(
                      kycId
                    )}`
                  )
                }
              />
          </div>
          
          <div className="mt-10 text-center">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white border border-slate-200 text-xs text-slate-500 shadow-sm">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                You can change this decision later with help from our support team.
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

function ChoiceCard({
  title,
  desc,
  image,
  color,
  imgClassName,
  onClick,
}: {
  title: string;
  desc: string;
  image: string;
  color: "blue" | "indigo";
  imgClassName?: string;
  onClick: () => void;
}) {
  const colorStyles = {
    blue: "bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-blue-100 group-hover:border-blue-200",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100 group-hover:bg-indigo-100 group-hover:border-indigo-200",
  }[color];

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full text-left rounded-3xl border border-slate-200 bg-white p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-1 hover:border-slate-300"
    >
      <div className={`mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl border transition-colors overflow-hidden ${colorStyles} p-3`}>
        <div className="relative w-full h-full"> 
            {/* eslint-disable-next-line @next/next/no-img-element */}
             <img src={image} alt={title} className={`w-full h-full object-contain ${imgClassName || ''}`} />
         </div>
      </div>
      
      <div className="relative z-10">
        <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
            {title}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">
            {desc}
        </p>
      </div>

      <div className="absolute top-8 right-8 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-blue-400">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </div>
    </button>
  );
}
