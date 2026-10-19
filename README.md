# Handoff Kit

Static handoff pages for UX/UI mockups: intent, screens with their states, flows, Q&A and open questions. Each topic opens as a page with a pannable canvas, a clickable prototype, a token inspector and Copy to Figma. No build, no dependency: HTML, CSS and JS served as is.

## Start

1. Download the latest release zip and unzip it.
2. Edit `handoff.config.json` (see below).
3. Run `python serve.py` and open http://localhost:8000. Pages load JSON with `fetch`: opening files from disk does not work.

## Layout

```
index.html             topic list: search, group by application, team or PI
handoff.config.json    your site: name, logo, address, teams, design systems
topics.json            the topics shown in the list, paths from the root
topics/<topic>/        index.html (handoff page) · topic.json · screens/
handoff/               the kit: replaced as a whole on update, never edited
  minimaly/            design system of the handoff pages, usable for mockups
  playground/          component pages: handoff/playground/?ds=<name>#<component>
serve.py               local server, no browser cache
```

## handoff.config.json

| Key | Meaning |
| --- | --- |
| `name` | Site name, shown in the header and the tab. |
| `intro` | One line under the name on the list. |
| `logo` | Optional logo path from the root, also the tab icon. |
| `url` | Published address of the site. Copy post builds topic links from it. Empty: the current address. |
| `groupBy` | List groupings, in order: `app`, `team`, `pi`. |
| `teams` | Team order in the list. |
| `designSystems` | Your design systems: `{ "My DS": "design-systems/my-ds" }`, paths from the root. Minimaly is built in. |

## Add a topic

1. Copy `topics/lend-an-item/` to `topics/<your-topic>/`.
2. Fill `topic.json`: title, intent, status (`draft`, `review`, `ready`, `shipped`), screens with their states, flows, Q&A, questions.
3. Add its path to `topics.json`.

A topic can sit at any depth: the two paths to `handoff/` in its `index.html` get one `../` per extra folder level.

Screens read their state from `?state=<name>` (`screens.js` sets `data-state` on `<html>`). A flow step is `screen-id` or `screen-id:state`.

## Use your own design system

A design system folder holds `components.json` (id, class, name, variants, states per component), `components/<id>.html` specimens and `catalog/<id>.md` cards. Declare it in `designSystems`, then set `"ds"` and `"components"` in a topic to link its components to the playground. Inspect reads tokens from the `:root` custom properties of the screens, whatever the design system.

## Update

Click the update button (arrow in a circle) in the topbar: it shows the installed version and the latest release.

- With `python serve.py`: **Update** downloads the release and replaces `handoff/`, then reloads the page.
- Elsewhere (published site, other server): **Download zip**, then replace your `handoff/` folder with the one inside.

Topics, `topics.json` and `handoff.config.json` stay untouched. The release notes say when a `topic.json` needs a change. The update route of `serve.py` only answers requests from the same machine and from the page itself.

## Viewer

- Canvas: every flow as a row of screens. Wheel pans, Ctrl/Cmd + wheel zooms, double-click focuses a screen, O fits, ← → move.
- Prototype: clickable screens. P plays the next step, I highlights the links, F goes full screen.
- Inspect (V): hover a part of a screen to read its type, colors and spacing with their tokens. Click pins, a click on a value copies it.
- Theme: light and dark for the page and its screens.
- Copy to Figma (local server only): copies a screen or a whole flow as Figma frames. Paste with Ctrl+V.

## Publish

GitHub Pages: push the folder, then Settings → Pages → Deploy from a branch → `main` and `/ (root)`. Keep the empty `.nojekyll` file. Links are relative, so the site also works in a subfolder.

## License

MIT. Icons: Phosphor (MIT). Fonts: Inter and JetBrains Mono (OFL), from Google Fonts.
