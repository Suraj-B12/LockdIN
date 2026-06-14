/* =====================================================================
   FloatingNav — a glass pill detached from the top edge (NOT an edge-to-edge
   bar). On desktop: logo, center links, right slot. On mobile: logo + morphing
   hamburger that opens a full-screen glass overlay with staggered link reveals.

   backdrop-blur is applied here because the nav is fixed (allowed by the law).
   ===================================================================== */
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { Logo } from "./Logo";
import { EASE_SMOOTH } from "@/lib/motion";
import type { ReactNode } from "react";

export interface NavItem {
  label: string;
  /** Route path (Link) or in-page hash (anchor). */
  to: string;
  /** Treat `to` as an in-page anchor instead of a route. */
  hash?: boolean;
}

export interface FloatingNavProps {
  items: NavItem[];
  /** Right-aligned actions on desktop (buttons, avatar menu). */
  right?: ReactNode;
  /** Right-aligned actions shown inside the mobile overlay footer. */
  mobileRight?: ReactNode;
  /** Where the logo links. */
  logoTo?: string;
}

export function FloatingNav({ items, right, mobileRight, logoTo = "/" }: FloatingNavProps) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const reduce = useReducedMotion();

  // Lock body scroll while the mobile overlay is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on route change.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const isActive = (item: NavItem) =>
    !item.hash && (location.pathname === item.to || location.pathname.startsWith(item.to + "/"));

  const NavLinkInner = ({ item, onClick }: { item: NavItem; onClick?: () => void }) =>
    item.hash ? (
      <a href={item.to} onClick={onClick}>
        {item.label}
      </a>
    ) : (
      <Link to={item.to} onClick={onClick}>
        {item.label}
      </Link>
    );

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-[80] flex justify-center px-4 pt-4 sm:pt-5">
        <nav
          className={cn(
            "flex h-14 w-full max-w-3xl items-center justify-between gap-4 rounded-full pl-5 pr-3",
            "border border-hairline/10 bg-canvas-2/70 backdrop-blur-xl",
            "shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_12px_40px_-18px_rgba(0,0,0,0.8)]"
          )}
        >
          {item_logo(logoTo)}

          {/* Desktop center links */}
          <ul className="hidden items-center gap-1 md:flex">
            {items.map((item) => (
              <li key={item.label}>
                <span
                  className={cn(
                    "rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors duration-200",
                    isActive(item)
                      ? "bg-surface-2 text-ink"
                      : "text-ink-muted hover:text-ink"
                  )}
                >
                  <NavLinkInner item={item} />
                </span>
              </li>
            ))}
          </ul>

          {/* Desktop right slot */}
          <div className="hidden items-center gap-2 md:flex">{right}</div>

          {/* Mobile hamburger (morphs to X) */}
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="relative grid h-10 w-10 place-items-center rounded-full text-ink md:hidden"
          >
            <span className="relative block h-3.5 w-5">
              <span
                className={cn(
                  "absolute left-0 top-0 h-[2px] w-5 rounded-full bg-current transition-all duration-300 ease-smooth",
                  open && "top-1/2 -translate-y-1/2 rotate-45"
                )}
              />
              <span
                className={cn(
                  "absolute left-0 top-1/2 h-[2px] w-5 -translate-y-1/2 rounded-full bg-current transition-opacity duration-200",
                  open && "opacity-0"
                )}
              />
              <span
                className={cn(
                  "absolute bottom-0 left-0 h-[2px] w-5 rounded-full bg-current transition-all duration-300 ease-smooth",
                  open && "bottom-1/2 translate-y-1/2 -rotate-45"
                )}
              />
            </span>
          </button>
        </nav>
      </header>

      {/* Mobile full-screen overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE_SMOOTH }}
            className="fixed inset-0 z-[79] flex flex-col bg-canvas/85 px-6 pb-10 pt-28 backdrop-blur-2xl md:hidden"
          >
            <ul className="flex flex-col gap-1">
              {items.map((item, i) => (
                <motion.li
                  key={item.label}
                  initial={reduce ? false : { opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 + i * 0.05, duration: 0.5, ease: EASE_SMOOTH }}
                  className="border-b border-hairline/[0.06]"
                >
                  <span
                    className={cn(
                      "block py-4 font-display text-3xl tracking-tightest",
                      isActive(item) ? "text-teal" : "text-ink"
                    )}
                  >
                    <NavLinkInner item={item} onClick={() => setOpen(false)} />
                  </span>
                </motion.li>
              ))}
            </ul>
            {mobileRight && (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 + items.length * 0.05, duration: 0.5, ease: EASE_SMOOTH }}
                className="mt-auto flex flex-col gap-3"
              >
                {mobileRight}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function item_logo(logoTo: string) {
  return (
    <Link to={logoTo} className="shrink-0" aria-label="LockdIN home">
      <Logo withMark size="sm" />
    </Link>
  );
}
