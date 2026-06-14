/* =====================================================================
   Footer — deliberately minimal (no four-column link farm). Wordmark,
   one line, and the essentials.
   ===================================================================== */
import { Link } from "react-router-dom";
import { Container } from "@/components/ui";

export function Footer() {
  return (
    <footer className="relative border-t border-hairline/[0.06] py-12">
      <Container className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
        <div className="flex flex-col items-center gap-1.5 sm:items-start">
          <span className="font-display text-lg tracking-tight text-ink">
            Lockd<span className="text-teal">IN</span>
          </span>
          <p className="text-sm text-ink-faint">Focus together. Stay accountable.</p>
        </div>
        <div className="flex items-center gap-6 text-sm text-ink-muted">
          <a href="#how-it-works" className="transition-colors hover:text-ink">
            How it works
          </a>
          <a href="#the-science" className="transition-colors hover:text-ink">
            The science
          </a>
          <Link to="/privacy" className="transition-colors hover:text-ink">
            Privacy
          </Link>
          <Link to="/terms" className="transition-colors hover:text-ink">
            Terms
          </Link>
          <Link to="/login" className="transition-colors hover:text-ink">
            Log in
          </Link>
        </div>
      </Container>
      <p className="mt-8 text-center text-xs text-ink-faint">
        © 2026 LockdIN — built for people who show up.
      </p>
    </footer>
  );
}
