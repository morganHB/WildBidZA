"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { subscribeToLivestreamSignals } from "@/lib/auctions/realtime";
import {
  getVideoConstraints,
  LIVESTREAM_ICE_CONFIG,
  type LivestreamQualityPreset,
  toIceCandidate,
  toSessionDescription,
} from "@/lib/livestream/webrtc";

type HostStatus = "idle" | "starting" | "live" | "stopping" | "error";

type LivestreamSession = {
  session_id: string;
  auction_id: string;
  host_user_id: string;
  audio_enabled: boolean;
  max_viewers: number;
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

async function fetchLivestreamState(auctionId: string) {
  const response = await fetch(`/api/auctions/${auctionId}/livestream`, {
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({ ok: false, error: "Failed to load livestream" }));
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error ?? "Failed to load livestream");
  }

  return payload.data as {
    has_active_stream: boolean;
    session: {
      id: string;
      viewer_count: number;
    } | null;
  };
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
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [session, setSession] = useState<LivestreamSession | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [qualityPreset, setQualityPreset] = useState<LivestreamQualityPreset>("standard");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");

  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const signalUnsubscribeRef = useRef<(() => void) | null>(null);
  const sessionPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const connectionHealth = useMemo(() => {
    if (!session) {
      return "Offline";
    }

    if (peersRef.current.size === 0) {
      return "Live - waiting for viewers";
    }

    const disconnected = Array.from(peersRef.current.values()).filter(
      (peer) => peer.connectionState === "disconnected" || peer.connectionState === "failed",
    ).length;

    if (disconnected > 0) {
      return `Live - ${disconnected} unstable connection${disconnected === 1 ? "" : "s"}`;
    }

    return `Live - ${peersRef.current.size} peer connection${peersRef.current.size === 1 ? "" : "s"}`;
  }, [session]);

  const cleanupConnections = useCallback(() => {
    if (signalUnsubscribeRef.current) {
      signalUnsubscribeRef.current();
      signalUnsubscribeRef.current = null;
    }

    if (sessionPollRef.current) {
      clearInterval(sessionPollRef.current);
      sessionPollRef.current = null;
    }

    peersRef.current.forEach((peer) => {
      peer.onicecandidate = null;
      peer.onconnectionstatechange = null;
      peer.close();
    });
    peersRef.current.clear();
  }, []);

  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setLocalStream(null);
  }, []);

  useEffect(() => {
    if (!canHost) {
      return;
    }

    const refreshDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((device) => device.kind === "videoinput");
        setAvailableCameras(cameras);

        if (!selectedCameraId && cameras[0]?.deviceId) {
          setSelectedCameraId(cameras[0].deviceId);
        }
      } catch {
        // ignore
      }
    };

    void refreshDevices();
  }, [canHost, selectedCameraId]);

  const refreshViewerCount = useCallback(async () => {
    try {
      const data = await fetchLivestreamState(auctionId);
      if (data.session) {
        setViewerCount(data.session.viewer_count ?? 0);
      } else {
        setViewerCount(0);
      }
    } catch {
      // Ignore transient refresh failures
    }
  }, [auctionId]);

  const start = useCallback(async () => {
    if (!canHost || status === "live" || status === "starting") {
      return;
    }

    setStatus("starting");
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: getVideoConstraints(
          qualityPreset,
          selectedCameraId && selectedCameraId !== "auto" ? selectedCameraId : undefined,
        ),
        audio: audioEnabled,
      });

      streamRef.current = stream;
      setLocalStream(stream);

      const payload = (await postJson(`/api/seller/auctions/${auctionId}/livestream/start`, {
        audio_enabled: audioEnabled,
        max_viewers: 30,
      })) as { ok: true; data: LivestreamSession };

      const liveSession = payload.data;
      setSession(liveSession);
      setStatus("live");

      const { unsubscribe } = subscribeToLivestreamSignals(
        liveSession.session_id,
        userId,
        (signal) => {
          void (async () => {
            if (!streamRef.current) {
              return;
            }

            if (signal.signal_type === "leave") {
              const leavingViewerId = signal.from_user_id;
              const peer = peersRef.current.get(leavingViewerId);
              if (peer) {
                peer.close();
                peersRef.current.delete(leavingViewerId);
              }
              return;
            }

            const viewerId = signal.from_user_id;
            let peer = peersRef.current.get(viewerId);

            if (!peer) {
              peer = new RTCPeerConnection(LIVESTREAM_ICE_CONFIG);
              streamRef.current.getTracks().forEach((track) => {
                peer?.addTrack(track, streamRef.current as MediaStream);
              });

              peer.onicecandidate = (event) => {
                if (!event.candidate) {
                  return;
                }

                void postJson(`/api/auctions/${auctionId}/livestream/signal`, {
                  session_id: liveSession.session_id,
                  to_user_id: viewerId,
                  signal_type: "ice_candidate",
                  payload: event.candidate.toJSON(),
                }).catch(() => undefined);
              };

              peer.onconnectionstatechange = () => {
                if (!peer) {
                  return;
                }

                if (peer.connectionState === "failed" || peer.connectionState === "closed") {
                  peersRef.current.delete(viewerId);
                }
              };

              peersRef.current.set(viewerId, peer);
            }

            if (signal.signal_type === "offer") {
              const offer = toSessionDescription(signal.payload);
              if (!offer) {
                return;
              }

              await peer.setRemoteDescription(offer);
              const answer = await peer.createAnswer();
              await peer.setLocalDescription(answer);

              await postJson(`/api/auctions/${auctionId}/livestream/signal`, {
                session_id: liveSession.session_id,
                to_user_id: viewerId,
                signal_type: "answer",
                payload: {
                  type: answer.type,
                  sdp: answer.sdp,
                },
              });
              return;
            }

            if (signal.signal_type === "ice_candidate") {
              const candidate = toIceCandidate(signal.payload);
              if (candidate) {
                await peer.addIceCandidate(candidate).catch(() => undefined);
              }
            }
          })();
        },
      );

      signalUnsubscribeRef.current = unsubscribe;
      sessionPollRef.current = setInterval(() => {
        void refreshViewerCount();
      }, 10000);

      void refreshViewerCount();
    } catch (startError) {
      stopTracks();
      cleanupConnections();
      setSession(null);
      setStatus("error");
      setError(startError instanceof Error ? startError.message : "Failed to start livestream");
    }
  }, [auctionId, audioEnabled, canHost, cleanupConnections, qualityPreset, refreshViewerCount, selectedCameraId, status, stopTracks, userId]);

  const stop = useCallback(async () => {
    if (!session || status === "stopping") {
      return;
    }

    setStatus("stopping");

    try {
      await postJson(`/api/seller/auctions/${auctionId}/livestream/stop`, {});
    } catch (stopError) {
      setError(stopError instanceof Error ? stopError.message : "Failed to stop livestream");
    } finally {
      cleanupConnections();
      stopTracks();
      setSession(null);
      setViewerCount(0);
      setStatus("idle");
    }
  }, [auctionId, cleanupConnections, session, status, stopTracks]);

  const toggleMic = useCallback((enabled: boolean) => {
    setAudioEnabled(enabled);

    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupConnections();
      stopTracks();
    };
  }, [cleanupConnections, stopTracks]);

  return {
    status,
    error,
    localStream,
    session,
    viewerCount,
    qualityPreset,
    setQualityPreset,
    audioEnabled,
    toggleMic,
    availableCameras,
    selectedCameraId,
    setSelectedCameraId,
    start,
    stop,
    connectionHealth,
  };
}
