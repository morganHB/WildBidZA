import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuctions } from "@/lib/auctions/queries";
import { AuctionGrid } from "@/components/auctions/auction-grid";
import { LiveLotGrid } from "@/components/auctions/live-lot-grid";

export default async function LiveAuctionsPage() {
  const [supabase, liveAuctions, upcomingAuctions, pastAuctions] = await Promise.all([
    createSupabaseServerClient(),
    getAuctions({ status: "live", sort: "ending_soon", limit: 48 }),
    getAuctions({ status: "upcoming", sort: "ending_soon", limit: 24 }),
    getAuctions({ status: "ended", sort: "newest", limit: 24 }),
  ]);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="animate-in min-h-screen bg-white pb-32">
      <section className="relative overflow-hidden px-6 pb-20 pt-28 text-center">
        <div className="pointer-events-none absolute right-10 top-16 text-[12rem] font-black uppercase italic tracking-tighter text-stone-100 md:text-[22rem]">
          WAR ROOM
        </div>
        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <div className="mb-8 flex items-center justify-center gap-4">
            <div className="h-[2px] w-12 bg-red-700" />
            <span className="text-xs font-black uppercase tracking-[0.38em] text-red-700">Live Interaction</span>
          </div>
          <h1 className="mb-8 text-5xl font-black uppercase italic leading-[0.85] tracking-tighter text-stone-900 md:text-[10rem]">
            Active <br /> <span className="text-red-700">Lots.</span>
          </h1>
          <p className="text-xl font-bold uppercase italic tracking-tight text-stone-400 underline decoration-amber-500 decoration-4 underline-offset-8 md:text-2xl">
            The Livestock Marketplace.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#live-now"
              className="rounded-full bg-red-700 px-5 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-white"
            >
              Live Now
            </a>
            <a
              href="#upcoming"
              className="rounded-full border border-stone-300 bg-white px-5 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-stone-700"
            >
              Upcoming
            </a>
            <a
              href="#past"
              className="rounded-full border border-stone-300 bg-white px-5 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-stone-700"
            >
              Past
            </a>
          </div>
        </div>
      </section>

      <section id="live-now" className="bg-stone-50 px-6 py-20">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-8">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-red-700">Live Now</p>
            <h2 className="mt-3 text-4xl font-black uppercase italic tracking-tighter text-stone-900 md:text-6xl">
              Active Auction Lots
            </h2>
          </div>
          <LiveLotGrid auctions={liveAuctions as any} isAuthenticated={Boolean(user)} />
        </div>
      </section>

      <section id="upcoming" className="bg-white px-6 py-20">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-8">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-red-700">Upcoming</p>
            <h2 className="mt-3 text-4xl font-black uppercase italic tracking-tighter text-stone-900 md:text-6xl">
              Next Auction Lots
            </h2>
          </div>
          <AuctionGrid auctions={upcomingAuctions as any} />
        </div>
      </section>

      <section id="past" className="bg-stone-50 px-6 py-20">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-8">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-red-700">Past</p>
            <h2 className="mt-3 text-4xl font-black uppercase italic tracking-tighter text-stone-900 md:text-6xl">
              Completed Auction Lots
            </h2>
          </div>
          <AuctionGrid auctions={pastAuctions as any} />
        </div>
      </section>
    </main>
  );
}
