---
name: build-mockup
description: Builds or edits the HTML/CSS screens of a topic from its design system, in a loop of component cards → screen → validator → render check. Use when creating or changing a mockup, adding a screen or a state, or adding a component to a design system.
---

# build-mockup

Spend effort on design decisions, not on CSS. The design system is the language: screens assemble its classes and tokens, a validator names every gap with a code and a fix, the browser shows the render.

## Loop

1. **Frame.** Read the topic's `topic.json`: `ds`, `viewport`, `screens` with their `states`, `components`. No `ds`: use `Minimaly`, or ask which design system of `handoff.config.json` → `designSystems` applies. **Done when** every screen and state to produce is listed.

2. **Load the cards, in one batch.** Read `<ds>/catalog/README.md`, then the card of every component the screens need (`handoff/minimaly/catalog/` for Minimaly). Load a bit too much rather than too little, never the whole CSS. **Done when** the markup of every component comes from a card, not from memory.

3. **Write one screen at a time.** Components as their card describes them. `screens.css` starts with `@import` of `<ds>/ds.css` and holds only the topic's own layout, in `var()` only. States through `?state=<id>`: `[data-state="<id>"]` in `screens.css`, `data-when="<id>"` in the HTML, or a script branch. Plain links between screens. **Done when** the screen exists and every declared state renders.

4. **Validate after each screen.**

   ```bash
   node handoff/skills/build-mockup/validate.mjs <group>/<topic>
   ```

   Apply the fix of each error before the next screen. Handle warnings unless a reason is written. The same error twice in a row: read the component card again instead of retrying. **Done when** `0 error(s)`.

5. **Check the render.** Run `python serve.py` and open `http://localhost:8000/handoff/skills/build-mockup/lint.html?topic=<group>/<topic>`. It renders every screen × state in light and dark at each device of `topic.json` → `devices` (the viewport for its own device), frames each problem and exposes `window.lintResult` (`errors`, `warnings`, `perDevice`, `findings[]` with code, device, screen, state, theme, target, fix). Read `window.lintResult`, then a screenshot to judge what rules cannot see. **Done when** `errors: 0` and every remaining warning has a written reason.

6. **Declare the components.** Put the ids the screens really use in `topic.json` → `components` (the validator reports gaps as M204; it also counts components triggered rather than classed: `toast()` calls, `data-tip`, `data-busy`/`data-done`/`data-error`/`data-copy`, `data-hold`). The handoff page then links each one to its playground page. **Done when** 0 error and 0 M204.

## Missing component

Never invent a component class in a screen. Either:

- Topic-only layout: a local class in `screens.css`, in tokens.
- Reusable element: follow [new-component](../new-component/SKILL.md).

A design system change reaches every topic that uses it.

## Validator codes

| Code | Level | Reports |
|---|---|---|
| M001, M002 | error | no `ds` (topic with screens) or unknown `ds` |
| M101 | error | raw color (hex, rgb, hsl) instead of a token, scripts included |
| M102 | error | class defined neither in the design system nor in the topic CSS |
| M103 | error | unknown variant, or `data-variant` outside a component |
| M104 | error | undefined `var(--x)` |
| M105 | warning | px value a token of the right family already covers |
| M106 | error | `screens.css` does not import the declared `ds.css` |
| M107 | error | screen with `data-icon` that does not load `ds.js` |
| M108 | error | screen using `d3` without loading D3 |
| M109 | error | team missing from `handoff.config.json` → `teams` |
| M110 | error | unknown size in `devices` (mobile, tablet, desktop) |
| M201 | error | missing screen file |
| M202 | error | declared state never rendered |
| M203 | error | listed component absent from the design system |
| M204 | warning | gap between `components` and the components used |
| M205 | error | flow step naming no screen (`id`) or state (`id:state`) |
| M206 | error | state that is not `{ "name", "note" }` |
| M207 | error | flow without `name` or `statement` (the user story it answers) |
| M208 | error | `qa` entry that is not `{ "q", "a" }`, or deliverable file missing |
| M209 | error | deliverable without `name` or `file` |

Render linter codes (`lint.html`):

| Code | Level | Reports |
|---|---|---|
| L101 | error | text/background contrast under 4.5:1 (3:1 for large text and single-glyph icons). Level `accepted` for a color listed in `<ds>/lint.json` → `acceptContrast` |
| L201 | error | element with content squashed to 0 px |
| L202 | error | element wider than the viewport (outside a scrolling container) |
| L203 | warning | text cut without an ellipsis |
| L301 | error | overlap between two sibling elements in the flow |
| L401 | error | clickable element under 32 px high |
| L402 | warning | non-clickable label that looks like a button |
| L501 | warning | `::before` or `::after` that draws something: lost by Copy to Figma |
| L502 | warning | `background-image`: lost by Copy to Figma |
| L503 | warning | `outline`: becomes a separate "Outline" layer in Figma |
| L504 | warning | `clipPath` shape without `fill="none"`: pasted as a black shape in Figma |

## CSS that survives Copy to Figma

- `::before`, `::after`: use a real element.
- `background-image`: inline SVG or a solid element.
- `outline`: `box-shadow: inset 0 0 0 1px <token>`.
- `clipPath` shape: `fill="none"`.
- `:hover` and `:focus-visible` states are not copied.

## Limits

The validator reads the code, the linter reads the render. Neither judges hierarchy, alignment or the flow itself: the screenshot of step 5 stays necessary. Add a color to `lint.json` → `acceptContrast` only on an explicit decision, never to make a screen pass.

## Whole site

`node handoff/skills/build-mockup/check-all.mjs` checks without a browser that every script of the kit parses, every JSON file parses and every topic of every group passes the validator. GitHub runs it on each push (`.github/workflows/check.yml`).
