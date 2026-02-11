import { CreatePacketSeriesWizard } from "@/components/seller/create-packet-series-wizard";
import { requireSellerPage } from "@/lib/auth/guard";
import { getActiveCategories, getSiteSettings } from "@/lib/auctions/queries";

export default async function SellerCreatePacketSeriesPage() {
  await requireSellerPage();
  const [categories, settings] = await Promise.all([
    getActiveCategories(),
    getSiteSettings(),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Create packet series</h1>
      <CreatePacketSeriesWizard
        categories={categories as { id: string; name: string }[]}
        defaultMinIncrement={settings.default_min_increment}
        maxImagesPerAuction={settings.max_images_per_auction}
      />
    </div>
  );
}
