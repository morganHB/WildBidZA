import { NextResponse } from "next/server";
import { publishLivestreamSignal } from "@/lib/auctions/commands";
import { requireAuthContext } from "@/lib/auth/guard";
import { livestreamSignalSchema } from "@/lib/validation/livestream";

export async function POST(request: Request) {
  try {
    await requireAuthContext();
    const body = await request.json();
    const parsed = livestreamSignalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid signal payload" },
        { status: 400 },
      );
    }

    const signalId = await publishLivestreamSignal(parsed.data);
    return NextResponse.json({ ok: true, data: { signal_id: signalId } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to publish signal" },
      { status: 400 },
    );
  }
}
