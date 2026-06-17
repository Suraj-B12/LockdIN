/* =====================================================================
   BuddyVoiceSettings — pick how your buddy SOUNDS. Lives in the Manage (profile)
   buddy card. Choose a voice (from the device's installed voices) and a style
   (a rate/pitch personality), toggle sound, and preview — all client-side via
   the Web Speech API, persisted in localStorage. No backend, free, offline.
   ===================================================================== */
import { useSyncExternalStore, useState } from "react";
import { SpeakerHigh, SpeakerSlash, Play, MicrophoneStage } from "@phosphor-icons/react";
import {
  BUDDY_STYLES,
  getBuddyStyleId,
  setBuddyStyleId,
  getBuddyVoiceURI,
  setBuddyVoiceURI,
  listVoices,
  subscribeVoices,
  speakLine,
  speechSupported,
  useBuddyMuted,
  setBuddyMuted,
  cancelSpeech,
} from "@/lib/buddySpeech";

const PREVIEW_LINES = [
  "Hey — I'm right here with you. Let's lock in.",
  "Look at us go. One more session and I'm beaming.",
  "Steady wins it. Let's make today count.",
];

/** Subscribe to the device's voice list (populates asynchronously). listVoices()
 *  returns a cached, stable reference so useSyncExternalStore won't loop. */
const NO_VOICES: SpeechSynthesisVoice[] = [];
function useVoices(): SpeechSynthesisVoice[] {
  return useSyncExternalStore(subscribeVoices, listVoices, () => NO_VOICES);
}

export function BuddyVoiceSettings() {
  const voices = useVoices();
  const muted = useBuddyMuted();
  const [voiceURI, setVoiceURIState] = useState<string>(() => getBuddyVoiceURI() ?? "");
  const [styleId, setStyleIdState] = useState<string>(() => getBuddyStyleId());

  if (!speechSupported()) {
    return (
      <div className="mt-7 border-t border-hairline/[0.07] pt-5">
        <p className="text-[11px] uppercase tracking-eyebrow text-ink-faint">Buddy voice</p>
        <p className="mt-2 text-xs leading-relaxed text-ink-muted">
          This device's browser can't speak the buddy's lines, but you'll still see them.
        </p>
      </div>
    );
  }

  const onPickVoice = (uri: string) => {
    setVoiceURIState(uri);
    setBuddyVoiceURI(uri || null);
  };
  const onPickStyle = (id: string) => {
    setStyleIdState(id);
    setBuddyStyleId(id);
    // Instant feedback when choosing a style (always plays, even if muted).
    speakLine(PREVIEW_LINES[1], { force: true });
  };
  const preview = () => {
    const line = PREVIEW_LINES[Math.floor(voices.length + styleId.length) % PREVIEW_LINES.length];
    speakLine(line, { force: true });
  };
  const toggleMute = () => {
    const next = !muted;
    setBuddyMuted(next);
    if (next) cancelSpeech();
  };

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

      {/* Voice picker */}
      <label className="mt-4 block text-[13px] font-medium text-ink-soft" htmlFor="buddy-voice">
        Voice
      </label>
      <select
        id="buddy-voice"
        value={voiceURI}
        onChange={(e) => onPickVoice(e.target.value)}
        className="mt-1.5 h-11 w-full rounded-xl bg-surface-2/70 px-3 text-sm text-ink ring-1 ring-inset ring-hairline/10 shadow-inset-top transition-[box-shadow] duration-200 focus:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-teal/55"
      >
        <option value="">Default ({voices.length} available)</option>
        {voices.map((v) => (
          <option key={v.voiceURI} value={v.voiceURI}>
            {v.name} — {v.lang}
          </option>
        ))}
      </select>

      {/* Style chips */}
      <p className="mt-4 text-[13px] font-medium text-ink-soft">Style</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {BUDDY_STYLES.map((s) => {
          const active = s.id === styleId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onPickStyle(s.id)}
              title={s.hint}
              aria-pressed={active}
              className={
                "rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/55 " +
                (active
                  ? "bg-teal/15 text-teal-bright ring-teal/30"
                  : "bg-surface-2/60 text-ink-soft ring-hairline/10 hover:text-ink")
              }
            >
              {s.label}
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
        Your buddy uses a premium voice when available; these set the on-device fallback (the list
        varies by browser). Preview plays the fallback, even when muted.
      </p>
    </div>
  );
}
