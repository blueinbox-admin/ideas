// worker.js — the "improviser" behind the demos' off-script fallback.
//
// Given what a user typed to the agent, it asks Claude to invent a plausible
// answer + ONE high-level, reusable fact about a made-up org, and returns JSON
// the static demo surfaces. The Anthropic key lives HERE as a secret, never in
// the public site.
//
// Deploy (from this folder):
//   npm i -g wrangler          # if you don't have it
//   wrangler login
//   wrangler secret put ANTHROPIC_API_KEY   # paste your key when prompted
//   wrangler deploy
// Then copy the printed URL into shared/engine/defaults.js -> improviseUrl.

// Only browsers on these origins may call the worker (light abuse guard; add
// your own domain here if you deploy the demos elsewhere).
const ALLOWED = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/blueinbox-admin\.github\.io$/,
];
const MODEL = 'claude-haiku-4-5-20251001';   // fast; this is a demo fallback

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const headers = cors(origin);
    if (request.method === 'OPTIONS') return new Response(null, { headers });
    if (request.method !== 'POST') return new Response('POST only', { status: 405, headers });
    if (!ALLOWED.some((re) => re.test(origin))) return new Response('forbidden origin', { status: 403, headers });

    let body;
    try { body = await request.json(); } catch { return json({ error: 'bad json' }, 400, headers); }
    const { org = 'the company', platform = 'their tools', agent = 'Claude', prompt = '', scopes = [] } = body;
    if (!prompt || typeof prompt !== 'string') return json({ error: 'no prompt' }, 400, headers);

    const ant = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        system: systemPrompt({ org, platform, agent, scopes }),
        messages: [{ role: 'user', content: prompt.slice(0, 600) }],
      }),
    });
    if (!ant.ok) return json({ error: 'upstream', status: ant.status }, 502, headers);

    const data = await ant.json();
    const text = (data.content && data.content[0] && data.content[0].text) || '';
    const parsed = extractJson(text);
    if (!parsed || !parsed.reply) return json({ error: 'parse' }, 502, headers);
    return json(parsed, 200, headers);
  },
};

function cors(origin) {
  const ok = origin && ALLOWED.some((re) => re.test(origin));
  return {
    'Access-Control-Allow-Origin': ok ? origin : 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}

function extractJson(s) {
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

function systemPrompt({ org, platform, agent, scopes }) {
  const scopeList = (Array.isArray(scopes) ? scopes : []).concat(['org']).join(', ');
  return [
    `You are the memory layer behind ${agent} for ${org}, a company that runs its work on ${platform}.`,
    `A teammate just typed a message to ${agent}. Assume ${agent} already has full, authenticated access to ${org}'s ${platform} and either answered the question or did the task SUCCESSFULLY, using realistic, specific, INVENTED details about ${org} (object names, fields, conventions, numbers). This is a demo: nothing has to be true, but it must sound like a real, well-run ${org}.`,
    ``,
    `Return ONLY a JSON object (no markdown, no preamble) with exactly these keys:`,
    `- "reply": ${agent}'s short first-person reply, max 45 words. If the message is a QUESTION, ANSWER it concretely with invented specifics (real-sounding object/field names, locations, numbers). If it's a TASK, confirm it's done with a concrete result, leading with a number when natural. No filler like "On it" or "I worked from what your team has saved".`,
    `- "tool": { "action": a 2-5 word lowercase action label (e.g. "look up model data"), "result": a short concrete result string, max 8 words }.`,
    `- "fact": { "text": ONE high-level, REUSABLE fact the memory gleaned about HOW ${org} WORKS — a convention, mapping, data location, or rule. It MUST be reusable knowledge, NOT a restatement of the message or a one-off answer. Specific and plausible, max 30 words. "scope": the single best key from: ${scopeList}. Use "org" if it applies company-wide. }`,
  ].join('\n');
}
