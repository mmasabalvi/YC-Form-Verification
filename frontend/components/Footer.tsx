export default function Footer() {
  return (
    <footer className="bg-black text-slate-300">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="text-lg font-semibold text-white">Young&apos;s Capital</div>
            <p className="mt-3 text-sm text-slate-400">
              Empowering young entrepreneurs with the capital and resources they need to succeed.
            </p>
          </div>

          <div>
            <div className="font-semibold text-white">Quick Links</div>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li>Home</li>
              <li>Investor Trainings</li>
              <li>Services</li>
              <li>Contact</li>
            </ul>
          </div>

          <div>
            <div className="font-semibold text-white">Services</div>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li>Account Management</li>
              <li>Portfolio Management</li>
              <li>Dedicated Analyst</li>
              <li>Expert Sessions</li>
            </ul>
          </div>

          <div>
            <div className="font-semibold text-white">Contact Us</div>
            <div className="mt-3 space-y-2 text-sm text-slate-400">
              <div>Email: youngscapitalconsultant@gmail.com</div>
              <div>Phone: +923344388820</div>
              <div>
                Address: Office No 11, First Floor Mall of Lahore, Cant Lahore, Pakistan
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-800 pt-6 text-xs text-slate-500">
          © 2026 Young&apos;s Capital. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
