// versions.js — THE single registry for the whole fleet. One entry per version.
// It holds BOTH the launcher card data AND the per-version knobs (which surface,
// which features). The launcher (index.html) and every demo (via boot.js) read
// this same file, so there is one source of truth, not data scattered per demo.
//
// Feature flags resolve last-wins, in this order:
//   shared/engine/defaults.js  ->  this entry's `features`  ->  the demo's own
//   config.js `features` (rare)  ->  ?admin live toggles (localStorage).
// So THIS file is where you set "which features which version has." The ?admin
// panel only writes browser-local overrides; to make a change stick, set it here.
//
// To ADD a version:   add an entry (and create its folder/config.js).
// To TOGGLE a feature: set it in `features` (e.g. { onboarding: false }).
// To SWITCH surface:   set `surface: 'desktop' | 'embedded' | 'none'`.
// To HIDE from launcher: hidden: true (kept here, off the grid).
//
// Fields:
//   slug       folder name = deployed URL slug (card links to ./<slug>/)
//   connector  the tool Claude works in (the card headline)
//   persona    the made-up business the demo follows
//   blurb      one or two plain sentences on what the demo shows
//   status     'live' | 'wip' | 'draft'
//   surface    which agent chrome: 'desktop' | 'embedded' | 'none'
//   features   per-version flag overrides ({} = all engine defaults)
//   hidden     optional; true keeps it here but off the launcher
window.VERSIONS = [
  {
    slug: 'activememory-sfmc',
    connector: 'Salesforce Marketing Cloud',
    persona: 'Vanta Motors',
    blurb: 'A marketing-ops brain for an auto brand on SFMC. Claude builds audiences, wires journeys, and schedules sends; the memory files every fact under a project (or Org-wide), so Claude gets the setup right instead of guessing.',
    status: 'live',
    surface: 'desktop',
    features: {},
  },
  {
    slug: 'activememory-retail',
    connector: 'Shopify + QuickBooks',
    persona: 'Maple & Pine',
    blurb: 'A DTC retailer running its store and books with Claude built in. Same engine as the SFMC demo, but the agent is an in-product chat (the embedded surface). The memory files every fact by campaign or Org-wide.',
    status: 'live',
    surface: 'embedded',
    features: {},
  },
  {
    slug: 'activememory-sportek',
    connector: 'Product catalog & orders',
    persona: 'Sportek International',
    blurb: 'A sales assistant for a wholesale technical-fabric distributor. Reps describe what a customer is making; Claude matches it to real fabrics by spec, checks stock, and drafts a quote. The memory learns the product knowledge and the sales conventions. Seeded from sportek.com.',
    status: 'live',
    surface: 'embedded',
    features: {},
  },
  // ── Deprecated: older UX, pre shared-engine. Hidden from the launcher (kept for
  //    reference). These do NOT read the engine, so their `features` are inert.
  //    Re-cut onto the shared engine + a config.js if a lead wants them.
  {
    slug: 'activememory-wordpress',
    connector: 'WordPress',
    persona: 'Reyes Law Firm',
    blurb: 'A solo estate-planning firm. Claude builds and edits the website while Active Memory learns the setup, voice, and rules.',
    status: 'live',
    hidden: true,
  },
  {
    slug: 'activememory-quickbooks',
    connector: 'QuickBooks',
    persona: 'Bluebird Coffee',
    blurb: 'A two-shop coffee business. Claude does the bookkeeping while Active Memory learns the categories and rules.',
    status: 'live',
    hidden: true,
  },
  {
    slug: 'activememory-salesforce',
    connector: 'Salesforce Marketing Cloud',
    persona: 'Healthcare marketing team',
    blurb: 'The first connector: email and journey work in SFMC. Earlier build, different layout.',
    status: 'draft',
    hidden: true,
  },
];

// Back-compat: anything still reading window.PROTOTYPES gets the same list.
window.PROTOTYPES = window.VERSIONS;
