import { NextResponse } from "next/server";
import { finalizeUploadedImage } from "@/lib/auctions/commands";
import { requireSellerContext } from "@/lib/auth/guard";

export async function POST(request: Request) {
  try {
    await requireSellerContext();
    const body = await request.json();

    if (typeof body.path !== "string" || !body.path) {
      return NextResponse.json({ ok: false, error: "Invalid storage path" }, { status: 400 });
    }

    const publicUrl = await finalizeUploadedImage(body.path);
    return NextResponse.json({ ok: true, data: { publicUrl } });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to finalize image",
      },
      { status: 400 },
    );
  }
}
