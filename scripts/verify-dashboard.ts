import { PrismaClient } from "@prisma/client";
import { getDashboardMetrics } from "../src/services/admin";
import {
  consultationStats,
  listConsultations,
} from "../src/services/consultations";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findUnique({
    where: { email: "emmanuelibrahim@gmail.com" },
  });
  if (!admin) throw new Error("Owner admin missing");

  const session = {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role as "ADMIN",
    status: admin.status,
  };

  const metrics = await getDashboardMetrics(session);
  const stats = await consultationStats(session);
  const consultations = await listConsultations(session);

  console.log("Admin:", admin.email, admin.role);
  console.log("Metrics orders/vendors:", metrics.orders.total, metrics.vendors.active);
  console.log("Consultations:", stats);
  console.log(
    "Queue:",
    consultations.map((c) => `${c.reference}:${c.status}`).join(", "),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
