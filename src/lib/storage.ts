import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getEnv, remoteStorageConfigured } from "@/lib/env";

const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const ALLOWED_DOC_MIME = new Set([
  ...ALLOWED_IMAGE_MIME,
  "application/pdf",
]);

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

/** 12 MiB — enough for high-res product photos at catalog scale */
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

/** Data-URL fallback cap (Vercel read-only FS without S3). */
const DATA_URL_MAX_BYTES = 4 * 1024 * 1024;

export type SaveUploadResult =
  | { ok: true; url: string; storage: "local" | "remote" | "inline" }
  | { ok: false; reason: string };

function validateUpload(
  file: {
    type: string;
    size: number;
  },
  opts?: { allowPdf?: boolean },
): string | null {
  const allowed = opts?.allowPdf ? ALLOWED_DOC_MIME : ALLOWED_IMAGE_MIME;
  if (!allowed.has(file.type)) {
    return opts?.allowPdf
      ? `Unsupported file type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF, PDF.`
      : `Unsupported image type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF.`;
  }
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    return `File must be between 1 byte and ${MAX_UPLOAD_BYTES} bytes.`;
  }
  return null;
}

function publicObjectUrl(key: string): string {
  const env = getEnv();
  const endpoint = env.STORAGE_ENDPOINT.replace(/\/$/, "");
  const bucket = env.STORAGE_BUCKET;
  return `${endpoint}/${bucket}/${key}`;
}

function isServerlessRuntime(): boolean {
  return Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.NEXT_RUNTIME === "nodejs" && process.env.VERCEL_ENV,
  );
}

function asDataUrl(fileType: string, buffer: Buffer): SaveUploadResult {
  if (buffer.byteLength > DATA_URL_MAX_BYTES) {
    return {
      ok: false,
      reason:
        "Image is too large for serverless storage without object storage. Configure STORAGE_* env vars, or upload a smaller proof (under 4 MB).",
    };
  }
  return {
    ok: true,
    url: `data:${fileType};base64,${buffer.toString("base64")}`,
    storage: "inline",
  };
}

/**
 * Save an uploaded image to S3-compatible storage when configured,
 * otherwise to public/uploads locally. On Vercel without S3, falls back to
 * an inline data URL so payment proofs still work (read-only filesystem).
 */
export async function saveUpload(
  file: File | {
    name: string;
    type: string;
    size: number;
    arrayBuffer(): Promise<ArrayBuffer>;
  },
  opts?: { folder?: string; allowPdf?: boolean },
): Promise<SaveUploadResult> {
  const allowPdf =
    opts?.allowPdf ||
    opts?.folder === "vendor-kyc" ||
    opts?.folder === "vendor-docs";
  const err = validateUpload(file, { allowPdf });
  if (err) return { ok: false, reason: err };

  const ext = MIME_EXT[file.type] ?? "bin";
  const folder = (opts?.folder ?? "misc").replace(/[^a-z0-9/_-]/gi, "");
  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (remoteStorageConfigured()) {
    try {
      const env = getEnv();
      const key = `${folder}/${filename}`;
      const client = new S3Client({
        region: "auto",
        endpoint: env.STORAGE_ENDPOINT,
        forcePathStyle: true,
        credentials: {
          accessKeyId: env.STORAGE_ACCESS_KEY_ID,
          secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
        },
      });
      await client.send(
        new PutObjectCommand({
          Bucket: env.STORAGE_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: file.type,
          ACL: "public-read",
        }),
      );
      return { ok: true, url: publicObjectUrl(key), storage: "remote" };
    } catch (e) {
      console.error("[storage:remote-failed]", e);
      return {
        ok: false,
        reason:
          e instanceof Error
            ? e.message
            : "Object storage upload failed",
      };
    }
  }

  // Vercel / Lambda cannot write under /var/task/public
  if (isServerlessRuntime()) {
    return asDataUrl(file.type, buffer);
  }

  try {
    const relativeDir = path.join("uploads", folder);
    const absDir = path.join(process.cwd(), "public", relativeDir);
    await mkdir(absDir, { recursive: true });
    const absPath = path.join(absDir, filename);
    await writeFile(absPath, buffer);
    const url = `/${relativeDir.replace(/\\/g, "/")}/${filename}`;
    return { ok: true, url, storage: "local" };
  } catch (e) {
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code?: string }).code)
        : "";
    // EROFS / EACCES — fall back to inline storage
    if (code === "EROFS" || code === "EACCES" || code === "EPERM") {
      console.warn("[storage:local-readonly-fallback]", code);
      return asDataUrl(file.type, buffer);
    }
    console.error("[storage:local-failed]", e);
    return {
      ok: false,
      reason:
        e instanceof Error ? e.message : "Could not save uploaded image",
    };
  }
}

export function isAllowedImageMime(mime: string): boolean {
  return ALLOWED_IMAGE_MIME.has(mime);
}
