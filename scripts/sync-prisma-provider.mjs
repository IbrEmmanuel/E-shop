/**
 * Sets prisma datasource provider from DATABASE_URL:
 * - file:… / sqlite → sqlite (local)
 * - postgres://… → postgresql (Vercel / Neon)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnvFile();

const url = (process.env.DATABASE_URL || "").trim();
const provider =
  url.startsWith("postgres://") || url.startsWith("postgresql://")
    ? "postgresql"
    : "sqlite";

const schemaPath = resolve(process.cwd(), "prisma/schema.prisma");
const schema = readFileSync(schemaPath, "utf8");
const next = schema.replace(
  /datasource\s+db\s*\{[^}]*\}/s,
  `datasource db {\n  provider = "${provider}"\n  url      = env("DATABASE_URL")\n}`,
);

if (next !== schema) {
  writeFileSync(schemaPath, next);
  console.log(`[sync-prisma-provider] provider → ${provider}`);
} else {
  console.log(`[sync-prisma-provider] provider already ${provider}`);
}
