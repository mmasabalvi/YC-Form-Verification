"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useState } from "react";

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [language, setLanguage] = useState<"en" | "ur">("en");

  const faqs_en = [
    {
      question: "How can I open an account with Youngs Capital?",
      answer: (
        <>
            Youngs Capital has a robust website <a href="https://www.youngscapital.pk" target="_blank" className="text-blue-600 hover:underline">www.youngscapital.pk</a>. You can visit the website and click on the "Open Account" button <a href="https://www.youngscapital.pk/brokage-house" target="_blank" className="text-blue-600 hover:underline">here</a>, or you can reach us through our WhatsApp number or customer experience helpline number.
        </>
      ),
    },
    {
      question: "What types of Accounts does Youngs Capital offer?",
      answer: (
        <>
          <p className="mb-2">Youngs Capital offers a variety of accounts based upon customer needs, for instance:</p>
          <ul className="list-decimal ps-5 space-y-1">
            <li>Normal</li>
            <li>Sahulat</li>
            <li>Al Hidayah (Shariah Compliant)</li>
            <li>Minor</li>
            <li>RDA - Overseas</li>
          </ul>
        </>
      ),
    },
    {
      question: "What documents are mandatory required for account opening with Youngs Capital?",
      answer: (
        <>
           <ol className="list-decimal ps-5 space-y-2">
            <li>Original CNIC/POC/NICOP clear front and back image.</li>
            <li>
                Proof of Income:
                <ul className="list-disc ps-5 mt-1 text-sm text-slate-500">
                    <li><strong>Salaried:</strong> Signed & Stamped Salary Certificate or employment letter with salary mentioned.</li>
                    <li><strong>Business:</strong> Confirmation on business letterhead regarding business status as per the template.</li>
                </ul>
            </li>
            <li>Image of Signature on a plain white paper as per CNIC.</li>
            <li>Zakat Declaration form on e-stamp paper in case customer wants to pay his Zakat by himself (template available).</li>
           </ol>
        </>
      ),
    },
    {
       question: "What Formats are acceptable for account opening documents?",
       answer: "For CNIC, Income Proof, Digital Signatures, and Permanent/Mailing Address, JPEG/PNG formats are required. For the Zakat Declaration, PDF format is required with a size not exceeding 600KB.",
    },
    {
       question: "What if my permanent address is different from my CNIC address?",
       answer: "The customer needs to upload a utility bill confirming their new address.",
    },
    {
       question: "What if I want my mailing address to be different from my permanent address?",
       answer: "The customer needs to upload a utility bill confirming their mailing address.",
    },
    {
       question: "Do I need to perform biometric verification? If yes, then how will I do it?",
       answer: (
        <>
            You need to download the <strong>&quot;CDC Access&quot;</strong> app on your mobile phone. After entering your CNIC, you will be asked to place your left hand palm below the mobile phone camera for a successful scan and biometric verification.
        </>
       )
    },
    {
       question: "What other measures should I adopt while uploading the documents?",
       answer: "File names should ideally contain the customer name, for example: 'Yasir- Zakat Form' or 'Yasir-CNIC Front' etc.",
    },
    {
       question: "Do I need to add nominee details also?",
       answer: "It is optional. In case you want to add a nominee, you need to upload their original CNIC front & back images in JPEG/PNG format.",
    },
    {
       question: "What optional documents do I need to open an account?",
       answer: (
        <>
          <p className="mb-2">The customer must have the following documents available if applicable:</p>
           <ul className="list-decimal ps-5 space-y-1">
            <li>Bank Statement</li>
            <li>IBAN Proof (Image of cheque book leaf / Account maintenance certificate / Bank statement reflecting name and IBAN)</li>
           </ul>
        </>
       )
    },
    {
       question: "What is the typical activation time for a trading account after all documents and biometrics are complete?",
       answer: "The account is usually active within 24 to 48 hours, following NCCPL verification.",
    },
    {
       question: "How can individuals without salary slips, such as students or retirees, open a standard trading account?",
       answer: "By providing a valid 'Source of Funds' declaration, such as savings proof or a support letter.",
    },
    {
       question: "What type of account allows Non-Resident Pakistanis (NRPs) to invest in the PSX from abroad?",
       answer: "A Roshan Digital Account (RDA) with the 'Capital Market' investment option selected.",
    },
    {
       question: "What is the purpose of adding a nominee to a trading account?",
       answer: "It ensures the seamless transfer of assets in case of the account holder's demise, as per SECP succession rules.",
    },
    {
       question: "Can I transfer my account from a brokerage house to Youngs Capital Brokerage?",
       answer: (
        <>
            Yes, it is a very simple process. You only need to know about your UKN number which can be acquired from your broker, trade statement, or from the app <strong>NC Connect</strong>.
        </>
       )
    },
    {
       question: "Will my shares also get transferred to my new account with Youngs Capital?",
       answer: "Yes, your shares will be transferred to Youngs Capital within 12 to 48 hours.",
    },
    {
       question: "Do I need additional documents to transfer my account?",
       answer: (
        <>
           <p className="mb-2">You will need the same documents which you have previously shared with your last broker:</p>
           <ol className="list-decimal ps-5 space-y-2">
            <li>Original CNIC/POC/NICOP clear front and back image.</li>
             <li>
                Proof of Income:
                <ul className="list-disc ps-5 mt-1 text-sm text-slate-500">
                    <li><strong>Salaried:</strong> Signed & Stamped Salary Certificate or employment letter with salary mentioned.</li>
                    <li><strong>Business:</strong> Confirmation on business letterhead regarding business status as per the template.</li>
                </ul>
            </li>
            <li>Image of Signature on a plain white paper as per CNIC.</li>
            <li>Zakat Declaration form on e-stamp paper in case customer wants to pay his Zakat by himself.</li>
           </ol>
        </>
      ),
    },
    {
       question: "What is a valid form of income proof for a student who receives a stipend?",
       answer: "A Student ID card along with a bank statement showing the stipend credit, or a 'Parents Support Letter'.",
    },
    {
       question: "Which Account is designed for beginners, requiring only a CNIC and having lower trading limits?",
       answer: "Sahulat Account.",
    },
    {
       question: "Does Youngs Capital offer a Pure Islamic Trading Account?",
       answer: "Yes, Youngs Capital offers the Al-Hidayah account which is purely based on Shariah-compliant stocks.",
    },
    {
       question: "Can I open a Minor account?",
       answer: "Yes, you can open a minor account. Along with your details, you have to provide the child's B-Form or Juvenile card issued by NADRA.",
    },
    {
       question: "Is there any limit on deposit or trade on a normal account?",
       answer: "No, you can trade as per your account balance available with Youngs Capital.",
    },
    {
       question: "I don't have a mobile SIM in my name. Can I use a mobile SIM in my family member's name?",
       answer: "Preferably, the mobile SIM should be in your name. However, you can still use a mobile SIM in another family member's name by providing an undertaking.",
    },
  ];

  const faqs_ur = [
    {
      question: "میں ینگس کیپیٹل میں اکاؤنٹ کیسے کھول سکتا/سکتی ہوں؟",
      answer: (
        <>
          ینگس کیپیٹل کی ویب سائٹ{" "}
          <a
            href="https://www.youngscapital.pk"
            target="_blank"
            className="text-blue-600 hover:underline"
          >
            www.youngscapital.pk
          </a>{" "}
          پر جائیں اور <strong>“Open Account”</strong> بٹن پر کلک کریں:{" "}
          <a
            href="https://www.youngscapital.pk/brokage-house"
            target="_blank"
            className="text-blue-600 hover:underline"
          >
            یہاں
          </a>
          ۔ آپ ہمارے <strong>WhatsApp نمبر</strong> یا{" "}
          <strong>Customer Experience Helpline</strong> کے ذریعے بھی رابطہ کر سکتے ہیں۔
        </>
      ),
    },
    {
      question: "ینگس کیپیٹل میں کون کون سے اکاؤنٹس دستیاب ہیں؟",
      answer: (
        <>
          <p className="mb-2">صارف کی ضرورت کے مطابق مختلف اکاؤنٹس دستیاب ہیں، مثلاً:</p>
          <ul className="list-disc ps-5 space-y-1">
            <li>نارمل (Normal)</li>
            <li>سہولت (Sahulat)</li>
            <li>الہدایہ (Al Hidayah)</li>
            <li>مائنر/کم عمر (Minor)</li>
            <li>RDA – اوورسیز (RDA – Overseas)</li>
          </ul>
        </>
      ),
    },
    {
      question: "ینگس کیپیٹل میں اکاؤنٹ کھلوانے کے لیے کون سے لازمی دستاویزات درکار ہیں؟",
      answer: (
        <>
          <ol className="list-decimal ps-5 space-y-2">
            <li>اصل <strong>CNIC/POC/NICOP</strong> کی واضح فرنٹ اور بیک تصویر</li>
            <li>
              <strong>آمدن کا ثبوت (Proof of Income)</strong>:
              <ul className="list-disc ps-5 mt-1 text-sm text-slate-500">
                <li>
                  <strong>ملازمت پیشہ کے لیے:</strong> دستخط شدہ و مُہر شدہ{" "}
                  <strong>Salary Certificate/Employment Letter</strong> جس میں تنخواہ لکھی ہو
                </li>
                <li>
                  <strong>کاروباری فرد کے لیے:</strong> اپنے{" "}
                  <strong>Business Letterhead</strong> پر کاروبار کی حیثیت/اسٹیٹس کی تصدیق
                  (ٹیمپلیٹ کے مطابق)
                </li>
              </ul>
            </li>
            <li>سفید کاغذ پر <strong>دستخط</strong> کی تصویر (CNIC کے مطابق)</li>
            <li>
              اگر صارف خود زکوٰۃ ادا کرنا چاہے تو <strong>Zakat Declaration Form</strong> ای-اسٹامپ
              پیپر پر (ٹیمپلیٹ دستیاب)
            </li>
          </ol>
        </>
      ),
    },
    {
      question: "اکاؤنٹ اوپننگ دستاویزات کے لیے کون سے فارمیٹس قابلِ قبول ہیں؟",
      answer:
        "CNIC، انکم پروف، ڈیجیٹل دستخط، پرمننٹ/میلنگ ایڈریس کے لیے JPEG/PNG فارمیٹ درکار ہے۔ جبکہ زکوٰۃ ڈاکیومنٹ کے لیے PDF فارمیٹ ہونا چاہیے (فائل سائز 600KB سے زیادہ نہ ہو)۔",
    },
    {
      question: "اگر میرا مستقل پتہ (Permanent Address) CNIC والے پتے سے مختلف ہو تو کیا کریں؟",
      answer: "نئے مستقل پتے کی تصدیق کے لیے Utility Bill اپلوڈ کریں۔",
    },
    {
      question: "اگر میں چاہوں کہ میرا میلنگ ایڈریس (Mailing Address) مستقل پتے سے مختلف ہو تو کیا کریں؟",
      answer: "میلنگ ایڈریس کی تصدیق کے لیے Utility Bill اپلوڈ کریں۔",
    },
    {
      question: "کیا بائیومیٹرک کرنا ضروری ہے؟ اگر ہاں تو کیسے ہوگا؟",
      answer: (
        <>
          جی ہاں۔ موبائل پر <strong>“CDC Access”</strong> ایپ ڈاؤن لوڈ کریں۔ CNIC درج کرنے کے بعد
          کامیاب اسکین/بائیومیٹرک کے لیے آپ کو کہا جائے گا کہ{" "}
          <strong>اپنے بائیں ہاتھ کی ہتھیلی</strong> موبائل فون کیمرہ کے نیچے رکھیں۔
        </>
      ),
    },
    {
      question: "دستاویزات اپلوڈ کرتے وقت کون سی احتیاطی تدابیر اپنانا ضروری ہیں؟",
      answer:
        "فائل کا نام صارف کے نام کے ساتھ ہونا چاہیے، مثلاً: Yasir-Zakat Form یا Yasir-CNIC Front وغیرہ۔",
    },
    {
      question: "کیا نومینی (Nominee) کی تفصیلات بھی لازمی ہیں؟",
      answer:
        "یہ اختیاری ہے۔ اگر آپ نومینی شامل کرنا چاہیں تو نومینی کے اصل CNIC کی فرنٹ اور بیک تصویر JPEG/PNG میں اپلوڈ کریں۔",
    },
    {
      question: "اکاؤنٹ کھلوانے کے لیے کون سی اختیاری دستاویزات درکار ہو سکتی ہیں؟",
      answer: (
        <>
          <ol className="list-decimal ps-5 space-y-2">
            <li><strong>Bank Statement</strong></li>
            <li>
              <strong>IBAN Proof</strong>: چیک بک کے لیف کی تصویر / اکاؤنٹ مینٹیننس سرٹیفکیٹ / ایسا
              بینک اسٹیٹمنٹ جس میں <strong>نام اور IBAN</strong> واضح ہو
            </li>
          </ol>
        </>
      ),
    },
    {
      question: "تمام دستاویزات اور بائیومیٹرک مکمل ہونے کے بعد ٹریڈنگ اکاؤنٹ عام طور پر کتنے وقت میں ایکٹو ہوتا ہے؟",
      answer:
        "عموماً NCCPL ویریفیکیشن کے بعد اکاؤنٹ 24 سے 48 گھنٹے میں ایکٹو ہو جاتا ہے۔",
    },
    {
      question: "اگر کسی کے پاس سیلری سلپس نہ ہوں (مثلاً طالب علم یا ریٹائرڈ) تو کیا وہ اسٹینڈرڈ ٹریڈنگ اکاؤنٹ کھول سکتے ہیں؟",
      answer:
        "جی ہاں، ایک درست Source of Funds ڈیکلیئریشن دے کر (مثلاً سیونگز/بچت یا سپورٹ لیٹر)۔",
    },
    {
      question: "بیرونِ ملک رہنے والے پاکستانی (NRPs) بیرونِ ملک سے PSX میں سرمایہ کاری کے لیے کون سا اکاؤنٹ کھول سکتے ہیں؟",
      answer:
        "Roshan Digital Account (RDA) جس میں “Capital Market” سرمایہ کاری آپشن منتخب کیا گیا ہو۔",
    },
    {
      question: "ٹریڈنگ اکاؤنٹ میں نومینی شامل کرنے کا مقصد کیا ہے؟",
      answer:
        "اکاؤنٹ ہولڈر کے انتقال کی صورت میں SECP کے جانشینی (Succession) قواعد کے مطابق اثاثوں کی آسان منتقلی یقینی بنانا۔",
    },
    {
      question: "کیا میں اپنا اکاؤنٹ کسی دوسرے بروکریج ہاؤس سے ینگس کیپیٹل بروکریج میں ٹرانسفر کر سکتا/سکتی ہوں؟",
      answer: (
        <>
          جی ہاں، یہ ایک سادہ عمل ہے۔ آپ کو اپنا <strong>UIN نمبر</strong> معلوم ہونا چاہیے جو
          آپ کو اپنے بروکر، ٹریڈ اسٹیٹمنٹ، یا{" "}
          <strong>NCCPL کی ایپ “UIN Connect”</strong> سے مل سکتا۔
        </>
      ),
    },
    {
      question: "کیا میرے شیئرز بھی نئے ینگس کیپیٹل اکاؤنٹ میں ٹرانسفر ہو جائیں گے؟",
      answer: "جی ہاں، آپ کے شیئرز عموماً 12 سے 48 گھنٹے میں ینگس کیپیٹل میں ٹرانسفر ہو جاتے ہیں۔",
    },
    {
      question: "اکاؤنٹ ٹرانسفر کے لیے کیا اضافی دستاویزات درکار ہیں؟",
      answer: (
        <>
          <p className="mb-2">عموماً وہی دستاویزات جو آپ نے پچھلے بروکر کو دی تھیں، مثلاً:</p>
          <ol className="list-decimal ps-5 space-y-2">
            <li>اصل <strong>CNIC/POC/NICOP</strong> کی واضح فرنٹ اور بیک تصویر</li>
            <li><strong>Proof of Income</strong> (ملازمت/کاروبار کے مطابق)</li>
            <li>سفید کاغذ پر <strong>دستخط</strong> کی تصویر (CNIC کے مطابق)</li>
            <li>
              اگر خود زکوٰۃ ادا کرنی ہو تو <strong>Zakat Declaration Form</strong> ای-اسٹامپ پر
              (ٹیمپلیٹ دستیاب)
            </li>
          </ol>
        </>
      ),
    },
    {
      question: "اسٹائپینڈ لینے والے طالب علم کے لیے انکم پروف کا درست طریقہ کیا ہے؟",
      answer:
        "Student ID Card کے ساتھ ایسا Bank Statement جس میں اسٹائپینڈ کی رقم کریڈٹ دکھ رہی ہو، یا پھر Parents’ Support Letter۔",
    },
    {
      question: "کون سا اکاؤنٹ ابتدائی صارفین کے لیے ہے جس میں صرف CNIC درکار ہو اور ٹریڈنگ لمٹس کم ہوں؟",
      answer: "سہولت اکاؤنٹ (Sahulat Account)",
    },
    {
      question: "کیا ینگس کیپیٹل خالص اسلامی (Pure Islamic) ٹریڈنگ اکاؤنٹ فراہم کرتا ہے؟",
      answer: "جی ہاں، ینگس کیپیٹل کا Al-Hidayah اکاؤنٹ موجود ہے جو مکمل طور پر شریعہ کمپلائنٹ اسٹاکس پر مبنی ہے۔",
    },
    {
      question: "کیا میں مائنر (Minor) اکاؤنٹ کھول سکتا/سکتی ہوں؟",
      answer: "جی ہاں، مائنر اکاؤنٹ کھولا جا سکتا ہے۔ اس کے لیے آپ کی تفصیلات کے ساتھ بچے کا B-Form یا NADRA کا Juvenile Card درکار ہوگا۔",
    },
    {
      question: "کیا نارمل اکاؤنٹ میں ڈپازٹ یا ٹریڈ کی کوئی حد (Limit) ہے؟",
      answer: "نہیں، آپ اپنے ینگس کیپیٹل اکاؤنٹ میں دستیاب بیلنس کے مطابق ٹریڈ کر سکتے ہیں۔",
    },
    {
      question: "اگر میرے نام پر موبائل سم نہ ہو تو کیا میں فیملی ممبر کے نام والی سم استعمال کر سکتا/سکتی ہوں؟",
      answer: "بہتر یہ ہے کہ موبائل سم آپ کے اپنے نام پر ہو۔ تاہم آپ undertaking دے کر فیملی ممبر کے نام والی سم بھی استعمال کر سکتے ہیں۔",
    },
  ];

  const currentFaqs = language === "en" ? faqs_en : faqs_ur;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-900 sm:text-5xl leading-tight">
              Frequently Asked Questions
            </h1>
            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
              Common questions about opening an account, trading, and our services at Youngs Capital.
            </p>
          </div>

          <div className="flex justify-center gap-4 py-2">
            <div className="inline-flex p-1 bg-slate-200/50 rounded-xl ring-1 ring-slate-900/5 shadow-inner">
              <button
                onClick={() => setLanguage("en")}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                  language === "en"
                    ? "bg-white text-blue-600 shadow-md transform scale-105"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLanguage("ur")}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                  language === "ur"
                    ? "bg-white text-emerald-600 shadow-md transform scale-105"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                اردو
              </button>
            </div>
          </div>

          <div 
            className="space-y-4" 
            style={{ direction: language === "ur" ? "rtl" : "ltr" }}
          >
            {currentFaqs.map((faq, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5 transition-all hover:shadow-md"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="flex w-full items-center justify-between px-6 py-5 text-left focus:outline-none group"
                  style={{ textAlign: language === "ur" ? "right" : "left" }}
                >
                  <span className={`text-lg font-medium text-slate-900 group-hover:text-blue-700 transition-colors leading-snug ${language === "ur" ? 'font-urdu text-xl' : ''}`}>
                    {faq.question}
                  </span>
                  <span className={`ml-6 flex h-8 w-8 min-w-[2rem] items-center justify-center rounded-full border border-slate-200 bg-slate-50 group-hover:border-blue-200 group-hover:bg-blue-50 transition-colors ${language === "ur" ? 'mr-6 ml-0' : ''}`}>
                    <svg
                      className={`h-4 w-4 transform text-slate-500 transition-transform duration-200 ${
                        openIndex === index ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </span>
                </button>
                <div
                  className={`px-6 text-slate-600 transition-all duration-300 ease-in-out ${
                    openIndex === index
                      ? "max-h-[1000px] pb-6 opacity-100"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  <div className={`prose prose-slate prose-lg max-w-none border-t border-slate-100 pt-4 leading-relaxed font-normal ${language === "ur" ? 'text-right' : ''}`}>
                    {faq.answer}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
