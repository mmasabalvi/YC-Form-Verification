"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function AssistancePage() {
  const router = useRouter();
  const sp = useSearchParams();
  
  const kycId = sp.get("kyc_id") || "demo";

  // Selection state: null | 'self' | 'agent'
  const [selection, setSelection] = useState<"self" | "agent" | null>(null);

  // Callback form state
  const [showCallbackModal, setShowCallbackModal] = useState(false);
  const [cbName, setCbName] = useState("");
  const [cbMobile, setCbMobile] = useState("");
  const [cbEmail, setCbEmail] = useState("");
  const [cbTime, setCbTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleCallbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const resp = await fetch("/api/request-callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cbName,
          mobile: cbMobile,
          email: cbEmail,
          preferred_time: cbTime
        })
      });
      if (resp.ok) {
        setSuccess(true);
      } else {
        alert("Submission failed. Please try again.");
      }
    } catch (err) {
      alert("Error submitting callback request.");
    } finally {
      setSubmitting(false);
    }
  };

  // This would be the actual CGP form URL
  const CGP_LINK = "/cgp-form"; 
  // WhatsApp number for "Assisted" flow
  const AGENT_WHATSAPP = "https://wa.me/923344388820"; 
  // Helpline
  const HELPLINE = "+92 3344388820";

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

        <section className="relative z-10 mx-auto max-w-4xl px-6 pt-20 pb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
            Select Your Path
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            How would you like to open your account today?
          </p>
        </section>

        <section className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6">
          
          {/* Step 1: Selection */}
          {!selection && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SelectionCard
                    title="I want to open myself"
                    desc="Fill the form yourself. We are available if you get stuck."
                    icon="📝"
                    onClick={() => setSelection("self")}
                />
                <SelectionCard
                    title="I want YC Team to help"
                    desc="Connect with an agent who will guide you through the process."
                    icon="🙋‍♂️"
                    onClick={() => setSelection("agent")}
                />
              </div>
          )}

          {/* Step 2: Self Service Flow */}
          {selection === "self" && (
            <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 overflow-hidden">
                    <div className="bg-slate-50/50 border-b border-slate-100 px-8 py-6">
                        <button 
                            onClick={() => setSelection(null)}
                            className="text-sm font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-2 mb-4"
                        >
                            ← Back
                        </button>
                        <h2 className="text-2xl font-bold text-slate-900">Self-Service Account Opening</h2>
                    </div>
                    
                    <div className="p-8 space-y-8">
                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
                            <p className="text-blue-900 leading-relaxed font-medium">
                                You will now be redirected to the CGP Form. If you face any issues while adding details, please connect with our Customer Experience Representative through any channel below.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 text-center">Support Channels</h3>
                            <div className="flex flex-col items-center gap-4">
                                <a 
                                    href={AGENT_WHATSAPP}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600/10 px-6 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-600/20 transition-all border border-emerald-200/50"
                                >
                                    <span className="text-sm">💬</span> Chat on WhatsApp
                                </a>
                                
                                <div className="flex flex-col items-center gap-2">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Or call our helpline</div>
                                    <a 
                                        href={`tel:${HELPLINE.replace(/[^0-9+]/g, '')}`}
                                        className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-6 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-all border border-slate-200/50 font-mono"
                                    >
                                        📞 {HELPLINE}
                                    </a>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => router.push(`${CGP_LINK}?kyc_id=${kycId}`)} // In real app, this goes to CGP form
                            className="w-full rounded-2xl bg-slate-900 text-white font-bold py-4 text-sm tracking-wide hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all hover:-translate-y-0.5"
                        >
                            CONTINUE TO Account Opening Form →
                        </button>
                    </div>
                </div>
            </div>
          )}

          {/* Step 3: Agent Assisted Flow */}
          {selection === "agent" && (
            <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 overflow-hidden">
                    <div className="bg-slate-50/50 border-b border-slate-100 px-8 py-6">
                        <button 
                            onClick={() => setSelection(null)}
                            className="text-sm font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-2 mb-4"
                        >
                            ← Back
                        </button>
                        <h2 className="text-2xl font-bold text-slate-900">Agent Assisted Opening</h2>
                    </div>
                    
                    <div className="p-8 space-y-4">
                        {/* Option 1: WhatsApp */}
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6">
                            <h3 className="text-emerald-900 font-bold mb-1 flex items-center gap-2">
                                <span className="text-lg">💬</span> Connect on WhatsApp
                            </h3>
                            <p className="text-emerald-800 text-sm mb-4 leading-relaxed">
                                Fastest way to get help. Chat directly with our representative who will guide you.
                            </p>
                            <a 
                                href={AGENT_WHATSAPP}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                            >
                                CHAT ON WHATSAPP →
                            </a>
                        </div>

                        <div className="flex items-center gap-4 px-4">
                            <div className="h-px flex-1 bg-slate-200"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white px-2">OR</span>
                            <div className="h-px flex-1 bg-slate-200"></div>
                        </div>

                        {/* Option 2: Callback */}
                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
                            <h3 className="text-blue-900 font-bold mb-1 flex items-center gap-2">
                                <span className="text-lg">↩️</span> Request a Callback
                            </h3>
                            <p className="text-blue-800 text-sm mb-4 leading-relaxed">
                                Leave your details and we&apos;ll call you back at your preferred convenience to assist you.
                            </p>
                            <button 
                                onClick={() => setShowCallbackModal(true)}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                            >
                                REQUEST CALLBACK →
                            </button>
                        </div>

                        <div className="flex items-center gap-4 px-4">
                            <div className="h-px flex-1 bg-slate-200"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white px-2">OR</span>
                            <div className="h-px flex-1 bg-slate-200"></div>
                        </div>

                        {/* Option 3: Helpline */}
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                            <h3 className="text-slate-900 font-bold mb-1 flex items-center gap-2">
                                <span className="text-lg">📞</span> Call Our Helpline
                            </h3>
                            <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                                Prefer speaking over the phone? Dial our helpline to talk to a representative directly.
                            </p>
                            <a 
                                href={`tel:${HELPLINE.replace(/[^0-9+]/g, '')}`}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-bold text-white hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                            >
                                CALL {HELPLINE} →
                            </a>
                        </div>
                    </div>
                </div>
            </div>
          )}

        </section>
      </main>

      {/* Callback Modal */}
      {showCallbackModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
              {!success ? (
                <>
                  <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="text-xl font-bold text-slate-900">Request Callback</h3>
                      <button 
                        onClick={() => setShowCallbackModal(false)}
                        className="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                  </div>
                  <form onSubmit={handleCallbackSubmit} className="p-8 space-y-6">
                      <div className="space-y-4">
                        <ModalInput
                          label="Full Name"
                          value={cbName}
                          onChange={setCbName}
                          placeholder="Your official name"
                          required
                        />
                        <ModalInput
                          label="Mobile Number"
                          value={cbMobile}
                          onChange={setCbMobile}
                          placeholder="0300 1234567"
                          required
                        />
                        <ModalInput
                          label="Email Address"
                          type="email"
                          value={cbEmail}
                          onChange={setCbEmail}
                          placeholder="email@example.com"
                          required
                        />
                        <ModalInput
                          label="Preferred Time for Callback"
                          type="datetime-local"
                          value={cbTime}
                          onChange={setCbTime}
                          placeholder="Select date and time"
                          required
                        />
                      </div>
                      
                      <button
                        type="submit"
                        disabled={submitting || !cbName || !cbMobile || !cbEmail || !cbTime}
                        className="w-full rounded-2xl bg-slate-900 text-white font-bold py-4 text-sm tracking-wide hover:bg-slate-800 disabled:opacity-50 transition-all shadow-xl shadow-slate-200"
                      >
                        {submitting ? "SUBMITTING..." : "CONFIRM CALLBACK REQUEST →"}
                      </button>
                  </form>
                </>
              ) : (
                <div className="p-10 text-center space-y-6">
                    <div className="text-6xl mx-auto mb-4">✅</div>
                    <h3 className="text-2xl font-bold text-slate-900">Request Received!</h3>
                    <p className="text-slate-600">
                        Thank you <strong>{cbName}</strong>. Our team will contact you at <strong>{new Date(cbTime).toLocaleString([], { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</strong> on your provided mobile number.
                    </p>
                    <button
                        onClick={() => {
                          setShowCallbackModal(false);
                          setSuccess(false);
                          setCbName("");
                          setCbMobile("");
                          setCbEmail("");
                          setCbTime("");
                        }}
                        className="w-full rounded-2xl bg-blue-600 text-white font-bold py-4 text-sm tracking-wide hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all"
                    >
                        Great, Thanks!
                    </button>
                </div>
              )}
           </div>
        </div>
      )}

      <Footer />
    </>
  );
}

function SelectionCard({
  title,
  desc,
  icon,
  onClick,
}: {
  title: string;
  desc: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative text-left rounded-3xl border border-slate-200 bg-white p-8 transition-all duration-300 w-full hover:shadow-xl hover:-translate-y-1 hover:border-blue-300"
    >
      <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-3xl transition-colors group-hover:bg-blue-50 group-hover:border-blue-100 group-hover:text-blue-600">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-slate-500">
        {desc}
      </p>
    </button>
  );
}

function SocialLink({ label, icon, href }: { label: string; icon: string; href: string }) {
    return (
        <a 
            href={href}
            className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-200 transition-all"
        >
            <span className="text-xl">{icon}</span>
            <span className="text-xs font-bold text-slate-700">{label}</span>
        </a>
    )
}

function ModalInput({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-base text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
      />
    </div>
  );
}
