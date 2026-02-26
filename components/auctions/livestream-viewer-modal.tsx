"use client";

import { LoaderCircle } from "lucide-react";
import { useAuctionLivestreamViewer } from "@/hooks/use-auction-livestream-viewer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ViewerModalProps = {
  auctionId: string;
  userId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function toCloudflareIframeUrl(playbackUrl: string | null) {
  if (!playbackUrl) {
    return null;
  }

  try {
    const parsed = new URL(playbackUrl);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 3 || parts[1] !== "manifest") {
      return null;
    }

    const streamId = parts[0];
    parsed.pathname = `/${streamId}/iframe`;
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

export function LivestreamViewerModal({ auctionId, userId, open, onOpenChange }: ViewerModalProps) {
  const { status, error, playbackUrl, streamReady, viewerCount } = useAuctionLivestreamViewer({
    auctionId,
    userId,
    enabled: open,
  });
  const iframeUrl = toCloudflareIframeUrl(playbackUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl overflow-hidden p-0">
        <DialogHeader className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <DialogTitle>Live auction feed</DialogTitle>
          <p className="text-xs text-slate-500">Active viewers: {viewerCount}</p>
        </DialogHeader>

        <div className="relative flex items-center justify-center bg-black">
          {iframeUrl && streamReady ? (
            <iframe
              src={iframeUrl}
              className="h-[70vh] w-full max-h-[80vh] border-0 bg-black"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              title="Cloudflare livestream"
            />
          ) : (
            <div className="flex h-[70vh] w-full max-h-[80vh] items-center justify-center bg-black text-sm text-slate-300">
              Waiting for host video feed...
            </div>
          )}

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
