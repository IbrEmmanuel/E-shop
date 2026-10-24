export function timeGreeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function initials(name?: string | null, email?: string | null): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  }
  if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
  return (email || "U").slice(0, 2).toUpperCase();
}

export function ensureReferralCode(userId: string): string {
  const seed = userId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  return `ESHOP-${seed || "USER01"}`;
}
