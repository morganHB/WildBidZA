import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth/guard";

export async function GET() {
  try {
    const { user, supabase } = await requireAuthContext();

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true, data: data ?? [] });
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
