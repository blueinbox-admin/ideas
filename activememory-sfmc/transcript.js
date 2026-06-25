// transcript.js — the demo story. THIS is the only file you edit to change the demo.
//
// Vanta Motors marketing memory: a knowledge layer Claude Code reads BEFORE doing
// Salesforce Marketing Cloud (SFMC) work. The app only LEARNS and INFERS how the
// business runs. It never does work or proposes work.
//
// TWO THINGS THE APP DOES (keep them distinct):
//   1. SAVE facts. Claude asks its normal, immediate, blocking questions in the CHAT.
//      When the human answers (or Claude gleans it), the ANSWER is saved as a fact /
//      mapping / guardrail. The app never re-poses the chat question; it keeps the answer.
//   2. ASK higher-level questions (Review). Pattern / abstraction gaps the app spots
//      across the work that Claude would NOT interrupt a task to ask. Every one is
//      knowledge-seeking and resolves into a fact. NEVER action ("want me to build X?").
//
// Each turn:
//   you     the marketing-ops person's opening task (one line typed into Claude Code)
//   steps   ordered: { tool, action, result } | { say } Claude | { u } the human's reply in chat
//   memory  { kind, scope, text, why? }
//             kind:  fact/mapping/guardrail -> saved knowledge (from resolved chat Q&A or gleaned)
//                    question -> a higher-level LEARNING question, lands in Review
//             scope: a project key ('service-reminders','lease-end') or 'org' (Org-wide, inherited)
//
// Formatting: **bold** is the only markup. Curly apostrophe (’) inside words so single
// quotes don’t break. No em/en dashes. Timing is automatic.

window.TRANSCRIPT = [
  // 1) A real BUILD with a QUANTITATIVE result (Claude already has the data, runs the
  //    query, returns a count). The first turn surfaces ONE thing: a recipe FACT.
  {
    you: 'Build the Q3 lease-end audience and tell me how many owners qualify.',
    steps: [
      { tool: 'SFMC', action: 'query lease-end DE · Q3 maturities', result: '4,812 opted-in owners · 1,190 opened the last 3 sends' },
      { say: '**4,812 owners** qualify for the Q3 lease-end audience. I built it from the regional offer DE, filtered to your opted-in roster. **1,190** of those have opened your last three sends.' },
    ],
    memory: {
      kind: 'fact',
      scope: 'lease-end',
      text: 'The lease-end audience comes from the regional offer DE (keyed by dealer region), filtered to ENT.All_Owners_Opted_In and to leases maturing in the target quarter.',
    },
  },

  // 2) Claude INFERS a rule from the error (no human confirms it) -> a SOFT fact,
  //    saved as "assumed, fix if wrong." This is the inferred->soft path.
  {
    you: 'Reading the shared owner roster is throwing "Invalid object name."',
    steps: [
      { say: 'That is almost always a business-unit mismatch: shared **ENT.** data extensions have to be read with the **Parent BU** credentials, and the Marketing BU keys throw exactly this error. I will retry the read on the Parent BU. Since I am inferring this from the error rather than reading it from your setup, I have saved it as an assumption for you to correct if it is off.' },
    ],
    memory: {
      kind: 'mapping',
      scope: 'org',
      soft: true,
      text: 'Direct reads of shared ENT. data extensions use the Parent BU credentials. The Marketing BU keys error with "Invalid object name." Sends and local DEs use the Marketing BU.',
    },
  },

  // 3) Immediate chat Q&A -> a saved GUARDRAIL.
  {
    you: 'Activate TEST_lease-end_v3 so we can watch it run.',
    steps: [
      { say: 'That one is a **TEST_** build and still a Draft. I don’t activate real journeys, and TEST_ builds shouldn’t send at all. I’d preview it to a mailinator address with sending off instead. Should that be the rule?' },
      { u: 'Yes. Never activate the TEST_ ones, and never send to real owners while testing.' },
      { say: 'Noted as a rule. TEST_ journeys stay off; previews go to mailinator with sends off.' },
    ],
    memory: {
      kind: 'guardrail',
      scope: 'org',
      text: 'Never activate a journey whose name starts with TEST_, and never send to real owners while testing. Preview to mailinator with sends off; activating a real journey is a human decision.',
    },
  },

  // 4) The app's OWN question. Claude just does the task in chat; separately the
  //    memory notices a cross-campaign pattern and surfaces a LEARNING question in
  //    Review. Knowledge-seeking, never an action proposal.
  {
    you: 'Build the win-back audience: owners with no service or purchase in 12 months.',
    steps: [
      { tool: 'SFMC', action: 'build query · win-back', result: 'built from ENT.All_Owners_Opted_In, 12 months inactive' },
      { say: 'Done. Win-back audience is built from the opted-in roster, filtered to 12 months inactive.' },
    ],
    memory: {
      kind: 'question',
      scope: 'org',
      text: 'Is there a cap on how many emails one owner should get in a week across all campaigns (service, lease-end, win-back)?',
      why: 'I am now scheduling sends across several campaigns with no shared frequency limit, and the right cap is a policy only your team knows.',
    },
  },

  // 5) A FACT gleaned from the work (no question needed) — Claude reads the build
  //    notes and keeps the flow.
  {
    you: 'What’s the lease-end journey flow supposed to be?',
    steps: [
      { tool: 'SFMC', action: 'read build notes · lease-end', result: 'Email 1 (90d) -> Email 2 (45d) -> Email 3 (15d), Einstein STO' },
      { say: 'From the build notes it’s Email 1 at 90 days out, Email 2 at 45, Email 3 at 15, each timed by Einstein STO. I’ll keep that for the rebuild.' },
    ],
    memory: {
      kind: 'fact',
      scope: 'lease-end',
      text: 'The lease-end journey flow is Email 1 (90 days out) then Email 2 (45 days) then Email 3 (15 days), each timed by Einstein STO.',
    },
  },

  // 6) Payoff: Claude USES the saved facts to do it right, and keeps the result.
  {
    you: 'Now rebuild the lease-end production audience the right way.',
    steps: [
      { say: 'Using what we’ve saved: starting from **ENT.All_Owners_Opted_In** for consent, reading it with the **Parent BU** creds, filtering to leases 90 days from maturity, and pointing at the production DE, not a TEST_ or _Working copy. Want me to write the Query Activity?' },
    ],
    memory: {
      kind: 'fact',
      scope: 'lease-end',
      text: 'For a lease-end production audience: start from ENT.All_Owners_Opted_In (consent), read shared DEs with Parent BU credentials, filter to leases 90 days from maturity, and use the production DE, not a TEST_ or _Working copy.',
    },
  },
];
