import { AuctionFilters } from "@/components/auctions/auction-filters";
import { AuctionGrid } from "@/components/auctions/auction-grid";
import { getActiveCategories, getAuctions } from "@/lib/auctions/queries";
import { safeParseFloat, toInt } from "@/lib/utils/index";

export default async function AuctionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const status = typeof params.status === "string" ? params.status : undefined;
  const q = typeof params.q === "string" ? params.q : undefined;
  const categoryId = typeof params.categoryId === "string" ? params.categoryId : undefined;
  const province = typeof params.province === "string" ? params.province : undefined;
  const sort = typeof params.sort === "string" ? params.sort : "ending_soon";

  const [categories, auctions] = await Promise.all([
    getActiveCategories(),
    getAuctions({
      q,
      categoryId,
      province,
      status: status as any,
      minPrice: safeParseFloat(typeof params.minPrice === "string" ? params.minPrice : undefined) ?? undefined,
      maxPrice: safeParseFloat(typeof params.maxPrice === "string" ? params.maxPrice : undefined) ?? undefined,
      sort: sort as any,
      limit: toInt(typeof params.limit === "string" ? params.limit : undefined) ?? 24,
      offset: toInt(typeof params.offset === "string" ? params.offset : undefined) ?? 0,
    }),
  ]);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700 dark:text-brand-300">Browse listings</p>
        <h1 className="text-4xl font-semibold tracking-tight">Auctions</h1>
        <p className="text-sm text-slate-500">Upcoming, live, and completed auctions across South Africa.</p>
      </div>
      <AuctionFilters categories={categories as any} />
      <AuctionGrid auctions={auctions as any} />
    </main>
  );
}
