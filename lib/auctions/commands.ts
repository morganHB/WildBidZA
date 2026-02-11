import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  CreateAuctionInput,
  CreatePacketSeriesInput,
  UpdateAuctionInput,
} from "@/lib/validation/auction";
import type { SettingsUpdateInput } from "@/lib/validation/settings";

export async function createAuction(sellerId: string, payload: CreateAuctionInput) {
  const supabase = await createSupabaseServerClient();

  const { images, videos, min_increment, duration_minutes, start_time, ...auctionPayload } = payload;

  const { data: settings } = await supabase.from("settings").select("default_min_increment").eq("id", 1).single();
  const safeDuration = Math.max(10, Math.min(10080, Number(duration_minutes)));
  const computedStart = start_time ? new Date(start_time) : new Date();
  const startIso = computedStart.toISOString();
  const endIso = new Date(computedStart.getTime() + safeDuration * 60_000).toISOString();

  const { data: auction, error } = await supabase
    .from("auctions")
    .insert({
      ...auctionPayload,
      seller_id: sellerId,
      min_increment: min_increment ?? settings?.default_min_increment ?? 100,
      duration_minutes: safeDuration,
      start_time: startIso,
      end_time: endIso,
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

  if (videos.length > 0) {
    const { error: videoError } = await supabase.rpc("upsert_auction_videos", {
      p_auction_id: auction.id,
      p_videos: videos,
    });

    if (videoError) {
      throw new Error(videoError.message);
    }
  }

  return auction.id;
}

export async function updateAuction(sellerId: string, auctionId: string, payload: UpdateAuctionInput) {
  const supabase = await createSupabaseServerClient();

  const { images, videos, start_time, duration_minutes, ...auctionPayload } = payload;

  const { data: existing, error: existingError } = await supabase
    .from("auctions")
    .select("id,start_time,duration_minutes,status,seller_id")
    .eq("id", auctionId)
    .single();

  if (existingError || !existing) {
    throw new Error(existingError?.message ?? "Auction not found");
  }

  if (existing.seller_id !== sellerId) {
    throw new Error("Not authorized to update this listing");
  }

  const updatePayload: Record<string, unknown> = {
    ...auctionPayload,
    updated_at: new Date().toISOString(),
  };

  const shouldRecomputeWindow = existing.status !== "ended" && (Boolean(start_time) || typeof duration_minutes === "number");

  if (shouldRecomputeWindow) {
    const nextStart = start_time ? new Date(start_time) : new Date(existing.start_time);
    const nextDuration = Math.max(
      10,
      Math.min(10080, Number(duration_minutes ?? existing.duration_minutes ?? 60)),
    );

    updatePayload.start_time = nextStart.toISOString();
    updatePayload.end_time = new Date(nextStart.getTime() + nextDuration * 60_000).toISOString();
    updatePayload.duration_minutes = nextDuration;
  } else if (typeof duration_minutes === "number") {
    updatePayload.duration_minutes = Math.max(10, Math.min(10080, Number(duration_minutes)));
  }

  const { error } = await supabase
    .from("auctions")
    .update(updatePayload)
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

  if (videos) {
    const { error: videoError } = await supabase.rpc("upsert_auction_videos", {
      p_auction_id: auctionId,
      p_videos: videos,
    });

    if (videoError) {
      throw new Error(videoError.message);
    }
  }
}

export async function createPacketSeries(payload: CreatePacketSeriesInput) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("create_packet_series", {
    p_payload: payload,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as { series_id: string; auction_ids: string[] };
}

export async function activateNextPacket(params: {
  auctionId: string;
  actorId: string;
  isAdmin: boolean;
}) {
  const supabase = await createSupabaseServerClient();

  const { data: auction, error: auctionError } = await supabase
    .from("auctions")
    .select("id,seller_id,status")
    .eq("id", params.auctionId)
    .single();

  if (auctionError || !auction) {
    throw new Error(auctionError?.message ?? "Auction not found");
  }

  if (!params.isAdmin && auction.seller_id !== params.actorId) {
    throw new Error("Not authorized to activate the next packet");
  }

  if (auction.status !== "ended") {
    throw new Error("Current packet must be ended before starting the next packet");
  }

  const { data: nextPacket, error: nextPacketError } = await supabase
    .from("auctions")
    .select("id")
    .eq("previous_packet_auction_id", params.auctionId)
    .eq("is_waiting_for_previous", true)
    .eq("is_active", true)
    .order("packet_sequence", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (nextPacketError) {
    throw new Error(nextPacketError.message);
  }

  if (!nextPacket) {
    throw new Error("No waiting next packet found");
  }

  const { data, error } = await supabase.rpc("activate_packet", {
    p_auction_id: nextPacket.id,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
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
  role_group?: "user" | "marketer";
  is_admin?: boolean;
}) {
  const supabase = await createSupabaseServerClient();

  const sellerStatusFromRole =
    params.role_group === "marketer"
      ? "approved"
      : params.role_group === "user"
        ? "none"
        : undefined;

  const roleGroupFromSellerStatus =
    params.seller_status === "approved"
      ? "marketer"
      : params.seller_status === "none"
        ? "user"
        : undefined;

  const sellerStatusToPersist = params.seller_status ?? sellerStatusFromRole;
  const roleGroupToPersist = params.role_group ?? roleGroupFromSellerStatus;

  const { error } = await supabase
    .from("profiles")
    .update({
      ...(params.approval_status ? { approval_status: params.approval_status } : {}),
      ...(sellerStatusToPersist ? { seller_status: sellerStatusToPersist } : {}),
      ...(roleGroupToPersist ? { role_group: roleGroupToPersist } : {}),
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
      seller_status: sellerStatusToPersist,
      role_group: roleGroupToPersist,
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
