import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIVE_VIEWER_WINDOW_MS = 120_000;

export function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

export function activeViewerThresholdIso() {
  return new Date(Date.now() - ACTIVE_VIEWER_WINDOW_MS).toISOString();
}

export async function getOptionalAuthUserId() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function resolveParticipantId(rawParticipantId?: string | null) {
  const requestedParticipantId = rawParticipantId?.trim();
  const authUserId = await getOptionalAuthUserId();
  if (authUserId) {
    if (requestedParticipantId && isUuid(requestedParticipantId)) {
      // Allow per-device/per-tab participant IDs for authenticated viewers so
      // multiple viewers can join simultaneously with the same account.
      return { participantId: requestedParticipantId, authUserId };
    }

    return { participantId: authUserId, authUserId };
  }

  if (!requestedParticipantId || !isUuid(requestedParticipantId)) {
    throw new Error("Guest viewers must include a valid participant_id");
  }

  return { participantId: requestedParticipantId, authUserId: null as string | null };
}

export async function loadLiveSessionByAuction(auctionId: string) {
  const admin = createSupabaseAdminClient() as any;
  const { data, error } = await admin
    .from("auction_livestream_sessions")
    .select("id,auction_id,host_user_id,is_live,started_at,ended_at,audio_enabled,max_viewers,created_at,updated_at")
    .eq("auction_id", auctionId)
    .eq("is_live", true)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function loadLiveSessionById(sessionId: string) {
  const admin = createSupabaseAdminClient() as any;
  const { data, error } = await admin
    .from("auction_livestream_sessions")
    .select("id,auction_id,host_user_id,is_live,started_at,ended_at,audio_enabled,max_viewers,created_at,updated_at")
    .eq("id", sessionId)
    .eq("is_live", true)
    .is("ended_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function assertAuctionJoinable(auctionId: string) {
  const admin = createSupabaseAdminClient() as any;
  const { data: auction, error } = await admin
    .from("auctions")
    .select("id,is_active,is_moderated,status,start_time,end_time")
    .eq("id", auctionId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!auction || !auction.is_active || auction.is_moderated) {
    throw new Error("Auction not found or unavailable");
  }

  const now = Date.now();
  if (auction.status === "ended" || new Date(auction.end_time).getTime() <= now) {
    throw new Error("Auction has ended");
  }

  return auction;
}

export async function countActiveViewers(sessionId: string) {
  const admin = createSupabaseAdminClient() as any;
  const threshold = activeViewerThresholdIso();
  const { count, error } = await admin
    .from("auction_livestream_viewers")
    .select("viewer_user_id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .is("left_at", null)
    .gte("last_seen", threshold);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function isActiveViewer(sessionId: string, viewerId: string) {
  const admin = createSupabaseAdminClient() as any;
  const threshold = activeViewerThresholdIso();
  const { data, error } = await admin
    .from("auction_livestream_viewers")
    .select("viewer_user_id")
    .eq("session_id", sessionId)
    .eq("viewer_user_id", viewerId)
    .is("left_at", null)
    .gte("last_seen", threshold)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function isJoinedViewer(sessionId: string, viewerId: string) {
  const admin = createSupabaseAdminClient() as any;
  const { data, error } = await admin
    .from("auction_livestream_viewers")
    .select("viewer_user_id")
    .eq("session_id", sessionId)
    .eq("viewer_user_id", viewerId)
    .is("left_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function touchViewerPresence(sessionId: string, viewerId: string) {
  const admin = createSupabaseAdminClient() as any;
  const { error } = await admin
    .from("auction_livestream_viewers")
    .update({
      last_seen: new Date().toISOString(),
      left_at: null,
    })
    .eq("session_id", sessionId)
    .eq("viewer_user_id", viewerId)
    .is("left_at", null);

  if (error) {
    throw new Error(error.message);
  }
}

export async function touchSession(sessionId: string) {
  const admin = createSupabaseAdminClient() as any;
  const { error } = await admin
    .from("auction_livestream_sessions")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (error) {
    throw new Error(error.message);
  }
}

export function assertHostSender(params: {
  sessionHostUserId: string;
  participantId: string;
  authUserId: string | null;
}) {
  if (params.participantId !== params.sessionHostUserId) {
    return;
  }

  if (!params.authUserId || params.authUserId !== params.sessionHostUserId) {
    throw new Error("Only the authenticated host can send host livestream signals");
  }
}
