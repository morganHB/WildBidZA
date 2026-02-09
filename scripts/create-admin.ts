import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
const adminDisplayName = process.env.ADMIN_DISPLAY_NAME ?? "SavannaBid Admin";

if (!url || !serviceRole || !adminEmail || !adminPassword) {
  throw new Error(
    "Missing required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD",
  );
}

const safeAdminEmail = adminEmail;
const safeAdminPassword = adminPassword;

const supabase = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: safeAdminEmail,
    password: safeAdminPassword,
    email_confirm: true,
    user_metadata: {
      display_name: adminDisplayName,
    },
  });

  if (createError && !createError.message.toLowerCase().includes("already")) {
    throw createError;
  }

  let userId = created.user?.id;

  if (!userId) {
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      throw listError;
    }

    userId = users.users.find((user) => user.email?.toLowerCase() === safeAdminEmail.toLowerCase())?.id;
  }

  if (!userId) {
    throw new Error("Could not resolve admin user ID");
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      display_name: adminDisplayName,
      approval_status: "approved",
      seller_status: "approved",
      role_group: "marketer",
      is_admin: true,
    })
    .eq("id", userId);

  if (profileError) {
    throw profileError;
  }

  console.log(`Admin user ready: ${safeAdminEmail}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

