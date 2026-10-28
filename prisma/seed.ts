/**
 * Live bootstrap — admin, rental plans, and store settings only.
 * Does NOT create demo vendors, products, blog posts, or stock images.
 * Override credentials via SEED_* / OWNER_* env vars.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = (
    process.env.SEED_ADMIN_EMAIL ||
    process.env.OWNER_EMAIL ||
    "emmanuelibrahim430@gmail.com"
  ).toLowerCase();
  const adminPass =
    process.env.SEED_ADMIN_PASSWORD ||
    process.env.OWNER_PASSWORD ||
    "emmydone123456";

  console.log("[seed] Clearing marketplace catalog & commerce tables…");
  await prisma.adEvent.deleteMany().catch(() => undefined);
  await prisma.adCreative.deleteMany().catch(() => undefined);
  await prisma.adCampaign.deleteMany().catch(() => undefined);
  await prisma.productViewEvent.deleteMany().catch(() => undefined);
  await prisma.audienceConsent.deleteMany().catch(() => undefined);
  await prisma.favourite.deleteMany().catch(() => undefined);
  await prisma.consultation.deleteMany().catch(() => undefined);
  await prisma.walletLedger.deleteMany().catch(() => undefined);
  await prisma.vendorWallet.deleteMany().catch(() => undefined);
  await prisma.importBatchRow.deleteMany();
  await prisma.importBatch.deleteMany();
  await prisma.rentalPayment.deleteMany();
  await prisma.vendorRental.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.vendorOrder.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.vendorApplication.deleteMany();
  await prisma.blogPost.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.address.deleteMany();
  await prisma.customerProfile.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.shopRentalPlan.deleteMany();
  await prisma.category.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.storeSetting.deleteMany();

  const adminHash = await bcrypt.hash(adminPass, 12);

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      name: "Emmanuel Ibrahim",
      firstName: "Emmanuel",
      lastName: "Ibrahim",
      passwordHash: adminHash,
      role: "SUPER_ADMIN",
      referralCode: "ESHOP-OWNER",
    },
  });

  await Promise.all([
    prisma.shopRentalPlan.create({
      data: {
        slug: "starter",
        name: "Starter",
        description:
          "Launch your storefront with core catalog tools and monthly billing.",
        monthlyPriceMinor: 1500000,
        currency: "NGN",
        maxProducts: 50,
        trialDays: 14,
        featuresJson: JSON.stringify([
          "Branded storefront",
          "Product management",
          "CSV & XLSX bulk import",
          "Order desk",
        ]),
        sortOrder: 1,
        isActive: true,
      },
    }),
    prisma.shopRentalPlan.create({
      data: {
        slug: "growth",
        name: "Growth",
        description:
          "Scale inventory, imports, and visibility for growing sellers.",
        monthlyPriceMinor: 3500000,
        currency: "NGN",
        maxProducts: 250,
        trialDays: 14,
        featuresJson: JSON.stringify([
          "Everything in Starter",
          "Up to 250 products",
          "Batch import dashboard",
          "Wallet & payouts ledger",
        ]),
        sortOrder: 2,
        isActive: true,
      },
    }),
    prisma.shopRentalPlan.create({
      data: {
        slug: "pro",
        name: "Pro",
        description:
          "Maximum catalog capacity with featured placement eligibility.",
        monthlyPriceMinor: 7500000,
        currency: "NGN",
        maxProducts: 1000,
        trialDays: 7,
        featuresJson: JSON.stringify([
          "Everything in Growth",
          "Up to 1,000 products",
          "Sponsored placement eligibility",
          "Priority support",
        ]),
        sortOrder: 3,
        isActive: true,
      },
    }),
  ]);

  await prisma.storeSetting.createMany({
    data: [
      { key: "site_name", valueJson: JSON.stringify("E-Shop") },
      {
        key: "site_tagline",
        valueJson: JSON.stringify(
          "A curated multi-vendor marketplace. Discover makers, rent a shop monthly, and sell with confidence.",
        ),
      },
      {
        key: "support_email",
        valueJson: JSON.stringify(adminEmail),
      },
      { key: "currency_default", valueJson: JSON.stringify("NGN") },
      { key: "commission_bps_default", valueJson: JSON.stringify(1000) },
    ],
  });

  console.log("[seed] Live bootstrap complete.");
  console.log(`  Admin: ${admin.email}`);
  console.log("  Plans: starter, growth, pro");
  console.log("  Catalog: empty (add products via admin / vendor apply)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
