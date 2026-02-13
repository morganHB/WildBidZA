import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { livestreamSessionSchema } from "@/lib/validation/livestream";
import { loadLiveSessionById, resolveParticipantId, touchSession } from "@/lib/livestream/server";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: auctionId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const parsed = livestreamSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid heartbeat payload" },
        { status: 400 },
      );
    }

    const { participantId } = await resolveParticipantId(parsed.data.participant_id ?? null);
    const session = await loadLiveSessionById(parsed.data.session_id);
    if (!session || session.auction_id !== auctionId) {
      throw new Error("Livestream session is not active");
    }

    await touchSession(session.id);

    if (participantId !== session.host_user_id) {
      const admin = createSupabaseAdminClient() as any;
      const { error } = await admin
        .from("auction_livestream_viewers")
        .update({ last_seen: new Date().toISOString() })
        .eq("session_id", session.id)
        .eq("viewer_user_id", participantId)
        .is("left_at", null);

      if (error) {
        throw new Error(error.message);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to send heartbeat" },
      { status: 400 },
    );
  }
}
