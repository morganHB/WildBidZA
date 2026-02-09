import type { AuctionStatus } from "@/types/app";
import { Badge } from "@/components/ui/badge";

export function AuctionStatusBadge({ status }: { status: AuctionStatus }) {
  if (status === "live") {
    return <Badge variant="destructive" className="bg-red-500 text-white">LIVE NOW</Badge>;
  }

  if (status === "upcoming") {
    return <Badge variant="warning">UPCOMING</Badge>;
  }

  return <Badge variant="secondary">ENDED</Badge>;
}
