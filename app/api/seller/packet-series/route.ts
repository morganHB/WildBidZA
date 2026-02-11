import { NextResponse } from "next/server";
import { createPacketSeries } from "@/lib/auctions/commands";
import { requireSellerContext } from "@/lib/auth/guard";
import { createPacketSeriesSchema } from "@/lib/validation/auction";

export async function POST(request: Request) {
  try {
    await requireSellerContext();
    const body = await request.json();

    const parsed = createPacketSeriesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid packet series payload" },
        { status: 400 },
      );
    }

    const data = await createPacketSeries(parsed.data);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to create packet series",
      },
      { status: 400 },
    );
  }
}
