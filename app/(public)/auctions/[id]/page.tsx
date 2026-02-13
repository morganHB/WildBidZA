import { notFound } from "next/navigation";
import { AuctionGallery } from "@/components/auctions/auction-gallery";
import { AuctionLivestreamCard } from "@/components/auctions/auction-livestream-card";
import { AuctionLiveSection } from "@/components/auctions/auction-live-section";
import { AuctionResultBanner } from "@/components/auctions/auction-result-banner";
import { AuctionStatusBadge } from "@/components/auctions/status-badge";
import { WatchToggle } from "@/components/auctions/watch-toggle";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isApprovedBidder } from "@/lib/auth/roles";
import { getAuthContext } from "@/lib/auth/guard";
import { getAuctionById } from "@/lib/auctions/queries";
import { formatAuctionDateLong } from "@/lib/utils/datetime";

export default async function AuctionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const context = await getAuthContext().catch(() => ({ user: null, profile: null }));
  const auction = await getAuctionById(id, context.user?.id).catch(() => null);

  if (!auction) {
    notFound();
  }

  const canBid = isApprovedBidder(context.profile);
  const leadingBidderId = auction.bids?.[0]?.bidder_id;
  const isWinning = Boolean(context.user?.id && context.user.id === leadingBidderId);
  const canOpenDealChat =
    auction.status === "ended" &&
    Boolean(context.user?.id) &&
    (context.user?.id === auction.winner_user_id || context.user?.id === auction.seller_id);
  const winnerName =
    auction.winner_user_id
      ? auction.bids.find((bid: { bidder_id: string; bidder_name: string }) => bid.bidder_id === auction.winner_user_id)
          ?.bidder_name ?? "Winner"
      : null;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <AuctionStatusBadge status={auction.status} />
          {auction.packet_series_id ? (
            <Badge variant="outline">
              Packet {auction.packet_sequence}
            </Badge>
          ) : null}
          {auction.is_waiting_for_previous ? (
            <Badge variant="warning">Waiting for previous packet</Badge>
          ) : null}
          {auction.reserve_price ? (
            <Badge variant={auction.current_price >= auction.reserve_price ? "success" : "warning"}>
              {auction.current_price >= auction.reserve_price ? "Reserve met" : "Reserve not met"}
            </Badge>
          ) : null}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{auction.title}</h1>
        <p className="text-sm text-slate-500">
          {auction.category?.name} - {auction.city ? `${auction.city}, ` : ""}
          {auction.province ?? "South Africa"} - Ends {formatAuctionDateLong(auction.end_time)}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_420px]">
        <div className="space-y-6">
          <AuctionGallery images={auction.images ?? []} videos={auction.videos ?? []} />
          <div className="flex flex-wrap gap-2">
            <WatchToggle auctionId={auction.id} isFavorited={auction.is_favorited} />
          </div>
          <AuctionLivestreamCard
            auctionId={auction.id}
            userId={context.user?.id}
            hasActiveStream={Boolean(auction.active_livestream)}
            startedAt={auction.active_livestream?.started_at}
            canHost={Boolean(auction.can_stream)}
            isAuctionLive={auction.status === "live"}
            hostControlHref={`/seller/listings/${auction.id}`}
          />
          <Tabs defaultValue="description" className="w-full">
            <TabsList>
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="details">Animal details</TabsTrigger>
              <TabsTrigger value="terms">Collection notes</TabsTrigger>
            </TabsList>
            <TabsContent value="description">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-relaxed dark:border-slate-800 dark:bg-slate-950">
                <p className="whitespace-pre-wrap">{auction.description}</p>
              </div>
            </TabsContent>
            <TabsContent value="details">
              <dl className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-950">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Breed / Type</dt>
                  <dd>{auction.breed_type ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Sex</dt>
                  <dd>{auction.sex ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Age</dt>
                  <dd>{auction.age ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Animals in lot</dt>
                  <dd>{auction.animal_count ?? 1}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Average weight</dt>
                  <dd>{auction.avg_weight_kg ? `${auction.avg_weight_kg} kg` : "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Bidding mode</dt>
                  <dd>{auction.bid_pricing_mode === "per_head" ? "Per head" : "Total lot"}</dd>
                </div>
                {auction.bid_pricing_mode === "per_head" ? (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Current packet total</dt>
                    <dd>R {(auction.current_price * (auction.animal_count ?? 1)).toLocaleString("en-ZA")}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Weight</dt>
                  <dd>{auction.weight ?? "-"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Health / Vet notes</dt>
                  <dd>{auction.health_notes ?? "-"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Permit / reference</dt>
                  <dd>{auction.permit_reference ?? "-"}</dd>
                </div>
              </dl>
            </TabsContent>
            <TabsContent value="terms">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-relaxed dark:border-slate-800 dark:bg-slate-950">
                <p className="whitespace-pre-wrap">{auction.collection_notes ?? "Collection and shipping notes will be agreed with the seller."}</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <AuctionLiveSection
            auctionId={auction.id}
            status={auction.status}
            currentPrice={auction.current_price}
            minIncrement={auction.min_increment}
            serverNow={new Date().toISOString()}
            endTime={auction.end_time}
            canBid={canBid}
            isWinning={isWinning}
            bids={auction.bids}
            currentUserId={context.user?.id}
            bidPricingMode={auction.bid_pricing_mode}
            animalCount={auction.animal_count ?? 1}
            isWaitingForPrevious={auction.is_waiting_for_previous}
            currentAutoBidMax={auction.my_auto_bid_max}
          />
        </div>
      </div>

      <AuctionResultBanner
        isEnded={auction.status === "ended"}
        hasWinner={Boolean(auction.winner_user_id)}
        winnerName={winnerName}
        isCurrentUserWinner={Boolean(context.user?.id && context.user.id === auction.winner_user_id)}
        canOpenDealChat={canOpenDealChat}
        auctionId={auction.id}
      />
    </main>
  );
}

