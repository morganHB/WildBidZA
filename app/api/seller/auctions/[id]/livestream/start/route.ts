import { NextResponse } from "next/server";
import { startLivestream } from "@/lib/auctions/commands";
import { requireAuthContext } from "@/lib/auth/guard";
import { startLivestreamSchema } from "@/lib/validation/livestream";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireAuthContext();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    const parsed = startLivestreamSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid livestream payload" },
        { status: 400 },
      );
    }

    const data = await startLivestream({
      auctionId: id,
      actorId: user.id,
      payload: parsed.data,
    });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to start livestream" },
      { status: 400 },
    );
  }
}
