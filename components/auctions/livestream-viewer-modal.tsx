"use client";

import { useEffect, useRef } from "react";
import { LoaderCircle } from "lucide-react";
import { useAuctionLivestreamViewer } from "@/hooks/use-auction-livestream-viewer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ViewerModalProps = {
  auctionId: string;
  userId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LivestreamViewerModal({ auctionId, userId, open, onOpenChange }: ViewerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { status, error, remoteStream, viewerCount } = useAuctionLivestreamViewer({
    auctionId,
    userId,
    enabled: open,
  });

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    videoRef.current.srcObject = remoteStream;

    if (!remoteStream) {
      return;
    }

    void videoRef.current.play().catch(() => undefined);
  }, [remoteStream]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl overflow-hidden p-0">
        <DialogHeader className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <DialogTitle>Live auction feed</DialogTitle>
          <p className="text-xs text-slate-500">Active viewers: {viewerCount}</p>
        </DialogHeader>

        <div className="relative flex items-center justify-center bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            controls
            muted
            className="h-[70vh] w-full max-h-[80vh] bg-black object-contain"
          />

          {status === "connecting" ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/65">
              <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-medium text-slate-900">
                <LoaderCircle className="h-4 w-4 animate-spin" /> Connecting livestream...
              </div>
            </div>
          ) : null}
        </div>

        {status === "ended" ? (
          <div className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">
            Livestream has ended.
          </div>
        ) : null}

        {error ? <div className="px-5 pb-4 text-sm text-red-600">{error}</div> : null}
      </DialogContent>
    </Dialog>
  );
}
