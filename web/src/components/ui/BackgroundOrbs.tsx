/* =====================================================================
   BackgroundOrbs — fixed, pointer-events-none ambient backdrop.
   De-glowed: NO teal mesh, NO blurred floating orbs (those are the AI-slop
   tell). Just a single, very faint NEUTRAL top wash for a subtle "lit from
   above" depth on the OLED canvas. The grain overlay (mounted in App) carries
   the texture. Kept as a component (+ `subtle` prop) so callers don't change.
   ===================================================================== */
export interface BackgroundOrbsProps {
  /** Dim the wash further (e.g. behind dense dashboards). */
  subtle?: boolean;
}

export function BackgroundOrbs({ subtle }: BackgroundOrbsProps) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-[55vh]"
        style={{
          background: subtle
            ? "radial-gradient(60% 100% at 50% 0%, rgb(255 255 255 / 0.018), transparent 72%)"
            : "radial-gradient(62% 100% at 50% 0%, rgb(255 255 255 / 0.03), transparent 70%)",
        }}
      />
    </div>
  );
}
