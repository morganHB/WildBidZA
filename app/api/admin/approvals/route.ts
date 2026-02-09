import { NextResponse } from "next/server";
import { adminUpdateUserStatus } from "@/lib/auctions/commands";
import { requireAdminContext } from "@/lib/auth/guard";

export async function PATCH(request: Request) {
  try {
    const { user } = await requireAdminContext();
    const body = await request.json();

    if (typeof body.userId !== "string") {
      return NextResponse.json({ ok: false, error: "userId is required" }, { status: 400 });
    }

    if (!["pending", "approved", "rejected"].includes(body.approval_status)) {
      return NextResponse.json({ ok: false, error: "Invalid approval status" }, { status: 400 });
    }

    await adminUpdateUserStatus({
      actorId: user.id,
      userId: body.userId,
      approval_status: body.approval_status,
    });

    return NextResponse.json({ ok: true, data: { userId: body.userId } });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to update approval",
      },
      { status: 400 },
    );
  }
}
