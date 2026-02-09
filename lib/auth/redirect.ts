function normalizeOrigin(value: string | undefined | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function buildBrowserRedirectUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const browserOrigin = typeof window !== "undefined" ? window.location.origin : null;
  const envOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL);

  if (browserOrigin) {
    try {
      const host = new URL(browserOrigin).hostname;
      const isLocalhost = host === "localhost" || host === "127.0.0.1";

      if (isLocalhost && envOrigin) {
        return `${envOrigin}${normalizedPath}`;
      }

      return `${browserOrigin}${normalizedPath}`;
    } catch {
      // Fall through to env origin.
    }
  }

  if (envOrigin) {
    return `${envOrigin}${normalizedPath}`;
  }

  throw new Error("Missing app URL for auth redirect");
}
