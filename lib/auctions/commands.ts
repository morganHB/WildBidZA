import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  CreateAuctionInput,
  CreatePacketSeriesInput,
  UpdateAuctionInput,
} from "@/lib/validation/auction";
import type { InviteAuctionManagerInput } from "@/lib/validation/manager";
import type {
  LivestreamSessionInput,
  LivestreamSignalInput,
  StartLivestreamInput,
} from "@/lib/validation/livestream";
import type { SettingsUpdateInput } from "@/lib/validation/settings";
import {
  createMuxLiveStream,
  disableMuxLiveStream,
  isMuxConfigured,
  retrieveMuxLiveStream,
  toMuxPlaybackUrl,
} from "@/lib/livestream/mux";

async function canManageAuction(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  auctionId: string,
  userId: string,
) {
  const { data, error } = await supabase.rpc("can_manage_auction", {
    p_auction_id: auctionId,
    p_user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

async function canStreamAuction(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  auctionId: string,
  userId: string,
) {
  const { data, error } = await supabase.rpc("can_stream_auction", {
    p_auction_id: auctionId,
    p_user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

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

  const allowed = await canManageAuction(supabase, auctionId, sellerId);
  if (!allowed) {
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

  const { error } = await supabase.from("auctions").update(updatePayload).eq("id", auctionId);

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

  const canManage = await canManageAuction(supabase, params.auctionId, params.actorId);
  if (!params.isAdmin && !canManage) {
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

export async function listAuctionManagers(auctionId: string, actorId: string) {
  const supabase = await createSupabaseServerClient();
  const canManage = await canManageAuction(supabase, auctionId, actorId);

  if (!canManage) {
    throw new Error("Not authorized to view managers for this auction");
  }

  const { data, error } = await supabase
    .from("auction_managers")
    .select(
      `
      auction_id,
      manager_user_id,
      invited_by_user_id,
      can_edit,
      can_stream,
      created_at,
      profile:profiles!auction_managers_manager_user_id_fkey(
        id,
        display_name,
        email,
        role_group,
        is_admin,
        approval_status
      )
    `,
    )
    .eq("auction_id", auctionId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function listEligibleAuctionManagers(params: {
  auctionId: string;
  actorId: string;
  actorIsAdmin: boolean;
}) {
  const supabase = await createSupabaseServerClient();

  const { data: auction, error: auctionError } = await supabase
    .from("auctions")
    .select("id,seller_id")
    .eq("id", params.auctionId)
    .single();

  if (auctionError || !auction) {
    throw new Error(auctionError?.message ?? "Auction not found");
  }

  if (!params.actorIsAdmin && auction.seller_id !== params.actorId) {
    throw new Error("Only the auction owner or admin can invite managers");
  }

  const [{ data: candidates, error: candidateError }, { data: existingManagers, error: existingError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id,display_name,email,role_group,is_admin,approval_status")
        .eq("approval_status", "approved")
        .or("role_group.eq.marketer,is_admin.eq.true")
        .neq("id", auction.seller_id)
        .order("display_name", { ascending: true, nullsFirst: false })
        .order("email", { ascending: true }),
      supabase
        .from("auction_managers")
        .select("manager_user_id")
        .eq("auction_id", params.auctionId),
    ]);

  if (candidateError) {
    throw new Error(candidateError.message);
  }

  if (existingError) {
    throw new Error(existingError.message);
  }

  const taken = new Set((existingManagers ?? []).map((row) => row.manager_user_id));

  return (candidates ?? []).filter((candidate) => !taken.has(candidate.id));
}

export async function inviteAuctionManager(params: {
  auctionId: string;
  actorId: string;
  actorIsAdmin: boolean;
  payload: InviteAuctionManagerInput;
}) {
  const supabase = await createSupabaseServerClient();
  const { auctionId, actorId, actorIsAdmin, payload } = params;

  const { data: auction, error: auctionError } = await supabase
    .from("auctions")
    .select("id,seller_id")
    .eq("id", auctionId)
    .single();

  if (auctionError || !auction) {
    throw new Error(auctionError?.message ?? "Auction not found");
  }

  if (!actorIsAdmin && auction.seller_id !== actorId) {
    throw new Error("Only the auction owner or admin can invite managers");
  }

  if (payload.manager_user_id === auction.seller_id) {
    throw new Error("Auction owner already has full management access");
  }

  const { data: invitee, error: inviteeError } = await supabase
    .from("profiles")
    .select("id,approval_status,role_group,is_admin")
    .eq("id", payload.manager_user_id)
    .single();

  if (inviteeError || !invitee) {
    throw new Error("Invitee profile not found");
  }

  const eligible =
    invitee.approval_status === "approved" &&
    (invitee.is_admin || invitee.role_group === "marketer");

  if (!eligible) {
    throw new Error("Invitee must be an approved marketer or admin");
  }

  const { error } = await supabase.from("auction_managers").upsert({
    auction_id: auctionId,
    manager_user_id: payload.manager_user_id,
    invited_by_user_id: actorId,
    can_edit: payload.can_edit ?? true,
    can_stream: payload.can_stream ?? true,
  });

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("audit_log").insert({
    actor_id: actorId,
    action: "auction.manager_invited",
    target_type: "auction_manager",
    target_id: `${auctionId}:${payload.manager_user_id}`,
    metadata: {
      auction_id: auctionId,
      manager_user_id: payload.manager_user_id,
      can_edit: payload.can_edit ?? true,
      can_stream: payload.can_stream ?? true,
    },
  });
}

export async function revokeAuctionManager(params: {
  auctionId: string;
  actorId: string;
  actorIsAdmin: boolean;
  managerUserId: string;
}) {
  const supabase = await createSupabaseServerClient();

  const { data: auction, error: auctionError } = await supabase
    .from("auctions")
    .select("id,seller_id")
    .eq("id", params.auctionId)
    .single();

  if (auctionError || !auction) {
    throw new Error(auctionError?.message ?? "Auction not found");
  }

  if (!params.actorIsAdmin && auction.seller_id !== params.actorId) {
    throw new Error("Only the auction owner or admin can revoke managers");
  }

  const { error } = await supabase
    .from("auction_managers")
    .delete()
    .eq("auction_id", params.auctionId)
    .eq("manager_user_id", params.managerUserId);

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("audit_log").insert({
    actor_id: params.actorId,
    action: "auction.manager_revoked",
    target_type: "auction_manager",
    target_id: `${params.auctionId}:${params.managerUserId}`,
    metadata: {
      auction_id: params.auctionId,
      manager_user_id: params.managerUserId,
    },
  });
}

export async function startLivestream(params: {
  auctionId: string;
  actorId: string;
  payload: StartLivestreamInput;
}) {
  const supabase = await createSupabaseServerClient();
  const allowed = await canStreamAuction(supabase, params.auctionId, params.actorId);

  if (!allowed) {
    throw new Error("Not authorized to start livestream");
  }

  if (!isMuxConfigured()) {
    throw new Error("Mux is not configured. Set MUX_TOKEN_ID and MUX_TOKEN_SECRET.");
  }

  const { data, error } = await supabase.rpc("start_livestream", {
    p_auction_id: params.auctionId,
    p_audio_enabled: params.payload.audio_enabled ?? true,
    p_max_viewers: params.payload.max_viewers ?? 30,
  });

  if (error) {
    throw new Error(error.message);
  }

  const sessionId = (data as { session_id?: string } | null)?.session_id;
  if (!sessionId) {
    throw new Error("Livestream session was created without a session ID");
  }

  try {
    const admin = createSupabaseAdminClient() as any;
    const { data: sessionRow, error: sessionError } = await admin
      .from("auction_livestream_sessions")
      .select("id,mux_live_stream_id,mux_playback_id,mux_stream_key,mux_ingest_url,mux_latency_mode")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError) {
      throw new Error(sessionError.message);
    }

    if (!sessionRow) {
      throw new Error("Livestream session could not be loaded");
    }

    let muxLiveStreamId = sessionRow.mux_live_stream_id as string | null;
    let muxPlaybackId = sessionRow.mux_playback_id as string | null;
    let muxStreamKey = sessionRow.mux_stream_key as string | null;
    let muxIngestUrl = sessionRow.mux_ingest_url as string | null;
    const muxLatencyMode = (sessionRow.mux_latency_mode as string | null) ?? "reduced";

    if (muxLiveStreamId && (!muxPlaybackId || !muxStreamKey || !muxIngestUrl)) {
      try {
        const recovered = await retrieveMuxLiveStream(muxLiveStreamId);
        muxPlaybackId = recovered.playbackId;
        muxStreamKey = recovered.streamKey;
        muxIngestUrl =
          muxIngestUrl ?? process.env.MUX_RTMP_INGEST_URL?.trim() ?? "rtmp://global-live.mux.com:5222/app";
      } catch {
        muxLiveStreamId = null;
        muxPlaybackId = null;
        muxStreamKey = null;
        muxIngestUrl = null;
      }
    }

    if (!muxLiveStreamId || !muxPlaybackId || !muxStreamKey || !muxIngestUrl) {
      const createdMux = await createMuxLiveStream({
        latencyMode: "reduced",
        passthrough: params.auctionId,
      });

      muxLiveStreamId = createdMux.liveStreamId;
      muxPlaybackId = createdMux.playbackId;
      muxStreamKey = createdMux.streamKey;
      muxIngestUrl = createdMux.ingestUrl;

      const { error: updateError } = await admin
        .from("auction_livestream_sessions")
        .update({
          mux_live_stream_id: muxLiveStreamId,
          mux_playback_id: muxPlaybackId,
          mux_stream_key: muxStreamKey,
          mux_ingest_url: muxIngestUrl,
          mux_latency_mode: "reduced",
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (updateError) {
        throw new Error(updateError.message);
      }
    } else {
      const { error: updateError } = await admin
        .from("auction_livestream_sessions")
        .update({
          mux_playback_id: muxPlaybackId,
          mux_stream_key: muxStreamKey,
          mux_ingest_url: muxIngestUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (updateError) {
        throw new Error(updateError.message);
      }
    }

    return {
      ...(data as Record<string, unknown>),
      mux_live_stream_id: muxLiveStreamId,
      mux_playback_id: muxPlaybackId,
      mux_stream_key: muxStreamKey,
      mux_ingest_url: muxIngestUrl,
      mux_latency_mode: muxLatencyMode,
      playback_url: muxPlaybackId ? toMuxPlaybackUrl(muxPlaybackId) : null,
    };
  } catch (muxError) {
    try {
      await supabase.rpc("stop_livestream", {
        p_auction_id: params.auctionId,
      });
    } catch {
      // Ignore rollback failures.
    }

    throw muxError instanceof Error ? muxError : new Error("Failed to initialize Mux livestream");
  }
}

export async function stopLivestream(params: { auctionId: string; actorId: string }) {
  const supabase = await createSupabaseServerClient();
  const allowed = await canStreamAuction(supabase, params.auctionId, params.actorId);

  if (!allowed) {
    throw new Error("Not authorized to stop livestream");
  }

  const admin = createSupabaseAdminClient() as any;
  const { data: activeSession, error: activeSessionError } = await admin
    .from("auction_livestream_sessions")
    .select("id,mux_live_stream_id")
    .eq("auction_id", params.auctionId)
    .eq("is_live", true)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeSessionError) {
    throw new Error(activeSessionError.message);
  }

  if (activeSession?.mux_live_stream_id && isMuxConfigured()) {
    try {
      await disableMuxLiveStream(activeSession.mux_live_stream_id);
    } catch {
      // Do not block stop requests if the provider already ended or invalidated this stream.
    }
  }

  const { data, error } = await supabase.rpc("stop_livestream", {
    p_auction_id: params.auctionId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function joinLivestream(auctionId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("join_livestream", {
    p_auction_id: auctionId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function touchLivestreamViewer(payload: LivestreamSessionInput) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("touch_livestream_viewer", {
    p_session_id: payload.session_id,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function leaveLivestream(payload: LivestreamSessionInput) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("leave_livestream", {
    p_session_id: payload.session_id,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function publishLivestreamSignal(payload: LivestreamSignalInput) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("publish_livestream_signal", {
    p_session_id: payload.session_id,
    p_to_user_id: payload.to_user_id,
    p_signal_type: payload.signal_type,
    p_payload: payload.payload ?? {},
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
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
