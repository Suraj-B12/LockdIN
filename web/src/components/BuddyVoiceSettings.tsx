/* =====================================================================
   BuddyVoiceSettings — pick how your buddy SOUNDS. Lives in the Manage (profile)
   buddy card. Choose a VOICE (5 premium voices) and a TONE (4 deliveries);
   playback uses the matching pre-generated clip, falling back to the on-device
   Web Speech voice (with the tone's rate/pitch) when a clip isn't available.
   Persists in localStorage. Preview plays a real line, even when muted.
   ===================================================================== */
import { useState } from "react";
import { SpeakerHigh, SpeakerSlash, Play, MicrophoneStage } from "@phosphor-icons/react";
import {
  BUDDY_VOICES,
  BUDDY_TONES,
  getBuddyVoice,
  setBuddyVoice,
  getBuddyTone,
  setBuddyTone,
  pickBuddyLine,
  playBuddyLine,
  useBuddyMuted,
  setBuddyMuted,
} from "@/lib/buddySpeech";

/** A varied, real line for previews (its audio exists once generated). */
function sampleLine() {
  return pickBuddyLine({ moodLevel: 8, currentStreak: 3, longestStreak: 5 });
}

export function BuddyVoiceSettings() {
  const muted = useBuddyMuted();
  const [voice, setVoiceState] = useState<string>(() => getBuddyVoice());
  const [tone, setToneState] = useState<string>(() => getBuddyTone());

  const pickVoice = (id: string) => {
    setVoiceState(id);
    setBuddyVoice(id);
    playBuddyLine(sampleLine(), { force: true }); // instant feedback
  };
  const pickTone = (id: string) => {
    setToneState(id);
    setBuddyTone(id);
    playBuddyLine(sampleLine(), { force: true });
  };
  const preview = () => playBuddyLine(sampleLine(), { force: true });
  const toggleMute = () => setBuddyMuted(!muted);

  return (
    <div className="mt-7 border-t border-hairline/[0.07] pt-5">
      <div className="flex items-center justify-between gap-3">
        <p className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-eyebrow text-ink-faint">
          <MicrophoneStage weight="duotone" className="h-3.5 w-3.5 text-teal-bright" />
          Buddy voice
        </p>
        <button
          type="button"
          onClick={toggleMute}
          aria-pressed={muted}
          className="inline-flex items-center gap-1.5 rounded-full bg-surface-2/70 px-2.5 py-1 text-[11px] font-medium text-ink-soft ring-1 ring-inset ring-hairline/10 transition-colors hover:text-teal-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/55"
        >
          {muted ? (
            <>
              <SpeakerSlash weight="fill" className="h-3.5 w-3.5" /> Muted
            </>
          ) : (
            <>
              <SpeakerHigh weight="fill" className="h-3.5 w-3.5 text-teal-bright" /> Sound on
            </>
          )}
        </button>
      </div>

      {/* Voice */}
      <p className="mt-4 text-[13px] font-medium text-ink-soft">Voice</p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {BUDDY_VOICES.map((v) => {
          const active = v.id === voice;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => pickVoice(v.id)}
              aria-pressed={active}
              title={v.desc}
              className={
                "flex flex-col items-start rounded-xl px-3 py-2 text-left ring-1 ring-inset transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/55 " +
                (active
                  ? "bg-teal/15 ring-teal/30"
                  : "bg-surface-2/60 ring-hairline/10 hover:ring-hairline/20")
              }
            >
              <span className={"text-sm font-medium " + (active ? "text-teal-bright" : "text-ink")}>
                {v.label}
              </span>
              <span className="text-[11px] text-ink-faint">{v.sub}</span>
            </button>
          );
        })}
      </div>

      {/* Tone */}
      <p className="mt-4 text-[13px] font-medium text-ink-soft">Tone</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {BUDDY_TONES.map((t) => {
          const active = t.id === tone;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => pickTone(t.id)}
              aria-pressed={active}
              className={
                "rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/55 " +
                (active
                  ? "bg-teal/15 text-teal-bright ring-teal/30"
                  : "bg-surface-2/60 text-ink-soft ring-hairline/10 hover:text-ink")
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Preview */}
      <button
        type="button"
        onClick={preview}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-surface-2 px-3.5 py-2 text-sm font-medium text-ink-soft ring-1 ring-inset ring-hairline/12 transition-colors hover:text-teal-bright hover:ring-teal/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/55"
      >
        <Play weight="fill" className="h-3.5 w-3.5" />
        Preview voice
      </button>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">
        Your buddy speaks in this voice + tone. Until the premium audio is generated, it uses a
        natural on-device fallback. Preview plays even when muted.
      </p>
    </div>
  );
}
