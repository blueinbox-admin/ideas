// transcript.js — the short guided story the engine autoplays before handing over.
// One turn: a real fabric match with a quantitative result, surfacing ONE
// high-concept, reusable fact. Grounded in Sportek's real catalog (F-70L,
// Chloratek, PFP, UPF50+).
window.TRANSCRIPT = [
  {
    you: 'I need a chlorine-resistant swim fabric that can also take a sublimated print. What fits, and how many colors are in stock?',
    steps: [
      { tool: 'Product catalog', action: 'filter · chlorine-resist + PFP + UPF', result: 'F-70L Chloratek UPF50+ · 14 stock colors' },
      { say: '**F-70L** Nylon-LYCRA Chlorine-Resist Tricot fits both: it is UPF50+, four-way stretch, and it sits in the **PFP** line, so it sublimates cleanly. **14 colors** are in stock now.' },
    ],
    memory: {
      kind: 'mapping',
      scope: 'swimwear',
      text: 'F-70L (Chloratek, UPF50+) is the one chlorine-resistant fabric that is also in the PFP sublimation line, so it is the pick for printed competitive or pool swimwear.',
    },
  },
];
