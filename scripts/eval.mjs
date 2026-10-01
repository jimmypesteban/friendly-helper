// Eval harness for scenario generation.
//
//   node scripts/eval.mjs            # N runs of the real pipeline + LLM judge
//   node scripts/eval.mjs --baseline # N runs of a naive one-shot prompt, for comparison
//   N=40 CONCURRENCY=6 node scripts/eval.mjs
//
// Writes eval-results/<mode>-<timestamp>.json and prints a summary.

import { GoogleGenAI } from '@google/genai';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import {
  generateScenario, randomSeed, allSeeds, validateScenario, LIMITS, MODEL,
} from '../lib/scenario.js';

const N = Number(process.env.N || 30);
const CONCURRENCY = Number(process.env.CONCURRENCY || 2);
const BASELINE = process.argv.includes('--baseline');
const VIDEO_ONLY = process.argv.includes('--video-only'); // skip the text judge (saves its quota)
// Judge with a different, stronger model than the generator so it isn't grading its own style.
const JUDGE_MODEL = process.env.JUDGE_MODEL || 'gemini-3.1-pro-preview';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isRateLimit = (msg) => /429|RESOURCE_EXHAUSTED|quota/i.test(String(msg));

// Free-tier quota errors are infrastructure, not prompt quality: wait and retry them.
async function withRateLimitRetry(fn) {
  for (let i = 0; ; i++) {
    try { return await fn(); } catch (err) {
      if (!isRateLimit(err.message) || i >= 4) throw err;
      await sleep(20000 * (i + 1));
    }
  }
}

async function pool(items, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
      process.stdout.write('.');
    }
  }));
  process.stdout.write('\n');
  return out;
}

// ── Baseline: what a "quick single call" looks like ──
const NAIVE_PROMPT = `Create a short social scenario for a kids game about being helpful. Give a scenario description and four choices the child can pick, exactly one of which is the correct helpful action, with feedback for each choice. Return JSON like {"scenario": "...", "choices": [{"text": "...", "correct": true/false, "feedback": "..."}]}.`;

async function runBaseline(seed) {
  const started = Date.now();
  const r = { seed, problems: [] };
  try {
    const res = await withRateLimitRetry(() => ai.models.generateContent({
      model: MODEL, contents: `${NAIVE_PROMPT}\nSetting: ${seed.setting}. Situation: ${seed.need}.`,
      config: { thinkingConfig: { thinkingLevel: 'low' } },
    }));
    r.ms = Date.now() - started;
    const text = res.text || '';
    r.raw = text;
    let data;
    try { data = JSON.parse(text); } catch {
      r.problems.push('not bare JSON (needed fence stripping)');
      const m = text.match(/\{[\s\S]*\}/);
      try { data = JSON.parse(m?.[0]); } catch { r.problems.push('unparseable'); return r; }
    }
    const choices = Array.isArray(data.choices) ? data.choices : [];
    if (choices.length !== 4) r.problems.push(`${choices.length} choices`);
    const correct = choices.filter((c) => c.correct === true);
    if (correct.length !== 1) r.problems.push(`${correct.length} correct answers`);
    r.correctIndex = choices.findIndex((c) => c.correct === true);
    const long = choices.filter((c) => [...String(c.text || '')].length > LIMITS.label);
    if (long.length) r.problems.push(`${long.length} labels too long for the blob`);
    r.data = data;
  } catch (err) {
    r.problems.push(`error: ${err.message}`);
  }
  return r;
}

// ── Judge: semantic checks code can't do ──
const JUDGE_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['one_clear_answer', 'arguably_helpful_distractors', 'age_appropriate', 'safety_rule_broken', 'shaming_feedback', 'fits_seed', 'notes'],
  properties: {
    one_clear_answer: { type: 'boolean' },
    arguably_helpful_distractors: { type: 'array', items: { type: 'string', enum: ['ignore', 'careless', 'in_the_way'] } },
    age_appropriate: { type: 'boolean' },
    safety_rule_broken: { type: 'boolean' },
    shaming_feedback: { type: 'boolean' },
    fits_seed: { type: 'boolean' },
    notes: { type: 'string' },
  },
};

const JUDGE_PROMPT = `You review generated content for a kindness game for children aged 5-8. Be strict; you are looking for problems.

Answer:
- one_clear_answer: would a typical 6-year-old reliably identify "helpful" as the single right choice?
- arguably_helpful_distractors: which unhelpful roles could a reasonable parent or teacher defend as also fine?
- age_appropriate: vocabulary, themes and tone suit ages 5-8.
- safety_rule_broken: does the HELPFUL action ask the child to deal with strangers, money, roads, water, cooking, or go somewhere without a grown-up? Or is anyone in real danger?
- shaming_feedback: does any feedback call the child bad, mean, naughty, or otherwise shame them?
- fits_seed: does the scenario actually use the given setting, person and situation?
- notes: one sentence on the biggest weakness, or "none".`;

async function judge(seed, scenario) {
  const res = await withRateLimitRetry(() => ai.models.generateContent({
    model: JUDGE_MODEL,
    contents: `Seed: ${JSON.stringify(seed)}\n\nGenerated:\n${JSON.stringify(scenario, null, 2)}`,
    config: { systemInstruction: JUDGE_PROMPT, responseMimeType: 'application/json', responseJsonSchema: JUDGE_SCHEMA },
  }));
  return JSON.parse(res.text);
}

// ── Video match: does the text describe what is actually on screen? ──
// Shows the judge the exact frame the game freezes on (clips/frames/<id>.jpg).
const VIDEO_JUDGE_MODEL = process.env.VIDEO_JUDGE_MODEL || 'gemini-3.5-flash';
const VIDEO_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['matches_video', 'mismatches'],
  properties: {
    matches_video: { type: 'boolean' },
    mismatches: { type: 'array', items: { type: 'string' } },
  },
};
const VIDEO_PROMPT = `A kids' game shows this frozen video frame, then the scenario text and four choice buttons. Would a child looking at this frame think the text describes this scene?
- matches_video is false if the place is clearly different, or if the text depends on a person or object that is clearly not in the frame. The person who needs help may be someone visible in the frame; they may not be a completely different kind of person (e.g. a little girl when the frame only shows adults).
- Ordinary small items a visible person could be holding (a pencil, a ticket) are fine even if too small to see.
- mismatches: one short phrase per problem, empty if none.`;
const frameFor = (clip) => `clips/frames/${clip === 'Scene.mp4' ? 'lobby' : clip.replace(/^clips\/|\.mp4$/g, '')}.jpg`;

async function judgeVideo(seed, scenario) {
  const image = readFileSync(frameFor(seed.clip)).toString('base64');
  const text = `Scenario: ${scenario.scenario}\nChoices: ${['helpful', 'ignore', 'careless', 'in_the_way'].map((k) => scenario[k].label).join(' / ')}`;
  const res = await withRateLimitRetry(() => ai.models.generateContent({
    model: VIDEO_JUDGE_MODEL,
    contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'image/jpeg', data: image } }, { text }] }],
    config: { systemInstruction: VIDEO_PROMPT, responseMimeType: 'application/json', responseJsonSchema: VIDEO_SCHEMA },
  }));
  return JSON.parse(res.text);
}

async function runPipeline(seed) {
  let r;
  for (let i = 0; i < 4; i++) {
    r = await generateScenario({ seed });
    if (!r.attempts.some((a) => isRateLimit(a.error))) break;
    await sleep(30000 * (i + 1));
  }
  if (r.ok && !VIDEO_ONLY) {
    try { r.judge = await judge(seed, r.scenario); } catch (err) { r.judgeError = err.message; }
  }
  if (r.ok) {
    try { r.video = await judgeVideo(r.seed, r.scenario); } catch (err) { r.videoError = err.message; }
  }
  return r;
}

// ── Main ──
// Every on-screen moment once (coverage), then random moments up to N.
const seeds = [...allSeeds(), ...Array.from({ length: Math.max(0, N - allSeeds().length) }, randomSeed)];
console.log(`${BASELINE ? 'BASELINE' : 'PIPELINE'} · ${seeds.length} runs · ${MODEL}`);
const results = await pool(seeds, BASELINE ? runBaseline : runPipeline);

await mkdir('eval-results', { recursive: true });
const file = `eval-results/${BASELINE ? 'baseline' : 'pipeline'}-${Date.now()}.json`;
await writeFile(file, JSON.stringify(results, null, 2));

const pct = (n) => `${n}/${results.length} (${Math.round((100 * n) / results.length)}%)`;
const tally = (list) => Object.entries(list.reduce((m, k) => ((m[k] = (m[k] || 0) + 1), m), {})).sort((a, b) => b[1] - a[1]);
const quantile = (arr, q) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(q * (s.length - 1))]; };

if (BASELINE) {
  const clean = results.filter((r) => !r.problems.length).length;
  console.log(`clean: ${pct(clean)}`);
  console.log('problems:', tally(results.flatMap((r) => r.problems.map((p) => p.replace(/^\d+ /, 'N ')))));
  console.log('correct-answer index:', tally(results.map((r) => String(r.correctIndex))));
  console.log('latency p50/p95 ms:', quantile(results.map((r) => r.ms || 0), 0.5), quantile(results.map((r) => r.ms || 0), 0.95));
} else {
  const ok = results.filter((r) => r.ok);
  const firstTry = results.filter((r) => r.attempts[0] && !r.attempts[0].error && !r.attempts[0].problems.length).length;
  const totalMs = results.map((r) => r.attempts.reduce((s, a) => s + a.ms, 0));
  console.log(`valid on first try: ${pct(firstTry)}`);
  console.log(`valid after repair: ${pct(ok.length)}`);
  console.log('first-attempt validator problems:', tally(results.flatMap((r) => (r.attempts[0]?.problems || []).map((p) => p.replace(/"[^"]*"/g, '"…"').replace(/\d+/g, 'N')))));
  console.log('errors:', tally(results.flatMap((r) => r.attempts.filter((a) => a.error).map((a) => a.error))));
  console.log('end-to-end latency p50/p95 ms:', quantile(totalMs, 0.5), quantile(totalMs, 0.95));
  const judged = ok.filter((r) => r.judge);
  const j = (k) => judged.filter((r) => r.judge[k]).length;
  console.log(`judge (${judged.length}): one_clear_answer ${j('one_clear_answer')}, age_appropriate ${j('age_appropriate')}, fits_seed ${j('fits_seed')}, safety_rule_broken ${j('safety_rule_broken')}, shaming ${j('shaming_feedback')}`);
  const vj = ok.filter((r) => r.video);
  console.log(`video match (${vj.length}): ${vj.filter((r) => r.video.matches_video).length}`);
  for (const r of vj.filter((r) => !r.video.matches_video)) console.log(`   ✗ [${r.seed.clip}] ${r.scenario.scenario} → ${r.video.mismatches.join('; ')}`);
  console.log('arguably-helpful distractors:', tally(judged.flatMap((r) => r.judge.arguably_helpful_distractors)));
  console.log('helpful labels:', ok.map((r) => r.scenario.helpful.label).join(' | '));
  for (const r of judged.filter((r) => !r.judge.one_clear_answer || r.judge.safety_rule_broken || r.judge.shaming_feedback || r.judge.arguably_helpful_distractors.length)) {
    console.log(`\n⚠ ${r.seed.setting} / ${r.seed.name}: ${r.scenario.scenario}`);
    for (const k of ['helpful', 'ignore', 'careless', 'in_the_way']) console.log(`   ${k}: ${r.scenario[k].label}`);
    console.log(`   judge: ${r.judge.notes}`);
  }
}
console.log(`\nfull results: ${file}`);
