import Link from "next/link";
import { CreateAuctionWizard } from "@/components/seller/create-auction-wizard";
import { Button } from "@/components/ui/button";
import { requireSellerPage } from "@/lib/auth/guard";
import { getActiveCategories, getSiteSettings } from "@/lib/auctions/queries";

export default async function SellerCreatePage() {
  await requireSellerPage();
  const [categories, settings] = await Promise.all([getActiveCategories(), getSiteSettings()]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Create listing</h1>
        <Button asChild variant="outline">
          <Link href="/seller/create/packets">Create packet series</Link>
        </Button>
      </div>
      <CreateAuctionWizard
        categories={categories as any}
        defaultMinIncrement={settings.default_min_increment}
        maxImagesPerAuction={settings.max_images_per_auction}
      />
    </div>
  );
}
