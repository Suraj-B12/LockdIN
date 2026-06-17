/* ============================================================================
   generate-buddy-audio.mjs — pre-render the buddy's lines to premium MP3s.

   Builds the full matrix from the configs:
     web/src/lib/buddyVoices.json  (voices × tones)
     web/src/lib/buddyLines.json   (lines)
   → web/public/audio/buddy/<voiceId>/<toneId>/<lineId>.mp3   (5 × 4 × ~50 ≈ 1000)

   The app plays these instantly/offline and falls back to on-device Web Speech
   for any missing file — so this is a ONE-TIME, RESUMABLE step (re-run anytime;
   it skips files that already exist).

   SMART SCHEDULER ("oversmart the limits"):
     • Rotates across ALL provided API keys (round-robin).
     • Paces requests (BASE_DELAY) and, on 429/quota, puts THAT key on an
       exponential cooldown and switches to another; if all keys are cooling it
       sleeps until the soonest is free.
     • Resumes across runs/days (skips existing) and retries transient errors.

   USAGE (from repo root):
     npm i @google/genai
     # provide one or more keys (comma-separated, or two named vars):
     GEMINI_API_KEYS="key1,key2" node scripts/generate-buddy-audio.mjs
     # options: VOICES=m-deep,f-warm  TONES=calm,energetic  LIMIT=100  BASE_DELAY=1800
   Requires ffmpeg on PATH (for WAV→MP3). Get a free key: https://aistudio.google.com/apikey
   Then commit web/public/audio/** and deploy — premium voice is live.
   ============================================================================ */
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ---- keys ----
const keys = (
  process.env.GEMINI_API_KEYS ||
  [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2].filter(Boolean).join(",")
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!keys.length) {
  console.error("Missing keys. Set GEMINI_API_KEYS=\"key1,key2\" (or GEMINI_API_KEY[_2]).");
  process.exit(1);
}

// ---- config ----
const MODEL = process.env.MODEL || "gemini-2.5-flash-preview-tts";
const BASE_DELAY = parseInt(process.env.BASE_DELAY || "1800", 10); // ms between requests
const LIMIT = parseInt(process.env.LIMIT || "0", 10); // 0 = no cap
const onlyVoices = (process.env.VOICES || "").split(",").map((s) => s.trim()).filter(Boolean);
const onlyTones = (process.env.TONES || "").split(",").map((s) => s.trim()).filter(Boolean);

const voicesCfg = JSON.parse(readFileSync(resolve(ROOT, "web/src/lib/buddyVoices.json"), "utf8"));
const linesCfg = JSON.parse(readFileSync(resolve(ROOT, "web/src/lib/buddyLines.json"), "utf8"));
const EXT = voicesCfg.ext || "mp3";
const voices = voicesCfg.voices.filter((v) => !onlyVoices.length || onlyVoices.includes(v.id));
const tones = voicesCfg.tones.filter((t) => !onlyTones.length || onlyTones.includes(t.id));
const lines = linesCfg.lines || [];

// ---- ffmpeg (required for MP3) ----
const hasFfmpeg = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0;
if (EXT === "mp3" && !hasFfmpeg) {
  console.error("ffmpeg not found on PATH — needed to transcode WAV→MP3. Install ffmpeg and retry.");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Minimal WAV header around little-endian PCM. */
function pcmToWav(pcm, sampleRate = 24000) {
  const ch = 1;
  const bd = 16;
  const byteRate = (sampleRate * ch * bd) / 8;
  const buf = Buffer.alloc(44 + pcm.length);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + pcm.length, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(ch, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE((ch * bd) / 8, 32);
  buf.writeUInt16LE(bd, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(pcm.length, 40);
  pcm.copy(buf, 44);
  return buf;
}

async function main() {
  const { GoogleGenAI } = await import("@google/genai");
  const pool = keys.map((k) => ({ ai: new GoogleGenAI({ apiKey: k }), cooldownUntil: 0 }));
  let rr = 0;

  async function takeKey() {
    for (let i = 0; i < pool.length; i++) {
      const ks = pool[(rr + i) % pool.length];
      if (ks.cooldownUntil <= Date.now()) {
        rr = (rr + i + 1) % pool.length;
        return ks;
      }
    }
    const soonest = Math.min(...pool.map((k) => k.cooldownUntil));
    const wait = Math.max(1000, soonest - Date.now());
    console.log(`  …all keys cooling, sleeping ${Math.ceil(wait / 1000)}s`);
    await sleep(wait);
    return takeKey();
  }

  // Build the task list (skip files that already exist → resumable).
  const tasks = [];
  for (const v of voices)
    for (const t of tones)
      for (const line of lines) {
        const out = resolve(ROOT, "web/public/audio/buddy", v.id, t.id, `${line.id}.${EXT}`);
        if (!existsSync(out)) tasks.push({ v, t, line, out });
      }

  const total = voices.length * tones.length * lines.length;
  console.log(
    `Matrix: ${voices.length} voices × ${tones.length} tones × ${lines.length} lines = ${total}.`
  );
  console.log(`To do: ${tasks.length} (skipping ${total - tasks.length} already generated). Keys: ${keys.length}.\n`);

  let made = 0;
  let failed = 0;
  const cap = LIMIT > 0 ? Math.min(LIMIT, tasks.length) : tasks.length;

  for (let i = 0; i < cap; i++) {
    const { v, t, line, out } = tasks[i];
    mkdirSync(dirname(out), { recursive: true });
    const prompt = `Say ${t.prompt}: ${line.text}`;

    let attempt = 0;
    let done = false;
    while (!done) {
      attempt++;
      const ks = await takeKey();
      try {
        const resp = await ks.ai.models.generateContent({
          model: MODEL,
          contents: [{ parts: [{ text: prompt }] }],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: v.gemini } } },
          },
        });
        const part = resp?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
        const b64 = part?.inlineData?.data;
        if (!b64) throw new Error("no audio in response");
        const rate = parseInt((String(part.inlineData.mimeType).match(/rate=(\d+)/) || [])[1] || "24000", 10);
        const wav = pcmToWav(Buffer.from(b64, "base64"), rate);

        if (EXT === "mp3") {
          const tmp = out.replace(/\.mp3$/, ".tmp.wav");
          writeFileSync(tmp, wav);
          const r = spawnSync("ffmpeg", ["-y", "-i", tmp, "-codec:a", "libmp3lame", "-b:a", "64k", out], { stdio: "ignore" });
          rmSync(tmp, { force: true });
          if (r.status !== 0) throw new Error("ffmpeg failed");
        } else {
          writeFileSync(out, wav);
        }

        made++;
        done = true;
        console.log(`✓ [${i + 1}/${cap}] ${v.id}/${t.id}/${line.id}`);
        await sleep(BASE_DELAY);
      } catch (err) {
        const msg = String(err?.message || err);
        const limited = /429|quota|rate|resource_exhausted/i.test(msg);
        if (limited) {
          const backoff = Math.min(5 * 60_000, 30_000 * attempt); // 30s,60s,90s… cap 5m
          ks.cooldownUntil = Date.now() + backoff;
          console.warn(`  ⏳ ${v.id}/${t.id}/${line.id} rate-limited; key cooling ${backoff / 1000}s`);
          if (attempt >= 8) {
            failed++;
            done = true;
            console.error(`  ✗ giving up on ${v.id}/${t.id}/${line.id} (will retry next run)`);
          }
        } else {
          failed++;
          done = true;
          console.error(`  ✗ ${v.id}/${t.id}/${line.id}: ${msg}`);
        }
      }
    }
  }

  console.log(`\nDone. Generated ${made}, failed ${failed}. Remaining: ${tasks.length - made}.`);
  console.log(`Re-run anytime to continue. Then commit web/public/audio/** and deploy.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
