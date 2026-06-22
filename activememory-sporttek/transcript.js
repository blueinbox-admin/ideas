// transcript.js — the demo story. THIS is the only file you edit to change the demo.
//
// Each turn has three parts:
//   you     what the ops manager types into Claude Code (one line of plain text)
//   steps   what Claude does, in order. Each step is either:
//             { say: "..." }                                  Claude's reply (plain text)
//             { tool: "Shopify", action: "...", result: "..." }   a tool line (Shopify / QuickBooks / HubSpot)
//             { tool: "QuickBooks", action: "value inventory", lines: [ "...", ... ] }
//   memory  the one thing Active Memory keeps from this turn:
//             { kind: "question", text: "...", why: "..." }   -> Review tab
//             { kind: "fact",     text: "..." }               -> Facts tab
//             { kind: "mapping",  text: "..." }               -> Facts tab (mapping pill)
//             { kind: "guardrail",text: "..." }               -> Guardrails tab
//
// SportTek USA: customizable team & sports apparel, hybrid wholesale + D2C, on Shopify +
// QuickBooks + HubSpot. The ops manager uses Claude to ANALYZE and run the operation —
// inventory, margin, sales, accounts. Active Memory's questions are the business knowledge
// Claude needs to analyze well, and most of them pull across the three platforms.
//
// Formatting: wrap **like this** for bold. Use a curly apostrophe (’) inside words so the
// single-quoted strings don’t break. No em/en dashes. Timing is automatic.

window.TRANSCRIPT = [
  {
    you: 'What do we need to reorder before the fall rush?',
    steps: [
      { tool: 'Shopify', action: 'sell-through + stock on hand', result: 'Navy Varsity Hoodie and team polos trending fast' },
      { tool: 'QuickBooks', action: 'check open purchase orders', result: 'nothing on order' },
      { say: 'At the current pace, the Navy Varsity Hoodie (size L) runs out in about 9 days and the team polos two weeks after. Nothing is on order. I don’t have your reorder points or supplier lead times, so I can’t tell you when to actually place the orders.' },
    ],
    memory: {
      kind: 'question',
      text: 'What reorder point and supplier lead time should Claude use per product, so it can flag restocks before you stock out?',
      why: 'Stock levels live in Shopify, but reorder points and lead times live in your head. Claude needs both to call a reorder in time.',
    },
  },

  {
    you: 'What’s our actual margin on the Varsity Hoodie?',
    steps: [
      { tool: 'Shopify', action: 'retail price', result: '$42.00' },
      { tool: 'QuickBooks', action: 'item cost', result: 'blank $14.00, plus uncategorized freight' },
      { say: 'It sells for $42 and the blank is $14 in QuickBooks, but I can’t see whether decoration and freight are folded into the cost. Depending on that, the margin is anywhere from 40% to 67%.' },
    ],
    memory: {
      kind: 'question',
      text: 'Which costs make up landed cost for margin: just the blank, or blank plus decoration plus freight? And which QuickBooks account holds each?',
      why: 'Margin per product is only right if Claude knows everything that goes into COGS, and those costs sit in different QuickBooks accounts.',
    },
  },

  {
    you: 'What are our best sellers this month?',
    steps: [
      { tool: 'Shopify', action: 'units + revenue by product, both channels', result: 'polos lead on units, jerseys on revenue' },
      { say: 'By units it’s the team polos. By revenue it’s the custom jerseys. That’s D2C and wholesale blended together, which can flip the ranking.' },
    ],
    memory: {
      kind: 'question',
      text: 'When you ask for best sellers, do you want them ranked by units or by revenue, and D2C and wholesale combined or split?',
      why: 'The ranking changes with each choice, so Claude needs your default before it answers.',
    },
  },

  {
    you: 'Which wholesale accounts are slipping?',
    steps: [
      { tool: 'HubSpot', action: 'last activity by account', result: '8 accounts quiet 90+ days' },
      { tool: 'Shopify', action: 'last order date', result: 'matches the 8' },
      { say: 'Eight wholesale accounts haven’t ordered in over 90 days, including Lincoln High. But a 90-day gap means something different for a fall-sports team than a year-round league, so some of these may be perfectly fine.' },
    ],
    memory: {
      kind: 'question',
      text: 'What makes a wholesale account "at risk": how many days since its last order, and does that window change by sport season?',
      why: 'So Claude flags the accounts actually slipping instead of seasonal teams sitting in their off-season.',
    },
  },

  {
    you: 'How much cash is tied up in inventory right now?',
    steps: [
      { tool: 'Shopify', action: 'units on hand by SKU', result: '~1,200 SKUs' },
      { tool: 'QuickBooks', action: 'unit cost', result: 'valued at cost' },
      { say: 'About $86K at cost across 1,200 SKUs. Roughly a fifth of that is last season’s colors that are barely moving.' },
    ],
    memory: {
      kind: 'fact',
      text: 'Inventory cash is reported at landed cost: Shopify quantities valued against QuickBooks unit cost. Claude calls out slow movers as part of the number.',
    },
  },

  {
    you: 'Anything we should stop carrying?',
    steps: [
      { tool: 'Shopify', action: 'units sold, last 120 days', result: '3 styles at zero' },
      { say: 'Three styles haven’t sold a single unit in 120 days, tying up about $9K. Two are last year’s team colors, one is a summer tee that’s just out of season.' },
    ],
    memory: {
      kind: 'question',
      text: 'At what point is a product "dead stock" for you: no sales in 90 days, 120? And should Claude exclude seasonal items from that?',
      why: 'So Claude flags true dead stock and doesn’t call out seasonal gear during its off-season.',
    },
  },

  {
    you: 'Always base margin on landed cost, never the blank price.',
    steps: [
      { say: 'Got it. I’ll always use landed cost for margin from now on.' },
    ],
    memory: {
      kind: 'guardrail',
      text: 'Always calculate margin on landed cost (blank plus decoration plus freight), never the blank price alone.',
    },
  },

  {
    you: 'Where should I put this month’s reorder budget?',
    steps: [
      { say: 'Into the team polos and the Navy Varsity Hoodie. They sell through fastest, and once decoration and freight are in the cost they still carry your best margin. I’d hold off on last season’s colors, that’s the dead stock we flagged. Wholesale demand for these peaks next month with fall sports, so order now.' },
    ],
    memory: {
      kind: 'fact',
      text: 'Reorder priority is driven by sell-through rate and landed margin together, weighted toward the upcoming season, not by raw units sold.',
    },
  },
];
