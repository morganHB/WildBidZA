"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LIVESTREAM_ICE_CONFIG,
  toIceCandidate,
  toSessionDescription,
} from "@/lib/livestream/webrtc";

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
};

type LivestreamSignal = {
  id: string;
  session_id: string;
  from_user_id: string;
  to_user_id: string;
  signal_type: "offer" | "answer" | "ice_candidate" | "leave";
  payload: unknown;
  created_at: string;
};

const GUEST_PARTICIPANT_KEY = "wildbid_guest_livestream_participant_id";
const SIGNAL_POLL_INTERVAL_MS = 800;
const SIGNAL_SINCE_FLOOR_ISO = "1970-01-01T00:00:00.000Z";
const RECENT_SIGNAL_CACHE_SIZE = 500;

function nextSinceCursor(lastCreatedAt: string) {
  const timestamp = Date.parse(lastCreatedAt);
  if (Number.isNaN(timestamp)) {
    return lastCreatedAt;
  }

  return new Date(Math.max(0, timestamp - 1)).toISOString();
}

function isUuid(value: string | null | undefined) {
  if (!value) {
    return false;
  }
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getGuestParticipantId() {
  if (typeof window === "undefined") {
    return null;
  }

  const existing = window.localStorage.getItem(GUEST_PARTICIPANT_KEY);
  if (isUuid(existing)) {
    return existing;
  }

  const nextId = crypto.randomUUID();
  window.localStorage.setItem(GUEST_PARTICIPANT_KEY, nextId);
  return nextId;
}

function toUserErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  if (/auth session missing|unauthorized/i.test(message)) {
    return "Unable to authenticate this stream request.";
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

async function fetchSignals(params: {
  auctionId: string;
  sessionId: string;
  participantId: string;
  since: string;
}) {
  const url = new URL(`/api/auctions/${params.auctionId}/livestream/signal`, window.location.origin);
  url.searchParams.set("session_id", params.sessionId);
  url.searchParams.set("participant_id", params.participantId);
  url.searchParams.set("since", params.since);

  const response = await fetch(url.toString(), { cache: "no-store" });
  const payload = await response.json().catch(() => ({ ok: false, error: "Request failed" }));
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error ?? "Failed to fetch livestream signals");
  }

  return (payload.data?.items ?? []) as LivestreamSignal[];
}

export function useAuctionLivestreamViewer({
  auctionId,
  userId,
  enabled,
}: {
  auctionId: string;
  userId?: string;
  enabled: boolean;
}) {
  const [status, setStatus] = useState<ViewerStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(userId ?? null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const signalPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveSessionRef = useRef<string | null>(null);
  const hostUserRef = useRef<string | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const connectedRef = useRef(false);
  const sinceRef = useRef(SIGNAL_SINCE_FLOOR_ISO);
  const pollingRef = useRef(false);
  const seenSignalsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (userId && isUuid(userId)) {
      setParticipantId(userId);
      return;
    }

    setParticipantId(getGuestParticipantId());
  }, [userId]);

  const cleanup = useCallback((sendLeave: boolean) => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }

    if (signalPollRef.current) {
      clearInterval(signalPollRef.current);
      signalPollRef.current = null;
    }

    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = null;
    }

    setRemoteStream(null);

    if (sendLeave && leaveSessionRef.current && participantId) {
      const leavingSession = leaveSessionRef.current;
      if (hostUserRef.current) {
        void postJson(`/api/auctions/${auctionId}/livestream/signal`, {
          session_id: leavingSession,
          participant_id: participantId,
          to_user_id: hostUserRef.current,
          signal_type: "leave",
          payload: {},
        }).catch(() => undefined);
      }
      void postJson(`/api/auctions/${auctionId}/livestream/leave`, {
        session_id: leavingSession,
        participant_id: participantId,
      }).catch(() => undefined);
    }

    leaveSessionRef.current = null;
    hostUserRef.current = null;
    pendingIceCandidatesRef.current = [];
    connectedRef.current = false;
    sinceRef.current = SIGNAL_SINCE_FLOOR_ISO;
    pollingRef.current = false;
    seenSignalsRef.current.clear();
    setSessionId(null);
  }, [auctionId, participantId]);

  useEffect(() => {
    if (!enabled || !auctionId || !participantId) {
      cleanup(true);
      setStatus("idle");
      setError(null);
      return;
    }

    let cancelled = false;

    const processSignals = async (signals: LivestreamSignal[]) => {
      if (!pcRef.current) {
        return;
      }

      for (const signal of signals) {
        if (!pcRef.current) {
          return;
        }

        if (signal.signal_type === "answer") {
          const answer = toSessionDescription(signal.payload);
          if (answer && !pcRef.current.currentRemoteDescription) {
            await pcRef.current.setRemoteDescription(answer);
            if (pendingIceCandidatesRef.current.length > 0) {
              const queued = [...pendingIceCandidatesRef.current];
              pendingIceCandidatesRef.current = [];
              for (const candidate of queued) {
                await pcRef.current.addIceCandidate(candidate).catch(() => undefined);
              }
            }
          }
          continue;
        }

        if (signal.signal_type === "ice_candidate") {
          const candidate = toIceCandidate(signal.payload);
          if (candidate) {
            if (pcRef.current.currentRemoteDescription) {
              await pcRef.current.addIceCandidate(candidate).catch(() => undefined);
            } else {
              pendingIceCandidatesRef.current.push(candidate);
            }
          }
          continue;
        }

        if (signal.signal_type === "leave") {
          setStatus("ended");
          setError("Livestream ended by host");
          cleanup(false);
        }
      }
    };

    const pollSignals = async () => {
      if (pollingRef.current || !leaveSessionRef.current || !participantId) {
        return;
      }

      pollingRef.current = true;
      try {
        const signals = await fetchSignals({
          auctionId,
          sessionId: leaveSessionRef.current,
          participantId,
          since: sinceRef.current,
        });

        if (signals.length > 0) {
          const lastCreatedAt = signals[signals.length - 1]?.created_at;
          if (lastCreatedAt) {
            sinceRef.current = nextSinceCursor(lastCreatedAt);
          }

          const unseenSignals = signals.filter((signal) => {
            if (seenSignalsRef.current.has(signal.id)) {
              return false;
            }
            seenSignalsRef.current.add(signal.id);
            return true;
          });

          if (seenSignalsRef.current.size > RECENT_SIGNAL_CACHE_SIZE) {
            const excess = seenSignalsRef.current.size - RECENT_SIGNAL_CACHE_SIZE;
            const iterator = seenSignalsRef.current.values();
            for (let index = 0; index < excess; index += 1) {
              const item = iterator.next();
              if (item.done) {
                break;
              }
              seenSignalsRef.current.delete(item.value);
            }
          }

          await processSignals(unseenSignals);
        }
      } catch {
        // Ignore transient polling failures.
      } finally {
        pollingRef.current = false;
      }
    };

    const boot = async () => {
      try {
        setStatus("connecting");
        setError(null);

        const joinPayload = (await postJson(`/api/auctions/${auctionId}/livestream`, {
          participant_id: participantId,
        })) as {
          ok: true;
          data: JoinResponse;
        };

        if (cancelled) {
          return;
        }

        const joined = joinPayload.data;
        leaveSessionRef.current = joined.session_id;
        hostUserRef.current = joined.host_user_id;
        setSessionId(joined.session_id);
        setViewerCount(joined.viewer_count ?? 0);
        connectedRef.current = false;
        sinceRef.current = SIGNAL_SINCE_FLOOR_ISO;
        seenSignalsRef.current.clear();

        const pc = new RTCPeerConnection(LIVESTREAM_ICE_CONFIG);
        pcRef.current = pc;
        pendingIceCandidatesRef.current = [];

        pc.addTransceiver("video", { direction: "recvonly" });
        pc.addTransceiver("audio", { direction: "recvonly" });

        const inboundStream = new MediaStream();
        remoteStreamRef.current = inboundStream;
        setRemoteStream(inboundStream);

        pc.ontrack = (event) => {
          const incomingTracks = event.streams[0]?.getTracks() ?? [event.track];
          incomingTracks.forEach((track) => {
            if (inboundStream.getTracks().some((existing) => existing.id === track.id)) {
              return;
            }
            inboundStream.addTrack(track);
          });
          connectedRef.current = true;
          if (connectTimeoutRef.current) {
            clearTimeout(connectTimeoutRef.current);
            connectTimeoutRef.current = null;
          }
          setRemoteStream(new MediaStream(inboundStream.getTracks()));
          setStatus("live");
        };

        pc.onicecandidate = (event) => {
          if (!event.candidate || !leaveSessionRef.current || !hostUserRef.current) {
            return;
          }

          void postJson(`/api/auctions/${auctionId}/livestream/signal`, {
            session_id: leaveSessionRef.current,
            participant_id: participantId,
            to_user_id: hostUserRef.current,
            signal_type: "ice_candidate",
            payload: event.candidate.toJSON(),
          }).catch(() => undefined);
        };

        pc.onconnectionstatechange = () => {
          if (!pcRef.current) {
            return;
          }

          if (
            pc.connectionState === "connected"
            || pc.iceConnectionState === "connected"
            || pc.iceConnectionState === "completed"
          ) {
            if ((remoteStreamRef.current?.getTracks().length ?? 0) > 0) {
              connectedRef.current = true;
              if (connectTimeoutRef.current) {
                clearTimeout(connectTimeoutRef.current);
                connectTimeoutRef.current = null;
              }
              setStatus("live");
            }
            return;
          }

          if (!connectedRef.current && (pc.connectionState === "failed" || pc.connectionState === "closed")) {
            setStatus("error");
            setError("Unable to establish livestream connection. Ask the host to restart the stream.");
            cleanup(false);
          }
        };

        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);

        await postJson(`/api/auctions/${auctionId}/livestream/signal`, {
          session_id: joined.session_id,
          participant_id: participantId,
          to_user_id: joined.host_user_id,
          signal_type: "offer",
          payload: {
            type: offer.type,
            sdp: offer.sdp,
          },
        });

        signalPollRef.current = setInterval(() => {
          void pollSignals();
        }, SIGNAL_POLL_INTERVAL_MS);
        void pollSignals();

        connectTimeoutRef.current = setTimeout(() => {
          if (connectedRef.current) {
            return;
          }

          setStatus("error");
          setError("Could not connect to livestream. Ask the host to restart stream.");
          cleanup(false);
        }, 40000);

        heartbeatRef.current = setInterval(() => {
          if (!leaveSessionRef.current) {
            return;
          }

          void postJson(`/api/auctions/${auctionId}/livestream/heartbeat`, {
            session_id: leaveSessionRef.current,
            participant_id: participantId,
          }).catch(() => undefined);
        }, 15000);
      } catch (streamError) {
        if (!cancelled) {
          setStatus("error");
          setError(toUserErrorMessage(streamError, "Failed to connect to livestream"));
          cleanup(false);
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
    remoteStream,
    viewerCount,
    sessionId,
  };
}
