import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing required env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const SELLER_ID = "d8149f09-9fdd-48a5-bbea-0023da5afc64";
const CATEGORY_ID = "182712e2-f696-483c-a241-51b3f4eaba6f";
const TITLE = "5 Brahman Cows - Live Auction";
const FIXED_END_TIME_ISO = "2026-02-22T18:00:00.000Z"; // Sunday 20:00 SAST

async function assertSeller() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,approval_status,seller_status,role_group,is_admin")
    .eq("id", SELLER_ID)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(`Seller profile not found: ${SELLER_ID}`);
  }

  const sellerEligible =
    data.approval_status === "approved"
    && (data.seller_status === "approved" || data.role_group === "marketer" || data.is_admin === true);

  if (!sellerEligible) {
    throw new Error(`Seller profile is not approved for selling: ${data.email ?? SELLER_ID}`);
  }

  return data;
}

async function assertCategory() {
  const { data, error } = await supabase
    .from("animal_categories")
    .select("id,name,is_active")
    .eq("id", CATEGORY_ID)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(`Category not found: ${CATEGORY_ID}`);
  }

  if (!data.is_active) {
    throw new Error(`Category is inactive: ${data.name}`);
  }

  return data;
}

async function findExistingAuction() {
  const { data, error } = await supabase
    .from("auctions")
    .select("id,status,created_at")
    .eq("seller_id", SELLER_ID)
    .eq("category_id", CATEGORY_ID)
    .eq("title", TITLE)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  return data?.[0] ?? null;
}

async function upsertAuction() {
  const now = new Date();
  const endAt = new Date(FIXED_END_TIME_ISO);

  if (Number.isNaN(endAt.getTime())) {
    throw new Error(`Invalid fixed end time: ${FIXED_END_TIME_ISO}`);
  }

  if (now.getTime() >= endAt.getTime()) {
    throw new Error(
      `Cannot seed live auction because fixed end time has passed (${FIXED_END_TIME_ISO}).`,
    );
  }

  const startIso = now.toISOString();
  const durationMinutes = Math.max(10, Math.ceil((endAt.getTime() - now.getTime()) / 60000));

  const payload = {
    seller_id: SELLER_ID,
    category_id: CATEGORY_ID,
    title: TITLE,
    description:
      "Premium Brahman herd consignment of 5 healthy females from Savanna Ridge Farm. Vaccination records and handling history available for compliant transfer.",
    animal_count: 5,
    avg_weight_kg: 420,
    breed_type: "Brahman",
    sex: "female",
    age: "24-30 months",
    province: "Limpopo",
    city: "Polokwane",
    farm_name: "Savanna Ridge Farm",
    health_notes: "Vaccinated and inspected. Herd managed under routine veterinary protocols.",
    permit_reference: "FMD-COMP-2026-BRAHMAN-001",
    collection_notes: "Collection by appointment with seller after auction settlement.",
    starting_bid: 120000,
    min_increment: 1000,
    reserve_price: null,
    bid_pricing_mode: "lot_total" as const,
    duration_minutes: durationMinutes,
    start_time: startIso,
    end_time: endAt.toISOString(),
    status: "live" as const,
    is_active: true,
    is_moderated: false,
    updated_at: new Date().toISOString(),
  };

  const existing = await findExistingAuction();

  if (existing) {
    const { error } = await supabase.from("auctions").update(payload).eq("id", existing.id);
    if (error) {
      throw error;
    }

    return { auctionId: existing.id, mode: "updated" as const };
  }

  const { data, error } = await supabase
    .from("auctions")
    .insert({
      ...payload,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw error ?? new Error("Failed to insert Brahman live auction");
  }

  return { auctionId: data.id, mode: "inserted" as const };
}

async function run() {
  const [seller, category] = await Promise.all([assertSeller(), assertCategory()]);
  const result = await upsertAuction();

  const { data: row, error: verifyError } = await supabase
    .from("auctions")
    .select(
      "id,title,seller_id,category_id,animal_count,avg_weight_kg,starting_bid,min_increment,bid_pricing_mode,start_time,end_time,status,is_active,is_moderated",
    )
    .eq("id", result.auctionId)
    .single();

  if (verifyError) {
    throw verifyError;
  }

  console.log(`Seller: ${seller.email ?? seller.id}`);
  console.log(`Category: ${category.name}`);
  console.log(`Auction ${result.mode}: ${result.auctionId}`);
  console.log(JSON.stringify(row, null, 2));
}

run().catch((error) => {
  console.error("seed:brahman-live failed");
  console.error(error);
  process.exit(1);
});
