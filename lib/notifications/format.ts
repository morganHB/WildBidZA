import { formatZar } from "@/lib/utils/currency";
import type { NotificationListItem, NotificationType } from "@/types/app";
import type { Database, Json } from "@/types/db";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

function payloadRecord(payload: Json): Record<string, Json> {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, Json>;
  }

  return {};
}

function payloadString(payload: Record<string, Json>, key: string) {
  const value = payload[key];
  return typeof value === "string" ? value : null;
}

function payloadNumber(payload: Record<string, Json>, key: string) {
  const value = payload[key];
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function auctionHref(auctionId: string | null, fallback = "/auctions") {
  return auctionId ? `/auctions/${auctionId}` : fallback;
}

function dealHref(auctionId: string | null) {
  return auctionId ? `/deals/${auctionId}` : "/deals";
}

function byType(type: NotificationType, payload: Record<string, Json>) {
  const auctionId = payloadString(payload, "auction_id");
  const auctionTitle = payloadString(payload, "auction_title") ?? "Auction";
  const targetPath = payloadString(payload, "target_path");
  const newAmount = payloadNumber(payload, "new_amount");
  const winningAmount = payloadNumber(payload, "winning_amount");
  const senderName = payloadString(payload, "sender_name") ?? "Participant";

  if (type === "outbid") {
    return {
      title: "You were outbid",
      message: newAmount != null
        ? `${auctionTitle} now has a higher bid at ${formatZar(newAmount)}.`
        : `${auctionTitle} now has a higher bid.`,
      href: targetPath ?? auctionHref(auctionId),
    };
  }

  if (type === "won_auction") {
    return {
      title: "You won an auction",
      message: winningAmount != null
        ? `You won ${auctionTitle} at ${formatZar(winningAmount)}.`
        : `You won ${auctionTitle}.`,
      href: targetPath ?? auctionHref(auctionId),
    };
  }

  if (type === "watchlist_closing_soon") {
    return {
      title: "Watchlist closing soon",
      message: `${auctionTitle} is closing in under 30 minutes.`,
      href: targetPath ?? auctionHref(auctionId),
    };
  }

  if (type === "watched_auction_live") {
    return {
      title: "Watchlist auction is live",
      message: `${auctionTitle} is now live for bidding.`,
      href: targetPath ?? auctionHref(auctionId),
    };
  }

  if (type === "deal_message") {
    return {
      title: "New deal message",
      message: `${senderName} sent a new message about ${auctionTitle}.`,
      href: targetPath ?? dealHref(auctionId),
    };
  }

  if (type === "approval_changed") {
    return {
      title: "Approval status updated",
      message: "Your bidder approval status has changed.",
      href: "/dashboard",
    };
  }

  return {
    title: "Seller access updated",
    message: "Your seller access status has changed.",
    href: "/dashboard",
  };
}

export function formatNotification(row: NotificationRow): NotificationListItem {
  const payload = payloadRecord(row.payload);
  const normalized = byType(row.type, payload);

  return {
    id: row.id,
    type: row.type,
    title: normalized.title,
    message: normalized.message,
    href: normalized.href,
    created_at: row.created_at,
    read_at: row.read_at,
  };
}

export function formatNotifications(rows: NotificationRow[]): NotificationListItem[] {
  return rows.map((row) => formatNotification(row));
}
