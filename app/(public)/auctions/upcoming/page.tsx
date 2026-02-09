import { AuctionGrid } from "@/components/auctions/auction-grid";
import { getAuctions } from "@/lib/auctions/queries";

export default async function UpcomingAuctionsPage() {
  const auctions = await getAuctions({ status: "upcoming", sort: "ending_soon", limit: 48 });

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-semibold tracking-tight">Upcoming Auctions</h1>
      <p className="mb-6 mt-2 text-sm text-slate-500">Plan ahead and add auctions to your watchlist.</p>
      <AuctionGrid auctions={auctions as any} />
    </main>
  );
}
