/* ============================================================================
   generate-buddy-audio.mjs — pre-render the buddy's lines to premium audio.

   Reads the canonical line corpus (web/src/lib/buddyLines.json) and uses the
   Gemini TTS model to render each line to a WAV file the PWA serves statically:
       web/public/audio/buddy/<pack>/<id>.wav
   The app plays these instantly/offline and falls back to on-device Web Speech
   for any line whose file is missing — so this is a one-time, resumable step.

   USAGE (from the repo root):
       npm i @google/genai                 # one-time (script-only dep)
       GEMINI_API_KEY=xxxx node scripts/generate-buddy-audio.mjs
       # optional: VOICE=Aoede  MODEL=gemini-2.5-flash-preview-tts  STYLE="warm, encouraging"

   Get a free key at https://aistudio.google.com/apikey (no billing needed).
   Voices to try: Kore, Aoede, Leda, Zephyr, Puck, Charon, Fenrir, Orus.
   Then commit the generated web/public/audio/** and deploy — premium voice is live.
   ============================================================================ */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const MODEL = process.env.MODEL || "gemini-2.5-flash-preview-tts";
const VOICE = process.env.VOICE || "Kore";
const STYLE = process.env.STYLE || "warm, friendly, encouraging — like a supportive friend";

if (!API_KEY) {
  console.error("Missing GEMINI_API_KEY (or GOOGLE_API_KEY). See the header for setup.");
  process.exit(1);
}

const corpus = JSON.parse(readFileSync(resolve(ROOT, "web/src/lib/buddyLines.json"), "utf8"));
const pack = corpus.pack || "default";
const lines = corpus.lines || [];
const outDir = resolve(ROOT, "web/public/audio/buddy", pack);
mkdirSync(outDir, { recursive: true });

/** Wrap raw little-endian PCM in a minimal WAV container. */
function pcmToWav(pcm, sampleRate = 24000, channels = 1, bitDepth = 16) {
  const byteRate = (sampleRate * channels * bitDepth) / 8;
  const blockAlign = (channels * bitDepth) / 8;
  const buf = Buffer.alloc(44 + pcm.length);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + pcm.length, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(bitDepth, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(pcm.length, 40);
  pcm.copy(buf, 44);
  return buf;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  let made = 0;
  let skipped = 0;
  for (const line of lines) {
    const outPath = resolve(outDir, `${line.id}.wav`);
    if (existsSync(outPath)) {
      skipped++;
      continue;
    }

    let attempt = 0;
    while (true) {
      attempt++;
      try {
        const resp = await ai.models.generateContent({
          model: MODEL,
          contents: [{ parts: [{ text: `Say in a ${STYLE} tone: ${line.text}` }] }],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
          },
        });

        const part = resp?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
        const b64 = part?.inlineData?.data;
        if (!b64) throw new Error("no audio in response");

        // mimeType looks like "audio/L16;rate=24000" — parse the rate if present.
        const mime = part.inlineData.mimeType || "";
        const rate = parseInt((mime.match(/rate=(\d+)/) || [])[1] || "24000", 10);

        const pcm = Buffer.from(b64, "base64");
        writeFileSync(outPath, pcmToWav(pcm, rate));
        made++;
        console.log(`✓ ${line.id}  (${(pcm.length / 1024).toFixed(0)} KB)`);
        await sleep(400); // be gentle with rate limits
        break;
      } catch (err) {
        const msg = String(err?.message || err);
        const rateLimited = /429|quota|rate/i.test(msg);
        if (attempt < 4 && rateLimited) {
          const wait = 2000 * attempt;
          console.warn(`… ${line.id} rate-limited, retrying in ${wait}ms`);
          await sleep(wait);
          continue;
        }
        console.error(`✗ ${line.id}: ${msg}`);
        break; // skip this line; app falls back to Web Speech for it
      }
    }
  }

  console.log(`\nDone. Generated ${made}, skipped ${skipped} (already existed).`);
  console.log(`Output: web/public/audio/buddy/${pack}/  → commit + deploy to go live.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
