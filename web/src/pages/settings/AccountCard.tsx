/* =====================================================================
   AccountCard — the signed-in identity + Sign out.
   Sign out clears the Supabase session via useAuth().signOut, then returns to
   the landing page. Uses a sonner toast — never window.confirm/alert.
   ===================================================================== */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SignOut } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Card, Avatar, Button } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/queries";

export function AccountCard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const [signingOut, setSigningOut] = useState(false);

  const name = profile?.display_name ?? user?.user_metadata?.name ?? "You";
  const email = profile?.email ?? user?.email ?? "";
  const avatar =
    profile?.avatar_url ?? (user?.user_metadata?.avatar_url as string | undefined);
  const initials = (name || email || "You").slice(0, 2).toUpperCase();

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      toast.success("Signed out");
      navigate("/");
    } catch {
      setSigningOut(false);
      toast.error("Couldn't sign out", { description: "Please try again." });
    }
  }

  return (
    <Card bodyClassName="p-6 sm:p-7">
      <h2 className="font-display text-xl tracking-tight text-ink">Account</h2>

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar src={avatar} alt={name} size="md" fallback={initials} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{name}</p>
            {email && <p className="truncate text-xs text-ink-faint">{email}</p>}
          </div>
        </div>

        <Button
          variant="outline"
          leadingIcon={SignOut}
          onClick={handleSignOut}
          disabled={signingOut}
          className="sm:shrink-0"
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </Button>
      </div>
    </Card>
  );
}
