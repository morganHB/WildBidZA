"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, MapPin, Radio, User } from "lucide-react";
import { toast } from "sonner";
import { formatZar } from "@/lib/utils/currency";
import { LivestreamViewerModal } from "@/components/auctions/livestream-viewer-modal";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1543324622-c94314e76c15?auto=format&fit=crop&q=80&w=1200";

type LiveLotCardData = {
  id: string;
  title: string;
  current_price: number;
  bid_count?: number;
  top_bidder_name?: string | null;
  has_active_stream?: boolean;
  farm_name?: string | null;
  city?: string | null;
  province?: string | null;
  images?: { storage_path: string }[];
};

function toImageUrl(path?: string | null) {
  if (!path || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return FALLBACK_IMAGE;
  }

  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/auction-images/${path}`;
}

function splitLotTitle(title: string) {
  const pieces = title.split(":");

  if (pieces.length < 2) {
    return { lotCode: title, lotName: "" };
  }

  return {
    lotCode: pieces[0]?.trim() ?? title,
    lotName: pieces.slice(1).join(":").trim(),
  };
}

function formatVenue(auction: LiveLotCardData) {
  if (auction.farm_name?.trim()) {
    return auction.farm_name.toUpperCase();
  }

  if (auction.city && auction.province) {
    return `${auction.city}, ${auction.province}`.toUpperCase();
  }

  return auction.province?.toUpperCase() ?? "OFFICIAL VENUE";
}

function formatLocation(auction: LiveLotCardData) {
  if (auction.city && auction.province) {
    return `${auction.city}, ${auction.province}`.toUpperCase();
  }

  return auction.province?.toUpperCase() ?? "SOUTH AFRICA";
}

function LiveLotCard({
  auction,
  onBid,
  userId,
}: {
  auction: LiveLotCardData;
  onBid: (auctionId: string) => void;
  userId?: string;
}) {
  const imagePath = auction.images?.[0]?.storage_path;
  const imageUrl = toImageUrl(imagePath);
  const [source, setSource] = useState(imageUrl);
  const [streamOpen, setStreamOpen] = useState(false);

  useEffect(() => {
    setSource(imageUrl);
  }, [imageUrl]);

  const { lotCode, lotName } = useMemo(() => splitLotTitle(auction.title), [auction.title]);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[3.5rem] border border-stone-200 bg-white shadow-[0_30px_70px_-20px_rgba(0,0,0,0.12)] transition-all">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100">
        <Image
          src={source}
          alt={auction.title}
          fill
          className="object-cover transition-all duration-1000 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 50vw"
          onError={() => setSource(FALLBACK_IMAGE)}
        />

        <div className="absolute left-6 top-6">
          <div className="flex items-center gap-2 rounded-full bg-red-700 px-5 py-2 text-[11px] font-black uppercase tracking-widest text-white shadow-2xl">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" />
            LIVE NOW
          </div>
          {auction.has_active_stream ? (
            <button
              type="button"
              onClick={() => setStreamOpen(true)}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-stone-950/90 px-5 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-white shadow-2xl transition hover:bg-red-700"
            >
              <Radio size={14} className="animate-pulse" />
              Livestream
            </button>
          ) : null}
        </div>

        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex items-center gap-3 rounded-3xl border border-white/20 bg-stone-900/60 p-4 text-white shadow-2xl backdrop-blur-2xl">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-700 shadow-lg">
              <Building2 size={22} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.35em] text-amber-400">OFFICIAL VENUE</p>
              <p className="text-sm font-black uppercase italic leading-tight tracking-tighter md:text-base">
                {formatVenue(auction)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-8 md:p-9">
        <div className="flex-1">
          <div className="mb-7">
            <h3 className="inline-block -skew-x-6 bg-red-700 px-4 py-2 text-2xl font-black uppercase italic tracking-tighter text-white md:text-4xl">
              {lotCode}
            </h3>
            {lotName ? (
              <>
                <br />
                <h3 className="mt-2 inline-block -skew-x-6 bg-red-700 px-4 py-2 text-2xl font-black uppercase italic tracking-tighter text-white md:text-4xl">
                  {lotName}
                </h3>
              </>
            ) : null}
          </div>

          <div className="mb-8 flex items-center gap-3 text-stone-600">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-stone-100">
              <MapPin size={20} className="text-red-700" />
            </div>
            <span className="text-[14px] font-black uppercase tracking-[0.25em] md:text-[15px]">
              {formatLocation(auction)}
            </span>
          </div>

          <div className="rounded-[3rem] border border-stone-100 bg-stone-50 p-8 shadow-inner transition-colors duration-700 group-hover:bg-amber-50/50 md:p-9">
            <p className="mb-4 text-[10px] font-black uppercase tracking-[0.42em] text-stone-400">CURRENT HIGH BID</p>
            <p className="mb-6 text-4xl font-black italic leading-none tracking-tighter text-stone-900 md:text-6xl">
              {formatZar(auction.current_price)}
            </p>
            <div className="flex items-center gap-3 border-t border-stone-200/60 pt-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-red-700 bg-stone-900 text-white shadow-lg">
                <User size={18} />
              </div>
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-600 italic">
                BIDDER: {(auction.top_bidder_name ?? "Awaiting bids").toUpperCase()}
                {auction.bid_count ? ` (${auction.bid_count})` : ""}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onBid(auction.id)}
          className="mt-10 flex w-full items-center justify-center gap-4 rounded-[2.2rem] bg-stone-950 py-6 text-[11px] font-black uppercase tracking-[0.32em] text-white shadow-2xl transition-all hover:bg-red-700 active:scale-95"
        >
          PLACE QUICK BID <ArrowRight size={22} />
        </button>
      </div>

      {auction.has_active_stream ? (
        <LivestreamViewerModal auctionId={auction.id} userId={userId} open={streamOpen} onOpenChange={setStreamOpen} />
      ) : null}
    </article>
  );
}

export function LiveLotGrid({
  auctions,
  isAuthenticated,
  userId,
}: {
  auctions: LiveLotCardData[];
  isAuthenticated: boolean;
  userId?: string;
}) {
  const router = useRouter();

  if (auctions.length === 0) {
    return (
      <div className="rounded-[3rem] border border-dashed border-stone-300 bg-white p-14 text-center text-sm font-medium text-stone-500">
        No live auctions right now. Check back soon.
      </div>
    );
  }

  const handleBid = (auctionId: string) => {
    const nextPath = `/auctions/${auctionId}`;

    if (!isAuthenticated) {
      toast.error("You must log in to bid");
      router.push(`/sign-in?next=${encodeURIComponent(nextPath)}&reason=bid-login`);
      return;
    }

    router.push(nextPath);
  };

  return (
    <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-12">
      {auctions.map((auction) => (
        <LiveLotCard key={auction.id} auction={auction} onBid={handleBid} userId={userId} />
      ))}
    </div>
  );
}
