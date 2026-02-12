import { NextResponse } from "next/server";
import { stopLivestream } from "@/lib/auctions/commands";
import { requireAuthContext } from "@/lib/auth/guard";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireAuthContext();
    const { id } = await context.params;

    const data = await stopLivestream({
      auctionId: id,
      actorId: user.id,
    });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to stop livestream" },
      { status: 400 },
    );
  }
}
