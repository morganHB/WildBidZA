import "./load-env";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  throw new Error("Missing Supabase env variables.");
}

const supabase = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const categories = [
  { name: "Cattle", description: "Beef and dairy cattle listings" },
  { name: "Sheep", description: "Stud and commercial sheep listings" },
  { name: "Goats", description: "Boer and dairy goats" },
  { name: "Buffalo", description: "Cape buffalo and managed game stock" },
  { name: "Antelope", description: "Commercial antelope game listings" },
  { name: "Horses", description: "Equine livestock and breeding stock" },
];

async function run() {
  const { error } = await supabase.from("animal_categories").upsert(categories, { onConflict: "name" });

  if (error) {
    throw error;
  }

  console.log(`Seeded ${categories.length} categories.`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
