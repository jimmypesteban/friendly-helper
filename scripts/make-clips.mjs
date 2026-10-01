// Builds the background clip library with Veo, one clip per setting.
// Resumable: skips settings whose clip already exists, stops cleanly on quota errors.
//
//   node --env-file=.env.local scripts/make-clips.mjs
//
// Clips show the *place*, not an action, because the situation in each place is
// generated per play. Output: clips/<id>.mp4 (compressed, muted) + clips/manifest.json.

import { GoogleGenAI } from '@google/genai';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { CLIP_SETTINGS } from '../lib/settings.js';

const MODEL = process.env.VEO_MODEL || 'veo-3.1-fast-generate-preview';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Shared style so the library reads as one game. Matches the original Scene.mp4:
// photorealistic Hong Kong, handheld, eye level.
const STYLE = 'Photorealistic, natural daylight, Hong Kong. Filmed handheld at the eye level of a 7-year-old child, slow gentle push-in, shallow depth of field. A few ordinary people in the background going about their day, nobody looking at the camera. Calm, friendly, everyday mood.';
const NEGATIVE = 'text, captions, subtitles, logos, brand names, watermark, violence, crying, danger, emergency, police, dramatic lighting, fast camera movement';

mkdirSync('clips', { recursive: true });

for (const s of CLIP_SETTINGS) {
  const out = `clips/${s.id}.mp4`;
  if (s.file || existsSync(out)) { console.log(`skip ${s.id}`); continue; }

  console.log(`generating ${s.id}…`);
  const started = Date.now();
  let op;
  try {
    op = await ai.models.generateVideos({
      model: MODEL,
      source: { prompt: `${s.shot} ${STYLE}` },
      config: { aspectRatio: '16:9', numberOfVideos: 1, negativePrompt: NEGATIVE },
    });
  } catch (err) {
    console.log(`stopped at ${s.id}: ${String(err.message).slice(0, 200)}`);
    break;
  }
  while (!op.done) {
    await sleep(10000);
    op = await ai.operations.getVideosOperation({ operation: op });
  }
  const uri = op.response?.generatedVideos?.[0]?.video?.uri;
  if (!uri) { console.log(`no video for ${s.id}: ${JSON.stringify(op.error || op.response).slice(0, 200)}`); continue; }

  const raw = `clips/${s.id}.raw.mp4`;
  const res = await fetch(uri, { headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY } });
  writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
  // The game plays clips muted; strip audio and compress for the web.
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', raw, '-an', '-vf', 'scale=1280:-2', '-c:v', 'libx264', '-crf', '27', '-preset', 'slow', '-movflags', '+faststart', out]);
  unlinkSync(raw);
  console.log(`  done in ${Math.round((Date.now() - started) / 1000)}s`);
}

const manifest = CLIP_SETTINGS
  .filter((s) => s.file || existsSync(`clips/${s.id}.mp4`))
  .map((s) => s.id);
writeFileSync('clips/manifest.json', JSON.stringify(manifest, null, 2));
console.log(`manifest: ${manifest.length}/${CLIP_SETTINGS.length} settings have clips`);
