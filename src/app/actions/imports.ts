"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { rethrowNextControlFlow } from "@/lib/action-errors";
import { getSessionUser } from "@/lib/auth";
import {
  createImportBatch,
  isSpreadsheetFilename,
  processImportBatch,
  retryFailedImportRows,
} from "@/services/imports";

export type ImportActionResult =
  | { ok: true; batchId?: string }
  | { ok: false; error: string };

export async function uploadImportAction(
  _prev: ImportActionResult | null,
  formData: FormData,
): Promise<ImportActionResult> {
  const user = await getSessionUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Please choose a CSV or XLSX file." };
  }

  const filename = file.name || "import.csv";
  const mode = String(formData.get("mode") || "UPSERT") as
    | "CREATE_ONLY"
    | "UPDATE_BY_SKU"
    | "UPSERT";

  try {
    let csvText: string | undefined;
    let fileBuffer: Buffer | undefined;

    if (isSpreadsheetFilename(filename)) {
      fileBuffer = Buffer.from(await file.arrayBuffer());
    } else {
      csvText = await file.text();
    }

    const vendorId = formData.get("vendorId")
      ? String(formData.get("vendorId"))
      : undefined;

    const batch = await createImportBatch(user, {
      filename,
      csvText,
      fileBuffer,
      mode,
      vendorId,
    });
    revalidatePath("/admin/vendors/batches");
    revalidatePath(`/admin/vendors/batches/${batch.id}`);
    redirect(`/admin/vendors/batches/${batch.id}`);
  } catch (e) {
    rethrowNextControlFlow(e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Upload failed",
    };
  }
}

export async function processImportAction(
  _prev: ImportActionResult | null,
  formData: FormData,
): Promise<ImportActionResult> {
  const user = await getSessionUser();
  const batchId = String(formData.get("batchId") ?? "");
  try {
    const batch = await processImportBatch(user, batchId);
    revalidatePath("/admin/vendors/batches");
    revalidatePath(`/admin/vendors/batches/${batch.id}`);
    return { ok: true, batchId: batch.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Process failed",
    };
  }
}

export async function retryFailedImportAction(
  _prev: ImportActionResult | null,
  formData: FormData,
): Promise<ImportActionResult> {
  const user = await getSessionUser();
  const batchId = String(formData.get("batchId") ?? "");
  try {
    const batch = await retryFailedImportRows(user, batchId);
    revalidatePath("/admin/vendors/batches");
    revalidatePath(`/admin/vendors/batches/${batch.id}`);
    return { ok: true, batchId: batch.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Retry failed",
    };
  }
}
