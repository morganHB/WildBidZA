export type LivestreamQualityPreset = "standard" | "data_saver";

export const LIVESTREAM_ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function getVideoConstraints(
  preset: LivestreamQualityPreset,
  deviceId?: string,
): MediaTrackConstraints {
  if (preset === "data_saver") {
    return {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      width: { ideal: 426, max: 640 },
      height: { ideal: 240, max: 360 },
      frameRate: { ideal: 15, max: 18 },
    };
  }

  return {
    deviceId: deviceId ? { exact: deviceId } : undefined,
    width: { ideal: 640, max: 960 },
    height: { ideal: 360, max: 540 },
    frameRate: { ideal: 24, max: 30 },
  };
}

export function toSessionDescription(value: unknown): RTCSessionDescriptionInit | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const maybe = value as { type?: unknown; sdp?: unknown };
  if (typeof maybe.type !== "string" || typeof maybe.sdp !== "string") {
    return null;
  }

  return {
    type: maybe.type as RTCSdpType,
    sdp: maybe.sdp,
  };
}

export function toIceCandidate(value: unknown): RTCIceCandidateInit | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const maybe = value as {
    candidate?: unknown;
    sdpMid?: unknown;
    sdpMLineIndex?: unknown;
    usernameFragment?: unknown;
  };

  if (typeof maybe.candidate !== "string") {
    return null;
  }

  return {
    candidate: maybe.candidate,
    sdpMid: typeof maybe.sdpMid === "string" ? maybe.sdpMid : undefined,
    sdpMLineIndex:
      typeof maybe.sdpMLineIndex === "number" ? maybe.sdpMLineIndex : undefined,
    usernameFragment:
      typeof maybe.usernameFragment === "string"
        ? maybe.usernameFragment
        : undefined,
  };
}
