import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getEnv, remoteStorageConfigured } from "@/lib/env";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** 5 MiB default max upload size */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export type SaveUploadResult =
  | { ok: true; url: string; storage: "local" | "remote" }
  | { ok: false; reason: string };

function validateImage(file: {
  type: string;
  size: number;
}): string | null {
  if (!ALLOWED_MIME.has(file.type)) {
    return `Unsupported image type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF.`;
  }
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    return `Image must be between 1 byte and ${MAX_UPLOAD_BYTES} bytes.`;
  }
  return null;
}

function publicObjectUrl(key: string): string {
  const env = getEnv();
  const endpoint = env.STORAGE_ENDPOINT.replace(/\/$/, "");
  const bucket = env.STORAGE_BUCKET;
  // Path-style URL works for most S3-compatible providers (R2, MinIO, etc.)
  return `${endpoint}/${bucket}/${key}`;
}

/**
 * Save an uploaded image to S3-compatible storage when configured,
 * otherwise to public/uploads.
 */
export async function saveUpload(
  file: File | {
    name: string;
    type: string;
    size: number;
    arrayBuffer(): Promise<ArrayBuffer>;
  },
  opts?: { folder?: string },
): Promise<SaveUploadResult> {
  const err = validateImage(file);
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

  const relativeDir = path.join("uploads", folder);
  const absDir = path.join(process.cwd(), "public", relativeDir);
  await mkdir(absDir, { recursive: true });
  const absPath = path.join(absDir, filename);
  await writeFile(absPath, buffer);
  const url = `/${relativeDir.replace(/\\/g, "/")}/${filename}`;
  return { ok: true, url, storage: "local" };
}

export function isAllowedImageMime(mime: string): boolean {
  return ALLOWED_MIME.has(mime);
}
