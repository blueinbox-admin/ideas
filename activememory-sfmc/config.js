// config.js — THE demo definition. A demo is this file + transcript.js. Everything
// structural (the app UI, the tabs, the agent surface) comes from the shared engine
// and DEMO_DEFAULTS; here we declare only what is THIS lead's: identity, platforms,
// scopes, seed knowledge, onboarding copy, and the faked responder. Override a
// feature flag only where this demo deviates from the canonical app (see defaults.js).
window.DEMO = {
  org: {
    name: 'Vanta Motors',
    product: 'Marketing Memory',
    url: 'memory.vantamotors.com',
    tagline: 'What Claude reads before it touches Marketing Cloud, so your sends are right instead of guessed.',
  },
  connectors: [{ label: 'Salesforce Marketing Cloud', mode: 'read-only' }],
  agentSurface: 'desktop',
  agentLabel: 'Claude Code',
  desktopIcons: ['Audiences', 'Journeys', 'Blue Inbox'],
  claudeCode: { recents: ['Marketing ops', 'Service reminders', 'Lease-end journey'], crumb: 'Marketing ops' },
  scopes: ['new-owner-welcome', 'service-reminders', 'lease-end', 'win-back'],

  onboarding: [
    { which: 'cc', target: '.cc-win', corner: 'bottom-right', text: 'This is Claude Code. Ask it to do real Marketing Cloud work in plain English — build an audience, wire a journey, schedule a send. It works from what your team knows.' },
    { which: 'app', target: '.app-win', corner: 'top-left', text: 'This is your marketing memory. What Claude can know, it saves as a fact; what only your team can decide, it asks. Go ahead, play with it.' },
  ],

  seed: {
    facts: [
      { type: 'fact', confidence: 'observed', scopes: ['org'], content: 'Two business units: the Marketing BU runs sends, local DEs, and Query Activities; the Parent BU holds the shared ENT. data extensions and direct data reads.' },
      { type: 'mapping', confidence: 'observed', scopes: ['org'], content: 'Send and engagement row data lives only in the system data views (_Sent, _Open, _Click, _Bounce), queried in SQL, not in a regular Data Extension.' },
      { type: 'mapping', confidence: 'inferred', scopes: ['org'], content: 'Resolve a campaign to its model line (EV, truck, sedan) with the Campaign_Prefix_Model lookup DE.' },
      { type: 'fact', confidence: 'observed', scopes: ['new-owner-welcome'], content: 'The new-owner welcome is a 3-email journey that onboards buyers in their first 30 days, entered from the sales-delivered feed.' },
      { type: 'mapping', confidence: 'observed', scopes: ['service-reminders'], content: 'Service reminders join the owner roster to the service-due DE on VIN, not email, since one household can share an email.' },
      { type: 'fact', confidence: 'observed', scopes: ['lease-end'], content: 'Lease-end offers are regional: the offer DE is keyed by dealer region, so the audience must carry region to render the right incentive.' },
      // --- the human side: how the business thinks, not how the systems are wired ---
      { type: 'fact', confidence: 'inferred', scopes: ['org'], content: 'Owner emails use the owner’s first name and a warm, plain tone: always “your vehicle,” never “unit.” No countdown timers or “act now” urgency; the brand reads premium.' },
      { type: 'fact', confidence: 'observed', scopes: ['org'], content: 'Brand signs off on all creative before a send, and Legal must review any lease or finance-offer language. No send goes out without both.' },
      { type: 'fact', confidence: 'observed', scopes: ['org'], content: 'EV owners skew younger and respond to sustainability and tech angles; truck owners respond to towing, capability, and utility. Keep the two messaging tracks separate.' },
      { type: 'guardrail', scopes: ['org'], content: 'Never send to real owners while testing. Test to mailinator or test leads with sends off.' },
      { type: 'guardrail', scopes: ['org'], content: 'Never activate a journey or automation without a named human approving go-live.' },
      { type: 'guardrail', scopes: ['org'], content: 'Never query an audience without filtering to the opted-in roster (ENT.All_Owners_Opted_In).' },
      { type: 'guardrail', scopes: ['service-reminders'], content: 'Never send service reminders outside 8am to 8pm in the owner local time zone.' },
      { type: 'guardrail', scopes: ['win-back'], content: 'Never include an owner with an open complaint or a pending recall in a win-back promo.' },
    ],
    questions: [
      { scope: 'org', text: 'Is there one official definition of an opted-in, emailable owner, or does it genuinely differ by campaign?', rationale: 'each campaign rebuilds the audience its own way, and the canonical definition is something only your team knows.' },
      { scope: 'org', text: 'When an owner qualifies for more than one re-engagement campaign at once (win-back, lapsed), which one takes priority?', rationale: 'win-back and re-engagement overlap on the same owners, and the tiebreak is a business call Claude cannot infer.' },
      { scope: 'new-owner-welcome', text: 'If a sale falls through or a car is returned after the welcome journey starts, how should that owner come out of it, and how does the journey find out?', rationale: 'the welcome enters from the sales feed, but how a reversed sale flows back out is a business process only your team knows.' },
    ],
  },

  // the faked-but-plausible responder for free typing — platform logic lives with
  // the platform. Return { reply, tool?, memory? }; null lets the engine fall back.
  respond: function (text) {
    var t = text.toLowerCase();
    function scopeOf() {
      if (/lease|maturity/.test(t)) return 'lease-end';
      if (/win.?back|lapsed|dormant|re.?engage|inactive/.test(t)) return 'win-back';
      if (/service|reminder|recall|maintenance|oil|tire/.test(t)) return 'service-reminders';
      if (/welcome|new owner|new buyer|onboard|delivery/.test(t)) return 'new-owner-welcome';
      return 'org';
    }
    var scope = scopeOf(), lbl = scope === 'org' ? 'this campaign' : scope;
    if (/activate|go.?live|\bpublish\b|turn on|push.*live/.test(t)) {
      if (/test_|\btest\b/.test(t)) return { reply: 'I will not activate that. **TEST_** builds never send, and no journey goes live without a named human approving it. I can run a preview to a mailinator address with sends off so you can see it safely.' };
      return { reply: 'Going live is a human decision, not mine, so I will not flip that on from here. I have put the go-live owner on Review.', memory: { kind: 'question', scope: scope, text: 'Who signs off on go-live for ' + lbl + ', and what has to be true first?', why: 'Activating a real send is a call only your team can own.' } };
    }
    if (/who |approve|sign.?off|owner|consent|opt.?out|opt.?in|unsubscrib|should we|priorit|decide|allowed/.test(t)) {
      return { reply: 'That is a call only your team can own, so I will not guess at it. I have added it to Review for you to answer.', memory: { kind: 'question', scope: scope, text: text.trim().replace(/[.?!]+$/, '') + '?', why: 'Only your team can own this one.' } };
    }
    if (/mailinator|preview|test send/.test(t)) return { reply: 'I will send that as a preview to a mailinator address with sends off, never to real owners. That follows your testing guardrail.' };
    if (/schedule|blast|deploy|\bsend\b|sending|when should/.test(t)) {
      return { reply: 'Before I schedule for ' + lbl + ', I need your send window. I do not have quiet hours or a weekly frequency cap saved for it, so I have flagged it on Review.', memory: { kind: 'question', scope: scope, text: 'What are the send-window and frequency rules for ' + lbl + ' (quiet hours, weekly cap per owner)?', why: 'Send timing is your policy, not something Claude can infer.' } };
    }
    if (/audience|segment|build|query|list|pull|data extension|\bde\b|who gets|recipients/.test(t)) {
      return { tool: { tool: 'SFMC', action: 'build query · ' + scope, result: 'audience from ENT.All_Owners_Opted_In' }, reply: 'I will build the audience for ' + lbl + ' from **ENT.All_Owners_Opted_In** (your Org-wide opt-in rule) and point at the production data extension, not a TEST_ copy. Saving the recipe so it stays consistent.', memory: { kind: 'fact', soft: true, scope: scope, text: 'The audience for ' + lbl + ' starts from ENT.All_Owners_Opted_In, filtered to its own criteria.' } };
    }
    if (/report|metric|open rate|click|bounce|stats|performance|results|analytic/.test(t)) {
      return { tool: { tool: 'SFMC', action: 'query data views · ' + scope, result: '_Open / _Click / _Bounce rates' }, reply: 'Pulling the results for ' + lbl + ' from the system data views (_Open, _Click, _Bounce) in SQL, where engagement data lives. Saving where these numbers come from.', memory: { kind: 'fact', scope: 'org', text: 'Campaign analytics (opens, clicks, bounces) come from the SFMC system data views (_Open, _Click, _Bounce) queried in SQL, not a regular data extension.' } };
    }
    return null;
  },
};
