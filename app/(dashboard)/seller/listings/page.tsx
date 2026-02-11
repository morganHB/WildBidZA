import Link from "next/link";
import { Layers, Plus } from "lucide-react";
import { SellerListingsTable } from "@/components/seller/seller-listings-table";
import { Button } from "@/components/ui/button";
import { requireSellerPage } from "@/lib/auth/guard";
import { getSellerListings } from "@/lib/auctions/queries";

export default async function SellerListingsPage() {
  const { user } = await requireSellerPage();
  const listings = await getSellerListings(user.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">My Listings</h1>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/seller/create/packets">
              <Layers className="mr-2 h-4 w-4" />Create packet series
            </Link>
          </Button>
          <Button asChild>
            <Link href="/seller/create">
              <Plus className="mr-2 h-4 w-4" />Create auction
            </Link>
          </Button>
        </div>
      </div>
      <SellerListingsTable listings={listings as any} />
    </div>
  );
}
