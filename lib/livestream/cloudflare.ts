const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";
const DEFAULT_CLOUDFLARE_INGEST_URL = "rtmps://live.cloudflare.com:443/live/";

type LivestreamStatus = "active" | "idle" | "disabled";

type CloudflareApiError = {
  message?: string;
};

type CloudflareApiEnvelope<T> = {
  success?: boolean;
  result?: T;
  errors?: CloudflareApiError[];
};

type CloudflareLiveInput = {
  uid?: string;
  enabled?: boolean;
  rtmps?: {
    url?: string;
    streamKey?: string;
  };
};

export type CloudflareLiveInputDetails = {
  liveInputId: string;
  playbackId: string;
  streamKey: string;
  ingestUrl: string;
  playbackUrl: string;
  status: LivestreamStatus;
};

function getCloudflareAccountId() {
  return process.env.CLOUDFLARE_ACCOUNT_ID?.trim() ?? "";
}

function getCloudflareApiToken() {
  return process.env.CLOUDFLARE_STREAM_API_TOKEN?.trim() ?? "";
}

function getCloudflareCustomerCode() {
  return process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE?.trim() ?? "";
}

export function isCloudflareConfigured() {
  return Boolean(getCloudflareAccountId() && getCloudflareApiToken() && getCloudflareCustomerCode());
}

function assertCloudflareConfigured() {
  if (!isCloudflareConfigured()) {
    throw new Error(
      "Cloudflare Stream is not configured. Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_STREAM_API_TOKEN, and CLOUDFLARE_STREAM_CUSTOMER_CODE.",
    );
  }
}

function getCloudflareIngestUrl(rawUrl?: string | null) {
  return rawUrl?.trim() || DEFAULT_CLOUDFLARE_INGEST_URL;
}

function cloudflareApiUrl(path: string) {
  return `${CLOUDFLARE_API_BASE}/accounts/${getCloudflareAccountId()}/stream${path}`;
}

function toCloudflareErrorMessage(payload: CloudflareApiEnvelope<unknown> | null, fallback: string) {
  const firstError = payload?.errors?.find((entry) => typeof entry?.message === "string")?.message;
  return firstError || fallback;
}

async function cloudflareApiRequest<T>(path: string, init?: RequestInit) {
  assertCloudflareConfigured();

  const response = await fetch(cloudflareApiUrl(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${getCloudflareApiToken()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as CloudflareApiEnvelope<T> | null;
  if (!response.ok || !payload?.success) {
    throw new Error(toCloudflareErrorMessage(payload, "Cloudflare Stream API request failed."));
  }

  return payload.result as T;
}

export function toCloudflarePlaybackUrl(liveInputId: string) {
  const customerCode = getCloudflareCustomerCode();
  if (!customerCode) {
    throw new Error("CLOUDFLARE_STREAM_CUSTOMER_CODE is required to build playback URLs.");
  }

  return `https://customer-${customerCode}.cloudflarestream.com/${liveInputId}/manifest/video.m3u8`;
}

export async function createCloudflareLiveInput(params?: { name?: string }) {
  const created = await cloudflareApiRequest<CloudflareLiveInput>("/live_inputs", {
    method: "POST",
    body: JSON.stringify({
      meta: params?.name ? { name: params.name } : undefined,
    }),
  });

  const liveInputId = created.uid?.trim();
  const streamKey = created.rtmps?.streamKey?.trim();
  if (!liveInputId) {
    throw new Error("Cloudflare live input was created without a UID.");
  }

  if (!streamKey) {
    throw new Error("Cloudflare live input was created without a stream key.");
  }

  const ingestUrl = getCloudflareIngestUrl(created.rtmps?.url);

  return {
    liveInputId,
    playbackId: liveInputId,
    streamKey,
    ingestUrl,
    playbackUrl: toCloudflarePlaybackUrl(liveInputId),
    status: "idle",
  } satisfies CloudflareLiveInputDetails;
}

export async function retrieveCloudflareLiveInput(liveInputId: string) {
  const liveInput = await cloudflareApiRequest<CloudflareLiveInput>(`/live_inputs/${liveInputId}`, {
    method: "GET",
  });

  const resolvedLiveInputId = liveInput.uid?.trim() || liveInputId;
  const streamKey = liveInput.rtmps?.streamKey?.trim() ?? null;
  const ingestUrl = getCloudflareIngestUrl(liveInput.rtmps?.url);

  return {
    liveInput,
    liveInputId: resolvedLiveInputId,
    playbackId: resolvedLiveInputId,
    streamKey,
    ingestUrl,
    playbackUrl: resolvedLiveInputId ? toCloudflarePlaybackUrl(resolvedLiveInputId) : null,
  };
}

async function fetchCloudflareLifecycleStatus(liveInputId: string) {
  const customerCode = getCloudflareCustomerCode();
  if (!customerCode) {
    return null;
  }

  const response = await fetch(`https://customer-${customerCode}.cloudflarestream.com/${liveInputId}/lifecycle`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json().catch(() => null)) as { live?: boolean } | null;
  if (!payload || typeof payload.live !== "boolean") {
    return null;
  }

  return payload.live ? "active" : "idle";
}

export async function disableCloudflareLiveInput(liveInputId: string) {
  try {
    await cloudflareApiRequest<CloudflareLiveInput>(`/live_inputs/${liveInputId}`, {
      method: "PUT",
      body: JSON.stringify({ enabled: false }),
    });
    return;
  } catch {
    await cloudflareApiRequest<unknown>(`/live_inputs/${liveInputId}`, {
      method: "DELETE",
    });
  }
}

export async function getCloudflareLiveInputStatus(liveInputId: string) {
  const input = await cloudflareApiRequest<CloudflareLiveInput>(`/live_inputs/${liveInputId}`, {
    method: "GET",
  });

  if (input.enabled === false) {
    return "disabled" satisfies LivestreamStatus;
  }

  const lifecycleStatus = await fetchCloudflareLifecycleStatus(liveInputId);
  if (lifecycleStatus) {
    return lifecycleStatus;
  }

  return "idle" satisfies LivestreamStatus;
}
