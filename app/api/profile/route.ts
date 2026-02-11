import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth/guard";
import { profileUpdateSchema } from "@/lib/validation/profile";

export async function GET() {
  try {
    const { profile } = await requireAuthContext();
    return NextResponse.json({ ok: true, data: profile });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { user, supabase } = await requireAuthContext();
    const body = await request.json();

    const parsed = profileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: parsed.data.display_name,
        phone: parsed.data.phone ? parsed.data.phone.replace(/[^\d+]/g, "") : null,
        id_number: parsed.data.id_number ? parsed.data.id_number.replace(/\s+/g, "") : null,
        province: parsed.data.province || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true, data: { userId: user.id } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed" }, { status: 400 });
  }
}
