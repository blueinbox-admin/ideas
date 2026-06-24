// transcript.js — the short guided story the engine autoplays before handing over.
// Same shape as every demo: turns of { you, steps, memory }. Memory kinds:
// fact/mapping/guardrail are saved knowledge; question lands on Review.
window.TRANSCRIPT = [
  // chat Q&A -> a saved FACT (the answer, not the question)
  {
    you: 'Pull the win-back audience for customers who have not ordered in a while.',
    steps: [
      { tool: 'Shopify', action: 'customers by last order date', result: 'customers + last order date' },
      { say: 'How long since the last order counts as lapsed for win-back?' },
      { u: 'No order in 6 months.' },
      { say: 'Got it, lapsed is no order in 6 months. Building the segment from Shopify order history.' },
    ],
    memory: { kind: 'fact', scope: 'win-back', text: 'Win-back targets customers with no order in 6 months, pulled from Shopify order history.' },
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
