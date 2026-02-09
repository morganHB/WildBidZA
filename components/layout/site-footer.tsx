import Link from "next/link";
import { Facebook, Instagram, PawPrint, Twitter } from "lucide-react";
import { APP_NAME } from "@/lib/constants/app";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-emerald-900/30 bg-slate-950 py-16 text-slate-300">
      <div className="mx-auto w-full max-w-7xl space-y-10 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="inline-flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-900/50">
              <PawPrint className="h-5 w-5" />
            </span>
            <span className="text-3xl font-semibold tracking-tight text-white">{APP_NAME}</span>
          </div>
          <p className="max-w-xl text-sm text-slate-400">
            The premier platform for high-value animal auctions with transparent real-time bidding in South Africa.
          </p>
          <div className="flex items-center gap-5">
            <a href="#" aria-label="Instagram" className="text-slate-400 transition hover:text-white">
              <Instagram className="h-5 w-5" />
            </a>
            <a href="#" aria-label="Facebook" className="text-slate-400 transition hover:text-white">
              <Facebook className="h-5 w-5" />
            </a>
            <a href="#" aria-label="Twitter" className="text-slate-400 transition hover:text-white">
              <Twitter className="h-5 w-5" />
            </a>
          </div>
        </div>
        <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-7 text-sm text-slate-500 sm:flex-row">
          <p>(c) {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link href="/how-it-works" className="hover:text-white">
              How it works
            </Link>
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/contact" className="hover:text-white">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
