/*!
 * gate.js — client-side password gate for the Sportek demo pages.
 *
 * LOW SECURITY, by design. The password is hardcoded right here and is trivially
 * bypassable via view-source or devtools. This is a soft "please don't wander in"
 * gate for a shared demo link, NOT real access control.
 *
 * Self-contained: injects its own styles + DOM, locks scroll while up, and on a
 * correct password sets a sessionStorage flag so it will not re-prompt on other
 * Sportek pages within the same tab session. To gate a new page, add one line:
 *   <script src="gate.js?v=1"></script>   (as early in <body> as possible)
 */
(function () {
  var PASSWORD = 'sportek!123';
  var KEY = 'sportek_unlocked';
  var CONTACT = 'david@blueinboxllc.com';

  // already unlocked this tab session -> no gate, engine boots normally
  try { if (sessionStorage.getItem(KEY) === '1') return; } catch (e) {}

  // Hold the auto-demo until unlock. Set synchronously (this runs before the
  // engine's convo.js), so the engine waits on this promise instead of starting
  // the scripted demo behind the blur. Resolved in attempt() on a correct password.
  var releaseDemo;
  window.AM_GATE = new Promise(function (r) { releaseDemo = r; });

  var css = [
    '.pw-gate-overlay{position:fixed;inset:0;z-index:2147483647;display:flex;',
    'align-items:center;justify-content:center;padding:24px;',
    'background:rgba(20,10,0,0.35);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);',
    'font-family:"Source Sans 3",system-ui,sans-serif;}',
    '.pw-gate-card{width:100%;max-width:560px;box-sizing:border-box;background:rgb(255,252,247);',
    'border:1px solid rgb(226,210,188);border-radius:18px;box-shadow:0 30px 80px rgba(30,15,0,0.35);',
    'padding:40px 40px 34px;color:rgb(74,35,5);}',
    '.pw-gate-title{font-family:"Bricolage Grotesque",sans-serif;font-weight:700;',
    'font-size:28px;line-height:1.15;margin:0 0 10px;}',
    '.pw-gate-sub{font-size:15.5px;line-height:1.5;color:rgb(124,92,66);margin:0 0 22px;}',
    '.pw-gate-sub a{color:rgb(0,140,118);font-weight:600;text-decoration:none;}',
    '.pw-gate-sub a:hover{text-decoration:underline;}',
    '.pw-gate-input{width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:13px 15px;',
    'border-radius:11px;border:1px solid rgb(226,210,188);background:rgb(255,252,247);color:rgb(74,35,5);}',
    '.pw-gate-input:focus{outline:2px solid rgba(0,168,142,0.35);border-color:rgb(0,168,142);}',
    '.pw-gate-error{min-height:20px;margin:8px 2px 0;font-size:13.5px;font-weight:600;',
    'color:rgb(168,67,31);visibility:hidden;}',
    '.pw-gate-error.show{visibility:visible;}',
    '.pw-gate-actions{margin-top:14px;}',
    '.pw-gate-btn{appearance:none;cursor:pointer;font:inherit;font-weight:700;font-size:15px;width:100%;',
    'padding:13px 18px;border-radius:11px;border:none;background:rgb(0,168,142);color:#fff;}',
    '.pw-gate-btn:hover{background:rgb(0,150,126);}'
  ].join('');

  function ready(fn) {
    if (document.body) return fn();
    document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var overlay = document.createElement('div');
    overlay.className = 'pw-gate-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'pw-gate-title');
    overlay.innerHTML =
      '<div class="pw-gate-card">' +
        '<h1 class="pw-gate-title" id="pw-gate-title">Password required</h1>' +
        '<p class="pw-gate-sub">Reach out to <a href="mailto:' + CONTACT + '">' + CONTACT + '</a> to access this page.</p>' +
        '<input type="password" class="pw-gate-input" placeholder="Password" autocomplete="off" spellcheck="false" aria-label="Password" />' +
        '<div class="pw-gate-error" role="alert">Incorrect password</div>' +
        '<div class="pw-gate-actions"><button type="button" class="pw-gate-btn">Unlock</button></div>' +
      '</div>';
    document.body.appendChild(overlay);

    // lock scroll (remember what to restore)
    var htmlEl = document.documentElement, bodyEl = document.body;
    var prevHtml = htmlEl.style.overflow, prevBody = bodyEl.style.overflow;
    htmlEl.style.overflow = 'hidden';
    bodyEl.style.overflow = 'hidden';

    var input = overlay.querySelector('.pw-gate-input');
    var btn = overlay.querySelector('.pw-gate-btn');
    var err = overlay.querySelector('.pw-gate-error');
    setTimeout(function () { input.focus(); }, 30);

    function attempt() {
      if (input.value === PASSWORD) {
        try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
        htmlEl.style.overflow = prevHtml;
        bodyEl.style.overflow = prevBody;
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (releaseDemo) releaseDemo();   // start the auto-demo now, fresh from the top
      } else {
        err.classList.add('show');
        input.select();
      }
    }

    btn.addEventListener('click', attempt);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); attempt(); }
    });
    input.addEventListener('input', function () { err.classList.remove('show'); });
  });
})();
