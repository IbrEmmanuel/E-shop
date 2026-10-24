import { cn } from "@/lib/utils";

export function SectionHead({
  title,
  lede,
  action,
  className,
  titleClassName,
}: {
  title: string;
  lede?: string;
  action?: React.ReactNode;
  className?: string;
  titleClassName?: string;
}) {
  return (
    <div className={cn("section-head", className)}>
      <div className="section-head__copy">
        <h2 className={cn("section-head__title", titleClassName)}>{title}</h2>
        {lede ? <p className="section-head__lede">{lede}</p> : null}
      </div>
      {action ? <div className="section-head__action">{action}</div> : null}
    </div>
  );
}
