// defaults.js — the canonical demo, expressed as data.
//
// THE CONTRACT: every demo inherits these defaults. A per-demo config.js
// (window.DEMO) overrides ONLY what differs. "I want the XYZ demo to have
// feature A and B, everything else the same" is therefore a two-line change:
// set those two flags (or add that data) and leave the rest unwritten — the
// engine fills the gaps from here.
//
// The engine resolves the live config as:
//   FEATURES  = { ...DEFAULTS.features, ...(DEMO.features || {}) }   (shallow merge)
//   everything else: DEMO.<key> ?? DEFAULTS.<key>
//
// Keep this surface SMALL. A flag earns its place only when a real lead needs to
// vary it. Content (facts, connectors, transcript) is DATA per demo, never a flag.
window.DEMO_DEFAULTS = {
  // ---- structural feature flags (the only things a demo toggles) ----
  features: {
    claudeCodeWindow: true,   // the side-by-side Claude Code pane (demo scaffolding)
    autoplay:         true,   // short guided intro that then hands the keyboard over
    freeTyping:       true,   // user can type into Claude Code; replies are faked
    onboarding:       true,   // the two intro callouts
    softFacts:        true,   // inferred facts render as "assumed" + a "Looks right" opt-out
    multiScope:       true,   // multi-select scope pills (union browse)
    factGrouping:     true,   // group confirmed facts by scope on the Facts shelf
    coTagSuggestions: true,   // "+ project?" co-tag hints on a fact's scope chips
    credentialsTab:   true,   // the Credentials tab (shown at org-root / All only)
  },

  // ---- live LLM fallback (off-script typing) ----
  // When a typed prompt doesn't match a demo's curated respond() branch, the
  // engine calls this endpoint (a Cloudflare Worker that holds the Anthropic
  // key — see improvise-worker/) to improvise a plausible answer + a high-level
  // fact. Leave '' to disable (a quiet static reply is used instead). Set it
  // ONCE here after deploying the worker, and every demo gets the live fallback.
  improviseUrl: '',

  // ---- canonical copy the engine falls back to when a demo omits it ----
  // (identity, connectors, scopes, seed, transcript, responder, onboarding all
  // live in each demo's config.js — there is no sensible default org.)
  org:        { name: 'Acme', product: 'Marketing Memory', url: 'memory.example.com' },
  connectors: [],
  scopes:     [],
  seed:       { facts: [], questions: [] },
  transcript: [],
  responder:  [],
  onboarding: [],
};
