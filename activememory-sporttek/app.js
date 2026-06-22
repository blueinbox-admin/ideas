// app.js — interactive logic for the SportTek USA / Active Memory (Shopify + QuickBooks + HubSpot) demo.
// The auto-play story lives in demo.js. The two share a small window.AM namespace:
//   app.js  -> AM: byId, showTab, updateBadges, reviewPanel, guardPanel, convo
//   demo.js -> AM: stopStory, claudeFollowUp
// Onboarding pointer callouts use the shared global `Chalk` (../shared/chalk/chalk.js).
window.AM = window.AM || {};
(function (AM) {
  // Forward into the auto-play story (defined in demo.js). Resolved lazily at call
  // time, so app.js never depends on demo.js having loaded first.
  function stopStory()      { if (AM.stopStory) AM.stopStory(); }
  function claudeFollowUp() { if (AM.claudeFollowUp) AM.claudeFollowUp(); }

  var byId = function (id) { return document.getElementById(id); };
  var reviewPanel = document.querySelector('[data-panel="review"]');
  var factsPanel  = document.querySelector('[data-panel="facts"]');
  var guardPanel  = document.querySelector('[data-panel="guardrails"]');
  var factsNote   = factsPanel.querySelector('p.note[style]');   // trailing "Plus N pages" note
  var guardForm   = byId('guardAdd');
  var convo       = byId('ccConvo');
  // onboarding pointer callouts: shared component, see ../shared/chalk/chalk.js

  // ---------- tabs ----------
  function showTab(name) {
    document.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('active', t.getAttribute('data-tab') === name); });
    document.querySelectorAll('.panel').forEach(function (p) { p.classList.toggle('active', p.getAttribute('data-panel') === name); });
  }
  byId('tabs').addEventListener('click', function (e) {
    var tab = e.target.closest('.tab'); if (!tab) return;
    stopStory();
    var name = tab.getAttribute('data-tab');
    showTab(name);
    clearTabUnseen(name);   // looked at this tab -> clear its tab-title badge
    if (name === 'david') { var bd = byId('bDavid'); if (bd) bd.textContent = ''; }   // read David's reply
  });

  // ---------- badges ----------
  reviewPanel.querySelectorAll('.card').forEach(function (c) { if (c.querySelector('.meta')) c.classList.add('suggested'); });
  function updateBadges() {
    byId('bReview').textContent = reviewPanel.querySelectorAll('.card.qcard:not(.leaving), .card.suggested:not(.leaving)').length;
    byId('bFacts').textContent  = factsPanel.querySelectorAll('.card:not(.leaving)').length;
    byId('bGuard').textContent  = guardPanel.querySelectorAll('.card:not(.leaving)').length;
  }
  updateBadges();

  // a tab gained an item while you were on another tab: breathe it (matches memoryapp).
  // No-op if that tab is already active (you can see the item arrive).
  function flashTab(name) {
    var tab = document.querySelector('.tab[data-tab="' + name + '"]');
    if (tab && !tab.classList.contains('active')) {
      tab.classList.remove('flash'); void tab.offsetWidth; tab.classList.add('flash');
      setTimeout(function () { tab.classList.remove('flash'); }, 3300);
    }
    bumpUnseen(name);
  }

  // ---------- browser-tab-title notification ----------
  // When a proactive item lands on a tab you're not looking at — another in-app
  // tab, or away on a different browser tab — badge the title with a count. Tracked
  // per tab so opening that tab clears its own count.
  var chromeTab = document.querySelector('.chrome-tab .tname');
  var baseDocTitle = document.title;
  var baseTabTitle = chromeTab ? chromeTab.textContent : '';
  var unseen = { review: 0, facts: 0, guardrails: 0 };
  function tabIsActive(name) { var t = document.querySelector('.tab[data-tab="' + name + '"]'); return !!(t && t.classList.contains('active')); }
  function totalUnseen() { return unseen.review + unseen.facts + unseen.guardrails; }
  function renderTitle() {
    var n = totalUnseen(), pre = n > 0 ? '(' + n + ') ' : '';
    document.title = pre + baseDocTitle;
    if (chromeTab) { chromeTab.textContent = pre + baseTabTitle; chromeTab.classList.toggle('has-unseen', n > 0); }
  }
  function bumpUnseen(name) { if (unseen[name] == null) return; if (tabIsActive(name) && !document.hidden) return; unseen[name]++; renderTitle(); }
  function clearTabUnseen(name) { if (unseen[name]) { unseen[name] = 0; renderTitle(); } }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    ['review', 'facts', 'guardrails'].forEach(function (n) { if (tabIsActive(n)) clearTabUnseen(n); });
  });

  // ---------- card helpers ----------
  function makeCard(text, type) {
    var card = document.createElement('div'); card.className = 'card fresh';
    var tick = document.createElement('span'); tick.className = 'tick'; tick.textContent = '✓';
    var body = document.createElement('div'); body.className = 'body';
    var content = document.createElement('div'); content.className = 'content editable';
    var pill = document.createElement('span'); pill.className = 'type-pill' + (type === 'guardrail' ? ' guardrail' : '');
    pill.textContent = type === 'guardrail' ? 'guardrail' : 'fact';
    content.appendChild(pill); content.appendChild(document.createTextNode(text));  // user text is text-only (XSS-safe)
    body.appendChild(content);
    var actions = document.createElement('div'); actions.className = 'actions';
    var rm = document.createElement('button'); rm.className = 'btn ghost'; rm.type = 'button'; rm.textContent = 'Remove';
    actions.appendChild(rm);
    card.appendChild(tick); card.appendChild(body); card.appendChild(actions);
    return card;
  }
  function collapse(card, flashText) {
    if (!card || card.classList.contains('leaving')) return;
    var startH = card.offsetHeight;             // real height, measured before we touch content
    card.classList.add('leaving');
    card.style.height = startH + 'px';          // lock height so the fold transitions from a real value
    if (flashText) {
      // overlay a full-card tinted panel with a single big glyph (recognized instantly —
      // no time to read a word as the card folds away in ~⅓s)
      var f = document.createElement('div'); f.className = 'skip-overlay';
      var isSkip = (flashText === 'Skipped' || flashText === 'Removed');
      var ic = document.createElement('span');
      ic.className = 'leave-icon' + (isSkip ? ' skip' : '');
      ic.textContent = isSkip ? '✕' : '✓';   // muted ✕ for skip, teal ✓ for save/confirm
      f.appendChild(ic);
      card.appendChild(f);
    }
    updateBadges();
    void card.offsetHeight;                      // commit the locked height before transitioning
    // start folding almost immediately — the label reads as it shrinks + fades
    setTimeout(function () {
      card.addEventListener('transitionend', function te(e) {
        if (e.propertyName !== 'height') return;       // remove exactly when the fold finishes — no end-snap
        card.removeEventListener('transitionend', te);
        if (card.parentNode) card.parentNode.removeChild(card);
        updateBadges();
      });
      card.classList.add('collapsing');
    }, 620);
  }
  function flashBtn(btn) {
    var old = btn.textContent; btn.textContent = 'Added ✓'; btn.classList.add('added');
    setTimeout(function () { btn.textContent = old; btn.classList.remove('added'); }, 1600);
  }
  function addFromForm(formId, panel, before, type, toastId) {
    var form = byId(formId), ta = form.querySelector('textarea'), text = ta.value.trim();
    if (!text) return;
    panel.insertBefore(makeCard(text, type), before);
    ta.value = ''; flashBtn(form.querySelector('.btn'));
    if (toastId) { var toast = byId(toastId); toast.hidden = false; setTimeout(function () { toast.hidden = true; }, 2200); }
    updateBadges();
    flashTab(panel.getAttribute('data-panel'));   // landed on another tab -> notify
  }

  // ---------- click-to-edit a saved fact/guardrail (mirrors the real app) ----------
  function editPill(card) { var p = card.querySelector('.type-pill'); return p ? { cls: p.className, label: p.textContent } : { cls: 'type-pill', label: 'fact' }; }
  function editText(card) {
    var content = card.querySelector('.content'); if (!content) return '';
    var clone = content.cloneNode(true); var p = clone.querySelector('.type-pill'); if (p) p.remove();
    return clone.textContent.trim();
  }
  function renderContent(card, text) {
    var pill = card._pill || editPill(card), body = card.querySelector('.body');
    var content = document.createElement('div');
    content.className = 'content editable'; content.setAttribute('role', 'button'); content.tabIndex = 0; content.title = 'Click to edit';
    content.innerHTML = '<span class="' + pill.cls + '">' + pill.label + '</span>';
    content.appendChild(document.createTextNode(text));
    var er = body.querySelector('.edit-row');
    if (er) er.replaceWith(content); else body.insertBefore(content, body.firstChild);
    card.querySelector('.actions').innerHTML = '<button class="btn ghost" type="button">Remove</button>';
    card.classList.remove('editing');
  }
  function enterEdit(card) {
    if (card.classList.contains('editing')) return;
    card._pill = editPill(card); card._prev = editText(card);
    var form = document.createElement('form'); form.className = 'edit-row'; form.setAttribute('onsubmit', 'return false');
    form.innerHTML = '<span class="' + card._pill.cls + '">' + card._pill.label + '</span><textarea class="edit-input" rows="1"></textarea>';
    card.querySelector('.content').replaceWith(form);
    var ta = form.querySelector('.edit-input'); ta.value = card._prev;
    card.querySelector('.actions').innerHTML = '<button class="btn primary" type="button" data-edit-save>Save</button><button class="btn ghost" type="button" data-edit-cancel>Cancel</button>';
    card.classList.add('editing');
    function grow() { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }
    ta.addEventListener('input', grow);
    ta.focus(); grow(); ta.setSelectionRange(ta.value.length, ta.value.length);
  }
  function editableCard(card) { return card && (factsPanel.contains(card) || guardPanel.contains(card)); }
  document.addEventListener('click', function (e) {
    var save = e.target.closest('[data-edit-save]');
    if (save) { var c = save.closest('.card'); var ta = c.querySelector('.edit-input'); renderContent(c, (ta && ta.value.trim()) || c._prev); return; }
    var cancel = e.target.closest('[data-edit-cancel]');
    if (cancel) { renderContent(cancel.closest('.card'), cancel.closest('.card')._prev); return; }
    var content = e.target.closest('.content.editable');
    if (content) { var card = content.closest('.card'); if (editableCard(card)) enterEdit(card); }
  });
  document.addEventListener('keydown', function (e) {
    if (!e.target.classList || !e.target.classList.contains('edit-input')) return;
    var c = e.target.closest('.card');
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); renderContent(c, e.target.value.trim() || c._prev); }
    else if (e.key === 'Escape') { renderContent(c, c._prev); }
  });

  // ---------- delegated clicks (the app is fully interactive) ----------
  document.querySelector('.desktop').addEventListener('click', function (e) {
    var btn = e.target.closest('button'); if (!btn) return;
    if (btn.id !== 'replayBtn') stopStory();                 // any real interaction takes control
    if (btn.closest('#factAdd'))  { e.preventDefault(); addFromForm('factAdd', factsPanel, factsNote, 'fact', 'factToast'); return; }
    if (btn.closest('#guardAdd')) { e.preventDefault(); addFromForm('guardAdd', guardPanel, guardForm, 'guardrail'); return; }
    var card = btn.closest('.card');
    if (btn.closest('.qform')) {                              // Save answer
      e.preventDefault();
      var ta = btn.closest('.qform').querySelector('textarea'); if (!ta.value.trim()) return;
      var beat2 = card && card.hasAttribute('data-beat2');
      collapse(card, 'Saved'); if (beat2) claudeFollowUp(); return;
    }
    if (btn.closest('.qskip')) { collapse(card, 'Skipped'); return; }
    if (card) {
      var label = btn.textContent.trim();
      if (label === 'Confirm') { var txt = card.querySelector('.content').textContent; collapse(card, 'Confirmed'); factsPanel.insertBefore(makeCard(txt, 'fact'), factsNote); updateBadges(); flashTab('facts'); }
      else if (label === 'Skip') collapse(card, 'Skipped');
      else if (label === 'Remove') collapse(card, 'Removed');
    }
  });

  // Enter submits (Shift+Enter = newline)
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || e.shiftKey || e.target.tagName !== 'TEXTAREA') return;
    var form = e.target.closest('#factAdd, #guardAdd, .qform'); if (!form) return;
    e.preventDefault(); stopStory();
    if (form.id === 'factAdd') addFromForm('factAdd', factsPanel, factsNote, 'fact', 'factToast');
    else if (form.id === 'guardAdd') addFromForm('guardAdd', guardPanel, guardForm, 'guardrail');
    else { var ta = e.target, card = ta.closest('.card'); if (!ta.value.trim()) return; var beat2 = card && card.hasAttribute('data-beat2'); collapse(card, 'Saved'); if (beat2) claudeFollowUp(); }
  });
  // focusing any field also hands control to the user
  document.addEventListener('focusin', function (e) { if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') stopStory(); });

  // ---------- David: flag a question to a human; replies arrive here, timestamped ----------
  (function davidChat() {
    var thread = byId('davThread'), input = byId('davInput'), form = byId('davCompose');
    if (!thread || !input || !form) return;
    function clock() { var d = new Date(), h = d.getHours(), m = d.getMinutes(), ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + ':' + (m < 10 ? '0' : '') + m + ' ' + ap; }
    var typingRow = document.createElement('div'); typingRow.className = 'dav-row them dav-typing';
    typingRow.innerHTML = '<div class="bubble">David is typing…</div>';
    thread.appendChild(typingRow);
    function add(side, text) {
      var row = document.createElement('div'); row.className = 'dav-row ' + side;
      var b = document.createElement('div'); b.className = 'bubble'; b.textContent = text;
      var t = document.createElement('div'); t.className = 'ts'; t.textContent = clock();
      row.appendChild(b); row.appendChild(t);
      thread.insertBefore(row, typingRow);
      thread.scrollTop = thread.scrollHeight;
    }
    function reply() {
      typingRow.classList.add('show'); thread.scrollTop = thread.scrollHeight;
      setTimeout(function () {
        typingRow.classList.remove('show');
        add('them', 'Good question. Let me look at your setup and get back to you today. If it’s easier we can grab 15 minutes; I’ll send a couple of times that work.');
      }, 1800);
    }
    function send() { var v = input.value.trim(); if (!v) return; add('me', v); input.value = ''; input.focus(); setTimeout(reply, 500); }
    form.addEventListener('click', function (e) { if (e.target.closest('button')) { e.preventDefault(); send(); } });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
  })();

  // ---- surface shared with demo.js ----
  AM.byId = byId;
  AM.showTab = showTab;
  AM.flashTab = flashTab;
  AM.updateBadges = updateBadges;
  AM.reviewPanel = reviewPanel;
  AM.factsPanel = factsPanel;
  AM.guardPanel = guardPanel;
  AM.convo = convo;
})(window.AM);
