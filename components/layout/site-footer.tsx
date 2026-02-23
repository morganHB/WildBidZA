import Link from "next/link";
import Image from "next/image";
import { ChevronRight, ExternalLink, Mail, MapPin, Phone } from "lucide-react";
import { APP_NAME } from "@/lib/constants/app";

const footerLinks = [
  { href: "/", label: "Home" },
  { href: "/about-us", label: "About Us" },
  { href: "/auctions", label: "Auctions" },
  { href: "/auctions/live", label: "Bid Live" },
  { href: "/kraal-bookings", label: "Kraal Bookings" },
  { href: "/contact", label: "Contact" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-stone-800 bg-stone-950 px-6 pb-12 pt-24 text-white">
      <div className="pointer-events-none absolute bottom-[-6%] left-0 right-0 flex justify-center overflow-hidden">
        <p className="text-[18rem] font-black uppercase italic tracking-tighter text-white/[0.03]">LIBA</p>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <div className="mb-20 grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-6">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="relative h-11 w-11 overflow-hidden rounded-xl border border-white/15">
                <Image src="/liba/logo.webp" alt="LIBA logo" fill sizes="44px" className="object-cover" />
              </span>
              <span className="text-3xl font-black uppercase italic tracking-tighter">
                {APP_NAME.split(" ")[0]}
                <span className="text-red-700">.</span>
              </span>
            </Link>
            <p className="max-w-xs text-sm font-medium leading-relaxed text-stone-400">
              The premier livestock auction house in the heart of Vaalharts with trusted on-site and online trading.
            </p>
          </div>

          <div>
            <h3 className="mb-6 text-[11px] font-black uppercase tracking-[0.35em] text-red-700">Navigation</h3>
            <div className="grid gap-2">
              {footerLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-stone-300 transition hover:text-amber-300"
                >
                  <ChevronRight className="h-3 w-3 translate-x-0 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-6 text-[11px] font-black uppercase tracking-[0.35em] text-red-700">Direct Access</h3>
            <div className="space-y-5 text-xs font-bold text-stone-300">
              <p className="inline-flex items-center gap-3">
                <Phone className="h-4 w-4 text-amber-400" />
                <a href="tel:+27828193380" className="transition hover:text-amber-300">
                  082 819 3380
                </a>
              </p>
              <p className="inline-flex items-center gap-3">
                <Phone className="h-4 w-4 text-amber-400" />
                <a href="tel:+27724320860" className="transition hover:text-amber-300">
                  072 432 0860
                </a>
              </p>
              <p className="inline-flex items-center gap-3">
                <Mail className="h-4 w-4 text-amber-400" />
                <a href="mailto:sales@liba.co.za" className="underline decoration-amber-500 underline-offset-4 transition hover:text-amber-300">
                  sales@liba.co.za
                </a>
              </p>
              <p>
                <a
                  href="https://www.kraal2kraal.co.za"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-stone-300 transition hover:text-amber-300"
                >
                  kraal2kraal.co.za <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-stone-900/70 p-7">
            <h3 className="mb-6 text-[11px] font-black uppercase tracking-[0.35em] text-red-700">Head Office</h3>
            <p className="inline-flex items-start gap-3 text-xs font-bold leading-relaxed text-stone-300">
              <MapPin className="mt-0.5 h-4 w-4 text-amber-400" />
              100 DF Malan Street
              <br />
              Hartswater, 8570
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-8 text-[10px] font-black uppercase tracking-[0.3em] text-stone-400 md:flex-row md:items-center">
          <p>The Livestock Marketplace © {new Date().getFullYear()} LIBA Auctioneers.</p>
          <p>Trusted trade. Proven outcomes.</p>
        </div>
      </div>
    </footer>
  );
}
