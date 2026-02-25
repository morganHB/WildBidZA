import Mux from "@mux/mux-node";

const DEFAULT_MUX_RTMP_INGEST_URL = "rtmp://global-live.mux.com:5222/app";

type MuxLatencyMode = "low" | "reduced" | "standard";
type MuxStatus = "active" | "idle" | "disabled";

export type MuxLiveStreamDetails = {
  liveStreamId: string;
  playbackId: string;
  streamKey: string;
  ingestUrl: string;
  playbackUrl: string;
  status: MuxStatus;
};

let muxClient: Mux | null = null;

function getMuxTokenId() {
  return process.env.MUX_TOKEN_ID?.trim() ?? "";
}

function getMuxTokenSecret() {
  return process.env.MUX_TOKEN_SECRET?.trim() ?? "";
}

function assertMuxConfigured() {
  if (!isMuxConfigured()) {
    throw new Error("Mux is not configured. Set MUX_TOKEN_ID and MUX_TOKEN_SECRET.");
  }
}

function getMuxClient() {
  assertMuxConfigured();

  if (!muxClient) {
    muxClient = new Mux({
      tokenId: getMuxTokenId(),
      tokenSecret: getMuxTokenSecret(),
      timeout: 20_000,
      maxRetries: 2,
    });
  }

  return muxClient;
}

function getMuxIngestUrl() {
  return process.env.MUX_RTMP_INGEST_URL?.trim() || DEFAULT_MUX_RTMP_INGEST_URL;
}

function getPlaybackIdFromLiveStream(liveStream: Mux.Video.LiveStream) {
  return liveStream.playback_ids?.[0]?.id ?? null;
}

export function isMuxConfigured() {
  return Boolean(getMuxTokenId() && getMuxTokenSecret());
}

export function toMuxPlaybackUrl(playbackId: string) {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

export async function createMuxLiveStream(params?: {
  latencyMode?: MuxLatencyMode;
  passthrough?: string;
}) {
  const client = getMuxClient();
  const liveStream = await client.video.liveStreams.create({
    latency_mode: params?.latencyMode ?? "reduced",
    playback_policies: ["public"],
    new_asset_settings: {
      playback_policies: ["public"],
    },
    reconnect_window: 15,
    passthrough: params?.passthrough,
  });

  const playbackId = getPlaybackIdFromLiveStream(liveStream);
  if (!playbackId) {
    throw new Error("Mux live stream was created without a playback ID.");
  }

  if (!liveStream.stream_key) {
    throw new Error("Mux live stream was created without a stream key.");
  }

  return {
    liveStreamId: liveStream.id,
    playbackId,
    streamKey: liveStream.stream_key,
    ingestUrl: getMuxIngestUrl(),
    playbackUrl: toMuxPlaybackUrl(playbackId),
    status: liveStream.status,
  } satisfies MuxLiveStreamDetails;
}

export async function retrieveMuxLiveStream(liveStreamId: string) {
  const client = getMuxClient();
  const liveStream = await client.video.liveStreams.retrieve(liveStreamId);
  const playbackId = getPlaybackIdFromLiveStream(liveStream);
  const streamKey = liveStream.stream_key;

  return {
    liveStream,
    playbackId,
    streamKey,
    playbackUrl: playbackId ? toMuxPlaybackUrl(playbackId) : null,
  };
}

export async function disableMuxLiveStream(liveStreamId: string) {
  const client = getMuxClient();
  await client.video.liveStreams.disable(liveStreamId);
}

export async function getMuxLiveStreamStatus(liveStreamId: string) {
  const client = getMuxClient();
  const liveStream = await client.video.liveStreams.retrieve(liveStreamId);
  return liveStream.status;
}
