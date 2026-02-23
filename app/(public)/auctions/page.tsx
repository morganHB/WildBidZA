import Link from "next/link";
import { ArrowRight, Image as ImageIcon, MonitorPlay, Radio, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuctionsPage() {

  return (
    <main className="liba-page-shell animate-in bg-white pb-28">
      <section className="relative overflow-hidden px-6 pb-28 pt-24">
        <div className="pointer-events-none absolute right-8 top-14 whitespace-nowrap text-[14rem] font-black uppercase italic tracking-tighter text-stone-100 md:text-[24rem]">
          MARKET
        </div>
        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <div className="mb-10 flex items-center gap-6">
            <div className="h-1 w-24 bg-red-700" />
            <span className="text-sm font-black uppercase tracking-[0.5em] text-red-700">Official Auction Hub</span>
          </div>
          <h1 className="mb-12 text-6xl font-black uppercase italic leading-[0.85] tracking-tighter text-stone-900 md:text-[10rem]">
            The Livestock <br /> <span className="text-red-700">Marketplace.</span>
          </h1>
          <p className="text-xl font-bold uppercase italic tracking-tight text-stone-400 underline decoration-amber-500 decoration-4 underline-offset-8 md:text-3xl">
            Trusted Trade, Proven Results.
          </p>
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-stone-100 bg-stone-50 px-6 py-24">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-16 lg:grid-cols-2">
          <div className="relative rounded-[5rem] border border-white/10 bg-stone-950 p-12 text-white shadow-[0_48px_90px_-25px_rgba(0,0,0,0.45)]">
            <div className="mb-12 flex items-center gap-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-red-700 shadow-xl">
                <Radio className="h-8 w-8 animate-pulse" />
              </div>
              <span className="text-xs font-black uppercase tracking-[0.45em] text-red-500">Dual Connection</span>
            </div>
            <h2 className="mb-10 text-5xl font-black uppercase italic leading-[0.88] tracking-tighter md:text-7xl">
              Experience <br /> <span className="text-red-600">The Handshake</span> <br /> Anywhere.
            </h2>
            <p className="mb-12 text-xl font-medium leading-relaxed text-stone-300">
              We hold physical, in-person auctions that also take place online. Secure your stock from anywhere with
              a professional live stream broadcast from our various auction sites.
            </p>
            <Button asChild className="h-14 w-full rounded-[2rem] bg-red-700 text-xs font-black uppercase tracking-[0.35em] hover:bg-amber-500 hover:text-stone-900">
              <Link href="/auctions/live">
                Go To Live Bidding <MonitorPlay className="ml-3 h-6 w-6" />
              </Link>
            </Button>
          </div>

          <div className="rounded-[4rem] border-[6px] border-dashed border-stone-300 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] bg-stone-100 text-stone-500">
              <ImageIcon className="h-12 w-12" />
            </div>
            <h3 className="mt-8 text-3xl font-black uppercase italic tracking-tighter text-stone-900 md:text-5xl">
              Add Section Photo 01
            </h3>
            <p className="mt-4 text-sm font-bold uppercase tracking-[0.3em] text-stone-500">Image Placeholder</p>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-white px-6 py-24">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-16 lg:grid-cols-2">
          <div className="space-y-10">
            <h3 className="text-5xl font-black uppercase italic leading-[0.88] tracking-tighter text-stone-900 md:text-8xl">
              Physical Presence.
              <br />
              <span className="text-red-700">Digital Precision.</span>
            </h3>
            <div className="relative rounded-[4rem] bg-amber-700 p-12 shadow-2xl">
              <p className="text-2xl font-medium italic leading-relaxed text-white md:text-4xl">
                Users can have a great experience bidding online and connect via the live stream to see the different
                lots in real-time.
              </p>
              <div className="absolute -left-5 -top-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-stone-900 text-red-600 shadow-xl">
                <Video className="h-8 w-8" />
              </div>
            </div>
            <p className="max-w-2xl border-l-[10px] border-red-700 pl-10 text-xl font-medium italic leading-relaxed text-stone-500 md:text-2xl">
              LIBA Auctioneers brings the heartbeat of our different auction locations directly to your device,
              ensuring complete transparency and trade efficiency.
            </p>
          </div>

          <div className="rounded-[4rem] border-[6px] border-dashed border-stone-300 bg-stone-50 p-12 text-center shadow-sm">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] bg-white text-stone-500 shadow-sm">
              <ImageIcon className="h-12 w-12" />
            </div>
            <h3 className="mt-8 text-3xl font-black uppercase italic tracking-tighter text-stone-900 md:text-5xl">
              Add Section Photo 02
            </h3>
            <p className="mt-4 text-sm font-bold uppercase tracking-[0.3em] text-stone-500">Image Placeholder</p>
          </div>
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto w-full max-w-7xl rounded-[3rem] border border-stone-200 bg-white p-10 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.4)] md:p-14">
          <p className="text-xs font-black uppercase tracking-[0.5em] text-red-700">Information Hub</p>
          <h2 className="mt-5 text-4xl font-black uppercase italic tracking-tighter text-stone-900 md:text-6xl">
            Auctions Overview
          </h2>
          <p className="mt-6 max-w-4xl text-lg leading-relaxed text-stone-600 md:text-xl">
            This section is for auction information only. To view and interact with live, upcoming, and past auction
            lots, use the Live Now section.
          </p>
          <div className="mt-10">
            <Link
              href="/auctions/live"
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.32em] text-red-700 transition hover:text-stone-900"
            >
              Open Live Now <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
