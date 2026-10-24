"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center gap-4 py-20 text-center">
      <p className="type-h2">Something went wrong</p>
      <p className="type-body max-w-md">
        The page hit a server error. Try again in a moment.
      </p>
      <button type="button" className="button button--primary" onClick={reset}>
        Reload
      </button>
    </div>
  );
}
