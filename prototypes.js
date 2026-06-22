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
    slug: 'activememory-sportek',
    connector: 'Product knowledge for sales',
    persona: 'Sportek International',
    blurb: 'A sales-enablement brain for a wholesale technical-fabric distributor. Reps ask Claude about fabrics, applications, what prints, and what to quote; the hub remembers what the best reps know so everyone gives the same right answer.',
    status: 'live',
  },
  {
    slug: 'activememory-wordpress',
    connector: 'WordPress',
    persona: 'Reyes Law Firm',
    blurb: 'A solo estate-planning firm. Claude builds and edits the website while Active Memory learns the site setup, the firm’s voice, and the rules it must never break.',
    status: 'live',
  },
  {
    slug: 'activememory-quickbooks',
    connector: 'QuickBooks',
    persona: 'Bluebird Coffee',
    blurb: 'A two-shop coffee business. Claude does the bookkeeping while Active Memory learns the categorizations, the cross-system mappings, and the close-period rules.',
    status: 'live',
  },
  {
    slug: 'activememory-salesforce',
    connector: 'Salesforce Marketing Cloud',
    persona: 'Healthcare marketing team',
    blurb: 'The first connector: email and journey work in SFMC. Earlier build, different layout.',
    status: 'draft',
  },
];
