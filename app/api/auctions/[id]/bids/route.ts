import { NextResponse } from "next/server";
import { requireApprovedBidderContext } from "@/lib/auth/guard";
import { placeBid } from "@/lib/auctions/commands";
import { bidSchema } from "@/lib/validation/bid";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireApprovedBidderContext();

    const { id } = await context.params;
    const body = await request.json();
    const parsed = bidSchema.safeParse({ amount: Number(body.amount) });

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
    }

    const data = await placeBid(id, parsed.data.amount);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to place bid";
    const status = message.toLowerCase().includes("approved") ? 403 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
