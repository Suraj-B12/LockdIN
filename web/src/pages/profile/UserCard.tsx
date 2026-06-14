/* =====================================================================
   UserCard — identity + the all-important friend-acquisition surface.
   Top: squircle avatar, display name, email, and the invite code shown
   prominently with a one-tap copy. Bottom: the ADD FRIEND form (invite code
   OR email) — the single most prominent action on this screen, because
   getting friends in is the #1 product priority.
   ===================================================================== */
import { useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Copy, UserPlus, PaperPlaneTilt } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Avatar, Button, Card, Input } from "@/components/ui";
import { useSendFriendRequest } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import type { ProfileResponse } from "@/lib/types";
import { EASE_OUT } from "@/lib/motion";

interface UserCardProps {
  profile: ProfileResponse;
}

export function UserCard({ profile }: UserCardProps) {
  const reduce = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const sendRequest = useSendFriendRequest();

  const initials = (profile.display_name || profile.email || "You")
    .slice(0, 2)
    .toUpperCase();

  async function copyCode() {
    if (!profile.invite_code) return;
    try {
      await navigator.clipboard.writeText(profile.invite_code);
      setCopied(true);
      toast.success("Invite code copied", {
        description: "Send it to a friend so they can add you.",
      });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy", { description: "Copy the code manually instead." });
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const raw = value.trim();
    setError(null);

    if (!raw) {
      setError("Enter an invite code or email to send a request.");
      return;
    }
    // Decide which field to send: an "@" means it's an email, otherwise a code.
    const body = raw.includes("@") ? { email: raw } : { invite_code: raw };

    sendRequest.mutate(body, {
      onSuccess: (friend) => {
        setValue("");
        const name = friend?.friend_name;
        // The endpoint is idempotent: an existing pending/accepted relationship
        // returns 200 with the existing row, so we frame success warmly either way.
        toast.success("Request sent", {
          description: name
            ? `We let ${name} know you'd like to lock in together.`
            : "If they're on LockdIN, they'll see your request.",
        });
      },
      onError: (err) => {
        const detail =
          err instanceof ApiError ? err.detail : "Something went wrong. Try again.";
        // 400 self/empty, 404 not found, 409 blocked — surface inline + toast.
        setError(detail);
        toast.error("Couldn't send request", { description: detail });
      },
    });
  }

  return (
    <Card tone="elevated" bodyClassName="p-6 sm:p-7">
      {/* Identity row */}
      <div className="flex items-center gap-4 sm:gap-5">
        <Avatar
          src={profile.avatar_url}
          alt={profile.display_name || "Your avatar"}
          size="xl"
          fallback={initials}
          glow
        />
        <div className="min-w-0">
          <h2 className="truncate font-display text-2xl tracking-tightest text-ink sm:text-[28px]">
            {profile.display_name || "You"}
          </h2>
        </div>
      </div>

      {/* Invite code */}
      <div className="mt-6">
        <p className="text-xs uppercase tracking-eyebrow text-ink-faint">Your invite code</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center rounded-xl bg-surface-2/70 px-4 py-3 ring-1 ring-inset ring-hairline/10 shadow-inset-top">
            <code className="truncate font-mono text-lg font-semibold tracking-wider text-teal-bright tabular">
              {profile.invite_code || "—"}
            </code>
          </div>
          <button
            type="button"
            onClick={copyCode}
            aria-label="Copy invite code"
            className="grid h-[50px] w-[50px] shrink-0 place-items-center rounded-xl bg-surface-2/70 text-ink-soft ring-1 ring-inset ring-hairline/10 shadow-inset-top transition-[transform,color,box-shadow] duration-200 ease-out-strong hover:text-teal-bright hover:ring-teal/40 active:scale-[0.96]"
          >
            <motion.span
              key={copied ? "done" : "copy"}
              initial={reduce ? false : { opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
              className="grid place-items-center"
            >
              {copied ? (
                <Check weight="bold" className="h-5 w-5 text-success" />
              ) : (
                <Copy weight="bold" className="h-5 w-5" />
              )}
            </motion.span>
          </button>
        </div>
      </div>

      {/* Add friend — the headline action */}
      <div className="mt-6 rounded-2xl bg-teal/[0.06] p-5 ring-1 ring-inset ring-teal/20">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal/15 text-teal-bright ring-1 ring-inset ring-teal/25">
            <UserPlus weight="bold" className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Add a friend</p>
            <p className="text-xs text-ink-muted">
              Accountability works better together — bring someone in.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
          <Input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Invite code or email"
            aria-label="Friend's invite code or email"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            error={error ?? undefined}
            wrapperClassName="flex-1"
          />
          <Button
            type="submit"
            variant="primary"
            trailingIcon={PaperPlaneTilt}
            disabled={sendRequest.isPending}
            className="sm:shrink-0"
          >
            {sendRequest.isPending ? "Sending…" : "Send request"}
          </Button>
        </form>
      </div>
    </Card>
  );
}
