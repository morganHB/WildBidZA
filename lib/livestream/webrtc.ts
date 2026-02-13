export type LivestreamQualityPreset = "standard" | "data_saver";

function splitCsvUrls(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  const turnUrls = splitCsvUrls(process.env.NEXT_PUBLIC_LIVESTREAM_TURN_URLS);
  const turnUsername = process.env.NEXT_PUBLIC_LIVESTREAM_TURN_USERNAME?.trim();
  const turnCredential = process.env.NEXT_PUBLIC_LIVESTREAM_TURN_CREDENTIAL?.trim();

  if (turnUrls.length > 0 && turnUsername && turnCredential) {
    servers.push({
      urls: turnUrls,
      username: turnUsername,
      credential: turnCredential,
    });
    return servers;
  }

  // Fallback public TURN relay for v1 reliability when no project TURN env is configured.
  // For production scale and privacy, configure your own TURN via NEXT_PUBLIC_LIVESTREAM_TURN_* env vars.
  servers.push({
    urls: [
      "stun:openrelay.metered.ca:80",
      "turn:openrelay.metered.ca:80",
      "turn:openrelay.metered.ca:80?transport=tcp",
      "turn:openrelay.metered.ca:443",
      "turns:openrelay.metered.ca:443?transport=tcp",
    ],
    username: "openrelayproject",
    credential: "openrelayproject",
  });

  return servers;
}

export const LIVESTREAM_ICE_CONFIG: RTCConfiguration = {
  iceServers: buildIceServers(),
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
