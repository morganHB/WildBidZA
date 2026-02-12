import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth/guard";
import { isAdmin, isApprovedSeller } from "@/lib/auth/roles";
import { getSellerReportData, reportToCsv } from "@/lib/reports/queries";
import { reportFiltersSchema } from "@/lib/validation/report";

function readQueryParam(searchParams: URLSearchParams, key: string) {
  const value = searchParams.get(key);
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function GET(request: Request) {
  try {
    const { user, profile } = await requireAuthContext();

    if (!isApprovedSeller(profile) && !isAdmin(profile)) {
      return NextResponse.json(
        { ok: false, error: "Reports are available to marketers and admins only" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const parsed = reportFiltersSchema.safeParse({
      reportType: readQueryParam(searchParams, "reportType"),
      scope: readQueryParam(searchParams, "scope"),
      status: readQueryParam(searchParams, "status"),
      categoryId: readQueryParam(searchParams, "categoryId"),
      province: readQueryParam(searchParams, "province"),
      dateFrom: readQueryParam(searchParams, "dateFrom"),
      dateTo: readQueryParam(searchParams, "dateTo"),
      q: readQueryParam(searchParams, "q"),
      maxRows: 10000,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid report filters" },
        { status: 400 },
      );
    }

    const report = await getSellerReportData({
      userId: user.id,
      isAdmin: isAdmin(profile),
      filters: parsed.data,
    });

    const csv = reportToCsv(report);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `wildbidza-${report.type}-${stamp}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to export report" },
      { status: 400 },
    );
  }
}
