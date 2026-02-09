"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Clock3, MapPin, PlayCircle } from "lucide-react";
import { formatAuctionDate, relativeFromNow } from "@/lib/utils/datetime";
import { formatZar } from "@/lib/utils/currency";
import { AuctionStatusBadge } from "@/components/auctions/status-badge";
import { TrimmedVideo } from "@/components/auctions/trimmed-video";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

export type AuctionCardData = {
  id: string;
  title: string;
  status: "upcoming" | "live" | "ended";
  start_time: string;
  end_time: string;
  current_price: number;
  province?: string | null;
  city?: string | null;
  category?: { name?: string | null } | null;
  images?: { storage_path: string }[];
  videos?: {
    storage_path: string;
    trim_start_seconds: number;
    trim_end_seconds: number | null;
    muted: boolean;
  }[];
};

export function AuctionCard({ auction }: { auction: AuctionCardData }) {
  const imagePath = auction.images?.[0]?.storage_path;
  const video = auction.videos?.[0];
  const fallback = "https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1200&q=80";
  const imageUrl = imagePath
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/auction-images/${imagePath}`
    : fallback;
  const videoUrl = video
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/auction-images/${video.storage_path}`
    : null;
  const videoTrimStart = video?.trim_start_seconds ?? 0;
  const videoTrimEnd = video?.trim_end_seconds ?? null;
  const [source, setSource] = useState(imageUrl);

  useEffect(() => {
    setSource(imageUrl);
  }, [imageUrl]);

  const timingLabel =
    auction.status === "upcoming"
      ? `Starts ${relativeFromNow(auction.start_time)}`
      : auction.status === "ended"
        ? `Ended ${formatAuctionDate(auction.end_time)}`
        : `Ends ${relativeFromNow(auction.end_time)}`;

  return (
    <Card className="group overflow-hidden rounded-3xl border-slate-200/90 bg-white/95 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-100/60 dark:border-slate-800 dark:bg-slate-950/80 dark:hover:shadow-none">
      <Link href={`/auctions/${auction.id}`} className="block">
        <div className="relative aspect-[5/4] overflow-hidden">
          {imagePath ? (
            <Image
              src={source}
              alt={auction.title}
              fill
              className="object-cover transition duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              onError={() => setSource(fallback)}
            />
          ) : videoUrl ? (
            <TrimmedVideo
              src={videoUrl}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              controls={false}
              muted
              autoPlay
              loop
              startSeconds={videoTrimStart}
              endSeconds={videoTrimEnd}
              poster={fallback}
            />
          ) : (
            <Image
              src={fallback}
              alt={auction.title}
              fill
              className="object-cover transition duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          )}
          <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm dark:bg-slate-950/90 dark:text-slate-200">
            <Clock3 className="h-3 w-3 text-brand-600" />
            {timingLabel}
          </div>
          {!imagePath && videoUrl ? (
            <div className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white">
              <PlayCircle className="h-3 w-3" /> Video
            </div>
          ) : null}
          <div className="absolute right-3 top-3">
            <AuctionStatusBadge status={auction.status} />
          </div>
        </div>
      </Link>
      <CardHeader className="space-y-3 pb-2">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-xs font-bold uppercase tracking-[0.18em] text-brand-700 dark:text-brand-300">
            {auction.category?.name ?? "Uncategorized"}
          </p>
          <p className="flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="h-3.5 w-3.5" />
            {auction.city ? `${auction.city}, ${auction.province}` : auction.province ?? "South Africa"}
          </p>
        </div>
        <Link
          href={`/auctions/${auction.id}`}
          className="line-clamp-2 text-2xl font-semibold leading-tight text-slate-900 transition group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-200"
        >
          {auction.title}
        </Link>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-900">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Current bid</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                {formatZar(auction.current_price)}
              </p>
            </div>
            <p className="text-xs text-slate-500">{auction.status === "ended" ? "Closed" : "Live updates"}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button asChild className="h-11 w-full rounded-xl text-base font-semibold">
          <Link href={`/auctions/${auction.id}`}>
            Place bid
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
