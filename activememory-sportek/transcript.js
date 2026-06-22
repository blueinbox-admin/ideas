// transcript.js — the demo story. THIS is the only file you edit to change the demo.
//
// Sportek Intelligence Hub: a product-knowledge brain for the SALES TEAM at a wholesale
// technical-fabric distributor. Reps ask Claude about fabrics, applications, weights,
// stretch, print methods, chlorine resistance, substitutes, and what to quote. The catalog
// (Shopify) has the specs and stock; the Hub holds the tribal knowledge the best reps carry
// — which fabric suits which end use, what prints, safe substitutes, ordering rules.
// Claude answers reps using it; gaps become questions; new knowledge is saved.
//
// Each turn:
//   you     what a sales rep types into Claude Code (one line)
//   steps   { say: "..." }  Claude's reply, or { tool: "Catalog", action: "...", result: "..." }
//   memory  { kind: "question"|"fact"|"mapping"|"guardrail", text, why? }
//             question -> Review, fact/mapping -> Facts, guardrail -> Guardrails
//
// Formatting: **bold** is the only markup. Use a curly apostrophe (’) inside words so the
// single-quoted strings don’t break. No em/en dashes. Timing is automatic.

window.TRANSCRIPT = [
  {
    you: 'Customer is making competitive swimwear and wants chlorine resistance plus a sublimated print. What fabric do I quote?',
    steps: [
      { tool: 'Catalog', action: 'chlorine-resistant swim fabric', result: 'F-70L chlorine-resist, UPF50+, yarn-dyed stripe' },
      { say: 'For chlorine durability our flagship is the F-70L, nylon-LYCRA, UPF50+. But it’s yarn-dyed striped, so it isn’t a print base. Sublimation needs a PFP (prepared-for-print) white polyester base, and most of our high chlorine-resist tricots aren’t PFP. I don’t have a fabric flagged as **both** chlorine-resistant and sublimation-ready in the catalog yet.' },
    ],
    memory: {
      kind: 'question',
      text: 'Which fabrics are both chlorine-resistant and PFP/sublimation-ready, so Claude can quote competitive swimwear that needs a printed design?',
      why: 'The catalog lists chlorine resistance and print-readiness separately, but not which fabrics do both.',
    },
  },

  {
    you: 'Can we sublimate on the F-56 shiny tricot?',
    steps: [
      { say: 'No. Sublimation only bonds to PFP polyester, a prepared-for-print white or light base. The F-56 is a nylon-spandex shiny tricot, so it won’t hold a sublimated print. For a printed design, point them to our PFP poly-spandex styles instead.' },
    ],
    memory: {
      kind: 'mapping',
      text: 'Sublimation only works on PFP (prepared-for-print) polyester bases. Nylon-spandex tricots like the F-56 are not PFP and will not take a sublimated print.',
    },
  },

  {
    you: 'The SP-2800 perforated mesh is out of stock. What’s a good substitute?',
    steps: [
      { tool: 'Catalog', action: 'check SP-2800', result: 'out of stock' },
      { say: 'Closest in feel is the 0620 performance mesh, same moisture-management mesh family. One caveat: the 0620 runs lighter and isn’t 66" wide like the SP-2800, so confirm the cut width works for their marker before you quote.' },
    ],
    memory: {
      kind: 'question',
      text: 'Which fabrics are approved substitutes for each other when a roll is out of stock, matched on weight, width, stretch, and hand?',
      why: 'Reps need safe swaps a customer can cut and sew without surprises, not just a similar-looking mesh.',
    },
  },

  {
    you: 'Customer wants leggings that are squat-proof. Which weight holds up?',
    steps: [
      { say: 'Go heavier and matte. The FM-65 matte tricot at about 8 oz is opaque under stretch, that’s the squat-proof one. The lighter shiny tricots can show through when fully stretched, so steer leggings away from those.' },
    ],
    memory: {
      kind: 'fact',
      text: 'For squat-proof leggings, recommend heavier matte tricots (FM-65, ~8 oz). Lighter shiny tricots can show through under full stretch and should be avoided for leggings.',
    },
  },

  {
    you: 'Customer needs a compressive, structured waistband for that same legging.',
    steps: [
      { say: 'That’s a power-mesh job, not a body fabric. The SP-37 nylon-spandex power mesh is built for structure and support, so map it to waistbands, linings, and panels. Keep the FM-65 matte tricot for the main leg.' },
    ],
    memory: {
      kind: 'mapping',
      text: 'Power mesh (SP-37) maps to support zones: waistbands, linings, and panels, not the main garment body. Pair it with a body fabric like the FM-65 matte tricot.',
    },
  },

  {
    you: 'A customer wants recycled eco fabric for a swim line. What do we have?',
    steps: [
      { tool: 'Catalog', action: 'eco recycled swim', result: 'recycled poly-spandex styles' },
      { say: 'We carry recycled poly-spandex in the eco line, and it sublimates like our other PFP poly. One thing to confirm before quoting: which specific styles carry a recycled-content certification the customer can cite, since brands usually need that on paper.' },
    ],
    memory: {
      kind: 'question',
      text: 'Which eco fabrics carry documented recycled-content certification, and at what percentage, so reps can back up sustainability claims on a quote?',
      why: 'Brands need certifiable recycled content for their own marketing, and reps should never guess at a certification.',
    },
  },

  {
    you: 'Customer asked if the F-70L is chlorine-proof for a swim-team contract.',
    steps: [
      { say: 'Say chlorine-resistant, not chlorine-proof. The F-70L resists chlorine breakdown far longer than standard spandex, but no swim fabric is chlorine-proof, so don’t promise it. The right phrasing is **extended chlorine resistance**.' },
    ],
    memory: {
      kind: 'guardrail',
      text: 'Never describe a fabric as "chlorine-proof." Our chlorine-resist styles are chlorine-resistant with extended life. Always say chlorine-resistant.',
    },
  },

  {
    you: 'Quick, customer needs competitive swim fabric, sublimation-printable, chlorine-durable, by the roll.',
    steps: [
      { say: 'Lead with our **PFP MaxDri poly-spandex** chlorine-resist style. It’s a prepared-for-print white base so it sublimates clean, it’s built for moisture and chlorine durability, and it ships by the roll. Skip the F-70L here since it’s yarn-dyed and can’t be printed. Want me to pull the roll length and price breaks?' },
    ],
    memory: {
      kind: 'fact',
      text: 'For printed competitive swimwear, lead with the PFP MaxDri chlorine-resist poly-spandex: it is a prepared-for-print base, sublimates cleanly, and offers chlorine durability. Not the F-70L, which is yarn-dyed and cannot be printed.',
    },
  },
];
