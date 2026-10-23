# Changelog

## 2.3.0 · 2026-10-24

- New Minimaly components: composer (prompt field with Send and Stop), reasoning, tool call and citation (an agent's thinking, actions and sources), combobox, dropzone, stepper, rich editor, date picker, command palette (⌘K), attachment, slider and tag input. 53 components in all.
- Richer components: input add-ons (prefix, suffix, inline action, number stepper), soft button, badge icons, counts in tabs and segmented, filled textarea.
- Look: the main action and chosen states are ink, black in light and white in dark (primary button, checked box, radio, switch). The blue accent keeps focus, links and what is active or current. Your screens change color with no edit; check them once.
- Dark theme: tertiary text and agent violet are lighter, to reach 4.5:1 contrast.
- Motion: failed steps, critical toasts and banners shake once; the hold button turns critical red and stays disabled once confirmed; the stepper line fills stage to stage; reasoning thinks with the typing dots.
- Copy to Figma: steps, divider and table sort draw with real elements, so they paste into Figma.
- Fixes: segmented options stay 32 px inside cards and shells; toast buttons and table-of-contents links are 32 px; the dialog body no longer overlaps its head; async button labels sit straight in every state.
- Playground: Check all loads every specimen in light and dark and lists errors, missing icons and overflow; the component list scrolls on its own.
- Render lint: finishes transitions before measuring, and treats links inside running text as text links.
- New Templates group in the repository: Desktop Agent (an agent app, from idea to handoff) and Modern Portfolio (a design engineer's site). The update button only replaces `handoff/`: to get them, copy `templates/` from the release and add the group to `handoff.config.json` (see its `groups`).

## 2.2.0 · 2026-10-21

- Handoff Kit is now Protopass: a prototype workshop to explore ideas, keep them organised and hand the ready ones to a developer or an AI. The repository moved to `Haidy-ID/protopass` (the old address redirects). Folders, files and config keys keep their names: nothing to migrate. Topic tabs read "<topic> · <site name>"; the default site is "My prototypes".
- Typing: the three dots dance a 12 s loop on one line (wave, ping-pong, wave, Newton's cradle), each figure melting into the next. Needs `ds.js`; the dots stay still under reduced motion.
- Errors shake once when they appear: failed step, critical toast, critical banner, as already the async button error and an invalid field. Persistent critical tones (badge, menu item) stay still.
- Hold to confirm: holding turns the fill, border, label and icon critical red; once confirmed it keeps that red (no green check) and turns `aria-disabled` for good.
- App shell: folded, the rail is one square item wide, so items are 32 px squares and icons stay put.
- Fixes: async button labels no longer sit offset in busy, done and error; focus rings at the top of a dialog body are no longer clipped.
- Playground: the component list and the component scroll on their own; specimens with a select, menu or dialog keep room for it to open; the dialog specimen uses the documented input markup.

## 2.1.1 · 2026-10-20

- Fix: Markdown figures stayed empty. Their frame was sandboxed, and some browsers block sandboxed frames outright; figures now load like screens.
- Figures and the document reader follow the handoff theme: the page sets `data-theme` on the figure, which styles itself from it.

## 2.1.0 · 2026-10-20

- Minimaly components: field (label, hint, error with shake), checkbox (drawn check, indeterminate), radio, switch, textarea (grows, counter), banner (dismiss folds it away), empty state, list (lead, body, trail, staggered entry), app shell (navigation rail that folds).
- Motion: physical springs (`--ease-spring`, `--ease-bounce`, `--duration-spring`); tooltips, popovers, menus and select lists open and close natively from the side of their trigger; content swaps through a blur (async button labels, tab panels); changed digits of a value roll in; toasts slide out; avatars lift their neighbours; pages crossfade on navigation.
- Prototype: moving forward slides the next screen in from the right, back from the left.
- Markdown: figures on their own line, images or HTML illustrations in a sandboxed frame. The example story has one.
- Skill `handoff/skills/new-component/` to create or upgrade a component; `handoff/AGENTS.md` points to Hairline for animated illustrations.
- The example topic uses the new field and list instead of its own CSS.
- Render linter: a field inside a `<label>` is measured by its label.

## 2.0.0 · 2026-10-20

- Groups: a home page with one card per group, and one topic list per group folder (`handoff.config.json` → `groups`).
- Prototype-only topics: a topic with a `prototype` entry and no screens, example in `explorations/quick-capture/`.
- Journal: `journal.md` next to `topic.json`, shown as the Journal section of the handoff page.
- Markdown deliverables (stories, studies) open in a reader: `[label](screen:<id>:<state>)` plays a screen, `> Gap: …` marks a missing moment.
- Live reload with `python serve.py`: pages reload on save and keep their place.
- Playground: each component lists the topics that use it.
- Agent kit: `AGENTS.md` and `CLAUDE.md` at the root, `handoff/AGENTS.md`, `handoff/skills/new-topic.md`, `handoff/skills/build-mockup/` with the screen validator and the render linter.
- Fix: the playground loaded `../Minimaly/ds.js`, which fails on case-sensitive servers (GitHub Pages, Linux).

Migration from 1.x, by hand (the update button alone breaks the site, since the layout changed):

1. Replace `handoff/`, `serve.py` and the root `index.html` with those of the zip. Copy `AGENTS.md` and `CLAUDE.md`.
2. In `handoff.config.json`: move `groupBy` into a `groups` entry, as in the zip.
3. Move `topics/` to the group folder (`handoffs/`), move `topics.json` into it with the folder names only (`["lend-an-item"]`), and copy `handoffs/index.html` from the zip.

## 1.1.1 · 2026-10-20

- Update button at the end of the topbar, after a divider.
- On the local server, each page checks for a new release and shows a dot on the button. The result is kept an hour in the browser, so GitHub's limit of 60 requests an hour is never reached.

## 1.1.0 · 2026-10-20

- Update button in the topbar: shows the installed and latest versions. Served by `serve.py`, it installs the update in place; published, it links the zip.
- Migration from 1.0.0: replace `handoff/` and `serve.py` by hand once. Later updates go through the button.

## 1.0.0 · 2026-10-19

First release: handoff page, topic list, canvas, prototype, inspector, Copy to Figma, Minimaly and its playground.
