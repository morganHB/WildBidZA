import Link from "next/link";
import { ArrowRight, Gavel, Radio } from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function HomePage() {
  return (
    <div className="liba-public min-h-screen bg-white text-stone-900">
      <SiteHeader />
      <main className="animate-in">
        <section className="relative h-[74vh] w-full overflow-hidden bg-black">
          <div className="absolute inset-0">
            <div className="absolute inset-0 z-10 bg-stone-900/30" />
            <video autoPlay loop muted playsInline className="h-full w-full object-cover">
              <source src="/herovideo.mp4" type="video/mp4" />
            </video>
          </div>
          <div className="absolute inset-x-0 bottom-16 z-20 mx-auto w-full max-w-7xl px-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-black/25 px-4 py-2 text-[10px] font-black uppercase tracking-[0.35em] text-white backdrop-blur">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              The Livestock Marketplace
            </p>
            <h1 className="mt-5 max-w-4xl text-4xl font-black uppercase italic leading-[0.9] tracking-tighter text-white md:text-7xl">
              Trade Trusted Livestock
              <span className="block text-red-600">Live. Direct. Proven.</span>
            </h1>
          </div>
        </section>

        <section className="relative overflow-hidden bg-white px-6 py-32 text-center">
          <div className="mx-auto max-w-5xl">
            <h2 className="relative text-4xl font-black uppercase italic leading-tight tracking-tighter md:text-7xl">
              <span className="absolute inset-0 text-stone-200/70">
                Liba auctioneers is an auction house in the heart of the Vaalharts
              </span>
              <span className="relative bg-gradient-to-r from-stone-500 via-amber-200 to-stone-500 bg-[length:200%_auto] bg-clip-text text-transparent animate-shimmer">
                Liba auctioneers is an auction house in the heart of the Vaalharts
              </span>
            </h2>
            <div className="mt-14 flex items-center justify-center gap-5">
              <span className="h-1.5 w-1.5 rounded-full bg-red-700" />
              <span className="text-[11px] font-black uppercase tracking-[0.55em] text-amber-900">Experience Heritage</span>
              <span className="h-1.5 w-1.5 rounded-full bg-red-700" />
            </div>
          </div>
        </section>

        <section className="px-6 pb-32">
          <div className="mx-auto grid w-full max-w-7xl gap-8 md:grid-cols-2">
            <Link
              href="/auctions/live"
              className="liba-card-lift group relative overflow-hidden rounded-[3rem] bg-stone-900 p-12 text-left text-white shadow-2xl"
            >
              <div className="relative z-10">
                <Radio className="mb-6 text-red-600" size={40} />
                <h3 className="mb-4 text-5xl font-black uppercase italic tracking-tighter">Bid Live</h3>
                <p className="font-medium text-stone-300">Join the active room and secure your stock.</p>
              </div>
              <div className="absolute bottom-[-10%] right-[-5%] text-[15rem] font-black uppercase italic text-white/[0.04]">
                LIVE
              </div>
            </Link>
            <Link
              href="/auctions"
              className="liba-card-lift group relative overflow-hidden rounded-[3rem] border-2 border-stone-100 bg-white p-12 text-left text-stone-900 shadow-sm"
            >
              <div className="relative z-10">
                <Gavel className="mb-6 text-amber-700" size={40} />
                <h3 className="mb-4 text-5xl font-black uppercase italic tracking-tighter">Auctions</h3>
                <p className="font-medium text-stone-500">Explore the hub and our hybrid trade model.</p>
              </div>
              <div className="absolute bottom-[-10%] right-[-5%] text-[15rem] font-black uppercase italic text-stone-900/[0.03]">
                HUB
              </div>
            </Link>
          </div>

          <div className="mx-auto mt-16 flex w-full max-w-7xl justify-center md:justify-end">
            <Link
              href="/about-us"
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.35em] text-red-700 transition hover:text-stone-900"
            >
              Learn About LIBA <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
