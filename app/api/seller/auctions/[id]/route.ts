import { NextResponse } from "next/server";
import { updateAuction } from "@/lib/auctions/commands";
import { requireSellerContext } from "@/lib/auth/guard";
import { updateAuctionSchema } from "@/lib/validation/auction";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireSellerContext();
    const { id } = await context.params;
    const body = await request.json();

    const parsed = updateAuctionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid auction update payload" },
        { status: 400 },
      );
    }

    await updateAuction(user.id, id, parsed.data);
    return NextResponse.json({ ok: true, data: { id } });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to update auction",
      },
      { status: 400 },
    );
  }
}
