import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth/guard";
import { isAdmin, isApprovedSeller } from "@/lib/auth/roles";
import { setReportChecklistCompletion } from "@/lib/reports/queries";
import { reportFinalizationUpdateSchema } from "@/lib/validation/report";

export async function POST(request: Request) {
  try {
    const { user, profile } = await requireAuthContext();

    if (!isApprovedSeller(profile) && !isAdmin(profile)) {
      return NextResponse.json(
        { ok: false, error: "Reports are available to marketers and admins only" },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = reportFinalizationUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid finalization payload" },
        { status: 400 },
      );
    }

    const data = await setReportChecklistCompletion({
      userId: user.id,
      isAdmin: isAdmin(profile),
      auctionId: parsed.data.auctionId,
      isCompleted: parsed.data.isCompleted,
    });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to update finalization status" },
      { status: 400 },
    );
  }
}
