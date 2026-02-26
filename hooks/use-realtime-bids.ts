"use client";

import { useEffect, useRef } from "react";
import { subscribeToAuctionBids } from "@/lib/auctions/realtime";

type RealtimeAuctionOptions = {
  enabled?: boolean;
  pollIntervalMs?: number;
  minRefreshGapMs?: number;
};

export function useRealtimeAuction(
  auctionId: string,
  onRefresh: () => void,
  options: RealtimeAuctionOptions = {},
) {
  const { enabled = true, pollIntervalMs = 3000, minRefreshGapMs = 750 } = options;
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!auctionId || !enabled) {
      return;
    }

    let isActive = true;
    let lastRefreshAt = 0;
    let trailingRefreshTimer: ReturnType<typeof setTimeout> | null = null;

    const triggerRefresh = () => {
      if (!isActive) {
        return;
      }

      const now = Date.now();
      const msUntilNextAllowed = minRefreshGapMs - (now - lastRefreshAt);

      if (msUntilNextAllowed <= 0) {
        lastRefreshAt = now;
        onRefreshRef.current();
        return;
      }

      if (trailingRefreshTimer) {
        return;
      }

      trailingRefreshTimer = setTimeout(() => {
        trailingRefreshTimer = null;

        if (!isActive) {
          return;
        }

        lastRefreshAt = Date.now();
        onRefreshRef.current();
      }, msUntilNextAllowed);
    };

    const { unsubscribe } = subscribeToAuctionBids(auctionId, triggerRefresh);
    const pollTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        triggerRefresh();
      }
    }, pollIntervalMs);

    const handleWindowFocus = () => {
      triggerRefresh();
    };

    window.addEventListener("focus", handleWindowFocus);

    return () => {
      isActive = false;
      window.removeEventListener("focus", handleWindowFocus);
      clearInterval(pollTimer);

      if (trailingRefreshTimer) {
        clearTimeout(trailingRefreshTimer);
      }

      unsubscribe();
    };
  }, [auctionId, enabled, minRefreshGapMs, pollIntervalMs]);
}
