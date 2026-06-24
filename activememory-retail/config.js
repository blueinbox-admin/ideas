// config.js — a SECOND lead, built as nothing but data + one feature choice.
// Same shared engine as the SFMC demo; the only structural difference is
// agentSurface: 'embedded' (the agent as an in-product chat, not a separate app).
// Everything else — the tabs, pills, soft facts, multi-scope chips — is inherited.
window.DEMO = {
  org: {
    name: 'Maple & Pine',
    product: 'Ops Memory',
    url: 'memory.mapleandpine.com',
    tagline: 'What Claude reads before it touches your store or your books, so the numbers and the sends are right.',
  },
  connectors: [
    { label: 'Shopify', mode: 'read-only' },
    { label: 'QuickBooks', mode: 'read-only' },
  ],
  agentSurface: 'embedded',          // <-- the ONLY structural deviation
  agentLabel: 'Claude',
  agentPanel: { title: 'Build', sub: '· Claude' },
  scopes: ['welcome-series', 'abandoned-cart', 'win-back', 'vip-loyalty'],

  onboarding: [
    { which: 'cc', target: '.embed-chat', corner: 'bottom-right', text: 'Claude lives right in your ops app. Ask it to build an audience, run a send, or reconcile the books, and it works from what your team knows about your store and your accounting.' },
    { which: 'app', target: '.app-scroll', corner: 'top-left', text: 'This is your ops memory. What Claude can know it saves as a fact; what only your team can decide it leaves as a question. Filed by campaign, or Org-wide.' },
  ],

  seed: {
    facts: [
      { type: 'fact', confidence: 'observed', scopes: ['org'], content: 'Two systems: Shopify holds customers, orders, and the catalog; QuickBooks holds the books. Orders sync Shopify to QuickBooks nightly as sales receipts.' },
      { type: 'mapping', confidence: 'observed', scopes: ['org'], content: 'A customer’s lifetime value comes from Shopify order history, not QuickBooks. QuickBooks only sees the daily sales-receipt total.' },
      { type: 'mapping', confidence: 'inferred', scopes: ['org'], content: 'Refunds appear in QuickBooks as a credit memo tied to the original sales receipt; match them to the Shopify order by order number.' },
      { type: 'fact', confidence: 'observed', scopes: ['welcome-series'], content: 'The welcome series is a 3-email flow triggered on a customer’s first order, with a 10% second-purchase code in email 2.' },
      { type: 'mapping', confidence: 'observed', scopes: ['abandoned-cart'], content: 'The abandoned-cart audience is Shopify checkouts with no matching paid order within 24 hours.' },
      { type: 'fact', confidence: 'observed', scopes: ['vip-loyalty'], content: 'VIP is any customer with 3 or more orders or $300+ lifetime spend, pulled from Shopify order history.' },
      { type: 'guardrail', scopes: ['org'], content: 'Never email a customer whose Shopify marketing consent is false, or who has requested deletion.' },
      { type: 'guardrail', scopes: ['org'], content: 'Never reconcile or change anything in QuickBooks without a human approving the period close.' },
      { type: 'guardrail', scopes: ['abandoned-cart'], content: 'Never send an abandoned-cart email to a customer who already completed the purchase.' },
      { type: 'guardrail', scopes: ['win-back'], content: 'Never offer a win-back discount deeper than 15% without sign-off.' },
    ],
    questions: [
      { scope: 'win-back', text: 'What counts as a lapsed customer for win-back, months since last order, or a drop in order frequency?', rationale: 'the line between active and lapsed is a business call only your team can set.' },
      { scope: 'org', text: 'When Shopify and QuickBooks disagree on a day’s total, which is the source of truth for reporting?', rationale: 'the two systems can drift, and which one wins is a decision Claude must not make on its own.' },
      { scope: 'vip-loyalty', text: 'What perks define the VIP tier, and who approves comping an order for a VIP?', rationale: 'comps and perks are money decisions only your team can own.' },
    ],
  },

  respond: function (text) {
    var t = text.toLowerCase();
    function scopeOf() {
      if (/win.?back|lapsed|dormant|inactive|come back/.test(t)) return 'win-back';
      if (/cart|checkout|abandon/.test(t)) return 'abandoned-cart';
      if (/vip|loyal|reward|top customer/.test(t)) return 'vip-loyalty';
      if (/welcome|first order|new customer|onboard/.test(t)) return 'welcome-series';
      return 'org';
    }
    var scope = scopeOf(), lbl = scope === 'org' ? 'this campaign' : scope;
    if (/reconcile|books|quickbooks|close the|period close|journal entry|ledger/.test(t)) {
      return { reply: 'I can prep that, but I will not close or change the books from here. A period close needs a human to approve it, so I have left it for you to confirm.', memory: { kind: 'question', scope: 'org', text: 'Who approves the QuickBooks period close, and what has to reconcile first?', why: 'Closing the books is a money decision only your team can own.' } };
    }
    if (/discount|promo|offer|coupon|comp |markdown/.test(t)) {
      return { reply: 'I will not set a discount on my own, since the depth and the approval are your team’s call. I have put it on Review.', memory: { kind: 'question', scope: scope, text: 'What discount depth is allowed for ' + lbl + ', and who signs it off?', why: 'Incentive size is a business decision, not something Claude can infer.' } };
    }
    if (/unsubscrib|consent|opt.?out|deletion|gdpr/.test(t)) {
      return { reply: 'Anyone with marketing consent off, or a deletion request, is excluded automatically. That follows your consent guardrail, so they will never receive a send.' };
    }
    if (/who |approve|sign.?off|should we|priorit|decide|source of truth/.test(t)) {
      return { reply: 'That is a call only your team can own, so I will not guess at it. I have added it to Review for you to answer.', memory: { kind: 'question', scope: scope, text: text.trim().replace(/[.?!]+$/, '') + '?', why: 'Only your team can own this one.' } };
    }
    if (/audience|segment|build|list|pull|who gets|recipients|cart|customers/.test(t)) {
      return { tool: { tool: 'Shopify', action: 'build segment · ' + scope, result: 'customers from order history' }, reply: 'I will build the ' + lbl + ' audience from **Shopify order history** and drop anyone whose marketing consent is off. Saving the recipe so it stays consistent.', memory: { kind: 'fact', soft: true, scope: scope, text: 'The ' + lbl + ' audience is built from Shopify order history, excluding customers with marketing consent off.' } };
    }
    if (/report|metric|revenue|sales|ltv|stats|performance|results/.test(t)) {
      return { reply: 'Revenue and LTV come from Shopify order history; QuickBooks only has the daily sales-receipt total. I will pull the ' + lbl + ' numbers from Shopify so they reconcile.' };
    }
    return null;
  },
};
