"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PlayCircle, Radio } from "lucide-react";
import { subscribeToLivestreamSession } from "@/lib/auctions/realtime";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LivestreamViewerModal } from "@/components/auctions/livestream-viewer-modal";

type AuctionLivestreamCardProps = {
  auctionId: string;
  userId?: string;
  hasActiveStream: boolean;
  startedAt?: string;
  canHost?: boolean;
  isAuctionLive?: boolean;
  hostControlHref?: string;
};

export function AuctionLivestreamCard({
  auctionId,
  userId,
  hasActiveStream,
  startedAt,
  canHost = false,
  isAuctionLive = false,
  hostControlHref,
}: AuctionLivestreamCardProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(hasActiveStream);
  const [startTime, setStartTime] = useState<string | null | undefined>(startedAt);

  const refresh = useCallback(async () => {
    if (!userId) {
      return;
    }

    try {
      const response = await fetch(`/api/auctions/${auctionId}/livestream`, { cache: "no-store" });
      const payload = (await response.json()) as {
        ok: boolean;
        data?: { has_active_stream: boolean; session: { started_at?: string } | null };
      };

      if (!response.ok || !payload.ok) {
        return;
      }

      setActive(Boolean(payload.data?.has_active_stream));
      setStartTime(payload.data?.session?.started_at ?? null);
    } catch {
      // Ignore polling/realtime refresh failures.
    }
  }, [auctionId, userId]);

  useEffect(() => {
    setActive(hasActiveStream);
    setStartTime(startedAt);
  }, [hasActiveStream, startedAt]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const { unsubscribe } = subscribeToLivestreamSession(auctionId, () => {
      void refresh();
    });

    void refresh();

    return () => {
      unsubscribe();
    };
  }, [auctionId, refresh, userId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-brand-600" />
          Live stream
        </CardTitle>
        <CardDescription>
          Live camera feed is separate from listing photos and videos. Open only when needed to save data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!active ? (
          <>
            <p className="text-sm text-slate-500">No livestream is active for this auction right now.</p>
            {userId && canHost && hostControlHref ? (
              <>
                <p className="text-xs text-slate-500">
                  {isAuctionLive
                    ? "You can start the stream from seller listing controls."
                    : "Stream controls are available in seller listings and can start once this auction is live."}
                </p>
                <Button asChild variant="outline" type="button">
                  <Link href={hostControlHref}>Open livestream controls</Link>
                </Button>
              </>
            ) : null}
          </>
        ) : !userId ? (
          <>
            <div className="relative w-full overflow-hidden rounded-2xl border border-brand-200/60 shadow-sm dark:border-brand-900/40">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 via-slate-100 to-brand-100 dark:from-brand-950/50 dark:via-slate-900 dark:to-emerald-950/60" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(16,185,129,0.35),transparent_45%),radial-gradient(circle_at_75%_70%,rgba(14,165,233,0.25),transparent_50%)]" />
              <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1.5px] dark:bg-slate-950/35" />
              <div className="relative flex aspect-video items-center justify-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg dark:bg-slate-900/90 dark:text-slate-100">
                  <PlayCircle className="h-4 w-4 text-brand-600" />
                  Live stream available
                </span>
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-rose-600/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  Live
                </span>
              </div>
            </div>
            <p className="text-sm text-slate-500">Sign in to view the livestream.</p>
          </>
        ) : (
          <>
            {startTime ? (
              <p className="text-xs text-slate-500">
                Started {new Date(startTime).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="group relative w-full overflow-hidden rounded-2xl border border-brand-200/60 text-left shadow-sm transition hover:border-brand-300 dark:border-brand-900/40 dark:hover:border-brand-800/80"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 via-slate-100 to-brand-100 dark:from-brand-950/50 dark:via-slate-900 dark:to-emerald-950/60" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(16,185,129,0.35),transparent_45%),radial-gradient(circle_at_75%_70%,rgba(14,165,233,0.25),transparent_50%)]" />
              <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1.5px] dark:bg-slate-950/35" />
              <div className="relative flex aspect-video items-center justify-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg transition group-hover:scale-[1.02] dark:bg-slate-900/90 dark:text-slate-100">
                  <PlayCircle className="h-4 w-4 text-brand-600" />
                  Live stream available
                </span>
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-rose-600/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  Live
                </span>
              </div>
            </button>
            <Button type="button" onClick={() => setOpen(true)}>
              View livestream
            </Button>
          </>
        )}
      </CardContent>

      {userId ? (
        <LivestreamViewerModal auctionId={auctionId} userId={userId} open={open} onOpenChange={setOpen} />
      ) : null}
    </Card>
  );
}
