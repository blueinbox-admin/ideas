// prototypes.js — the single source of truth for the launcher (index.html).
//
// To ADD a prototype:   copy an existing folder, then add one entry below.
// To REORDER:           move entries (top entry shows first).
// To HIDE one:          set hidden: true (kept in the file, off the launcher).
//
// Fields:
//   slug     folder name = deployed URL slug (the card links to ./<slug>/)
//   connector  the tool Claude works in (the headline on the card)
//   persona    the made-up business the demo follows
//   blurb      one or two plain sentences on what the demo shows
//   status     'live' | 'wip' | 'draft'  (drives the little status dot/label)
//   hidden     optional; true keeps it in this file but off the launcher
window.PROTOTYPES = [
  {
    slug: 'activememory-sfmc',
    connector: 'Salesforce Marketing Cloud',
    persona: 'Vanta Motors',
    blurb: 'A marketing-ops brain for an auto brand on SFMC. Claude builds audiences, wires journeys, and schedules sends; the memory files every fact under a project (or Org-wide), so Claude gets the setup right instead of guessing.',
    status: 'live',
  },
  // ── Deprecated: older UX, pre shared-engine. Hidden from the launcher (kept for
  //    reference). Re-cut onto the shared engine + a config.js if a lead wants them.
  {
    slug: 'activememory-sportek',
    connector: 'Product knowledge for sales',
    persona: 'Sportek International',
    blurb: 'A sales-enablement brain for a wholesale technical-fabric distributor.',
    status: 'live',
    hidden: true,
  },
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
