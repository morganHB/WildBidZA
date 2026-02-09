export const APP_NAME = "WildBidZA";
export const APP_DESCRIPTION = "Premium South African livestock and game animal auction marketplace.";
export const APP_CURRENCY = "ZAR";
export const APP_LOCALE = "en-ZA";
export const APP_TIMEZONE = "Africa/Johannesburg";

export const MAX_AUCTION_IMAGES = 8;
export const AUCTION_IMAGE_BUCKET = "auction-images";

export const AUCTION_SORT_OPTIONS = [
  "ending_soon",
  "newest",
  "highest_price",
] as const;

export type AuctionSort = (typeof AUCTION_SORT_OPTIONS)[number];
