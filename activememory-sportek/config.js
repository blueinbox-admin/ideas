// config.js — Sportek International. A SALES-CALL assistant for a wholesale
// importer/distributor of spandex, technical, stretch, and PFP fabrics. On a
// call, a rep describes what the customer is making in plain language ("printed
// polo, four-way stretch, mid weight") and Claude pulls the right fabrics from
// the Shopify catalog, with what's in stock and links to send the customer.
// The memory learns the product knowledge and the sales conventions, so every
// rep sells like a 20-year veteran. Seeded from sportek.com (real product lines).
window.DEMO = {
  org: {
    name: 'Sportek International',
    product: 'Sales Memory',
    url: 'memory.sportek.com',
    tagline: 'What Claude reads before it quotes a fabric, so reps on a call recommend the right one instead of guessing.',
  },
  connectors: [
    { label: 'Shopify', mode: 'read-only' },   // the product catalog + stock
  ],
  agentSurface: 'embedded',          // a sales assistant built into the catalog/portal
  agentLabel: 'Claude',
  agentPanel: { title: 'Sportek', sub: '· Claude' },
  scopes: ['swimwear', 'activewear', 'teamwear', 'dancewear'],

  onboarding: [
    { which: 'cc', target: '.embed-chat', corner: 'bottom-right', text: 'A sales rep can ask questions in real time during a call, "what moisture-wicking knit do you have for team jerseys this week?", and the assistant pulls the right fabrics from your Shopify catalog, with what is in stock and links to send over.' },
    { which: 'app', target: '.app-scroll', corner: 'top-left', text: 'This is your memory. As you work, it saves what Claude learns about how your business runs, so the AI can learn and work like an experienced employee, not a new hire.' },
  ],

  seed: {
    facts: [
      { type: 'fact', confidence: 'observed', scopes: ['org'], content: 'Sportek is a wholesale importer and distributor of spandex, technical, stretch, and PFP fabrics. Quotes are per-yard with minimum order quantities; retail by-the-yard buyers go to spandexbyyard.com, not the wholesale catalog.' },
      { type: 'mapping', confidence: 'observed', scopes: ['swimwear'], content: 'Chlorine-resistant swim fabric is the Chloratek line. F-70L Nylon-LYCRA Chlorine-Resist UPF50+ Tricot is the go-to for competitive and pool swimwear.' },
      { type: 'mapping', confidence: 'observed', scopes: ['teamwear'], content: 'The PFP (prepared-for-print) collection is the sublimation line, ~200 styles tuned for dye-sublimation and digital wet print with crisp, high-definition results.' },
      { type: 'mapping', confidence: 'inferred', scopes: ['teamwear'], content: 'Sublimation and all-over print jobs must use PFP styles. Nylon-heavy or solution-dyed fabrics will not hold a crisp print, so never quote them for a print job.' },
      { type: 'fact', confidence: 'observed', scopes: ['activewear'], content: 'Squat-proof compression for leggings comes from the heavier matte nylon-spandex tricots (FM-60/FM-65), not the lighter shiny F-56/F-78.' },
      { type: 'fact', confidence: 'observed', scopes: ['activewear'], content: 'The moisture-management line for sportswear is the 0620 high-performance mesh, the 750 Wicko Grid jersey, and the P-600 anti-microbial tricot — wicking and quick-dry.' },
      { type: 'fact', confidence: 'observed', scopes: ['dancewear'], content: 'Metallic and foil spandex is the dancewear and performance-costume line, for high-shine recital and stage pieces.' },
      { type: 'fact', confidence: 'observed', scopes: ['org'], content: 'Eco-friendly recycled spandex is stocked for brands with sustainability requirements; lead with it when a customer mentions recycled content or a sustainability program.' },
      { type: 'fact', confidence: 'observed', scopes: ['org'], content: 'Most lines are imported. Flag any made-in-USA or domestic-content requirement early in the call, since it narrows the options sharply.' },
      { type: 'fact', confidence: 'observed', scopes: ['org'], content: 'Fast-turnaround orders lead with stock-program fabrics (e.g. the Nylon Spandex Wet Print Stock Program). Custom sourcing goes through the Fabric Outsourcing Form and carries a longer lead time.' },
      // --- the human side: how reps actually sell, not just the specs ---
      { type: 'fact', confidence: 'inferred', scopes: ['org'], content: 'Reps talk in the customer’s application (what they’re making), not SKU codes, and confirm hand-feel and color on a physical swatch before any bulk order — never from a screen.' },
      { type: 'fact', confidence: 'inferred', scopes: ['org'], content: 'Sportek sells on breadth, stock depth, and print capability, as the largest North American importer of spandex and PFP fabric. Reps lead on the right fabric and fast availability, not on being the cheapest.' },
      { type: 'guardrail', scopes: ['org'], content: 'Never quote below a fabric’s minimum order quantity without a manager’s approval.' },
      { type: 'guardrail', scopes: ['org'], content: 'Never promise stock or a ship date without checking live inventory; availability changes daily.' },
      { type: 'guardrail', scopes: ['teamwear'], content: 'Never recommend a non-PFP fabric for a sublimation or all-over print job.' },
      { type: 'guardrail', scopes: ['org'], content: 'Never share wholesale pricing with a retail customer; route them to spandexbyyard.com.' },
    ],
    questions: [
      { scope: 'org', text: 'What is our minimum order quantity by fabric category, and when can a rep waive it for a strategic account?', rationale: 'MOQ and when to bend it is a commercial call only your team can set, and it changes the quote on the spot.' },
      { scope: 'org', text: 'When two fabrics both meet a customer’s spec, do we lead with the higher margin, what’s in stock, or the premium line?', rationale: 'the tie-break between equally-fit fabrics is a sales-strategy call Claude should not make on its own.' },
      { scope: 'org', text: 'Which customers get free swatches versus paid sample yardage, and who approves a custom or outsourced run?', rationale: 'sample policy and custom-run approval are account-tiering decisions only your team owns.' },
    ],
  },

  // Faked-but-plausible sales responder. Curated branches handle the money moments;
  // anything off-script falls through to the live LLM improviser.
  respond: function (text) {
    var t = text.toLowerCase();
    function scopeOf() {
      if (/swim|chlorine|pool|bikini|board ?short|competitive swim/.test(t)) return 'swimwear';
      if (/legging|yoga|compression|squat|activewear|athleisure|\brun\b|gym|jogger|sports ?bra/.test(t)) return 'activewear';
      if (/polo|jersey|uniform|team|sublimat|all.?over|\bprint|\btee\b|t.?shirt|graphic|dye/.test(t)) return 'teamwear';
      if (/dance|costume|metallic|foil|leotard|recital|stage/.test(t)) return 'dancewear';
      return 'org';
    }
    var scope = scopeOf(), lbl = scope === 'org' ? 'this customer' : scope;
    // pull a style code out of the message so a quote names the right fabric
    var sku = (text.match(/\b([A-Z]{1,3}-?\d{2,4})\b/i) || [])[1];
    var skuLabel = sku ? sku.toUpperCase() : 'That style';
    // discounts / waiving the minimum / terms -> Claude still does the work (quotes
    // the standard) but going below it is the team's call -> also a Review question.
    if (/discount|\bdeal\b|terms|net ?30|credit|markup|margin|waive|go lower|below (cost|that|the)|beat (the|their|that)/.test(t)) {
      return { tool: { tool: 'Shopify', action: 'look up wholesale price · ' + scope, result: skuLabel + ' · $4.20/yd · 50yd min' }, reply: skuLabel + ' is **$4.20/yard** at the standard wholesale tier with a 50-yard minimum. Whether we can discount that or waive the minimum is a sales call, so I have flagged it on Review for your team to set.', memory: { kind: 'question', scope: 'org', text: 'When can a rep discount below standard wholesale or waive the minimum order quantity, and by how much?', why: 'Discounting and waiving minimums are commercial decisions only your team can own.' } };
    }
    // a straight price / cost / quote -> look it up in the catalog and answer
    if (/price|pricing|cost|how much|\bquote\b|per.?yard|\brate\b|\bmoq\b|minimum/.test(t)) {
      return { tool: { tool: 'Shopify', action: 'look up wholesale price · ' + scope, result: skuLabel + ' · $4.20/yd, $3.65 at 500yd · 50yd min' }, reply: skuLabel + ' runs **$4.20/yard** at the base wholesale tier (50-yard minimum), dropping to **$3.65/yard** at the 500-yard break. I pulled that from the catalog. Want me to draft a formal quote?', memory: { kind: 'fact', soft: true, scope: 'org', text: 'Wholesale per-yard pricing, minimums, and tier breaks live in the Shopify catalog and can be quoted directly from it.' } };
    }
    // retail / by-the-yard -> guardrail, route out
    if (/retail|by the yard|one yard|single yard|spandexbyyard|home sewer|hobby/.test(t)) {
      return { reply: 'That is a retail, by-the-yard request, so I will route them to **spandexbyyard.com** rather than the wholesale catalog. Wholesale pricing stays internal.' };
    }
    // sublimation / print -> PFP
    if (/sublimat|all.?over|\bprint|\bpfp\b|graphic|dye.?sub/.test(t)) {
      return { tool: { tool: 'Shopify', action: 'filter · PFP print-ready styles', result: '~200 PFP styles' }, reply: 'For a printed piece I will pull from the **PFP (prepared-for-print)** styles, since nylon-heavy or solution-dyed fabrics will not take the print cleanly. I can send the customer the matching swatches and links. Saving that so quotes stay consistent.', memory: { kind: 'fact', soft: true, scope: scope === 'org' ? 'teamwear' : scope, text: 'Sublimation and all-over print jobs use PFP (prepared-for-print) styles; non-PFP fabrics will not hold a crisp print.' } };
    }
    // stock / availability / lead time
    if (/stock|inventory|in stock|availab|lead ?time|ship|how many colors|on hand|turnaround|color/.test(t)) {
      return { tool: { tool: 'Shopify', action: 'check live stock · ' + scope, result: 'in-stock colors + lead time' }, reply: 'I will check live stock before promising anything, since it moves daily. For fast turnaround I lead with the stock-program fabrics; custom runs go through the Fabric Outsourcing Form with a longer lead time.', memory: { kind: 'fact', soft: true, scope: 'org', text: 'Lead with stock-program fabrics for fast turnaround; custom or outsourced sourcing goes through the Fabric Outsourcing Form and carries a longer lead time.' } };
    }
    // recommend / match a fabric to what the customer is making
    if (/fabric|recommend|quote|\bfind\b|suggest|need|looking for|\bspec|which|what.*(use|make|making)|build|match|four.?way|4.?way|stretch|weight|wick|moisture|\bupf\b/.test(t)) {
      return { tool: { tool: 'Shopify', action: 'match · ' + scope, result: 'fabrics by stretch, weight, finish, print, stock' }, reply: 'I will match that to fabrics in the catalog by their real specs (stretch, weight, finish, chlorine-resist, UPF, PFP) and lead with what is in stock, with links you can send the customer. Saving the pick so the next rep quotes ' + lbl + ' the same way.', memory: { kind: 'fact', soft: true, scope: scope, text: 'For ' + lbl + ', match the customer’s application and specs to catalog fabrics and lead with in-stock, print-ready styles.' } };
    }
    return null; // -> live LLM improviser
  },
};
