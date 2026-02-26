"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  LoaderCircle,
  Mail,
  Phone,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { formatZar } from "@/lib/utils/currency";
import type { ReportChecklistItem, SellerReportResult } from "@/lib/reports/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatCellValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

export function ReportResultsPanel({
  report,
  initialChecklistItems,
}: {
  report: SellerReportResult;
  initialChecklistItems: ReportChecklistItem[];
}) {
  const [expandedAuctionId, setExpandedAuctionId] = useState<string | null>(null);
  const [checklistItems, setChecklistItems] = useState(initialChecklistItems);
  const [pendingAuctionId, setPendingAuctionId] = useState<string | null>(null);

  const generatedAtText = useMemo(
    () =>
      new Date(report.generatedAt).toLocaleString("en-ZA", {
        timeZone: "Africa/Johannesburg",
      }),
    [report.generatedAt],
  );

  async function toggleChecklistStatus(auctionId: string, nextValue: boolean) {
    setPendingAuctionId(auctionId);

    try {
      const response = await fetch("/api/reports/finalization", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auctionId,
          isCompleted: nextValue,
        }),
      });

      const payload = (await response.json().catch(() => ({ ok: false, error: "Request failed" }))) as {
        ok: boolean;
        error?: string;
        data?: {
          auction_id: string;
          is_completed: boolean;
          completed_at: string | null;
        };
      };

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? "Failed to update lot finalization");
      }

      setChecklistItems((prev) =>
        prev.map((item) =>
          item.auction_id === auctionId
            ? {
                ...item,
                is_completed: payload.data?.is_completed ?? nextValue,
                completed_at: payload.data?.completed_at ?? null,
                completed_by_name: payload.data?.is_completed ? "You" : "",
              }
            : item,
        ),
      );

      toast.success(nextValue ? "Lot marked as finalized." : "Lot moved back to pending.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update lot finalization");
    } finally {
      setPendingAuctionId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{report.title}</CardTitle>
          <CardDescription>{report.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {report.summary.map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
                <p className="mt-2 text-lg font-semibold">{item.value}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-500">Generated at {generatedAtText}</p>

          {report.rows.length === 0 ? (
            <div className="rounded-xl border border-slate-200 p-5 text-sm text-slate-500 dark:border-slate-800">
              No rows found for the selected report and filters.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <Table>
                <TableHeader>
                  <TableRow>
                    {report.columns.map((column) => (
                      <TableHead key={column.key}>{column.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.rows.map((row, rowIndex) => {
                    const auctionId = typeof row.auction_id === "string" ? row.auction_id : null;
                    const details =
                      report.type === "sales_outcomes" && auctionId
                        ? report.salesOutcomeDetails?.[auctionId]
                        : undefined;
                    const canExpand = Boolean(details);
                    const isExpanded = canExpand && expandedAuctionId === auctionId;

                    return (
                      <>
                        <TableRow
                          key={`${rowIndex}-${String(row[report.columns[0]?.key] ?? rowIndex)}`}
                          className={canExpand ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40" : ""}
                          onClick={
                            canExpand
                              ? () =>
                                  setExpandedAuctionId((current) =>
                                    current === auctionId ? null : auctionId,
                                  )
                              : undefined
                          }
                        >
                          {report.columns.map((column, columnIndex) => (
                            <TableCell key={`${rowIndex}-${column.key}`}>
                              {columnIndex === 0 && canExpand ? (
                                <div className="flex items-center gap-2">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-slate-500" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-slate-500" />
                                  )}
                                  <span>{formatCellValue(row[column.key])}</span>
                                </div>
                              ) : (
                                formatCellValue(row[column.key])
                              )}
                            </TableCell>
                          ))}
                        </TableRow>

                        {isExpanded && details ? (
                          <TableRow key={`${auctionId}-details`} className="bg-slate-50/70 dark:bg-slate-900/40">
                            <TableCell colSpan={report.columns.length}>
                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
                                  <p className="text-xs uppercase tracking-wide text-slate-500">Winner details</p>
                                  <p className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
                                    <UserRound className="h-4 w-4 text-slate-500" />
                                    {details.winner_name || "Unknown winner"}
                                  </p>
                                  <p className="mt-1 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                    <Mail className="h-3.5 w-3.5 text-slate-500" />
                                    {details.winner_email || "-"}
                                  </p>
                                  <p className="mt-1 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                    <Phone className="h-3.5 w-3.5 text-slate-500" />
                                    {details.winner_phone || "-"}
                                  </p>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
                                  <p className="text-xs uppercase tracking-wide text-slate-500">Outcome details</p>
                                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                                    Winning bid:{" "}
                                    <span className="font-semibold">
                                      {details.winning_bid !== null ? formatZar(details.winning_bid) : "-"}
                                    </span>
                                  </p>
                                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                                    Total value:{" "}
                                    <span className="font-semibold">
                                      {details.total_value !== null ? formatZar(details.total_value) : "-"}
                                    </span>
                                  </p>
                                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                                    Reserve met: <span className="font-semibold">{details.reserve_met}</span>
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lot finalization checklist</CardTitle>
          <CardDescription>
            Track which lots are finalized and quickly see winner details for follow-up.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {checklistItems.length === 0 ? (
            <div className="rounded-xl border border-slate-200 p-5 text-sm text-slate-500 dark:border-slate-800">
              No lots matched the selected report filters.
            </div>
          ) : (
            checklistItems.map((item) => {
              const isPending = pendingAuctionId === item.auction_id;

              return (
                <div
                  key={item.auction_id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {item.is_completed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Circle className="h-4 w-4 text-slate-400" />
                      )}
                      <p className="font-medium text-slate-900 dark:text-slate-100">{item.auction_title}</p>
                      <Badge variant={item.status === "ended" ? "secondary" : "outline"}>{item.status}</Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      Winner: {item.winner_name || item.winner_email || "Not sold"} |{" "}
                      {item.winning_bid !== null ? formatZar(item.winning_bid) : "-"}
                    </p>
                    <p className="text-xs text-slate-500">
                      Ends:{" "}
                      {new Date(item.end_time).toLocaleString("en-ZA", {
                        timeZone: "Africa/Johannesburg",
                      })}
                      {item.is_completed && item.completed_at
                        ? ` | Finalized ${new Date(item.completed_at).toLocaleString("en-ZA")} by ${
                            item.completed_by_name || "user"
                          }`
                        : ""}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant={item.is_completed ? "outline" : "default"}
                    onClick={() => void toggleChecklistStatus(item.auction_id, !item.is_completed)}
                    disabled={isPending}
                    className={item.is_completed ? "" : "bg-emerald-600 text-white hover:bg-emerald-700"}
                  >
                    {isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {item.is_completed ? "Mark pending" : "Mark finalized"}
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
