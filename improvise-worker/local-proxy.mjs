// local-proxy.mjs — run the improviser on your laptop, no Cloudflare needed.
// Same logic + prompt as the Worker (shared via prompt.mjs).
//
// Key source (first found wins):
//   1. ANTHROPIC_API_KEY env var
//   2. improvise-worker/.dev.vars   (a gitignored file: ANTHROPIC_API_KEY=sk-ant-...)
//
// Run:   node improvise-worker/local-proxy.mjs
// The engine auto-targets http://localhost:8787 when a demo is on localhost,
// so off-script prompts roleplay live with no config edits.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { systemPrompt, extractJson } from './prompt.mjs';

const MODEL = 'claude-haiku-4-5-20251001';
const PORT = 8787;

function loadKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY.trim();
  try {
    const txt = readFileSync(new URL('./.dev.vars', import.meta.url), 'utf8');
    const m = txt.match(/ANTHROPIC_API_KEY\s*=\s*(.+)/);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  } catch {}
  return '';
}
const KEY = loadKey();
if (!KEY) {
  console.error('No key. Set ANTHROPIC_API_KEY, or put it in improvise-worker/.dev.vars');
  process.exit(1);
}

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };

createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
  if (req.method !== 'POST') { res.writeHead(405, CORS); return res.end('POST only'); }
  let raw = ''; for await (const c of req) raw += c;
  let body; try { body = JSON.parse(raw); } catch { res.writeHead(400, CORS); return res.end('{}'); }
  const { org = 'the company', platform = 'their tools', agent = 'Claude', prompt = '', scopes = [] } = body;
  try {
    const ant = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: 500, system: systemPrompt({ org, platform, agent, scopes }), messages: [{ role: 'user', content: String(prompt).slice(0, 600) }] }),
    });
    const data = await ant.json();
    const parsed = extractJson(data?.content?.[0]?.text || '');
    res.writeHead(parsed ? 200 : 502, { ...CORS, 'Content-Type': 'application/json' });
    res.end(JSON.stringify(parsed || { error: 'parse', upstream: data?.error || null }));
  } catch (e) {
    res.writeHead(502, { ...CORS, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(e && e.message || e) }));
  }
}).listen(PORT, () => console.log(`improviser live on http://localhost:${PORT}  (model ${MODEL})`));
