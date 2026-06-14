/* =====================================================================
   AppLayout — authenticated shell. Floating glass nav with the app routes,
   plus the avatar menu (Profile / Settings / Sign out). Ambient backdrop +
   grain. Content renders through <Outlet>. Top padding clears the floating nav.
   ===================================================================== */
import { Outlet, useNavigate } from "react-router-dom";
import { BackgroundOrbs, Button, FloatingNav, type NavItem } from "@/components/ui";
import { AvatarMenu } from "@/components/AvatarMenu";
import { SignOut } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";

const APP_NAV: NavItem[] = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Leaderboard", to: "/leaderboard" },
  { label: "History", to: "/history" },
  { label: "Profile", to: "/profile" },
];

export function AppLayout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="relative min-h-[100dvh] bg-canvas">
      <BackgroundOrbs subtle />
      <FloatingNav
        items={APP_NAV}
        logoTo="/dashboard"
        right={<AvatarMenu />}
        mobileRight={
          <Button
            variant="outline"
            fullWidth
            leadingIcon={SignOut}
            onClick={async () => {
              await signOut();
              navigate("/");
            }}
          >
            Sign out
          </Button>
        }
      />
      <main className="relative z-10 px-4 pb-20 pt-24 sm:px-6 sm:pt-28">
        <Outlet />
      </main>
    </div>
  );
}
