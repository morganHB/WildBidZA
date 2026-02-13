"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
  bidPricingMode?: "lot_total" | "per_head";
  animalCount?: number;
  isWaitingForPrevious?: boolean;
  currentAutoBidMax?: number | null;
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
  bidPricingMode = "lot_total",
  animalCount = 1,
  isWaitingForPrevious = false,
  currentAutoBidMax = null,
}: BidPanelProps) {
  const router = useRouter();
  const { formatted, isEnded } = useServerCountdown(endTime, serverNow);
  const [amount, setAmount] = useState<number>(currentPrice + minIncrement);
  const [autoBidMax, setAutoBidMax] = useState<number>(
    currentAutoBidMax ?? currentPrice + minIncrement,
  );
  const [autoBidSaving, setAutoBidSaving] = useState(false);
  const [autoBidClearing, setAutoBidClearing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const quickValues = useMemo(
    () => [currentPrice + minIncrement],
    [currentPrice, minIncrement],
  );
  const isPerHead = bidPricingMode === "per_head";
  const nextBidTotal = (currentPrice + minIncrement) * Math.max(1, animalCount);
  const isBidDisabled = !canBid || status !== "live" || isEnded || isWaitingForPrevious || submitting;
  const minimumAutoBid = currentPrice + minIncrement;
  const canManageAutoBid = !isBidDisabled;

  useEffect(() => {
    setAutoBidMax(currentAutoBidMax ?? currentPrice + minIncrement);
  }, [currentAutoBidMax, currentPrice, minIncrement]);

  const submitBid = async () => {
    if (!canBid) {
      toast.error("You are not approved to bid yet");
      return;
    }

    if (isWaitingForPrevious) {
      toast.error("This packet is waiting for the previous packet to close");
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

  const saveAutoBid = async () => {
    if (!canBid) {
      toast.error("You are not approved to bid yet");
      return;
    }

    if (autoBidMax < minimumAutoBid) {
      toast.error(`Max auto-bid must be at least ${formatZar(minimumAutoBid)}`);
      return;
    }

    setAutoBidSaving(true);

    try {
      const response = await fetch(`/api/auctions/${auctionId}/auto-bid`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ max_amount: autoBidMax }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Failed to save auto-bid");
      }

      toast.success("Auto-bid saved");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save auto-bid");
    } finally {
      setAutoBidSaving(false);
    }
  };

  const disableAutoBid = async () => {
    setAutoBidClearing(true);

    try {
      const response = await fetch(`/api/auctions/${auctionId}/auto-bid`, {
        method: "DELETE",
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Failed to disable auto-bid");
      }

      toast.success("Auto-bid disabled");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to disable auto-bid");
    } finally {
      setAutoBidClearing(false);
    }
  };

  return (
    <div className="space-y-4 rounded-3xl border border-brand-100 bg-white/95 p-5 shadow-sm shadow-brand-100/40 dark:border-brand-900/40 dark:bg-slate-900/90">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          {isPerHead ? "Current bid / head" : "Current bid"}
        </p>
        <p className="text-3xl font-semibold tracking-tight">{formatZar(currentPrice)}</p>
        {isPerHead ? (
          <p className="text-xs text-slate-500">
            Total for packet ({animalCount} head): {formatZar(currentPrice * Math.max(1, animalCount))}
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-950">
        <p className="text-xs uppercase tracking-wide text-slate-500">Ends</p>
        <p className="mt-1 font-semibold">{formatted}</p>
        <p className="mt-1 text-xs text-slate-500">{formatAuctionDateLong(endTime)}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bid-amount">
          {isPerHead ? "Your bid per head (ZAR)" : "Your bid (ZAR)"}
        </Label>
        <Input
          id="bid-amount"
          type="number"
          min={currentPrice + minIncrement}
          step={minIncrement}
          value={amount}
          onChange={(event) => setAmount(Number(event.target.value))}
          disabled={isBidDisabled}
        />
        <p className="text-xs text-slate-500">
          Minimum next bid: {formatZar(currentPrice + minIncrement)}
          {isPerHead ? ` per head (total ${formatZar(nextBidTotal)})` : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {quickValues.map((value) => (
          <Button
            key={value}
            type="button"
            variant="secondary"
            onClick={() => setAmount(value)}
            disabled={isBidDisabled}
          >
            +1x increment ({formatZar(value)})
          </Button>
        ))}
      </div>

      <Button className="h-11 w-full rounded-xl text-base font-semibold" onClick={submitBid} disabled={isBidDisabled}>
        {submitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
        Place bid
      </Button>

      <div className="space-y-2 rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
        <p className="text-xs uppercase tracking-wide text-slate-500">Auto-bid</p>
        <p className="text-xs text-slate-500">
          Set your max amount and WildBidZA will auto-bid by one increment when you are outbid.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
          <Input
            type="number"
            min={minimumAutoBid}
            step={minIncrement}
            value={autoBidMax}
            onChange={(event) => setAutoBidMax(Number(event.target.value))}
            disabled={!canManageAutoBid || autoBidSaving || autoBidClearing}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={saveAutoBid}
            disabled={!canManageAutoBid || autoBidSaving || autoBidClearing}
          >
            {autoBidSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save max
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={disableAutoBid}
            disabled={!currentAutoBidMax || autoBidSaving || autoBidClearing}
          >
            {autoBidClearing ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
            Disable
          </Button>
        </div>
        <p className="text-xs text-slate-500">
          Minimum auto-bid max now: {formatZar(minimumAutoBid)}
          {currentAutoBidMax ? ` · Active max: ${formatZar(currentAutoBidMax)}` : ""}
        </p>
      </div>

      <p className="text-sm text-slate-500">
        {isWaitingForPrevious
          ? "This packet will open after the previous packet closes."
          : isWinning
            ? "You are currently winning"
            : "Live bids update instantly"}
      </p>
    </div>
  );
}
