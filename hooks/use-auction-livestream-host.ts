"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getVideoConstraints,
  getVideoBitratePreset,
  LIVESTREAM_ICE_CONFIG,
  type LivestreamCameraFacing,
  type LivestreamOrientation,
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

type LivestreamSignal = {
  id: string;
  session_id: string;
  from_user_id: string;
  to_user_id: string;
  signal_type: "offer" | "answer" | "ice_candidate" | "leave";
  payload: unknown;
  created_at: string;
};

const SIGNAL_POLL_INTERVAL_MS = 800;
const SIGNAL_SINCE_FLOOR_ISO = "1970-01-01T00:00:00.000Z";
const RECENT_SIGNAL_CACHE_SIZE = 500;
const DEFAULT_MAX_VIEWERS = 250;
const LEGACY_MAX_VIEWERS = 100;

function getViewportOrientation(): LivestreamOrientation {
  if (typeof window === "undefined") {
    return "landscape";
  }

  return window.innerWidth >= window.innerHeight ? "landscape" : "portrait";
}

function nextSinceCursor(lastCreatedAt: string) {
  const timestamp = Date.parse(lastCreatedAt);
  if (Number.isNaN(timestamp)) {
    return lastCreatedAt;
  }

  return new Date(Math.max(0, timestamp - 1)).toISOString();
}

function toUserErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  if (/auth session missing|unauthorized/i.test(message)) {
    return "Your session expired. Please sign in again.";
  }
  return message || fallback;
}

function stopLivestreamRequest(auctionId: string, keepalive = false) {
  return fetch(`/api/seller/auctions/${auctionId}/livestream/stop`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
    keepalive,
  });
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
  const [qualityPreset, setQualityPreset] = useState<LivestreamQualityPreset>("hd_720");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("auto");
  const [cameraFacing, setCameraFacing] = useState<LivestreamCameraFacing>("environment");
  const [orientation, setOrientation] = useState<LivestreamOrientation>("landscape");
  const [effectiveQualityPreset, setEffectiveQualityPreset] = useState<LivestreamQualityPreset>("hd_720");

  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const sessionPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const signalPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const qualityRef = useRef<LivestreamQualityPreset>("hd_720");
  const selectedCameraIdRef = useRef<string>("auto");
  const cameraFacingRef = useRef<LivestreamCameraFacing>("environment");
  const orientationRef = useRef<LivestreamOrientation>("landscape");
  const sessionRef = useRef<LivestreamSession | null>(null);
  const pendingIceCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const sinceRef = useRef(SIGNAL_SINCE_FLOOR_ISO);
  const signalPollingRef = useRef(false);
  const seenSignalsRef = useRef<Set<string>>(new Set());

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
    if (signalPollRef.current) {
      clearInterval(signalPollRef.current);
      signalPollRef.current = null;
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
    pendingIceCandidatesRef.current.clear();
    seenSignalsRef.current.clear();
    signalPollingRef.current = false;
    sinceRef.current = SIGNAL_SINCE_FLOOR_ISO;
  }, []);

  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setLocalStream(null);
  }, []);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    qualityRef.current = qualityPreset;
  }, [qualityPreset]);

  useEffect(() => {
    selectedCameraIdRef.current = selectedCameraId;
  }, [selectedCameraId]);

  useEffect(() => {
    cameraFacingRef.current = cameraFacing;
  }, [cameraFacing]);

  useEffect(() => {
    orientationRef.current = orientation;
  }, [orientation]);

  useEffect(() => {
    const refreshOrientation = () => {
      setOrientation(getViewportOrientation());
    };

    refreshOrientation();
    window.addEventListener("orientationchange", refreshOrientation);
    window.addEventListener("resize", refreshOrientation);

    return () => {
      window.removeEventListener("orientationchange", refreshOrientation);
      window.removeEventListener("resize", refreshOrientation);
    };
  }, []);

  useEffect(() => {
    if (!canHost) {
      return;
    }

    const refreshDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(
          (device) => device.kind === "videoinput" && Boolean(device.deviceId),
        );
        setAvailableCameras(cameras);
      } catch {
        // ignore
      }
    };

    void refreshDevices();

    const onDeviceChange = () => {
      void refreshDevices();
    };

    navigator.mediaDevices.addEventListener?.("devicechange", onDeviceChange);

    return () => {
      navigator.mediaDevices.removeEventListener?.("devicechange", onDeviceChange);
    };
  }, [canHost]);

  const refreshViewerCount = useCallback(async () => {
    try {
      const data = await fetchLivestreamState(auctionId);
      if (data.session) {
        setViewerCount(data.session.viewer_count ?? 0);
      } else {
        setViewerCount(0);
      }
    } catch {
      // Ignore transient refresh failures.
    }
  }, [auctionId]);

  const resolveNetworkAdjustedQuality = useCallback((preset: LivestreamQualityPreset) => {
    if (typeof navigator === "undefined") {
      return preset;
    }

    const connection = (navigator as Navigator & {
      connection?: { downlink?: number; effectiveType?: string };
    }).connection;

    if (!connection || preset !== "full_hd_1080") {
      return preset;
    }

    const downlink = connection.downlink ?? 10;
    const effectiveType = (connection.effectiveType ?? "").toLowerCase();
    const lowBandwidth =
      downlink < 5 || effectiveType.includes("2g") || effectiveType.includes("3g");

    if (lowBandwidth) {
      return "hd_720";
    }

    return preset;
  }, []);

  const buildCaptureConstraints = useCallback((options?: {
    quality?: LivestreamQualityPreset;
    cameraId?: string;
    facing?: LivestreamCameraFacing;
    orientation?: LivestreamOrientation;
  }) => {
    const requestedQuality = options?.quality ?? qualityRef.current;
    const effectiveQuality = resolveNetworkAdjustedQuality(requestedQuality);
    const cameraId = options?.cameraId ?? selectedCameraIdRef.current;
    const cameraFacingValue = options?.facing ?? cameraFacingRef.current;
    const orientationValue = options?.orientation ?? orientationRef.current;

    return {
      effectiveQuality,
      constraints: getVideoConstraints(effectiveQuality, {
        deviceId: cameraId && cameraId !== "auto" ? cameraId : undefined,
        facingMode: cameraFacingValue,
        orientation: orientationValue,
      }),
    };
  }, [resolveNetworkAdjustedQuality]);

  const applyVideoSenderProfile = useCallback(async (targetQuality: LivestreamQualityPreset) => {
    const bitrateProfile = getVideoBitratePreset(targetQuality);

    await Promise.all(
      Array.from(peersRef.current.values()).map(async (peer) => {
        const sender = peer.getSenders().find((item) => item.track?.kind === "video");
        if (!sender || typeof sender.getParameters !== "function") {
          return;
        }

        const parameters = sender.getParameters();
        const currentEncodings = parameters.encodings && parameters.encodings.length > 0
          ? parameters.encodings
          : [{}];

        const nextParameters: RTCRtpSendParameters = {
          ...parameters,
          encodings: currentEncodings.map((encoding, index) =>
            index === 0
              ? {
                  ...encoding,
                  maxBitrate: bitrateProfile.maxBitrate,
                  maxFramerate: bitrateProfile.maxFramerate,
                  networkPriority: "high",
                }
              : encoding,
          ),
        };

        await sender.setParameters(nextParameters).catch(() => undefined);
      }),
    );
  }, []);

  const replaceVideoTrack = useCallback(async (options?: {
    cameraId?: string;
    facing?: LivestreamCameraFacing;
    quality?: LivestreamQualityPreset;
    orientation?: LivestreamOrientation;
  }) => {
    if (!streamRef.current) {
      return;
    }

    const { constraints, effectiveQuality } = buildCaptureConstraints(options);
    const nextVideoStream = await navigator.mediaDevices.getUserMedia({
      video: constraints,
      audio: false,
    });
    const nextVideoTrack = nextVideoStream.getVideoTracks()[0];

    if (!nextVideoTrack) {
      throw new Error("Could not access camera");
    }

    nextVideoTrack.contentHint = "motion";

    const currentStream = streamRef.current;
    const previousVideoTracks = currentStream.getVideoTracks();
    const audioTracks = currentStream.getAudioTracks();
    const composedStream = new MediaStream([...audioTracks, nextVideoTrack]);

    let committed = false;
    try {
      await Promise.all(
        Array.from(peersRef.current.values()).map(async (peer) => {
          const sender = peer.getSenders().find((item) => item.track?.kind === "video");
          if (sender) {
            await sender.replaceTrack(nextVideoTrack).catch(() => undefined);
          }
        }),
      );

      previousVideoTracks.forEach((track) => {
        track.stop();
        currentStream.removeTrack(track);
      });

      streamRef.current = composedStream;
      setLocalStream(composedStream);
      setEffectiveQualityPreset(effectiveQuality);
      await applyVideoSenderProfile(effectiveQuality);
      committed = true;
    } finally {
      if (!committed) {
        nextVideoStream.getTracks().forEach((track) => track.stop());
      } else {
        nextVideoStream
          .getTracks()
          .filter((track) => track.id !== nextVideoTrack.id)
          .forEach((track) => track.stop());
      }
    }
  }, [applyVideoSenderProfile, buildCaptureConstraints]);

  const applyTrackConstraints = useCallback(async () => {
    const stream = streamRef.current;
    const videoTrack = stream?.getVideoTracks()[0];
    if (!videoTrack) {
      return;
    }

    const { constraints, effectiveQuality } = buildCaptureConstraints();
    const trackConstraints: MediaTrackConstraints = { ...constraints };
    delete trackConstraints.deviceId;
    delete trackConstraints.facingMode;

    await videoTrack.applyConstraints(trackConstraints).catch(() => undefined);
    setEffectiveQualityPreset(effectiveQuality);
    await applyVideoSenderProfile(effectiveQuality);
  }, [applyVideoSenderProfile, buildCaptureConstraints]);

  const switchToCamera = useCallback(async (cameraId: string) => {
    selectedCameraIdRef.current = cameraId;
    setSelectedCameraId(cameraId);
    setError(null);

    if (status !== "live" || !streamRef.current) {
      return;
    }

    try {
      await replaceVideoTrack({ cameraId, facing: cameraFacingRef.current });
    } catch (cameraError) {
      setError(toUserErrorMessage(cameraError, "Failed to switch camera"));
    }
  }, [replaceVideoTrack, status]);

  const flipCameraFacing = useCallback(async () => {
    const nextFacing: LivestreamCameraFacing =
      cameraFacingRef.current === "environment" ? "user" : "environment";

    cameraFacingRef.current = nextFacing;
    selectedCameraIdRef.current = "auto";
    setCameraFacing(nextFacing);
    setSelectedCameraId("auto");
    setError(null);

    if (status !== "live" || !streamRef.current) {
      return;
    }

    try {
      await replaceVideoTrack({ cameraId: "auto", facing: nextFacing });
    } catch (cameraError) {
      setError(toUserErrorMessage(cameraError, "Failed to flip camera"));
    }
  }, [replaceVideoTrack, status]);

  const processSignal = useCallback(async (liveSession: LivestreamSession, signal: LivestreamSignal) => {
    if (!streamRef.current) {
      return;
    }

    const closeViewerPeer = (viewerId: string) => {
      const existing = peersRef.current.get(viewerId);
      if (existing) {
        existing.onicecandidate = null;
        existing.onconnectionstatechange = null;
        existing.close();
        peersRef.current.delete(viewerId);
      }
      pendingIceCandidatesRef.current.delete(viewerId);
    };

    const ensureViewerPeer = (viewerId: string) => {
      const existing = peersRef.current.get(viewerId);
      if (existing) {
        return existing;
      }

      const nextPeer = new RTCPeerConnection(LIVESTREAM_ICE_CONFIG);
      streamRef.current?.getTracks().forEach((track) => {
        nextPeer.addTrack(track, streamRef.current as MediaStream);
      });
      void applyVideoSenderProfile(effectiveQualityPreset).catch(() => undefined);

      nextPeer.onicecandidate = (event) => {
        if (!event.candidate) {
          return;
        }

        void postJson(`/api/auctions/${auctionId}/livestream/signal`, {
          session_id: liveSession.session_id,
          participant_id: userId,
          to_user_id: viewerId,
          signal_type: "ice_candidate",
          payload: event.candidate.toJSON(),
        }).catch(() => undefined);
      };

      nextPeer.onconnectionstatechange = () => {
        if (nextPeer.connectionState === "failed" || nextPeer.connectionState === "closed") {
          closeViewerPeer(viewerId);
        }
      };

      peersRef.current.set(viewerId, nextPeer);
      return nextPeer;
    };

    if (signal.signal_type === "leave") {
      closeViewerPeer(signal.from_user_id);
      return;
    }

    const viewerId = signal.from_user_id;
    let peer = peersRef.current.get(viewerId);

    if (signal.signal_type === "offer") {
      const offer = toSessionDescription(signal.payload);
      if (!offer) {
        return;
      }

      // Always renegotiate from a fresh peer for each offer to avoid stale state across rapid re-joins.
      closeViewerPeer(viewerId);
      peer = ensureViewerPeer(viewerId);
      await peer.setRemoteDescription(offer);
      const queued = pendingIceCandidatesRef.current.get(viewerId) ?? [];
      if (queued.length > 0) {
        pendingIceCandidatesRef.current.delete(viewerId);
        for (const queuedCandidate of queued) {
          await peer.addIceCandidate(queuedCandidate).catch(() => undefined);
        }
      }
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      await postJson(`/api/auctions/${auctionId}/livestream/signal`, {
        session_id: liveSession.session_id,
        participant_id: userId,
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
        if (!peer) {
          peer = ensureViewerPeer(viewerId);
        }

        if (peer.currentRemoteDescription) {
          await peer.addIceCandidate(candidate).catch(() => undefined);
        } else {
          const queued = pendingIceCandidatesRef.current.get(viewerId) ?? [];
          queued.push(candidate);
          pendingIceCandidatesRef.current.set(viewerId, queued);
        }
      }
    }
  }, [applyVideoSenderProfile, auctionId, effectiveQualityPreset, userId]);

  const startSignalPolling = useCallback((liveSession: LivestreamSession) => {
    const poll = async () => {
      if (signalPollingRef.current) {
        return;
      }

      signalPollingRef.current = true;
      try {
        const signals = await fetchSignals({
          auctionId,
          sessionId: liveSession.session_id,
          participantId: userId,
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

          for (const signal of unseenSignals) {
            try {
              await processSignal(liveSession, signal);
            } catch {
              // Keep polling alive even if a single viewer's handshake is invalid/stale.
              pendingIceCandidatesRef.current.delete(signal.from_user_id);
            }
          }
        }
      } catch {
        // Ignore transient signal polling failures.
      } finally {
        signalPollingRef.current = false;
      }
    };

    if (signalPollRef.current) {
      clearInterval(signalPollRef.current);
    }
    signalPollRef.current = setInterval(() => {
      void poll();
    }, SIGNAL_POLL_INTERVAL_MS);
    void poll();
  }, [auctionId, processSignal, userId]);

  const start = useCallback(async () => {
    if (!canHost || status === "live" || status === "starting") {
      return;
    }

    setStatus("starting");
    setError(null);

    try {
      const { constraints, effectiveQuality } = buildCaptureConstraints();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: constraints,
        audio: audioEnabled,
      });
      stream.getVideoTracks().forEach((track) => {
        track.contentHint = "motion";
      });

      streamRef.current = stream;
      setLocalStream(stream);
      setEffectiveQualityPreset(effectiveQuality);

      let payload: { ok: true; data: LivestreamSession };
      try {
        payload = (await postJson(`/api/seller/auctions/${auctionId}/livestream/start`, {
          audio_enabled: audioEnabled,
          max_viewers: DEFAULT_MAX_VIEWERS,
        })) as { ok: true; data: LivestreamSession };
      } catch (startRequestError) {
        const fallbackMessage =
          startRequestError instanceof Error ? startRequestError.message.toLowerCase() : "";
        const canFallback =
          fallbackMessage.includes("max_viewers")
          && fallbackMessage.includes("between 1 and 100");

        if (!canFallback) {
          throw startRequestError;
        }

        payload = (await postJson(`/api/seller/auctions/${auctionId}/livestream/start`, {
          audio_enabled: audioEnabled,
          max_viewers: LEGACY_MAX_VIEWERS,
        })) as { ok: true; data: LivestreamSession };
      }

      const liveSession = payload.data;
      setSession(liveSession);
      setStatus("live");
      sinceRef.current = SIGNAL_SINCE_FLOOR_ISO;
      seenSignalsRef.current.clear();

      startSignalPolling(liveSession);

      sessionPollRef.current = setInterval(() => {
        void refreshViewerCount();
      }, 10000);

      void refreshViewerCount();
    } catch (startError) {
      stopTracks();
      cleanupConnections();
      setSession(null);
      setStatus("error");
      setError(toUserErrorMessage(startError, "Failed to start livestream"));
    }
  }, [
    auctionId,
    audioEnabled,
    buildCaptureConstraints,
    canHost,
    cleanupConnections,
    refreshViewerCount,
    startSignalPolling,
    status,
    stopTracks,
  ]);

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

  const updateQualityPreset = useCallback((preset: LivestreamQualityPreset) => {
    setQualityPreset(preset);
    setError(null);
  }, []);

  useEffect(() => {
    setEffectiveQualityPreset(resolveNetworkAdjustedQuality(qualityPreset));
    if (status !== "live") {
      return;
    }

    void applyTrackConstraints();
  }, [applyTrackConstraints, qualityPreset, resolveNetworkAdjustedQuality, status]);

  useEffect(() => {
    if (status !== "live") {
      return;
    }

    void applyTrackConstraints();
  }, [applyTrackConstraints, orientation, status]);

  useEffect(() => {
    const connection = (navigator as Navigator & {
      connection?: {
        addEventListener?: (type: "change", listener: () => void) => void;
        removeEventListener?: (type: "change", listener: () => void) => void;
      };
    }).connection;

    if (!connection?.addEventListener) {
      return;
    }

    const onConnectionChange = () => {
      setEffectiveQualityPreset(resolveNetworkAdjustedQuality(qualityRef.current));
      if (status === "live") {
        void applyTrackConstraints();
      }
    };

    connection.addEventListener("change", onConnectionChange);
    return () => {
      connection.removeEventListener?.("change", onConnectionChange);
    };
  }, [applyTrackConstraints, resolveNetworkAdjustedQuality, status]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const stopIfLeaving = () => {
      void stopLivestreamRequest(auctionId, true).catch(() => undefined);
    };

    window.addEventListener("pagehide", stopIfLeaving);
    window.addEventListener("beforeunload", stopIfLeaving);

    return () => {
      window.removeEventListener("pagehide", stopIfLeaving);
      window.removeEventListener("beforeunload", stopIfLeaving);
    };
  }, [auctionId, session]);

  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        void stopLivestreamRequest(auctionId, true).catch(() => undefined);
      }
      cleanupConnections();
      stopTracks();
    };
  }, [auctionId, cleanupConnections, stopTracks]);

  return {
    status,
    error,
    localStream,
    session,
    viewerCount,
    qualityPreset,
    effectiveQualityPreset,
    setQualityPreset: updateQualityPreset,
    audioEnabled,
    toggleMic,
    availableCameras,
    selectedCameraId,
    setSelectedCameraId: switchToCamera,
    cameraFacing,
    flipCameraFacing,
    orientation,
    start,
    stop,
    connectionHealth,
  };
}
