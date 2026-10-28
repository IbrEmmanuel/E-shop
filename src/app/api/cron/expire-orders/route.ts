import { NextResponse } from "next/server";
import { expireStaleUnpaidOrders } from "@/services/orders";

/**
 * Release stock for unpaid orders older than 48h.
 * Protect with CRON_SECRET when called from an external scheduler.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const expired = await expireStaleUnpaidOrders(48);
  return NextResponse.json({ ok: true, expired });
}
