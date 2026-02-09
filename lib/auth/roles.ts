import type { Database } from "@/types/db";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export function isApprovedBidder(profile: Profile | null | undefined) {
  return Boolean(profile && profile.approval_status === "approved");
}

export function isApprovedSeller(profile: Profile | null | undefined) {
  return Boolean(
    profile &&
      profile.approval_status === "approved" &&
      profile.seller_status === "approved",
  );
}

export function isAdmin(profile: Profile | null | undefined) {
  return Boolean(profile?.is_admin);
}
