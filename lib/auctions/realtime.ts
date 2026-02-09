import type { RealtimeChannel } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function subscribeToAuctionBids(
  auctionId: string,
  onEvent: () => void,
): { channel: RealtimeChannel; unsubscribe: () => void } {
  const supabase = createSupabaseBrowserClient();

  const channel = supabase
    .channel(`auction:${auctionId}:bids`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "bids",
        filter: `auction_id=eq.${auctionId}`,
      },
      () => {
        onEvent();
      },
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "auctions",
        filter: `id=eq.${auctionId}`,
      },
      () => {
        onEvent();
      },
    )
    .subscribe();

  return {
    channel,
    unsubscribe: () => {
      void supabase.removeChannel(channel);
    },
  };
}

export function subscribeToNotifications(userId: string, onEvent: () => void) {
  const supabase = createSupabaseBrowserClient();

  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      () => {
        onEvent();
      },
    )
    .subscribe();

  return {
    channel,
    unsubscribe: () => {
      void supabase.removeChannel(channel);
    },
  };
}
