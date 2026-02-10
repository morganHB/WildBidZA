export type BiosecurityMarker = {
  id: string;
  label: string;
  position: [number, number];
  type: "infected" | "high_risk";
  detail: string;
};

export const BIOSECURITY_MAP_CENTER: [number, number] = [-29.0, 24.0];
export const BIOSECURITY_MAP_ZOOM = 5;
export const BIOSECURITY_MAP_MIN_ZOOM = 4;
export const BIOSECURITY_MAP_MAX_ZOOM = 11;

export const BIOSECURITY_MAP_BOUNDS: [[number, number], [number, number]] = [
  [-35.2, 16.0],
  [-21.5, 33.5],
];

export const BIOSECURITY_MARKERS: BiosecurityMarker[] = [
  {
    id: "wc-infected",
    label: "Western Cape cluster",
    position: [-33.55, 19.0],
    type: "infected",
    detail: "Active movement controls in affected livestock corridors.",
  },
  {
    id: "nc-risk",
    label: "Northern Cape monitoring",
    position: [-29.05, 21.7],
    type: "high_risk",
    detail: "Heightened screening for cross-province livestock movement.",
  },
  {
    id: "ec-infected",
    label: "Eastern Cape cluster",
    position: [-32.2, 26.9],
    type: "infected",
    detail: "Biosecurity alert for auction-linked transport routes.",
  },
  {
    id: "fs-risk",
    label: "Free State corridor",
    position: [-29.1, 26.2],
    type: "high_risk",
    detail: "Risk corridor with enhanced compliance checkpoints.",
  },
  {
    id: "kzn-infected",
    label: "KwaZulu-Natal cluster",
    position: [-29.3, 30.4],
    type: "infected",
    detail: "Infected-area management and strict farm entry protocols.",
  },
  {
    id: "lp-risk",
    label: "Limpopo border zone",
    position: [-23.8, 29.6],
    type: "high_risk",
    detail: "Livestock transport traceability checks are intensified.",
  },
  {
    id: "mp-infected",
    label: "Mpumalanga cluster",
    position: [-25.2, 30.7],
    type: "infected",
    detail: "Biosecurity response focused on high-density livestock nodes.",
  },
  {
    id: "gp-risk",
    label: "Gauteng logistics hub",
    position: [-26.1, 28.2],
    type: "high_risk",
    detail: "High-risk transport interchange with strict permit validation.",
  },
];
