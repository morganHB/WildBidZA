import { NextResponse } from "next/server";
import { updateSettings } from "@/lib/auctions/commands";
import { requireAdminContext } from "@/lib/auth/guard";
import { settingsUpdateSchema } from "@/lib/validation/settings";

export async function PATCH(request: Request) {
  try {
    const { user } = await requireAdminContext();
    const body = await request.json();

    const parsed = settingsUpdateSchema.safeParse({
      sniping_window_minutes: Number(body.sniping_window_minutes),
      extension_minutes: Number(body.extension_minutes),
      default_min_increment: Number(body.default_min_increment),
      max_images_per_auction: Number(body.max_images_per_auction),
      bidder_masking_enabled: Boolean(body.bidder_masking_enabled),
    });

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
    }

    await updateSettings(parsed.data, user.id);
    return NextResponse.json({ ok: true, data: parsed.data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to update settings",
      },
      { status: 400 },
    );
  }
}
