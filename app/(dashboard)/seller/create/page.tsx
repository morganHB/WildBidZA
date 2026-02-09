import { CreateAuctionWizard } from "@/components/seller/create-auction-wizard";
import { requireSellerPage } from "@/lib/auth/guard";
import { getActiveCategories, getSiteSettings } from "@/lib/auctions/queries";

export default async function SellerCreatePage() {
  await requireSellerPage();
  const [categories, settings] = await Promise.all([getActiveCategories(), getSiteSettings()]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Create listing</h1>
      <CreateAuctionWizard
        categories={categories as any}
        defaultMinIncrement={settings.default_min_increment}
        maxImagesPerAuction={settings.max_images_per_auction}
      />
    </div>
  );
}
