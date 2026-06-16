/* =====================================================================
   Milestone share card — renders a branded PNG entirely client-side (canvas →
   toBlob), so sharing costs nothing and never touches the (cold-starting) server.
   Best-effort: returns null on any failure and the caller falls back to text.
   Brand law: solid dark surface + a single teal accent — no gradients/glow.
   ===================================================================== */

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src; // same-origin (/avatars/...) → canvas stays untainted
  });
}

function drawContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const r = Math.min(w / img.width, h / img.height);
  const dw = img.width * r;
  const dh = img.height * r;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

export interface MilestoneCardOpts {
  streak: number;
  label: string;
  avatarSrc: string;
  buddyName?: string;
}

/** Render the milestone card to a PNG Blob, or null if rendering fails. */
export async function buildMilestoneCardBlob(opts: MilestoneCardOpts): Promise<Blob | null> {
  try {
    const W = 1080;
    const H = 1080;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Best-effort: wait for brand fonts so the canvas can use Clash Display.
    try {
      await (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts?.ready;
    } catch {
      /* ignore */
    }

    // Background + card panel.
    ctx.fillStyle = "#07070b";
    ctx.fillRect(0, 0, W, H);
    roundRect(ctx, 56, 56, W - 112, H - 112, 48);
    ctx.fillStyle = "#14141b";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,184,169,0.45)";
    ctx.stroke();

    // Buddy avatar.
    const img = await loadImage(opts.avatarSrc);
    if (img) drawContain(ctx, img, (W - 360) / 2, 150, 360, 360);

    ctx.textAlign = "center";

    // Big streak number.
    ctx.fillStyle = "#f0f0f5";
    ctx.font = "800 240px 'Clash Display', 'Geist', system-ui, sans-serif";
    ctx.fillText(String(opts.streak), W / 2, 690);

    // "DAY STREAK".
    ctx.fillStyle = "#00d4c3";
    ctx.font = "600 46px 'Geist', system-ui, sans-serif";
    ctx.fillText("DAY STREAK", W / 2, 752);

    // Label.
    ctx.fillStyle = "#a0a0b0";
    ctx.font = "400 40px 'Geist', system-ui, sans-serif";
    ctx.fillText(opts.label, W / 2, 846);

    // Wordmark.
    ctx.fillStyle = "#00B8A9";
    ctx.font = "700 50px 'Clash Display', 'Geist', system-ui, sans-serif";
    ctx.fillText("LockdIN", W / 2, 980);

    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png")
    );
  } catch {
    return null;
  }
}

/**
 * Share (or download) the milestone card. Tries the Web Share API with the PNG,
 * then a download, then text share — all best-effort. Returns a short status.
 */
export async function shareMilestone(opts: MilestoneCardOpts): Promise<"shared" | "downloaded" | "failed"> {
  const text = `${opts.streak}-day focus streak on LockdIN 🔥 — ${opts.label}.`;
  const blob = await buildMilestoneCardBlob(opts);

  if (blob) {
    const file = new File([blob], "lockdin-streak.png", { type: "image/png" });
    const nav = navigator as Navigator & {
      canShare?: (d: ShareData) => boolean;
    };
    if (nav.canShare?.({ files: [file] }) && navigator.share) {
      try {
        await navigator.share({ files: [file], text, title: "My LockdIN streak" });
        return "shared";
      } catch {
        /* user cancelled or share failed — fall through to download */
      }
    }
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "lockdin-streak.png";
      a.click();
      URL.revokeObjectURL(url);
      return "downloaded";
    } catch {
      /* fall through */
    }
  }

  if (navigator.share) {
    try {
      await navigator.share({ text, title: "My LockdIN streak" });
      return "shared";
    } catch {
      /* ignore */
    }
  }
  return "failed";
}
