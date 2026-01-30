"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.trim() || "http://127.0.0.1:8000";

const FALLBACK_BROKERS = [
  "128 Securities (Private) Limited",
  "A B M Securities (Pvt) Limited",
  "A. I. Securities (Private) Limited",
  "A.H.K.D. Securities (Pvt.) Limited",
  "A.H.M. Securities (Private) Limited",
  "A. Motiwala Capital Management (Private) Limited",
  "A.S. Securities (Private) Limited",
  "AAA Securities (Private) Limited",
  "AB Equities (Private) Limited",
  "Aba Ali Habib Securities (Private) Limited",
  "Abbasi & Company (Private) Limited",
  "ACM Global (Private) Limited",
  "Adam Securities Limited",
  "Adam Usman Securities (Private) Limited",
  "Adeel & Nadeem Securities (Private) Limited",
  "Ahsan Securities (Pvt) Limited",
  "AKD Securities Limited",
  "Akhai Securities (Pvt.) Limited",
  "Akik Capital (Private) Limited",
  "AKY Securities (Private) Limited",
  "AL Habib Capital Markets (Pvt.) Limited",
  "Al-Haq Securities (Private) Limited",
  "Al-Mal Securities & Services Limited",
  "Alfalah Securities (Private) Limited",
  "Ali Securities (Private) Limited",
  "Allied Securities (Pvt.) Ltd.",
  "Alpha Capital (Private) Limited",
  "Altaf Adam Securities (Private) Limited",
  "AM Chaudhary Securities (Private) Limited",
  "Amaan Capital (Private) Limited",
  "Amanah Investments Limited",
  "Amanah Stocks & Commodities (Private) Limited",
  "Amer Securities (Pvt.) Limited",
  "Ample Securities (Private) Limited",
  "AMZ Securities (Private) Limited",
  "Apex Capital Securities (Private) Limited",
  "Arch Capital Securities (Private) Limited",
  "Arif Habib 1857 (Private) Limited",
  "Arif Habib Limited",
  "Arif Latif Securities (Private) Limited",
  "ASA Stocks (Private) Limited",
  "Asad Mustafa Securities (Private) Limited",
  "ASDA Securities (Private) Limited",
  "Athar Ali Shah",
  "Axis Global Limited",
  "Ayub Chaudhry Investments (Private) Limited",
  "Azee Securities (Private) Limited",
  "B & B Securities (Private) Limited",
  "BABA Equities (Private) Limited",
  "Backers & Partners (Private) Limited",
  "Bawa Securities (Private) Limited",
  "Bawany Securities (Private) Limited",
  "Beaming Investment & Securities (Private) Limited",
  "Bhayani Securities (Private) Limited",
  "Bismillah Securities (Private) Limited",
  "BMA Capital Management Limited",
  "BMS Capital (Pvt.) Ltd.",
  "BOP Capital Securities (Private) Limited",
  "Brains Securities (Private) Limited",
  "Bridge Securities (Private) Limited",
  "BRR Financial Services (Private) Limited",
  "Bullsee Investments (Private) Limited",
  "CAMCO (Private) Limited",
  "Centile Securities (Private) Limited",
  "Chase Securities Pakistan (Private) Limited",
  "Chippa Securities (Private) Limited",
  "CMA Securities (Private) Limited",
  "Continental Capital Management (Private) Limited",
  "Creative Capital Securities (Private) Limited",
  "Dalal Securities (Private) Limited",
  "Darson Securities (Private) Limited",
  "Dawood Equities Limited",
  "Dawood Mohammed Securities (Private) Limited",
  "Delight Equity (Private) Limited",
  "DJM Securities Limited",
  "Dosslani's Securities (Private) Limited",
  "Dr. Arslan Razaque Securities (Private) Limited",
  "Eleven Stars Securities (Private) Limited",
  "Elixir Securities Pakistan (Private) Limited",
  "Enrichers Securities (Private) Limited",
  "Fair Edge Securities (Private) Limited",
  "Fairtrade Capital Securities (Private) Limited",
  "Fairway Securities (Private) Limited",
  "Fawad Yusuf Securities (Private) Limited",
  "FDM Capital Securities (Private) Limited",
  "Fikree's (Private) Limited",
  "Fincap Investments (Private) Limited",
  "Fine Securities (SMC-Private) Limited",
  "First Capital Equities Limited",
  "First Equity Modaraba",
  "First Fidelity Leasing Modaraba",
  "First National Equities Limited",
  "First Pakistan Securities Limited",
  "First Street Capital (Private) Limited",
  "Float Securities (Private) Limited",
  "Floret Capitals (Private) Limited",
  "Fort Securities (Private) Limited",
  "Fortress Financial Services (Private) Limited",
  "Fortune Securities Limited",
  "Foundation Securities (Private) Limited",
  "Friendly Securities (Private) Limited",
  "Galaxy Capital Securities (Private) Limited",
  "Gazipura Securities & Services (Private) Limited",
  "General Investment & Securities (Private) Limited",
  "Geryon Securities (Private) Limited",
  "Ghani Osman Securities (Private) Limited",
  "Ghory's Securities (Private) Limited",
  "GM Capital Securities (Private) Limited",
  "GPH Securities (Private) Limited",
  "Grand Capital Securities (Private) Limited",
  "Growth Securities (Private) Limited",
  "Gul Dhami Securities (Private) Limited",
  "Gulrez Securities (Pvt) Limited",
  "H & H Securities (Private) Limited",
  "H.G. Markets (Private) Limited",
  "H.H.K. Securities (Pvt.) Limited",
  "Habib Metropolitan Financial Services Limited",
  "Habib Ullah Sheikh (Private) Limited",
  "Hamza Farhad Securities (Pvt) Limited",
  "HH Misbah Securities (Private) Limited",
  "High Land Securities (Private) Limited",
  "HMC Stocks (Private) Limited",
  "Horizon Securities Limited",
  "HP Securities (Private) Limited",
  "IGI Finex Securities Limited",
  "IMA Securities (Private) Limited",
  "Infinite Securities Limited",
  "Innovative Brokerage (Private) Limited",
  "Insight Securities (Private) Limited",
  "Integrated Equities Limited",
  "Interactive Securities (Private) Limited",
  "Intermarket Securities Limited",
  "Inveslink Capital (Private) Limited",
  "Investec Securities Limited",
  "Investment Managers Securities (Private) Limited",
  "Invisor Securities (Private) Limited",
  "Iqbal Usman Kodvavi Securities (Private) Limited",
  "Irfan Mazhar Securities (Private) Limited",
  "Islamabad Securities (Private) Limited",
  "Ismail Iqbal Securities (Private) Limited",
  "Javed Iqbal Securities (Private) Limited",
  "Javed Omer Vohra & Company Limited",
  "JCR Capital Securities (Private) Limited",
  "JS Global Capital Limited",
  "JSK Securities Limited",
  "K & I Global Capital (Private) Limited",
  "K.H.S. Securities (Private) Limited",
  "Kayzooe Capital Markets (SMC-Private) Limited",
  "Khanani Securities (Private) Limited",
  "Khawaja Securities (Pvt.) Ltd.",
  "Kosmopolitan Securities (Private) Limited",
  "KP Securities (Private) Limited",
  "Ktrade Securities Limited",
  "K. F. Stocks (Private) Limited",
  "M.M. Securities (Private) Limited",
  "Maan Securities (Private) Limited",
  "MAC Securities (Private) Limited",
  "MAHA Securities (Private) Limited",
  "Mahaan Capital (Private) Limited",
  "Mannoo Capital (Private) Limited",
  "Margalla Financial (Private) Limited",
  "MAS Capital Securities (Private) Limited",
  "Mayari Securities (Private) Limited",
  "Memon Securities (Private) Limited",
  "MG Securities (Private) Limited",
  "Mikon Securities (Pvt.) Ltd.",
  "Millennium Brokerage (Pvt) Limited",
  "Millennium Securities & Investment (Private) Limited",
  "Mir Shah Jahan Khetran",
  "MND Investment (Private) Limited",
  "Mohammad Munir Mohammad Ahmed Khanani Securities Limited",
  "Money Line Securities (Private) Limited",
  "Moonaco Securities (Private) Limited",
  "MRA Securities Limited",
  "MSD Capital Equities (Private) Limited",
  "MSMANIAR Financials (Private) Limited",
  "Muhammad Amer Riaz Securities (Private) Limited",
  "Muhammad Anaf Kapadia Securities (SMC-Private) Limited",
  "Muhammad Ashfaq Hussain Securities (Private) Limited",
  "Muhammad Hussain Ismail Securities (Private) Limited",
  "Muhammad Salim Kasmani Securities (Private) Limited",
  "Muhammad Tariq Moti Securities (Private) Limited",
  "Multiline Securities Limited",
  "Multiple Investment Management Ltd.",
  "N.U.A. Securities (Private) Limited",
  "Neal Capital (Private) Limited",
  "Networth Securities Limited",
  "New Peak Securities (Private) Limited",
  "Next Capital Limited",
  "Nini Securities (Private) Limited",
  "Ocean Securities Limited",
  "Optimus Capital Management (Private) Limited",
  "Orbit Securities (Private) Limited",
  "Oriental Securities (Private) Limited",
  "Onion Investments (Private) Limited",
  "OS Capital Investments (Private) Limited",
  "Pak Meezan Securities (Pvt.) Limited",
  "Pasha Securities (Private) Limited",
  "Pearl Securities Limited",
  "Pervez Ahmed Capital (Private) Limited",
  "Pine Capital Management (Private) Limited",
  "Prime Capital Management (Private) Limited",
  "Prime Securities (Private) Limited",
  "Progressive Investment Management (Private) Limited",
  "Progressive Securities (Private) Limited",
  "QF Securities (Private) Limited",
  "R. T. Securities (Private) Limited",
  "Rafi Securities (Private) Limited",
  "Rahat Securities Limited",
  "Rallys Equities (Private) Limited",
  "Reliance Capital (Private) Limited",
  "Reliance Securities Limited",
  "Riaz Ahmed Securities (Private) Limited",
  "Rich Securities (Private) Limited",
  "Royal Securities (Private) Limited",
  "RUC Securities (Private) Limited",
  "S. M. Securities (Private) Limited",
  "S. A. Securities (Private) Limited",
  "S. D. Mirza Securities (Private) Limited",
  "Saima Qaiser Securities (Private) Limited",
  "Sakarwala Capital Securities (Private) Limited",
  "Salim Sozer Securities (Private) Limited",
  "Salman Majeed Securities (Private) Limited",
  "Sattar Chinoy Securities (Private) Limited",
  "Saya Securities (Private) Limited",
  "SAZ Capital Securities (Private) Limited",
  "Sethi Securities (Private) Limited",
  "Seven Star Securities (Private) Limited",
  "Shaffi Securities (Private) Limited",
  "Shajar Capital Pakistan (Private) Limited",
  "Shajarpak Securities (Pvt.) Ltd.",
  "Sher Capital Equities (Pvt) Ltd",
  "Sherman Securities (Private) Limited",
  "SIA Equities (Private) Limited",
  "SMAC Investments (Private) Limited",
  "SNM Securities (Private) Limited",
  "SOS Capital Limited",
  "Spectrum Securities Limited",
  "Spinzer Equities (Private) Limited",
  "Standard Capital Securities (Private) Limited",
  "Stockhub Securities (Private) Limited",
  "Stockinvest Securities (Private)",
  "Stoxgean Securities (Private) Limited",
  "Strongman Securities (Pvt.) Ltd.",
  "Summit Capital (Private) Limited",
  "Sunrise Capital (Private) Limited",
  "Switch Securities (Pvt.) Limited",
  "Syed Faraz Equities (Private) Limited",
  "Syed Sarmad Maqsood Al Husainy",
  "T&G Securities (Private) Limited",
  "Tamkeen Securities (Private)",
  "Tannu Securities (Private) Limited",
  "Tariq Vohra Securities (Private) Limited",
  "Taurus Securities Limited",
  "Time Securities (Private)",
  "Titan Equities (Private)",
  "Topline Securities Limited",
  "Trade Smart Securities (Private) Limited",
  "Trust Securities & Brokerage Limited",
  "TS Securities (Private) Limited",
  "UBL Financial Services (Private) Limited",
  "Unex Securities (Private) Limited",
  "Union Securities (Private) Limited",
  "United Equities (SMC-Private) Limited",
  "Value Stock and Commodities (Private) Limited",
  "Vector Securities (Private) Limited",
  "Venus Securities (Private) Limited",
  "We Financial Services Limited",
  "Wealth Street (Private) Limited",
  "Xpert Securities Limited",
  "Y. H. Securities (Private)",
  "Yasir Mahmood Securities (Private) Limited",
  "Z M Capital (Private) Limited",
  "Z. A. Ghaffar Securities (Private) Limited",
  "Zafar Moti Capital Securities (Private) Limited",
  "Zafar Securities (Private) Limited",
  "Zahid Latif Khan Securities (Private) Limited",
  "Zillion Capital Securities (Private) Limited",
  "ZK Islamic Financial Services (Pvt) Limited",
  "Other"
];

// ... (TransferAccount type and TransferDetailsPage component remain similar until return)

// Inside TransferDetailsPage, replace usage of FieldSelect for broker with SearchableSelect:

/*
                      <SearchableSelect
                        label="Current Brokerage House *"
                        value={account.broker}
                        onChange={(v) => updateAccount(index, "broker", v)}
                        options={brokers.map(b => ({ value: b, label: b }))}
                        helper='If your broker is not listed, choose "Other".'
                        valid={!!account.broker}
                      />
*/

// Add the SearchableSelect component definition at the bottom:

import { useRef } from "react";

function SearchableSelect({
  label,
  value,
  onChange,
  options,
  helper,
  valid,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  helper?: string;
  valid?: boolean;
}) {
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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter(o => 
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedLabel = options.find(o => o.value === value)?.label || value || "Select broker";

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
        {label}
      </label>

      <button
        type="button"
        onClick={() => {
           setOpen(!open);
           setSearch(""); // Reset search on open
        }}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm text-left"
      >
        <span className={!value ? "text-slate-500" : "text-slate-900 truncate"}>
            {selectedLabel}
        </span>
        <svg className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Validation Tick */}
      {valid && !open && (
         <div className="pointer-events-none absolute right-10 top-[38px] z-10 animate-in fade-in zoom-in duration-200">
             <div className="rounded-full bg-emerald-100 p-0.5">
                 <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                     <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                 </svg>
             </div>
         </div>
      )}

      {open && (
        <div className="absolute top-[110%] left-0 z-50 w-full rounded-xl border border-slate-100 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95 duration-100 max-h-60 flex flex-col">
            <input
                autoFocus
                value={search}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="mb-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
            <div className="overflow-y-auto flex-1 custom-scrollbar">
                {filtered.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-400">No results found</div>
                ) : (
                    filtered.map((o) => (
                        <button
                            key={o.value}
                            type="button"
                            onClick={() => {
                                onChange(o.value);
                                setOpen(false);
                            }}
                            className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                                value === o.value ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-600 hover:bg-slate-50"
                            }`}
                        >
                            {o.label}
                        </button>
                    ))
                )}
            </div>
        </div>
      )}
      
      {helper ? <div className="mt-1.5 text-sm text-slate-600 font-medium">{helper}</div> : null}
    </div>
  );
}

// Re-export FieldInput and FieldSelect as previously defined...


type TransferAccount = {
  ukn: string;
  broker: string;
  otherBrokerName: string;
  acctType: "normal" | "sahulat" | "Islamic Normal" | "Sahulat Islamic" | "";
};

export default function TransferDetailsPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const kycId = sp.get("kyc_id") || "demo";

  // Support multiple accounts
  const [accounts, setAccounts] = useState<TransferAccount[]>([
    { ukn: "", broker: "", otherBrokerName: "", acctType: "" },
  ]);

  const [brokers, setBrokers] = useState<string[]>(FALLBACK_BROKERS);
  const [loadingBrokers, setLoadingBrokers] = useState(false);

  const canSubmit = useMemo(() => {
    return accounts.every((acc) => {
      const hasBroker = acc.broker && (acc.broker !== "Other" || acc.otherBrokerName.trim().length > 0);
      const hasType = !!acc.acctType;
      return hasBroker && hasType;
    });
  }, [accounts]);



  function updateAccount(index: number, field: keyof TransferAccount, value: string) {
    setAccounts((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      // Clear other broker name if broker is not "Other"
      if (field === "broker" && value !== "Other") {
        updated[index].otherBrokerName = "";
      }
      return updated;
    });
  }

  function addAccount() {
    setAccounts((prev) => [
      ...prev,
      { ukn: "", broker: "", otherBrokerName: "", acctType: "" },
    ]);
  }

  function removeAccount(index: number) {
    if (accounts.length === 1) return; // Keep at least one
    setAccounts((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      // Send all accounts
      const transferAccounts = accounts.map((acc) => ({
        ukn: acc.ukn.trim() || null,
        previous_broker: acc.broker === "Other" ? (acc.otherBrokerName.trim() || "Other") : (acc.broker || null),
        account_type: acc.acctType || null,
      }));

      await fetch(`${API_BASE}/api/transfer-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kyc_id: kycId,
          accounts: transferAccounts,
        }),
      });
    } catch {
      // ignore
    }
    router.push(`/open-account/account-mode?kyc_id=${encodeURIComponent(kycId)}&flow=transfer`);
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
            Transfer Details
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Please provide details about your existing account seamlessly.
          </p>
        </section>

        <section className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="bg-slate-50/50 border-b border-slate-100 px-8 py-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Existing Account Info</h2>
              <div className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                Optional
              </div>
            </div>

            <div className="p-8 md:p-12">
              <form onSubmit={onSubmit} className="space-y-10">
                {accounts.map((account, index) => (
                  <div key={index} className="relative">
                    {index > 0 && (
                      <div className="absolute -top-5 left-0 right-0 flex items-center gap-4">
                        <div className="flex-1 border-t border-slate-200" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Account {index + 1}
                        </span>
                        <div className="flex-1 border-t border-slate-200" />
                      </div>
                    )}

                    <div className={`space-y-8 ${index > 0 ? 'pt-8 rounded-2xl border border-slate-100 bg-slate-50/30 p-6' : ''}`}>
                      <FieldInput
                        label="UKN Number"
                        placeholder="Enter UKN (Optional)"
                        value={account.ukn}
                        onChange={(v) => updateAccount(index, "ukn", v)}
                        helper="If you don't have UKN, you can still submit."
                        required={false}
                      />

                      {index === 0 && (
                        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
                          <div className="flex gap-3">
                            <div className="text-xl">ℹ️</div>
                            <div>
                              <h4 className="text-sm font-bold text-blue-900">How to find your UKN?</h4>
                              <ul className="mt-2 list-disc pl-4 text-sm text-blue-800 space-y-1">
                                <li>Check your current broker's portal under "My Account".</li>
                                <li>Look for "Unique Key Number" on your statement.</li>
                                <li>Contact your Broker or Brokerage House.</li>
                                <li>
                                  You can use{" "}
                                  <a 
                                    href="https://play.google.com/store/apps/details?id=com.nccpl.m.uis&hl=en" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="underline font-semibold hover:text-blue-700"
                                  >
                                    NCConnect App
                                  </a>
                                  {" "}to check your UKN Number.
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}

                      <SearchableSelect
                        label="Current Brokerage House *"
                        value={account.broker}
                        onChange={(v) => updateAccount(index, "broker", v)}
                        options={brokers.map((b) => ({ value: b, label: b }))}
                        helper='If your broker is not listed, choose "Other".'
                        valid={!!account.broker}
                      />

                      {account.broker === "Other" && (
                        <div className="animate-in slide-in-from-top-2 duration-300">
                          <FieldInput
                            label="Broker Name"
                            placeholder="Enter broker name"
                            value={account.otherBrokerName}
                            onChange={(v) => updateAccount(index, "otherBrokerName", v)}
                            helper="Please specify the name of your brokerage house."
                          />
                        </div>
                      )}

                      <FieldSelect
                        label="Account Type *"
                        value={account.acctType}
                        onChange={(v) => updateAccount(index, "acctType", v as any)}
                        options={[
                          { value: "", label: "Select Type" },
                          { value: "normal", label: "Normal" },
                          { value: "sahulat", label: "Sahulat" },
                          { value: "Islamic Normal", label: "Islamic Normal" },
                          { value: "Sahulat Islamic", label: "Sahulat Islamic" },
                        ]}
                        valid={!!account.acctType}
                      />

                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => removeAccount(index)}
                          className="w-full rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 hover:border-red-300 transition-all"
                        >
                          Remove This Account
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addAccount}
                  className="w-full rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/50 px-4 py-4 text-sm font-bold text-blue-700 hover:bg-blue-100 hover:border-blue-400 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Another Account for Transfer
                </button>

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full rounded-2xl bg-slate-900 text-white font-bold py-4 text-sm tracking-wide hover:bg-slate-800 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all shadow-xl shadow-slate-200"
                >
                  Confirm & Continue
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

function FieldInput({
  label,
  placeholder,
  value,
  onChange,
  helper,
  required,
  valid,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  helper?: string;
  required?: boolean;
  valid?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
        {label}
      </label>
      <div className="relative">
        <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
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
      {helper ? <div className="mt-1.5 text-sm text-slate-600 font-medium">{helper}</div> : null}
    </div>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
  helper,
  valid,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  helper?: string;
  valid?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm"
        >
          {options.map((o) => (
            <option key={`${o.value}-${o.label}`} value={o.value}>
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
      {helper ? <div className="mt-1.5 text-sm text-slate-600 font-medium">{helper}</div> : null}
    </div>
  );
}
