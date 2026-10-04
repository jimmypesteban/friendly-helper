# Friendly Helper

A small social-emotional learning game for kids aged 5–8, set in Hong Kong. A short scene plays, the child picks one of four actions, and gets gentle feedback. Getting it right earns a Friendly Helper badge.

**Live:** https://friendly-helper.vercel.app

There are 10 scenarios, one per background clip (photorealistic Hong Kong settings: classroom, MTR, cha chaan teng, park and more). Each is built around a person who is visible when the clip freezes. Scenarios play in a fixed order, 1 to 10 as listed in `scenarios.json`, then loop back to the first. The four answers are shuffled every round. The game is static: no server, no API calls while playing.

## How it works

- `scenarios.json`: the 10 scenarios. Each has one `helpful` answer and three kinds of wrong answer (`ignore`, `careless`, `in_the_way`), each with its own feedback.
- `index.html`: the game. Loads the scenarios, plays the matching clip, freezes it and shows the choices.
- `clips/`: background clips made with Veo, one per setting. `scripts/make-clips.mjs` builds them.
- `lib/scenes.js`: what is visible in each clip's frozen frame.

**Earlier version (kept as tooling):** the game used to generate a new scenario on every play with Gemini. `lib/scenario.js` holds that prompt, JSON schema, validator and repair loop, and `scripts/eval.mjs` the test harness that graded it with a second model. The shipped scenarios still pass the same validator.

[PROMPT_NOTES.md](PROMPT_NOTES.md) covers the prompt design, test results across versions, and what broke along the way.

## Run locally

```bash
npm install
npm run dev            # http://localhost:3030

# Earlier generation pipeline (costs API credits):
echo "GEMINI_API_KEY=your-key" > .env.local
node --env-file=.env.local scripts/eval.mjs
```
