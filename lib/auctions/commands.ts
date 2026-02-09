import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CreateAuctionInput, UpdateAuctionInput } from "@/lib/validation/auction";
import type { SettingsUpdateInput } from "@/lib/validation/settings";

export async function createAuction(sellerId: string, payload: CreateAuctionInput) {
  const supabase = await createSupabaseServerClient();

  const { images, min_increment, ...auctionPayload } = payload;

  const { data: settings } = await supabase.from("settings").select("default_min_increment").eq("id", 1).single();

  const { data: auction, error } = await supabase
    .from("auctions")
    .insert({
      ...auctionPayload,
      seller_id: sellerId,
      min_increment: min_increment ?? settings?.default_min_increment ?? 100,
    })
    .select("id")
    .single();

  if (error || !auction) {
    throw new Error(error?.message ?? "Failed to create auction");
  }

  if (images.length > 0) {
    const { error: imageError } = await supabase.rpc("upsert_auction_images", {
      p_auction_id: auction.id,
      p_images: images,
    });

    if (imageError) {
      throw new Error(imageError.message);
    }
  }

  return auction.id;
}

export async function updateAuction(sellerId: string, auctionId: string, payload: UpdateAuctionInput) {
  const supabase = await createSupabaseServerClient();

  const { images, ...auctionPayload } = payload;

  const { error } = await supabase
    .from("auctions")
    .update({ ...auctionPayload, updated_at: new Date().toISOString() })
    .eq("id", auctionId)
    .eq("seller_id", sellerId);

  if (error) {
    throw new Error(error.message);
  }

  if (images) {
    const { error: imageError } = await supabase.rpc("upsert_auction_images", {
      p_auction_id: auctionId,
      p_images: images,
    });

    if (imageError) {
      throw new Error(imageError.message);
    }
  }
}

export async function placeBid(auctionId: string, amount: number) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("place_bid", {
    p_auction_id: auctionId,
    p_amount: amount,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function setFavorite(auctionId: string, userId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("favorites").upsert({ user_id: userId, auction_id: auctionId });

  if (error) {
    throw new Error(error.message);
  }
}

export async function removeFavorite(auctionId: string, userId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("favorites").delete().eq("user_id", userId).eq("auction_id", auctionId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateSettings(payload: SettingsUpdateInput, actorId: string) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("settings")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", 1);

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("audit_log").insert({
    actor_id: actorId,
    action: "settings.updated",
    target_type: "settings",
    target_id: "1",
    metadata: payload,
  });
}

export async function adminUpdateUserStatus(params: {
  actorId: string;
  userId: string;
  approval_status?: "pending" | "approved" | "rejected";
  seller_status?: "none" | "approved";
  is_admin?: boolean;
}) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      ...(params.approval_status ? { approval_status: params.approval_status } : {}),
      ...(params.seller_status ? { seller_status: params.seller_status } : {}),
      ...(typeof params.is_admin === "boolean" ? { is_admin: params.is_admin } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.userId);

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("audit_log").insert({
    actor_id: params.actorId,
    action: "profiles.updated",
    target_type: "profile",
    target_id: params.userId,
    metadata: {
      approval_status: params.approval_status,
      seller_status: params.seller_status,
      is_admin: params.is_admin,
    },
  });
}

export async function adminCreateCategory(actorId: string, payload: { name: string; description?: string | null }) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("animal_categories")
    .insert({ name: payload.name, description: payload.description ?? null })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("audit_log").insert({
    actor_id: actorId,
    action: "category.created",
    target_type: "animal_category",
    target_id: data.id,
    metadata: payload,
  });

  return data;
}

export async function adminUpdateCategory(
  actorId: string,
  categoryId: string,
  payload: { name?: string; description?: string | null; is_active?: boolean },
) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("animal_categories").update(payload).eq("id", categoryId);

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("audit_log").insert({
    actor_id: actorId,
    action: "category.updated",
    target_type: "animal_category",
    target_id: categoryId,
    metadata: payload,
  });
}

export async function adminModerateAuction(
  actorId: string,
  auctionId: string,
  payload: { is_active?: boolean; is_moderated?: boolean; status?: "upcoming" | "live" | "ended" },
) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("auctions")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", auctionId);

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("audit_log").insert({
    actor_id: actorId,
    action: "auction.moderated",
    target_type: "auction",
    target_id: auctionId,
    metadata: payload,
  });
}

export async function createSignedUploadUrl(params: {
  sellerId: string;
  auctionId?: string;
  fileName: string;
  contentType: string;
}) {
  const admin = createSupabaseAdminClient();
  const safeName = params.fileName.toLowerCase().replace(/[^a-z0-9._-]/g, "-");
  const folderAuctionId = params.auctionId ?? "draft";
  const path = `${params.sellerId}/${folderAuctionId}/${Date.now()}-${safeName}`;

  const { data, error } = await admin.storage.from("auction-images").createSignedUploadUrl(path);

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create upload URL");
  }

  return {
    path,
    token: data.token,
  };
}

export async function finalizeUploadedImage(path: string) {
  const supabase = await createSupabaseServerClient();

  const { data } = supabase.storage.from("auction-images").getPublicUrl(path);

  return data.publicUrl;
}
