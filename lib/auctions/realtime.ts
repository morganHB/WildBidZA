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

export function subscribeToLivestreamSignals(
  sessionId: string,
  userId: string,
  onSignal: (signal: {
    id: string;
    session_id: string;
    from_user_id: string;
    to_user_id: string;
    signal_type: "offer" | "answer" | "ice_candidate" | "leave";
    payload: unknown;
    created_at: string;
  }) => void,
) {
  const supabase = createSupabaseBrowserClient();

  const channel = supabase
    .channel(`livestream:${sessionId}:signals:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "auction_livestream_signals",
        filter: `session_id=eq.${sessionId}`,
      },
      (event: { new: unknown }) => {
        const row = event.new as {
          id: string;
          session_id: string;
          from_user_id: string;
          to_user_id: string;
          signal_type: "offer" | "answer" | "ice_candidate" | "leave";
          payload: unknown;
          created_at: string;
        };

        if (row.to_user_id === userId) {
          onSignal(row);
        }
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

export function subscribeToLivestreamSession(auctionId: string, onEvent: () => void) {
  const supabase = createSupabaseBrowserClient();

  const channel = supabase
    .channel(`livestream:${auctionId}:session`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "auction_livestream_sessions",
        filter: `auction_id=eq.${auctionId}`,
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
