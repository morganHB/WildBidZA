"use client";

import Image from "next/image";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils/index";

type GalleryImage = {
  id: string;
  storage_path: string;
};

export function AuctionGallery({ images }: { images: GalleryImage[] }) {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);

  const imageUrl = (path: string) =>
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/auction-images/${path}`;

  const fallback = "https://images.unsplash.com/photo-1600932336569-a06a9c7f2a99?auto=format&fit=crop&w=1200&q=80";

  const selected = images[active];

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="relative block aspect-[4/3] w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
        onClick={() => setOpen(true)}
      >
        <Image
          src={selected ? imageUrl(selected.storage_path) : fallback}
          alt="Auction image"
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      </button>
      <div className="grid grid-cols-5 gap-2">
        {images.slice(0, 5).map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setActive(index)}
            className={cn(
              "relative aspect-square overflow-hidden rounded-xl border",
              index === active ? "border-brand-600" : "border-slate-200 dark:border-slate-800",
            )}
          >
            <Image src={imageUrl(image.storage_path)} alt="Thumbnail" fill className="object-cover" sizes="96px" />
          </button>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl bg-black p-0">
          <DialogTitle className="sr-only">Auction image</DialogTitle>
          <div className="relative aspect-[16/10] w-full">
            <Image
              src={selected ? imageUrl(selected.storage_path) : fallback}
              alt="Auction full image"
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
