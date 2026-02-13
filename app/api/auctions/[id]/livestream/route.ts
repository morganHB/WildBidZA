import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  assertAuctionJoinable,
  countActiveViewers,
  isActiveViewer,
  loadLiveSessionByAuction,
  resolveParticipantId,
  touchSession,
} from "@/lib/livestream/server";

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

    return NextResponse.json({
      ok: true,
      data: {
        has_active_stream: Boolean(session),
        can_view: true,
        can_host: Boolean(canHostResult.data),
        session: session
          ? {
              ...session,
              viewer_count: viewerCount,
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
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to join livestream" },
      { status: 400 },
    );
  }
}
