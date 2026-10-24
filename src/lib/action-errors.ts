/** Re-throw Next.js control-flow errors (redirect / notFound) from action catch blocks. */
export function rethrowNextControlFlow(error: unknown): void {
  if (
    error &&
    typeof error === "object" &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string"
  ) {
    const digest = (error as { digest: string }).digest;
    if (
      digest.startsWith("NEXT_REDIRECT") ||
      digest.startsWith("NEXT_NOT_FOUND")
    ) {
      throw error;
    }
  }
}
