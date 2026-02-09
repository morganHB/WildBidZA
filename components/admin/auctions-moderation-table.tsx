"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type AuctionRow = {
  id: string;
  title: string;
  status: "upcoming" | "live" | "ended";
  is_active: boolean;
  is_moderated: boolean;
};

export function AuctionsModerationTable({ rows }: { rows: AuctionRow[] }) {
  const router = useRouter();

  const moderate = async (auctionId: string, payload: Record<string, unknown>) => {
    const response = await fetch("/api/admin/auctions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auctionId, ...payload }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      toast.error(data.error ?? "Update failed");
      return;
    }

    toast.success("Auction updated");
    router.refresh();
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Active</TableHead>
          <TableHead>Moderated</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{row.title}</TableCell>
            <TableCell>{row.status}</TableCell>
            <TableCell>{row.is_active ? "Yes" : "No"}</TableCell>
            <TableCell>{row.is_moderated ? "Yes" : "No"}</TableCell>
            <TableCell className="space-x-2 text-right">
              <Button size="sm" variant="outline" onClick={() => moderate(row.id, { is_active: !row.is_active })}>
                {row.is_active ? "Deactivate" : "Activate"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => moderate(row.id, { status: "ended" })}>
                End now
              </Button>
              <Button size="sm" variant="destructive" onClick={() => moderate(row.id, { is_moderated: true })}>
                Hide
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
