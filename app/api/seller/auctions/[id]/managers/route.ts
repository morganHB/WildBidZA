import { NextResponse } from "next/server";
import {
  inviteAuctionManager,
  listEligibleAuctionManagers,
  listAuctionManagers,
} from "@/lib/auctions/commands";
import { requireAuthContext } from "@/lib/auth/guard";
import { inviteAuctionManagerSchema } from "@/lib/validation/manager";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user, profile } = await requireAuthContext();
    const { id } = await context.params;
    const managers = await listAuctionManagers(id, user.id);

    const eligibleUsers = await listEligibleAuctionManagers({
      auctionId: id,
      actorId: user.id,
      actorIsAdmin: profile.is_admin,
    }).catch(() => []);

    return NextResponse.json({
      ok: true,
      data: {
        managers,
        eligible_users: eligibleUsers,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load auction managers" },
      { status: 400 },
    );
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user, profile } = await requireAuthContext();
    const { id } = await context.params;
    const body = await request.json();

    const parsed = inviteAuctionManagerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid invite payload" },
        { status: 400 },
      );
    }

    await inviteAuctionManager({
      auctionId: id,
      actorId: user.id,
      actorIsAdmin: profile.is_admin,
      payload: parsed.data,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to invite manager" },
      { status: 400 },
    );
  }
}
