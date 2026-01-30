"use client";

import Link from "next/link";
import { useState } from "react";
import AuthModal from "./AuthModal";

export default function Navbar() {
  const [openAuth, setOpenAuth] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-800/40 bg-black/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-gradient-to-br from-emerald-400 to-blue-500" />
            <div className="leading-tight">
              <div className="text-lg font-semibold text-white">Youngs Capital</div>
              <div className="text-xs text-slate-300">Financial Consultant</div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpenAuth(true)}
              className="text-sm font-medium text-white hover:text-slate-200"
            >
              Sign In
            </button>

            <Link
              href="/open-account"
              className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
            >
              Open Account
            </Link>
          </div>
        </div>
      </header>

      <AuthModal open={openAuth} onClose={() => setOpenAuth(false)} />
    </>
  );
}
