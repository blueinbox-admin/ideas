// serve.mjs — ONE local server for the whole thing: it serves the demo files AND
// runs the live LLM improviser, on a single port. No more two-terminal setup.
//
//   GET  /<anything>       -> static files from the ideas repo (the demos, admin, etc.)
//   POST /improvise        -> the roleplay LLM (same logic + prompt as the Worker)
//
// Because the page and the improviser share an origin, off-script prompts roleplay
// live with no CORS and no config edits.
//
// Key source (first found wins):
//   1. ANTHROPIC_API_KEY env var
//   2. improvise-worker/.dev.vars   (gitignored: ANTHROPIC_API_KEY=sk-ant-...)
//
// Run:   node serve.mjs          (or:  node serve.mjs 8788)
import { createServer } from 'node:http';
import { readFile, readFileSync, stat } from 'node:fs';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { systemPrompt, extractJson, buildMessages } from './improvise-worker/prompt.mjs';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.argv[2]) || 8788;
const MODEL = 'claude-haiku-4-5-20251001';

function loadKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY.trim();
  try {
    const txt = readFileSync(new URL('./improvise-worker/.dev.vars', import.meta.url), 'utf8');
    const m = txt.match(/ANTHROPIC_API_KEY\s*=\s*(.+)/);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  } catch {}
  return '';
}
const KEY = loadKey();
if (!KEY) console.warn('WARN: no ANTHROPIC_API_KEY — static files will serve, but /improvise will 500.');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.map': 'application/json',
};

async function improvise(req, res) {
  let raw = ''; for await (const c of req) raw += c;
  let body; try { body = JSON.parse(raw); } catch { res.writeHead(400); return res.end('{}'); }
  if (!KEY) { res.writeHead(500, { 'Content-Type': 'application/json' }); return res.end('{"error":"no key"}'); }
  const { org = 'the company', platform = 'their tools', agent = 'Claude', prompt = '', history = [], scopes = [] } = body;
  try {
    const ant = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: 500, system: systemPrompt({ org, platform, agent, scopes }), messages: buildMessages({ history, prompt }) }),
    });
    const data = await ant.json();
    const parsed = extractJson(data?.content?.[0]?.text || '');
    res.writeHead(parsed ? 200 : 502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(parsed || { error: 'parse', upstream: data?.error || null }));
  } catch (e) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(e && e.message || e) }));
  }
}

function serveStatic(req, res) {
  let path = decodeURIComponent((req.url || '/').split('?')[0]);
  if (path.endsWith('/')) path += 'index.html';
  const full = normalize(join(ROOT, path));
  if (!full.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }
  stat(full, (err, s) => {
    if (err || !s.isFile()) { res.writeHead(404); return res.end('not found'); }
    readFile(full, (e, buf) => {
      if (e) { res.writeHead(500); return res.end('error'); }
      res.writeHead(200, { 'Content-Type': MIME[extname(full)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(buf);
    });
  });
}

createServer((req, res) => {
  const path = (req.url || '/').split('?')[0];
  if (req.method === 'POST' && path === '/improvise') return improvise(req, res);
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end('GET or POST /improvise'); }
  serveStatic(req, res);
}).listen(PORT, () => {
  console.log(`\n  Sportek + fleet demos:  http://localhost:${PORT}/activememory-sportek/`);
  console.log(`  Admin / fleet matrix:   http://localhost:${PORT}/admin.html`);
  console.log(`  Improviser:             POST /improvise  (${KEY ? 'model ' + MODEL : 'NO KEY — will 500'})\n`);
});
