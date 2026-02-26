"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Clock3, MapPin, PlayCircle, Radio } from "lucide-react";
import { formatAuctionDate, relativeFromNow } from "@/lib/utils/datetime";
import { formatZar } from "@/lib/utils/currency";
import { AuctionStatusBadge } from "@/components/auctions/status-badge";
import { TrimmedVideo } from "@/components/auctions/trimmed-video";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

export type AuctionCardData = {
  id: string;
  title: string;
  status: "upcoming" | "live" | "ended";
  start_time: string;
  end_time: string;
  current_price: number;
  has_active_stream?: boolean;
  bid_pricing_mode?: "lot_total" | "per_head";
  animal_count?: number;
  is_waiting_for_previous?: boolean;
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
    auction.is_waiting_for_previous
      ? "Starts after previous packet closes"
      : auction.status === "upcoming"
      ? `Starts ${relativeFromNow(auction.start_time)}`
      : auction.status === "ended"
        ? `Ended ${formatAuctionDate(auction.end_time)}`
        : `Ends ${relativeFromNow(auction.end_time)}`;
  const isPerHead = auction.bid_pricing_mode === "per_head";
  const packetTotal = isPerHead
    ? auction.current_price * Math.max(1, auction.animal_count ?? 1)
    : auction.current_price;
  const ctaLabel =
    auction.status === "ended"
      ? "View result"
      : auction.status === "upcoming"
        ? "View lot"
        : "Place bid";

  return (
    <Card className="group overflow-hidden rounded-[2rem] border-stone-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-stone-200/70">
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
          <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-stone-700 shadow-sm">
            <Clock3 className="h-3 w-3 text-red-700" />
            {timingLabel}
          </div>
          {!imagePath && videoUrl ? (
            <div className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white">
              <PlayCircle className="h-3 w-3" /> Video
            </div>
          ) : null}
          <div className="absolute right-3 top-3 flex flex-col items-end gap-1">
            <AuctionStatusBadge status={auction.status} />
            {auction.has_active_stream ? (
              <Badge className="bg-emerald-600 text-white">
                <Radio className="mr-1 h-3 w-3" />
                STREAM LIVE
              </Badge>
            ) : null}
          </div>
        </div>
      </Link>
      <CardHeader className="space-y-3 pb-2">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-xs font-bold uppercase tracking-[0.18em] text-red-700">
            {auction.category?.name ?? "Uncategorized"}
          </p>
          <p className="flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="h-3.5 w-3.5" />
            {auction.city ? `${auction.city}, ${auction.province}` : auction.province ?? "South Africa"}
          </p>
        </div>
        <Link
          href={`/auctions/${auction.id}`}
          className="line-clamp-2 text-2xl font-black uppercase italic leading-tight tracking-tight text-stone-900 transition group-hover:text-red-700"
        >
          {auction.title}
        </Link>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="rounded-2xl bg-stone-100 p-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                {isPerHead ? "Current bid / head" : "Current bid"}
              </p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-stone-950">
                {formatZar(auction.current_price)}
              </p>
              {isPerHead ? (
                <p className="mt-1 text-xs text-stone-500">
                  Total for packet: {formatZar(packetTotal)} ({auction.animal_count ?? 1} head)
                </p>
              ) : null}
            </div>
            <p className="text-xs text-stone-500">{auction.status === "ended" ? "Closed" : "Live updates"}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button asChild className="h-11 w-full rounded-xl bg-red-700 text-base font-semibold text-white hover:bg-stone-900">
          <Link href={`/auctions/${auction.id}`}>
            {ctaLabel}
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
