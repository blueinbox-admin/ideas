// app.js — the engine's RENDERER. Turns window.DEMO (+ DEMO_DEFAULTS) into the
// same DOM and class names the live memoryapp emits (web/app/MemoryUI.tsx),
// styled by app.css (the verbatim globals.css copy). This is a faithful PORT of
// what the app looks like + the interactions a demo needs — NOT the live backend
// (no polling, no drip, no Supabase). Pinned to memoryapp commit 4da2522.
//
// It renders into the element #memoryapp and exposes a small window.AM surface the
// demo scaffolding (demo.js) uses to drop new memories/questions as Claude "works".
window.AM = window.AM || {};
(function (AM) {
  var DEF = window.DEMO_DEFAULTS || { features: {} };
  var CFG = window.DEMO || {};
  // boot.js resolves the effective flags (defaults <- registry <- config <- ?admin).
  // Fall back to a local merge if the engine is loaded without boot.js.
  var FEAT = window.AM_FEATURES || Object.assign({}, DEF.features, CFG.features || {});
  var ORG = Object.assign({}, DEF.org, CFG.org || {});
  var CONNECTORS = CFG.connectors || DEF.connectors || [];
  var SCOPES = CFG.scopes || [];                 // project scope keys, in display order
  var RESERVED = { org: 'Org-wide', platform: 'SFMC-general' };

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function scopeLabel(k) { return RESERVED[k] || k; }
  function isSoft(m) { return m.confidence === 'inferred'; }
  function isProject(k) { return !RESERVED[k]; }

  // ---- state (seeded from config; mutated by interactions + scaffolding drops) ----
  var memories = (CFG.seed && CFG.seed.facts || []).map(function (m, i) {
    return { id: m.id || ('seed-f-' + i), type: m.type || 'fact', content: m.content, scopes: (m.scopes || ['org']).slice(), confidence: m.confidence || null, fresh: false };
  });
  var questions = (CFG.seed && CFG.seed.questions || []).map(function (q, i) {
    return { id: q.id || ('seed-q-' + i), text: q.text, rationale: q.rationale || '', scope: q.scope || 'org', fresh: false };
  });
  var selected = [];      // [] = All; [k] focused; [a,b] union
  // open on Facts so the first surfaced fact fades in where you can see it (the
  // question that also lands pulses the Review tab). Override per demo if needed.
  var tab = CFG.startTab || 'facts';   // review | facts | credentials
  var editingId = null;
  var seq = 0;

  // ---- derived ----
  function single() { return selected.length === 1 ? selected[0] : null; }
  function memInSel(m) {
    if (!selected.length) return true;
    if (m.scopes.some(function (s) { return selected.indexOf(s) >= 0; })) return true;
    var hasProj = selected.some(isProject);                 // a project view inherits Org-wide
    return hasProj && m.scopes.indexOf('org') >= 0;
  }
  function qInSel(q) {
    if (!selected.length) return true;
    if (selected.indexOf(q.scope) >= 0) return true;
    var hasProj = selected.some(isProject);
    return hasProj && q.scope === 'org';
  }
  function shownMems() { return memories.filter(memInSel); }
  function shownQs() { return questions.filter(qInSel); }

  function chipData() {
    var keys = ['org'].concat(SCOPES);
    return keys.map(function (k) {
      return {
        key: k, label: scopeLabel(k), reserved: !!RESERVED[k],
        facts: memories.filter(function (m) { return m.scopes.indexOf(k) >= 0; }).length,
        waiting: questions.filter(function (q) { return q.scope === k; }).length,
        freshWaiting: questions.filter(function (q) { return q.scope === k && q.fresh; }).length,
      };
    }).filter(function (c) { return c.facts > 0 || c.waiting > 0 || selected.indexOf(c.key) >= 0; });
  }

  // group a fact under one representative scope (first project, else org)
  function factCategory(m) {
    var proj = m.scopes.filter(isProject).sort()[0];
    if (proj) return proj;
    return m.scopes.indexOf('org') >= 0 ? 'org' : (m.scopes[0] || 'org');
  }
  function groupFacts(list) {
    var groups = {}, order = [];
    list.forEach(function (m) {
      var k = factCategory(m);
      if (!groups[k]) { groups[k] = []; order.push(k); }
      groups[k].push(m);
    });
    order.sort(function (a, b) { return groups[b].length - groups[a].length; });
    return order.map(function (k) { return { key: k, label: scopeLabel(k), items: groups[k] }; });
  }

  // ---- render: scope chips on a fact card (the multi-scope editor) ----
  function scopeChipsHtml(m) {
    var current = m.scopes;
    var opts = ['org'].concat(SCOPES).filter(function (o) { return current.indexOf(o) < 0; });
    var chips = current.map(function (s) {
      var cls = 'scope-chip' + (s === 'org' ? ' org' : '') + (s === 'platform' ? ' platform' : '');
      return '<span class="' + cls + '">' + esc(scopeLabel(s)) +
        '<button type="button" class="scope-x" title="Remove scope" data-rm-scope="' + esc(s) + '" data-mid="' + m.id + '">×</button></span>';
    }).join('');
    if (!current.length) chips = '<span class="scope-chip untriaged">needs scope</span>';
    var add = opts.length ? '<select class="scope-add" data-add-scope="' + m.id + '"><option value="">+ scope</option>' +
      opts.map(function (o) { return '<option value="' + esc(o) + '">' + esc(scopeLabel(o)) + '</option>'; }).join('') + '</select>' : '';
    // co-tag suggestion: if this fact has a project scope, suggest one other project it doesn't carry
    var sug = '';
    if (FEAT.coTagSuggestions && current.some(isProject)) {
      var cand = SCOPES.filter(function (o) { return current.indexOf(o) < 0; })[0];
      if (cand) sug = '<button type="button" class="scope-suggest" data-add-scope-val="' + esc(cand) + '" data-mid="' + m.id + '">+ ' + esc(cand) + '?</button>';
    }
    return '<div class="scope-pick"><span class="scope-pick-label">Applies to</span><div class="scope-chips">' + chips + add + sug + '</div></div>';
  }

  function factCardHtml(m) {
    var soft = FEAT.softFacts && isSoft(m);
    var editing = editingId === m.id;
    // No category/type pill ("fact"/"mapping"/"guardrail") — the live memoryapp
    // dropped these, so we mirror that. The "assumed" tag (soft facts) stays.
    var pill = '';
    var body;
    if (editing) {
      body = '<form class="field-row" data-edit="' + m.id + '">' + pill +
        '<textarea class="field edit-input" rows="1">' + esc(m.content) + '</textarea></form>';
    } else {
      body = '<div class="field-row">' + pill +
        (soft ? '<span class="assumed-tag" title="Claude inferred this — fix it if it is wrong">assumed</span>' : '') +
        '<div class="field editable" role="button" tabindex="0" title="Click to edit" data-editopen="' + m.id + '">' + esc(m.content) + '</div></div>';
    }
    var actions = editing
      ? '<button class="btn primary" type="button" data-edit-save="' + m.id + '">Save</button><button class="btn ghost" type="button" data-edit-cancel="1">Cancel</button>'
      : (soft ? '<button class="btn ghost" type="button" data-looksright="' + m.id + '" title="Clear the assumed mark">Looks right</button>' : '') +
        '<button class="btn ghost" type="button" data-remove="' + m.id + '">Remove</button>';
    return '<div class="card' + (m.fresh ? ' fresh surfaced' : '') + (editing ? ' editing' : '') + (soft ? ' assumed' : '') + '" data-card="' + m.id + '">' +
      '<span class="tick">' + (soft ? '~' : '✓') + '</span>' +
      '<div class="body">' + body + scopeChipsHtml(m) + '</div>' +
      '<div class="actions card-actions">' + actions + '</div></div>';
  }

  function questionCardHtml(q) {
    var showProj = !single();
    return '<div class="card qcard' + (q.fresh ? ' is-new' : '') + '" data-q="' + q.id + '"><div class="body">' +
      (showProj ? '<div class="meta"><span class="proj-tag' + (q.scope === 'org' ? ' root' : '') + '">' + esc(scopeLabel(q.scope)) + '</span></div>' : '') +
      '<div class="content">' + esc(q.text) + '</div>' +
      (q.rationale ? '<div class="qwhy">Why Claude asks: ' + esc(q.rationale) + '</div>' : '') +
      '<form class="qform" data-answer="' + q.id + '"><textarea></textarea>' +
      '<div class="actions"><button class="btn primary" type="submit">Save answer</button></div></form>' +
      '</div><div class="qskip"><button class="btn ghost" type="button" data-skip="' + q.id + '">Skip</button></div></div>';
  }

  // the app's own header (brand + connectors + agent liveness), all from config —
  // this is where "different platforms per demo" actually shows.
  function topbarHtml() {
    var conn = CONNECTORS.map(function (c) {
      return '<span class="conn-item"><span class="conn-dot app"></span>' + esc(c.label) + (c.mode ? ' · ' + esc(c.mode) : '') + '</span>';
    }).join('');
    if (FEAT.claudeCodeWindow || CFG.agentSurface === 'embedded') {
      conn += '<span class="conn-item conn-working"><span class="conn-dot pulse"></span>' + esc(CFG.agentLabel || 'Claude Code') + ' · working</span>';
    }
    return '<header class="topbar"><div class="topbar-inner">' +
      '<div><div class="brand"><span class="mark">◧</span>' + esc(ORG.product || 'Memory') + '</div>' +
      (ORG.tagline ? '<div class="tagline">' + esc(ORG.tagline) + '</div>' : '') + '</div>' +
      '<div class="topbar-right"><div class="conn">' + conn + '</div><div class="org">' + esc(ORG.name) + '</div></div>' +
      '</div></header>';
  }

  function subText() {
    if (!selected.length) return 'Everything Claude knows across your org. Filter to a project — or several — with the pills below.';
    if (selected.length >= 2) return 'Facts tagged ' + selected.map(scopeLabel).join(' or ') + '. A browse across these scopes; pick a single one to answer its questions.';
    var s = selected[0];
    if (s === 'org') return 'Memory that applies to every project — credentials, business units, org-wide conventions and gotchas.';
    return 'Facts and rules specific to ' + s + '. Claude gets these plus your org-wide memory whenever it works on this project.';
  }

  function render() {
    var root = document.getElementById('memoryapp');
    if (!root) return;
    var qs = shownQs(), ms = shownMems();
    var waiting = qs.length;
    var isRoot = !selected.length || single() === 'org';
    var showCred = FEAT.credentialsTab && isRoot;

    // scope pills
    var pills = '<button class="pill all' + (!selected.length ? ' active' : '') + '" type="button" data-pill="__all">All</button>';
    chipData().forEach(function (c) {
      var active = selected.indexOf(c.key) >= 0;
      // green cue ONLY for a freshly-surfaced question, never for the seeded baseline.
      pills += '<button class="pill' + (active ? ' active' : '') + (c.freshWaiting > 0 ? ' flash' : '') + '" type="button" data-pill="' + esc(c.key) + '">' +
        '<span class="pill-label">' + esc(c.label) + '</span><span class="pill-count">' + c.facts + '</span>' +
        (c.freshWaiting > 0 ? '<span class="pill-dot" title="new question"></span>' : '') + '</button>';
    });

    // tabs — a tab whose content just got a fresh item (while you're elsewhere)
    // pulses its background, so you notice without being yanked off your tab.
    var activeTab = (tab === 'credentials' && !showCred) ? 'review' : tab;
    var freshQ = questions.some(function (q) { return q.fresh; });
    var freshM = memories.some(function (m) { return m.fresh; });
    var tabsHtml =
      '<button class="tab' + (tab === 'review' ? ' active' : '') + (freshQ && activeTab !== 'review' ? ' flash' : '') + '" data-tab="review"><span class="tab-label" data-label="Review">Review</span>' + (waiting > 0 ? '<span class="badge amber">' + waiting + '</span>' : '') + '</button>' +
      '<button class="tab' + (tab === 'facts' ? ' active' : '') + (freshM && activeTab !== 'facts' ? ' flash' : '') + '" data-tab="facts"><span class="tab-label" data-label="Facts">Facts</span>' + (ms.length > 0 ? '<span class="badge">' + ms.length + '</span>' : '') + '</button>' +
      (showCred ? '<button class="tab' + (tab === 'credentials' ? ' active' : '') + '" data-tab="credentials"><span class="tab-label" data-label="Credentials">Credentials</span></button>' : '');
    var section = '';
    if (activeTab === 'review') {
      section += '<section><div class="legend">Questions to answer</div>' +
        '<p class="note">Things only your team can answer — ownership, intent, the calls a guess could get wrong. Answer one and it becomes a confirmed fact on the Facts tab.</p>';
      section += qs.length ? '<div class="scroll">' + qs.map(questionCardHtml).join('') + '</div>'
        : '<p class="empty">All caught up — nothing waiting on you here.</p>';
      section += '</section>';
    } else if (activeTab === 'facts') {
      var focus = single() && single() !== 'org' ? single() : null;
      section += '<section><div class="legend">Add your own</div>' +
        '<p class="note">' + (focus ? 'A fact, mapping, or rule about ' + esc(focus) + ', so Claude works better for you.' : 'A fact, mapping, or convention true across your org, so Claude works better for you.') + '</p>' +
        '<form class="addform" data-add="1"><textarea placeholder="A fact or rule (e.g. which DE is the real audience, a naming convention, a never-do)."></textarea><button class="btn primary" type="submit">Add</button></form>' +
        '<div class="legend" style="margin-top:24px;">Confirmed facts</div>' +
        '<p class="note">What Claude actually knows ' + (focus ? 'about ' + esc(focus) : 'about your org') + ' — what it learned while working, your answers, and the facts you added. Click any to edit or remove.</p>';
      if (!ms.length) {
        section += '<p class="empty">Nothing saved yet — Claude adds facts as it works, or add one above.</p>';
      } else {
        var groups = FEAT.factGrouping ? groupFacts(ms) : [{ key: '_', label: '', items: ms }];
        if (groups.length > 1) {
          section += groups.map(function (g) {
            return '<div class="fact-group"><div class="fact-group-head">' + esc(g.label) + '<span class="fact-group-count">' + g.items.length + '</span></div>' +
              g.items.map(factCardHtml).join('') + '</div>';
          }).join('');
        } else {
          section += '<div>' + ms.map(factCardHtml).join('') + '</div>';
        }
      }
      section += '</section>';
    } else if (activeTab === 'credentials') {
      section += credentialsHtml();
    }

    root.innerHTML =
      topbarHtml() +
      '<main class="content">' +
      '<div class="scope-head"><h1 class="scope-title">' + esc(ORG.name) + '</h1></div>' +
      '<p class="scope-sub">' + esc(subText()) + '</p>' +
      '<nav class="tabs">' + tabsHtml + '</nav>' +
      '<div class="scopebar-head">Filter by scope</div>' +
      '<div class="scopebar">' + pills + '</div>' +
      '<div class="scope-sections">' + section + '</div>' +
      '</main>';

    // focus the open editor / answer box
    if (editingId) { var ta = root.querySelector('.edit-input'); if (ta) { ta.style.height = 'auto'; ta.style.height = (ta.scrollHeight + 2) + 'px'; ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } }
    // clear one-shot fresh flags after paint (so a later filter/tab re-render
    // does not replay the surfacing animation). The cues themselves are CSS and
    // fade out on their own; this just resets the state.
    memories.forEach(function (m) { if (m.fresh) setTimeout(function () { m.fresh = false; }, 2300); });
    questions.forEach(function (q) { if (q.fresh) setTimeout(function () { q.fresh = false; }, 2300); });
  }

  function credentialsHtml() {
    var rows = [['Subdomain', 'mcxxxxxxxxxxxxxxxxxxxx'], ['Auth base URI', 'https://mcxxx.auth.marketingcloudapis.com/'], ['REST base URI', 'https://mcxxx.rest.marketingcloudapis.com/']];
    return '<section><div class="legend">' + esc((CONNECTORS[0] && CONNECTORS[0].label) || 'Connection') + ' credentials</div>' +
      '<p class="note">The connection Claude uses to read your org. Stored in your app so Claude always has it. Keep this app private — it has no login.</p>' +
      '<div class="cred-form"><div class="cred-group"><div class="cred-group-head">Connection</div>' +
      rows.map(function (r) { return '<label class="cred-field"><span class="cred-label">' + esc(r[0]) + '</span><input class="cred-input" value="' + esc(r[1]) + '" readonly></label>'; }).join('') +
      '</div></div></section>';
  }

  // ---- interactions ----
  function byId(id) { return document.getElementById(id); }
  function flash(el) { if (!el) return; el.classList.add('is-new'); setTimeout(function () { el.classList.remove('is-new'); }, 2600); }

  document.addEventListener('click', function (e) {
    var root = byId('memoryapp'); if (!root || !root.contains(e.target)) {
      // allow scaffolding outside #memoryapp to still work via its own handlers
    }
    var t;
    if ((t = e.target.closest('[data-tab]'))) { tab = t.getAttribute('data-tab'); render(); return; }
    if ((t = e.target.closest('[data-pill]'))) {
      var k = t.getAttribute('data-pill');
      if (k === '__all') selected = [];
      else if (!FEAT.multiScope) selected = [k];
      else { var i = selected.indexOf(k); if (i >= 0) selected.splice(i, 1); else selected.push(k); }
      render(); return;
    }
    if ((t = e.target.closest('[data-editopen]'))) { editingId = t.getAttribute('data-editopen'); render(); return; }
    if ((t = e.target.closest('[data-edit-cancel]'))) { editingId = null; render(); return; }
    if ((t = e.target.closest('[data-edit-save]'))) {
      var m = find(t.getAttribute('data-edit-save')); var ta = t.closest('.card').querySelector('.edit-input');
      if (m && ta) m.content = ta.value.trim() || m.content; editingId = null; render(); return;
    }
    if ((t = e.target.closest('[data-remove]'))) { remove(t.getAttribute('data-remove')); render(); return; }
    if ((t = e.target.closest('[data-looksright]'))) { var mm = find(t.getAttribute('data-looksright')); if (mm) mm.confidence = null; render(); return; }
    if ((t = e.target.closest('[data-rm-scope]'))) {
      var mr = find(t.getAttribute('data-mid')), sc = t.getAttribute('data-rm-scope');
      if (mr) mr.scopes = mr.scopes.filter(function (x) { return x !== sc; }); render(); return;
    }
    if ((t = e.target.closest('[data-add-scope-val]'))) {
      var ma = find(t.getAttribute('data-mid')); if (ma) ma.scopes.push(t.getAttribute('data-add-scope-val')); render(); return;
    }
    if ((t = e.target.closest('[data-skip]'))) { questions = questions.filter(function (q) { return q.id !== t.getAttribute('data-skip'); }); render(); return; }
  });
  document.addEventListener('change', function (e) {
    var sel = e.target.closest('[data-add-scope]');
    if (sel && sel.value) { var m = find(sel.getAttribute('data-add-scope')); if (m) m.scopes.push(sel.value); render(); }
  });
  document.addEventListener('submit', function (e) {
    var f;
    if ((f = e.target.closest('[data-answer]'))) {
      e.preventDefault(); var q = questions.filter(function (x) { return x.id === f.getAttribute('data-answer'); })[0];
      var ta = f.querySelector('textarea'); if (!q || !ta.value.trim()) return;
      questions = questions.filter(function (x) { return x.id !== q.id; });
      memories.unshift({ id: 'ans-' + (seq++), type: 'fact', content: ta.value.trim(), scopes: [q.scope], confidence: null, fresh: true });
      render(); return;
    }
    if ((f = e.target.closest('[data-add]'))) {
      e.preventDefault(); var box = f.querySelector('textarea'); if (!box.value.trim()) return;
      var sc = single() && single() !== 'platform' ? single() : 'org';
      memories.unshift({ id: 'add-' + (seq++), type: 'fact', content: box.value.trim(), scopes: [sc], confidence: null, fresh: true });
      render(); return;
    }
    if ((f = e.target.closest('[data-edit]'))) { e.preventDefault(); }
  });

  function find(id) { return memories.filter(function (m) { return m.id === id; })[0]; }
  function remove(id) { memories = memories.filter(function (m) { return m.id !== id; }); }

  // ---- surface for the demo scaffolding (demo.js) ----
  // Drops do NOT yank the tab. If the item lands on the tab you're viewing, its
  // card fades in; if it lands on another tab, that tab's background pulses.
  AM.dropMemory = function (o) {
    memories.unshift({ id: o.id || ('drop-' + (seq++)), type: o.type || 'fact', content: o.content, scopes: (o.scopes || ['org']).slice(), confidence: o.confidence || null, fresh: true });
    render();
    // bring the just-surfaced fact into view so it's clearly seen emerging
    var el = document.querySelector('#memoryapp .card.surfaced');
    if (el && el.scrollIntoView) setTimeout(function () { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 70);
  };
  AM.dropQuestion = function (o) {
    questions.unshift({ id: o.id || ('dropq-' + (seq++)), text: o.text, rationale: o.rationale || '', scope: o.scope || 'org', fresh: true });
    render();
  };
  AM.render = render;
  AM.state = function () { return { memories: memories, questions: questions, selected: selected, tab: tab }; };
  AM.features = FEAT;
  AM.org = ORG;
  AM.connectors = CONNECTORS;

  // boot
  if (document.readyState !== 'loading') render();
  else document.addEventListener('DOMContentLoaded', render);
})(window.AM);
