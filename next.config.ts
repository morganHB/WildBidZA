import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseHost: string | undefined;

if (supabaseUrl) {
  try {
    supabaseHost = new URL(supabaseUrl).hostname;
  } catch {
    supabaseHost = undefined;
  }
}

const nextConfig: NextConfig = {
  onDemandEntries: {
    // Keep compiled dev pages in memory longer to avoid frequent auth chunk rebuilds on slow WASM SWC fallback.
    maxInactiveAge: 15 * 60 * 1000,
    pagesBufferLength: 8,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      ...(supabaseHost
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHost,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  webpack: (config) => {
    if (config.output) {
      // Increase script chunk timeout for slower local rebuilds.
      config.output.chunkLoadTimeout = 300000;
    }
    return config;
  },
};

export default nextConfig;
