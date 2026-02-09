import Link from "next/link";
import { Pencil } from "lucide-react";
import { formatZar } from "@/lib/utils/currency";
import { formatAuctionDateLong } from "@/lib/utils/datetime";
import { AuctionStatusBadge } from "@/components/auctions/status-badge";
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
    bids: { amount: number }[];
  }[];
}) {
  if (!listings.length) {
    return <p className="text-sm text-slate-500">No listings yet. Create your first auction.</p>;
  }

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
            <TableCell className="font-medium">{item.title}</TableCell>
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
