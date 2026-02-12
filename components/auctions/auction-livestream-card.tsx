"use client";

import { useCallback, useEffect, useState } from "react";
import { Radio } from "lucide-react";
import { subscribeToLivestreamSession } from "@/lib/auctions/realtime";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LivestreamViewerModal } from "@/components/auctions/livestream-viewer-modal";

type AuctionLivestreamCardProps = {
  auctionId: string;
  userId?: string;
  hasActiveStream: boolean;
  startedAt?: string;
};

export function AuctionLivestreamCard({
  auctionId,
  userId,
  hasActiveStream,
  startedAt,
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
          <p className="text-sm text-slate-500">No livestream is active for this auction right now.</p>
        ) : !userId ? (
          <p className="text-sm text-slate-500">Sign in to view the livestream.</p>
        ) : (
          <>
            {startTime ? (
              <p className="text-xs text-slate-500">
                Started {new Date(startTime).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}
              </p>
            ) : null}
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
