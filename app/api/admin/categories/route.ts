import { NextResponse } from "next/server";
import { adminCreateCategory, adminUpdateCategory } from "@/lib/auctions/commands";
import { requireAdminContext } from "@/lib/auth/guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    await requireAdminContext();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("animal_categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAdminContext();
    const body = await request.json();

    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ ok: false, error: "Category name is required" }, { status: 400 });
    }

    const category = await adminCreateCategory(user.id, {
      name: body.name.trim(),
      description: typeof body.description === "string" ? body.description : null,
    });

    return NextResponse.json({ ok: true, data: category });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { user } = await requireAdminContext();
    const body = await request.json();

    if (typeof body.id !== "string") {
      return NextResponse.json({ ok: false, error: "Category id is required" }, { status: 400 });
    }

    await adminUpdateCategory(user.id, body.id, {
      name: typeof body.name === "string" ? body.name : undefined,
      description: typeof body.description === "string" ? body.description : undefined,
      is_active: typeof body.is_active === "boolean" ? body.is_active : undefined,
    });

    return NextResponse.json({ ok: true, data: { id: body.id } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed" }, { status: 400 });
  }
}
