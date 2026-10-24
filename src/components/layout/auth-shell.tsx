import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-screen">
      <div className="auth-screen__atmosphere" aria-hidden>
        <span className="auth-screen__orb auth-screen__orb--a" />
        <span className="auth-screen__orb auth-screen__orb--b" />
        <span className="auth-screen__orb auth-screen__orb--c" />
        <span className="auth-screen__grain" />
      </div>

      <div className="auth-screen__frame">
        <header className="auth-screen__top">
          <Link href="/" className="auth-screen__back">
            ← Home
          </Link>
          <ThemeToggle />
        </header>

        <main id="main" className="auth-screen__main">
          {children}
        </main>

        <footer className="auth-screen__bottom">
          <p>Secure sign-in · Marketplace account</p>
        </footer>
      </div>
    </div>
  );
}

