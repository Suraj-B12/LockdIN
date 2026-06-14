/**
 * gen-icons.mjs — generates the LockdIN PWA PNG icons with zero dependencies.
 *
 * Draws the brand mark into an RGBA pixel buffer and encodes a valid PNG using
 * Node's built-in zlib. The mark: an OLED-dark rounded-square plate with a teal
 * radial glow and a centered padlock glyph in brand teal. Run with `node`.
 *
 * Outputs: public/icons/icon-192.png, icon-512.png, icon-maskable-512.png
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../public/icons");
mkdirSync(OUT, { recursive: true });

// ---- color helpers ----
const CANVAS = [10, 10, 15];
const TEAL = [0, 184, 169];
const TEAL_BRIGHT = [0, 212, 195];
const INK = [240, 240, 245];

function lerp(a, b, t) {
  return a + (b - a) * t;
}
function mix(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

// signed distance to rounded rect centered region
function roundRectAlpha(x, y, w, h, cx, cy, halfW, halfH, r, aa) {
  const dx = Math.abs(x - cx) - (halfW - r);
  const dy = Math.abs(y - cy) - (halfH - r);
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - r;
  // outside < 0 means inside the shape
  return clamp01(0.5 - outside / aa);
}
function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function drawIcon(size, maskable) {
  const buf = Buffer.alloc(size * size * 4);
  const aa = size / 256; // anti-alias width in px
  // Plate geometry. Maskable keeps the mark inside the safe zone (80% of canvas).
  const pad = maskable ? size * 0.04 : size * 0.0;
  const plateHalf = size / 2 - pad;
  const plateR = maskable ? size * 0.001 : size * 0.22; // maskable: nearly full-bleed
  const cx = size / 2;
  const cy = size / 2;

  // Lock geometry — sized relative to canvas, pulled toward safe zone for maskable.
  const scale = maskable ? 0.62 : 0.74;
  const bodyW = size * 0.34 * (scale / 0.74);
  const bodyH = size * 0.26 * (scale / 0.74);
  const bodyCx = cx;
  const bodyCy = cy + size * 0.06 * (scale / 0.74);
  const bodyR = bodyW * 0.16;

  // Shackle (arc) params
  const shackleCy = bodyCy - bodyH / 2 - size * 0.005;
  const shackleOuter = bodyW * 0.34;
  const shackleInner = bodyW * 0.2;
  const shackleThick = (shackleOuter - shackleInner) / 2;
  const shackleRadius = (shackleOuter + shackleInner) / 2;

  // Keyhole
  const keyCx = bodyCx;
  const keyCy = bodyCy - size * 0.005;
  const keyR = bodyW * 0.085;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      // --- background plate ---
      let col = CANVAS.slice();
      // teal radial glow from top
      const gd = Math.hypot(x - cx, y - cy * 0.3) / (size * 0.7);
      const glow = clamp01(1 - gd) * 0.5;
      col = mix(col, TEAL, glow * 0.5);

      let plateA = maskable
        ? 1
        : roundRectAlpha(x, y, 0, 0, cx, cy, plateHalf, plateHalf, plateR, aa * 2);

      let r = CANVAS[0];
      let g = CANVAS[1];
      let b = CANVAS[2];
      let a = 0;
      if (plateA > 0) {
        r = col[0];
        g = col[1];
        b = col[2];
        a = 255 * plateA;
      }

      // --- lock shape (teal with bright top) ---
      // body
      const bodyA = roundRectAlpha(x, y, 0, 0, bodyCx, bodyCy, bodyW / 2, bodyH / 2, bodyR, aa);
      // shackle: ring, upper half only, with squared legs down to the body
      const sdist = Math.abs(Math.hypot(x - bodyCx, y - shackleCy) - shackleRadius);
      let shackleA = 0;
      if (y <= shackleCy + aa) {
        shackleA = clamp01(0.5 - (sdist - shackleThick) / aa);
      }
      // shackle legs (two vertical bars from arc ends down into the body top)
      const legY0 = shackleCy;
      const legY1 = bodyCy - bodyH / 2 + size * 0.01;
      for (const lx of [bodyCx - shackleRadius, bodyCx + shackleRadius]) {
        if (y >= legY0 - aa && y <= legY1 + aa) {
          const la = clamp01(0.5 - (Math.abs(x - lx) - shackleThick) / aa);
          shackleA = Math.max(shackleA, la);
        }
      }

      const lockTeal = mix(TEAL, TEAL_BRIGHT, clamp01((bodyCy - y) / (bodyH * 1.5) + 0.3));
      const lockA = Math.max(bodyA, shackleA);
      if (lockA > 0) {
        r = lerp(r, lockTeal[0], lockA);
        g = lerp(g, lockTeal[1], lockA);
        b = lerp(b, lockTeal[2], lockA);
        a = Math.max(a, 255 * lockA);
      }

      // --- keyhole (canvas-dark punch-out) ---
      const kd = Math.hypot(x - keyCx, y - keyCy);
      let keyA = clamp01(0.5 - (kd - keyR) / aa);
      // keyhole stem
      if (y >= keyCy && y <= keyCy + bodyW * 0.12) {
        const stemA = clamp01(0.5 - (Math.abs(x - keyCx) - keyR * 0.45) / aa);
        keyA = Math.max(keyA, stemA);
      }
      if (keyA > 0 && bodyA > 0.5) {
        r = lerp(r, CANVAS[0], keyA);
        g = lerp(g, CANVAS[1], keyA);
        b = lerp(b, CANVAS[2], keyA);
      }

      buf[i] = Math.round(r);
      buf[i + 1] = Math.round(g);
      buf[i + 2] = Math.round(b);
      buf[i + 3] = Math.round(a);
    }
  }
  return buf;
}

// ---- minimal PNG encoder ----
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(rgba, size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // raw scanlines with filter byte 0
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function write(name, size, maskable) {
  const rgba = drawIcon(size, maskable);
  const png = encodePNG(rgba, size);
  writeFileSync(path.join(OUT, name), png);
  console.log(`  wrote ${name} (${png.length} bytes)`);
}

console.log("Generating LockdIN PWA icons...");
write("icon-192.png", 192, false);
write("icon-512.png", 512, false);
write("icon-maskable-512.png", 512, true);
console.log("Done.");
