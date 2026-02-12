import { NextResponse } from "next/server";
import { revokeAuctionManager } from "@/lib/auctions/commands";
import { requireAuthContext } from "@/lib/auth/guard";

export async function DELETE(
  _: Request,
  context: { params: Promise<{ id: string; managerUserId: string }> },
) {
  try {
    const { user, profile } = await requireAuthContext();
    const { id, managerUserId } = await context.params;

    await revokeAuctionManager({
      auctionId: id,
      actorId: user.id,
      actorIsAdmin: profile.is_admin,
      managerUserId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to revoke manager" },
      { status: 400 },
    );
  }
}
