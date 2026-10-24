import { randomUUID } from "crypto";
import { z } from "zod";
import * as XLSX from "xlsx";
import type { ImportBatch } from "@prisma/client";
import type { ImportMode } from "@/lib/types";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { parseMoneyToMinor, assertNonNegativeMinor } from "@/lib/money";
import {
  isAdmin,
  PermissionError,
  type SessionUser,
} from "@/lib/permissions";
import { slugify, uniqueSlug } from "@/lib/slug";
import { requireOwnedVendor } from "@/services/vendors";

/** CSV / XLSX template v1 column headers (order matters for export). */
export const CSV_TEMPLATE_V1 = [
  "sku",
  "title",
  "description",
  "price",
  "compare_at_price",
  "inventory_qty",
  "category_slug",
  "status",
  "weight_grams",
  "seo_title",
  "seo_description",
  "image_url",
] as const;

export type CsvTemplateColumn = (typeof CSV_TEMPLATE_V1)[number];

const MAX_CSV_BYTES = 2 * 1024 * 1024; // 2 MiB
const MAX_XLSX_BYTES = 4 * 1024 * 1024; // 4 MiB
const MAX_CSV_ROWS = 5_000;
const PROCESS_CHUNK_SIZE = 50;

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function looksLikeFormula(value: string): boolean {
  return FORMULA_PREFIX.test(value.trimStart());
}

function sanitizeCell(raw: string): string {
  const v = raw.trim();
  if (looksLikeFormula(v)) {
    throw new Error("Formula-like values are not allowed in CSV cells");
  }
  return v;
}

/** Minimal RFC4180-ish CSV parse (supports quoted fields). */
function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else if (ch === "\r") {
      // ignore CR
    } else {
      cell += ch;
    }
  }

  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

const rowPayloadSchema = z.object({
  sku: z.string().trim().min(1).max(64),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(10_000),
  price: z.string().trim().min(1),
  compare_at_price: z.string().trim().optional().default(""),
  inventory_qty: z.string().trim().regex(/^\d+$/),
  category_slug: z.string().trim().max(120).optional().default(""),
  status: z
    .enum(["DRAFT", "PENDING_REVIEW", "PUBLISHED", "ARCHIVED", ""])
    .optional()
    .default("DRAFT"),
  weight_grams: z.string().trim().optional().default(""),
  seo_title: z.string().trim().max(200).optional().default(""),
  seo_description: z.string().trim().max(500).optional().default(""),
  image_url: z.string().trim().max(2000).optional().default(""),
});

export type ValidatedImportRow = {
  rowNumber: number;
  status: "valid" | "warning" | "invalid";
  sku: string | null;
  payload: Record<string, string>;
  errors: string[];
};

export type ParseCsvResult = {
  schemaVersion: "1";
  headers: string[];
  rows: ValidatedImportRow[];
  validRows: number;
  warningRows: number;
  invalidRows: number;
};

function validateTable(table: string[][]): ParseCsvResult {
  if (table.length < 2) {
    throw new Error("File must include a header row and at least one data row");
  }

  const headers = table[0].map((h) => sanitizeCell(String(h ?? "")).toLowerCase());
  const required = ["sku", "title", "description", "price", "inventory_qty"];
  for (const col of required) {
    if (!headers.includes(col)) {
      throw new Error(`Missing required column: ${col}`);
    }
  }

  const dataRows = table.slice(1);
  if (dataRows.length > MAX_CSV_ROWS) {
    throw new Error(`Import exceeds ${MAX_CSV_ROWS} row limit`);
  }

  const rows: ValidatedImportRow[] = [];
  let validRows = 0;
  let warningRows = 0;
  let invalidRows = 0;

  dataRows.forEach((cells, idx) => {
    const rowNumber = idx + 2; // 1-based + header
    const payload: Record<string, string> = {};
    const errors: string[] = [];

    try {
      headers.forEach((header, i) => {
        const raw = cells[i] ?? "";
        payload[header] = sanitizeCell(String(raw));
      });
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "Invalid cell");
      rows.push({
        rowNumber,
        status: "invalid",
        sku: payload.sku ?? null,
        payload,
        errors,
      });
      invalidRows++;
      return;
    }

    const parsed = rowPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push(`${issue.path.join(".")}: ${issue.message}`);
      }
    } else {
      try {
        const priceMinor = parseMoneyToMinor(parsed.data.price);
        assertNonNegativeMinor(priceMinor, "price");
        if (parsed.data.compare_at_price) {
          const cmp = parseMoneyToMinor(parsed.data.compare_at_price);
          assertNonNegativeMinor(cmp, "compare_at_price");
        }
        if (
          parsed.data.image_url &&
          !/^https?:\/\//i.test(parsed.data.image_url) &&
          !parsed.data.image_url.startsWith("/")
        ) {
          errors.push("image_url must be http(s) or site-relative path");
        }
      } catch (e) {
        errors.push(e instanceof Error ? e.message : "Invalid money/fields");
      }
    }

    let status: ValidatedImportRow["status"] = "valid";
    if (errors.length > 0) {
      status = "invalid";
      invalidRows++;
    } else if (!payload.category_slug) {
      status = "warning";
      warningRows++;
    } else {
      validRows++;
    }

    rows.push({
      rowNumber,
      status,
      sku: payload.sku || null,
      payload,
      errors,
    });
  });

  return {
    schemaVersion: "1",
    headers,
    rows,
    validRows,
    warningRows,
    invalidRows,
  };
}

export function parseAndValidateCsv(csvText: string): ParseCsvResult {
  if (Buffer.byteLength(csvText, "utf8") > MAX_CSV_BYTES) {
    throw new Error(`CSV exceeds ${MAX_CSV_BYTES} byte limit`);
  }
  return validateTable(parseCsvText(csvText));
}

function cellToString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    // Avoid scientific notation for SKUs / qty
    return String(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export function parseAndValidateXlsx(buffer: Buffer): ParseCsvResult {
  if (buffer.byteLength > MAX_XLSX_BYTES) {
    throw new Error(`XLSX exceeds ${MAX_XLSX_BYTES} byte limit`);
  }
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Workbook has no sheets");
  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(
    sheet,
    { header: 1, defval: "", raw: false },
  );
  const table = raw.map((row) =>
    (Array.isArray(row) ? row : []).map((c) => cellToString(c)),
  );
  return validateTable(table);
}

export function isSpreadsheetFilename(filename: string): boolean {
  return /\.(xlsx|xls)$/i.test(filename);
}

export function parseAndValidateImportFile(input: {
  filename: string;
  text?: string;
  buffer?: Buffer;
}): ParseCsvResult {
  if (isSpreadsheetFilename(input.filename)) {
    if (!input.buffer) throw new Error("XLSX upload requires binary buffer");
    return parseAndValidateXlsx(input.buffer);
  }
  const text = input.text ?? input.buffer?.toString("utf8");
  if (!text) throw new Error("CSV upload requires text content");
  return parseAndValidateCsv(text);
}

const createBatchSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  csvText: z.string().optional(),
  mode: z.enum(["CREATE_ONLY", "UPDATE_BY_SKU", "UPSERT"]).default("UPSERT"),
  idempotencyKey: z.string().min(8).max(128).optional(),
  vendorId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

export async function createImportBatch(
  user: SessionUser | null | undefined,
  raw: z.input<typeof createBatchSchema> & { fileBuffer?: Buffer },
): Promise<ImportBatch> {
  if (!user?.id) throw new PermissionError("Authentication required");
  const actorId = user.id;
  const input = createBatchSchema.parse(raw);
  const vendor = await requireOwnedVendor(
    user,
    isAdmin(user) ? input.vendorId : undefined,
  );
  const idempotencyKey = input.idempotencyKey ?? randomUUID();

  const existing = await prisma.importBatch.findUnique({
    where: { idempotencyKey },
  });
  if (existing) {
    if (existing.vendorId !== vendor.id) {
      throw new PermissionError("Import batch belongs to another vendor");
    }
    return existing;
  }

  if (!input.csvText && !raw.fileBuffer) {
    throw new Error("Import file content is required");
  }

  const parsed = parseAndValidateImportFile({
    filename: input.filename,
    text: input.csvText,
    buffer: raw.fileBuffer,
  });

  const batch = await prisma.$transaction(async (tx) => {
    const created = await tx.importBatch.create({
      data: {
        vendorId: vendor.id,
        initiatedById: actorId,
        filename: input.filename,
        schemaVersion: "1",
        mode: input.mode as ImportMode,
        status: "READY",
        totalRows: parsed.rows.length,
        validRows: parsed.validRows + parsed.warningRows,
        warningRows: parsed.warningRows,
        invalidRows: parsed.invalidRows,
        idempotencyKey,
      },
    });

    for (const row of parsed.rows) {
      await tx.importBatchRow.create({
        data: {
          batchId: created.id,
          rowNumber: row.rowNumber,
          sku: row.sku,
          status: row.status,
          payloadJson: JSON.stringify(row.payload),
          errorsJson: JSON.stringify(row.errors),
        },
      });
    }

    return created;
  });

  await writeAuditLog({
    actorId: actorId,
    action: "import.batch.created",
    entityType: "ImportBatch",
    entityId: batch.id,
    meta: {
      filename: input.filename,
      totalRows: batch.totalRows,
      mode: input.mode,
    },
  });

  return batch;
}

export async function processImportBatch(
  user: SessionUser | null | undefined,
  batchId: string,
): Promise<ImportBatch> {
  const batch = await prisma.importBatch.findUnique({
    where: { id: batchId },
  });
  if (!batch) throw new Error("Import batch not found");

  // Admins may process any batch; vendors only their own.
  const vendor = isAdmin(user)
    ? await requireOwnedVendor(user, batch.vendorId)
    : await requireOwnedVendor(user);
  if (batch.vendorId !== vendor.id) {
    throw new PermissionError("Cannot process another vendor's import");
  }
  if (
    batch.status === "PROCESSING" ||
    batch.status === "COMPLETED" ||
    batch.status === "COMPLETED_WITH_ERRORS"
  ) {
    return batch;
  }
  if (batch.status !== "READY" && batch.status !== "QUEUED") {
    throw new Error(`Batch status ${batch.status} cannot be processed`);
  }

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: { status: "PROCESSING", startedAt: new Date() },
  });

  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  // Always take from the front: processed rows leave the valid/warning set.
  for (;;) {
    const chunk = await prisma.importBatchRow.findMany({
      where: {
        batchId: batch.id,
        status: { in: ["valid", "warning"] },
      },
      orderBy: { rowNumber: "asc" },
      take: PROCESS_CHUNK_SIZE,
    });
    if (chunk.length === 0) break;

    await prisma.$transaction(async (tx) => {
      for (const row of chunk) {
        const payload = JSON.parse(row.payloadJson) as Record<string, string>;
        try {
          const sku = payload.sku?.trim();
          if (!sku) throw new Error("sku required");

          // Never allow assigning products to another vendor — always vendor.id
          const existing = await tx.product.findUnique({
            where: {
              vendorId_sku: { vendorId: vendor.id, sku },
            },
          });

          if (batch.mode === "CREATE_ONLY" && existing) {
            await tx.importBatchRow.update({
              where: { id: row.id },
              data: {
                status: "skipped",
                errorsJson: JSON.stringify(["SKU already exists"]),
              },
            });
            skipped++;
            continue;
          }
          if (batch.mode === "UPDATE_BY_SKU" && !existing) {
            await tx.importBatchRow.update({
              where: { id: row.id },
              data: {
                status: "skipped",
                errorsJson: JSON.stringify(["SKU not found for update"]),
              },
            });
            skipped++;
            continue;
          }

          const priceMinor = parseMoneyToMinor(payload.price);
          assertNonNegativeMinor(priceMinor, "price");
          const compareAtMinor = payload.compare_at_price
            ? parseMoneyToMinor(payload.compare_at_price)
            : null;
          const inventoryQty = parseInt(payload.inventory_qty, 10);
          if (!Number.isInteger(inventoryQty) || inventoryQty < 0) {
            throw new Error("inventory_qty must be a non-negative integer");
          }

          let categoryId: string | null = null;
          if (payload.category_slug) {
            const cat = await tx.category.findUnique({
              where: { slug: payload.category_slug },
            });
            categoryId = cat?.id ?? null;
          }

          const status =
            payload.status === "PUBLISHED" ||
            payload.status === "PENDING_REVIEW" ||
            payload.status === "ARCHIVED" ||
            payload.status === "DRAFT"
              ? payload.status
              : "DRAFT";

          // Publishing via import stays DRAFT unless already allowed — keep PUBLISHED requests as PENDING_REVIEW
          const safeStatus =
            status === "PUBLISHED" ? "PENDING_REVIEW" : status;

          if (existing) {
            await tx.product.update({
              where: { id: existing.id },
              data: {
                title: payload.title,
                description: payload.description,
                priceMinor,
                compareAtMinor,
                inventoryQty,
                categoryId,
                status: safeStatus,
                weightGrams: payload.weight_grams
                  ? parseInt(payload.weight_grams, 10)
                  : null,
                seoTitle: payload.seo_title || null,
                seoDescription: payload.seo_description || null,
              },
            });
            if (payload.image_url) {
              const imgCount = await tx.productImage.count({
                where: { productId: existing.id },
              });
              if (imgCount === 0) {
                await tx.productImage.create({
                  data: {
                    productId: existing.id,
                    url: payload.image_url,
                    sortOrder: 0,
                  },
                });
              }
            }
          } else {
            const base = slugify(payload.title) || "product";
            let slug = uniqueSlug(base, sku.toLowerCase());
            let n = 0;
            while (await tx.product.findUnique({ where: { slug } })) {
              n += 1;
              slug = uniqueSlug(base, `${sku}-${n}`);
            }

            const created = await tx.product.create({
              data: {
                vendorId: vendor.id,
                sku,
                title: payload.title,
                slug,
                description: payload.description,
                priceMinor,
                compareAtMinor,
                inventoryQty,
                categoryId,
                status: safeStatus,
                weightGrams: payload.weight_grams
                  ? parseInt(payload.weight_grams, 10)
                  : null,
                seoTitle: payload.seo_title || null,
                seoDescription: payload.seo_description || null,
              },
            });

            if (payload.image_url) {
              await tx.productImage.create({
                data: {
                  productId: created.id,
                  url: payload.image_url,
                  sortOrder: 0,
                },
              });
            }
          }

          await tx.importBatchRow.update({
            where: { id: row.id },
            data: { status: "succeeded", errorsJson: "[]" },
          });
          succeeded++;
        } catch (e) {
          await tx.importBatchRow.update({
            where: { id: row.id },
            data: {
              status: "failed",
              errorsJson: JSON.stringify([
                e instanceof Error ? e.message : "Row failed",
              ]),
            },
          });
          failed++;
        }
      }
    });
  }

  // Recount from DB so retries never under-count prior successes.
  const [succeededCount, failedCount, skippedCount, invalidCount] =
    await Promise.all([
      prisma.importBatchRow.count({
        where: { batchId: batch.id, status: "succeeded" },
      }),
      prisma.importBatchRow.count({
        where: { batchId: batch.id, status: "failed" },
      }),
      prisma.importBatchRow.count({
        where: { batchId: batch.id, status: "skipped" },
      }),
      prisma.importBatchRow.count({
        where: { batchId: batch.id, status: "invalid" },
      }),
    ]);

  const errorTotal = failedCount + invalidCount;
  const finalStatus =
    errorTotal > 0 ? "COMPLETED_WITH_ERRORS" : "COMPLETED";

  const updated = await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      status: finalStatus,
      succeededRows: succeededCount,
      failedRows: errorTotal,
      skippedRows: skippedCount,
      completedAt: new Date(),
      errorSummary:
        errorTotal > 0 ? `${errorTotal} row(s) failed or invalid` : null,
    },
  });

  await writeAuditLog({
    actorId: vendor.userId,
    action: "import.batch.processed",
    entityType: "ImportBatch",
    entityId: batch.id,
    meta: {
      succeeded: succeededCount,
      failed: failedCount,
      skipped: skippedCount,
      thisRun: { succeeded, failed, skipped },
    },
  });

  return updated;
}

export async function getBatch(
  user: SessionUser | null | undefined,
  batchId: string,
) {
  const vendor = await requireOwnedVendor(user);
  const batch = await prisma.importBatch.findFirst({
    where: { id: batchId, vendorId: vendor.id },
    include: {
      rows: { orderBy: { rowNumber: "asc" }, take: 500 },
      vendor: { select: { id: true, storeName: true, slug: true } },
    },
  });
  if (!batch) throw new Error("Import batch not found");
  return batch;
}

/** Admin can open any batch; vendors only their own. */
export async function getBatchAccessible(
  user: SessionUser | null | undefined,
  batchId: string,
) {
  if (!user?.id) throw new PermissionError("Authentication required");

  if (isAdmin(user)) {
    const batch = await prisma.importBatch.findUnique({
      where: { id: batchId },
      include: {
        rows: { orderBy: { rowNumber: "asc" }, take: 1000 },
        vendor: { select: { id: true, storeName: true, slug: true } },
        initiatedBy: { select: { id: true, email: true, name: true } },
      },
    });
    if (!batch) throw new Error("Import batch not found");
    return batch;
  }

  return getBatch(user, batchId);
}

/**
 * Re-queue failed rows only (succeeded / skipped stay untouched) and reprocess.
 */
export async function retryFailedImportRows(
  user: SessionUser | null | undefined,
  batchId: string,
): Promise<ImportBatch> {
  const batch = await prisma.importBatch.findUnique({ where: { id: batchId } });
  if (!batch) throw new Error("Import batch not found");

  const vendor = isAdmin(user)
    ? await requireOwnedVendor(user, batch.vendorId)
    : await requireOwnedVendor(user);
  if (batch.vendorId !== vendor.id) {
    throw new PermissionError("Cannot retry another vendor's import");
  }
  if (batch.status === "PROCESSING") {
    throw new Error("Batch is already processing");
  }

  const failed = await prisma.importBatchRow.findMany({
    where: { batchId, status: "failed" },
  });
  if (failed.length === 0) {
    throw new Error("No failed rows to retry");
  }

  await prisma.$transaction(async (tx) => {
    for (const row of failed) {
      const payload = JSON.parse(row.payloadJson) as Record<string, string>;
      const recheck = validateTable([
        [...CSV_TEMPLATE_V1],
        CSV_TEMPLATE_V1.map((c) => payload[c] ?? ""),
      ]);
      const validated = recheck.rows[0];
      await tx.importBatchRow.update({
        where: { id: row.id },
        data: {
          status:
            validated?.status === "invalid"
              ? "invalid"
              : validated?.status === "warning"
                ? "warning"
                : "valid",
          errorsJson: JSON.stringify(validated?.errors ?? []),
        },
      });
    }

    await tx.importBatch.update({
      where: { id: batchId },
      data: {
        status: "READY",
        completedAt: null,
        errorSummary: null,
        startedAt: null,
      },
    });
  });

  return processImportBatch(user, batchId);
}

export async function listBatches(
  user: SessionUser | null | undefined,
  opts?: { page?: number; pageSize?: number },
) {
  const vendor = await requireOwnedVendor(user);
  const page = opts?.page ?? 1;
  const pageSize = Math.min(opts?.pageSize ?? 20, 100);

  const where = { vendorId: vendor.id };
  const [total, items] = await Promise.all([
    prisma.importBatch.count({ where }),
    prisma.importBatch.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { items, total, page, pageSize };
}

export async function exportErrorCsv(
  user: SessionUser | null | undefined,
  batchId: string,
): Promise<string> {
  const vendor = await requireOwnedVendor(user);
  const batch = await prisma.importBatch.findFirst({
    where: { id: batchId, vendorId: vendor.id },
  });
  if (!batch) throw new Error("Import batch not found");

  const rows = await prisma.importBatchRow.findMany({
    where: {
      batchId,
      status: { in: ["invalid", "failed", "warning"] },
    },
    orderBy: { rowNumber: "asc" },
  });

  const header = ["row_number", "sku", "status", "errors", ...CSV_TEMPLATE_V1];
  const lines = [header.join(",")];

  for (const row of rows) {
    const payload = JSON.parse(row.payloadJson) as Record<string, string>;
    const errors = JSON.parse(row.errorsJson) as string[];
    const cols = [
      String(row.rowNumber),
      csvEscape(row.sku ?? ""),
      csvEscape(row.status),
      csvEscape(errors.join("; ")),
      ...CSV_TEMPLATE_V1.map((c) => csvEscape(payload[c] ?? "")),
    ];
    lines.push(cols.join(","));
  }

  return lines.join("\n");
}

function csvEscape(value: string): string {
  // Neutralize formula injection in exports
  let v = value;
  if (FORMULA_PREFIX.test(v)) v = `'${v}`;
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function csvTemplateDownload(): string {
  return CSV_TEMPLATE_V1.join(",") + "\n";
}

export function xlsxTemplateDownload(): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([[...CSV_TEMPLATE_V1]]);
  XLSX.utils.book_append_sheet(wb, ws, "products");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
