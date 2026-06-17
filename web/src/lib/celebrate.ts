/* =====================================================================
   celebrate() — fun feedback when a focus session is completed: a full-screen
   confetti blast (rendered on canvas-confetti's own fixed, body-level canvas, so
   it overlays whatever screen you're on) + a short bright "success" chime.
   Both are fully guarded and never throw into the finish flow.
   ===================================================================== */
import confetti from "canvas-confetti";

/** A short ascending major arpeggio (C5–E5–G5–C6) via Web Audio — no asset. */
function playChime() {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
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

/** Teal-brand confetti blast. zIndex sits above every app layer (nav 80, overlay
 *  90, grain 100, toast 110) so it's always visible. NOT gated on reduced-motion
 *  — the user wants the celebration to always fire. */
function fireConfetti() {
  try {
    const colors = ["#00B8A9", "#00d4c3", "#5eead4", "#f0f0f5", "#ffffff"];
    const Z = 9999;
    // Center pop.
    confetti({ colors, zIndex: Z, particleCount: 130, spread: 95, startVelocity: 52, origin: { x: 0.5, y: 0.6 }, scalar: 1.1, ticks: 220 });
    // Two side cannons.
    confetti({ colors, zIndex: Z, particleCount: 60, angle: 60, spread: 70, startVelocity: 55, origin: { x: 0, y: 0.7 } });
    confetti({ colors, zIndex: Z, particleCount: 60, angle: 120, spread: 70, startVelocity: 55, origin: { x: 1, y: 0.7 } });
    // A fuller second wave a beat later for a real "blast".
    window.setTimeout(() => {
      confetti({ colors, zIndex: Z, particleCount: 90, spread: 110, startVelocity: 42, decay: 0.92, origin: { x: 0.5, y: 0.45 }, scalar: 0.95 });
    }, 220);
  } catch (err) {
    console.warn("[celebrate] confetti failed:", err);
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
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AC) {
      const ctx = new AC();
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

/** Celebrate a completed session. Safe to call from any event handler / any screen. */
export function celebrate(): void {
  fireConfetti();
  playChime();
  buzz([28, 40, 28, 40, 60]); // a celebratory triple-tap
}
