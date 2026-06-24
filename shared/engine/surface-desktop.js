// surface-desktop.js — the 'desktop' agent surface: a macOS-style desktop with the
// memory app in one window and Claude Code in another, side by side. Builds the
// chrome DOM and exposes mount points via window.AM_SURFACE; the conversation
// engine (convo.js) and the app renderer (app.js) target those. Loaded only when
// DEMO.agentSurface is 'desktop' (the default). The 'embedded' surface will be a
// sibling file that provides the SAME AM_SURFACE contract in different chrome.
(function () {
  var CFG = window.DEMO || {};
  var ORG = Object.assign({ name: 'Acme', product: 'Memory', url: 'memory.example.com' }, CFG.org || {});
  var cc = CFG.claudeCode || {};
  var recents = cc.recents || ['Workspace'];
  var crumb = cc.crumb || recents[0];
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  var icons = (CFG.desktopIcons || ['Files', 'Notes', 'Blue Inbox']).map(function (n) {
    return '<div class="dicon"><svg viewBox="0 0 48 40"><path d="M3 9a3 3 0 0 1 3-3h11l4 4h21a3 3 0 0 1 3 3v20a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z" fill="#4d9fe8"/><path d="M3 14h45v19a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z" fill="#79bdf9"/></svg><span>' + esc(n) + '</span></div>';
  }).join('') + '<div class="dicon"><div class="thumb"></div><span>Screenshot</span></div>';

  var recHtml = recents.map(function (r, i) {
    return '<div class="ccd-rec' + (i === 0 ? ' active' : '') + '"><span class="rdot"></span><span class="rname">' + esc(r) + '</span></div>';
  }).join('');

  var html =
    '<div class="desktop">' +
      '<div class="desktop-icons">' + icons + '</div>' +
      '<section class="win app-win">' +
        '<div class="chrome-tabs"><div class="chrome-dots"><i></i><i></i><i></i></div>' +
          '<div class="chrome-tab"><span class="fav">◧</span><span class="tname">' + esc(ORG.product) + '</span><span class="x">×</span></div>' +
          '<span class="chrome-newtab">+</span></div>' +
        '<div class="chrome-toolbar"><div class="chrome-nav">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".5"><path d="M9 5l7 7-7 7"/></svg>' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 10a8 8 0 0 1 13.7-4.2L20 8M20 4v4h-4"/></svg></div>' +
          '<div class="chrome-omni"><span class="lock"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 10V8a6 6 0 1 1 12 0v2h1a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zm2 0h8V8a4 4 0 1 0-8 0z"/></svg></span>' + esc(ORG.url) + '</div>' +
          '<span class="chrome-avatar">D</span><span class="chrome-menu">⋮</span></div>' +
        '<div class="app-scroll"><div id="memoryapp"></div></div>' +
      '</section>' +
      '<aside class="win cc-win" aria-label="Claude Code">' +
        '<div class="ccd">' +
          '<div class="ccd-side">' +
            '<div class="ccd-traffic"><i></i><i></i><i></i></div>' +
            '<div class="ccd-tabs"><span class="ccd-tab"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 5h16v11H8l-4 4z"/></svg></span>' +
              '<span class="ccd-tab"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h11M9 12h11M9 18h11M4 5.5l1 1 2-2M4 11.5l1 1 2-2M4 17.5l1 1 2-2"/></svg></span>' +
              '<span class="ccd-tab code active"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 8l-4 4 4 4M16 8l4 4-4 4"/></svg>Code</span></div>' +
            '<div class="ccd-nav"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>New session</div>' +
            '<div class="ccd-seclabel">Recents</div>' + recHtml +
            '<div class="ccd-spacer"></div>' +
            '<div class="ccd-user"><span class="av">DZ</span>Dave<span class="pl">· Max</span></div>' +
          '</div>' +
          '<div class="ccd-main">' +
            '<div class="ccd-top"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="5" width="16" height="11" rx="1"/><path d="M2 20h20"/></svg>' +
              '<span class="crumb"><b>' + esc(crumb) + '</b></span><span class="grow"></span></div>' +
            '<div class="am-convo" id="am-convo"></div>' +
            '<div class="ccd-compose">' +
              '<div class="am-input" id="am-input"><span class="am-prompt" id="am-prompt">Type / for commands</span><span class="ret">⏎</span></div>' +
              '<div class="ccd-bar"><span class="grp">Accept edits</span><span class="grp"><span class="pill">Opus 4.8 1M</span> Medium <span class="ccd-spin"></span></span></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</aside>' +
    '</div>' +
    '<div class="chalk-layer" id="chalkLayer" aria-hidden="true"></div>' +
    '<div class="demo-ctrl" id="demoCtrl"><button id="playPause" type="button" title="Pause">⏸</button><button id="restart" type="button" title="Restart">↻</button><span class="lbl">Demo</span></div>';

  document.body.insertAdjacentHTML('beforeend', html);

  // the contract the engine targets
  window.AM_SURFACE = {
    convo: document.getElementById('am-convo'),
    prompt: document.getElementById('am-prompt'),
    input: document.getElementById('am-input'),
    cls: { user: 'am-user', claude: 'am-claude', tool: 'am-tool', working: 'am-working' },
    onboarding: { cc: '.cc-win', app: '.app-win' },
  };
})();
