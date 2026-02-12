import { NextResponse } from "next/server";
import { createSignedUploadUrl } from "@/lib/auctions/commands";
import { requireAuthContext } from "@/lib/auth/guard";
import { isAdmin, isApprovedSeller } from "@/lib/auth/roles";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_VIDEO_SIZE = 80 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const { user, profile, supabase } = await requireAuthContext();
    const body = await request.json();

    const fileName = typeof body.fileName === "string" ? body.fileName : "upload.jpg";
    const contentType = typeof body.contentType === "string" ? body.contentType : "";
    const size = Number(body.size ?? 0);

    const isImage = ALLOWED_IMAGE_TYPES.has(contentType);
    const isVideo = ALLOWED_VIDEO_TYPES.has(contentType);

    if (!isImage && !isVideo) {
      return NextResponse.json({ ok: false, error: "Unsupported file format" }, { status: 400 });
    }

    const sizeLimit = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    const label = isVideo ? "Video" : "Image";

    if (!Number.isFinite(size) || size <= 0 || size > sizeLimit) {
      return NextResponse.json(
        { ok: false, error: `${label} exceeds ${Math.round(sizeLimit / (1024 * 1024))}MB limit` },
        { status: 400 },
      );
    }

    const auctionId = typeof body.auctionId === "string" ? body.auctionId : undefined;
    if (auctionId) {
      const { data: canManage, error: canManageError } = await supabase.rpc("can_manage_auction", {
        p_auction_id: auctionId,
        p_user_id: user.id,
      });

      if (canManageError) {
        throw new Error(canManageError.message);
      }

      if (!canManage) {
        return NextResponse.json({ ok: false, error: "Not authorized to upload media for this auction" }, { status: 403 });
      }
    } else if (!isApprovedSeller(profile) && !isAdmin(profile)) {
      return NextResponse.json({ ok: false, error: "Seller access is required" }, { status: 403 });
    }

    const data = await createSignedUploadUrl({
      sellerId: user.id,
      fileName,
      contentType,
      auctionId,
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
