# improvise-worker

The live LLM fallback behind the demos. When someone types something off-script
into the agent (a prompt that no demo's curated `respond()` branch matches), the
static site calls this Cloudflare Worker. The worker asks Claude — using the org
and platform as context — to invent a plausible answer plus ONE high-level,
reusable fact, and returns it as JSON the demo surfaces.

The Anthropic API key lives here as a Worker **secret**, so it's never exposed in
the public GitHub Pages site.

## Deploy (once)

```bash
cd improvise-worker
npm i -g wrangler            # if needed
wrangler login
wrangler secret put ANTHROPIC_API_KEY   # paste your Anthropic key
wrangler deploy
```

`wrangler deploy` prints a URL like
`https://activememory-improvise.<your-subdomain>.workers.dev`.

## Turn it on

Paste that URL into [`../shared/engine/defaults.js`](../shared/engine/defaults.js):

```js
improviseUrl: 'https://activememory-improvise.<your-subdomain>.workers.dev',
```

Bump the `defaults.js?v=` cache-buster in each demo's `index.html`, commit, and
every demo gets the live fallback. Leave `improviseUrl: ''` to disable (the demo
uses a quiet static reply instead).

## Notes

- **Abuse guard:** the worker only answers browser requests from an allow-listed
  `Origin` (localhost + `blueinbox-admin.github.io`). Add your domain to
  `ALLOWED` in `worker.js` if you host the demos elsewhere.
- **Model:** `claude-haiku-4-5` for low latency. Change `MODEL` in `worker.js`.
- **Cost:** one small call per off-script prompt. Curated prompts never hit it.
- **Local test:** `wrangler dev` serves the worker at `http://localhost:8787`;
  point `improviseUrl` there to try it before deploying.
