// demo.js — drives the demo: an ambient Claude Code conversation that loops, plus
// a 2-step onboarding (spotlight Claude Code, then the app) that hands off to free play.
// Reads app primitives from window.AM (see app.js); exposes stopStory + claudeFollowUp back.
(function (AM) {
  var byId = AM.byId, convo = AM.convo, reviewPanel = AM.reviewPanel, updateBadges = AM.updateBadges;

  // onboarding callouts: shared component (../shared/chalk/chalk.js).
  // Keep them clear of the floating demo controls at the bottom.
  var chalkAnnotate = Chalk.annotate, clearChalk = Chalk.clear;
  Chalk.config({ bottomKeepout: 150 });

  // ============ Claude Code window: ambient auto-typing conversation (loops) ============
  // Pure Claude Code motion — it never touches the app, so the user can play freely
  // while it keeps going. The play/pause/restart controls drive this.
  var timers = [], convPlaying = false, paused = false, convToken = 0, resumeResolvers = [];
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function flushResume() { var rs = resumeResolvers; resumeResolvers = []; rs.forEach(function (f) { f(); }); }
  function updateCtrl() {
    var pp = byId('playPause'); if (!pp) return;
    if (convPlaying && !paused) { pp.textContent = '⏸'; pp.title = 'Pause'; }
    else { pp.textContent = '▶'; pp.title = convPlaying ? 'Resume' : 'Replay'; }
  }
  function addMsg(html, cls) { var d = document.createElement('div'); d.className = cls; d.innerHTML = html; convo.appendChild(d); convo.scrollTop = convo.scrollHeight; return d; }
  function addText(text, cls) { var d = document.createElement('div'); d.className = cls; d.textContent = text; convo.appendChild(d); convo.scrollTop = convo.scrollHeight; return d; }
  function working() { return addMsg('<span class="sp"></span> Working…', 'ccd-working'); }

  // Each turn = your typed prompt, then Claude's real working steps (read context,
  // read files, write/edit with diffs, then a summary). `after` is what Active Memory
  // saves as a result: a fact (Facts) or a question to answer once (Review).
  var CONVO = [
    { u: 'Rewrite the homepage intro. Plainer, friendlier, short sentences, no legal jargon.',
      steps: [
        { cls: 'ccd-tool', wait: 450, hold: 600, html: '<span class="gd"></span><div class="code"><span class="fn">Read</span>(pages/home.php)<span class="sub">⎿ Read 40 lines</span></div>' },
        { cls: 'ccd-tool', wait: 500, hold: 800, html: '<span class="gd"></span><div class="code"><span class="fn">Update</span>(pages/home.php)<div class="diff"><div class="dl del">- We provide comprehensive legal representation across a breadth of practice areas.</div><div class="dl add">+ We help families and small businesses with the legal stuff that matters, in plain English.</div></div></div>' },
        { cls: 'ccd-a', wait: 600, hold: 1900, html: '<span class="who">Claude</span> Done. Rewrote the homepage intro in a plainer, friendlier voice.' }
      ],
      after: function () { dropItem({ id: 'am-fact-voice', tab: 'facts', content: 'Preferred voice: plain and friendly, short sentences, no legal jargon. Claude writes new copy this way.' }); } },
    { u: 'Add tracking so I can see which pages lead to consult bookings.',
      steps: [
        { cls: 'ccd-tool', wait: 450, hold: 600, html: '<span class="gd"></span><div class="code"><span class="fn">Read</span>(themes/reyes/footer.php)<span class="sub">⎿ Read 22 lines</span></div>' },
        { cls: 'ccd-tool', wait: 500, hold: 800, html: '<span class="gd"></span><div class="code"><span class="fn">Update</span>(themes/reyes/footer.php)<div class="diff"><div class="dl add">+ &lt;!-- GA4 --&gt;</div><div class="dl add">+ gtag("event", "consult_click", { page: location.pathname });</div></div></div>' },
        { cls: 'ccd-a', wait: 600, hold: 1900, html: '<span class="who">Claude</span> Tracking is in. Every consult button now fires a <span class="mem">consult_click</span> event, so you can see which pages drive bookings.' }
      ],
      after: function () { dropItem({ id: 'am-fact-kpi', tab: 'facts', content: 'Success means consult bookings. Claude tracks which pages drive them and treats consult conversions as the goal when suggesting changes.' }); } },
    { u: 'The About page still reads stiff. Same plain voice as the homepage.',
      steps: [
        { cls: 'ccd-tool', wait: 450, hold: 600, html: '<span class="gd"></span><div class="code"><span class="fn">Read</span>(pages/about.php)<span class="sub">⎿ Read 35 lines</span></div>' },
        { cls: 'ccd-tool', wait: 500, hold: 800, html: '<span class="gd"></span><div class="code"><span class="fn">Update</span>(pages/about.php)<div class="diff"><div class="dl del">- Our firm is committed to the diligent pursuit of our clients’ legal objectives.</div><div class="dl add">+ When life gets legal, we make it simple and we stay in your corner.</div></div></div>' },
        { cls: 'ccd-a', wait: 600, hold: 1900, html: '<span class="who">Claude</span> Done. Reworked the About page in the same plain voice.' }
      ],
      after: function () { dropItem({ id: 'am-guard-voice', tab: 'guardrails', content: 'Always write in plain, friendly language, never stiff legal phrasing. You asked for this twice, so Claude saved it as a standing rule.' }); } },
    { u: 'Add a contact form to every service page.',
      steps: [
        { cls: 'ccd-tool', wait: 450, hold: 600, html: '<span class="gd"></span><div class="code"><span class="fn">Read</span>(themes/reyes/template-service.php)<span class="sub">⎿ Read 48 lines</span></div>' },
        { cls: 'ccd-tool', wait: 500, hold: 800, html: '<span class="gd"></span><div class="code"><span class="fn">Update</span>(themes/reyes/template-service.php)<div class="diff"><div class="dl add">+ &lt;form class="intake" action="/inbox"&gt;</div><div class="dl add">+   &lt;input name="name" placeholder="Your name"&gt;</div><div class="dl add">+ &lt;/form&gt;</div></div></div>' },
        { cls: 'ccd-a', wait: 600, hold: 1900, html: '<span class="who">Claude</span> Added the form to every service page. Routed to your main inbox for now, tell me if it should go somewhere else.' }
      ],
      after: function () { dropItem({ id: 'am-q-leads', tab: 'review', content: 'When a contact form comes in, what makes a lead worth your time versus one you would turn away? Claude can pre-screen on the form so you only hear from good fits.', why: 'Claude just added intake forms across the site, and can filter them if it knows your ideal client.' }); } }
  ];

  // While the demo is presenting (first pass, before the user explores), it brings
  // the tab each item lands on into view so you watch it arrive. Flips off the moment
  // the user clicks a tab or a field, so it never fights them during free play.
  var driving = true;
  // what Active Memory saved from the chat: a confirmed fact (Facts tab) or a question
  // to answer (Review tab). Injected once each (tracked by id) so the loop never repeats.
  var injected = {};
  function dropItem(o) {
    if (injected[o.id]) return;
    injected[o.id] = 1;
    var panel = o.tab === 'facts' ? AM.factsPanel : o.tab === 'guardrails' ? AM.guardPanel : reviewPanel;
    if (!panel) return;
    if (driving && AM.showTab) AM.showTab(o.tab);   // follow the action to where it lands
    var card = document.createElement('div');
    card.id = o.id;
    if (o.tab === 'facts' || o.tab === 'guardrails') {
      // auto-confirmed and editable like the rest. Guardrails carry their own pill
      // (matches memoryapp, where an observed rule is saved, not asked).
      card.className = 'card is-new';
      var pillCls = o.tab === 'guardrails' ? 'type-pill guardrail' : 'type-pill';
      var pillLabel = o.tab === 'guardrails' ? 'guardrail' : 'fact';
      card.innerHTML =
        '<span class="tick">✓</span>' +
        '<div class="body"><div class="content editable"><span class="' + pillCls + '">' + pillLabel + '</span>' + o.content + '</div></div>' +
        '<div class="actions"><button class="btn ghost" type="button">Remove</button></div>';
    } else {
      card.className = 'card qcard is-new';
      card.innerHTML =
        '<div class="body"><div class="content">' + o.content + '</div>' +
        (o.why ? '<div class="qwhy">Why Claude asks: ' + o.why + '</div>' : '') +
        '<form class="qform" onsubmit="return false"><textarea></textarea>' +
        '<div class="actions"><button class="btn primary" type="submit">Save answer</button></div></form></div>' +
        '<div class="qskip"><button class="btn ghost" type="button">Skip</button></div>';
    }
    panel.insertBefore(card, panel.querySelector('.card'));   // newest at the top
    updateBadges();
    setTimeout(function () { card.classList.remove('is-new'); }, 7200);   // after the 7s fade, don't replay
    // if you're looking at that tab, glide it into view; otherwise the tab breath
    // + title badge surface it instead.
    var watching = !document.hidden && document.querySelector('.tab[data-tab="' + o.tab + '"]').classList.contains('active');
    if (watching) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (AM.flashTab) AM.flashTab(o.tab);
  }
  function resetDrips() {
    for (var id in injected) { var el = byId(id); if (el) el.remove(); }
    injected = {};
    updateBadges();
  }

  async function playConversation() {
    clearTimers(); paused = false; flushResume(); convPlaying = true; driving = true; var token = ++convToken; updateCtrl();
    var alive = function () { return token === convToken && convPlaying; };
    var sleep = function (ms) { return new Promise(function (r) { timers.push(setTimeout(function () { if (paused) resumeResolvers.push(r); else r(); }, ms)); }); };
    var type = async function (text) { var el = byId('ccPrompt'); el.classList.add('typed'); el.textContent = ''; for (var i = 0; i < text.length && alive(); i++) { el.textContent += text.charAt(i); await sleep(52); } };
    var send = function () { var p = byId('ccPrompt'), t = p.textContent; p.classList.remove('typed'); p.textContent = 'Type / for commands'; addText(t, 'ccd-u'); };

    while (alive()) {
      convo.innerHTML = '';
      await sleep(900); if (!alive()) return;
      for (var i = 0; i < CONVO.length && alive(); i++) {
        var turn = CONVO[i];
        await type(turn.u); if (!alive()) return;
        await sleep(450); send();
        for (var s = 0; s < turn.steps.length && alive(); s++) {
          var step = turn.steps[s];
          var w = working(); await sleep(step.wait || 1000); if (!alive()) { w.remove(); return; } w.remove();
          addMsg(step.html, step.cls);
          await sleep(step.hold || 1300); if (!alive()) return;
        }
        if (turn.after) { await sleep(600); if (!alive()) return; turn.after(); }
        await sleep(2200); if (!alive()) return;
      }
      await sleep(3200); if (!alive()) return;   // hold, then loop from the top
    }
  }
  function pauseConv()  { if (!convPlaying || paused) return; paused = true; updateCtrl(); }
  function resumeConv() { if (!convPlaying || !paused) return; paused = false; flushResume(); updateCtrl(); }

  // ============ onboarding: two callouts, then free play ============
  var obTimers = [];
  function clearObTimers() { obTimers.forEach(clearTimeout); obTimers = []; }
  // app.js calls this on any user interaction: dismiss the intro callouts, but
  // leave the Claude Code conversation running so it keeps going during free play.
  function dismissOnboarding() { clearObTimers(); clearChalk(); }

  function playOnboarding() {
    clearObTimers(); clearChalk(true);
    obTimers.push(setTimeout(function () {
      chalkAnnotate('.cc-win', 'Claude Code. Ask in plain English, it builds, updates, and analyzes your websites and apps. (Demo — just watch.)', { corner: 'bottom-right' });
    }, 900));
    obTimers.push(setTimeout(clearChalk, 7500));
    obTimers.push(setTimeout(function () {
      chalkAnnotate('.app-win', 'This is your side app. It quietly remembers your business in the background, so Claude works like someone who\'s been here for years.', { corner: 'top-left' });
    }, 8600));
    obTimers.push(setTimeout(clearChalk, 16000));
  }

  // floating demo controls drive the conversation
  byId('playPause').addEventListener('click', function () {
    if (!convPlaying) playConversation();
    else if (paused) resumeConv();
    else pauseConv();
  });
  byId('restart').addEventListener('click', function () { resetDrips(); playOnboarding(); playConversation(); });

  // the user exploring the app (picking a tab, or typing somewhere) takes the wheel:
  // stop auto-navigating so the demo never pulls them off the tab they chose.
  var tabsNav = byId('tabs');
  if (tabsNav) tabsNav.addEventListener('click', function () { driving = false; });
  document.addEventListener('focusin', function (e) {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') driving = false;
  });

  // ---- surface shared with app.js ----
  AM.stopStory = dismissOnboarding;        // user interaction clears the intro, not the convo
  AM.claudeFollowUp = function () {};       // no auto-injected question card to follow up on now

  // autostart: intro callouts + the looping conversation, side by side
  playOnboarding();
  playConversation();
})(window.AM);
