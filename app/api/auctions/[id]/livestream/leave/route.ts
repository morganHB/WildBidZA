import { NextResponse } from "next/server";
import { leaveLivestream } from "@/lib/auctions/commands";
import { requireAuthContext } from "@/lib/auth/guard";
import { livestreamSessionSchema } from "@/lib/validation/livestream";

export async function POST(request: Request) {
  try {
    await requireAuthContext();
    const body = await request.json();
    const parsed = livestreamSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid leave payload" },
        { status: 400 },
      );
    }

    await leaveLivestream(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to leave livestream" },
      { status: 400 },
    );
  }
}
