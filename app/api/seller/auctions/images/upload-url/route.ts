import { NextResponse } from "next/server";
import { createSignedUploadUrl } from "@/lib/auctions/commands";
import { requireSellerContext } from "@/lib/auth/guard";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const { user } = await requireSellerContext();
    const body = await request.json();

    const fileName = typeof body.fileName === "string" ? body.fileName : "upload.jpg";
    const contentType = typeof body.contentType === "string" ? body.contentType : "";
    const size = Number(body.size ?? 0);

    if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
      return NextResponse.json({ ok: false, error: "Unsupported image format" }, { status: 400 });
    }

    if (!Number.isFinite(size) || size <= 0 || size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ ok: false, error: "Image exceeds 8MB limit" }, { status: 400 });
    }

    const data = await createSignedUploadUrl({
      sellerId: user.id,
      fileName,
      contentType,
      auctionId: typeof body.auctionId === "string" ? body.auctionId : undefined,
    });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to generate upload URL",
      },
      { status: 400 },
    );
  }
}
