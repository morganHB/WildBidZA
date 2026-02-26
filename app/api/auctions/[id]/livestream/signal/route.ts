import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { livestreamSignalSchema } from "@/lib/validation/livestream";
import {
  assertHostSender,
  isJoinedViewer,
  isUuid,
  loadLiveSessionById,
  resolveParticipantId,
  touchSession,
  touchViewerPresence,
} from "@/lib/livestream/server";

function parseSince(input: string | null) {
  if (!input) {
    return new Date(Date.now() - 60_000).toISOString();
  }

  const timestamp = Date.parse(input);
  if (Number.isNaN(timestamp)) {
    return new Date(Date.now() - 60_000).toISOString();
  }

  return new Date(timestamp).toISOString();
}

async function assertParticipant(params: {
  sessionId: string;
  hostUserId: string;
  participantId: string;
}) {
  const { sessionId, hostUserId, participantId } = params;
  if (participantId === hostUserId) {
    return true;
  }

  return isJoinedViewer(sessionId, participantId);
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: auctionId } = await context.params;
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("session_id") ?? "";
    const participantFromQuery = url.searchParams.get("participant_id");

    if (!isUuid(sessionId)) {
      return NextResponse.json({ ok: false, error: "session_id is required" }, { status: 400 });
    }

    const { participantId, authUserId } = await resolveParticipantId(participantFromQuery);
    const session = await loadLiveSessionById(sessionId);
    if (!session || session.auction_id !== auctionId) {
      throw new Error("Livestream session is not active");
    }

    if (participantId === session.host_user_id && authUserId !== session.host_user_id) {
      throw new Error("Only the authenticated host can read host livestream signals");
    }

    const canRead = await assertParticipant({
      sessionId: session.id,
      hostUserId: session.host_user_id,
      participantId,
    });

    if (!canRead) {
      throw new Error("Participant is not active in this livestream");
    }

    if (participantId !== session.host_user_id) {
      await touchViewerPresence(session.id, participantId);
    }

    const sinceIso = parseSince(url.searchParams.get("since"));
    const admin = createSupabaseAdminClient() as any;
    const { data, error } = await admin
      .from("auction_livestream_signals")
      .select("id,session_id,from_user_id,to_user_id,signal_type,payload,created_at")
      .eq("session_id", session.id)
      .eq("to_user_id", participantId)
      .gt("created_at", sinceIso)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      ok: true,
      data: {
        items: data ?? [],
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load livestream signals" },
      { status: 400 },
    );
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: auctionId } = await context.params;
    const body = await request.json();
    const parsed = livestreamSignalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid signal payload" },
        { status: 400 },
      );
    }

    const { participantId, authUserId } = await resolveParticipantId(parsed.data.participant_id ?? null);
    const session = await loadLiveSessionById(parsed.data.session_id);
    if (!session || session.auction_id !== auctionId) {
      throw new Error("Livestream session is not active");
    }

    assertHostSender({
      sessionHostUserId: session.host_user_id,
      participantId,
      authUserId,
    });

    const senderIsActive = await assertParticipant({
      sessionId: session.id,
      hostUserId: session.host_user_id,
      participantId,
    });

    if (!senderIsActive) {
      throw new Error("Sender is not an active participant in this session");
    }

    const admin = createSupabaseAdminClient() as any;
    const { data, error } = await admin
      .from("auction_livestream_signals")
      .insert({
        session_id: session.id,
        from_user_id: participantId,
        to_user_id: parsed.data.to_user_id,
        signal_type: parsed.data.signal_type,
        payload: parsed.data.payload ?? {},
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to publish signal");
    }

    if (participantId !== session.host_user_id) {
      await touchViewerPresence(session.id, participantId);
    }

    await touchSession(session.id);

    return NextResponse.json({ ok: true, data: { signal_id: data.id } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to publish signal" },
      { status: 400 },
    );
  }
}
