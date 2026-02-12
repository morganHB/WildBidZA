"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { subscribeToLivestreamSignals } from "@/lib/auctions/realtime";
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

export function useAuctionLivestreamViewer({
  auctionId,
  userId,
  enabled,
}: {
  auctionId: string;
  userId: string;
  enabled: boolean;
}) {
  const [status, setStatus] = useState<ViewerStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const leaveSessionRef = useRef<string | null>(null);
  const hostUserRef = useRef<string | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const subscribedSessionRef = useRef<(() => void) | null>(null);

  const cleanup = useCallback((sendLeave: boolean) => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }

    if (subscribedSessionRef.current) {
      subscribedSessionRef.current();
      subscribedSessionRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = null;
    }

    setRemoteStream(null);

    if (sendLeave && leaveSessionRef.current) {
      const leavingSession = leaveSessionRef.current;
      if (hostUserRef.current) {
        void postJson(`/api/auctions/${auctionId}/livestream/signal`, {
          session_id: leavingSession,
          to_user_id: hostUserRef.current,
          signal_type: "leave",
          payload: {},
        }).catch(() => undefined);
      }
      void postJson(`/api/auctions/${auctionId}/livestream/leave`, {
        session_id: leavingSession,
      }).catch(() => undefined);
    }

    leaveSessionRef.current = null;
    hostUserRef.current = null;
    setSessionId(null);
  }, [auctionId]);

  useEffect(() => {
    if (!enabled || !auctionId || !userId) {
      cleanup(true);
      setStatus("idle");
      setError(null);
      return;
    }

    let cancelled = false;

    const boot = async () => {
      try {
        setStatus("connecting");
        setError(null);

        const joinPayload = (await postJson(`/api/auctions/${auctionId}/livestream`, {})) as {
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

        const pc = new RTCPeerConnection(LIVESTREAM_ICE_CONFIG);
        pcRef.current = pc;

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
          setRemoteStream(new MediaStream(inboundStream.getTracks()));
          setStatus("live");
        };

        pc.onicecandidate = (event) => {
          if (!event.candidate) {
            return;
          }

          void postJson(`/api/auctions/${auctionId}/livestream/signal`, {
            session_id: joined.session_id,
            to_user_id: joined.host_user_id,
            signal_type: "ice_candidate",
            payload: event.candidate.toJSON(),
          }).catch(() => undefined);
        };

        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);

        await postJson(`/api/auctions/${auctionId}/livestream/signal`, {
          session_id: joined.session_id,
          to_user_id: joined.host_user_id,
          signal_type: "offer",
          payload: {
            type: offer.type,
            sdp: offer.sdp,
          },
        });

        const { unsubscribe } = subscribeToLivestreamSignals(
          joined.session_id,
          userId,
          (signal) => {
            void (async () => {
              if (!pcRef.current) {
                return;
              }

              if (signal.signal_type === "answer") {
                const answer = toSessionDescription(signal.payload);
                if (answer && !pcRef.current.currentRemoteDescription) {
                  await pcRef.current.setRemoteDescription(answer);
                }
                return;
              }

              if (signal.signal_type === "ice_candidate") {
                const candidate = toIceCandidate(signal.payload);
                if (candidate) {
                  await pcRef.current.addIceCandidate(candidate).catch(() => undefined);
                }
                return;
              }

              if (signal.signal_type === "leave") {
                setStatus("ended");
                setError("Livestream ended by host");
                cleanup(false);
              }
            })();
          },
        );

        subscribedSessionRef.current = unsubscribe;

        heartbeatRef.current = setInterval(() => {
          if (!leaveSessionRef.current) {
            return;
          }

          void postJson(`/api/auctions/${auctionId}/livestream/heartbeat`, {
            session_id: leaveSessionRef.current,
          }).catch(() => undefined);
        }, 15000);
      } catch (streamError) {
        if (!cancelled) {
          setStatus("error");
          setError(streamError instanceof Error ? streamError.message : "Failed to connect to livestream");
          cleanup(false);
        }
      }
    };

    void boot();

    return () => {
      cancelled = true;
      cleanup(true);
    };
  }, [auctionId, cleanup, enabled, userId]);

  return {
    status,
    error,
    remoteStream,
    viewerCount,
    sessionId,
  };
}
