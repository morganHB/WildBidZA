import "dotenv/config";

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error("Missing environment variables:");
  missing.forEach((key) => console.error(`- ${key}`));
  process.exit(1);
}

console.log("Environment variables are configured.");
