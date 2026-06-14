/* =====================================================================
   AvatarMenu — the right-side control in the authenticated nav.
   Shows the user's avatar; on click, a small origin-aware popover with
   Profile / Settings links and Sign out. Closes on outside click / Escape.
   ===================================================================== */
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { GearSix, SignOut, UserCircle } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/queries";
import { EASE_OUT } from "@/lib/motion";
import { toast } from "sonner";

export function AvatarMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();

  const name = profile?.display_name ?? user?.user_metadata?.name ?? "You";
  const avatar = profile?.avatar_url ?? (user?.user_metadata?.avatar_url as string | undefined);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    toast.success("Signed out");
    navigate("/");
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        className="rounded-full ring-1 ring-inset ring-hairline/10 transition-transform duration-200 ease-out-strong hover:ring-teal/40 active:scale-[0.96]"
      >
        <Avatar src={avatar} alt={name} size="sm" fallback={name} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.16, ease: EASE_OUT }}
            style={{ transformOrigin: "top right" }}
            className="absolute right-0 top-12 w-56 overflow-hidden rounded-2xl border border-hairline/10 bg-surface-2/95 p-1.5 shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_20px_50px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 px-3 py-2.5">
              <Avatar src={avatar} alt={name} size="sm" fallback={name} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{name}</p>
                <p className="truncate text-xs text-ink-faint">{user?.email}</p>
              </div>
            </div>
            <div className="my-1 h-px bg-hairline/[0.07]" />
            <MenuLink to="/profile" icon={<UserCircle weight="regular" />}>
              Profile
            </MenuLink>
            <MenuLink to="/settings" icon={<GearSix weight="regular" />}>
              Settings
            </MenuLink>
            <div className="my-1 h-px bg-hairline/[0.07]" />
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-soft transition-colors hover:bg-surface-3 hover:text-ink"
            >
              <SignOut weight="regular" className="h-[18px] w-[18px] text-ink-muted" />
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuLink({
  to,
  icon,
  children,
}: {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-soft transition-colors hover:bg-surface-3 hover:text-ink [&>svg]:h-[18px] [&>svg]:w-[18px] [&>svg]:text-ink-muted"
    >
      {icon}
      {children}
    </Link>
  );
}
