"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Clipboard, LoaderCircle, Radio, Video } from "lucide-react";
import { useAuctionLivestreamHost } from "@/hooks/use-auction-livestream-host";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={() => void handleCopy()}>
      {copied ? <Check className="mr-2 h-4 w-4 text-emerald-600" /> : <Clipboard className="mr-2 h-4 w-4" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

export function LivestreamHostPanel({
  auctionId,
  userId,
  canHost,
  isAuctionLive,
}: {
  auctionId: string;
  userId: string;
  canHost: boolean;
  isAuctionLive: boolean;
}) {
  const { status, error, session, viewerCount, audioEnabled, toggleMic, start, stop, connectionHealth } =
    useAuctionLivestreamHost({
      auctionId,
      userId,
      canHost,
    });

  const isStarting = status === "starting";
  const isStopping = status === "stopping";
  const isLive = status === "live" && Boolean(session);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-brand-600" />
          Auction livestream (Mux)
        </CardTitle>
        <CardDescription>
          Start the stream to generate RTMP ingest details, then broadcast from OBS, Larix Broadcaster, Prism Live,
          or Streamlabs on your phone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isAuctionLive ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900">
            Livestream can only start when the auction is live.
          </div>
        ) : null}

        {!canHost ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            You do not have livestream permission for this auction.
          </div>
        ) : null}

        <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Include audio</p>
            <p className="text-xs text-slate-500">
              This flag is stored on the livestream session and shown for operators.
            </p>
          </div>
          <Switch checked={audioEnabled} onCheckedChange={toggleMic} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant={isLive ? "success" : "outline"}>{isLive ? "Live session open" : "Offline"}</Badge>
          <Badge variant="outline">Viewers: {viewerCount}</Badge>
          <Badge variant="outline">{connectionHealth}</Badge>
        </div>

        {session ? (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">RTMP Ingest URL</p>
              <p className="mt-1 break-all rounded-lg bg-white px-3 py-2 font-mono text-xs dark:bg-slate-950">
                {session.mux_ingest_url ?? "Unavailable"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stream Key</p>
              <p className="mt-1 break-all rounded-lg bg-white px-3 py-2 font-mono text-xs dark:bg-slate-950">
                {session.mux_stream_key ?? "Unavailable"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Playback URL</p>
              <p className="mt-1 break-all rounded-lg bg-white px-3 py-2 font-mono text-xs dark:bg-slate-950">
                {session.playback_url ?? "Unavailable"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {session.mux_ingest_url ? <CopyButton value={session.mux_ingest_url} label="Copy ingest URL" /> : null}
              {session.mux_stream_key ? <CopyButton value={session.mux_stream_key} label="Copy stream key" /> : null}
              {session.playback_url ? <CopyButton value={session.playback_url} label="Copy playback URL" /> : null}
            </div>

            {session.playback_url ? (
              <Button asChild type="button" variant="outline">
                <Link href={session.playback_url} target="_blank">
                  Open playback URL
                </Link>
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700">
            Start livestream to generate ingest credentials.
          </div>
        )}

        <div className="rounded-xl border border-slate-200 px-4 py-3 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-300">
          <p className="font-semibold uppercase tracking-wide text-slate-500">How to broadcast from phone</p>
          <p className="mt-1">
            In your RTMP app, set server/url to the ingest URL, set stream key, choose 720p or 1080p, then go live.
          </p>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex gap-2">
          <Button type="button" onClick={() => void start()} disabled={!canHost || !isAuctionLive || isStarting || isLive}>
            {isStarting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Video className="mr-2 h-4 w-4" />}
            Start livestream
          </Button>
          <Button type="button" variant="outline" onClick={() => void stop()} disabled={!isLive || isStopping}>
            {isStopping ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
            Stop
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
