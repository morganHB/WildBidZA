import { NextResponse } from "next/server";
import { createAuction } from "@/lib/auctions/commands";
import { getSellerListings } from "@/lib/auctions/queries";
import { requireSellerContext } from "@/lib/auth/guard";
import { createAuctionSchema } from "@/lib/validation/auction";

export async function GET() {
  try {
    const { user } = await requireSellerContext();
    const listings = await getSellerListings(user.id);
    return NextResponse.json({ ok: true, data: listings });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to fetch listings",
      },
      { status: 403 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireSellerContext();
    const body = await request.json();

    const parsed = createAuctionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid auction payload" },
        { status: 400 },
      );
    }

    const auctionId = await createAuction(user.id, parsed.data);
    return NextResponse.json({ ok: true, data: { auctionId } });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to create auction",
      },
      { status: 400 },
    );
  }
}
