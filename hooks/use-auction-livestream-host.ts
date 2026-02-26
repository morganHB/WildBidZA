"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type HostStatus = "idle" | "starting" | "live" | "stopping" | "error";

type HostSession = {
  session_id: string;
  auction_id: string;
  host_user_id: string;
  audio_enabled: boolean;
  max_viewers: number;
  started_at: string;
  is_live: boolean;
  mux_live_stream_id: string | null;
  mux_playback_id: string | null;
  mux_stream_key: string | null;
  mux_ingest_url: string | null;
  mux_latency_mode: string | null;
  playback_url: string | null;
  mux_status: "active" | "idle" | "disabled" | null;
  playback_manifest_status?: number | null;
};

type StatePayload = {
  has_active_stream: boolean;
  stream_ready?: boolean;
  playback_manifest_status?: number | null;
  can_host: boolean;
  session: {
    id: string;
    auction_id: string;
    host_user_id: string;
    is_live: boolean;
    started_at: string;
    ended_at: string | null;
    audio_enabled: boolean;
    max_viewers: number;
    mux_live_stream_id: string | null;
    mux_playback_id: string | null;
    mux_latency_mode: string | null;
    playback_url: string | null;
    mux_status: "active" | "idle" | "disabled" | null;
    viewer_count: number;
  } | null;
  host_controls:
    | {
        mux_stream_key: string | null;
        mux_ingest_url: string | null;
      }
    | null;
};

const DEFAULT_MAX_VIEWERS = 250;
const REFRESH_INTERVAL_MS = 10_000;

function toUserErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  if (/auth session missing|unauthorized/i.test(message)) {
    return "Your session expired. Please sign in again.";
  }
  return message || fallback;
}

async function postJson(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({ ok: false, error: "Request failed" }));
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error ?? "Request failed");
  }

  return payload;
}

async function fetchLivestreamState(auctionId: string) {
  const response = await fetch(`/api/auctions/${auctionId}/livestream`, { cache: "no-store" });
  const payload = (await response.json().catch(() => ({
    ok: false,
    error: "Failed to load livestream",
  }))) as { ok: boolean; error?: string; data?: StatePayload };

  if (!response.ok || !payload.ok || !payload.data) {
    throw new Error(payload.error ?? "Failed to load livestream");
  }

  return payload.data;
}

function stopLivestreamRequest(auctionId: string, keepalive = false) {
  return fetch(`/api/seller/auctions/${auctionId}/livestream/stop`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
    keepalive,
  });
}

function toHostSession(state: StatePayload) {
  if (!state.session) {
    return null;
  }

  return {
    session_id: state.session.id,
    auction_id: state.session.auction_id,
    host_user_id: state.session.host_user_id,
    is_live: state.session.is_live,
    started_at: state.session.started_at,
    audio_enabled: state.session.audio_enabled,
    max_viewers: state.session.max_viewers,
    mux_live_stream_id: state.session.mux_live_stream_id,
    mux_playback_id: state.session.mux_playback_id,
    mux_stream_key: state.host_controls?.mux_stream_key ?? null,
    mux_ingest_url: state.host_controls?.mux_ingest_url ?? null,
    mux_latency_mode: state.session.mux_latency_mode,
    playback_url: state.session.playback_url,
    mux_status: state.session.mux_status,
    playback_manifest_status: state.playback_manifest_status ?? null,
  } satisfies HostSession;
}

export function useAuctionLivestreamHost({
  auctionId,
  userId,
  canHost,
}: {
  auctionId: string;
  userId: string;
  canHost: boolean;
}) {
  const [status, setStatus] = useState<HostStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<HostSession | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const applyState = useCallback((state: StatePayload) => {
    const mapped = toHostSession(state);
    setSession(mapped);
    setViewerCount(state.session?.viewer_count ?? 0);

    if (mapped) {
      setAudioEnabled(mapped.audio_enabled);
      setStatus("live");
      return;
    }

    setStatus("idle");
  }, []);

  const refreshState = useCallback(async () => {
    if (!canHost) {
      return;
    }

    try {
      const state = await fetchLivestreamState(auctionId);
      applyState(state);
    } catch {
      // Ignore transient refresh failures.
    }
  }, [applyState, auctionId, canHost]);

  useEffect(() => {
    if (!canHost) {
      return;
    }

    void refreshState();
  }, [canHost, refreshState]);

  useEffect(() => {
    clearRefreshTimer();
    if (!session) {
      return;
    }

    refreshTimerRef.current = setInterval(() => {
      void refreshState();
    }, REFRESH_INTERVAL_MS);

    return () => {
      clearRefreshTimer();
    };
  }, [clearRefreshTimer, refreshState, session]);

  useEffect(() => {
    return () => {
      clearRefreshTimer();
    };
  }, [clearRefreshTimer]);

  const start = useCallback(async () => {
    if (!canHost || status === "live" || status === "starting") {
      return;
    }

    setStatus("starting");
    setError(null);

    try {
      const payload = (await postJson(`/api/seller/auctions/${auctionId}/livestream/start`, {
        audio_enabled: audioEnabled,
        max_viewers: DEFAULT_MAX_VIEWERS,
      })) as {
        ok: true;
        data: {
          session_id: string;
          auction_id: string;
          host_user_id: string;
          audio_enabled: boolean;
          max_viewers: number;
          started_at: string;
          is_live: boolean;
          mux_live_stream_id: string | null;
          mux_playback_id: string | null;
          mux_stream_key: string | null;
          mux_ingest_url: string | null;
          mux_latency_mode: string | null;
          playback_url: string | null;
          playback_manifest_status?: number | null;
        };
      };

      const started = payload.data;
      setSession({
        session_id: started.session_id,
        auction_id: started.auction_id,
        host_user_id: started.host_user_id,
        audio_enabled: started.audio_enabled,
        max_viewers: started.max_viewers,
        started_at: started.started_at,
        is_live: started.is_live,
        mux_live_stream_id: started.mux_live_stream_id,
        mux_playback_id: started.mux_playback_id,
        mux_stream_key: started.mux_stream_key,
        mux_ingest_url: started.mux_ingest_url,
        mux_latency_mode: started.mux_latency_mode,
        playback_url: started.playback_url,
        mux_status: "idle",
        playback_manifest_status: started.playback_manifest_status ?? null,
      });
      setAudioEnabled(started.audio_enabled);
      setStatus("live");
      setViewerCount(0);

      void refreshState();
    } catch (startError) {
      setSession(null);
      setStatus("error");
      setError(toUserErrorMessage(startError, "Failed to start livestream"));
    }
  }, [audioEnabled, auctionId, canHost, refreshState, status]);

  const stop = useCallback(async () => {
    if (!session || status === "stopping") {
      return;
    }

    setStatus("stopping");

    try {
      const response = await stopLivestreamRequest(auctionId);
      const payload = await response.json().catch(() => ({ ok: false, error: "Failed to stop livestream" }));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Failed to stop livestream");
      }
    } catch (stopError) {
      setError(toUserErrorMessage(stopError, "Failed to stop livestream"));
    } finally {
      clearRefreshTimer();
      setSession(null);
      setViewerCount(0);
      setStatus("idle");
    }
  }, [auctionId, clearRefreshTimer, session, status]);

  const toggleMic = useCallback((enabled: boolean) => {
    setAudioEnabled(enabled);
  }, []);

  const connectionHealth = useMemo(() => {
    if (!session) {
      return "Offline";
    }

    if (session.host_user_id !== userId) {
      return "Active stream is owned by another host";
    }

    if (session.mux_status === "active") {
      if (session.playback_manifest_status === 204) {
        return "Encoder connected, no media output";
      }
      return "Live ingest connected";
    }

    if (session.mux_status === "idle") {
      return "Waiting for encoder";
    }

    if (session.mux_status === "disabled") {
      return "Stream disabled";
    }

    return "Checking stream status";
  }, [session, userId]);

  return {
    status,
    error,
    session,
    viewerCount,
    audioEnabled,
    toggleMic,
    start,
    stop,
    connectionHealth,
  };
}
