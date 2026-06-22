// transcript.js — the demo story. THIS is the only file you edit to change the demo.
//
// SportTek Intelligence Hub: a product-knowledge brain for the SALES TEAM. Reps ask
// Claude about fabrics, garments, decoration methods, fits, and what to recommend.
// The catalog (Shopify) has the specs; the Hub holds the tribal knowledge the best reps
// carry — which fabric takes which decoration, fit quirks, safe substitutes, what to lead
// with. Claude answers reps using it; gaps become questions; new knowledge is saved.
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
    you: 'Customer wants moisture-wicking polos for a golf team, screen printed. What do you recommend?',
    steps: [
      { tool: 'Catalog', action: 'moisture-wicking polos', result: 'PosiCharge line, micropique polos' },
      { say: 'For moisture-wicking the go-to is the PosiCharge line, but those don’t hold screen-print ink well, they’re built for heat transfer or sublimation. If the customer is set on screen print, they’ll want a cotton-rich polo instead. I don’t have a screen-print-friendly polo flagged in the catalog yet.' },
    ],
    memory: {
      kind: 'question',
      text: 'Which polos are screen-print friendly versus performance-only, so Claude recommends the right one for each decoration method?',
      why: 'The catalog lists the fabric but not which decoration method each one actually holds up to.',
    },
  },

  {
    you: 'Can we embroider the PosiCharge tees?',
    steps: [
      { say: 'Not recommended. Embroidery on a 3.8 oz performance tee tends to pucker, so it doesn’t hold on lightweight wicking knits. For the PosiCharge tees, heat transfer or sublimation looks better. Save embroidery for the fleece, twill, and heavier polos.' },
    ],
    memory: {
      kind: 'mapping',
      text: 'Embroidery is not recommended on lightweight performance knits (PosiCharge tees); use heat transfer or sublimation. Embroidery suits fleece, twill, and heavier polos.',
    },
  },

  {
    you: 'The ST650 polo is out of stock in navy. What’s a good substitute?',
    steps: [
      { tool: 'Catalog', action: 'check ST650 navy', result: 'out of stock' },
      { say: 'Closest match is the ST550 in navy, same micropique feel and a similar fit, and it also embroiders cleanly. One caveat: the ST550 runs about a half size smaller, so size up for bigger players.' },
    ],
    memory: {
      kind: 'question',
      text: 'Which products are approved substitutes for each other when something is out of stock, matched on feel, fit, and decoration?',
      why: 'Reps need safe swaps they can offer with confidence, not just a similar-looking item.',
    },
  },

  {
    you: 'Does the ladies’ Competitor tee run true to size?',
    steps: [
      { say: 'It runs small. Ladies’ performance styles are about one size smaller than unisex, and the Competitor is a fitted cut. Tell her to size up if she wants a relaxed fit.' },
    ],
    memory: {
      kind: 'fact',
      text: 'Ladies’ performance styles run about one size smaller than unisex, and the Competitor tee is a fitted cut. Reps should advise sizing up for a relaxed fit.',
    },
  },

  {
    you: 'Customer wants a full-color photo logo on tees. Best option?',
    steps: [
      { say: 'Full-color photo work means sublimation, and sublimation only reproduces on white or light **polyester**. It won’t work on dark fabric or on cotton. I’d put them on a white PosiCharge tee so the logo comes out clean.' },
    ],
    memory: {
      kind: 'mapping',
      text: 'Full-color and photo logos require sublimation on white or light polyester. They will not reproduce on dark fabric or on cotton.',
    },
  },

  {
    you: 'What should I lead with for a youth soccer league?',
    steps: [
      { tool: 'Catalog', action: 'youth performance tops', result: 'youth wicking tees, youth jerseys' },
      { say: 'For youth soccer I’d lead with a lightweight wicking tee or a youth jersey, in youth sizing. One thing to confirm before quoting: youth apparel for younger kids can fall under CPSIA depending on age and decoration.' },
    ],
    memory: {
      kind: 'question',
      text: 'For youth and team orders, which products are youth-sized and which decoration methods keep them CPSIA-compliant?',
      why: 'Youth gear carries safety rules, and reps should never guess at compliance on a quote.',
    },
  },

  {
    you: 'A customer asked if our performance jackets are waterproof.',
    steps: [
      { say: 'They’re water-resistant, not waterproof, so don’t promise waterproof. The right way to describe them is water-resistant and wind-resistant, good for light rain and wind, not a downpour.' },
    ],
    memory: {
      kind: 'guardrail',
      text: 'Never describe performance outerwear as "waterproof." It is water-resistant. Always say water-resistant / wind-resistant.',
    },
  },

  {
    you: 'Quick, customer wants performance polos for a golf team, embroidered, true to size.',
    steps: [
      { say: 'Lead with the **ST650** micropique polo. It embroiders cleanly because it’s a heavier knit than the tees, it’s moisture-wicking, and it runs true to size, so no sizing caveat to give. Skip the PosiCharge tees for embroidery. Want me to pull the available colors and the quantity price breaks?' },
    ],
    memory: {
      kind: 'fact',
      text: 'For embroidered performance polos, the ST650 is the lead recommendation: it embroiders cleanly, is moisture-wicking, and runs true to size.',
    },
  },
];
