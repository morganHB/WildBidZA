import { NextResponse } from "next/server";
import { activateNextPacket } from "@/lib/auctions/commands";
import { requireSellerContext } from "@/lib/auth/guard";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user, profile } = await requireSellerContext();
    const { id } = await context.params;

    const data = await activateNextPacket({
      auctionId: id,
      actorId: user.id,
      isAdmin: profile.is_admin,
    });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to activate next packet",
      },
      { status: 400 },
    );
  }
}
