import { fromJohannesburgToUtc } from "@/lib/utils/datetime";
import { formatZar } from "@/lib/utils/currency";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/db";
import type {
  ReportFiltersInput,
  ReportScope,
  ReportStatus,
  ReportType,
} from "@/lib/validation/report";

type AuctionRow = Database["public"]["Tables"]["auctions"]["Row"];

type ReportValue = string | number | boolean | null;

type ReportRow = Record<string, ReportValue>;

type ReportColumn = {
  key: string;
  label: string;
};

type ReportSummary = {
  label: string;
  value: string;
};

export type SellerReportResult = {
  type: ReportType;
  title: string;
  description: string;
  generatedAt: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  summary: ReportSummary[];
};

type AuctionReportBase = AuctionRow & {
  category:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
  seller:
    | {
        display_name: string | null;
        email: string | null;
      }
    | {
        display_name: string | null;
        email: string | null;
      }[]
    | null;
  winner:
    | {
        display_name: string | null;
        email: string | null;
      }
    | {
        display_name: string | null;
        email: string | null;
      }[]
    | null;
};

type BidRowWithRelations = {
  id: string;
  auction_id: string;
  bidder_id: string;
  amount: number;
  created_at: string;
  auction:
    | (Pick<
        AuctionRow,
        "id" | "title" | "status" | "start_time" | "end_time" | "bid_pricing_mode" | "animal_count"
      > & {})
    | (Pick<
        AuctionRow,
        "id" | "title" | "status" | "start_time" | "end_time" | "bid_pricing_mode" | "animal_count"
      > & {})[]
    | null;
  bidder:
    | {
        display_name: string | null;
        email: string | null;
      }
    | {
        display_name: string | null;
        email: string | null;
      }[]
    | null;
};

export const REPORT_TYPE_OPTIONS: Array<{ value: ReportType; label: string }> = [
  { value: "auction_performance", label: "Auction performance" },
  { value: "bidding_activity", label: "Bidding activity" },
  { value: "sales_outcomes", label: "Sales outcomes" },
];

export const REPORT_SCOPE_OPTIONS: Array<{ value: ReportScope; label: string }> = [
  { value: "all_access", label: "All accessible listings" },
  { value: "owned", label: "Owned listings only" },
  { value: "managed", label: "Managed listings only" },
];

export const REPORT_STATUS_OPTIONS: Array<{ value: ReportStatus; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "upcoming", label: "Upcoming" },
  { value: "live", label: "Live" },
  { value: "ended", label: "Ended" },
];

function takeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function deriveStatus(
  row: Pick<AuctionRow, "status" | "start_time" | "end_time"> & {
    is_waiting_for_previous?: boolean | null;
  },
  nowIso: string,
) {
  if (row.status === "ended") {
    return "ended" as const;
  }

  if (row.is_waiting_for_previous) {
    return "upcoming" as const;
  }

  const now = new Date(nowIso).getTime();
  const start = new Date(row.start_time).getTime();
  const end = new Date(row.end_time).getTime();

  if (now < start) {
    return "upcoming" as const;
  }

  if (now >= end) {
    return "ended" as const;
  }

  return "live" as const;
}

function getDateWindow(filters: ReportFiltersInput) {
  const fromIso = filters.dateFrom
    ? fromJohannesburgToUtc(`${filters.dateFrom}T00:00:00`).toISOString()
    : null;
  const toIso = filters.dateTo
    ? fromJohannesburgToUtc(`${filters.dateTo}T23:59:59.999`).toISOString()
    : null;

  return { fromIso, toIso };
}

async function getAccessibleAuctionIds(params: {
  userId: string;
  isAdmin: boolean;
  scope: ReportScope;
}) {
  const supabase = await createSupabaseServerClient();

  if (params.isAdmin && params.scope === "all_access") {
    return null;
  }

  const [ownedResponse, managedResponse] = await Promise.all([
    supabase.from("auctions").select("id").eq("seller_id", params.userId),
    supabase
      .from("auction_managers")
      .select("auction_id")
      .eq("manager_user_id", params.userId),
  ]);

  if (ownedResponse.error) {
    throw new Error(ownedResponse.error.message);
  }

  if (managedResponse.error) {
    throw new Error(managedResponse.error.message);
  }

  const ownedIds = (ownedResponse.data ?? []).map((row) => row.id);
  const managedIds = (managedResponse.data ?? []).map((row) => row.auction_id);

  if (params.scope === "owned") {
    return ownedIds;
  }

  if (params.scope === "managed") {
    return managedIds;
  }

  return Array.from(new Set([...ownedIds, ...managedIds]));
}

async function getFilteredAuctions(params: {
  userId: string;
  isAdmin: boolean;
  filters: ReportFiltersInput;
}) {
  const supabase = await createSupabaseServerClient();
  const nowIso = new Date().toISOString();
  const { fromIso, toIso } = getDateWindow(params.filters);
  const accessibleAuctionIds = await getAccessibleAuctionIds({
    userId: params.userId,
    isAdmin: params.isAdmin,
    scope: params.filters.scope,
  });

  if (accessibleAuctionIds && accessibleAuctionIds.length === 0) {
    return [] as Array<AuctionReportBase & { derived_status: ReportStatus }>;
  }

  let query = supabase
    .from("auctions")
    .select(
      `
      *,
      category:animal_categories(name),
      seller:profiles!auctions_seller_id_fkey(display_name,email),
      winner:profiles!auctions_winner_user_id_fkey(display_name,email)
    `,
    )
    .order("start_time", { ascending: false })
    .limit(params.filters.maxRows ?? 2000);

  if (accessibleAuctionIds) {
    query = query.in("id", accessibleAuctionIds);
  }

  if (params.filters.q) {
    query = query.or(`title.ilike.%${params.filters.q}%,description.ilike.%${params.filters.q}%`);
  }

  if (params.filters.categoryId) {
    query = query.eq("category_id", params.filters.categoryId);
  }

  if (params.filters.province) {
    query = query.eq("province", params.filters.province);
  }

  if (fromIso) {
    query = query.gte("start_time", fromIso);
  }

  if (toIso) {
    query = query.lte("start_time", toIso);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const rows = ((data ?? []) as AuctionReportBase[]).map((row) => ({
    ...row,
    derived_status: deriveStatus(row, nowIso),
  }));

  if (params.filters.status === "all") {
    return rows;
  }

  return rows.filter((row) => row.derived_status === params.filters.status);
}

async function buildAuctionPerformanceReport(params: {
  auctions: Array<AuctionReportBase & { derived_status: ReportStatus }>;
}) {
  const supabase = await createSupabaseServerClient();
  const auctionIds = params.auctions.map((auction) => auction.id);

  const columns: ReportColumn[] = [
    { key: "auction_id", label: "Auction ID" },
    { key: "title", label: "Title" },
    { key: "category", label: "Category" },
    { key: "province", label: "Province" },
    { key: "status", label: "Status" },
    { key: "start_time", label: "Start Time (UTC)" },
    { key: "end_time", label: "End Time (UTC)" },
    { key: "bid_count", label: "Bid Count" },
    { key: "highest_bid", label: "Highest Bid (ZAR)" },
    { key: "reserve_price", label: "Reserve Price (ZAR)" },
    { key: "reserve_met", label: "Reserve Met" },
    { key: "winner", label: "Winner" },
  ];

  if (auctionIds.length === 0) {
    return {
      columns,
      rows: [] as ReportRow[],
      summary: [
        { label: "Auctions", value: "0" },
        { label: "Total bids", value: "0" },
        { label: "Current value", value: formatZar(0) },
      ] satisfies ReportSummary[],
    };
  }

  const { data: bids, error: bidsError } = await supabase
    .from("bids")
    .select("auction_id,amount")
    .in("auction_id", auctionIds)
    .limit(100000);

  if (bidsError) {
    throw new Error(bidsError.message);
  }

  const bidCountByAuction = new Map<string, number>();
  const highestByAuction = new Map<string, number>();

  for (const bid of bids ?? []) {
    bidCountByAuction.set(bid.auction_id, (bidCountByAuction.get(bid.auction_id) ?? 0) + 1);
    highestByAuction.set(
      bid.auction_id,
      Math.max(highestByAuction.get(bid.auction_id) ?? 0, bid.amount),
    );
  }

  const rows = params.auctions.map((auction) => {
    const winner = takeOne(auction.winner);
    const highestBid = highestByAuction.get(auction.id) ?? auction.starting_bid;
    const reserveMet =
      auction.reserve_price === null ? "N/A" : highestBid >= auction.reserve_price ? "Yes" : "No";

    return {
      auction_id: auction.id,
      title: auction.title,
      category: takeOne(auction.category)?.name ?? "Uncategorized",
      province: auction.province ?? "",
      status: auction.derived_status,
      start_time: auction.start_time,
      end_time: auction.end_time,
      bid_count: bidCountByAuction.get(auction.id) ?? 0,
      highest_bid: highestBid,
      reserve_price: auction.reserve_price ?? "",
      reserve_met: reserveMet,
      winner: winner?.display_name ?? winner?.email ?? "",
    } satisfies ReportRow;
  });

  const totalBidCount = rows.reduce((sum, row) => sum + Number(row.bid_count ?? 0), 0);
  const totalCurrentValue = rows.reduce((sum, row) => sum + Number(row.highest_bid ?? 0), 0);
  const liveCount = rows.filter((row) => row.status === "live").length;
  const endedCount = rows.filter((row) => row.status === "ended").length;

  return {
    columns,
    rows,
    summary: [
      { label: "Auctions", value: String(rows.length) },
      { label: "Live auctions", value: String(liveCount) },
      { label: "Ended auctions", value: String(endedCount) },
      { label: "Total bids", value: String(totalBidCount) },
      { label: "Current value", value: formatZar(totalCurrentValue) },
    ] satisfies ReportSummary[],
  };
}

async function buildBiddingActivityReport(params: {
  auctions: Array<AuctionReportBase & { derived_status: ReportStatus }>;
  filters: ReportFiltersInput;
}) {
  const supabase = await createSupabaseServerClient();
  const auctionIds = params.auctions.map((auction) => auction.id);
  const { fromIso, toIso } = getDateWindow(params.filters);

  const columns: ReportColumn[] = [
    { key: "bid_id", label: "Bid ID" },
    { key: "bid_time", label: "Bid Time (UTC)" },
    { key: "auction_id", label: "Auction ID" },
    { key: "auction_title", label: "Auction Title" },
    { key: "bidder", label: "Bidder" },
    { key: "bid_amount", label: "Bid Amount (ZAR)" },
    { key: "total_packet_value", label: "Total Packet Value (ZAR)" },
    { key: "auction_status", label: "Auction Status" },
  ];

  if (auctionIds.length === 0) {
    return {
      columns,
      rows: [] as ReportRow[],
      summary: [
        { label: "Bids", value: "0" },
        { label: "Unique auctions", value: "0" },
        { label: "Bid value", value: formatZar(0) },
      ] satisfies ReportSummary[],
    };
  }

  let query = supabase
    .from("bids")
    .select(
      `
      id,
      auction_id,
      bidder_id,
      amount,
      created_at,
      auction:auctions!bids_auction_id_fkey(id,title,status,start_time,end_time,bid_pricing_mode,animal_count),
      bidder:profiles!bids_bidder_id_fkey(display_name,email)
    `,
    )
    .in("auction_id", auctionIds)
    .order("created_at", { ascending: false })
    .limit(params.filters.maxRows ?? 2000);

  if (fromIso) {
    query = query.gte("created_at", fromIso);
  }

  if (toIso) {
    query = query.lte("created_at", toIso);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const nowIso = new Date().toISOString();
  const rows = ((data ?? []) as BidRowWithRelations[]).map((bid) => {
    const bidder = takeOne(bid.bidder);
    const auction = takeOne(bid.auction);
    const pricingMode = auction?.bid_pricing_mode ?? "lot_total";
    const animalCount = Math.max(1, auction?.animal_count ?? 1);
    const totalPacketValue = pricingMode === "per_head" ? bid.amount * animalCount : bid.amount;

    return {
      bid_id: bid.id,
      bid_time: bid.created_at,
      auction_id: bid.auction_id,
      auction_title: auction?.title ?? "",
      bidder: bidder?.display_name ?? bidder?.email ?? bid.bidder_id,
      bid_amount: bid.amount,
      total_packet_value: totalPacketValue,
      auction_status: auction ? deriveStatus(auction, nowIso) : "",
    } satisfies ReportRow;
  });

  const uniqueAuctions = new Set(rows.map((row) => String(row.auction_id))).size;
  const totalBidValue = rows.reduce((sum, row) => sum + Number(row.bid_amount ?? 0), 0);

  return {
    columns,
    rows,
    summary: [
      { label: "Bids", value: String(rows.length) },
      { label: "Unique auctions", value: String(uniqueAuctions) },
      { label: "Bid value", value: formatZar(totalBidValue) },
    ] satisfies ReportSummary[],
  };
}

async function buildSalesOutcomesReport(params: {
  auctions: Array<AuctionReportBase & { derived_status: ReportStatus }>;
}) {
  const supabase = await createSupabaseServerClient();
  const endedAuctions = params.auctions.filter((auction) => auction.derived_status === "ended");

  const columns: ReportColumn[] = [
    { key: "auction_id", label: "Auction ID" },
    { key: "auction_title", label: "Auction Title" },
    { key: "ended_at", label: "Ended At (UTC)" },
    { key: "winner", label: "Winner" },
    { key: "winning_bid", label: "Winning Bid (ZAR)" },
    { key: "total_value", label: "Total Value (ZAR)" },
    { key: "reserve_met", label: "Reserve Met" },
    { key: "sold", label: "Sold" },
  ];

  if (endedAuctions.length === 0) {
    return {
      columns,
      rows: [] as ReportRow[],
      summary: [
        { label: "Ended auctions", value: "0" },
        { label: "Sold", value: "0" },
        { label: "Gross sales", value: formatZar(0) },
      ] satisfies ReportSummary[],
    };
  }

  const winningBidIds = endedAuctions
    .map((auction) => auction.winning_bid_id)
    .filter((id): id is string => Boolean(id));

  const winningBidMap = new Map<string, { amount: number; bidder_id: string }>();

  if (winningBidIds.length > 0) {
    const { data: winningBids, error: winningBidError } = await supabase
      .from("bids")
      .select("id,amount,bidder_id")
      .in("id", winningBidIds);

    if (winningBidError) {
      throw new Error(winningBidError.message);
    }

    for (const bid of winningBids ?? []) {
      winningBidMap.set(bid.id, { amount: bid.amount, bidder_id: bid.bidder_id });
    }
  }

  const rows = endedAuctions.map((auction) => {
    const winner = takeOne(auction.winner);
    const winningBid = auction.winning_bid_id
      ? winningBidMap.get(auction.winning_bid_id)?.amount ?? null
      : null;
    const totalValue =
      winningBid === null
        ? null
        : auction.bid_pricing_mode === "per_head"
          ? winningBid * Math.max(1, auction.animal_count)
          : winningBid;
    const reserveMet =
      auction.reserve_price === null || winningBid === null
        ? "N/A"
        : winningBid >= auction.reserve_price
          ? "Yes"
          : "No";

    return {
      auction_id: auction.id,
      auction_title: auction.title,
      ended_at: auction.end_time,
      winner: winner?.display_name ?? winner?.email ?? "",
      winning_bid: winningBid ?? "",
      total_value: totalValue ?? "",
      reserve_met: reserveMet,
      sold: winningBid !== null ? "Yes" : "No",
    } satisfies ReportRow;
  });

  const soldCount = rows.filter((row) => row.sold === "Yes").length;
  const grossSales = rows.reduce((sum, row) => sum + Number(row.total_value || 0), 0);

  return {
    columns,
    rows,
    summary: [
      { label: "Ended auctions", value: String(rows.length) },
      { label: "Sold", value: String(soldCount) },
      { label: "Unsold", value: String(rows.length - soldCount) },
      { label: "Gross sales", value: formatZar(grossSales) },
    ] satisfies ReportSummary[],
  };
}

export async function getSellerReportData(params: {
  userId: string;
  isAdmin: boolean;
  filters: ReportFiltersInput;
}): Promise<SellerReportResult> {
  const auctions = await getFilteredAuctions(params);
  const generatedAt = new Date().toISOString();

  if (params.filters.reportType === "bidding_activity") {
    const report = await buildBiddingActivityReport({
      auctions,
      filters: params.filters,
    });

    return {
      type: params.filters.reportType,
      title: "Bidding Activity Report",
      description: "Bid-by-bid activity for listings that you own or manage.",
      generatedAt,
      ...report,
    };
  }

  if (params.filters.reportType === "sales_outcomes") {
    const report = await buildSalesOutcomesReport({ auctions });

    return {
      type: params.filters.reportType,
      title: "Sales Outcomes Report",
      description: "Ended auction outcomes including sold/unsold and winner details.",
      generatedAt,
      ...report,
    };
  }

  const report = await buildAuctionPerformanceReport({ auctions });

  return {
    type: params.filters.reportType,
    title: "Auction Performance Report",
    description: "Performance overview per listing including bids and reserve progress.",
    generatedAt,
    ...report,
  };
}

function escapeCsvCell(value: ReportValue) {
  if (value === null || value === undefined) {
    return "";
  }

  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function reportToCsv(report: SellerReportResult) {
  const header = report.columns.map((col) => escapeCsvCell(col.label)).join(",");
  const rows = report.rows.map((row) =>
    report.columns.map((col) => escapeCsvCell(row[col.key] ?? "")).join(","),
  );

  return [header, ...rows].join("\n");
}
