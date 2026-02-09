"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ApprovalRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  approval_status: "pending" | "approved" | "rejected";
  created_at: string;
};

export function ApprovalsTable({ rows }: { rows: ApprovalRow[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const router = useRouter();

  const updateStatus = async (userId: string, approval_status: "approved" | "rejected") => {
    setLoadingId(userId);

    try {
      const response = await fetch("/api/admin/approvals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, approval_status }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Request failed");
      }

      toast.success(`User ${approval_status}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setLoadingId(null);
    }
  };

  if (!rows.length) {
    return <p className="text-sm text-slate-500">No pending approvals.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{row.display_name ?? "Unnamed"}</TableCell>
            <TableCell>{row.email}</TableCell>
            <TableCell>{new Date(row.created_at).toLocaleString()}</TableCell>
            <TableCell className="text-right">
              <div className="inline-flex gap-2">
                <Button
                  size="sm"
                  onClick={() => updateStatus(row.id, "approved")}
                  disabled={loadingId === row.id}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => updateStatus(row.id, "rejected")}
                  disabled={loadingId === row.id}
                >
                  Reject
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
