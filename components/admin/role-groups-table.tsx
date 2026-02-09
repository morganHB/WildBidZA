"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ApprovalStatus = "pending" | "approved" | "rejected";
type SellerStatus = "none" | "approved";

type RoleRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  approval_status: ApprovalStatus;
  seller_status: SellerStatus;
  is_admin: boolean;
  created_at: string;
};

type EditableRoleState = {
  approval_status: ApprovalStatus;
  seller_status: SellerStatus;
  is_admin: boolean;
};

export function RoleGroupsTable({ rows, currentUserId }: { rows: RoleRow[]; currentUserId: string }) {
  const router = useRouter();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [state, setState] = useState<Record<string, EditableRoleState>>(() =>
    Object.fromEntries(
      rows.map((row) => [
        row.id,
        {
          approval_status: row.approval_status,
          seller_status: row.seller_status,
          is_admin: row.is_admin,
        },
      ]),
    ),
  );

  const originalById = useMemo(
    () =>
      new Map(
        rows.map((row) => [
          row.id,
          {
            approval_status: row.approval_status,
            seller_status: row.seller_status,
            is_admin: row.is_admin,
          },
        ]),
      ),
    [rows],
  );

  const updateRoleState = <K extends keyof EditableRoleState>(
    userId: string,
    key: K,
    value: EditableRoleState[K],
  ) => {
    setState((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [key]: value,
      },
    }));
  };

  const saveChanges = async (userId: string) => {
    const payload = state[userId];
    if (!payload) {
      return;
    }

    setSavingId(userId);

    try {
      const response = await fetch("/api/admin/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...payload }),
      });

      const json = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(json.error ?? "Failed to update role group");
      }

      toast.success("Role group updated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role group");
    } finally {
      setSavingId(null);
    }
  };

  if (!rows.length) {
    return <p className="text-sm text-slate-500">No users found.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Approval</TableHead>
          <TableHead>Seller</TableHead>
          <TableHead>Admin</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Save</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const current = state[row.id] ?? {
            approval_status: row.approval_status,
            seller_status: row.seller_status,
            is_admin: row.is_admin,
          };
          const original = originalById.get(row.id);
          const hasChanges =
            original &&
            (current.approval_status !== original.approval_status ||
              current.seller_status !== original.seller_status ||
              current.is_admin !== original.is_admin);
          const isSelf = row.id === currentUserId;

          return (
            <TableRow key={row.id}>
              <TableCell>{row.display_name ?? "Unnamed"}</TableCell>
              <TableCell>{row.email}</TableCell>
              <TableCell className="min-w-[170px]">
                <Select
                  value={current.approval_status}
                  onValueChange={(value) =>
                    updateRoleState(row.id, "approval_status", value as ApprovalStatus)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="min-w-[160px]">
                <Select
                  value={current.seller_status}
                  onValueChange={(value) => updateRoleState(row.id, "seller_status", value as SellerStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={current.is_admin}
                    onCheckedChange={(checked) => updateRoleState(row.id, "is_admin", checked)}
                    disabled={isSelf && current.is_admin}
                    aria-label={`Toggle admin status for ${row.email ?? row.id}`}
                  />
                  <span className="text-xs text-slate-500">{current.is_admin ? "Admin" : "User"}</span>
                </div>
              </TableCell>
              <TableCell>{new Date(row.created_at).toLocaleDateString("en-ZA")}</TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  onClick={() => saveChanges(row.id)}
                  disabled={!hasChanges || savingId === row.id}
                >
                  {savingId === row.id ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
