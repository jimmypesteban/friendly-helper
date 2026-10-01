// Scenario generation for Friendly Helper.
// The prompt, output schema, and validator live together so the API route
// and the eval script exercise exactly the same code path.

import { GoogleGenAI } from '@google/genai';
import { CLIP_SETTINGS } from './settings.js';
import { SCENES } from './scenes.js';
import CLIPS_READY from '../clips/manifest.json' with { type: 'json' };

export const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

// ── Seeds ──
// The server picks the place and the moment, so variety comes from code, not
// from asking the model to "be creative". Each moment is a person who is
// visible in that clip's frozen frame with a need built from visible props
// (lib/scenes.js), so the text matches what the child is looking at.
// Earlier versions drew person and need at random from lists, which matched
// the place at best and the people on screen never.
const PLACES = CLIP_SETTINGS.filter((s) => CLIPS_READY.includes(s.id) && SCENES[s.id]);
const clipUrl = (s) => s.file || `clips/${s.id}.mp4`;

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Rotating the careless verb per round stops one phrase ("Bump into the...")
// from becoming a tell that kids can spot without reading the situation.
const CARELESS_VERBS = ['run through', 'bump into', 'trip over', 'knock over', 'stomp on', 'race into'];
// Same for ignore: give the model a different way to skip the person each round.
const IGNORE_MOVES = ['walks right past', 'keeps playing their own game', 'runs off to something more fun', 'turns back to their toy', 'hurries off to the next thing'];

export function seedFor(placeId, momentIndex) {
  const place = PLACES.find((p) => p.id === placeId);
  const scene = SCENES[placeId];
  const moment = scene.moments[momentIndex];
  return {
    place: placeId, setting: place.setting, clip: clipUrl(place), onScreen: scene.onScreen,
    name: moment.who, need: moment.need,
    carelessVerb: pick(CARELESS_VERBS), ignoreMove: pick(IGNORE_MOVES),
  };
}

export function randomSeed() {
  const place = pick(PLACES);
  return seedFor(place.id, Math.floor(Math.random() * SCENES[place.id].moments.length));
}

// Every (place, moment) pair once, for eval coverage.
export function allSeeds() {
  return PLACES.flatMap((p) => SCENES[p.id].moments.map((_, i) => seedFor(p.id, i)));
}

// ── Hard limits ──
// These come from the existing UI, not from taste: choice labels render with
// white-space:nowrap inside a 30vw blob at up to 2vw font, so anything past
// ~22 characters overflows the blob.
export const LIMITS = {
  scenario: 140, // two lines in the objective bar; the extra 20 lets it say where the person is on screen
  label: 22,
  labelWords: 4,
  reaction_title: 32,
  feedback: 170,
  badge_line: 80,
};

// ── Output schema (structured outputs) ──
// Exactly-one-correct is enforced by shape, not by instruction: there is one
// `helpful` slot and three named unhelpful slots, so the model cannot return
// zero or two correct answers. The three wrong-answer slots are archetypes
// that map onto the game's existing click animations
// (ignore → buzz, careless → shove, in_the_way → slam).
// `careless` was originally "a clumsy attempt to help"; children (and the judge)
// read that as a second right answer, so it is now "rushing without looking".
const choiceSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['label', 'reaction_title', 'feedback'],
  properties: {
    label: { type: 'string', description: `Button text. 2-4 words, max ${LIMITS.label} characters, starts with a verb.` },
    reaction_title: { type: 'string', description: `Short reaction headline, max ${LIMITS.reaction_title} characters.` },
    feedback: { type: 'string', description: `1-2 short sentences, max ${LIMITS.feedback} characters.` },
  },
};

export const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['scenario', 'helpful', 'ignore', 'careless', 'in_the_way', 'badge_line'],
  properties: {
    scenario: { type: 'string', description: `One sentence describing what the player sees, max ${LIMITS.scenario} characters.` },
    helpful: choiceSchema,
    ignore: choiceSchema,
    careless: choiceSchema,
    in_the_way: choiceSchema,
    badge_line: { type: 'string', description: `Starts with "You", past tense, max ${LIMITS.badge_line} characters.` },
  },
};

export const SYSTEM_PROMPT = `You write single-screen scenarios for "Friendly Helper", a social-emotional learning game for children aged 5 to 8 growing up in Hong Kong. A short scene plays, the child picks one of four actions, and gets gentle feedback. Your output is parsed by code and rendered directly into fixed-size UI, so length limits are hard limits.

What a scenario is:
- One everyday moment where someone needs a small, concrete kind of help that a young child could actually give.
- The person who needs help is someone the player already knows (the seed says who). Say who they are in the scenario, e.g. "your classmate Leo". Never a stranger.
- The child is looking at a frozen video frame while reading. The seed describes what is on screen; the person who needs help is visible in it. The scenario, choices and feedback may only mention people and objects that are on screen, plus small things that person would carry (keys, a pencil). Do not invent new people, rooms or props. Help the child find the person, e.g. "Grandpa Lee, on the green bench, ..."
- The helpful action is something the player does with their own hands or words for the person. Never "ask a worker", "call an adult" or "find a stranger to help".
- The helpful action must be safe for a child to do alone and must not involve money, roads, water, cooking, or going somewhere without a grown-up.
- Nobody is in danger. Nobody is hurt, bleeding, scared of a person, or in trouble with the police. Keep the stakes small and warm.

The four actions:
- helpful: the one clearly kind, practical action. A 6-year-old should be able to see it is the right answer without any trick.
- ignore: the player chooses their own fun over helping (keeps playing, walks right past, looks away). The label must make it obvious they are skipping the person, e.g. "Walk right past", "Keep playing tag". Avoid "alone" labels like "Play alone" (playing alone is fine) and looking-away labels like "Look the other way" or "Look out window" (adults read those as giving privacy). Never a chore, self-care, or sensible task (eating lunch, reading, packing a bag, tying shoes), because adults would call those fine.
- careless: the player is rushing around without looking and accidentally makes the problem bigger (runs through the spilled crayons, bumps the tray, splashes past). It is NOT an attempt to help: a version of the helpful action done fast or roughly ("Grab the crayons fast", "Rip the pack open") is banned, because young children read it as helping. Build the label from one of these verbs plus the thing that gets knocked: run through, bump into, trip over, knock over, splash through (e.g. "Run through crayons", "Bump into the tray"). Never "past": running past someone is the ignore slot. Feedback names the concrete result and the lesson to slow down and look around. Accidental only: no hitting, kicking, pushing people, or hurting anyone on purpose.
- in_the_way: the player is a little selfish or gets in the way. Build the label from one of these verbs: block, stand on, sit on, take first, cut in front, crowd. It should feel thoughtless, not cruel. No name-calling, insults, or bullying language.
None of the three unhelpful actions may be a reasonable second "right" answer. Avoid neutral options like "Ask a teacher" or "Tell a grown-up" in the unhelpful slots, because adults would argue those are fine.

Writing rules:
- Labels: 2 to 4 words, start with a verb, no "I", no punctuation, max ${LIMITS.label} characters. Example: "Open the door".
- scenario: one present-tense sentence a parent could read aloud, max ${LIMITS.scenario} characters. Name the person who needs help.
- reaction_title: for helpful, celebratory ("Amazing! Great job!"); for the others, gentle and non-shaming ("Oops! That could hurt!", "That makes it worse!"). Max ${LIMITS.reaction_title} characters.
- feedback: speak to the child as "you" in simple words. For wrong answers, say what went wrong and hint at what a helper would notice, without naming the right answer outright. Never call the child bad, mean, or naughty. Max ${LIMITS.feedback} characters.
- badge_line: starts with "You", past tense, says what the child did and for whom. Example: "You opened the door for someone who needed help."
- Plain words a 6-year-old knows. No sarcasm, no pop culture, no brand names, no religion, no romance.

Reference example (shape and tone only; do not reuse this situation):
scenario: "A person is walking to the door with their hands full carrying a big box."
helpful: "Open the door" / "Amazing! Great job!" / "Opening the door for someone whose hands are full is a wonderful, friendly act. That's what real helpers do!"
ignore: "Keep using phone" / "That's not very helpful!" / "Being on your phone while someone needs help isn't being a good friend. Look up, someone may need you!"
careless: "Bump into the box" / "Oops! Slow down!" / "Rushing past without looking bumped the box and nearly made them drop everything. Slow down and look around!"
in_the_way: "Block the door" / "That makes it worse!" / "Blocking the door makes things even harder for them. A good friend steps up to help, not get in the way!"
badge_line: "You opened the door for someone who needed help."`;

export function buildUserPrompt(seed, problems) {
  let text = `Write a new scenario.
Setting: ${seed.setting}
On screen (the frozen video frame the child is looking at): ${seed.onScreen}
Person who needs help: ${seed.name}
Their situation: ${seed.need}
careless label verb: ${seed.carelessVerb}
ignore: the player ${seed.ignoreMove}`;
  if (problems?.length) {
    text += `\n\nYour previous attempt was rejected by the validator. Fix these problems:\n- ${problems.join('\n- ')}`;
  }
  return text;
}

// ── Validation ──
// Structured outputs guarantee the JSON shape. Everything semantic (length,
// tone, duplicates) is checked here, and failures are fed back to the model.
const BLOCKLIST = /\b(kill|killed|die|died|dead|death|blood|bleed|gun|knife|weapon|stab|punch|hit|kick|slap|stupid|dumb|idiot|hate|ugly|fat|loser|shut up|police|kidnap|stranger|drown|fire|burn|drugs?|beer|wine|sexy|kiss)\b/i;
const ROLES = ['helpful', 'ignore', 'careless', 'in_the_way'];

export function validateScenario(s) {
  const problems = [];
  const len = (str) => [...str].length;

  if (len(s.scenario) > LIMITS.scenario) problems.push(`scenario is ${len(s.scenario)} characters; max is ${LIMITS.scenario}`);
  if (len(s.badge_line) > LIMITS.badge_line) problems.push(`badge_line is ${len(s.badge_line)} characters; max is ${LIMITS.badge_line}`);
  if (!/^You\b/.test(s.badge_line)) problems.push('badge_line must start with "You"');

  const labels = new Set();
  for (const role of ROLES) {
    const c = s[role];
    const words = c.label.trim().split(/\s+/).length;
    if (len(c.label) > LIMITS.label) problems.push(`${role}.label "${c.label}" is ${len(c.label)} characters; max is ${LIMITS.label}`);
    if (words < 2 || words > LIMITS.labelWords) problems.push(`${role}.label "${c.label}" has ${words} words; use 2-${LIMITS.labelWords}`);
    if (/[.!?,"“”]/.test(c.label)) problems.push(`${role}.label "${c.label}" must not contain punctuation`);
    if (/^I\b/.test(c.label)) problems.push(`${role}.label must not start with "I"`);
    if (role === 'careless' && /\bpast\b/i.test(c.label)) problems.push(`careless.label "${c.label}" uses "past"; the careless action must knock into something (run through, bump into, trip over, knock over)`);
    if (role === 'careless' && /\b(fast|quick|quickly|rough|roughly|hard)\b/i.test(c.label)) problems.push(`careless.label "${c.label}" sounds like helping too fast; it must be rushing around without looking, not a rough version of helping`);
    if (len(c.reaction_title) > LIMITS.reaction_title) problems.push(`${role}.reaction_title is ${len(c.reaction_title)} characters; max is ${LIMITS.reaction_title}`);
    if (len(c.feedback) > LIMITS.feedback) problems.push(`${role}.feedback is ${len(c.feedback)} characters; max is ${LIMITS.feedback}`);
    const key = c.label.toLowerCase().trim();
    if (labels.has(key)) problems.push(`label "${c.label}" is used twice`);
    labels.add(key);
  }

  const allText = [s.scenario, s.badge_line, ...ROLES.flatMap((r) => [s[r].label, s[r].reaction_title, s[r].feedback])].join(' ');
  const banned = allText.match(BLOCKLIST);
  if (banned) problems.push(`uses the word "${banned[0]}", which is not allowed in a game for young children`);

  return problems;
}

// ── Shape for the browser ──
// Position is decided here, not by the model: LLMs put the right answer in
// slot 1 or 2 far more often than chance, which kids learn to exploit.
const ROLE_META = {
  helpful:    { correct: true,  emoji: '🎉', anim: 'anim-burst' },
  ignore:     { correct: false, emoji: '😔', anim: 'anim-buzz' },
  careless:   { correct: false, emoji: '😬', anim: 'anim-shove' },
  in_the_way: { correct: false, emoji: '😟', anim: 'anim-slam' },
};

export function toClientPayload(s, seed) {
  const choices = ROLES.map((role) => ({
    role,
    label: s[role].label,
    title: s[role].reaction_title,
    msg: s[role].feedback,
    ...ROLE_META[role],
  }));
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return { scenario: s.scenario, badgeLine: s.badge_line, video: seed.clip, choices, seed };
}

// ── Generation ──
let ai;

async function callModel(seed, problems) {
  ai ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }); // lazy, so a missing key fails the request, not the import
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: buildUserPrompt(seed, problems),
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: 'application/json',
      responseJsonSchema: OUTPUT_SCHEMA,
      thinkingConfig: { thinkingLevel: 'low' },
      maxOutputTokens: 4000,
    },
  });

  const finish = response.candidates?.[0]?.finishReason;
  if (response.promptFeedback?.blockReason) throw new Error(`prompt blocked: ${response.promptFeedback.blockReason}`);
  if (finish === 'SAFETY' || finish === 'PROHIBITED_CONTENT') throw new Error(`response blocked: ${finish}`);
  if (finish === 'MAX_TOKENS') throw new Error('output truncated');
  if (!response.text) throw new Error(`empty response (${finish})`);
  return { data: JSON.parse(response.text), usage: response.usageMetadata };
}

// Generate, validate, and repair up to `maxAttempts` times. Returns the raw
// model output plus a trace of every attempt so the eval can report on it.
export async function generateScenario({ seed = randomSeed(), maxAttempts = 3 } = {}) {
  const attempts = [];
  let problems = [];
  for (let i = 0; i < maxAttempts; i++) {
    const started = Date.now();
    try {
      const { data, usage } = await callModel(seed, problems);
      problems = validateScenario(data);
      attempts.push({ ms: Date.now() - started, problems, usage });
      if (!problems.length) return { ok: true, scenario: data, seed, attempts };
    } catch (err) {
      attempts.push({ ms: Date.now() - started, error: String(err.message || err) });
      problems = [];
    }
  }
  return { ok: false, seed, attempts };
}
