import { NextResponse } from "next/server";
import { removeFavorite, setFavorite } from "@/lib/auctions/commands";
import { requireAuthContext } from "@/lib/auth/guard";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireAuthContext();
    const { id } = await context.params;

    await setFavorite(id, user.id);
    return NextResponse.json({ ok: true, data: { auctionId: id } });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to add favorite",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireAuthContext();
    const { id } = await context.params;

    await removeFavorite(id, user.id);
    return NextResponse.json({ ok: true, data: { auctionId: id } });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to remove favorite",
      },
      { status: 400 },
    );
  }
}
