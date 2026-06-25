// boot.js — resolves THIS demo's effective knobs once, so the renderer, the
// surface loader, and the engine all read one resolved object instead of each
// recomputing from defaults + config. Must load AFTER versions.js + config.js
// and BEFORE surface.js / app.js / convo.js.
//
// Resolution is last-wins:
//   DEMO_DEFAULTS.features  ->  versions.js entry.features  ->  DEMO.features
//   ->  ?admin live toggles (localStorage, browser-local).
// Surface resolves the same way:
//   DEMO.agentSurface (config default)  ->  entry.surface  ->  live override.
(function () {
  var DEF = (window.DEMO_DEFAULTS && window.DEMO_DEFAULTS.features) || {};
  var CFG = window.DEMO || (window.DEMO = {});

  // slug = this demo's folder name in the URL path
  var path = location.pathname.replace(/\/(index\.html?)?$/i, '');
  var slug = path.split('/').filter(Boolean).pop() || '';
  window.AM_SLUG = slug;

  var entry = (window.VERSIONS || []).filter(function (v) { return v.slug === slug; })[0] || {};
  window.AM_REGISTRY_ENTRY = entry;

  var live = {};
  try { live = JSON.parse(localStorage.getItem('am-features:' + slug) || '{}'); } catch (e) {}

  window.AM_FEATURES = Object.assign({}, DEF, entry.features || {}, CFG.features || {}, live);

  // surface: config default, then registry, then live override
  if (entry.surface) CFG.agentSurface = entry.surface;
  var liveSurface = null;
  try { liveSurface = localStorage.getItem('am-surface:' + slug); } catch (e) {}
  if (liveSurface) CFG.agentSurface = liveSurface;
})();
