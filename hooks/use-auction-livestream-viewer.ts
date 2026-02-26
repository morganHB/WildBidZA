"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ViewerStatus = "idle" | "connecting" | "live" | "ended" | "error";

type JoinResponse = {
  session_id: string;
  auction_id: string;
  host_user_id: string;
  viewer_user_id: string;
  audio_enabled: boolean;
  max_viewers: number;
  viewer_count: number;
  started_at: string;
  is_live: boolean;
  stream_ready?: boolean;
  playback_url: string;
  mux_playback_id: string;
};

type SessionStateResponse = {
  has_active_stream: boolean;
  stream_ready?: boolean;
  session: {
    id: string;
    viewer_count: number;
    playback_url: string | null;
  } | null;
};

const VIEWER_PARTICIPANT_KEY = "wildbid_livestream_participant_id";
const HEARTBEAT_INTERVAL_MS = 15_000;
const STATE_REFRESH_INTERVAL_MS = 10_000;
const RECONNECT_BASE_DELAY_MS = 2_000;
const RECONNECT_MAX_DELAY_MS = 10_000;

function getReconnectDelayMs(attempt: number) {
  return Math.min(RECONNECT_MAX_DELAY_MS, RECONNECT_BASE_DELAY_MS * Math.max(1, attempt));
}

function isUuid(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getViewerParticipantId() {
  if (typeof window === "undefined") {
    return null;
  }

  const existing = window.sessionStorage.getItem(VIEWER_PARTICIPANT_KEY);
  if (isUuid(existing)) {
    return existing;
  }

  const nextId = crypto.randomUUID();
  window.sessionStorage.setItem(VIEWER_PARTICIPANT_KEY, nextId);
  return nextId;
}

function toUserErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  if (/auth session missing|unauthorized/i.test(message)) {
    return "Unable to authenticate this stream request.";
  }
  if (
    /host encoder is not live|still preparing|temporarily unavailable|request failed|unknown error|no active livestream/i.test(
      message,
    )
  ) {
    return "Waiting for host video feed...";
  }
  return message || fallback;
}

function shouldAutoReconnect(message: string) {
  const normalized = message.toLowerCase();
  return !(
    normalized.includes("auction has ended")
    || normalized.includes("livestream has ended")
    || normalized.includes("no active livestream")
    || normalized.includes("unable to authenticate")
    || normalized.includes("unauthorized")
  );
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
    error: "Failed to load livestream state",
  }))) as { ok: boolean; error?: string; data?: SessionStateResponse };

  if (!response.ok || !payload.ok || !payload.data) {
    throw new Error(payload.error ?? "Failed to load livestream state");
  }

  return payload.data;
}

export function useAuctionLivestreamViewer({
  auctionId,
  enabled,
}: {
  auctionId: string;
  userId?: string;
  enabled: boolean;
}) {
  const [status, setStatus] = useState<ViewerStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [streamReady, setStreamReady] = useState(false);

  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveSessionRef = useRef<string | null>(null);
  const retryAttemptRef = useRef(0);

  useEffect(() => {
    setParticipantId(getViewerParticipantId());
  }, []);

  const clearTimers = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }

    if (stateRefreshRef.current) {
      clearInterval(stateRefreshRef.current);
      stateRefreshRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const cleanup = useCallback((sendLeave: boolean) => {
    clearTimers();

    if (sendLeave && leaveSessionRef.current && participantId) {
      void postJson(`/api/auctions/${auctionId}/livestream/leave`, {
        session_id: leaveSessionRef.current,
        participant_id: participantId,
      }).catch(() => undefined);
    }

    leaveSessionRef.current = null;
    setSessionId(null);
    setPlaybackUrl(null);
    setStreamReady(false);
  }, [auctionId, clearTimers, participantId]);

  useEffect(() => {
    if (!enabled || !auctionId || !participantId) {
      cleanup(true);
      retryAttemptRef.current = 0;
      setStatus("idle");
      setError(null);
      setViewerCount(0);
      setStreamReady(false);
      return;
    }

    let cancelled = false;

    const scheduleReconnect = (reason: string) => {
      if (cancelled || reconnectTimeoutRef.current) {
        return;
      }

      const attempt = retryAttemptRef.current + 1;
      retryAttemptRef.current = attempt;
      const delay = getReconnectDelayMs(attempt);

      setStatus("connecting");
      if (/auction has ended|livestream has ended/i.test(reason.toLowerCase())) {
        setError(reason);
      } else {
        setError("Waiting for host video feed...");
      }

      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        if (!cancelled) {
          void boot();
        }
      }, delay);
    };

    const handleFailure = (streamError: unknown, fallbackMessage: string) => {
      const message = toUserErrorMessage(streamError, fallbackMessage);
      cleanup(false);

      if (shouldAutoReconnect(message)) {
        scheduleReconnect(message);
        return;
      }

      setStatus("error");
      setError(message);
    };

    const refreshState = async () => {
      if (!leaveSessionRef.current) {
        return;
      }

      try {
        const state = await fetchLivestreamState(auctionId);
        if (!state.has_active_stream || !state.session) {
          setStatus("ended");
          setError("Livestream has ended.");
          cleanup(false);
          return;
        }

        setViewerCount(state.session.viewer_count ?? 0);
        if (state.session.playback_url) {
          setPlaybackUrl(state.session.playback_url);
        }

        const ready = Boolean(state.stream_ready);
        setStreamReady(ready);
        if (ready) {
          setStatus("live");
          setError(null);
        } else {
          setStatus("connecting");
          setError("Waiting for host stream to connect...");
        }
      } catch {
        // Ignore transient refresh failures.
      }
    };

    const boot = async () => {
      try {
        setStatus("connecting");
        setError(null);

        const joinPayload = (await postJson(`/api/auctions/${auctionId}/livestream`, {
          participant_id: participantId,
        })) as { ok: true; data: JoinResponse };

        if (cancelled) {
          return;
        }

        const joined = joinPayload.data;
        if (!joined.playback_url) {
          throw new Error("Livestream playback URL is unavailable");
        }

        retryAttemptRef.current = 0;
        leaveSessionRef.current = joined.session_id;
        setSessionId(joined.session_id);
        setViewerCount(joined.viewer_count ?? 0);
        setPlaybackUrl(joined.playback_url);
        const ready = Boolean(joined.stream_ready);
        setStreamReady(ready);
        if (ready) {
          setStatus("live");
          setError(null);
        } else {
          setStatus("connecting");
          setError("Waiting for host stream to connect...");
        }

        heartbeatRef.current = setInterval(() => {
          if (!leaveSessionRef.current) {
            return;
          }

          void postJson(`/api/auctions/${auctionId}/livestream/heartbeat`, {
            session_id: leaveSessionRef.current,
            participant_id: participantId,
          }).catch(() => undefined);
        }, HEARTBEAT_INTERVAL_MS);

        stateRefreshRef.current = setInterval(() => {
          void refreshState();
        }, STATE_REFRESH_INTERVAL_MS);

        void refreshState();
      } catch (streamError) {
        if (!cancelled) {
          handleFailure(streamError, "Failed to connect to livestream");
        }
      }
    };

    void boot();

    return () => {
      cancelled = true;
      cleanup(true);
    };
  }, [auctionId, cleanup, enabled, participantId]);

  return {
    status,
    error,
    playbackUrl,
    streamReady,
    viewerCount,
    sessionId,
  };
}
