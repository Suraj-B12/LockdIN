/* =====================================================================
   AddFriend — invite a friend by code or email. One field that detects which
   you typed (an "@" means email, otherwise an invite code), submits via
   useSendFriendRequest, and reports back through a toast. The request is
   idempotent server-side, so re-sending is safe.
   ===================================================================== */
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { UserPlus, PaperPlaneTilt } from "@phosphor-icons/react";
import { Input, Button } from "@/components/ui";
import { useSendFriendRequest } from "@/lib/queries";
import type { FriendRequestBody } from "@/lib/types";

interface AddFriendProps {
  /** Drop the card chrome + heading (used inside the empty-state pitch, which
   *  already supplies its own copy). Renders just the field + button. */
  compact?: boolean;
}

export function AddFriend({ compact }: AddFriendProps = {}) {
  const [value, setValue] = useState("");
  const send = useSendFriendRequest();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || send.isPending) return;

    const body: FriendRequestBody = trimmed.includes("@")
      ? { email: trimmed }
      : { invite_code: trimmed };

    send.mutate(body, {
      onSuccess: () => {
        toast.success("Request sent", {
          description: `We'll add ${trimmed} to your board once they accept.`,
        });
        setValue("");
      },
      onError: (err) => {
        toast.error("Couldn't send that request", {
          description: err instanceof Error ? err.message : "Please try again.",
        });
      },
    });
  };

  const form = (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Invite code or email"
        aria-label="Friend invite code or email"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        wrapperClassName="flex-1"
      />
      <Button
        type="submit"
        variant="primary"
        trailingIcon={PaperPlaneTilt}
        disabled={!value.trim() || send.isPending}
        className="sm:self-start"
      >
        {send.isPending ? "Sending…" : "Send request"}
      </Button>
    </form>
  );

  // Compact: just the field + button (the empty state supplies its own copy).
  if (compact) return form;

  return (
    <div className="rounded-squircle border border-hairline/[0.07] bg-surface/60 p-6 shadow-inset-top">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-teal/10 text-teal-bright ring-1 ring-inset ring-teal/15">
          <UserPlus weight="duotone" className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display text-lg tracking-tight text-ink">
            Add a friend
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Paste their invite code or email. They'll show up here once they
            accept.
          </p>
        </div>
      </div>

      <div className="mt-5">{form}</div>
    </div>
  );
}
