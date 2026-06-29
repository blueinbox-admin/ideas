// config.js — Sportek International. A wholesale importer/distributor of spandex,
// technical, stretch, and PFP fabrics. Here Claude is a SALES assistant: a rep
// describes what a customer is making, Claude matches it to real fabrics by spec,
// checks stock, and drafts a quote. The memory learns the product knowledge and
// the sales conventions, so every rep quotes like a 20-year veteran.
// Seeded from sportek.com (real product lines + properties).
window.DEMO = {
  org: {
    name: 'Sportek International',
    product: 'Sales Memory',
    url: 'memory.sportek.com',
    tagline: 'What Claude reads before it quotes a fabric, so reps recommend the right one instead of guessing.',
  },
  connectors: [
    { label: 'Product catalog', mode: 'read-only' },
    { label: 'Stock & orders', mode: 'read-only' },
  ],
  agentSurface: 'embedded',          // a sales assistant built into the catalog/portal
  agentLabel: 'Claude',
  agentPanel: { title: 'Sportek', sub: '· Claude' },
  scopes: ['swimwear', 'activewear', 'uniforms', 'samples'],

  onboarding: [
    { which: 'cc', target: '.embed-chat', corner: 'bottom-right', text: 'This is your Sportek assistant. Tell it what a customer is making, ask it to match a fabric, check stock, or draft a quote, and it works straight from the catalog.' },
    { which: 'app', target: '.app-scroll', corner: 'top-left', text: 'This is your memory. As you work, it saves what Claude learns about how your business runs, so the AI can learn and work like an experienced employee, not a new hire.' },
  ],

  seed: {
    facts: [
      { type: 'fact', confidence: 'observed', scopes: ['org'], content: 'Sportek is a wholesale importer and distributor of spandex, technical, stretch, and PFP fabrics. Quotes are per-yard with minimum order quantities; retail by-the-yard buyers go to spandexbyyard.com, not the wholesale catalog.' },
      { type: 'mapping', confidence: 'observed', scopes: ['swimwear'], content: 'Chlorine-resistant swim fabric is the Chloratek line. F-70L Nylon-LYCRA Chlorine-Resist UPF50+ Tricot is the go-to for competitive and pool swimwear.' },
      { type: 'mapping', confidence: 'observed', scopes: ['uniforms'], content: 'The PFP (prepared-for-print) collection is the sublimation line, ~200 styles tuned for dye-sublimation and digital wet print with crisp, high-definition results.' },
      { type: 'mapping', confidence: 'inferred', scopes: ['uniforms'], content: 'Sublimation and all-over print jobs must use PFP styles. Nylon-heavy or solution-dyed fabrics will not hold a crisp print, so never quote them for a print job.' },
      { type: 'fact', confidence: 'observed', scopes: ['activewear'], content: 'Squat-proof compression for leggings comes from the heavier matte nylon-spandex tricots (FM-60/FM-65), not the lighter shiny F-56/F-78.' },
      { type: 'fact', confidence: 'observed', scopes: ['activewear'], content: 'The moisture-management line for sportswear is the 0620 high-performance mesh, the 750 Wicko Grid jersey, and the P-600 anti-microbial tricot — wicking and quick-dry.' },
      { type: 'fact', confidence: 'observed', scopes: ['org'], content: 'Eco-friendly recycled spandex is stocked for brands with sustainability requirements; lead with it when a customer mentions recycled content or a sustainability program.' },
      { type: 'fact', confidence: 'observed', scopes: ['org'], content: 'Fast-turnaround orders lead with stock-program fabrics (e.g. the Nylon Spandex Wet Print Stock Program). Custom sourcing goes through the Fabric Outsourcing Form and carries a longer lead time.' },
      // --- the human side: how the business actually sells, not just the specs ---
      { type: 'fact', confidence: 'inferred', scopes: ['samples'], content: 'Reps talk in the customer’s application (what they’re making), not SKU codes, and confirm hand-feel and color on a physical swatch before any bulk order — never from a screen.' },
      { type: 'fact', confidence: 'inferred', scopes: ['org'], content: 'Sportek sells on breadth, stock depth, and print capability, positioned as the largest North American importer of spandex and PFP fabric. Reps lead on the right fabric and fast availability, not on being the cheapest.' },
      { type: 'guardrail', scopes: ['org'], content: 'Never quote below a fabric’s minimum order quantity without a manager’s approval.' },
      { type: 'guardrail', scopes: ['org'], content: 'Never promise stock or a ship date without checking live inventory; availability changes daily.' },
      { type: 'guardrail', scopes: ['uniforms'], content: 'Never recommend a non-PFP fabric for a sublimation or all-over print job.' },
      { type: 'guardrail', scopes: ['org'], content: 'Never share wholesale pricing with a retail customer; route them to spandexbyyard.com.' },
    ],
    questions: [
      { scope: 'org', text: 'What is our minimum order quantity by fabric category, and when can a rep waive it for a strategic account?', rationale: 'MOQ and when to bend it is a commercial decision only your team can set, and it changes the quote.' },
      { scope: 'org', text: 'When two fabrics both meet a customer’s spec, do we lead with the higher margin, what’s in stock, or the premium line?', rationale: 'the tie-break between equally-fit fabrics is a sales-strategy call Claude should not make on its own.' },
      { scope: 'samples', text: 'Which customers get free swatches versus paid sample yardage, and who approves a custom or outsourced run?', rationale: 'sample policy and custom-run approval are account-tiering decisions only your team owns.' },
    ],
  },

  // Faked-but-plausible sales responder. Curated branches handle the money moments;
  // anything off-script falls through to the live LLM improviser.
  respond: function (text) {
    var t = text.toLowerCase();
    function scopeOf() {
      if (/swim|chlorine|pool|bikini|board ?short|competitive swim/.test(t)) return 'swimwear';
      if (/legging|yoga|compression|squat|activewear|athleisure|\brun\b|gym|jogger/.test(t)) return 'activewear';
      if (/uniform|team|jersey|sublimat|all.?over|graphic|dye/.test(t)) return 'uniforms';
      if (/swatch|sample|color card|hand.?feel/.test(t)) return 'samples';
      return 'org';
    }
    var scope = scopeOf(), lbl = scope === 'org' ? 'this request' : scope;
    // pricing / MOQ / terms -> a commercial call -> Review question
    if (/price|pricing|\bmoq\b|minimum|discount|\bdeal\b|terms|net ?30|credit|markup|margin/.test(t)) {
      return { reply: 'Pricing, minimums, and terms are a sales call, not mine to set, so I will not put a number on it. I have flagged it on Review for your team.', memory: { kind: 'question', scope: scope, text: 'What is our minimum order quantity by fabric category, and when can a rep waive it or discount?', why: 'Pricing and MOQ are commercial decisions only your team can own.' } };
    }
    // retail / by-the-yard -> guardrail, route out
    if (/retail|by the yard|one yard|single yard|spandexbyyard|home sewer|hobby/.test(t)) {
      return { reply: 'That is a retail, by-the-yard request, so I will route them to **spandexbyyard.com** rather than the wholesale catalog. Wholesale pricing stays internal.' };
    }
    // sublimation / print -> PFP
    if (/sublimat|all.?over|print|\bpfp\b|graphic|dye.?sub/.test(t)) {
      return { tool: { tool: 'Product catalog', action: 'filter · PFP sublimation styles', result: '~200 PFP styles' }, reply: 'For a sublimated print I will pull from the **PFP (prepared-for-print)** collection, since nylon-heavy or solution-dyed fabrics will not take the print cleanly. Saving that so quotes stay consistent.', memory: { kind: 'fact', soft: true, scope: scope === 'org' ? 'uniforms' : scope, text: 'Sublimation and all-over print jobs use PFP (prepared-for-print) styles; non-PFP fabrics will not hold a crisp print.' } };
    }
    // stock / availability / lead time
    if (/stock|inventory|in stock|availab|lead ?time|ship|how many colors|on hand|turnaround/.test(t)) {
      return { tool: { tool: 'Stock & orders', action: 'check live inventory · ' + scope, result: 'stock colors + lead time' }, reply: 'I will check live inventory before promising anything, since stock moves daily. For fast turnaround I lead with the stock-program fabrics; custom runs go through the Fabric Outsourcing Form with a longer lead time.', memory: { kind: 'fact', soft: true, scope: 'org', text: 'Lead with stock-program fabrics for fast turnaround; custom or outsourced sourcing goes through the Fabric Outsourcing Form and carries a longer lead time.' } };
    }
    // recommend / quote / match a fabric to an application
    if (/fabric|recommend|quote|\bfind\b|suggest|need|looking for|\bspec|which|what.*use|build|match/.test(t)) {
      return { tool: { tool: 'Product catalog', action: 'match spec · ' + scope, result: 'candidate fabrics by stretch, chlorine-resist, UPF, wicking, PFP' }, reply: 'I will match that to fabrics in the catalog by their real specs (stretch, chlorine-resist, UPF, wicking, PFP) and lead with what is in stock. Saving the recipe so the next rep quotes ' + lbl + ' the same way.', memory: { kind: 'fact', soft: true, scope: scope, text: 'For ' + lbl + ', match the customer’s application to fabric specs in the catalog and lead with in-stock styles.' } };
    }
    return null; // -> live LLM improviser
  },
};
