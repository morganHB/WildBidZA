"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type SellerRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  seller_status: "none" | "approved";
  approval_status: "pending" | "approved" | "rejected";
};

export function SellerPermissionsTable({ rows }: { rows: SellerRow[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const router = useRouter();

  const toggleSeller = async (userId: string, seller_status: "none" | "approved") => {
    setLoadingId(userId);

    try {
      const response = await fetch("/api/admin/sellers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, seller_status }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Request failed");
      }

      toast.success("Seller status updated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Approval</TableHead>
          <TableHead>Seller</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{row.display_name ?? "Unnamed"}</TableCell>
            <TableCell>{row.email}</TableCell>
            <TableCell>{row.approval_status}</TableCell>
            <TableCell>{row.seller_status}</TableCell>
            <TableCell className="text-right">
              <Button
                size="sm"
                variant={row.seller_status === "approved" ? "destructive" : "default"}
                disabled={loadingId === row.id || row.approval_status !== "approved"}
                onClick={() =>
                  toggleSeller(row.id, row.seller_status === "approved" ? "none" : "approved")
                }
              >
                {row.seller_status === "approved" ? "Revoke" : "Grant"}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
