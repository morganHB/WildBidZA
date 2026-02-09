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

    if (!["user", "marketer"].includes(body.role_group)) {
      return NextResponse.json({ ok: false, error: "Invalid role group" }, { status: 400 });
    }

    if (typeof body.is_admin !== "boolean") {
      return NextResponse.json({ ok: false, error: "Invalid admin status" }, { status: 400 });
    }

    if (body.userId === user.id && body.is_admin === false) {
      return NextResponse.json(
        { ok: false, error: "You cannot remove your own admin access" },
        { status: 400 },
      );
    }

    await adminUpdateUserStatus({
      actorId: user.id,
      userId: body.userId,
      approval_status: body.approval_status,
      role_group: body.role_group,
      is_admin: body.is_admin,
    });

    return NextResponse.json({ ok: true, data: { userId: body.userId } });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to update role group",
      },
      { status: 400 },
    );
  }
}
