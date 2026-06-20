  // ---- Left tabs ----
  document.getElementById('tabs').addEventListener('click', function (e) {
    var tab = e.target.closest('.tab');
    if (!tab) return;
    var name = tab.getAttribute('data-tab');
    document.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('active', t === tab); });
    document.querySelectorAll('.panel').forEach(function (p) {
      p.classList.toggle('active', p.getAttribute('data-panel') === name);
    });
  });

  // ---- Suggested facts drop in on their own, lighting up the Facts tab badge ----
  var SUGGESTIONS = [
    { src: 'From SFMC', text: 'You have 15 synced data extensions, all with a _Salesforce suffix (Contact_Salesforce, CampaignMember_Salesforce, and so on).' },
    { src: 'From SFMC', text: 'ENT.All_Contacts_Subscribed is your sendable DE of opted-in subscribers, keyed on Subscriber Key.' },
    { src: 'From SFMC', text: 'Most of your automations are scheduled to run in the early morning, Central time.' }
  ];
  function setFactsBadge() {
    var b = document.getElementById('badge-facts');
    var box = document.getElementById('suggestList');
    if (!b || !box) return;
    var n = box.querySelectorAll('.suggest:not(.gone)').length;
    b.textContent = n ? String(n) : '';
  }
  (function dripSuggestions() {
    var box = document.getElementById('suggestList');
    if (!box) return;
    SUGGESTIONS.forEach(function (s, i) {
      setTimeout(function () {
        var card = document.createElement('div');
        card.className = 'suggest enter';
        card.innerHTML =
          '<div class="suggest-main">' +
            '<span class="suggest-src">' + s.src + '</span>' +
            '<span class="suggest-text">' + s.text + '</span>' +
          '</div>' +
          '<div class="suggest-actions">' +
            '<button class="btn btn-save suggest-add" type="button">Add</button>' +
            '<button class="btn-skip suggest-dismiss" type="button">Dismiss</button>' +
          '</div>';
        box.insertBefore(card, box.firstChild); // newest drops in at the top
        void card.offsetHeight; // reflow, then animate in
        card.classList.remove('enter');
        card.classList.add('fresh');
        setFactsBadge(); // light up the Facts tab notification
        setTimeout(function () { card.classList.remove('fresh'); }, 3600); // green glow holds, then fades out slowly
      }, 2000 + i * 25000); // same cadence as the Build Memory feed (INTERVAL_MS)
    });
  })();

  // ---- Other facts: add one fact at a time ----
  (function () {
    var add = document.getElementById('factAdd');
    var input = document.getElementById('factInput');
    var list = document.getElementById('factlist');
    function esc(s) { return s.replace(/</g, '&lt;'); }
    function rowHtml(text) {
      return '<span class="tick">✓</span> <span class="fact-text" title="Click to edit">' + esc(text) + '</span>' +
        '<button class="fact-del" type="button">Delete</button>';
    }
    function addFactRow(text, fresh) {
      var row = document.createElement('div');
      row.className = 'fact' + (fresh === false ? '' : ' fresh');
      row.innerHTML = rowHtml(text);
      list.appendChild(row);
      if (fresh !== false) setTimeout(function () { row.classList.remove('fresh'); }, 1400);
      if (window.mmAdvance) window.mmAdvance();
      return row;
    }
    // Expose so an answered Proactive Question can distill into a saved fact here.
    window.mmAddFact = function (text) { return addFactRow(text, true); };
    // Wrap the text of the pre-seeded fact rows so they're click-to-editable too.
    Array.prototype.forEach.call(list.querySelectorAll('.fact'), function (row) {
      if (row.querySelector('.fact-text')) return;
      var del = row.querySelector('.fact-del');
      var text = row.textContent.replace('✓', '').replace('Delete', '').trim();
      row.innerHTML = rowHtml(text);
    });
    function addFact() {
      var v = input.value.trim();
      if (!v) return;
      addFactRow(v);
      input.value = '';
      input.focus();
    }
    add.addEventListener('click', addFact);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') addFact(); });

    // ---- click-to-edit a saved fact ----
    function enterEdit(row) {
      if (row.classList.contains('editing')) return;
      var cur = row.querySelector('.fact-text');
      var text = cur ? cur.textContent : '';
      row.classList.add('editing');
      row.innerHTML = '<span class="tick">✓</span>' +
        '<input class="fact-edit-input" type="text">' +
        '<button class="btn btn-save fact-save" type="button">Save</button>' +
        '<button class="btn-skip fact-cancel" type="button">Cancel</button>';
      var inp = row.querySelector('.fact-edit-input');
      inp.value = text; inp.focus(); inp.setSelectionRange(text.length, text.length);
    }
    function commitEdit(row) {
      var inp = row.querySelector('.fact-edit-input');
      var v = inp && inp.value.trim();
      row.classList.remove('editing');
      row.innerHTML = rowHtml(v || (row._prev || ''));
    }
    list.addEventListener('click', function (e) {
      var row = e.target.closest('.fact');
      if (!row) return;
      if (e.target.closest('.fact-del')) {
        row.classList.add('gone');
        setTimeout(function () { row.remove(); }, 280);
        return;
      }
      if (e.target.closest('.fact-cancel')) { row.classList.remove('editing'); row.innerHTML = rowHtml(row._prev || ''); return; }
      if (e.target.closest('.fact-save')) { commitEdit(row); return; }
      if (e.target.closest('.fact-text')) {
        var cur = row.querySelector('.fact-text');
        row._prev = cur ? cur.textContent : '';
        enterEdit(row);
      }
    });
    list.addEventListener('keydown', function (e) {
      var row = e.target.closest('.fact.editing');
      if (!row) return;
      if (e.key === 'Enter') { e.preventDefault(); commitEdit(row); }
      else if (e.key === 'Escape') { row.classList.remove('editing'); row.innerHTML = rowHtml(row._prev || ''); }
    });

    // suggested facts: approve one to move it into your facts, or dismiss it
    var suggestList = document.getElementById('suggestList');
    if (suggestList) {
      suggestList.addEventListener('click', function (e) {
        var card = e.target.closest('.suggest');
        if (!card) return;
        if (e.target.closest('.suggest-add')) {
          var t = card.querySelector('.suggest-text');
          if (t) addFactRow(t.textContent.trim());
        } else if (!e.target.closest('.suggest-dismiss')) {
          return;
        }
        card.classList.add('gone');
        setFactsBadge(); // clear the notification count as suggestions are handled
        setTimeout(function () { card.remove(); }, 280);
      });
    }
  })();

  // ---- Guardrails: suggested guardrails (confirm/skip) + add your own ----
  var GUARD_SUGGESTIONS = [
    { src: 'Claude noticed', text: 'Always PUT the full asset when updating a 207 (template) email. Never PATCH it, that wipes the content and bricks it.' },
    { src: 'Claude noticed', text: 'Never activate a journey whose name starts with TEST_.' },
    { src: 'Claude noticed', text: 'Never use Lead.Email as a join key. It is empty for almost all real Leads.' }
  ];
  function setGuardBadge() {
    var b = document.getElementById('badge-guard');
    var box = document.getElementById('suggestListG');
    if (!b || !box) return;
    var n = box.querySelectorAll('.suggest:not(.gone)').length;
    b.textContent = n ? String(n) : '';
  }
  (function dripGuardrails() {
    var box = document.getElementById('suggestListG');
    if (!box) return;
    GUARD_SUGGESTIONS.forEach(function (s, i) {
      setTimeout(function () {
        var card = document.createElement('div');
        card.className = 'suggest enter';
        card.innerHTML =
          '<div class="suggest-main">' +
            '<span class="suggest-src">' + s.src + '</span>' +
            '<span class="suggest-text">' + s.text + '</span>' +
          '</div>' +
          '<div class="suggest-actions">' +
            '<button class="btn btn-save suggest-add" type="button">Add</button>' +
            '<button class="btn-skip suggest-dismiss" type="button">Dismiss</button>' +
          '</div>';
        box.insertBefore(card, box.firstChild);
        void card.offsetHeight;
        card.classList.remove('enter');
        card.classList.add('fresh');
        setGuardBadge();
        setTimeout(function () { card.classList.remove('fresh'); }, 3600);
      }, 3000 + i * 25000);
    });
  })();

  // ---- Guardrails: add one at a time + accept/dismiss suggestions ----
  (function () {
    var add = document.getElementById('guardAdd');
    var input = document.getElementById('guardInput');
    var list = document.getElementById('guardlist');
    if (!add || !input || !list) return;
    function addRow(text) {
      var row = document.createElement('div');
      row.className = 'fact fresh';
      row.innerHTML = '<span class="tick">✓</span> ' + text.replace(/</g, '&lt;') +
        '<button class="fact-del" type="button">Delete</button>';
      list.appendChild(row);
      setTimeout(function () { row.classList.remove('fresh'); }, 1400);
      if (window.mmAdvance) window.mmAdvance();
    }
    function addGuard() {
      var v = input.value.trim();
      if (!v) return;
      addRow(v);
      input.value = '';
      input.focus();
    }
    add.addEventListener('click', addGuard);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') addGuard(); });
    list.addEventListener('click', function (e) {
      if (!e.target.closest('.fact-del')) return;
      var row = e.target.closest('.fact');
      row.classList.add('gone');
      setTimeout(function () { row.remove(); }, 280);
    });
    var sg = document.getElementById('suggestListG');
    if (sg) {
      sg.addEventListener('click', function (e) {
        var card = e.target.closest('.suggest');
        if (!card) return;
        if (e.target.closest('.suggest-add')) {
          var t = card.querySelector('.suggest-text');
          if (t) addRow(t.textContent.trim());
        } else if (!e.target.closest('.suggest-dismiss')) {
          return;
        }
        card.classList.add('gone');
        setGuardBadge();
        setTimeout(function () { card.remove(); }, 280);
      });
    }
  })();

  // ---- Ask David: simple back-and-forth chat (mock) ----
  (function () {
    var chat = document.getElementById('chat');
    var input = document.getElementById('chatInput');
    var send = document.getElementById('chatSend');
    var typing = document.getElementById('chatTyping');
    if (!chat || !input || !send) return;
    function add(side, text) {
      var m = document.createElement('div');
      m.className = 'msg ' + side;
      var b = document.createElement('span');
      b.className = 'bubble';
      b.textContent = text;
      m.appendChild(b);
      chat.insertBefore(m, typing); // keep the typing row last
      chat.scrollTop = chat.scrollHeight;
    }
    function sendMsg() {
      var v = input.value.trim();
      if (!v) return;
      add('me', v);
      input.value = '';
      input.focus();
      setTimeout(function () { typing.classList.add('show'); chat.scrollTop = chat.scrollHeight; }, 500);
      setTimeout(function () {
        typing.classList.remove('show');
        add('them', 'Got it, let me take a look and get back to you. I usually reply the same day.');
      }, 2300);
    }
    send.addEventListener('click', sendMsg);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') sendMsg(); });
  })();

  // ---- Question feeds: preset questions fade in over time, as if Claude is working next door ----
  // The good questions are the ones Claude can't answer on its own: definitions, rules, and
  // preferences that live only in your head, never in the SFMC API itself.
  var factsQ = document.getElementById('factsQ');
  var siteQ = document.getElementById('siteQ');
  var formBody = document.getElementById('formBody');

  // Questions are DURABLE facts about the business, not live "Claude is stuck right now"
  // questions. The user answers whenever. Each one teaches Claude something it can't infer
  // on its own, and improves every future task.

  // Every question is something Claude CANNOT see or glean: definitions, private rules,
  // and preferences. Nothing derivable from the SFMC API itself.

  // already-answered seed (shows the queue -> profile loop, and how it improves Claude)
  var SEED_ANSWERED = {
    meta: 'A rule for your sends', source: 'Your team',
    context: 'You just asked Claude to "test the new nurture journey."',
    ask: 'When Claude tests a build, should it ever send to real patients, or always use test leads in the sandbox with sends off?',
    answer: 'Test leads only, sends off. Real patients never get a test send.',
    ph: 'e.g. test leads only, never real patients...',
    improve: {
      before: 'Your never-test-on-real-patients rule was said out loud, never set as a guardrail Claude works under. With nothing holding it back, Claude could fire a test straight at your opted-in patients.',
      cost: 'A test send could land in a real patient inbox before you had seen it.',
      now: 'it tests on mailinator leads with sends off, and nothing reaches a real patient until you activate it.'
    }
  };

  // open seed (already waiting when the page loads)
  var SEED_OPEN = {
    meta: 'A rule for your queries', source: 'Your team',
    context: 'You just asked Claude to "pull this send\'s audience with their mailing address."',
    ask: 'Which data extension holds the current mailing address, and what key joins it to your send audience? Claude can see several DEs with address fields, but not which one you treat as the real one.',
    ph: 'e.g. join the send DE to All_Patients on Subscriber Key, addresses live there...',
    improve: {
      before: 'Claude can read your DE schemas, but it has no way to know which address DE is authoritative or which key joins it to your audience. That lives only in your team\'s heads, so it joined the wrong DE or the wrong key.',
      cost: 'Address fields came back blank or stale for a chunk of records, and you re-ran the pull by hand every time.',
      now: 'it joins the right address DE on your key every time, so every record comes back with a current address on the first try.'
    }
  };

  // these fade in over time. All SFMC and how-the-team-works questions.
  // Each carries a "context" line: what you said in Claude Code that prompted the question.
  var FEED = [
    {
    meta: 'A rule for your queries', source: 'Your team',
    context: 'You just asked Claude to "pull this week\'s new leads by campaign."',
    ask: 'Should Claude attribute patients through Lead, or through CampaignMember? Lead.Email is empty for almost all your real Leads, so it is not a usable join key.',
    ph: 'e.g. use CampaignMember, Lead.Email is empty for real leads...',
    improve: {
      before: 'That Lead.Email is empty for nearly all your real Leads is something only your team knows; the schema shows the field as if it were populated. So Claude kept joining on Lead.Email and silently dropped almost everyone.',
      cost: 'Every attribution report came back nearly empty, and the numbers looked wrong but you could not see why.',
      now: 'it attributes through CampaignMember and the converted Contact, so the report covers real patients instead of the handful of test leads.'
    }
  },
    {
    meta: 'A rule for your queries', source: 'Your team',
    context: 'You just asked Claude to "query CampaignMember from a Marketing BU query activity."',
    ask: 'When Claude writes Query Activity SQL against a synced DE, it needs the ENT. prefix or SFMC errors. Should that be the default for every synced-DE query?',
    ph: 'e.g. yes, always prefix synced DEs with ENT....',
    improve: {
      before: 'That synced DEs need the ENT. prefix from a Marketing BU Query Activity is an SFMC quirk, not something the schema hints at. With no rule saved, Claude wrote the bare table name and the query errored every run.',
      cost: 'Every query failed with "not a known data extension," and you fixed the same prefix by hand each time.',
      now: 'it prefixes synced DEs with ENT. automatically, so the query runs the first time.'
    }
  },
    {
    meta: 'A rule for your queries', source: 'Your team',
    context: 'You just asked Claude to "read rows from Contact_Salesforce in a script."',
    ask: 'Direct API reads of the synced _Salesforce DEs need the Parent BU credentials, not the Marketing BU. Should Claude always reach for the Parent BU creds on those reads?',
    ph: 'e.g. yes, Parent BU creds for direct reads of synced DEs...',
    improve: {
      before: 'Which credentials work for a direct read of a synced DE is a setup detail only your team knows; the API does not advertise it. So Claude used the Marketing BU creds and hit "Invalid object name" every time.',
      cost: 'Every script errored on the first read, and you swapped in the Parent BU creds by hand.',
      now: 'it uses the Parent BU credentials for direct reads of synced DEs, so the script works without a retry.'
    }
  },
    // ---- SFMC + how the team works ----
    { meta: 'A rule for your sends', source: 'Your team',
      context: 'You just asked Claude to "build the audience for the nurture journey."',
      ask: 'Which DE is the source of truth for who you can email, and what are the send rules? Opt-in only, quiet hours, content you never send in nurture?',
      ph: 'e.g. ENT.All_Contacts_Subscribed, opt-in only, no quiet-hours sends...',
      improve: {
        before: 'Which DE is the real send list and what the suppression rules are lives in your team\'s heads, not in any field. Working off whatever DE looked right, Claude built audiences off stale or non-opted-in lists.',
        cost: 'You hand-checked every audience build to be sure it was opt-in only and the right source.',
        now: 'it builds from your source-of-truth DE under your send rules, so audiences are safe to activate.'
      } },
    { meta: 'A rule for your builds', source: 'Your team',
      context: 'You just asked Claude to "create a send DE and an automation for the welcome series."',
      ask: 'What is your naming convention for DEs, automations, and journeys? And how do you mark test vs prod objects?',
      ph: 'e.g. purpose first, test_ prefix for sandbox, no prefix for prod...',
      improve: {
        before: 'Your naming convention is a team standard, invisible in the API. With no rule to follow, Claude named new objects however it liked, so test and prod objects were hard to tell apart.',
        cost: 'You renamed objects by hand and chased down which ones were safe to point a real send at.',
        now: 'it names new objects your way and marks test vs prod clearly, so nothing gets mixed up.'
      } },
    { meta: 'How your team works', source: 'Your team',
      context: 'You just asked Claude to "set up the journey for the new campaign."',
      ask: 'Walk Claude through how a journey goes from build to live here. What are the steps from sandbox test to a real send?',
      ph: 'e.g. build, test on mailinator leads, swap source DE, activate...',
      improve: {
        before: 'Your go-live steps lived only in your team\'s heads, never written as a procedure Claude could follow. So each time it built a journey, it rebuilt the order from scratch and skipped steps.',
        cost: 'A build went live a different way each time, and you re-checked the whole thing by hand.',
        now: 'it follows your go-live steps in order, so every journey ships the same safe path.'
      } },
    { meta: 'How your team works', source: 'Your team',
      context: 'You just asked Claude to "run the calendar report query."',
      ask: 'Which Business Unit should Claude use for which task? Calendar and KPI work in Marketing, direct synced-DE reads through Parent.',
      ph: 'e.g. Marketing BU for query activities, Parent BU for direct reads...',
      improve: {
        before: 'Which BU to use for which task is a setup detail only your team knows, not something the API surfaces. With no rule, Claude picked the wrong BU and the call errored or returned nothing.',
        cost: 'You sorted out the right BU for every task, because Claude could not tell which one fit.',
        now: 'it uses the right BU for each task, so calls land where they should without a retry.'
      } },
    { meta: 'A rule for your queries', source: 'Your team',
      context: 'You just asked Claude to "bucket campaigns into service lines."',
      ask: 'When Claude maps a free-text field like Campaign.Name into a clean bucket, should it use your hand-curated lookup DE with a CHARINDEX prefix join?',
      ph: 'e.g. yes, join the prefix map with CHARINDEX, not LIKE...',
      improve: {
        before: 'That SFMC SQL needs a CHARINDEX prefix join instead of a dynamic LIKE is a workaround only your team knows. With no rule saved, Claude wrote LIKE patterns that returned nothing or the wrong bucket.',
        cost: 'Service-line buckets came back wrong, and you patched the mapping query by hand each run.',
        now: 'it joins your prefix lookup with CHARINDEX, so each value lands in the right bucket the first time.'
      } },
  ];

  // ---- Health checks: proactive "Claude noticed X, want me to act?" questions.
  // Each one delivers value the moment you say yes (the fix ships) AND saves a rule.
  // These don't act on your org. Each one saves a rule (what the app does) and
  // hands you a line to run in Claude Code (where the connected tools do the work).
  var SITE_FEED = [
    { source: 'Health checks',
      context: 'Claude noticed: your Daily_Send_Refresh automation refreshes the send DE at 5:15 AM CT, but the send runs at 5:00 AM. The send goes out before the data is updated.',
      ask: 'Want it to be a rule that the refresh always finishes before any send that reads its DE?',
      ph: 'e.g. yes, refresh must land before the send...',
      cc: 'Reschedule Daily_Send_Refresh to finish before the 5:00 AM send, or move the send after the refresh.',
      improve: {
        before: 'The send fired off yesterday\'s data because the refresh had not run yet, and nothing flagged the order.',
        cost: 'Patients got a stale send every morning, and no one noticed until the numbers looked off.',
        now: 'Claude checks send and refresh ordering on every build, and you have the line to fix this one now.'
      } },
    { source: 'Health checks',
      context: 'Claude noticed: your new-patient journey uses Lead.Email as its entry, but Lead.Email is empty for almost all your real Leads, so most never enter.',
      ask: 'Want Claude to flag entry sources built on empty join keys from now on?',
      ph: 'e.g. yes, flag empty join keys...',
      cc: 'Switch the new-patient journey entry from Lead.Email to the converted Contact path.',
      improve: {
        before: 'The journey looked active but almost no one entered it, because the entry keyed off a field that is empty for real Leads.',
        cost: 'Most new patients silently skipped the welcome series, and the journey looked fine in the UI.',
        now: 'Claude flags entry sources built on empty join keys, and you have the line to fix this one now.'
      } },
    { source: 'Health checks',
      context: 'Claude noticed: your event-test-emails-sandbox automation has been paused 38 days but is still on its schedule.',
      ask: 'Want Claude to flag automations that are paused but still scheduled from now on?',
      ph: 'e.g. yes, flag paused-but-scheduled automations...',
      cc: 'Remove the schedule from the event-test-emails-sandbox automation, or document why it stays paused.',
      improve: {
        before: 'A paused automation sat on a live schedule, so it was unclear whether it would resume on its own and fire.',
        cost: 'Stale paused automations pile up, and you could not tell which were safe to leave alone.',
        now: 'Claude flags paused-but-scheduled automations, and you have the line to clean this one up now.'
      } }
  ];

  function feedEmpty(box) {
    var em = box && box.querySelector('.feed-empty');
    if (!em) return;
    var open = box.querySelectorAll('.q:not(.gone):not(.answered)').length;
    em.style.display = open ? 'none' : 'block';
  }
  function setBadge(id, box) {
    var b = document.getElementById(id);
    if (!b || !box) return;
    var n = box.querySelectorAll('.q:not(.gone):not(.answered)').length;
    b.textContent = n ? String(n) : '';
  }
  function checkEmpty() {
    feedEmpty(factsQ); feedEmpty(siteQ);
    setBadge('badge-questions', factsQ); setBadge('badge-site', siteQ);
  }

  function questionInner(p, value, editing) {
    value = value || '';
    var secondBtn = editing
      ? '<button class="btn-skip" data-cancel>Cancel</button>'
      : '<button class="btn-skip" data-q>Skip</button>';
    return '<div class="card-head"><span class="cico"></span>' + (p.source || p.meta) + '</div>' +
      '<div class="card-body">' +
        (p.context ? '<div class="context">' + p.context + '</div>' : '') +
        '<div class="ask">' + p.ask + '</div>' +
        '<textarea class="answer" rows="2">' + value + '</textarea>' +
        hookHtml(p) +
        '<div class="actions">' +
          '<button class="btn btn-save" data-q>Save</button>' +
          secondBtn +
        '</div>' +
      '</div>';
  }

  // The present-tense cost of leaving this unanswered. Reserves the same vertical
  // space the Before/Now/So box will fill once answered, so the card doesn't resize.
  function hookHtml(p) {
    if (p.source === 'Health checks') return ''; // send-check cards skip the "Without this" hook
    var text = p.hook || (p.improve && p.improve.before);
    if (!text) return '';
    var cost = p.improve && p.improve.cost;
    return '<div class="hookbox"><div class="hl">Without this</div><div class="ht">' + text + '</div>' +
      (cost ? '<div class="ht-cost">' + cost + '</div>' : '') + '</div>';
  }

  // The app doesn't touch your org. For one-off changes it hands you a line to
  // paste into Claude Code, where the connected tools actually do the work.
  function ccHtml(p) {
    if (!p.cc) return '';
    return '<div class="cc-block"><div class="cc-label">To do it now, tell Claude Code</div>' +
      '<div class="cc-row"><code class="cc-code">' + p.cc + '</code>' +
      '<button class="cc-copy" type="button" data-copy>Copy</button></div></div>';
  }

  function buildQuestion(p) {
    var q = document.createElement('div');
    q.className = 'q enter';
    q.innerHTML = questionInner(p, '', false);
    q._preset = p;
    return q;
  }

  function answeredInner(p) {
    var improveHtml = p.improve
      ? '<div class="improve"><div class="improve-label">What this changes for you</div>' +
        '<div class="improve-rows">' +
          '<div class="improve-row"><span class="lbl">Before</span><span class="txt">' + p.improve.before +
            (p.improve.cost ? '<span class="cost">' + p.improve.cost + '</span>' : '') + '</span></div>' +
          '<div class="improve-row now"><span class="lbl">Now</span><span class="txt">' + p.improve.now + '</span></div>' +
        '</div></div>'
      : '';
    return '<div class="card-head"><span class="cico check">✓</span>' + (p.source || p.meta) +
        '<div class="saved-actions" hidden>' +
          '<button class="btn btn-save" data-resave>Save</button>' +
          '<button class="btn-skip" data-revert>Cancel</button>' +
          '<span class="saved-flag">Saved ✓</span>' +
        '</div>' +
        '<button class="del" data-delete type="button">Delete</button></div>' +
      '<div class="card-body">' +
        (p.context ? '<div class="context">' + p.context + '</div>' : '') +
        '<div class="ask">' + p.ask + '</div>' +
        '<textarea class="answer saved" rows="2">' + (p.answer || '') + '</textarea>' +
        improveHtml +
        ccHtml(p) +
      '</div>';
  }

  function buildAnswered(p) {
    var q = document.createElement('div');
    q.className = 'q answered';
    q.innerHTML = answeredInner(p);
    q._preset = p;
    return q;
  }

  // the Facts feed starts empty; shuffle so the order differs each visit,
  // then the first one types in at ~2s like any new arrival
  FEED.unshift(SEED_OPEN);
  for (var s = FEED.length - 1; s > 0; s--) {
    var r = Math.floor(Math.random() * (s + 1));
    var tmp = FEED[s]; FEED[s] = FEED[r]; FEED[r] = tmp;
  }

  // each feed gets an empty-state line and an anchor where new cards land
  function initFeed(box, emptyText) {
    if (emptyText) {
      var em = document.createElement('div');
      em.className = 'feed-empty';
      em.textContent = emptyText;
      em.style.display = 'none';
      box.appendChild(em);
    }
    var anchor = document.createElement('div');
    anchor.className = 'feed-anchor';
    anchor.style.cssText = 'height:0;';
    box.appendChild(anchor);
    box._anchor = anchor;
  }
  initFeed(factsQ, '');
  initFeed(siteQ, 'Nothing to improve right now. Nice.');

  function addQuestion(p, box) {
    box = box || factsQ;
    var q = buildQuestion(p);
    box.insertBefore(q, box._anchor); // newest at the bottom
    void q.offsetHeight; // reflow, then animate in
    q.classList.remove('enter');
    q.classList.add('fresh');
    // bring the new question into view (the panel scrolls on desktop, the page on mobile)
    q.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setTimeout(function () { q.classList.remove('fresh'); }, 3600); // bg glow holds, then fades out slowly
    checkEmpty();
  }

  // site-improvement questions are present from the start (a settled list, no drip)
  SITE_FEED.forEach(function (p) {
    var q = buildQuestion(p);
    q.classList.remove('enter');
    siteQ.insertBefore(q, siteQ._anchor);
  });
  checkEmpty();

  // timing: first Facts question a few seconds in, then one at a steady interval.
  // New questions only arrive while connected to Claude Code.
  var TYPING_MS = 1800, INTERVAL_MS = 9000, QCAP = 6;
  var idx = 0;
  var connected = true;
  var feedTimer = null;

  // how many UNANSWERED questions are currently on screen (answered cards stay
  // as resolved cards but don't count against the live queue)
  function openCount() { return factsQ.querySelectorAll('.q:not(.answered):not(.gone)').length; }
  var hintEl = document.getElementById('qHint');
  function queuedHint() {
    if (!hintEl) return;
    var rest = FEED.length - idx;
    if (connected && rest > 0 && openCount() >= QCAP) {
      hintEl.textContent = 'Claude has more to ask — answer or skip one and the next slides in · ' + rest + ' more queued';
      hintEl.classList.add('show');
    } else if (connected && rest > 0 && openCount() > 0) {
      hintEl.textContent = 'New questions arrive as Claude works · ' + rest + ' more queued';
      hintEl.classList.add('show');
    } else {
      hintEl.classList.remove('show');
    }
  }
  function scheduleNext(delay) {
    clearTimeout(feedTimer);
    if (!connected || idx >= FEED.length || openCount() >= QCAP) { queuedHint(); return; }
    feedTimer = setTimeout(runTick, delay);
  }
  function runTick() {
    if (!connected || idx >= FEED.length || openCount() >= QCAP) { queuedHint(); return; }
    setTimeout(function () {
      if (!connected || openCount() >= QCAP) { queuedHint(); return; } // queue filled while typing: hold
      addQuestion(FEED[idx], factsQ);
      idx++;
      queuedHint();
      scheduleNext(INTERVAL_MS - TYPING_MS);
    }, TYPING_MS);
  }
  // Refill-as-you-clear: after the user answers/skips one, free the slot and
  // drip the next reserve question in (the cap holds the visible queue at <=6).
  window.mmPumpQuestions = function () { if (openCount() < QCAP) scheduleNext(1400); else queuedHint(); };
  scheduleNext(2000 - TYPING_MS);        // first card appears at ~2s

  // connect / disconnect toggle: while disconnected, no new questions arrive
  var connToggle = document.getElementById('connToggle');
  var connLabel = document.getElementById('connLabel');
  var ccNode = document.getElementById('ccNode');
  var ccStatus = document.getElementById('ccStatus');
  var pausedMsg = document.getElementById('pausedMsg');
  function setConnected(on) {
    connected = on;
    connToggle.classList.toggle('off', !on);
    connToggle.setAttribute('aria-pressed', on ? 'true' : 'false');
    connLabel.textContent = on ? 'Connected to Claude Code' : 'Disconnected';
    if (ccNode) ccNode.classList.toggle('off', !on);
    if (ccStatus) ccStatus.textContent = on ? 'Live' : 'Paused';
    var _chip = document.getElementById('sessionChip');
    var _note = document.getElementById('topbarNote');
    if (_chip) _chip.style.display = on ? '' : 'none';
    if (_note) _note.textContent = on
      ? 'New questions show up as Claude works in your session.'
      : 'Disconnected. While the session is off, no new questions arrive.';
    if (pausedMsg) pausedMsg.classList.toggle('show', !on);
    if (on) { scheduleNext(1200); }      // reconnected: resume shortly
    else { clearTimeout(feedTimer); }
  }
  connToggle.addEventListener('click', function () { setConnected(!connected); });

  formBody.addEventListener('click', function (e) {
    // copy a "tell Claude Code" line to the clipboard
    var copyBtn = e.target.closest('[data-copy]');
    if (copyBtn) {
      var code = copyBtn.parentNode.querySelector('.cc-code');
      var text = code ? code.textContent : '';
      if (navigator.clipboard && text) { navigator.clipboard.writeText(text); }
      var old = copyBtn.textContent;
      copyBtn.textContent = 'Copied';
      copyBtn.classList.add('copied');
      setTimeout(function () { copyBtn.textContent = old; copyBtn.classList.remove('copied'); }, 1500);
      return;
    }

    var q = e.target.closest('.q');
    if (!q) return;
    var p = q._preset || {};
    var ta, actions;

    // delete a saved answer entirely
    if (e.target.closest('[data-delete]')) {
      q.style.minHeight = ''; // release the locked height so the card can collapse
      q.classList.add('gone');
      setTimeout(function () { q.remove(); checkEmpty(); }, 300);
      return;
    }
    // re-save an edited saved answer
    if (e.target.closest('[data-resave]')) {
      ta = q.querySelector('.answer.saved');
      p.answer = (ta && ta.value.trim()) ? ta.value.trim() : 'Yes.';
      actions = q.querySelector('.saved-actions');
      if (actions) {
        actions.classList.add('done');           // hide buttons, show "Saved ✓"
        setTimeout(function () { actions.hidden = true; actions.classList.remove('done'); }, 1500);
      }
      return;
    }
    // discard edits to a saved answer
    if (e.target.closest('[data-revert]')) {
      ta = q.querySelector('.answer.saved');
      if (ta) ta.value = p.answer || '';
      actions = q.querySelector('.saved-actions');
      if (actions) { actions.hidden = true; actions.classList.remove('done'); }
      return;
    }
    // answer an open question -> becomes a saved card (lock height so it can't jump)
    if (e.target.closest('.btn-save')) {
      ta = q.querySelector('.answer');
      p.answer = (ta && ta.value.trim()) ? ta.value.trim() : 'Yes.';
      q.style.minHeight = q.offsetHeight + 'px'; // freeze current height before the swap
      q.classList.add('answered');
      q.innerHTML = answeredInner(p);
      // the memory loop applies to the Proactive Questions feed only (not Site improvement)
      if (factsQ.contains(q)) {
        if (window.mmAddFact) window.mmAddFact(p.fact || p.answer); // distill into a saved fact
        if (window.mmPumpQuestions) window.mmPumpQuestions();       // slot freed -> drip the next
      }
      checkEmpty();
      return;
    }
    // skip an open question
    if (e.target.closest('.btn-skip')) {
      var inFacts = factsQ.contains(q);
      q.classList.add('gone');
      if (inFacts && window.mmPumpQuestions) window.mmPumpQuestions(); // slot freed -> drip the next
      setTimeout(checkEmpty, 300);
      return;
    }
  });

  // Enter saves the answer; Shift+Enter still inserts a newline.
  formBody.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || e.shiftKey) return;
    var ta = e.target.closest('.answer');
    if (!ta) return;
    e.preventDefault();
    var q = e.target.closest('.q');
    var saveBtn = q && q.querySelector('.btn-save');
    if (saveBtn) saveBtn.click();
  });

  // Editing a saved answer: show Save/Cancel as soon as you focus or change it,
  // and tuck them away only if you click out without changing anything.
  function revealSaved(q) {
    if (!q) return;
    var actions = q.querySelector('.saved-actions');
    if (actions) { actions.hidden = false; actions.classList.remove('done'); }
  }
  formBody.addEventListener('focusin', function (e) {
    if (e.target.closest('.answer.saved')) revealSaved(e.target.closest('.q'));
  });
  formBody.addEventListener('input', function (e) {
    if (e.target.closest('.answer.saved')) revealSaved(e.target.closest('.q'));
  });
  formBody.addEventListener('focusout', function (e) {
    var ta = e.target.closest('.answer.saved');
    if (!ta) return;
    var q = e.target.closest('.q');
    if (!q || !q._preset) return;
    var actions = q.querySelector('.saved-actions');
    if (!actions) return;
    if (e.relatedTarget && actions.contains(e.relatedTarget)) return; // moving onto Save/Cancel
    var dirty = ta.value.trim() !== (q._preset.answer || '').trim();
    if (!dirty) actions.hidden = true;
  });
