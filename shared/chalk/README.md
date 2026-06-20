# chalk — onboarding popup callouts

Hand-drawn note bubble that sits beside any element on screen. Shared by the
Active Memory business prototypes so every iteration uses the same callout pattern.
Notes track their target and reposition on window resize.

## Add it to a prototype

In `index.html` `<head>` (after the prototype's own stylesheet):

```html
<link rel="stylesheet" href="../shared/chalk/chalk.css">
```

Before your app scripts (so `window.Chalk` exists when they run):

```html
<script src="../shared/chalk/chalk.js"></script>
```

Paths are relative to the prototype folder, which sits next to `shared/`:

```
ideas/
  shared/chalk/          chalk.css, chalk.js
  activememory-wordpress/ index.html -> ../shared/chalk/chalk.js
  <next-business>/        index.html -> ../shared/chalk/chalk.js
```

No markup is required — Chalk reuses an existing `.chalk-layer` element if the page
has one, otherwise it creates its own on `<body>`.

## Use it

```js
Chalk.annotate('#some-element', 'Look here.', { side: 'above', gap: 54 });
Chalk.clear();            // fade everything out
Chalk.clear(true);        // remove instantly (e.g. on reset)
```

`side` is `'above' | 'below' | 'left' | 'right'`. Per-call `opts`: `gap`, `rotate`, `highlight`,
and `corner` (`'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'`) to pin the note to
a screen corner instead of beside the target — the spotlight still falls on the target.

While a callout is up, the screen dims everywhere except the element it's about —
an onboarding spotlight — removed on `clear()`. The scrim also captures clicks: a
click in the dimmed area does nothing (it can't reach the page underneath), so it
won't disrupt a guided flow; only the spotlit element stays interactive. By default
the spotlight falls on the target the note sits beside. To spotlight a containing
window/section instead, pass `highlight`:

```js
Chalk.annotate('#fees-question', 'Claude asked this.', { highlight: '.claude-window' });
Chalk.annotate('#x', 'No spotlight here.', { highlight: false });
```

Turn it off everywhere with `Chalk.config({ highlight: false })`.

## Theme per business

Override the `--chalk-*` custom properties. The defaults already inherit the host
page's tokens (`--ink`, `--surface`, `--sand`, `--font-display`), so if your
prototype defines those, callouts match automatically. To force specific values:

```css
.chalk-layer {
  --chalk-note-color: rgb(20 90 200);
  --chalk-note-size: 24px;
}
:root { --chalk-scrim: rgba(20 12 4 / .55); }   /* how dark the rest of the screen dims */
```

## Tune timing/behavior

```js
Chalk.config({
  fadeOutMs: 900,      // how slowly a callout fades when cleared ("the zoom out")
  bottomKeepout: 150,  // px kept clear at the bottom (raise to clear fixed UI)
});
```

Defaults live at the top of `chalk.js`. `fadeOutMs` is the slow-fade knob.
