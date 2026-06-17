/* =====================================================================
   celebrate() — fun feedback when a focus session is completed: a full-screen
   confetti blast (rendered on canvas-confetti's own fixed, body-level canvas, so
   it overlays whatever screen you're on) + a short bright "success" chime.
   Both are fully guarded and never throw into the finish flow.

   The building blocks (fireConfetti / playChime) are exported so the session
   FINALE can sequence them on its own timeline instead of all-at-once. Distinct
   cues live here too: playRecapCue (reactions recap), pingMessage (room chat).
   ===================================================================== */
import confetti from "canvas-confetti";

/** Lazily create a short-lived AudioContext, or null if Web Audio is unavailable. */
function audioContext(): AudioContext | null {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    return AC ? new AC() : null;
  } catch {
    return null;
  }
}

/** A short ascending major arpeggio (C5–E5–G5–C6) via Web Audio — no asset.
 *  THE confetti/finale sound. */
export function playChime(): void {
  try {
    const ctx = audioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const t = now + i * 0.085;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.33);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.36);
    });
    window.setTimeout(() => void ctx.close().catch(() => {}), 1300);
  } catch {
    /* audio unavailable — ignore */
  }
}

const TEAL_CONFETTI = ["#00B8A9", "#00d4c3", "#5eead4", "#f0f0f5", "#ffffff"];
const GOLD_CONFETTI = ["#FFD700", "#FDB931", "#FFF1B8", "#00d4c3", "#ffffff"];

/** Teal-brand confetti blast. zIndex sits above every app layer (nav 80, overlay
 *  90, grain 100, toast 110) so it's always visible. NOT gated on reduced-motion
 *  — the user wants the celebration to always fire.
 *  `gold` + `big` power the "surprise garnish" for standout scores. */
export function fireConfetti(opts?: { gold?: boolean; big?: boolean }): void {
  try {
    const colors = opts?.gold ? GOLD_CONFETTI : TEAL_CONFETTI;
    const k = opts?.big ? 1.5 : 1;
    const Z = 9999;
    // Center pop.
    confetti({ colors, zIndex: Z, particleCount: Math.round(130 * k), spread: 95, startVelocity: 52, origin: { x: 0.5, y: 0.6 }, scalar: 1.1, ticks: 220 });
    // Two side cannons.
    confetti({ colors, zIndex: Z, particleCount: Math.round(60 * k), angle: 60, spread: 70, startVelocity: 55, origin: { x: 0, y: 0.7 } });
    confetti({ colors, zIndex: Z, particleCount: Math.round(60 * k), angle: 120, spread: 70, startVelocity: 55, origin: { x: 1, y: 0.7 } });
    // A fuller second wave a beat later for a real "blast".
    window.setTimeout(() => {
      confetti({ colors, zIndex: Z, particleCount: Math.round(90 * k), spread: 110, startVelocity: 42, decay: 0.92, origin: { x: 0.5, y: 0.45 }, scalar: 0.95 });
    }, 220);
    // A gold/big garnish gets one extra celebratory wave.
    if (opts?.big) {
      window.setTimeout(() => {
        confetti({ colors, zIndex: Z, particleCount: 70, spread: 130, startVelocity: 60, decay: 0.9, origin: { x: 0.5, y: 0.5 }, scalar: 1.2 });
      }, 460);
    }
  } catch (err) {
    console.warn("[celebrate] confetti failed:", err);
  }
}

/** Rain the actual emoji full-screen (canvas-confetti shapeFromText). Used when a
 *  friend reacts to your session. Falls back to brand confetti if text shapes
 *  aren't supported. */
export function fireEmojiConfetti(emojis: string[]): void {
  try {
    const make = (confetti as unknown as {
      shapeFromText?: (o: { text: string; scalar?: number }) => unknown;
    }).shapeFromText;
    if (typeof make !== "function") {
      fireConfetti();
      return;
    }
    const list = (emojis.length ? emojis : ["🎉"]).slice(0, 4);
    const shapes = list.map((e) => make({ text: e, scalar: 2.2 }));
    const Z = 9999;
    confetti({ shapes, scalar: 2.2, zIndex: Z, particleCount: 60, spread: 100, startVelocity: 48, origin: { x: 0.5, y: 0.55 }, ticks: 260 } as never);
    confetti({ shapes, scalar: 2, zIndex: Z, particleCount: 28, angle: 60, spread: 80, startVelocity: 52, origin: { x: 0, y: 0.7 } } as never);
    confetti({ shapes, scalar: 2, zIndex: Z, particleCount: 28, angle: 120, spread: 80, startVelocity: 52, origin: { x: 1, y: 0.7 } } as never);
    window.setTimeout(() => {
      confetti({ shapes, scalar: 2.4, zIndex: Z, particleCount: 40, spread: 120, startVelocity: 40, decay: 0.92, origin: { x: 0.5, y: 0.4 } } as never);
    }, 240);
  } catch (err) {
    console.warn("[celebrate] emoji confetti failed:", err);
    fireConfetti();
  }
}

/** Light haptic feedback (progressive enhancement — ignored where unsupported,
 *  e.g. iOS Safari). A non-visual channel that lands even under Reduce Motion. */
export function buzz(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* not supported — ignore */
  }
}

/** A short rising two-note "ignition" cue for STARTING a session (anticipation),
 *  distinct from the success arpeggio. Front-loads a little reward on the
 *  hardest moment — beginning. Best-effort + a light haptic tick. */
export function playStartCue(): void {
  try {
    const ctx = audioContext();
    if (ctx) {
      const now = ctx.currentTime;
      [392, 587.33].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        const t = now + i * 0.1;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.3);
      });
      window.setTimeout(() => void ctx.close().catch(() => {}), 900);
    }
  } catch {
    /* audio unavailable — ignore */
  }
  buzz(18);
}

/** A warm, ringing two-note bell (A5→E6, sine, long decay) — deliberately
 *  DISTINCT from the confetti arpeggio. The sound for "a friend reacted to you". */
export function playRecapCue(): void {
  try {
    const ctx = audioContext();
    if (ctx) {
      const now = ctx.currentTime;
      [880, 1318.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        const t = now + i * 0.14;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.2, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.65);
      });
      window.setTimeout(() => void ctx.close().catch(() => {}), 1100);
    }
  } catch {
    /* audio unavailable — ignore */
  }
}

/** A single soft "tick" for a new chat message in a focus room. Light enough to
 *  fire repeatedly without fatigue; pairs with a tiny haptic. */
export function pingMessage(): void {
  try {
    const ctx = audioContext();
    if (ctx) {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 988; // B5 — a light, friendly blip
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.1, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
      window.setTimeout(() => void ctx.close().catch(() => {}), 500);
    }
  } catch {
    /* audio unavailable — ignore */
  }
  buzz(12);
}

/** Full-screen celebration when a friend reacts to your session. Emoji rain +
 *  the distinct recap bell + a light haptic. Safe from any handler. */
export function celebrateReactions(emojis: string[]): void {
  fireEmojiConfetti(emojis);
  playRecapCue();
  buzz([20, 50, 30]);
}

/** Celebrate a completed session. Safe to call from any event handler / any screen. */
export function celebrate(): void {
  fireConfetti();
  playChime();
  buzz([28, 40, 28, 40, 60]); // a celebratory triple-tap
}
