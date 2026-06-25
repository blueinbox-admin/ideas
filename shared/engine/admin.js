// admin.js — the demo-day control panel. Hidden unless the URL has ?admin.
// It lists every feature flag as a live toggle plus a surface switch, so you can
// flip onboarding, free-typing, the agent surface, etc. right before a lead sees
// the demo. Changes write to localStorage (namespaced by this demo's slug) and
// reload. NOTHING here persists to the repo; it is local to your browser. To make
// a change permanent for everyone, set it in versions.js (or tell Claude).
(function () {
  if (!/[?&]admin(?:=[^&]*)?(?:&|$)/.test(location.search)) return;

  var slug = window.AM_SLUG || '';
  var DEF = (window.DEMO_DEFAULTS && window.DEMO_DEFAULTS.features) || {};
  var FEAT = window.AM_FEATURES || {};
  var CFG = window.DEMO || {};
  var keys = Object.keys(DEF);

  function readLive() { try { return JSON.parse(localStorage.getItem('am-features:' + slug) || '{}'); } catch (e) { return {}; } }
  function setFeature(k, val) { var c = readLive(); c[k] = val; localStorage.setItem('am-features:' + slug, JSON.stringify(c)); location.reload(); }
  function setSurface(s) { localStorage.setItem('am-surface:' + slug, s); location.reload(); }
  function reset() { localStorage.removeItem('am-features:' + slug); localStorage.removeItem('am-surface:' + slug); location.reload(); }

  var live = readLive();
  var liveSurface = null; try { liveSurface = localStorage.getItem('am-surface:' + slug); } catch (e) {}
  var overrides = Object.keys(live).length + (liveSurface ? 1 : 0);

  var css = ''
    + '.am-admin{position:fixed;top:14px;right:14px;z-index:99999;width:248px;font-family:"Source Sans 3",system-ui,sans-serif;'
    + 'background:#fffaf2;color:#4a2305;border:1px solid #e2d2bc;border-radius:14px;box-shadow:0 14px 40px rgba(74,35,5,.22);overflow:hidden}'
    + '.am-admin.min .am-admin-body{display:none}'
    + '.am-admin-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:11px 13px;background:#4a2305;color:#fffaf2;cursor:pointer}'
    + '.am-admin-head b{font-family:"Bricolage Grotesque",sans-serif;font-size:13.5px;font-weight:700;letter-spacing:.01em}'
    + '.am-admin-head .am-badge{font-size:10.5px;font-weight:600;background:#00a88e;color:#fff;border-radius:999px;padding:1px 7px}'
    + '.am-admin-body{padding:6px 13px 13px}'
    + '.am-admin-sec{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:#7c5c42;margin:11px 0 5px}'
    + '.am-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 0;font-size:13px}'
    + '.am-row.ov{font-weight:600}.am-row.ov .am-k::after{content:" \\2022";color:#00a88e}'
    + '.am-k{font-variant-ligatures:none}'
    + '.am-sw{position:relative;width:34px;height:19px;flex:0 0 auto;border-radius:999px;background:#d8c6ad;cursor:pointer;transition:background .12s}'
    + '.am-sw.on{background:#00a88e}.am-sw::after{content:"";position:absolute;top:2px;left:2px;width:15px;height:15px;border-radius:50%;background:#fff;transition:left .12s}'
    + '.am-sw.on::after{left:17px}'
    + '.am-seg{display:flex;gap:5px;margin-top:3px}'
    + '.am-seg button{flex:1;font:inherit;font-size:12px;padding:5px 0;border:1px solid #e2d2bc;background:#fff;color:#7c5c42;border-radius:8px;cursor:pointer}'
    + '.am-seg button.sel{background:#4a2305;color:#fffaf2;border-color:#4a2305;font-weight:600}'
    + '.am-foot{display:flex;align-items:center;justify-content:space-between;margin-top:12px;font-size:11px;color:#7c5c42}'
    + '.am-foot button{font:inherit;font-size:11px;color:#a8431f;background:none;border:none;cursor:pointer;text-decoration:underline;padding:0}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var panel = document.createElement('div'); panel.className = 'am-admin';

  var head = document.createElement('div'); head.className = 'am-admin-head';
  head.innerHTML = '<b>Demo controls</b>' + (overrides ? '<span class="am-badge">' + overrides + ' override' + (overrides === 1 ? '' : 's') + '</span>' : '<span class="am-badge" style="background:#7c5c42">live</span>');
  head.addEventListener('click', function () { panel.classList.toggle('min'); });
  panel.appendChild(head);

  var body = document.createElement('div'); body.className = 'am-admin-body';

  // surface switch
  var sLab = document.createElement('div'); sLab.className = 'am-admin-sec'; sLab.textContent = 'Agent surface';
  body.appendChild(sLab);
  var seg = document.createElement('div'); seg.className = 'am-seg';
  ['desktop', 'embedded', 'none'].forEach(function (s) {
    var b = document.createElement('button'); b.textContent = s;
    if ((CFG.agentSurface || 'desktop') === s) b.className = 'sel';
    b.addEventListener('click', function () { setSurface(s); });
    seg.appendChild(b);
  });
  body.appendChild(seg);

  // feature toggles
  var fLab = document.createElement('div'); fLab.className = 'am-admin-sec'; fLab.textContent = 'Features';
  body.appendChild(fLab);
  keys.forEach(function (k) {
    var row = document.createElement('div'); row.className = 'am-row' + (k in live ? ' ov' : '');
    var name = document.createElement('span'); name.className = 'am-k'; name.textContent = k;
    var sw = document.createElement('span'); sw.className = 'am-sw' + (FEAT[k] ? ' on' : '');
    sw.addEventListener('click', function () { setFeature(k, !FEAT[k]); });
    row.appendChild(name); row.appendChild(sw); body.appendChild(row);
  });

  var foot = document.createElement('div'); foot.className = 'am-foot';
  foot.innerHTML = '<span>browser-local</span>';
  var rb = document.createElement('button'); rb.textContent = 'Reset to registry';
  rb.addEventListener('click', reset); foot.appendChild(rb);
  body.appendChild(foot);

  panel.appendChild(body);
  document.body.appendChild(panel);
})();
