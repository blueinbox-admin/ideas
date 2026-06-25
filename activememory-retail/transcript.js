// transcript.js — the short guided story the engine autoplays before handing over.
// Same shape as every demo: turns of { you, steps, memory }. Memory kinds:
// fact/mapping/guardrail are saved knowledge; question lands on Review.
window.TRANSCRIPT = [
  // A real BUILD with a QUANTITATIVE result, then the app surfaces BOTH a recipe FACT
  // and a higher-level pattern QUESTION it derived (two attributes -> a use case).
  {
    you: 'Build the win-back audience and tell me how many lapsed customers we have.',
    steps: [
      { tool: 'Shopify', action: 'customers by last order date', result: '3,420 with no order in 6+ months · 540 former VIPs' },
      { say: 'Built the **win-back audience** from Shopify order history: **3,420 customers** have not ordered in 6+ months. **540** of them are former VIPs (3+ orders or $300+ lifetime spend).' },
    ],
    memory: [
      { kind: 'fact', scope: 'win-back', text: 'The win-back audience is customers with no order in 6+ months, pulled from Shopify order history.' },
      {
        kind: 'question',
        scope: 'win-back',
        text: 'Which lapsed customers were once VIPs (3+ orders or $300+ spend), so we can send them a stronger win-back offer than first-time lapsers?',
        why: 'Lapsed status crossed with past VIP value is a segment worth a different offer, but how generous to be is a margin call only your team can make.',
      },
    ],
  },
  // Claude INFERS a cross-system mapping -> a SOFT fact ("assumed, fix if wrong")
  {
    you: 'Match yesterday’s refunds against the books.',
    steps: [
      { say: 'Refunds show up in QuickBooks as a **credit memo** tied to the original sales receipt, so I will match them to the Shopify order by order number. Since I am inferring that mapping from the data shapes rather than reading it from your setup, I have saved it as an assumption for you to correct if it is off.' },
    ],
    memory: { kind: 'mapping', scope: 'org', soft: true, text: 'Refunds appear in QuickBooks as a credit memo tied to the original sales receipt; match them to the Shopify order by order number.' },
  },
];
