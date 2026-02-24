import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, FileSpreadsheet, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportResultsPanel } from "@/components/reports/report-results-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireAuthPage } from "@/lib/auth/guard";
import { isAdmin, isApprovedSeller } from "@/lib/auth/roles";
import { SOUTH_AFRICA_PROVINCES } from "@/lib/constants/provinces";
import {
  getReportChecklistItems,
  getSellerReportData,
  REPORT_SCOPE_OPTIONS,
  REPORT_STATUS_OPTIONS,
  REPORT_TYPE_OPTIONS,
} from "@/lib/reports/queries";
import { getActiveCategories } from "@/lib/auctions/queries";
import { reportFiltersSchema } from "@/lib/validation/report";

function pickQueryParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user, profile } = await requireAuthPage();

  if (!isApprovedSeller(profile) && !isAdmin(profile)) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const parsed = reportFiltersSchema.safeParse({
    reportType: pickQueryParam(params, "reportType"),
    scope: pickQueryParam(params, "scope"),
    status: pickQueryParam(params, "status"),
    categoryId: pickQueryParam(params, "categoryId"),
    province: pickQueryParam(params, "province"),
    dateFrom: pickQueryParam(params, "dateFrom"),
    dateTo: pickQueryParam(params, "dateTo"),
    q: pickQueryParam(params, "q"),
    maxRows: 2000,
  });

  const filters = parsed.success
    ? parsed.data
    : reportFiltersSchema.parse({ maxRows: 2000 });

  const [categories, report] = await Promise.all([
    getActiveCategories(),
    getSellerReportData({
      userId: user.id,
      isAdmin: isAdmin(profile),
      filters,
    }),
  ]);

  const checklistItems = await getReportChecklistItems({
    userId: user.id,
    isAdmin: isAdmin(profile),
    filters,
  });

  const csvParams = new URLSearchParams();
  csvParams.set("reportType", filters.reportType);
  csvParams.set("scope", filters.scope);
  csvParams.set("status", filters.status);
  if (filters.categoryId) {
    csvParams.set("categoryId", filters.categoryId);
  }
  if (filters.province) {
    csvParams.set("province", filters.province);
  }
  if (filters.dateFrom) {
    csvParams.set("dateFrom", filters.dateFrom);
  }
  if (filters.dateTo) {
    csvParams.set("dateTo", filters.dateTo);
  }
  if (filters.q) {
    csvParams.set("q", filters.q);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <FileSpreadsheet className="h-6 w-6 text-brand-600" />
            Reporting
          </h1>
          <p className="text-sm text-slate-500">
            Build filtered reports and export CSV files for your listings and bidding activity.
          </p>
        </div>
        <Button asChild>
          <Link href={`/api/reports/export?${csvParams.toString()}`}>
            <Download className="mr-2 h-4 w-4" />
            Download CSV
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4 text-brand-600" />
            Report filters
          </CardTitle>
          <CardDescription>Choose report type, date range, scope, and location/category filters.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" method="get">
            <div className="space-y-2">
              <Label htmlFor="reportType">Report type</Label>
              <select
                id="reportType"
                name="reportType"
                defaultValue={filters.reportType}
                className="h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 text-sm outline-none ring-offset-background transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-800 dark:focus:ring-brand-900"
              >
                {REPORT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scope">Scope</Label>
              <select
                id="scope"
                name="scope"
                defaultValue={filters.scope}
                className="h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 text-sm outline-none ring-offset-background transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-800 dark:focus:ring-brand-900"
              >
                {REPORT_SCOPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                defaultValue={filters.status}
                className="h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 text-sm outline-none ring-offset-background transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-800 dark:focus:ring-brand-900"
              >
                {REPORT_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryId">Category</Label>
              <select
                id="categoryId"
                name="categoryId"
                defaultValue={filters.categoryId ?? ""}
                className="h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 text-sm outline-none ring-offset-background transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-800 dark:focus:ring-brand-900"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="province">Province</Label>
              <select
                id="province"
                name="province"
                defaultValue={filters.province ?? ""}
                className="h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 text-sm outline-none ring-offset-background transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-800 dark:focus:ring-brand-900"
              >
                <option value="">All provinces</option>
                {SOUTH_AFRICA_PROVINCES.map((province) => (
                  <option key={province} value={province}>
                    {province}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateFrom">Date from</Label>
              <Input id="dateFrom" name="dateFrom" type="date" defaultValue={filters.dateFrom ?? ""} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateTo">Date to</Label>
              <Input id="dateTo" name="dateTo" type="date" defaultValue={filters.dateTo ?? ""} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="q">Search title/description</Label>
              <Input id="q" name="q" placeholder="e.g. boerbok" defaultValue={filters.q ?? ""} />
            </div>

            <div className="flex items-end gap-2 md:col-span-2 xl:col-span-4">
              <Button type="submit">Apply filters</Button>
              <Button asChild type="button" variant="outline">
                <Link href="/reports">Reset</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ReportResultsPanel report={report} initialChecklistItems={checklistItems} />
    </div>
  );
}
