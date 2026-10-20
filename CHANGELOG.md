# Changelog

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
