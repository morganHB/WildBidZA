import { NextResponse } from "next/server";
import { adminModerateAuction } from "@/lib/auctions/commands";
import { requireAdminContext } from "@/lib/auth/guard";

export async function PATCH(request: Request) {
  try {
    const { user } = await requireAdminContext();
    const body = await request.json();

    if (typeof body.auctionId !== "string") {
      return NextResponse.json({ ok: false, error: "auctionId is required" }, { status: 400 });
    }

    await adminModerateAuction(user.id, body.auctionId, {
      is_active: typeof body.is_active === "boolean" ? body.is_active : undefined,
      is_moderated: typeof body.is_moderated === "boolean" ? body.is_moderated : undefined,
      status: ["upcoming", "live", "ended"].includes(body.status) ? body.status : undefined,
    });

    return NextResponse.json({ ok: true, data: { auctionId: body.auctionId } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed" }, { status: 400 });
  }
}
