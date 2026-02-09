"use client";

import { useEffect } from "react";
import { subscribeToAuctionBids } from "@/lib/auctions/realtime";

export function useRealtimeAuction(auctionId: string, onRefresh: () => void) {
  useEffect(() => {
    if (!auctionId) {
      return;
    }

    const { unsubscribe } = subscribeToAuctionBids(auctionId, onRefresh);
    return () => {
      unsubscribe();
    };
  }, [auctionId, onRefresh]);
}
