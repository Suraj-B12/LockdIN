/* =====================================================================
   GrainOverlay — fixed, pointer-events-none film grain to break digital
   flatness. Uses an inline SVG fractal-noise data URI (no external asset).
   Mounted once at the app root, above content but below toasts.
   ===================================================================== */

// feTurbulence fractal noise, baked to a tiling data URI.
const NOISE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>
      <filter id='n'>
        <feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/>
        <feColorMatrix type='saturate' values='0'/>
      </filter>
      <rect width='100%' height='100%' filter='url(#n)'/>
    </svg>`
  );

export function GrainOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[100] opacity-[0.035] mix-blend-soft-light"
      style={{
        backgroundImage: `url("${NOISE}")`,
        backgroundSize: "160px 160px",
      }}
    />
  );
}
