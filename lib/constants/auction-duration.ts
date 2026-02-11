export const AUCTION_DURATION_PRESETS = [
  { value: "10m", label: "10 minutes", minutes: 10 },
  { value: "20m", label: "20 minutes", minutes: 20 },
  { value: "30m", label: "30 minutes", minutes: 30 },
  { value: "1h", label: "1 hour", minutes: 60 },
  { value: "2h", label: "2 hours", minutes: 120 },
  { value: "3h", label: "3 hours", minutes: 180 },
  { value: "custom", label: "Custom", minutes: null },
] as const;

export type AuctionDurationPreset = (typeof AUCTION_DURATION_PRESETS)[number]["value"];

export function resolveDurationMinutes(params: {
  preset: AuctionDurationPreset;
  customValue?: number | null;
  customUnit?: "minutes" | "hours";
}) {
  const fromPreset = AUCTION_DURATION_PRESETS.find((item) => item.value === params.preset);

  if (!fromPreset) {
    return 60;
  }

  if (fromPreset.minutes != null) {
    return fromPreset.minutes;
  }

  const numeric = Math.floor(Number(params.customValue ?? 0));
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 10;
  }

  const customUnit = params.customUnit ?? "minutes";
  const base = customUnit === "hours" ? numeric * 60 : numeric;
  return Math.min(10080, Math.max(10, base));
}

export function getPresetFromMinutes(minutes: number): AuctionDurationPreset {
  const found = AUCTION_DURATION_PRESETS.find((item) => item.minutes === minutes);
  return found?.value ?? "custom";
}
