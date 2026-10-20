# Handoff Kit: guide for agents

Static site of handoff pages for UX/UI prototypes. No build, no dependency: HTML, CSS and JS served as is by `python serve.py` (no cache, live reload, update route).

## Layout

```
handoff.config.json    site name, logo, published url, teams, design systems, groups
index.html             home: one card per group
<group>/index.html     topic list of the group (same file in every group)
<group>/topics.json    topic folder names of the group
<group>/<topic>/       index.html (never edited) · topic.json · screens/ · journal.md · deliverables
handoff/               the kit, replaced as a whole on update: never edit it in a project
  minimaly/            default design system: catalog/<id>.md cards, components/<id>.html specimens
  skills/              how to work on topics (below)
```

## Skills

- Create a topic, a prototype-only topic, a journal entry or a story: [skills/new-topic.md](skills/new-topic.md).
- Build or edit screens: [skills/build-mockup/SKILL.md](skills/build-mockup/SKILL.md).
- Create or upgrade a design system component: [skills/new-component/SKILL.md](skills/new-component/SKILL.md).
- Animated illustrations for stories and deliverables (optional): an illustration skill such as [Hairline](https://hairline.lucasmarkes.com/skills) (`npx skills add lucasmarkes/hairline`, MIT) makes one self-contained HTML figure per idea. Save it in the topic's `figures/` and embed it with `![caption](figures/<name>.html)`.

## Rules

- Screens use the topic's design system classes and tokens only. Read the component card before writing its markup.
- After each screen: `node handoff/skills/build-mockup/validate.mjs <group>/<topic>`, then the render check of build-mockup. Zero errors before calling a screen done.
- After each iteration on a topic: one dated entry in its `journal.md`, with the reason of each change.
- Copy short and direct: user stories in one sentence ("As a lender, I should be able to …"), Q&A answers in one or two sentences, state notes in a few words.

## Pitfalls already met

- A show/hide behavior is verified in both directions. A component with `display: flex` beats the `hidden` attribute unless the CSS has `[hidden] { display: none; }`.
- Clipboard features (Copy to Figma, Copy post) are only proven by a real paste in the target app. Chrome drops a clipboard write when the page loses focus before an async conversion ends: prepare the payload before the click.
- Edit code that holds backslash escapes (regexes) with a file edit tool, not through a shell heredoc or a language string: each layer eats escapes and the rule silently stops matching.
