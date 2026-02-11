import Link from "next/link";
import { Pencil } from "lucide-react";
import { formatZar } from "@/lib/utils/currency";
import { formatAuctionDateLong } from "@/lib/utils/datetime";
import { AuctionStatusBadge } from "@/components/auctions/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function SellerListingsTable({
  listings,
}: {
  listings: {
    id: string;
    title: string;
    status: "upcoming" | "live" | "ended";
    end_time: string;
    current_price: number;
    packet_series_id: string | null;
    packet_sequence: number | null;
    is_waiting_for_previous: boolean;
    bids: { amount: number }[];
  }[];
}) {
  if (!listings.length) {
    return <p className="text-sm text-slate-500">No listings yet. Create your first auction.</p>;
  }

  const packetSeriesCounts = listings.reduce<Record<string, number>>((acc, listing) => {
    if (!listing.packet_series_id) {
      return acc;
    }
    acc[listing.packet_series_id] = (acc[listing.packet_series_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Auction</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Current bid</TableHead>
          <TableHead>Bids</TableHead>
          <TableHead>Ends</TableHead>
          <TableHead className="text-right">Manage</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {listings.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">
              <div className="space-y-1">
                <p>{item.title}</p>
                {item.packet_series_id ? (
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline">
                      Packet {item.packet_sequence}/{packetSeriesCounts[item.packet_series_id]}
                    </Badge>
                    {item.is_waiting_for_previous ? (
                      <Badge variant="warning">Waiting for previous</Badge>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </TableCell>
            <TableCell>
              <AuctionStatusBadge status={item.status} />
            </TableCell>
            <TableCell>{formatZar(item.current_price)}</TableCell>
            <TableCell>{item.bids.length}</TableCell>
            <TableCell>{formatAuctionDateLong(item.end_time)}</TableCell>
            <TableCell className="text-right">
              <Button asChild variant="ghost" size="sm">
                <Link href={`/seller/listings/${item.id}`}>
                  <Pencil className="mr-2 h-4 w-4" />Edit
                </Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
