import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { searchParams, origin } = url;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const typeParam = searchParams.get("type");
  const error = searchParams.get("error");
  const errorCode = searchParams.get("error_code");
  const next = searchParams.get("next") ?? "/dashboard";
  const safeNext = next.startsWith("/") ? next : "/dashboard";

  if (error || errorCode) {
    return NextResponse.redirect(`${origin}/sign-in?authError=1`);
  }

  const supabase = await createSupabaseServerClient();

  try {
    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        throw exchangeError;
      }
    } else if (tokenHash && typeParam) {
      const allowedTypes: EmailOtpType[] = [
        "signup",
        "magiclink",
        "invite",
        "recovery",
        "email_change",
        "email",
      ];
      const type = typeParam as EmailOtpType;

      if (!allowedTypes.includes(type)) {
        throw new Error("Invalid auth token type");
      }

      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });

      if (verifyError) {
        throw verifyError;
      }
    }
  } catch {
    return NextResponse.redirect(`${origin}/sign-in?authError=1`);
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
