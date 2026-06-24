// demo.js — the engine. It renders and plays window.TRANSCRIPT (see transcript.js),
// plus a 2-step onboarding that hands off to free play. To change the demo's WORDS,
// edit transcript.js, never this file. Reads app primitives from window.AM (app.js).
(function (AM) {
  var byId = AM.byId, convo = AM.convo, reviewPanel = AM.reviewPanel, updateBadges = AM.updateBadges;

  // onboarding callouts: shared component (../shared/chalk/chalk.js).
  var chalkAnnotate = Chalk.annotate, clearChalk = Chalk.clear;
  Chalk.config({ bottomKeepout: 150 });

  // ---------- turn the editable transcript into a playable conversation ----------
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fmt(s) { return esc(s).replace(/\*\*([\s\S]+?)\*\*/g, '<b>$1</b>'); }   // **bold** is the only markup
  function holdFor(text) { return Math.max(1800, Math.min(3200, text.length * 26)); }  // longer lines linger longer

  function toolHtml(step) {
    var h = '<span class="gd"></span><div class="code"><span class="fn">' + esc(step.tool) + '</span>';
    if (step.action) h += ' · ' + fmt(step.action);
    if (step.lines && step.lines.length) {
      h += '<div class="diff">' + step.lines.map(function (l) {
        var c = l.charAt(0) === '+' ? 'dl add' : l.charAt(0) === '-' ? 'dl del' : 'dl';
        return '<div class="' + c + '">' + esc(l) + '</div>';
      }).join('') + '</div>';
    } else if (step.result) {
      h += '<span class="sub">⎿ ' + fmt(step.result) + '</span>';
    }
    return h + '</div>';
  }

  // memory kind -> where it lands and which pill it wears
  var MEM = {
    question:  { tab: 'review' },
    fact:      { tab: 'facts' },
    mapping:   { tab: 'facts', pill: 'mapping' },
    guardrail: { tab: 'guardrails' },
  };

  var CONVO = (window.TRANSCRIPT || []).map(function (turn, i) {
    var steps = (turn.steps || []).map(function (step) {
      if (step.u != null) return { user: true, text: step.u };   // the human answering Claude's in-chat question
      if (step.say != null) return { cls: 'ccd-a', wait: 600, hold: holdFor(step.say), html: '<span class="who">Claude</span> ' + fmt(step.say) };
      return { cls: 'ccd-tool', wait: 500, hold: step.lines ? 800 : 600, html: toolHtml(step) };
    });
    var after = null;
    if (turn.memory) {
      var m = turn.memory, map = MEM[m.kind] || MEM.fact;
      after = function () { dropItem({ id: 'mem-' + i, tab: map.tab, pill: map.pill, scope: m.scope || 'org', soft: !!m.soft, content: esc(m.text), why: m.why ? esc(m.why) : '' }); };
    }
    return { u: turn.you, steps: steps, after: after };
  });

  // ============ Claude Code window: ambient auto-typing conversation (loops) ============
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

  // What Active Memory kept from the chat: a confirmed fact/mapping (Facts), a
  // guardrail (Guardrails), or a question to answer (Review). Injected once each
  // (tracked by id) so the loop never repeats.
  // While the demo is presenting (first pass, before the user explores), it brings
  // the tab each item lands on into view so you watch it arrive. Flips off the moment
  // the user clicks a tab or a field, so it never fights them during free play.
  var driving = true;
  var injected = {};
  // "Applies to" chip markup — the SFMC difference: every saved item is labelled
  // into a project, or marked Org-wide. Mirrors memoryapp's scope chips.
  function scopeChip(scope) {
    var label = (scope === 'org') ? 'Org-wide' : scope;
    var cls = 'scope-chip' + (scope === 'org' ? ' org' : '');
    return '<div class="scope-row"><span class="scope-row-label">Applies to</span>' +
           '<span class="' + cls + '">' + label + '</span></div>';
  }
  function dropItem(o) {
    if (injected[o.id]) return;
    injected[o.id] = 1;
    var panel = o.tab === 'facts' ? AM.factsPanel : o.tab === 'guardrails' ? AM.guardPanel : reviewPanel;
    if (!panel) return;
    if (driving && AM.showTab) AM.showTab(o.tab);   // follow the action to where it lands
    var card = document.createElement('div');
    card.id = o.id;
    card.setAttribute('data-scope', o.scope || 'org');
    if (o.tab === 'facts' || o.tab === 'guardrails') {
      // auto-confirmed and editable like the rest. The pill marks fact / mapping /
      // guardrail. A SOFT fact (Claude inferred it, no human confirmed) wears an
      // "assumed, fix if wrong" flag and a softer style, vs a silent observed fact.
      card.className = 'card is-new' + (o.soft ? ' soft' : '');
      var pill = o.tab === 'guardrails' ? 'guardrail' : (o.pill || 'fact');
      var pillCls = 'type-pill' + (pill === 'guardrail' ? ' guardrail' : pill === 'mapping' ? ' mapping' : '');
      card.innerHTML =
        '<span class="tick">✓</span>' +
        '<div class="body"><div class="content editable"><span class="' + pillCls + '">' + pill + '</span>' + o.content + '</div>' +
        (o.soft ? '<div class="soft-flag">assumed · fix if wrong</div>' : '') +
        scopeChip(o.scope || 'org') + '</div>' +
        '<div class="actions"><button class="btn ghost" type="button">Remove</button></div>';
    } else {
      card.className = 'card qcard is-new';
      card.innerHTML =
        '<div class="body"><div class="content">' + o.content + '</div>' +
        (o.why ? '<div class="qwhy">Why Claude asks: ' + o.why + '</div>' : '') +
        scopeChip(o.scope || 'org') +
        '<form class="qform" onsubmit="return false"><textarea></textarea>' +
        '<div class="actions"><button class="btn primary" type="submit">Save answer</button></div></form></div>' +
        '<div class="qskip"><button class="btn ghost" type="button">Skip</button></div>';
    }
    panel.insertBefore(card, panel.querySelector('.card'));   // newest at the top
    updateBadges();
    if (AM.refreshProjects) AM.refreshProjects();   // keep the project rail counts + filter in sync
    if (AM.flashProject) AM.flashProject(o.scope || 'org');   // breathe the project that just gained an item
    setTimeout(function () { card.classList.remove('is-new'); }, 7200);   // after the 7s fade, don't replay
    var watching = !document.hidden && document.querySelector('.tab[data-tab="' + o.tab + '"]').classList.contains('active');
    if (watching) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (AM.flashTab) AM.flashTab(o.tab);
  }
  function resetDrips() {
    for (var id in injected) { var el = byId(id); if (el) el.remove(); }
    injected = {};
    updateBadges();
    if (AM.refreshProjects) AM.refreshProjects();
  }

  async function playConversation() {
    clearTimers(); paused = false; flushResume(); convPlaying = true; driving = true; var token = ++convToken; updateCtrl();
    var alive = function () { return token === convToken && convPlaying; };
    var sleep = function (ms) { return new Promise(function (r) { timers.push(setTimeout(function () { if (paused) resumeResolvers.push(r); else r(); }, ms)); }); };
    var type = async function (text) { var el = byId('ccPrompt'); el.classList.add('typed'); el.textContent = ''; for (var i = 0; i < text.length && alive(); i++) { el.textContent += text.charAt(i); await sleep(82); } };
    var send = function () { var p = byId('ccPrompt'), t = p.textContent; p.classList.remove('typed'); p.textContent = 'Type / for commands'; addText(t, 'ccd-u'); };

    // The guided demo plays only the first couple of turns to SHOW how it works,
    // then stops and hands the keyboard to the user for free typing (no loop).
    var DEMO_TURNS = 2;
    convo.innerHTML = '';
    await sleep(900); if (!alive()) return;
    for (var i = 0; i < DEMO_TURNS && i < CONVO.length && alive(); i++) {
      var turn = CONVO[i];
      var hlInput = (i === 0) ? byId('ccInput') : null;   // highlight the type box on the first prompt
      if (hlInput) hlInput.classList.add('hl-type');
      await type(turn.u);
      if (hlInput) hlInput.classList.remove('hl-type');
      if (!alive()) return;
      await sleep(450); send();
      for (var s = 0; s < turn.steps.length && alive(); s++) {
        var step = turn.steps[s];
        if (step.user) {   // the human types an answer back into the chat (becomes a saved fact, not an app question)
          await sleep(800); if (!alive()) return;
          await type(step.text); if (!alive()) return;
          await sleep(450); send();
          await sleep(800); if (!alive()) return;
          continue;
        }
        var w = working(); await sleep(step.wait || 1000); if (!alive()) { w.remove(); return; } w.remove();
        addMsg(step.html, step.cls);
        await sleep(step.hold || 1300); if (!alive()) return;
      }
      if (turn.after) { await sleep(600); if (!alive()) return; turn.after(); }
      await sleep(2000); if (!alive()) return;
    }
    // demo over: hand the keyboard to the user (unless a newer run/takeover replaced us)
    if (token === convToken) { convPlaying = false; updateCtrl(); enableTyping(); }
  }
  function pauseConv()  { if (!convPlaying || paused) return; paused = true; updateCtrl(); }
  function resumeConv() { if (!convPlaying || !paused) return; paused = false; flushResume(); updateCtrl(); }

  // ============ onboarding: two callouts, then free play ============
  var obTimers = [];
  function clearObTimers() { obTimers.forEach(clearTimeout); obTimers = []; }
  function dismissOnboarding() { clearObTimers(); clearChalk(); }

  function playOnboarding() {
    clearObTimers(); clearChalk(true);
    obTimers.push(setTimeout(function () {
      chalkAnnotate('.cc-win', 'This is Claude Code. Ask it to do real Salesforce Marketing Cloud work in plain English, build an audience, wire a journey, schedule a send, and it works from what your team knows. This is a demo, so just watch it go.', { corner: 'bottom-right' });
    }, 900));
    obTimers.push(setTimeout(clearChalk, 7500));
    obTimers.push(setTimeout(function () {
      chalkAnnotate('.app-win', 'This is your marketing memory. What Claude can know, it just saves as a fact (assumptions flagged "fix if wrong"). What only your team can decide, it leaves as a question for you. Every item is filed under a project, or Org-wide. Go ahead, play with it.', { corner: 'top-left' });
    }, 8600));
    obTimers.push(setTimeout(clearChalk, 16000));
  }

  // ============ free typing: after the short demo, the user drives Claude Code ============
  // The replies are FAKE but mimic the real shape: a brief Working…, sometimes a
  // tool line, a short answer that cites or saves memory. Every reply ends in a
  // memory beat — a saved fact (silent or soft) or a question — so the model always
  // shows through, whatever the user types. Nothing persists: a reload reseeds.
  var promptEl = byId('ccPrompt'), ccInputEl = byId('ccInput');
  var TYPE_PH = 'Ask Claude anything…';
  var typingEnabled = false, typedSeq = 0, phShown = false;

  function showPlaceholder() { promptEl.classList.remove('typed'); promptEl.textContent = TYPE_PH; phShown = true; }
  function clearPlaceholder() { if (phShown) { promptEl.textContent = ''; phShown = false; } promptEl.classList.add('typed'); }
  function disableTyping() { typingEnabled = false; promptEl.setAttribute('contenteditable', 'false'); }
  function enableTyping() {
    if (typingEnabled) return;
    typingEnabled = true;
    promptEl.setAttribute('contenteditable', 'true');
    promptEl.setAttribute('spellcheck', 'false');
    showPlaceholder();
    ccInputEl.classList.add('hl-type');
    obTimers.push(setTimeout(function () { ccInputEl.classList.remove('hl-type'); }, 2200));
    clearChalk(true);
    chalkAnnotate('.cc-win', 'Your turn. Ask Claude to build an audience, wire a journey, schedule a send, or anything else, and watch the memory fill in on the left.', { corner: 'bottom-right' });
    obTimers.push(setTimeout(clearChalk, 9000));
  }
  // click the input mid-demo to take over right away
  function takeOver() { convToken++; convPlaying = false; paused = false; clearTimers(); flushResume(); updateCtrl(); enableTyping(); promptEl.focus(); }
  function resetForReplay() { disableTyping(); resetDrips(); clearChalk(true); }

  promptEl.addEventListener('focus', function () { if (typingEnabled) clearPlaceholder(); });
  promptEl.addEventListener('blur', function () { if (typingEnabled && !promptEl.textContent.trim()) showPlaceholder(); });
  promptEl.addEventListener('keydown', function (e) {
    if (!typingEnabled) return;
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); var t = promptEl.textContent.trim(); if (!t) return; promptEl.textContent = ''; phShown = false; submitUser(t); }
  });
  ccInputEl.addEventListener('click', function () { if (!typingEnabled) takeOver(); else promptEl.focus(); });

  // ---- the faked-but-plausible responder ----
  function guessScope(t) {
    if (/lease|maturity/.test(t)) return 'lease-end';
    if (/win.?back|lapsed|dormant|re.?engage|inactive/.test(t)) return 'win-back';
    if (/service|reminder|recall|maintenance|oil|tire/.test(t)) return 'service-reminders';
    if (/welcome|new owner|new buyer|onboard|delivery/.test(t)) return 'new-owner-welcome';
    return 'org';
  }
  function cleanQ(text) {
    var s = text.trim().replace(/[.?!]+$/, '');
    s = s.charAt(0).toUpperCase() + s.slice(1);
    if (s.length > 140) s = s.slice(0, 137) + '…';
    return s + '?';
  }
  function respond(text) {
    var t = text.toLowerCase(), scope = guessScope(t);
    var lbl = scope === 'org' ? 'this campaign' : scope;
    if (/activate|go.?live|publish|launch|turn on/.test(t)) {
      if (/test_|\btest\b/.test(t)) return { reply: 'I will not activate that. **TEST_** builds never send, and no journey goes live without a named human approving it. I can run a preview to a mailinator address with sends off so you can see it safely.' };
      return { reply: 'Going live is a human decision, not mine, so I will not flip that on from here. I have put the go-live owner on Review so it is on record.', memory: { kind: 'question', scope: scope, text: 'Who signs off on go-live for ' + lbl + ', and what has to be true first?', why: 'Activating a real send is a call only your team can own.' } };
    }
    if (/who |approve|sign.?off|owner|consent|opt.?out|opt.?in|unsubscrib|should we|priorit|decide|allowed/.test(t)) {
      return { reply: 'That is a call only your team can own, so I will not guess at it. I have added it to Review for you to answer.', memory: { kind: 'question', scope: scope, text: cleanQ(text), why: 'Only your team can own this one.' } };
    }
    if (/mailinator|preview|test send/.test(t)) {
      return { reply: 'I will send that as a preview to a mailinator address with sends off, never to real owners. That follows your testing guardrail.' };
    }
    if (/schedule|blast|deploy|\bsend\b|sending|when should/.test(t)) {
      return { reply: 'Before I schedule for ' + lbl + ', I need your send window. I do not have quiet hours or a weekly frequency cap saved for it, so I have flagged it on Review.', memory: { kind: 'question', scope: scope, text: 'What are the send-window and frequency rules for ' + lbl + ' (quiet hours, weekly cap per owner)?', why: 'Send timing is your policy, not something Claude can infer.' } };
    }
    if (/audience|segment|build|query|list|pull|data extension|\bde\b|who gets|recipients/.test(t)) {
      return { tool: { tool: 'SFMC', action: 'build query · ' + scope, result: 'audience from ENT.All_Owners_Opted_In' }, reply: 'I will build the ' + lbl + ' audience from **ENT.All_Owners_Opted_In** (your Org-wide opt-in rule) and point at the production data extension, not a TEST_ copy. Saving the recipe so it stays consistent.', memory: { kind: 'fact', scope: scope, soft: true, text: 'The ' + lbl + ' audience starts from ENT.All_Owners_Opted_In, filtered to ' + lbl + ' criteria.' } };
    }
    if (/report|metric|open rate|click|bounce|stats|performance|results|analytic/.test(t)) {
      return { reply: 'Engagement data lives in the system data views (_Open, _Click, _Bounce), queried in SQL, not in a regular data extension. I will pull the ' + lbl + ' results from there.' };
    }
    return { reply: 'I do not have that in your memory yet. Since it is the kind of thing only your team can answer, I have added it to Review.', memory: { kind: 'question', scope: scope, text: cleanQ(text), why: 'Not something Claude can safely infer.' } };
  }
  function submitUser(text) {
    driving = false;
    addText(text, 'ccd-u');
    var r = respond(text);
    var w = working();
    timers.push(setTimeout(function () {
      w.remove();
      var afterTool = function () {
        addMsg('<span class="who">Claude</span> ' + fmt(r.reply), 'ccd-a');
        if (r.memory) timers.push(setTimeout(function () { dropTyped(r.memory); }, 650));
      };
      if (r.tool) { addMsg(toolHtml(r.tool), 'ccd-tool'); timers.push(setTimeout(afterTool, 650)); }
      else afterTool();
    }, 780));
  }
  function dropTyped(m) {
    var map = MEM[m.kind] || MEM.fact;
    dropItem({ id: 'typed-' + (typedSeq++), tab: map.tab, pill: map.pill, scope: m.scope || 'org', soft: !!m.soft, content: esc(m.text), why: m.why ? esc(m.why) : '' });
    if (AM.showTab) AM.showTab(map.tab);   // bring the tab it landed on into view so the user watches memory fill in
  }

  // floating demo controls drive the conversation
  byId('playPause').addEventListener('click', function () {
    if (!convPlaying) { resetForReplay(); playConversation(); }
    else if (paused) resumeConv();
    else pauseConv();
  });
  byId('restart').addEventListener('click', function () { resetForReplay(); playOnboarding(); playConversation(); });

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
