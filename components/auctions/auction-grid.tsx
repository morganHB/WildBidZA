import { AuctionCard, type AuctionCardData } from "@/components/auctions/auction-card";

export function AuctionGrid({ auctions }: { auctions: AuctionCardData[] }) {
  if (auctions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700">
        No auctions matched your filters.
      </div>
    );
  }

  return (
    <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
      {auctions.map((auction) => (
        <AuctionCard key={auction.id} auction={auction} />
      ))}
    </div>
  );
}
