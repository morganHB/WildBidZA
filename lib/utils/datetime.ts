import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { formatDistanceToNowStrict } from "date-fns";
import { APP_TIMEZONE } from "@/lib/constants/app";
import { DATE_DISPLAY_FORMAT } from "@/lib/constants/time";

export function formatAuctionDate(date: string | Date) {
  return formatInTimeZone(date, APP_TIMEZONE, DATE_DISPLAY_FORMAT);
}

export function formatAuctionDateLong(date: string | Date) {
  return formatInTimeZone(date, APP_TIMEZONE, "dd MMM yyyy 'at' HH:mm zzz");
}

export function relativeFromNow(date: string | Date) {
  return formatDistanceToNowStrict(new Date(date), { addSuffix: true });
}

export function getServerNowIso() {
  return new Date().toISOString();
}

export function toJohannesburgDate(date: string | Date) {
  return toZonedTime(date, APP_TIMEZONE);
}

export function fromJohannesburgToUtc(date: string | Date) {
  return fromZonedTime(date, APP_TIMEZONE);
}

export function getCountdownMs(endTime: string, serverNow: string) {
  const end = new Date(endTime).getTime();
  const now = new Date(serverNow).getTime();
  return Math.max(0, end - now);
}
