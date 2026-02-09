"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useServerCountdown } from "@/hooks/use-server-time";
import { formatAuctionDateLong } from "@/lib/utils/datetime";
import { formatZar } from "@/lib/utils/currency";

type BidPanelProps = {
  auctionId: string;
  status: "upcoming" | "live" | "ended";
  currentPrice: number;
  minIncrement: number;
  serverNow: string;
  endTime: string;
  canBid: boolean;
  isWinning: boolean;
};

export function PlaceBidForm({
  auctionId,
  status,
  currentPrice,
  minIncrement,
  serverNow,
  endTime,
  canBid,
  isWinning,
}: BidPanelProps) {
  const router = useRouter();
  const { formatted, isEnded } = useServerCountdown(endTime, serverNow);
  const [amount, setAmount] = useState<number>(currentPrice + minIncrement);
  const [submitting, setSubmitting] = useState(false);

  const quickValues = useMemo(
    () => [currentPrice + minIncrement, currentPrice + minIncrement * 2],
    [currentPrice, minIncrement],
  );

  const submitBid = async () => {
    if (!canBid) {
      toast.error("You are not approved to bid yet");
      return;
    }

    if (status !== "live" || isEnded) {
      toast.error("Auction is not currently live");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/auctions/${auctionId}/bids`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Bid failed");
      }

      toast.success("Bid placed successfully");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to place bid");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 rounded-3xl border border-brand-100 bg-white/95 p-5 shadow-sm shadow-brand-100/40 dark:border-brand-900/40 dark:bg-slate-900/90">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-slate-500">Current bid</p>
        <p className="text-3xl font-semibold tracking-tight">{formatZar(currentPrice)}</p>
      </div>

      <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-950">
        <p className="text-xs uppercase tracking-wide text-slate-500">Ends</p>
        <p className="mt-1 font-semibold">{formatted}</p>
        <p className="mt-1 text-xs text-slate-500">{formatAuctionDateLong(endTime)}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bid-amount">Your bid (ZAR)</Label>
        <Input
          id="bid-amount"
          type="number"
          min={currentPrice + minIncrement}
          step={minIncrement}
          value={amount}
          onChange={(event) => setAmount(Number(event.target.value))}
          disabled={!canBid || status !== "live" || isEnded || submitting}
        />
        <p className="text-xs text-slate-500">Minimum next bid: {formatZar(currentPrice + minIncrement)}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {quickValues.map((value, index) => (
          <Button
            key={value}
            type="button"
            variant="secondary"
            onClick={() => setAmount(value)}
            disabled={!canBid || status !== "live" || isEnded}
          >
            +{index + 1}x increment ({formatZar(value)})
          </Button>
        ))}
      </div>

      <Button className="h-11 w-full rounded-xl text-base font-semibold" onClick={submitBid} disabled={!canBid || status !== "live" || isEnded || submitting}>
        {submitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
        Place bid
      </Button>

      <p className="text-sm text-slate-500">{isWinning ? "You are currently winning" : "Live bids update instantly"}</p>
    </div>
  );
}
