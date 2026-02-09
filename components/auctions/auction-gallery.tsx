"use client";

import Image from "next/image";
import { PlayCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { TrimmedVideo } from "@/components/auctions/trimmed-video";
import { cn } from "@/lib/utils/index";

type GalleryImage = {
  id: string;
  storage_path: string;
};

type GalleryVideo = {
  id: string;
  storage_path: string;
  trim_start_seconds: number;
  trim_end_seconds: number | null;
  muted: boolean;
};

type MediaItem =
  | { kind: "image"; id: string; storage_path: string; sort_order: number; index: number }
  | {
      kind: "video";
      id: string;
      storage_path: string;
      sort_order: number;
      trim_start_seconds: number;
      trim_end_seconds: number | null;
      muted: boolean;
      index: number;
    };

export function AuctionGallery({
  images,
  videos = [],
}: {
  images: GalleryImage[];
  videos?: GalleryVideo[];
}) {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);

  const media = useMemo<MediaItem[]>(
    () => [
      ...images.map((image, index) => ({
        kind: "image" as const,
        id: image.id,
        storage_path: image.storage_path,
        sort_order: index,
        index,
      })),
      ...videos.map((video, index) => ({
        kind: "video" as const,
        id: video.id,
        storage_path: video.storage_path,
        sort_order: index,
        trim_start_seconds: video.trim_start_seconds,
        trim_end_seconds: video.trim_end_seconds,
        muted: video.muted,
        index,
      })),
    ].sort((a, b) => {
      if (a.kind === b.kind) {
        return a.sort_order - b.sort_order;
      }
      return a.kind === "image" ? -1 : 1;
    }),
    [images, videos],
  );

  const selected = media[active];
  const storageUrl = (path: string) =>
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/auction-images/${path}`;
  const fallback = "https://images.unsplash.com/photo-1600932336569-a06a9c7f2a99?auto=format&fit=crop&w=1200&q=80";

  const selectedImageUrl =
    selected && selected.kind === "image" ? storageUrl(selected.storage_path) : fallback;

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="relative block aspect-[4/3] w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
        onClick={() => setOpen(true)}
      >
        {selected?.kind === "video" ? (
          <TrimmedVideo
            src={storageUrl(selected.storage_path)}
            className="h-full w-full object-cover"
            controls={false}
            muted
            autoPlay
            loop
            startSeconds={selected.trim_start_seconds}
            endSeconds={selected.trim_end_seconds}
            poster={fallback}
          />
        ) : (
          <Image
            src={selected ? storageUrl(selected.storage_path) : fallback}
            alt="Auction media"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        )}
        {selected?.kind === "video" ? (
          <span className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white">
            <PlayCircle className="h-3.5 w-3.5" />
            Video
          </span>
        ) : null}
      </button>

      <div className="grid grid-cols-5 gap-2">
        {media.slice(0, 10).map((item, index) => (
          <button
            key={`${item.kind}-${item.id}`}
            type="button"
            onClick={() => setActive(index)}
            className={cn(
              "relative aspect-square overflow-hidden rounded-xl border bg-slate-100 dark:bg-slate-900",
              index === active ? "border-brand-600" : "border-slate-200 dark:border-slate-800",
            )}
          >
            {item.kind === "video" ? (
              <>
                <TrimmedVideo
                  src={storageUrl(item.storage_path)}
                  className="h-full w-full object-cover"
                  controls={false}
                  muted
                  autoPlay
                  loop
                  startSeconds={item.trim_start_seconds}
                  endSeconds={item.trim_end_seconds}
                />
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
                  <PlayCircle className="h-5 w-5 text-white drop-shadow" />
                </span>
              </>
            ) : (
              <Image src={storageUrl(item.storage_path)} alt="Thumbnail" fill className="object-cover" sizes="96px" />
            )}
          </button>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl bg-black p-0">
          <DialogTitle className="sr-only">Auction media</DialogTitle>
          <div className="relative aspect-[16/10] w-full">
            {selected?.kind === "video" ? (
              <TrimmedVideo
                src={storageUrl(selected.storage_path)}
                className="h-full w-full object-contain"
                controls
                muted={selected.muted}
                startSeconds={selected.trim_start_seconds}
                endSeconds={selected.trim_end_seconds}
              />
            ) : (
              <Image
                src={selected ? storageUrl(selected.storage_path) : selectedImageUrl}
                alt="Auction full media"
                fill
                className="object-contain"
                sizes="100vw"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
