"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useRealtimeAuction } from "@/hooks/use-realtime-bids";
import { BidHistory } from "@/components/auctions/bid-history";
import { PlaceBidForm } from "@/components/auctions/place-bid-form";

type BidRow = {
  id: string;
  amount: number;
  created_at: string;
  bidder_name: string;
  bidder_id: string;
};

export function AuctionLiveSection({
  auctionId,
  status,
  currentPrice,
  minIncrement,
  serverNow,
  endTime,
  canBid,
  isWinning,
  bids,
  currentUserId,
  isAuthenticated = false,
  bidPricingMode,
  animalCount,
  isWaitingForPrevious,
  currentAutoBidMax,
}: {
  auctionId: string;
  status: "upcoming" | "live" | "ended";
  currentPrice: number;
  minIncrement: number;
  serverNow: string;
  endTime: string;
  canBid: boolean;
  isWinning: boolean;
  bids: BidRow[];
  currentUserId?: string;
  isAuthenticated?: boolean;
  bidPricingMode?: "lot_total" | "per_head";
  animalCount?: number;
  isWaitingForPrevious?: boolean;
  currentAutoBidMax?: number | null;
}) {
  const router = useRouter();

  const handleRefresh = useCallback(() => {
    router.refresh();
  }, [router]);

  useRealtimeAuction(auctionId, handleRefresh);

  return (
    <div className="space-y-6">
      <PlaceBidForm
        auctionId={auctionId}
        status={status}
        currentPrice={currentPrice}
        minIncrement={minIncrement}
        serverNow={serverNow}
        endTime={endTime}
        canBid={canBid}
        isWinning={isWinning}
        isAuthenticated={isAuthenticated}
        bidPricingMode={bidPricingMode}
        animalCount={animalCount}
        isWaitingForPrevious={isWaitingForPrevious}
        currentAutoBidMax={currentAutoBidMax}
      />
      <div className="space-y-3 rounded-3xl border border-brand-100 bg-white/95 p-5 shadow-sm shadow-brand-100/40 dark:border-brand-900/40 dark:bg-slate-900/90">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Bid history</h3>
        <BidHistory bids={bids} currentUserId={currentUserId} />
      </div>
    </div>
  );
}
