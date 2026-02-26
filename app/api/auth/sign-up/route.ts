import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { signUpSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = signUpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid sign-up payload" },
        { status: 400 },
      );
    }

    const values = parsed.data;
    const email = values.email.trim().toLowerCase();
    const admin = createSupabaseAdminClient() as any;

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: values.password,
      email_confirm: true,
      user_metadata: {
        display_name: values.displayName,
        phone: values.phone,
        id_number: values.idNumber,
        popia_consent: values.popiaConsent,
        terms_accepted: values.termsAccepted,
      },
    });

    if (createError) {
      const message = /already|exists|registered/i.test(createError.message)
        ? "This email is already registered."
        : createError.message;
      return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }

    const userId = created.user?.id;
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Unable to create account at the moment" },
        { status: 500 },
      );
    }

    const { error: profileError } = await admin
      .from("profiles")
      .upsert(
        {
          id: userId,
          display_name: values.displayName,
          email,
          phone: values.phone,
          id_number: values.idNumber,
          approval_status: "pending",
          seller_status: "none",
          role_group: "user",
          is_admin: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );

    if (profileError) {
      return NextResponse.json({ ok: false, error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        user_id: userId,
        email,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to create account" },
      { status: 400 },
    );
  }
}
