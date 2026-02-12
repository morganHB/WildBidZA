"use client";

import { useEffect, useRef } from "react";
import { LoaderCircle, Mic, MicOff, Radio, Video } from "lucide-react";
import { useAuctionLivestreamHost } from "@/hooks/use-auction-livestream-host";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

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
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const {
    status,
    error,
    localStream,
    session,
    viewerCount,
    qualityPreset,
    setQualityPreset,
    audioEnabled,
    toggleMic,
    availableCameras,
    selectedCameraId,
    setSelectedCameraId,
    start,
    stop,
    connectionHealth,
  } = useAuctionLivestreamHost({
    auctionId,
    userId,
    canHost,
  });

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    videoRef.current.srcObject = localStream;
  }, [localStream]);

  const isStarting = status === "starting";
  const isStopping = status === "stopping";
  const isLive = status === "live" && Boolean(session);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-brand-600" />
          Auction livestream
        </CardTitle>
        <CardDescription>
          Start a low-latency live camera feed for buyers. Livestream is separate from listing media.
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

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Camera</Label>
            <Select value={selectedCameraId || "auto"} onValueChange={setSelectedCameraId}>
              <SelectTrigger>
                <SelectValue placeholder="Select camera" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Default camera</SelectItem>
                {availableCameras
                  .filter((camera) => Boolean(camera.deviceId))
                  .map((camera) => (
                  <SelectItem key={camera.deviceId} value={camera.deviceId}>
                    {camera.label || "Camera"}
                  </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Quality</Label>
            <Select
              value={qualityPreset}
              onValueChange={(value: "standard" | "data_saver") => setQualityPreset(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select quality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard (360p / 24fps)</SelectItem>
                <SelectItem value="data_saver">Data saver (240p / 15fps)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Microphone</p>
            <p className="text-xs text-slate-500">Toggle live audio on or off.</p>
          </div>
          <div className="flex items-center gap-2">
            {audioEnabled ? <Mic className="h-4 w-4 text-emerald-600" /> : <MicOff className="h-4 w-4 text-slate-500" />}
            <Switch checked={audioEnabled} onCheckedChange={toggleMic} />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-black dark:border-slate-800">
          <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full object-cover" />
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant={isLive ? "success" : "outline"}>{isLive ? "Live" : "Offline"}</Badge>
          <Badge variant="outline">Viewers: {viewerCount}</Badge>
          <Badge variant="outline">{connectionHealth}</Badge>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() => void start()}
            disabled={!canHost || !isAuctionLive || isStarting || isLive}
          >
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
