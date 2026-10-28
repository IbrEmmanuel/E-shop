import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { formatMoney } from "@/lib/money";
import { siteUrl } from "@/lib/env";

/**
 * Notify vendors (per VendorOrder) and platform admins that payment cleared.
 */
export async function notifyOrderPaid(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      vendorOrders: {
        include: {
          vendor: {
            select: {
              storeName: true,
              contactEmail: true,
              user: { select: { email: true } },
            },
          },
          items: { select: { titleSnapshot: true, quantity: true } },
        },
      },
    },
  });
  if (!order) return;

  const deskUrl = siteUrl("/vendor/orders");
  const amount = formatMoney(order.totalMinor, order.currency);

  for (const vo of order.vendorOrders) {
    const to =
      vo.vendor.contactEmail || vo.vendor.user.email || null;
    if (!to) continue;
    const lines = vo.items
      .map((i) => `${i.titleSnapshot} × ${i.quantity}`)
      .join(", ");
    await sendEmail({
      to,
      subject: `New paid order ${order.orderNumber} — accept & pack`,
      html: `<p>Payment confirmed for <strong>${order.orderNumber}</strong> (${formatMoney(vo.totalMinor, order.currency)}).</p><p>${lines}</p><p><a href="${deskUrl}">Open vendor desk</a> to accept and pack.</p>`,
      text: `Paid order ${order.orderNumber}. Open ${deskUrl} to fulfil.`,
    }).catch(() => undefined);
  }

  const admins = await prisma.user.findMany({
    where: {
      role: { in: ["ADMIN", "SUPER_ADMIN"] },
      status: "ACTIVE",
    },
    select: { email: true },
    take: 10,
  });
  const adminUrl = siteUrl("/admin/orders");
  await Promise.allSettled(
    admins.map((a) =>
      sendEmail({
        to: a.email,
        subject: `Order paid ${order.orderNumber} · ${amount}`,
        html: `<p>Order <strong>${order.orderNumber}</strong> is paid (${amount}). Vendors notified.</p><p><a href="${adminUrl}">Admin orders</a></p>`,
        text: `Order ${order.orderNumber} paid (${amount}).`,
      }),
    ),
  );
}

/** Customer + vendors: shipment / tracking update. */
export async function notifyOrderShipped(opts: {
  orderId: string;
  trackingNumber?: string | null;
  storeName?: string | null;
}): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: opts.orderId },
    include: {
      user: { select: { email: true, name: true } },
    },
  });
  if (!order) return;

  const to = order.user?.email || order.guestEmail;
  if (!to) return;

  const trackUrl = siteUrl(`/account/orders/${order.orderNumber}`);
  const trackLine = opts.trackingNumber
    ? `<p>Tracking: <strong>${opts.trackingNumber}</strong>${
        opts.storeName ? ` · ${opts.storeName}` : ""
      }</p>`
    : "";

  await sendEmail({
    to,
    subject: `Your order ${order.orderNumber} is on the way`,
    html: `<p>Hi${order.user?.name ? ` ${order.user.name}` : ""},</p><p>Order <strong>${order.orderNumber}</strong> has been dispatched.</p>${trackLine}<p><a href="${trackUrl}">Track delivery</a></p>`,
    text: `Order ${order.orderNumber} shipped. Track: ${trackUrl}`,
  }).catch(() => undefined);
}
