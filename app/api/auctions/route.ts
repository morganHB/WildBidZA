import { NextResponse } from "next/server";
import { getAuctions } from "@/lib/auctions/queries";
import { auctionFiltersSchema } from "@/lib/validation/auction";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const parsed = auctionFiltersSchema.safeParse({
      q: searchParams.get("q") ?? undefined,
      categoryId: searchParams.get("categoryId") ?? undefined,
      province: searchParams.get("province") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      minPrice: searchParams.get("minPrice") ?? undefined,
      maxPrice: searchParams.get("maxPrice") ?? undefined,
      sort: searchParams.get("sort") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
    }

    const auctions = await getAuctions({
      q: parsed.data.q,
      categoryId: parsed.data.categoryId,
      province: parsed.data.province,
      status: parsed.data.status as any,
      minPrice: parsed.data.minPrice,
      maxPrice: parsed.data.maxPrice,
      sort: parsed.data.sort as any,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });

    return NextResponse.json({ ok: true, data: auctions });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to fetch auctions",
      },
      { status: 500 },
    );
  }
}
