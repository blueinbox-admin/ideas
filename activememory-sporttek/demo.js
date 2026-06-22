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
      if (step.say != null) return { cls: 'ccd-a', wait: 600, hold: holdFor(step.say), html: '<span class="who">Claude</span> ' + fmt(step.say) };
      return { cls: 'ccd-tool', wait: 500, hold: step.lines ? 800 : 600, html: toolHtml(step) };
    });
    var after = null;
    if (turn.memory) {
      var m = turn.memory, map = MEM[m.kind] || MEM.fact;
      after = function () { dropItem({ id: 'mem-' + i, tab: map.tab, pill: map.pill, content: esc(m.text), why: m.why ? esc(m.why) : '' }); };
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
  function dropItem(o) {
    if (injected[o.id]) return;
    injected[o.id] = 1;
    var panel = o.tab === 'facts' ? AM.factsPanel : o.tab === 'guardrails' ? AM.guardPanel : reviewPanel;
    if (!panel) return;
    if (driving && AM.showTab) AM.showTab(o.tab);   // follow the action to where it lands
    var card = document.createElement('div');
    card.id = o.id;
    if (o.tab === 'facts' || o.tab === 'guardrails') {
      // auto-confirmed and editable like the rest. The pill marks fact / mapping /
      // guardrail (matches memoryapp, where an observed record is saved, not asked).
      card.className = 'card is-new';
      var pill = o.tab === 'guardrails' ? 'guardrail' : (o.pill || 'fact');
      var pillCls = 'type-pill' + (pill === 'guardrail' ? ' guardrail' : pill === 'mapping' ? ' mapping' : '');
      card.innerHTML =
        '<span class="tick">✓</span>' +
        '<div class="body"><div class="content editable"><span class="' + pillCls + '">' + pill + '</span>' + o.content + '</div></div>' +
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
    var type = async function (text) { var el = byId('ccPrompt'); el.classList.add('typed'); el.textContent = ''; for (var i = 0; i < text.length && alive(); i++) { el.textContent += text.charAt(i); await sleep(82); } };
    var send = function () { var p = byId('ccPrompt'), t = p.textContent; p.classList.remove('typed'); p.textContent = 'Type / for commands'; addText(t, 'ccd-u'); };

    while (alive()) {
      convo.innerHTML = '';
      await sleep(900); if (!alive()) return;
      for (var i = 0; i < CONVO.length && alive(); i++) {
        var turn = CONVO[i];
        var hlInput = (i === 0) ? byId('ccInput') : null;   // highlight the type box each time the first prompt is written
        if (hlInput) hlInput.classList.add('hl-type');
        await type(turn.u);
        if (hlInput) hlInput.classList.remove('hl-type');
        if (!alive()) return;
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
  function dismissOnboarding() { clearObTimers(); clearChalk(); }

  function playOnboarding() {
    clearObTimers(); clearChalk(true);
    obTimers.push(setTimeout(function () {
      chalkAnnotate('.cc-win', 'This is Claude Code. Ask it any product question in plain English, fabrics, fits, decoration, what to recommend, and it answers from your product knowledge. This is a demo, so just watch it work.', { corner: 'bottom-right' });
    }, 900));
    obTimers.push(setTimeout(clearChalk, 7500));
    obTimers.push(setTimeout(function () {
      chalkAnnotate('.app-win', 'This is your Intelligence Hub. It remembers what your best reps know about the products, so Claude gives the whole sales team the same right answer. Go ahead, play with it.', { corner: 'top-left' });
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
