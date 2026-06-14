/* =====================================================================
   celebrate() — fun feedback when a focus session is completed: a confetti
   burst + a short, bright "success" chime. Fully guarded (never throws into
   the finish flow) and respects prefers-reduced-motion for the confetti.
   ===================================================================== */
import confetti from "canvas-confetti";

/** A short ascending major arpeggio (C5–E5–G5–C6) via Web Audio — no asset. */
function playChime() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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

/** Teal-brand confetti: a center pop + two side cannons. */
function fireConfetti() {
  try {
    const colors = ["#00B8A9", "#00d4c3", "#5eead4", "#f0f0f5"];
    const base = { colors, disableForReducedMotion: true, zIndex: 200 };
    confetti({ ...base, particleCount: 90, spread: 75, startVelocity: 48, origin: { x: 0.5, y: 0.62 } });
    confetti({ ...base, particleCount: 50, angle: 60, spread: 62, origin: { x: 0, y: 0.7 } });
    confetti({ ...base, particleCount: 50, angle: 120, spread: 62, origin: { x: 1, y: 0.7 } });
  } catch {
    /* confetti unavailable — ignore */
  }
}

/** Celebrate a completed session. Safe to call from any event handler. */
export function celebrate(): void {
  fireConfetti();
  playChime();
}
