# Protopass

A prototype workshop: explore your ideas, keep them organised, and when one is ready, hand it to a developer or an AI with everything needed to build it.

Prototypes are built fast with an AI, iterated on, and handed over in one standard shape: intent, screens with their states, flows, Q&A, open questions, journal and stories. Each topic opens as a page with a pannable canvas, a clickable prototype, a token inspector and Copy to Figma. No build, no dependency: HTML, CSS and JS served as is.

## Start

1. Download the latest release zip and unzip it.
2. Edit `handoff.config.json` (see below).
3. Run `python serve.py` and open http://localhost:8000. Pages load JSON with `fetch`: opening files from disk does not work.
4. Ask your AI to read `AGENTS.md`, then to create a topic: the kit's skills tell it how.

## Layout

```
index.html             home: one card per group
handoff.config.json    your site: name, logo, address, teams, design systems, groups
AGENTS.md, CLAUDE.md   entry point for AI agents, with room for your project notes
handoffs/              a group: index.html (list) · topics.json · one folder per topic
explorations/          another group, with a prototype-only topic
  <topic>/             index.html (never edited) · topic.json · screens/ · journal.md · deliverables
handoff/               the kit: replaced as a whole on update, never edited
  AGENTS.md            guide for agents: layout, rules, pitfalls
  skills/              new-topic.md, build-mockup/ (skill, validator, render linter), new-component/
  minimaly/            default design system
  playground/          component pages: handoff/playground/?ds=<name>#<component>
serve.py               local server: no cache, live reload, update route
```

## handoff.config.json

| Key | Meaning |
| --- | --- |
| `name` | Site name, shown in the header and the tab. |
| `intro` | One line under the name on the home page. |
| `logo` | Optional logo path from the root, also the tab icon. |
| `url` | Published address of the site. Copy post builds topic links from it. Empty: the current address. |
| `teams` | Known teams, in list order. The validator flags others. |
| `designSystems` | Your design systems: `{ "My DS": "design-systems/my-ds" }`, paths from the root. Minimaly is built in. |
| `groups` | One entry per group folder: `title`, `path` (the folder), `icon` (a Phosphor name), `text`, `groupBy` (list groupings among `app`, `team`, `pi`). |

A new group: add its entry, create the folder with a copy of `handoffs/index.html` and a `topics.json` holding `[]`.

## Topics

[handoff/skills/new-topic.md](handoff/skills/new-topic.md) describes a topic, a prototype-only topic, the journal and stories. In short:

- Copy `handoffs/lend-an-item/` (or `explorations/quick-capture/` for a prototype alone) into a group, fill `topic.json`, add the folder name to the group's `topics.json`.
- Screens read their state from `?state=<name>`. A flow step is `screen-id` or `screen-id:state`.
- `journal.md` logs each iteration, shown as the Journal section.
- A `.md` deliverable (a story, a study) opens in a reader where `[label](screen:<id>)` plays that screen, `> Gap: …` marks a moment no screen shows yet, and `![caption](figures/x.html)` embeds an animated illustration.
- `node handoff/skills/build-mockup/validate.mjs <group>/<topic>` checks the screens against the design system. `handoff/skills/build-mockup/lint.html?topic=<group>/<topic>` checks their render.

## Your own design system

A design system folder holds `ds.css`, `ds.js`, `tokens.css`, `components.css`, `components.json` (id, class, name, variants, states per component), `components/<id>.html` specimens and `catalog/<id>.md` cards. Declare it in `designSystems`, then set `"ds"` and `"components"` in a topic. The playground shows its components and the topics that use each one. Inspect reads tokens from the `:root` custom properties of the screens, whatever the design system.

## Live reload

With `python serve.py`, every page reloads when a file of the site changes. The viewer keeps its place: mode, flow, screen and device live in the URL.

## Update

The update button (arrow in a circle) in the topbar shows the installed version and the latest release. On the local server, each page checks once an hour and puts a dot on the button when a release is newer.

- With `python serve.py`: **Update** downloads the release and replaces `handoff/`, then reloads the page.
- Elsewhere (published site, other server): **Download zip**, then replace your `handoff/` folder with the one inside.

Your groups, topics and `handoff.config.json` stay untouched. The release notes say when they need a change. The update route of `serve.py` only answers requests from the same machine and from the page itself.

## Viewer

- Canvas: every flow as a row of screens. Wheel pans, Ctrl/Cmd + wheel zooms, double-click focuses a screen, O fits, ← → move.
- Prototype: clickable screens. P plays the next step, I highlights the links, F goes full screen.
- Inspect (V): hover a part of a screen to read its type, colors and spacing with their tokens. Click pins, a click on a value copies it.
- Theme: light and dark for the page and its screens.
- Copy to Figma (local server only): copies a screen or a whole flow as Figma frames. Paste with Ctrl+V.

## Publish

Optional. GitHub Pages: push the folder, then Settings → Pages → Deploy from a branch → `main` and `/ (root)`. Keep the empty `.nojekyll` file. A public repository publishes your mockups to everyone.

## License

MIT. Icons: Phosphor (MIT). Fonts: Inter and JetBrains Mono (OFL), from Google Fonts.
