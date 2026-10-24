import { timeGreeting } from "@/lib/greeting";

export function SectionHeader({
  title,
  description,
  userName,
  showGreeting,
  actions,
}: {
  title: string;
  description?: string;
  userName?: string | null;
  showGreeting?: boolean;
  actions?: React.ReactNode;
}) {
  const first = (userName || "User").trim().split(/\s+/)[0] || "User";
  return (
    <header className="section-head mb-8">
      <div className="section-head__copy">
        {showGreeting ? (
          <p className="text-sm font-medium text-[var(--color-text-muted)]">
            {timeGreeting()}, {first}
          </p>
        ) : null}
        <h1 className="type-h2 mt-1">{title}</h1>
        {description ? (
          <p className="section-head__lede mt-2">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="section-head__action">{actions}</div> : null}
    </header>
  );
}
