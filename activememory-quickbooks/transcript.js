// transcript.js — the demo story. THIS is the only file you edit to change the demo.
//
// Each turn has three parts:
//   you     what the user types into Claude Code (one line of plain text)
//   steps   what Claude does, in order. Each step is either:
//             { say: "..." }                      Claude's reply (plain text)
//             { tool: "QuickBooks", action: "...", result: "..." }   a tool line
//             { tool: "QuickBooks", action: "record deposit", lines: [
//                 "+ Sales Income      $5,000.00",   // "+" renders green
//                 "- Merchant Fees      $180.00",    // "-" renders red
//                 "= Net to checking  $4,820.00",    // anything else is plain
//             ]}
//   memory  the one thing Active Memory keeps from this turn:
//             { kind: "question", text: "...", why: "..." }   -> Review tab
//             { kind: "fact",     text: "..." }               -> Facts tab
//             { kind: "mapping",  text: "..." }               -> Facts tab (mapping pill)
//             { kind: "guardrail",text: "..." }               -> Guardrails tab
//
// Formatting: wrap **like this** for bold. That's the only markup. Everything else
// is literal, so dollar signs, asterisks in vendor names, etc. are all safe.
// Timing is automatic (longer text holds longer); you never set it here.

window.TRANSCRIPT = [
  {
    you: 'Categorize this month’s bank transactions in QuickBooks.',
    steps: [
      { tool: 'QuickBooks', action: 'categorize April transactions', result: '38 of 42 categorized, 4 unmatched' },
      { say: 'Categorized 38 of 42. Four are recurring charges I have no rule for: **SQ *BLUE BOTTLE**, **GUSTO**, **AWS**, and **MAILCHIMP**.' },
    ],
    memory: {
      kind: 'question',
      text: 'These four recurring charges have no category: SQ *BLUE BOTTLE, GUSTO, AWS, MAILCHIMP. Which account does each map to? Claude will categorize them automatically from next month on.',
      why: 'Bank-feed labels are cryptic, and only you know what they actually are.',
    },
  },

  {
    you: 'Record the Stripe deposits in QuickBooks.',
    steps: [
      { tool: 'QuickBooks', action: 'scan bank feed', result: '4 Stripe payouts found, each net of fees' },
      { say: 'There are four Stripe payouts in the feed, $4,820 this week and three earlier. Each is net, Stripe’s fees are already taken out, so gross sales and fees are bundled into one number.' },
    ],
    memory: {
      kind: 'question',
      text: 'A Stripe payout lands net of fees, so booking the $4,820 as a single deposit understates revenue and costs. Should Claude split each payout into gross sales and Stripe fees, and which accounts do those map to?',
      why: 'A lump deposit hides real revenue, hides the fee expense, and throws off sales tax, which is owed on the gross.',
    },
  },

  {
    you: 'Split them. Gross to Sales Income, fees to Merchant Fees. Same for Shopify.',
    steps: [
      { tool: 'QuickBooks', action: 'record deposit', lines: [
        '+ Sales Income      $5,000.00',
        '- Merchant Fees      $180.00',
        '= Net to checking  $4,820.00',
      ] },
      { say: 'Done. This week’s payout booked as $5,000 to **Sales Income** and $180 to **Merchant Fees**, netting to the $4,820 deposit.' },
    ],
    memory: {
      kind: 'mapping',
      text: 'Stripe and Shopify payouts split: gross to Sales Income, processor fees to Merchant Fees. Claude books every future payout this way.',
    },
  },

  {
    you: 'Tag everything by location in QuickBooks. We run two shops.',
    steps: [
      { tool: 'QuickBooks', action: 'apply Class to transactions', result: '2 classes: Downtown, Eastside' },
      { say: 'Set the Class on each transaction. You have two: **Downtown** and **Eastside**.' },
    ],
    memory: {
      kind: 'fact',
      text: 'Two locations are tracked as Classes: Downtown and Eastside. Every transaction is assigned one.',
    },
  },

  {
    you: 'Create an invoice in QuickBooks for Acme for the March catering job.',
    steps: [
      { tool: 'QuickBooks', action: 'look up customer "Acme"', result: '2 matches: Acme, Acme Corp' },
      { say: 'Heads up, there are two similar customers on file: **Acme** and **Acme Corp**.' },
    ],
    memory: {
      kind: 'question',
      text: '"Acme" and "Acme Corp" both exist as customers. Are these one account Claude should bill under a single record, or two separate entities?',
      why: 'Duplicate customers split invoice history and AR, so statements and aging come out wrong.',
    },
  },

  {
    you: 'Book the payroll in QuickBooks.',
    steps: [
      { tool: 'QuickBooks', action: 'import Gusto withdrawal', result: 'one lump entry, $9,400.00' },
      { say: 'Gusto posted payroll as one $9,400 bank withdrawal. Right now it’s all hitting a single account.' },
    ],
    memory: {
      kind: 'question',
      text: 'The Gusto withdrawal is one number, but it covers wages, payroll taxes, and benefits. Which accounts should Claude split it across, and how should it map to each location?',
      why: 'A lump payroll entry breaks tax reporting and hides true labor cost per shop.',
    },
  },

  {
    you: 'Don’t touch anything before April. The books are closed through Q1.',
    steps: [
      { say: 'Understood. I’ll leave January through March alone and only work April forward.' },
    ],
    memory: {
      kind: 'guardrail',
      text: 'Never edit or recategorize transactions in a closed period. Books are closed through March 31; only touch April onward.',
    },
  },

  {
    you: 'Record next week’s Stripe payout in QuickBooks.',
    steps: [
      { tool: 'QuickBooks', action: 'record deposit', lines: [
        '+ Sales Income      $5,310.00',
        '- Merchant Fees      $190.00',
        '- Refunds            $60.00',
        '= Net to checking  $5,060.00',
      ] },
      { say: 'Done. Split into $5,310 Sales Income and $190 Merchant Fees, tagged to location. One new thing: this payout had a $60 customer refund netted into it.' },
    ],
    memory: {
      kind: 'question',
      text: 'This payout included a $60 refund netted against sales. Which account should refunds map to: a contra-revenue Refunds account, or straight against Sales Income?',
      why: 'Refunds buried in the gross overstate both your sales and the tax owed.',
    },
  },

  {
    you: 'How did the two shops do last month?',
    steps: [
      { say: 'Pulling April, since Q1 is closed. Gross sales are within about 5% between the shops. Net, Eastside is lower, but that’s mostly higher merchant fees, it runs more card volume, and now that fees are split by location you can see it. It’s a fee story, not a sales story.' },
    ],
    memory: {
      kind: 'fact',
      text: 'The owner reviews the shops monthly on net margin by location, fees and overhead included, not gross sales. Claude frames performance reports that way.',
    },
  },
];
