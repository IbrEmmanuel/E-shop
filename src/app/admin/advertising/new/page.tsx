import { CreateCampaignForm } from "@/components/forms/create-campaign-form";
import { SectionHeader } from "@/components/dashboard/section-header";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function NewCampaignPage() {
  const session = await getSessionUser();
  const vendors = await prisma.vendor.findMany({
    where: { status: "ACTIVE" },
    orderBy: { storeName: "asc" },
    select: { id: true, storeName: true },
    take: 200,
  });

  return (
    <div className="space-y-8">
      <SectionHeader
        title="New campaign"
        description="Draft a campaign with budget and schedule. Activate after adding creatives."
        userName={session?.name}
      />
      <CreateCampaignForm vendors={vendors} />
    </div>
  );
}
