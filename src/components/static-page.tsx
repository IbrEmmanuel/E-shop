export function StaticPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="container-page max-w-3xl py-10 md:py-14">
      <h1 className="type-h1">{title}</h1>
      <div className="type-body mt-6 space-y-4">
        {children}
      </div>
    </div>
  );
}
