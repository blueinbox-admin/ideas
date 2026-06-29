// transcript.js — the short guided story the engine autoplays before handing over.
// The live-call flow from the proposal: a rep describes what the customer is
// making in plain language, Claude returns the right fabric with what's in stock
// and an offer to send links. Surfaces ONE high-concept, reusable fact.
// Grounded in Sportek's real catalog (F-78, FM-60, PFP).
window.TRANSCRIPT = [
  {
    you: 'On a call — customer wants a printed polo, four-way stretch, mid weight. What do we have and what’s in stock?',
    steps: [
      { tool: 'Shopify', action: 'match · printed polo · 4-way + mid weight + PFP', result: 'F-78 6oz · FM-60 matte · both PFP · in stock' },
      { say: 'For a printed polo at mid weight I’d lead with **F-78** (shiny four-way nylon-spandex, 6oz, in the PFP line so it takes the print) — in stock now. **FM-60** is the matte option if they want less sheen. Want the catalog links to send over?' },
    ],
    memory: {
      kind: 'mapping',
      scope: 'teamwear',
      text: 'For printed polos and team tops, lead with F-78 (shiny) or FM-60 (matte) nylon-spandex tricot: both four-way stretch, mid weight, and PFP so they take a print.',
    },
  },
];
