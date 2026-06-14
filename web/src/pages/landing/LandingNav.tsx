/* =====================================================================
   LandingNav — a floating glass pill detached from the top (not an
   edge-to-edge bar). Logo + anchor links + auth CTAs. On mobile the
   hamburger morphs to an X and opens a full-screen blurred overlay with
   staggered links. Honors reduced motion.
   ===================================================================== */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { List, X } from "@phosphor-icons/react";
import { Button, ButtonArrow } from "@/components/ui";
import { EASE_SMOOTH } from "@/lib/motion";

const LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Your buddy", href: "#your-buddy" },
  { label: "The science", href: "#the-science" },
];

export function LandingNav() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);

  const go = (href: string) => {
    setOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-nav flex justify-center px-4 pt-4 sm:pt-5">
        <nav className="flex w-full max-w-[1080px] items-center justify-between gap-4 rounded-full border border-hairline/[0.08] bg-canvas/70 py-2 pl-5 pr-2 shadow-pill backdrop-blur-xl">
          <Link
            to="/"
            className="font-display text-lg tracking-tight text-ink transition-opacity hover:opacity-80"
          >
            Lockd<span className="text-teal">IN</span>
          </Link>

          <div className="hidden items-center gap-0.5 md:flex">
            {LINKS.map((l) => (
              <button
                key={l.href}
                onClick={() => go(l.href)}
                className="rounded-full px-3.5 py-2 text-sm text-ink-muted transition-colors duration-200 hover:text-ink"
              >
                {l.label}
              </button>
            ))}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
              Log in
            </Button>
            <Button size="sm" trailingIcon={ButtonArrow} onClick={() => navigate("/login")}>
              Get started
            </Button>
          </div>

          <button
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-full text-ink transition-colors hover:bg-surface-2 md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X weight="bold" className="h-5 w-5" /> : <List weight="bold" className="h-5 w-5" />}
          </button>
        </nav>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-overlay flex flex-col bg-canvas/85 px-6 pb-10 pt-28 backdrop-blur-2xl md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_SMOOTH }}
          >
            <div className="flex flex-col">
              {LINKS.map((l, i) => (
                <motion.button
                  key={l.href}
                  onClick={() => go(l.href)}
                  className="border-b border-hairline/[0.06] py-4 text-left font-display text-2xl text-ink"
                  initial={reduce ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.06, duration: 0.4, ease: EASE_SMOOTH }}
                >
                  {l.label}
                </motion.button>
              ))}
            </div>
            <div className="mt-auto flex flex-col gap-3">
              <Button variant="outline" size="lg" fullWidth onClick={() => navigate("/login")}>
                Log in
              </Button>
              <Button size="lg" trailingIcon={ButtonArrow} fullWidth onClick={() => navigate("/login")}>
                Get started, it's free
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
