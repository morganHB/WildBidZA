import { ScrollArea } from "@/components/ui/scroll-area";
import { formatAuctionDateLong, relativeFromNow } from "@/lib/utils/datetime";
import { formatZar } from "@/lib/utils/currency";

type BidRow = {
  id: string;
  amount: number;
  created_at: string;
  bidder_name: string;
  bidder_id: string;
};

export function BidHistory({ bids, currentUserId }: { bids: BidRow[]; currentUserId?: string }) {
  if (!bids.length) {
    return <p className="text-sm text-slate-500">No bids placed yet.</p>;
  }

  return (
    <ScrollArea className="h-[360px] pr-4">
      <div className="space-y-3">
        {bids.map((bid) => (
          <div key={bid.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium">
                {bid.bidder_name}
                {currentUserId === bid.bidder_id ? " (you)" : ""}
              </p>
              <p className="text-sm font-semibold">{formatZar(bid.amount)}</p>
            </div>
            <p className="mt-1 text-xs text-slate-500" title={formatAuctionDateLong(bid.created_at)}>
              {relativeFromNow(bid.created_at)}
            </p>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
