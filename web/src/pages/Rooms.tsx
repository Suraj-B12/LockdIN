/* =====================================================================
   Rooms — "Lock In Together". Body-doubling without video: open a room, share
   the code, and focus alongside friends. Presence + a combined focus tally are
   polled (no websockets — free-tier-safe). Your focus uses the real session
   (so it still scores + counts toward your streak); the room layers live
   company on top. Degrades gracefully if rooms aren't enabled yet (migration 007).
   ===================================================================== */
import { useEffect, useReducer, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  UsersThree,
  Plus,
  SignIn,
  Copy,
  Check,
  SignOut,
  Play,
  Flag,
  Circle,
  ArrowClockwise,
  ChatCircle,
  PaperPlaneTilt,
} from "@phosphor-icons/react";
import { Avatar, Button, Card, EyebrowTag, Input, Reveal, Skeleton } from "@/components/ui";
import { ApiError } from "@/lib/api";
import {
  useActiveRoom,
  useRoom,
  useCreateRoom,
  useJoinRoom,
  useLeaveRoom,
  useRoomHeartbeat,
  useRoomChat,
  useSendRoomChat,
  useActiveSession,
  useStartSession,
  useResumeSession,
  useFinishSession,
  qk,
} from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import type { RoomResponse, SessionResponse, ChatMessage } from "@/lib/types";
import { formatClock, formatDuration, scoreToneClass } from "./dashboard/utils";
import { WorkLogSheet } from "./dashboard/WorkLogSheet";
import { celebrate, pingMessage } from "@/lib/celebrate";

/** Live elapsed seconds for an active session (banked + current segment). */
function liveElapsed(s: SessionResponse): number {
  const started = new Date(s.started_at).getTime();
  const seg = Number.isNaN(started) ? 0 : Math.max(0, (Date.now() - started) / 1000);
  return s.total_seconds + seg;
}

export function Rooms() {
  const { data: active, isLoading } = useActiveRoom();

  return (
    <div className="mx-auto w-full max-w-[920px]">
      <Reveal className="mb-7 flex flex-col gap-3">
        <EyebrowTag>Lock in together</EyebrowTag>
        <h1 className="font-display text-3xl tracking-tightest text-ink sm:text-4xl">Focus rooms</h1>
        <p className="max-w-xl text-pretty text-sm leading-relaxed text-ink-muted">
          Deep work is easier with company. Open a room, share the code, and lock in side by side —
          your time still counts toward your streak.
        </p>
      </Reveal>

      {isLoading ? (
        <RoomSkeleton />
      ) : active ? (
        <RoomView roomId={active.id} initial={active} />
      ) : (
        <Lobby />
      )}
    </div>
  );
}

/* ---- Lobby: create or join ---- */
function Lobby() {
  const create = useCreateRoom();
  const join = useJoinRoom();
  const [code, setCode] = useState("");

  const onCreate = () =>
    create.mutate(undefined, {
      onError: (err) =>
        toast.error(
          err instanceof ApiError && err.status === 404
            ? "Focus rooms aren't enabled yet."
            : err instanceof Error
              ? err.message
              : "Couldn't open a room."
        ),
    });

  const onJoin = (e: FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!c || join.isPending) return;
    join.mutate(
      { code: c },
      {
        onSuccess: () => setCode(""),
        onError: (err) =>
          toast.error("Couldn't join", {
            description: err instanceof Error ? err.message : "Check the code and try again.",
          }),
      }
    );
  };

  return (
    <Reveal stagger className="grid gap-5 sm:grid-cols-2">
      <Card tone="teal" bodyClassName="p-6 sm:p-7">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-teal/12 text-teal-bright ring-1 ring-inset ring-teal/20">
          <UsersThree weight="duotone" className="h-6 w-6" />
        </span>
        <h2 className="mt-4 font-display text-xl tracking-tight text-ink">Start a room</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
          Open a room and share the code with friends. You'll see who's locked in, live.
        </p>
        <Button
          className="mt-5"
          variant="primary"
          leadingIcon={Plus}
          onClick={onCreate}
          disabled={create.isPending}
        >
          {create.isPending ? "Opening…" : "Open a room"}
        </Button>
      </Card>

      <Card bodyClassName="p-6 sm:p-7">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-surface-3/60 text-ink-soft ring-1 ring-inset ring-hairline/10">
          <SignIn weight="duotone" className="h-6 w-6" />
        </span>
        <h2 className="mt-4 font-display text-xl tracking-tight text-ink">Join a room</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
          Got a code from a friend? Drop in and focus together.
        </p>
        <form onSubmit={onJoin} className="mt-5 flex gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
            placeholder="Room code"
            aria-label="Room code"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="font-mono tracking-widest"
            wrapperClassName="flex-1"
          />
          <Button type="submit" variant="secondary" disabled={!code.trim() || join.isPending}>
            {join.isPending ? "Joining…" : "Join"}
          </Button>
        </form>
      </Card>
    </Reveal>
  );
}

/* ---- In-room view: presence + your focus ---- */
function RoomView({ roomId, initial }: { roomId: string; initial: RoomResponse }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const myId = user?.id;
  const { data: room, isError } = useRoom(roomId, true);
  const r = room ?? initial;

  // Ephemeral chat: poll, render, and alert (toast + ping) on others' messages.
  const { data: chat } = useRoomChat(roomId, true);
  const messages = chat?.messages ?? [];
  const lastSeenIdRef = useRef(0);
  const primedRef = useRef(false);
  useEffect(() => {
    if (!chat) return;
    const latest = chat.latest_id ?? 0;
    // First poll on entry: prime the cursor without alerting on the backlog.
    if (!primedRef.current) {
      primedRef.current = true;
      lastSeenIdRef.current = latest;
      return;
    }
    // Cold-start / buffer-wiped (server restarted) — latest rewound; just resync.
    if (latest <= lastSeenIdRef.current) {
      lastSeenIdRef.current = latest;
      return;
    }
    const fresh = (chat.messages ?? []).filter(
      (m) => m.id > lastSeenIdRef.current && m.user_id !== myId
    );
    // Advance past everything the server has — if >50 messages arrived in one
    // window the oldest are already evicted from the 50-cap ring buffer, so
    // there's nothing to recover (chat is ephemeral). Worst case: a rare missed
    // toast for a since-evicted message.
    lastSeenIdRef.current = latest;
    if (fresh.length > 0) {
      const last = fresh[fresh.length - 1];
      // Title the toast by author only when a single message is new; coalesce
      // multiple into a count so we don't mis-attribute several to one person.
      const title = fresh.length > 1 ? `${fresh.length} new messages` : last.display_name;
      toast.message(title, { description: last.text });
      pingMessage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat?.latest_id]);

  const { data: session } = useActiveSession();
  const start = useStartSession();
  const resume = useResumeSession();
  const finish = useFinishSession();
  const heartbeat = useRoomHeartbeat();
  const leave = useLeaveRoom();

  const [copied, setCopied] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [frozen, setFrozen] = useState(0);
  const [, forceRender] = useReducer((n: number) => n + 1, 0); // 1s display re-render

  const isActive = session?.status === "active";
  const isPaused = session?.status === "paused";

  // Re-render once a second so your live timer ticks.
  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(forceRender, 1000);
    return () => clearInterval(id);
  }, [isActive]);

  // If the room poll definitively fails (closed / left elsewhere → 403/404),
  // drop back to the lobby instead of showing a stale snapshot.
  useEffect(() => {
    if (isError) qc.setQueryData(qk.activeRoom, null);
  }, [isError, qc]);

  // Heartbeat: keep presence live + report focus contribution every ~10s. Read
  // the latest session via a ref so a poll-driven session change (or a cross-
  // device pause/resume) doesn't report stale elapsed or rebuild the interval.
  const hb = useRef(heartbeat);
  hb.current = heartbeat;
  const sessRef = useRef(session);
  sessRef.current = session;
  useEffect(() => {
    const beat = () => {
      const s = sessRef.current;
      const body =
        s?.status === "active"
          ? { focus_seconds: Math.floor(liveElapsed(s)), focusing: true }
          : { focusing: false }; // omit focus_seconds → server preserves your last value
      hb.current.mutate({ id: roomId, body });
    };
    beat();
    const id = setInterval(beat, 10_000);
    return () => clearInterval(id);
  }, [roomId]);

  const myElapsed = isActive ? Math.floor(liveElapsed(session as SessionResponse)) : 0;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(r.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.message(`Room code: ${r.code}`);
    }
  };

  const onLeave = () =>
    leave.mutate(roomId, {
      onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't leave."),
    });

  const onStart = () =>
    start.mutate(undefined, {
      onError: (err) =>
        toast.error(
          err instanceof ApiError && err.status === 409
            ? "You already have a session running."
            : err instanceof Error
              ? err.message
              : "Couldn't start."
        ),
    });

  const onResume = () =>
    resume.mutate(session?.id ?? "", {
      onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't resume."),
    });

  const openFinish = () => {
    if (!session) return;
    setFrozen(isActive ? Math.floor(liveElapsed(session)) : Math.floor(session.total_seconds));
    setSheetOpen(true);
  };

  const onFinishSubmit = (workLog: string) => {
    if (!session) return;
    finish.mutate(
      { id: session.id, body: { work_log: workLog } },
      {
        onSuccess: (done) => {
          setSheetOpen(false);
          celebrate();
          // Land the final segment in the shared tally, then refresh the room
          // immediately (don't wait up to ~10s for the next poll).
          hb.current.mutate(
            { id: roomId, body: { focus_seconds: Math.floor(done.total_seconds), focusing: false } },
            { onSettled: () => qc.invalidateQueries({ queryKey: qk.room(roomId) }) }
          );
          const score = done.ai_score;
          const cls = typeof score === "number" ? scoreToneClass(score) : "text-teal-bright";
          toast.success(
            typeof score === "number" ? (
              <span>
                Scored <span className={`font-mono font-semibold ${cls}`}>{score}</span>/100 — with
                the room 🔥
              </span>
            ) : (
              "Session logged"
            )
          );
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't finish."),
      }
    );
  };

  const live = r.participants.filter((p) => p.live);

  return (
    <Reveal stagger className="flex flex-col gap-5">
      {/* Header: code + live count + leave */}
      <Card bodyClassName="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={copyCode}
              className="group inline-flex items-center gap-2 rounded-xl bg-surface-2/70 px-3 py-2 ring-1 ring-inset ring-hairline/10 transition-colors hover:ring-teal/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/55"
              aria-label="Copy room code"
            >
              <span className="font-mono text-lg font-semibold tracking-[0.3em] text-ink">{r.code}</span>
              {copied ? (
                <Check weight="bold" className="h-4 w-4 text-teal-bright" />
              ) : (
                <Copy weight="bold" className="h-4 w-4 text-ink-faint group-hover:text-teal-bright" />
              )}
            </button>
            <span className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
              <Circle weight="fill" className="h-2.5 w-2.5 animate-pulse text-teal-bright" />
              {live.length} locked in
            </span>
          </div>
          <Button variant="ghost" leadingIcon={SignOut} onClick={onLeave} disabled={leave.isPending}>
            Leave
          </Button>
        </div>

        {/* Combined focus tally — the shared dopamine. */}
        <div className="mt-5 flex items-end gap-2.5">
          <span className="font-mono text-4xl font-semibold tabular leading-none text-ink sm:text-5xl">
            {formatDuration(r.combined_seconds)}
          </span>
          <span className="mb-1 text-sm text-ink-muted">focused together</span>
        </div>
      </Card>

      {/* Your focus control */}
      <Card tone="teal" bodyClassName="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-eyebrow text-teal-bright">
              {isActive ? "You're locked in" : isPaused ? "Paused" : "Your turn"}
            </p>
            <p className="mt-1 font-mono text-3xl font-semibold tabular leading-none text-ink">
              {isActive
                ? formatClock(myElapsed)
                : isPaused
                  ? formatClock(Math.floor(session?.total_seconds ?? 0))
                  : "00:00:00"}
            </p>
          </div>
          <div className="flex gap-2">
            {!session ? (
              <Button variant="primary" leadingIcon={Play} onClick={onStart} disabled={start.isPending}>
                {start.isPending ? "Starting…" : "Lock in"}
              </Button>
            ) : (
              <>
                {isPaused && (
                  <Button
                    variant="primary"
                    leadingIcon={ArrowClockwise}
                    onClick={onResume}
                    disabled={resume.isPending}
                  >
                    {resume.isPending ? "Resuming…" : "Resume"}
                  </Button>
                )}
                <Button variant="outline" leadingIcon={Flag} onClick={openFinish} disabled={finish.isPending}>
                  Finish
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Presence grid */}
      <Card bodyClassName="p-5 sm:p-6">
        <h2 className="mb-4 font-display text-lg tracking-tight text-ink">In the room</h2>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {r.participants.map((p) => (
            <li
              key={p.user_id}
              className={
                "flex items-center gap-3 rounded-2xl px-3 py-2.5 ring-1 ring-inset " +
                (p.status === "focusing" && p.live
                  ? "bg-teal/[0.06] ring-teal/15"
                  : "bg-surface-3/30 ring-hairline/[0.07]")
              }
            >
              <div className="relative shrink-0">
                <Avatar src={p.avatar_url} alt={p.display_name} fallback={p.display_name} size="sm" />
                <span
                  className={
                    "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-surface-2 " +
                    (p.live ? "bg-teal-bright" : "bg-ink-faint/50")
                  }
                  aria-hidden
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  {p.display_name}
                  {p.user_id === r.host_id && (
                    <span className="ml-1.5 text-[10px] uppercase tracking-wide text-ink-faint">host</span>
                  )}
                </p>
                <p className="font-mono text-[11px] text-ink-faint tabular">
                  {p.status === "focusing" && p.live ? "focusing · " : ""}
                  {formatDuration(p.focus_seconds)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* Live chat — ephemeral company for this session (not saved). */}
      <ChatPanel roomId={roomId} messages={messages} myId={myId} />

      <WorkLogSheet
        open={sheetOpen}
        elapsedSeconds={frozen}
        submitting={finish.isPending}
        onCancel={() => {
          if (!finish.isPending) setSheetOpen(false);
        }}
        onSubmit={onFinishSubmit}
      />
    </Reveal>
  );
}

/* ---- Live chat panel: ephemeral, in-memory, not stored ---- */
function ChatPanel({
  roomId,
  messages,
  myId,
}: {
  roomId: string;
  messages: ChatMessage[];
  myId?: string;
}) {
  const send = useSendRoomChat();
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  // Keep the view pinned to the newest message.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || send.isPending) return;
    send.mutate(
      { id: roomId, text: t.slice(0, 500) },
      {
        onSuccess: () => setText(""),
        onError: (err) =>
          toast.error(
            err instanceof ApiError && err.status === 429
              ? "Slow down a moment."
              : err instanceof Error
                ? err.message
                : "Couldn't send."
          ),
      }
    );
  };

  return (
    <Card bodyClassName="p-0">
      <div className="flex items-center gap-2 border-b border-hairline/[0.07] px-5 py-3.5">
        <ChatCircle weight="duotone" className="h-5 w-5 text-teal-bright" />
        <h2 className="font-display text-base tracking-tight text-ink">Room chat</h2>
        <span className="ml-auto text-[11px] text-ink-faint">Just for now — not saved</span>
      </div>

      <div
        ref={listRef}
        className="flex max-h-72 min-h-[7rem] flex-col gap-2.5 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 ? (
          <p className="m-auto max-w-[18rem] text-center text-xs leading-relaxed text-ink-faint">
            Say hi 👋 — cheer each other on while you focus. Messages disappear when the room
            closes.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.user_id === myId;
            return (
              <div key={m.id} className={"flex flex-col " + (mine ? "items-end" : "items-start")}>
                {!mine && (
                  <span className="mb-0.5 px-1 text-[11px] font-medium text-ink-faint">
                    {m.display_name}
                  </span>
                )}
                <span
                  className={
                    "max-w-[80%] text-pretty break-words rounded-2xl px-3 py-2 text-sm leading-snug ring-1 ring-inset " +
                    (mine
                      ? "bg-teal/15 text-ink ring-teal/20"
                      : "bg-surface-3/40 text-ink-soft ring-hairline/[0.07]")
                  }
                >
                  {m.text}
                </span>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={onSubmit} className="flex gap-2 border-t border-hairline/[0.07] p-3">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 500))}
          placeholder="Say something…"
          aria-label="Chat message"
          autoComplete="off"
          maxLength={500}
          wrapperClassName="flex-1"
        />
        <Button
          type="submit"
          variant="primary"
          leadingIcon={PaperPlaneTilt}
          disabled={!text.trim() || send.isPending}
        >
          Send
        </Button>
      </form>
    </Card>
  );
}

/* ---- Loading skeleton ---- */
function RoomSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i} bodyClassName="p-6 sm:p-7">
          <Skeleton className="h-11 w-11 rounded-2xl" />
          <Skeleton className="mt-4 h-6 w-32" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-5 h-11 w-32" />
        </Card>
      ))}
    </div>
  );
}
