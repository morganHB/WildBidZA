import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function AuditLogTable({
  rows,
}: {
  rows: {
    id: string;
    action: string;
    target_type: string;
    target_id: string | null;
    created_at: string;
    actor_id: string | null;
  }[];
}) {
  if (!rows.length) {
    return <p className="text-sm text-slate-500">No audit events yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Target</TableHead>
          <TableHead>Actor</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{new Date(row.created_at).toLocaleString()}</TableCell>
            <TableCell>{row.action}</TableCell>
            <TableCell>
              {row.target_type}:{row.target_id ?? "-"}
            </TableCell>
            <TableCell>{row.actor_id ?? "system"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
