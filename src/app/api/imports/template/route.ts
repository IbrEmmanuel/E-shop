import { csvTemplateDownload, xlsxTemplateDownload } from "@/services/imports";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = (searchParams.get("format") || "csv").toLowerCase();

  if (format === "xlsx") {
    const body = xlsxTemplateDownload();
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="eshop-import-template-v1.xlsx"',
        "Cache-Control": "no-store",
      },
    });
  }

  const body = csvTemplateDownload();
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="eshop-import-template-v1.csv"',
      "Cache-Control": "no-store",
    },
  });
}
