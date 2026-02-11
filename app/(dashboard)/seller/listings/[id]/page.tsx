import { notFound } from "next/navigation";
import Link from "next/link";
import { AuctionGallery } from "@/components/auctions/auction-gallery";
import { EditAuctionForm } from "@/components/seller/edit-auction-form";
import { StartNextPacketButton } from "@/components/seller/start-next-packet-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSellerPage } from "@/lib/auth/guard";
import { getActiveCategories, getAuctionById, getSiteSettings } from "@/lib/auctions/queries";
import { formatZar } from "@/lib/utils/currency";

export default async function SellerListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireSellerPage();
  const { id } = await params;

  const [auction, categories, settings] = await Promise.all([
    getAuctionById(id, user.id).catch(() => null),
    getActiveCategories(),
    getSiteSettings(),
  ]);

  if (!auction || auction.seller_id !== user.id) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{auction.title}</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <AuctionGallery images={auction.images} videos={auction.videos} />
          <EditAuctionForm
            auction={{
              id: auction.id,
              title: auction.title,
              description: auction.description,
              category_id: auction.category_id,
              animal_count: auction.animal_count,
              avg_weight_kg: auction.avg_weight_kg,
              breed_type: auction.breed_type,
              sex: auction.sex,
              age: auction.age,
              province: auction.province,
              city: auction.city,
              farm_name: auction.farm_name,
              health_notes: auction.health_notes,
              permit_reference: auction.permit_reference,
              collection_notes: auction.collection_notes,
              starting_bid: auction.starting_bid,
              min_increment: auction.min_increment,
              reserve_price: auction.reserve_price,
              start_time: auction.start_time,
              end_time: auction.end_time,
              duration_minutes: auction.duration_minutes,
              status: auction.status,
              packet_series_id: auction.packet_series_id,
              auto_start_next: auction.auto_start_next,
              images: auction.images,
              videos: auction.videos,
            }}
            categories={categories as { id: string; name: string }[]}
            maxImagesPerAuction={settings.max_images_per_auction}
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Listing summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Status: {auction.status}</p>
            <p>Current bid: {formatZar(auction.current_price)}</p>
            <p>Bid count: {auction.bid_count}</p>
            <p>Videos: {auction.videos?.length ?? 0}</p>
            <p>Animals in lot: {auction.animal_count ?? 1}</p>
            <p>Average weight: {auction.avg_weight_kg ? `${auction.avg_weight_kg} kg` : "-"}</p>
            <p>Sex: {auction.sex ? `${auction.sex.charAt(0).toUpperCase()}${auction.sex.slice(1)}` : "-"}</p>
            {auction.bid_pricing_mode === "per_head" ? <p>Bidding: Per head</p> : <p>Bidding: Total lot</p>}
            {auction.packet_series_id ? <p>Packet sequence: {auction.packet_sequence}</p> : null}
            <p>Starts: {new Date(auction.start_time).toLocaleString("en-ZA")}</p>
            <p>Ends: {new Date(auction.end_time).toLocaleString("en-ZA")}</p>
            {auction.status === "ended" && auction.packet_series_id && !auction.auto_start_next ? (
              <StartNextPacketButton auctionId={auction.id} />
            ) : null}
            {auction.status === "ended" && auction.winner_user_id ? (
              <Button asChild className="mt-3 w-full" variant="outline">
                <Link href={`/deals/${auction.id}`}>Open winner chat</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
