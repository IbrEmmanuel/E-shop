import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const n = await prisma.consultation.count();
  if (n > 0) {
    console.log(`Consultations already present: ${n}`);
    return;
  }
  await prisma.consultation.createMany({
    data: [
      {
        reference: "CON-DEMO01",
        name: "Ada Okeke",
        email: "ada@example.com",
        phone: "+2348011111111",
        topic: "Vendor onboarding help",
        message:
          "I want to rent a Growth shop and upload my first CSV. Can we schedule a walkthrough?",
        status: "PENDING",
      },
      {
        reference: "CON-DEMO02",
        name: "Chidi Bassey",
        email: "chidi@example.com",
        topic: "Bulk import mapping",
        message: "Need help mapping variant SKUs before go-live.",
        status: "CONFIRMED",
        scheduledAt: new Date(Date.now() + 3 * 864e5),
      },
    ],
  });
  console.log("Seeded demo consultations");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
