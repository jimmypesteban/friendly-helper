// GET /api/scenario → one freshly generated, validated scenario.
// The Gemini key is read from the server environment only.

import { generateScenario, toClientPayload } from '../lib/scenario.js';

export const config = { maxDuration: 60 };

export async function GET() {
  const result = await generateScenario();
  if (!result.ok) {
    console.error('scenario generation failed', JSON.stringify(result.attempts));
    return Response.json({ error: 'generation_failed' }, { status: 502 });
  }
  return Response.json(toClientPayload(result.scenario, result.seed), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
