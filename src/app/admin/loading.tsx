export default function AdminLoading() {
  return (
    <div className="admin-loading" aria-busy="true" aria-live="polite">
      <div className="admin-loading__hero" />
      <div className="admin-loading__grid">
        <div className="admin-loading__card" />
        <div className="admin-loading__card" />
        <div className="admin-loading__card" />
        <div className="admin-loading__card" />
      </div>
      <p className="admin-loading__label">Loading console…</p>
    </div>
  );
}
