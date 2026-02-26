import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCloudflareLiveInputStatus, toCloudflarePlaybackUrl } from "@/lib/livestream/cloudflare";
import {
  assertAuctionJoinable,
  countActiveViewers,
  isActiveViewer,
  loadLiveSessionByAuction,
  resolveParticipantId,
  touchSession,
} from "@/lib/livestream/server";

function safeToPlaybackUrl(playbackId: string | null | undefined) {
  if (!playbackId) {
    return null;
  }

  try {
    return toCloudflarePlaybackUrl(playbackId);
  } catch {
    return null;
  }
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const [session, canHostResult] = await Promise.all([
      loadLiveSessionByAuction(id),
      user
        ? supabase.rpc("can_stream_auction", {
            p_auction_id: id,
            p_user_id: user.id,
          })
        : Promise.resolve({ data: false, error: null }),
    ]);

    if (canHostResult.error) {
      throw new Error(canHostResult.error.message);
    }

    let viewerCount = 0;
    if (session?.id) {
      viewerCount = await countActiveViewers(session.id);
    }

    const isHost = Boolean(user?.id && session?.host_user_id && user.id === session.host_user_id);
    const playbackUrl = safeToPlaybackUrl(session?.mux_playback_id);
    const statusInputId = session?.mux_live_stream_id ?? session?.mux_playback_id ?? null;
    let muxStatus: "active" | "idle" | "disabled" | null = null;
    if (statusInputId) {
      try {
        muxStatus = await getCloudflareLiveInputStatus(statusInputId);
      } catch {
        muxStatus = null;
      }
    }

    const providerIsLive = muxStatus === "active";

    return NextResponse.json({
      ok: true,
      data: {
        has_active_stream: Boolean(session),
        stream_ready: providerIsLive,
        can_view: true,
        can_host: Boolean(canHostResult.data),
        session: session
          ? {
              id: session.id,
              auction_id: session.auction_id,
              host_user_id: session.host_user_id,
              is_live: session.is_live,
              started_at: session.started_at,
              ended_at: session.ended_at,
              audio_enabled: session.audio_enabled,
              max_viewers: session.max_viewers,
              mux_live_stream_id: session.mux_live_stream_id,
              mux_playback_id: session.mux_playback_id,
              mux_latency_mode: session.mux_latency_mode,
              playback_url: playbackUrl,
              mux_status: muxStatus,
              viewer_count: viewerCount,
            }
          : null,
        host_controls:
          session && isHost
            ? {
                mux_stream_key: session.mux_stream_key,
                mux_ingest_url: session.mux_ingest_url,
              }
            : null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load livestream" },
      { status: 400 },
    );
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { participantId } = await resolveParticipantId(
      typeof body?.participant_id === "string" ? body.participant_id : null,
    );
    const admin = createSupabaseAdminClient() as any;

    await assertAuctionJoinable(id);

    const session = await loadLiveSessionByAuction(id);
    if (!session) {
      throw new Error("No active livestream for this auction");
    }

    let activeCount = await countActiveViewers(session.id);

    if (participantId !== session.host_user_id) {
      const alreadyActive = await isActiveViewer(session.id, participantId);
      if (!alreadyActive && activeCount >= session.max_viewers) {
        throw new Error("Livestream is full. Please try again shortly.");
      }

      const nowIso = new Date().toISOString();
      const { error: upsertError } = await admin.from("auction_livestream_viewers").upsert(
        {
          session_id: session.id,
          viewer_user_id: participantId,
          joined_at: nowIso,
          last_seen: nowIso,
          left_at: null,
        },
        {
          onConflict: "session_id,viewer_user_id",
        },
      );

      if (upsertError) {
        throw new Error(upsertError.message);
      }
    }

    await touchSession(session.id);
    activeCount = await countActiveViewers(session.id);

    if (!session.mux_playback_id) {
      throw new Error("Livestream is still preparing. Please try again in a few seconds.");
    }

    const statusInputId = session.mux_live_stream_id ?? session.mux_playback_id;
    if (!statusInputId) {
      throw new Error("Livestream is still preparing. Please try again in a few seconds.");
    }

    let streamStatus: "active" | "idle" | "disabled" | null = null;
    try {
      streamStatus = await getCloudflareLiveInputStatus(statusInputId);
    } catch {
      streamStatus = null;
    }

    if (streamStatus === "disabled") {
      throw new Error("Livestream is currently unavailable. Please ask the host to restart it.");
    }

    const playbackUrl = safeToPlaybackUrl(session.mux_playback_id);
    if (!playbackUrl) {
      throw new Error(
        "Livestream playback URL is unavailable. Set CLOUDFLARE_STREAM_CUSTOMER_CODE and try again.",
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        session_id: session.id,
        auction_id: session.auction_id,
        host_user_id: session.host_user_id,
        viewer_user_id: participantId,
        audio_enabled: session.audio_enabled,
        max_viewers: session.max_viewers,
        viewer_count: activeCount,
        started_at: session.started_at,
        is_live: session.is_live,
        stream_ready: streamStatus === "active",
        mux_playback_id: session.mux_playback_id,
        playback_url: playbackUrl,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to join livestream" },
      { status: 400 },
    );
  }
}
