import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/utils/errors";
import { isAdmin, isApprovedBidder, isApprovedSeller } from "@/lib/auth/roles";
import type { Database } from "@/types/db";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type AuthContext = {
  user: { id: string; email?: string };
  profile: Profile;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
};

export async function getAuthContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new AppError(userError.message, 401);
  }

  if (!user) {
    return { user: null, profile: null, supabase };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError) {
    throw new AppError(profileError.message, 500);
  }

  if (!profile) {
    throw new AppError("Profile not found", 403);
  }

  return {
    user: { id: user.id, email: user.email ?? undefined },
    profile,
    supabase,
  };
}

export async function requireAuthContext(): Promise<AuthContext> {
  const context = await getAuthContext();

  if (!context.user || !context.profile) {
    throw new AppError("Unauthorized", 401);
  }

  return context as AuthContext;
}

export async function requireApprovedBidderContext(): Promise<AuthContext> {
  const context = await requireAuthContext();

  if (!isApprovedBidder(context.profile)) {
    throw new AppError("Your account is not approved for bidding", 403);
  }

  return context;
}

export async function requireSellerContext(): Promise<AuthContext> {
  const context = await requireAuthContext();

  if (!isApprovedSeller(context.profile)) {
    throw new AppError("Seller access is required", 403);
  }

  return context;
}

export async function requireAdminContext(): Promise<AuthContext> {
  const context = await requireAuthContext();

  if (!isAdmin(context.profile)) {
    throw new AppError("Admin access is required", 403);
  }

  return context;
}

export async function requireAuthPage() {
  const context = await getAuthContext();
  if (!context.user || !context.profile) {
    redirect("/sign-in");
  }

  return context as AuthContext;
}

export async function requireSellerPage() {
  const context = await requireAuthPage();
  if (!isApprovedSeller(context.profile)) {
    redirect("/dashboard");
  }

  return context;
}

export async function requireAdminPage() {
  const context = await requireAuthPage();
  if (!isAdmin(context.profile)) {
    redirect("/dashboard");
  }

  return context;
}
