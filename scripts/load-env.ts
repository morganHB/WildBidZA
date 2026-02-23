import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";

const envFiles = [".env.local", ".env"];

for (const file of envFiles) {
  const fullPath = resolve(process.cwd(), file);
  if (existsSync(fullPath)) {
    config({ path: fullPath });
  }
}
