// transcript.js — the demo story. THIS is the only file you edit to change the demo.
//
// Vanta Motors marketing memory: a knowledge layer Claude Code reads BEFORE doing
// Salesforce Marketing Cloud (SFMC) work for the org. The marketing ops team asks
// Claude to build audiences, wire journeys, and schedule sends. Claude answers from
// what it knows about the org; gaps become questions; new knowledge is saved.
//
// THE SFMC DIFFERENCE: every saved fact is labelled into a PROJECT (a campaign /
// journey) or marked Org-wide. Org-wide facts are inherited by every project.
//
// Each turn:
//   you     what a marketing-ops person types into Claude Code (one line)
//   steps   { say: "..." }  Claude's reply, or { tool: "SFMC", action: "...", result: "..." }
//   memory  { kind: "question"|"fact"|"mapping"|"guardrail", scope, text, why? }
//             kind:  question -> Review, fact/mapping -> Facts, guardrail -> Guardrails
//             scope: a project key ('service-reminders', 'lease-end') or 'org' (Org-wide)
//
// Formatting: **bold** is the only markup. Use a curly apostrophe (’) inside words so the
// single-quoted strings don’t break. No em/en dashes. Timing is automatic.

window.TRANSCRIPT = [
  {
    you: 'Build the audience query for the 90-day service reminder send.',
    steps: [
      { tool: 'SFMC', action: 'list data extensions · service-reminders', result: 'Service_Due_90d, TEST_Service_Due_90d, Service_Due_Working' },
      { say: 'I see three lookalike data extensions for this: **Service_Due_90d**, a TEST_ copy, and a _Working table. I don’t have it flagged which one is the real production audience versus a QA twin, and querying off the wrong one would email the wrong owners. Which DE is the source of truth here?' },
    ],
    memory: {
      kind: 'question',
      scope: 'service-reminders',
      text: 'Which Data Extension is the real production audience for service reminders versus a TEST_ or _Working QA copy?',
      why: 'Several lookalike DEs exist, and querying off a QA twin would reach the wrong owners.',
    },
  },

  {
    you: 'Who are we even allowed to email across these campaigns?',
    steps: [
      { say: 'Org-wide, the opted-in roster is the source of truth for who can be emailed, and in a Query Activity it has to be referenced with the **ENT.** prefix since it’s a shared Parent BU data extension. I’ll always start audiences from that roster so we never email a non-consented owner.' },
    ],
    memory: {
      kind: 'mapping',
      scope: 'org',
      text: 'All_Owners_Opted_In is the org source of truth for who can be emailed (opt-in only). Reference it as ENT.All_Owners_Opted_In in Query Activities.',
    },
  },

  {
    you: 'Set up the lease-end journey to enter owners 90 days before maturity.',
    steps: [
      { tool: 'SFMC', action: 'find journey · lease-end', result: 'TEST_lease-end_v3 (Draft)' },
      { say: 'The only lease-end journey I can find is **TEST_lease-end_v3**, and it’s a Draft. Before I wire an entry source I need to know who owns and signs off on go-live for this journey, because activating a real send is a human decision, not mine.' },
    ],
    memory: {
      kind: 'question',
      scope: 'lease-end',
      text: 'For lease-end, who builds and approves the journey go-live, and what must be true before it can be activated?',
      why: 'Activating a real send is a human sign-off, and Claude must never flip a journey live on its own.',
    },
  },

  {
    you: 'What’s the lease-end journey flow supposed to be?',
    steps: [
      { say: 'Per the build notes it’s Email 1 at 90 days out, then Email 2 at 45 days, then Email 3 at 15 days, each timed by Einstein STO. I’ll save the flow so it stays consistent if we rebuild it.' },
    ],
    memory: {
      kind: 'fact',
      scope: 'lease-end',
      text: 'The lease-end journey flow is Email 1 (90 days out) then Email 2 (45 days) then Email 3 (15 days), each timed by Einstein STO.',
    },
  },

  {
    you: 'Reading the shared owner roster is throwing "Invalid object name."',
    steps: [
      { say: 'That’s a business-unit mismatch. Direct SOAP reads of the shared **ENT.** data extensions need the **Parent BU** credentials; the Marketing BU keys error with "Invalid object name." For everyday sends and local DEs you stay on the Marketing BU. I’ll map which credentials go with which read.' },
    ],
    memory: {
      kind: 'mapping',
      scope: 'org',
      text: 'Direct SOAP/API reads of shared ENT. data extensions use the Parent BU credentials. Marketing BU credentials error "Invalid object name." Everyday sends and local DEs use the Marketing BU.',
    },
  },

  {
    you: 'Anything I should know before I schedule the service reminder blast?',
    steps: [
      { say: 'One gap before I schedule: I don’t have your suppression and send-window rules for service reminders, like quiet hours or owners with an open service case we should skip. Are there times or segments we must never send to?' },
    ],
    memory: {
      kind: 'question',
      scope: 'service-reminders',
      text: 'For service reminders, what are the suppression and send-window rules: quiet hours, and any segment (e.g. owners with an open service case) we must never send to?',
      why: 'Send-window and suppression rules are org knowledge Claude cannot infer, and getting them wrong means messaging the wrong owners at the wrong time.',
    },
  },

  {
    you: 'Go ahead and activate TEST_lease-end_v3 so we can watch it run.',
    steps: [
      { say: 'I won’t activate that one. Anything with a **TEST_** prefix is a throwaway build and must never send, and I never activate a real journey without a human doing it. I can run it as a test send to a mailinator address with sending off so you can preview it safely instead.' },
    ],
    memory: {
      kind: 'guardrail',
      scope: 'org',
      text: 'Never activate a journey whose name starts with TEST_, and never send to real customers while testing. Test to mailinator with sends off; activating a real journey is a human decision.',
    },
  },

  {
    you: 'Quick, rebuild the lease-end audience the right way for a production send.',
    steps: [
      { say: 'Starting from **ENT.All_Owners_Opted_In** for consent, filtering to leases 90 days from maturity, reading the shared DE with the **Parent BU** credentials, and pointing at the production audience, not a TEST_ or _Working copy. The journey stays a Draft until someone signs off on go-live. Want me to write the Query Activity?' },
    ],
    memory: {
      kind: 'fact',
      scope: 'lease-end',
      text: 'For a lease-end production audience: start from ENT.All_Owners_Opted_In (consent), filter to leases 90 days from maturity, read shared DEs with Parent BU credentials, and use the production DE, not a TEST_ or _Working copy.',
    },
  },
];
