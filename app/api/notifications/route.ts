import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth/guard";
import { formatNotifications } from "@/lib/notifications/format";

export async function GET(request: Request) {
  try {
    const { user, supabase } = await requireAuthContext();
    const { searchParams } = new URL(request.url);
    const requestedLimit = Number(searchParams.get("limit") ?? "20");
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(50, Math.max(1, Math.trunc(requestedLimit)))
      : 20;

    const [{ data, error }, { count, error: countError }] = await Promise.all([
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null),
    ]);

    if (error) {
      throw error;
    }
    if (countError) {
      throw countError;
    }

    return NextResponse.json({
      ok: true,
      data: {
        items: formatNotifications(data ?? []),
        unread_count: count ?? 0,
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { user, supabase } = await requireAuthContext();
    const body = await request.json();

    if (typeof body.id !== "string") {
      return NextResponse.json({ ok: false, error: "Notification id is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", body.id)
      .eq("user_id", user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true, data: { id: body.id } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed" }, { status: 400 });
  }
}
