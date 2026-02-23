import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STARTER_PASSWORD = process.env.STARTER_USER_PASSWORD ?? "WildBidZA!12345";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing required env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

type StarterUser = {
  key: "bidder" | "marketer" | "pending";
  email: string;
  displayName: string;
  phone: string;
  idNumber: string;
  approvalStatus: "pending" | "approved" | "rejected";
  sellerStatus: "none" | "approved";
  roleGroup: "user" | "marketer";
  isAdmin: boolean;
};

type StarterAuction = {
  key: string;
  title: string;
  categoryName: "Cattle" | "Sheep" | "Goats";
  description: string;
  breedType: string;
  sex: "male" | "female";
  age: string;
  animalCount: number;
  avgWeightKg: number | null;
  province: string;
  city: string;
  farmName: string;
  healthNotes: string;
  permitReference: string;
  collectionNotes: string;
  startingBid: number;
  minIncrement: number;
  reservePrice: number | null;
  bidPricingMode: "lot_total" | "per_head";
  startOffsetMinutes: number;
  endOffsetMinutes: number;
  status: "upcoming" | "live" | "ended";
};

const STARTER_USERS: StarterUser[] = [
  {
    key: "bidder",
    email: "buyer.demo@wildbidza.co.za",
    displayName: "Buyer Demo",
    phone: "+27821230001",
    idNumber: "9001015009081",
    approvalStatus: "approved",
    sellerStatus: "none",
    roleGroup: "user",
    isAdmin: false,
  },
  {
    key: "marketer",
    email: "marketer.demo@wildbidza.co.za",
    displayName: "Marketer Demo",
    phone: "+27821230002",
    idNumber: "9102025009082",
    approvalStatus: "approved",
    sellerStatus: "approved",
    roleGroup: "marketer",
    isAdmin: false,
  },
  {
    key: "pending",
    email: "pending.demo@wildbidza.co.za",
    displayName: "Pending Demo",
    phone: "+27821230003",
    idNumber: "9203035009083",
    approvalStatus: "pending",
    sellerStatus: "none",
    roleGroup: "user",
    isAdmin: false,
  },
];

const STARTER_AUCTIONS: StarterAuction[] = [
  {
    key: "live_brahman_herd",
    title: "Starter Demo - 12 Brahman Heifers",
    categoryName: "Cattle",
    description:
      "Healthy Brahman heifers from a disease-managed herd. Full handling records and farm compliance documentation are available on request.",
    breedType: "Brahman",
    sex: "female",
    age: "18-24 months",
    animalCount: 12,
    avgWeightKg: 430,
    province: "Free State",
    city: "Bloemfontein",
    farmName: "Klipfontein Cattle Co.",
    healthNotes: "Vaccinated, dipped, and inspected by attending veterinarian within the last 30 days.",
    permitReference: "FMD-COMP-2026-STARTER-001",
    collectionNotes: "Collection by booked slot after settlement. Loading support available on farm.",
    startingBid: 360000,
    minIncrement: 2500,
    reservePrice: 390000,
    bidPricingMode: "lot_total",
    startOffsetMinutes: -90,
    endOffsetMinutes: 2880,
    status: "live",
  },
  {
    key: "live_dorper_packet",
    title: "Starter Demo - 40 Dorper Ewes (Per Head)",
    categoryName: "Sheep",
    description:
      "Commercial Dorper ewe packet suitable for breeding expansion. Uniform line with clear movement and health traceability records.",
    breedType: "Dorper",
    sex: "female",
    age: "12-18 months",
    animalCount: 40,
    avgWeightKg: 62,
    province: "Northern Cape",
    city: "Upington",
    farmName: "Riverbend Sheep Unit",
    healthNotes: "Routine vaccinations completed and movement paperwork ready for transfer.",
    permitReference: "FMD-COMP-2026-STARTER-002",
    collectionNotes: "Buyer collects entire packet only. No split collection.",
    startingBid: 2850,
    minIncrement: 100,
    reservePrice: null,
    bidPricingMode: "per_head",
    startOffsetMinutes: -30,
    endOffsetMinutes: 2160,
    status: "live",
  },
  {
    key: "upcoming_bonsmara_bull",
    title: "Starter Demo - Registered Bonsmara Bull",
    categoryName: "Cattle",
    description:
      "Registered Bonsmara breeding bull with strong frame, calm temperament, and complete health and movement records available.",
    breedType: "Bonsmara",
    sex: "male",
    age: "36 months",
    animalCount: 1,
    avgWeightKg: 780,
    province: "North West",
    city: "Mahikeng",
    farmName: "Marula Genetics",
    healthNotes: "Breeding soundness checked and all routine herd treatments up to date.",
    permitReference: "FMD-COMP-2026-STARTER-003",
    collectionNotes: "Collection by appointment within 5 business days after close.",
    startingBid: 95000,
    minIncrement: 1000,
    reservePrice: 105000,
    bidPricingMode: "lot_total",
    startOffsetMinutes: 360,
    endOffsetMinutes: 3240,
    status: "upcoming",
  },
  {
    key: "upcoming_boerbok_group",
    title: "Starter Demo - 25 Boerbok Does",
    categoryName: "Goats",
    description:
      "Uniform Boerbok female group for herd building. Animals are managed under strict farm biosecurity with records ready for transfer.",
    breedType: "Boerbok",
    sex: "female",
    age: "14-22 months",
    animalCount: 25,
    avgWeightKg: 48,
    province: "Limpopo",
    city: "Polokwane",
    farmName: "Savanna Ridge Farm",
    healthNotes: "Recent health checks complete, dosing and vaccinations recorded.",
    permitReference: "FMD-COMP-2026-STARTER-004",
    collectionNotes: "Full lot sale only, buyer arranges transport with seller coordination.",
    startingBid: 110000,
    minIncrement: 1500,
    reservePrice: null,
    bidPricingMode: "lot_total",
    startOffsetMinutes: 1440,
    endOffsetMinutes: 5760,
    status: "upcoming",
  },
  {
    key: "ended_kalahari_group",
    title: "Starter Demo - 8 Kalahari Red Goats (Ended)",
    categoryName: "Goats",
    description:
      "Kalahari Red group from known bloodlines. Listing retained as ended demo with complete audit trail for platform testing and training.",
    breedType: "Kalahari Red",
    sex: "female",
    age: "18-24 months",
    animalCount: 8,
    avgWeightKg: 52,
    province: "Mpumalanga",
    city: "Middelburg",
    farmName: "Highveld Red Goat Stud",
    healthNotes: "End-of-auction record set for demonstration and workflow validation.",
    permitReference: "FMD-COMP-2026-STARTER-005",
    collectionNotes: "Completed transaction demo entry.",
    startingBid: 52000,
    minIncrement: 1000,
    reservePrice: 60000,
    bidPricingMode: "lot_total",
    startOffsetMinutes: -4320,
    endOffsetMinutes: -360,
    status: "ended",
  },
];

function isoAtOffsetMinutes(base: Date, minutes: number) {
  return new Date(base.getTime() + minutes * 60000).toISOString();
}

async function findAuthUserIdByEmail(email: string) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw error;
    }

    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) {
      return match.id;
    }

    if (data.users.length < perPage) {
      return null;
    }

    page += 1;
  }
}

async function ensureStarterUser(user: StarterUser) {
  let userId = await findAuthUserIdByEmail(user.email);

  if (!userId) {
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: STARTER_PASSWORD,
      email_confirm: true,
      user_metadata: {
        display_name: user.displayName,
        phone: user.phone,
        id_number: user.idNumber,
      },
    });

    if (createError) {
      throw createError;
    }

    userId = created.user.id;
  } else {
    const { error: updateAuthError } = await supabase.auth.admin.updateUserById(userId, {
      email_confirm: true,
      user_metadata: {
        display_name: user.displayName,
        phone: user.phone,
        id_number: user.idNumber,
      },
    });

    if (updateAuthError) {
      throw updateAuthError;
    }
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email: user.email,
      display_name: user.displayName,
      phone: user.phone,
      id_number: user.idNumber,
      approval_status: user.approvalStatus,
      seller_status: user.sellerStatus,
      role_group: user.roleGroup,
      is_admin: user.isAdmin,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (profileError) {
    throw profileError;
  }

  return userId;
}

async function getCategoryIdByName(name: StarterAuction["categoryName"]) {
  const { data, error } = await supabase
    .from("animal_categories")
    .select("id,name")
    .eq("name", name)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(`Missing required category: ${name}`);
  }

  return data.id;
}

async function upsertStarterAuction(
  definition: StarterAuction,
  sellerId: string,
  categoryId: string,
  baseNow: Date,
) {
  const startIso = isoAtOffsetMinutes(baseNow, definition.startOffsetMinutes);
  const endIso = isoAtOffsetMinutes(baseNow, definition.endOffsetMinutes);
  const durationMinutes = Math.max(
    10,
    Math.ceil((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000),
  );

  const payload = {
    seller_id: sellerId,
    category_id: categoryId,
    title: definition.title,
    description: definition.description,
    breed_type: definition.breedType,
    sex: definition.sex,
    age: definition.age,
    weight: null,
    province: definition.province,
    city: definition.city,
    farm_name: definition.farmName,
    health_notes: definition.healthNotes,
    permit_reference: definition.permitReference,
    collection_notes: definition.collectionNotes,
    animal_count: definition.animalCount,
    avg_weight_kg: definition.avgWeightKg,
    starting_bid: definition.startingBid,
    min_increment: definition.minIncrement,
    reserve_price: definition.reservePrice,
    bid_pricing_mode: definition.bidPricingMode,
    duration_minutes: durationMinutes,
    start_time: startIso,
    end_time: endIso,
    status: definition.status,
    winner_user_id: null,
    winning_bid_id: null,
    is_active: true,
    is_moderated: false,
    is_waiting_for_previous: false,
    auto_start_next: true,
    packet_series_id: null,
    packet_sequence: null,
    previous_packet_auction_id: null,
    updated_at: new Date().toISOString(),
  };

  const { data: existing, error: existingError } = await supabase
    .from("auctions")
    .select("id")
    .eq("seller_id", sellerId)
    .eq("title", definition.title)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing?.id) {
    const { error: updateError } = await supabase.from("auctions").update(payload).eq("id", existing.id);
    if (updateError) {
      throw updateError;
    }

    return existing.id;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("auctions")
    .insert({
      ...payload,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    throw insertError ?? new Error(`Failed to insert auction: ${definition.title}`);
  }

  return inserted.id;
}

async function run() {
  const userIds = new Map<StarterUser["key"], string>();

  for (const user of STARTER_USERS) {
    const userId = await ensureStarterUser(user);
    userIds.set(user.key, userId);
  }

  const { data: morganProfile, error: morganError } = await supabase
    .from("profiles")
    .select("id,email")
    .eq("email", "morganbuitendag@gmail.com")
    .maybeSingle();

  if (morganError) {
    throw morganError;
  }

  const marketerId = userIds.get("marketer");
  const bidderId = userIds.get("bidder");

  if (!marketerId || !bidderId) {
    throw new Error("Missing seeded marketer or bidder user IDs");
  }

  const fallbackBidderId = morganProfile?.id ?? marketerId;
  const baseNow = new Date();

  const categoryIdByName = new Map<StarterAuction["categoryName"], string>();
  for (const name of ["Cattle", "Sheep", "Goats"] as const) {
    categoryIdByName.set(name, await getCategoryIdByName(name));
  }

  const auctionIds = new Map<string, string>();

  for (const auction of STARTER_AUCTIONS) {
    const categoryId = categoryIdByName.get(auction.categoryName);
    if (!categoryId) {
      throw new Error(`No category id available for ${auction.categoryName}`);
    }

    const auctionId = await upsertStarterAuction(auction, marketerId, categoryId, baseNow);
    auctionIds.set(auction.key, auctionId);
  }

  const seededAuctionIds = [...auctionIds.values()];
  const { error: clearBidsError } = await supabase.from("bids").delete().in("auction_id", seededAuctionIds);
  if (clearBidsError) {
    throw clearBidsError;
  }

  const endedAuction = STARTER_AUCTIONS.find((item) => item.key === "ended_kalahari_group");
  const endedAuctionId = auctionIds.get("ended_kalahari_group");
  if (!endedAuction || !endedAuctionId) {
    throw new Error("Missing ended auction seed definition");
  }

  const endedStart = new Date(isoAtOffsetMinutes(baseNow, endedAuction.startOffsetMinutes));
  const endedBidRows = [
    {
      auction_id: endedAuctionId,
      bidder_id: fallbackBidderId,
      amount: 54000,
      created_at: new Date(endedStart.getTime() + 60 * 60000).toISOString(),
    },
    {
      auction_id: endedAuctionId,
      bidder_id: marketerId,
      amount: 57000,
      created_at: new Date(endedStart.getTime() + 180 * 60000).toISOString(),
    },
    {
      auction_id: endedAuctionId,
      bidder_id: bidderId,
      amount: 61000,
      created_at: new Date(endedStart.getTime() + 420 * 60000).toISOString(),
    },
  ];

  const live1AuctionId = auctionIds.get("live_brahman_herd");
  const live2AuctionId = auctionIds.get("live_dorper_packet");

  if (!live1AuctionId || !live2AuctionId) {
    throw new Error("Missing live starter auction IDs");
  }

  const liveBidRows = [
    {
      auction_id: live1AuctionId,
      bidder_id: bidderId,
      amount: 365000,
      created_at: new Date(baseNow.getTime() - 50 * 60000).toISOString(),
    },
    {
      auction_id: live2AuctionId,
      bidder_id: fallbackBidderId,
      amount: 2950,
      created_at: new Date(baseNow.getTime() - 20 * 60000).toISOString(),
    },
  ];

  const { data: insertedBids, error: bidInsertError } = await supabase
    .from("bids")
    .insert([...endedBidRows, ...liveBidRows])
    .select("id,auction_id,bidder_id,amount,created_at");

  if (bidInsertError) {
    throw bidInsertError;
  }

  const endedBidsInserted = (insertedBids ?? []).filter((bid) => bid.auction_id === endedAuctionId);
  const winningBid = [...endedBidsInserted].sort((a, b) => {
    if (b.amount !== a.amount) {
      return b.amount - a.amount;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  })[0];

  if (!winningBid) {
    throw new Error("No winning bid found for ended starter auction");
  }

  const { error: endedAuctionUpdateError } = await supabase
    .from("auctions")
    .update({
      status: "ended",
      winner_user_id: winningBid.bidder_id,
      winning_bid_id: winningBid.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", endedAuctionId);

  if (endedAuctionUpdateError) {
    throw endedAuctionUpdateError;
  }

  const favoriteRows = [
    { user_id: bidderId, auction_id: live1AuctionId },
    { user_id: bidderId, auction_id: live2AuctionId },
  ];
  const { error: favoritesError } = await supabase
    .from("favorites")
    .upsert(favoriteRows, { onConflict: "user_id,auction_id" });
  if (favoritesError) {
    throw favoritesError;
  }

  console.log("Starter data seed complete.");
  console.log(`Starter user password: ${STARTER_PASSWORD}`);
  console.log(
    JSON.stringify(
      {
        users: STARTER_USERS.map((user) => ({
          email: user.email,
          role_group: user.roleGroup,
          approval_status: user.approvalStatus,
          seller_status: user.sellerStatus,
        })),
        auction_ids: Object.fromEntries(auctionIds),
        ended_winner_bid: {
          auction_id: endedAuctionId,
          winning_bid_id: winningBid.id,
          winner_user_id: winningBid.bidder_id,
          amount: winningBid.amount,
        },
      },
      null,
      2,
    ),
  );
}

run().catch((error) => {
  console.error("seed:starter-data failed");
  console.error(error);
  process.exit(1);
});
