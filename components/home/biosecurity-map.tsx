"use client";

import dynamic from "next/dynamic";

const LeafletBiosecurityMap = dynamic(
  () =>
    import("./biosecurity-map-leaflet").then(
      (mod) => mod.BiosecurityLeafletMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[460px] w-full animate-pulse rounded-3xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900" />
    ),
  },
);

export function BiosecurityMap() {
  return <LeafletBiosecurityMap />;
}
