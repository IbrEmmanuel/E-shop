import { getSessionUser } from "@/lib/auth";
import { exportErrorCsv, getBatchAccessible } from "@/services/imports";
import { isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ batchId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { batchId } = await params;

  try {
    await getBatchAccessible(user, batchId);

    let csv: string;
    if (isAdmin(user)) {
      // Admin path: export without requiring vendor ownership of session user
      const batch = await prisma.importBatch.findUnique({
        where: { id: batchId },
      });
      if (!batch) return new Response("Not found", { status: 404 });
      const rows = await prisma.importBatchRow.findMany({
        where: {
          batchId,
          status: { in: ["invalid", "failed", "warning"] },
        },
        orderBy: { rowNumber: "asc" },
      });
      const { CSV_TEMPLATE_V1 } = await import("@/services/imports");
      const header = [
        "row_number",
        "sku",
        "status",
        "errors",
        ...CSV_TEMPLATE_V1,
      ];
      const lines = [header.join(",")];
      for (const row of rows) {
        const payload = JSON.parse(row.payloadJson) as Record<string, string>;
        const errors = JSON.parse(row.errorsJson) as string[];
        const escape = (v: string) => {
          let s = v;
          if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
          if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
          return s;
        };
        lines.push(
          [
            String(row.rowNumber),
            escape(row.sku ?? ""),
            escape(row.status),
            escape(errors.join("; ")),
            ...CSV_TEMPLATE_V1.map((c) => escape(payload[c] ?? "")),
          ].join(","),
        );
      }
      csv = lines.join("\n");
    } else {
      csv = await exportErrorCsv(user, batchId);
    }

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="batch-${batchId}-errors.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Forbidden or not found", { status: 403 });
  }
}
