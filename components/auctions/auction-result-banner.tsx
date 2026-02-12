import Link from "next/link";
import { CheckCircle2, Gavel, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AuctionResultBanner({
  isEnded,
  hasWinner,
  winnerName,
  isCurrentUserWinner,
  canOpenDealChat,
  auctionId,
}: {
  isEnded: boolean;
  hasWinner: boolean;
  winnerName: string | null;
  isCurrentUserWinner: boolean;
  canOpenDealChat: boolean;
  auctionId: string;
}) {
  if (!isEnded) {
    return null;
  }

  if (hasWinner && isCurrentUserWinner) {
    return (
      <div className="auction-result-banner auction-result-banner--winner rounded-2xl border p-4 text-sm shadow-sm">
        <div className="flex items-center gap-2 font-semibold">
          <Trophy className="h-4 w-4" />
          You won this auction
        </div>
        <p className="mt-2 text-slate-700 dark:text-slate-200">
          Congratulations. Finalize payment and collection details in the deal chat.
        </p>
        {canOpenDealChat ? (
          <Button asChild size="sm" className="mt-3 rounded-lg">
            <Link href={`/deals/${auctionId}`}>Open deal chat</Link>
          </Button>
        ) : null}
      </div>
    );
  }

  if (hasWinner) {
    return (
      <div className="auction-result-banner auction-result-banner--ended rounded-2xl border p-4 text-sm shadow-sm">
        <div className="flex items-center gap-2 font-semibold">
          <CheckCircle2 className="h-4 w-4" />
          Auction closed
        </div>
        <p className="mt-2 text-slate-700 dark:text-slate-200">Winner: {winnerName ?? "Winner"}.</p>
        {canOpenDealChat ? (
          <Button asChild variant="outline" size="sm" className="mt-3 rounded-lg">
            <Link href={`/deals/${auctionId}`}>Open deal chat</Link>
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="auction-result-banner auction-result-banner--neutral rounded-2xl border p-4 text-sm shadow-sm">
      <div className="flex items-center gap-2 font-semibold">
        <Gavel className="h-4 w-4" />
        Auction ended
      </div>
      <p className="mt-2 text-slate-700 dark:text-slate-200">
        This auction closed without a winning bid.
      </p>
    </div>
  );
}
