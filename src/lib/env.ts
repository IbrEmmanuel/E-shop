import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(16),
  AUTH_URL: z.string().url().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  PAYMENT_SECRET_KEY: z.string().optional().default(""),
  PAYMENT_WEBHOOK_SECRET: z.string().optional().default(""),
  NEXT_PUBLIC_PAYMENT_PUBLIC_KEY: z.string().optional().default(""),
  STORAGE_ENDPOINT: z.string().optional().default(""),
  STORAGE_BUCKET: z.string().optional().default(""),
  STORAGE_ACCESS_KEY_ID: z.string().optional().default(""),
  STORAGE_SECRET_ACCESS_KEY: z.string().optional().default(""),
  EMAIL_API_KEY: z.string().optional().default(""),
  EMAIL_FROM: z.string().optional().default("E-Shop <noreply@localhost>"),
  JOB_QUEUE_URL: z.string().optional().default(""),
  JOB_QUEUE_TOKEN: z.string().optional().default(""),
  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_PASSWORD: z.string().optional(),
  SEED_VENDOR_EMAIL: z.string().email().optional(),
  SEED_VENDOR_PASSWORD: z.string().optional(),
  SEED_CUSTOMER_EMAIL: z.string().email().optional(),
  SEED_CUSTOMER_PASSWORD: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${msg}`);
  }
  cached = parsed.data;
  return cached;
}

export function siteUrl(path = ""): string {
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ).replace(/\/$/, "");
  if (!path) return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** @deprecated Paystack removed — bank/fintech transfer is the payment path. */
export function paymentsConfigured(): boolean {
  return false;
}

/** Local outbox always on; Resend used when EMAIL_API_KEY is set. */
export function emailConfigured(): boolean {
  return true;
}

export function emailProvider(): "resend" | "local" {
  return process.env.EMAIL_API_KEY?.trim() ? "resend" : "local";
}

/** Local public/uploads always on; S3 used when remote credentials are set. */
export function storageConfigured(): boolean {
  return true;
}

export function storageProvider(): "remote" | "local" {
  const remote = Boolean(
    process.env.STORAGE_ENDPOINT?.trim() &&
      process.env.STORAGE_BUCKET?.trim() &&
      process.env.STORAGE_ACCESS_KEY_ID?.trim() &&
      process.env.STORAGE_SECRET_ACCESS_KEY?.trim(),
  );
  return remote ? "remote" : "local";
}

export function remoteStorageConfigured(): boolean {
  return storageProvider() === "remote";
}
