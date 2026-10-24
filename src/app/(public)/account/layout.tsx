/**
 * Order-tracking pages only. No profile / addresses / account chrome.
 */
export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="container-page py-10 md:py-14">{children}</div>;
}
