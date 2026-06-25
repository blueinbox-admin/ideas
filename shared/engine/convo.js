// convo.js — the conversation ENGINE. Surface-agnostic: it talks only to
// window.AM_SURFACE (convo container, input, message class names) and window.AM
// (the app renderer's dropMemory/dropQuestion). It plays the first couple of
// transcript turns to show how it works, then hands the keyboard to the user;
// typed prompts get faked-but-plausible replies from DEMO.respond(), each ending
// in a memory drop. Same engine drives the 'desktop' and (later) 'embedded'
// surfaces — only the chrome around it differs. Nothing persists; a reload reseeds.
(function (AM) {
  var S = window.AM_SURFACE; if (!S) return;
  var CFG = window.DEMO || {};
  var FEAT = window.AM_FEATURES || (window.DEMO_DEFAULTS && window.DEMO_DEFAULTS.features) || {};
  var convo = S.convo, promptEl = S.prompt, inputEl = S.input, CLS = S.cls;
  var chalkOn = window.Chalk ? Chalk.annotate : function () {}, chalkOff = window.Chalk ? Chalk.clear : function () {};
  if (window.Chalk) Chalk.config({ bottomKeepout: 150 });

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fmt(s) { return esc(s).replace(/\*\*([\s\S]+?)\*\*/g, '<b>$1</b>'); }
  function holdFor(t) { return Math.max(1800, Math.min(3200, t.length * 26)); }

  function toolHtml(step) {
    var h = '<span class="gd"></span><div class="code"><span class="fn">' + esc(step.tool) + '</span>';
    if (step.action) h += ' · ' + fmt(step.action);
    if (step.result) h += '<span class="sub">⎿ ' + fmt(step.result) + '</span>';
    return h + '</div>';
  }
  function addMsg(html, cls) { var d = document.createElement('div'); d.className = cls; d.innerHTML = html; convo.appendChild(d); convo.scrollTop = convo.scrollHeight; return d; }
  function addText(text, cls) { var d = document.createElement('div'); d.className = cls; d.textContent = text; convo.appendChild(d); convo.scrollTop = convo.scrollHeight; return d; }
  function working() { return addMsg('<span class="sp"></span> Working…', CLS.working); }

  // a transcript memory or a responder memory -> the right AM drop
  function dropMem(m) {
    if (!m) return;
    if (m.kind === 'question') AM.dropQuestion({ text: m.text, rationale: m.why || '', scope: m.scope || 'org' });
    else AM.dropMemory({ type: m.kind || 'fact', content: m.text, scopes: [m.scope || 'org'], confidence: m.soft ? 'inferred' : 'observed', tab: 'facts' });
  }
  // A turn may surface SEVERAL memories at once (a recipe fact AND a higher-level
  // question it derived). Accept one or an array; drop them one at a time.
  function dropMems(m) {
    if (!m) return;
    (Array.isArray(m) ? m : [m]).forEach(function (mm, i) { setTimeout(function () { dropMem(mm); }, i * 750); });
  }

  var CONVO = (window.TRANSCRIPT || []).map(function (turn) {
    var steps = (turn.steps || []).map(function (step) {
      if (step.u != null) return { user: true, text: step.u };
      if (step.say != null) return { cls: CLS.claude, wait: 600, hold: holdFor(step.say), html: '<span class="who">Claude</span> ' + fmt(step.say) };
      return { cls: CLS.tool, wait: 500, hold: 700, html: toolHtml(step) };
    });
    return { u: turn.you, steps: steps, memory: turn.memory };
  });

  // ---- autoplay (first DEMO_TURNS turns, then hand over) ----
  // autoplay plays the FIRST command only, then hands the keyboard to the user.
  // (off -> 0 guided turns: jump straight to free typing / a static view.)
  var DEMO_TURNS = FEAT.autoplay === false ? 0 : (CFG.demoTurns != null ? CFG.demoTurns : 1);
  var timers = [], playing = false, paused = false, token = 0, resumeQ = [];
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function flushResume() { var r = resumeQ; resumeQ = []; r.forEach(function (f) { f(); }); }
  function ctrl() { var pp = document.getElementById('playPause'); if (pp) pp.textContent = (playing && !paused) ? '⏸' : '▶'; }

  function play() {
    clearTimers(); paused = false; flushResume(); playing = true; var tok = ++token; ctrl();
    var alive = function () { return tok === token && playing; };
    var sleep = function (ms) { return new Promise(function (r) { timers.push(setTimeout(function () { if (paused) resumeQ.push(r); else r(); }, ms)); }); };
    var type = async function (text) { promptEl.classList.add('typed'); promptEl.textContent = ''; for (var i = 0; i < text.length && alive(); i++) { promptEl.textContent += text.charAt(i); await sleep(82); } };
    var send = function () { var t = promptEl.textContent; promptEl.classList.remove('typed'); promptEl.textContent = 'Type / for commands'; addText(t, CLS.user); };
    (async function () {
      convo.innerHTML = ''; await sleep(900); if (!alive()) return;
      for (var i = 0; i < DEMO_TURNS && i < CONVO.length && alive(); i++) {
        var turn = CONVO[i];
        if (i === 0) inputEl.classList.add('hl-type');
        await type(turn.u);
        if (i === 0) inputEl.classList.remove('hl-type');
        if (!alive()) return;
        await sleep(450); send();
        for (var s = 0; s < turn.steps.length && alive(); s++) {
          var step = turn.steps[s];
          if (step.user) { await sleep(800); if (!alive()) return; await type(step.text); if (!alive()) return; await sleep(450); send(); await sleep(800); continue; }
          var w = working(); await sleep(step.wait); if (!alive()) { w.remove(); return; } w.remove();
          addMsg(step.html, step.cls); await sleep(step.hold); if (!alive()) return;
        }
        if (turn.memory) { await sleep(600); if (!alive()) return; dropMems(turn.memory); }
        await sleep(1800); if (!alive()) return;
      }
      if (tok === token) { playing = false; ctrl(); enableTyping(); }
    })();
  }

  // ---- free typing ----
  var typingOn = false, phShown = false, PH = 'Ask Claude anything…';
  function showPH() { promptEl.classList.remove('typed'); promptEl.textContent = PH; phShown = true; }
  function clearPH() { if (phShown) { promptEl.textContent = ''; phShown = false; } promptEl.classList.add('typed'); }
  function enableTyping() {
    if (FEAT.freeTyping === false) { ctrl(); return; }   // read-only demo: no keyboard handover
    if (typingOn) return; typingOn = true;
    promptEl.setAttribute('contenteditable', 'true'); promptEl.setAttribute('spellcheck', 'false'); showPH();
    chalkOff(true);
    // wait a beat after the turn settles, then nudge the user to type. Do NOT dim
    // the page for this one (highlight:false) — just point, don't black everything out.
    setTimeout(function () {
      inputEl.classList.add('hl-type'); setTimeout(function () { inputEl.classList.remove('hl-type'); }, 2200);
      chalkOn(onbTarget('cc'), 'Your turn. Ask Claude to build an audience, wire a journey, schedule a send, or anything else, and watch the memory fill in on the left.', { corner: 'bottom-right', highlight: false });
      setTimeout(chalkOff, 9000);
    }, 3000);
  }
  function takeOver() { if (FEAT.freeTyping === false) return; token++; playing = false; paused = false; clearTimers(); flushResume(); ctrl(); enableTyping(); promptEl.focus(); }
  promptEl.addEventListener('focus', function () { if (typingOn) clearPH(); });
  promptEl.addEventListener('blur', function () { if (typingOn && !promptEl.textContent.trim()) showPH(); });
  promptEl.addEventListener('keydown', function (e) {
    if (!typingOn) return;
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); var t = promptEl.textContent.trim(); if (!t) return; promptEl.textContent = ''; phShown = false; submitUser(t); }
  });
  inputEl.addEventListener('click', function () { if (!typingOn) takeOver(); else promptEl.focus(); });

  // The catch-all behaves like Claude Code actually does: it DOES the work
  // (each instance is preseeded, so it already knows the setup), shows a
  // plausible tool step, and a fact surfaces in the app. It does NOT punt to
  // Review. Review is only for the genuine human-owned calls, which each
  // demo's respond() routes there explicitly. This is a demo: the point is the
  // live coordination between Claude and the memory, not literal correctness.
  function fallback(text) {
    var conns = CFG.connectors || [];
    var tool = (conns[0] && conns[0].label) || CFG.agentLabel || 'Claude';
    var action = text.trim().replace(/[.?!]+$/, '');
    if (action.length > 46) action = action.slice(0, 44) + '…';
    return {
      tool: { tool: tool, action: action, result: 'done' },
      reply: 'On it. I worked from what your team already has saved so it lines up with the rest of your setup. Saving what I did so it stays consistent.',
      memory: { kind: 'fact', soft: true, scope: 'org', text: 'Handled “' + action + '” from the existing setup.' },
    };
  }
  function submitUser(text) {
    addText(text, CLS.user);
    var r = (typeof CFG.respond === 'function' ? CFG.respond(text) : null) || fallback(text);
    var w = working();
    setTimeout(function () {
      w.remove();
      var after = function () {
        addMsg('<span class="who">Claude</span> ' + fmt(r.reply), CLS.claude);
        if (r.memory) setTimeout(function () { dropMems(r.memory); }, 650);
      };
      if (r.tool) { addMsg(toolHtml(r.tool), CLS.tool); setTimeout(after, 650); } else after();
    }, 780);
  }

  // ---- onboarding callouts ----
  function onbTarget(which) {
    var ob = CFG.onboarding || [];
    var hit = ob.filter(function (o) { return o.which === which; })[0];
    return (hit && hit.target) || (S.onboarding && S.onboarding[which]) || '.cc-win';
  }
  function playOnboarding() {
    chalkOff(true);
    var ob = CFG.onboarding || [];
    if (ob[0]) setTimeout(function () { chalkOn(ob[0].target, ob[0].text, { corner: ob[0].corner || 'bottom-right' }); }, 900);
    setTimeout(chalkOff, 7500);
    if (ob[1]) setTimeout(function () { chalkOn(ob[1].target, ob[1].text, { corner: ob[1].corner || 'top-left' }); }, 8600);
    setTimeout(chalkOff, 16000);
  }

  // ---- controls ----
  var pp = document.getElementById('playPause'), rb = document.getElementById('restart');
  if (pp) pp.addEventListener('click', function () {
    if (playing && !paused) { paused = true; ctrl(); }
    else if (playing && paused) { paused = false; flushResume(); ctrl(); }
    else { location.reload(); }
  });
  if (rb) rb.addEventListener('click', function () { location.reload(); });

  // boot — onboarding flag comes from the resolved feature set (boot.js)
  if (FEAT.onboarding !== false) playOnboarding();
  play();
})(window.AM);
