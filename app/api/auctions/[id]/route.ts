import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/guard";
import { getAuctionById } from "@/lib/auctions/queries";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const auth = await getAuthContext().catch(() => ({ user: null, profile: null }));
    const auction = await getAuctionById(id, auth.user?.id);
    return NextResponse.json({ ok: true, data: auction });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to fetch auction",
      },
      { status: 500 },
    );
  }
}
