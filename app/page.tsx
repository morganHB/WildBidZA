import Link from "next/link";
import { ArrowRight, Gavel, ShieldCheck, Sparkles, Timer } from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { AuctionGrid } from "@/components/auctions/auction-grid";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants/app";
import { getAuctions } from "@/lib/auctions/queries";
import { formatZar } from "@/lib/utils/currency";

const highlights = [
  {
    icon: Gavel,
    title: "Realtime bidding",
    description: "Live bid streams with server-side validation and anti-sniping protection.",
  },
  {
    icon: ShieldCheck,
    title: "Verified access",
    description: "Approval flow for bidders and sellers with strict role-based permissions.",
  },
  {
    icon: Timer,
    title: "Time-zone accurate",
    description: "All listings and countdowns are aligned to Africa/Johannesburg.",
  },
];

export default async function HomePage() {
  const featured = await getAuctions({ status: "live", sort: "ending_soon", limit: 6 });

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50/60 via-white to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden pb-12 pt-14 sm:pb-16 lg:pt-20">
          <div className="pointer-events-none absolute left-0 top-0 h-60 w-60 -translate-x-1/3 rounded-full bg-brand-200/70 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 translate-x-1/4 rounded-full bg-brand-300/40 blur-3xl" />
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.2fr_0.9fr] lg:px-8">
            <div className="space-y-7">
              <p className="inline-flex items-center rounded-full border border-brand-200 bg-white/85 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700 shadow-sm">
                South Africa - Premium animal auctions
              </p>
              <h1 className="text-balance text-5xl font-semibold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl dark:text-white">
                Ethical Auctions for{" "}
                <span className="bg-gradient-to-r from-brand-500 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
                  Exceptional Animals
                </span>
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                {APP_NAME} is a premium marketplace for verified livestock and game animal listings, built for clean,
                transparent, real-time bidding.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="rounded-2xl px-8">
                  <Link href="/sign-up">
                    Explore live listings <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-2xl px-8">
                  <Link href="/seller/create">List an animal</Link>
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {highlights.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="rounded-2xl border border-brand-100 bg-white/85 p-4 shadow-sm shadow-brand-100/40 backdrop-blur dark:border-brand-900/50 dark:bg-slate-900/70"
                    >
                      <Icon className="h-4 w-4 text-brand-600" />
                      <p className="mt-2 text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-300">{item.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-[2rem] border border-brand-100 bg-white/90 p-6 shadow-2xl shadow-brand-200/40 backdrop-blur dark:border-brand-900/40 dark:bg-slate-900/80 dark:shadow-none">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Featured live auctions</h2>
                  <p className="text-sm text-slate-500">Updated in real time</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-700">
                  <Sparkles className="h-3 w-3" />
                  Live now
                </span>
              </div>
              <div className="mt-5 space-y-3">
                {featured.slice(0, 4).map((auction) => (
                  <Link
                    key={auction.id}
                    href={`/auctions/${auction.id}`}
                    className="block rounded-2xl border border-slate-200/90 bg-white p-4 transition hover:border-brand-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:hover:border-brand-700"
                  >
                    <p className="line-clamp-1 font-semibold">{auction.title}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                      <span>Current {formatZar(auction.current_price)}</span>
                      <span>Ends {new Date(auction.end_time).toLocaleString("en-ZA")}</span>
                    </div>
                  </Link>
                ))}
                {featured.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-brand-200 p-4 text-sm text-slate-500 dark:border-brand-900/50 dark:text-slate-300">
                    No live auctions yet. Check upcoming listings.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
          <form action="/auctions" className="rounded-3xl border border-brand-100 bg-white/95 p-4 shadow-sm dark:border-brand-900/40 dark:bg-slate-900">
            <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
              <input
                type="text"
                name="q"
                placeholder="Search breeds, species..."
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none ring-brand-500 transition focus:ring-2 dark:border-slate-800 dark:bg-slate-950"
              />
              <select
                name="status"
                defaultValue="all"
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none ring-brand-500 transition focus:ring-2 dark:border-slate-800 dark:bg-slate-950"
              >
                <option value="all">All statuses</option>
                <option value="live">Live</option>
                <option value="upcoming">Upcoming</option>
                <option value="ended">Past</option>
              </select>
              <select
                name="sort"
                defaultValue="ending_soon"
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none ring-brand-500 transition focus:ring-2 dark:border-slate-800 dark:bg-slate-950"
              >
                <option value="ending_soon">Sort by: Ending soon</option>
                <option value="newest">Sort by: Newest</option>
                <option value="highest_price">Sort by: Highest price</option>
              </select>
              <Button type="submit" className="h-12 rounded-2xl px-6">
                Search
              </Button>
            </div>
          </form>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">Live Auctions</h2>
              <p className="mt-1 text-sm text-slate-500">Bid in real time on approved listings across South Africa.</p>
            </div>
            <Button asChild variant="ghost" className="text-brand-700 hover:text-brand-800 dark:text-brand-300 dark:hover:text-brand-200">
              <Link href="/auctions/live">View all</Link>
            </Button>
          </div>
          <AuctionGrid auctions={featured} />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
