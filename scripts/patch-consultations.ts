import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.consultation.findMany();
  for (const c of rows) {
    if (!c.packageName || c.priceMinor === 0) {
      const electrical = c.topic.toLowerCase().includes("electrical");
      await prisma.consultation.update({
        where: { id: c.id },
        data: {
          packageName: electrical
            ? "Electrical Planning"
            : "Basic Consultation",
          priceMinor: electrical ? 3500000 : 1500000,
          paymentStatus: c.status === "CONFIRMED" ? "PAID" : "UNPAID",
        },
      });
    }
  }

  const owner = await prisma.user.findUnique({
    where: { email: "emmanuelibrahim@gmail.com" },
  });
  if (owner) {
    await prisma.user.update({
      where: { id: owner.id },
      data: {
        firstName: owner.firstName || "Emmanuel",
        lastName: owner.lastName || "Ibrahim",
        name: owner.name || "Emmanuel Ibrahim",
        referralCode: owner.referralCode || "ESHOP-EMMY01",
      },
    });
  }

  console.log("Patched consultations + owner profile");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
