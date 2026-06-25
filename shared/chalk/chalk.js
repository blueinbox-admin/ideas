/*!
 * chalk.js — onboarding "popup callout" notes for Active Memory prototypes.
 *
 * Shows a hand-drawn note bubble next to any element on screen. Shared across
 * business prototypes: style it via chalk.css custom properties, tune its
 * behavior via Chalk.config().
 *
 * Active callouts track their target: on window resize the note is repositioned
 * (debounced), so it stays anchored to the thing it describes.
 *
 * API
 *   Chalk.annotate(target, text, opts) -> noteEl
 *       target : CSS selector string | Element to sit beside
 *       text   : the callout text (inserted as text, XSS-safe)
 *       opts   : { side, gap, rotate, corner, highlight } — per-call overrides
 *       side   : 'above' | 'below' | 'left' | 'right' (where the note sits vs target)
 *       corner : pin the note to a viewport corner instead of beside the target —
 *                'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
 *       highlight : true (default) spotlights the target (dims the rest of the
 *                   screen); a selector/Element spotlights that instead (e.g. a
 *                   containing window/section); false skips
 *   Chalk.clear(immediate)   fade every callout out (immediate=true removes at once)
 *   Chalk.config(overrides)  set defaults below; returns the merged config
 *
 * Config (defaults)
 *   fadeOutMs     900    how slowly a callout fades when cleared — "the zoom out"
 *   defaultSide   'above'
 *   defaultGap    60     px between the target and the note
 *   defaultRotate -2     note tilt, degrees
 *   bottomKeepout 24     px kept clear at the bottom (raise to clear fixed UI,
 *                        e.g. floating demo controls)
 *   highlight     true   spotlight the element a callout is about (dim the rest)
 *   highlightPad  8      px of breathing room around the spotlit element
 *   layer         null   selector/Element to render into; if null, reuses an
 *                        existing .chalk-layer or auto-creates one on <body>
 */
(function () {
  var cfg = {
    fadeOutMs: 2000,
    defaultSide: 'above', defaultGap: 60, defaultRotate: -2,
    bottomKeepout: 24, highlight: true, highlightPad: 8, layer: null
  };
  var layerEl = null;
  var active = [];          // tracked callouts: { note, target, opts, hl, spot }
  var resizePending = false;

  // Which element a callout highlights: its target by default, a specific
  // selector/Element if opts.highlight names one, or none if disabled.
  function highlightFor(entry) {
    var h = entry.opts.highlight;
    if (h === undefined) h = cfg.highlight;
    if (!h) return null;
    if (h === true) return (typeof entry.target === 'string') ? document.querySelector(entry.target) : entry.target;
    return (typeof h === 'string') ? document.querySelector(h) : h;
  }

  function resolveLayer() {
    if (layerEl && layerEl.isConnected) return layerEl;
    layerEl = null;
    if (cfg.layer) layerEl = (typeof cfg.layer === 'string') ? document.querySelector(cfg.layer) : cfg.layer;
    if (!layerEl) layerEl = document.querySelector('.chalk-layer');
    if (!layerEl) {
      layerEl = document.createElement('div');
      layerEl.className = 'chalk-layer';
      layerEl.setAttribute('aria-hidden', 'true');
      document.body.appendChild(layerEl);
    }
    return layerEl;
  }

  function config(overrides) {
    if (overrides) {
      for (var k in overrides) if (Object.prototype.hasOwnProperty.call(overrides, k)) cfg[k] = overrides[k];
      if ('layer' in overrides) layerEl = null;   // force re-resolve on next use
    }
    return cfg;
  }

  // Compute the note's top-left for the current target rect and measured size.
  // Returns null if the target is gone or has no box, so a stale callout freezes
  // in place rather than jumping to 0,0.
  function geometry(target, opts, nw, nh) {
    // corner mode: pin the note to a viewport corner, independent of the target
    if (opts.corner) {
      var m = opts.cornerMargin != null ? opts.cornerMargin : 24;
      var right = opts.corner.indexOf('right') > -1, bottom = opts.corner.indexOf('bottom') > -1;
      return {
        nx: right ? Math.max(8, window.innerWidth - nw - m) : m,
        ny: bottom ? Math.max(8, window.innerHeight - nh - cfg.bottomKeepout) : m
      };
    }
    var el = (typeof target === 'string') ? document.querySelector(target) : target;
    if (!el) return null;
    var r = el.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    var side = opts.side || cfg.defaultSide;
    var GAP = opts.gap != null ? opts.gap : cfg.defaultGap;
    var nx, ny;
    if (side === 'left')       { nx = r.left - 5 - GAP - nw;        ny = r.top + r.height / 2 - nh / 2; }
    else if (side === 'right') { nx = r.right + 5 + GAP;           ny = r.top + r.height / 2 - nh / 2; }
    else if (side === 'below') { nx = r.left + r.width / 2 - nw / 2; ny = r.bottom + 5 + GAP; }
    else                       { nx = r.left + r.width / 2 - nw / 2; ny = r.top - 5 - GAP - nh; }
    nx = Math.max(8, Math.min(nx, window.innerWidth - nw - 8));
    ny = Math.max(8, Math.min(ny, window.innerHeight - nh - cfg.bottomKeepout));
    return { nx: nx, ny: ny };
  }

  function roundedRectPath(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    return 'M' + (x + r) + ' ' + y +
      ' L' + (x + w - r) + ' ' + y + ' Q' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + r) +
      ' L' + (x + w) + ' ' + (y + h - r) + ' Q' + (x + w) + ' ' + (y + h) + ' ' + (x + w - r) + ' ' + (y + h) +
      ' L' + (x + r) + ' ' + (y + h) + ' Q' + x + ' ' + (y + h) + ' ' + x + ' ' + (y + h - r) +
      ' L' + x + ' ' + (y + r) + ' Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y + ' Z';
  }

  // Position the spotlight: a full-screen scrim with a hole clipped out around the
  // element a callout is about. The scrim dims AND captures clicks everywhere except
  // the hole, so off-highlight clicks can't reach the page (no accidental takeover);
  // the highlighted element shows through and stays interactive.
  function positionSpot(entry) {
    if (!entry.spot || !entry.hl) return;
    var r = entry.hl.getBoundingClientRect();
    var s = entry.spot.style;
    if (!r.width && !r.height) { s.display = 'none'; return; }
    s.display = '';
    var W = window.innerWidth, H = window.innerHeight, pad = cfg.highlightPad;
    var br = parseFloat(getComputedStyle(entry.hl).borderTopLeftRadius) || 0;
    var outer = 'M0 0 L' + W + ' 0 L' + W + ' ' + H + ' L0 ' + H + ' Z ';
    var hole = roundedRectPath(r.left - pad, r.top - pad, r.width + pad * 2, r.height + pad * 2, br + pad);
    var cp = "path(evenodd, '" + outer + hole + "')";
    s.clipPath = cp; s.webkitClipPath = cp;
  }

  function place(entry) {
    positionSpot(entry);
    var g = geometry(entry.target, entry.opts, entry.note.offsetWidth, entry.note.offsetHeight);
    if (!g) return;
    entry.note.style.left = g.nx + 'px';
    entry.note.style.top = g.ny + 'px';
  }

  function onResize() {
    if (resizePending) return;
    resizePending = true;
    requestAnimationFrame(function () {
      resizePending = false;
      for (var i = 0; i < active.length; i++) place(active[i]);
    });
  }
  window.addEventListener('resize', onResize);

  function clear(immediate) {
    active = [];   // stop tracking; spotlights + notes are layer children, cleared below
    var layer = (layerEl && layerEl.isConnected) ? layerEl : document.querySelector('.chalk-layer');
    if (!layer) return;
    if (immediate) { layer.innerHTML = ''; return; }
    Array.prototype.slice.call(layer.children).forEach(function (k) {
      if (k.dataset.fading) return; k.dataset.fading = '1';
      k.style.animation = 'none';
      k.style.transition = 'opacity ' + (cfg.fadeOutMs / 1000) + 's ease';
      void k.offsetWidth; k.style.opacity = '0';
      setTimeout(function () { if (k.parentNode) k.parentNode.removeChild(k); }, cfg.fadeOutMs + 50);
    });
  }

  function annotate(target, text, opts) {
    var layer = resolveLayer();
    opts = opts || {};
    var el = (typeof target === 'string') ? document.querySelector(target) : target;
    if (!el) return;
    var r = el.getBoundingClientRect();
    if (!r.width && !r.height) return;
    var entry = { note: null, target: target, opts: opts, hl: null, spot: null };
    entry.hl = highlightFor(entry);
    // spotlight scrim first, so it renders behind the note
    if (entry.hl) {
      var spot = document.createElement('div');
      spot.className = 'chalk-spotlight';
      layer.appendChild(spot);
      entry.spot = spot;
    }
    var note = document.createElement('div');
    note.className = 'chalk-note'; note.textContent = text;
    note.style.transform = 'rotate(' + (opts.rotate != null ? opts.rotate : cfg.defaultRotate) + 'deg)';
    note.style.left = '-9999px'; note.style.top = '0px';   // off-screen until measured + placed
    layer.appendChild(note);
    entry.note = note;
    active.push(entry);
    place(entry);
    return note;
  }

  window.Chalk = { annotate: annotate, clear: clear, config: config };
})();
