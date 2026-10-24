export const CONSULTATION_PACKAGES = [
  {
    id: "basic",
    name: "Basic Consultation",
    priceMinor: 1500000,
    description: "30-minute marketplace & catalog planning call.",
  },
  {
    id: "electrical",
    name: "Electrical Planning",
    priceMinor: 3500000,
    description: "Engineering assessment slot for system planning.",
  },
  {
    id: "growth",
    name: "Growth Office Hours",
    priceMinor: 2500000,
    description: "Vendor growth, imports, and rental strategy.",
  },
] as const;

export type ConsultationPackageId =
  (typeof CONSULTATION_PACKAGES)[number]["id"];
