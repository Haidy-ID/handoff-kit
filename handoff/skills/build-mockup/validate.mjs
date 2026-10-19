// Static validator for a topic's screens against its design system.
// Usage: node handoff/skills/build-mockup/validate.mjs <group>/<topic>
// Prints one line per finding: CODE level file:line message -> fix. Exit code 1 when an error is found.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const KIT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ROOT = resolve(KIT, "..");
const site = JSON.parse(readFileSync(join(ROOT, "handoff.config.json"), "utf8"));
const topicDir = resolve(process.argv[2] || ".");
const findings = [];
const report = (code, level, file, line, message, fix) => findings.push({ code, level, file, line, message, fix });
const read = (p) => readFileSync(p, "utf8");
const lineOf = (text, index) => text.slice(0, index).split("\n").length;
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));

// Innermost rules only: selector + declarations, @media wrappers skipped.
const rules = (css) => [...stripComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selector: m[1].trim(), body: m[2], index: m.index + m[1].length }));
const customProps = (css) => new Map([...stripComments(css).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const classesIn = (selector) => [...selector.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map((m) => m[1]);

// --- Topic -------------------------------------------------------------------------------------
const topicPath = join(topicDir, "topic.json");
if (!existsSync(topicPath)) {
  console.error(`No topic.json in ${topicDir}`);
  process.exit(2);
}
const topic = JSON.parse(read(topicPath));
const rel = (p) => relative(topicDir, p).replaceAll("\\", "/");
// Design systems: Minimaly ships with the kit, the others are declared in handoff.config.json → designSystems.
const DESIGN_SYSTEMS = { Minimaly: join(KIT, "minimaly"), ...Object.fromEntries(Object.entries(site.designSystems || {}).map(([name, path]) => [name, join(ROOT, path)])) };

// A design system is needed only for screens: a free prototype alone needs none.
if (!topic.ds && topic.screens?.length) {
  report("M001", "error", "topic.json", 1, "No design system declared.", 'Add "ds": "Minimaly" (or a name from handoff.config.json → designSystems).');
}
const dsDir = DESIGN_SYSTEMS[topic.ds] || "";
if (topic.ds && !existsSync(join(dsDir, "ds.css"))) {
  report("M002", "error", "topic.json", 1, `Unknown design system "${topic.ds}".`, `Use one of: ${Object.keys(DESIGN_SYSTEMS).join(", ")}, or declare it in handoff.config.json → designSystems.`);
}
// The path from a screen to a design system file, for the fixes that write an import.
const dsFile = (name) => relative(join(topicDir, "screens"), join(dsDir, name)).replaceAll("\\", "/");

const TEAMS = site.teams || [];
for (const team of topic.teams || []) {
  if (TEAMS.length && !TEAMS.includes(team)) report("M109", "error", "topic.json", 1, `Unknown team "${team}".`, `Use one of: ${TEAMS.join(", ")}, or add it to handoff.config.json → teams.`);
}

const DEVICE_NAMES = ["mobile", "tablet", "desktop"];
for (const d of topic.devices || []) {
  if (!DEVICE_NAMES.includes(d)) report("M110", "error", "topic.json", 1, `Unknown device "${d}".`, `Use some of: ${DEVICE_NAMES.join(", ")} (omit the field to enable all).`);
}

// --- Design system knowledge -------------------------------------------------------------------
const dsCss = ["tokens.css", "foundations.css", "charts.css", "components.css"].map((f) => join(dsDir, f)).filter(existsSync).map(read).join("\n");
const dsProps = customProps(dsCss);
const dsClasses = new Set();
const dsVariants = new Map(); // class -> Set(variant)
for (const r of rules(existsSync(join(dsDir, "components.css")) ? read(join(dsDir, "components.css")) : "")) {
  for (const sel of r.selector.split(",")) {
    classesIn(sel).forEach((c) => dsClasses.add(c));
    for (const m of sel.matchAll(/\.([\w-]+)\[data-variant="([\w-]+)"\]/g)) {
      if (!dsVariants.has(m[1])) dsVariants.set(m[1], new Set());
      dsVariants.get(m[1]).add(m[2]);
    }
  }
}
const components = existsSync(join(dsDir, "components.json")) ? JSON.parse(read(join(dsDir, "components.json"))) : [];
// Light values live in the first :root block; used to suggest the token matching a raw color.
const lightProps = customProps((dsCss.match(/:root[^{]*\{[^}]*\}/) || [""])[0]);
const colorNames = (hex) => [...lightProps].filter(([, v]) => v.toLowerCase() === hex.toLowerCase()).map(([n]) => n);

// --- Topic sources -----------------------------------------------------------------------------
const screensDir = join(topicDir, "screens");
const cssFiles = existsSync(screensDir) ? readdirSync(screensDir).filter((f) => f.endsWith(".css")).map((f) => join(screensDir, f)) : [];
const localCss = cssFiles.map((f) => ({ file: f, text: read(f) }));
const localProps = new Map(localCss.flatMap(({ text }) => [...customProps(text)]));
const localClasses = new Set(localCss.flatMap(({ text }) => rules(text).flatMap((r) => classesIn(r.selector))));
const htmlFiles = [];
for (const s of topic.screens || []) {
  for (const st of s.states || []) {
    if (typeof st !== "object" || typeof st.name !== "string") report("M206", "error", "topic.json", 1, `Screen "${s.id}": state ${JSON.stringify(st)} is not { "name", "note" }.`, 'Write each state as { "name": "Error", "note": "What the user sees" }.');
  }
}
for (const x of topic.qa || []) if (typeof x?.q !== "string" || typeof x?.a !== "string") report("M208", "error", "topic.json", 1, `Q&A entry ${JSON.stringify(x)} is not { "q", "a" }.`, 'Write each entry as { "q": "Is the return date required?", "a": "No, a loan without one stays open." }.');
for (const s of topic.screens || []) {
  const p = join(topicDir, s.file);
  if (!existsSync(p)) report("M201", "error", "topic.json", 1, `Screen "${s.id}" points to missing file ${s.file}.`, "Create the file or fix screens[].file.");
  else htmlFiles.push({ screen: s, file: p, text: read(p) });
}

// Raw values in declarations: colors (error) and sizes a foundation token already covers (warning).
// Each CSS property maps to the token family that should replace its raw value.
const SIZE_FAMILY = [
  [/^font-size$/, /^--font-size-/],
  [/^line-height$/, /^--line-height-/],
  [/^(padding|margin)[\w-]*$|^(row-|column-)?gap$/, /^--spacing-/],
  [/^border[\w-]*radius$/, /^--radius-/],
  [/^(min-|max-)?height$/, /^--control-height$/],
];
// Color tokens are matched by role words, whatever the design system's naming (--color-text-primary, --text-…).
const COLOR_FAMILY = [
  [/^(color|fill|stroke)$/, /text|icon/],
  [/^background(-color)?$/, /surface|background|bg/],
  [/^(border|outline)[\w-]*$/, /border|line/],
];
// Paths a file loads (@import, src, href), resolved from the file: to check it really loads the design system.
const loads = (file, text) => [...text.matchAll(/@import\s+(?:url\()?["']?([^"')\s;]+)|\s(?:src|href)="([^"]+)"/g)].map((m) => resolve(dirname(file), m[1] || m[2]));
const familyOf = (table, prop) => (table.find(([p]) => p.test(prop)) || [])[1];
function checkDeclarations(file, text, body, offset) {
  for (const m of body.matchAll(/([\w-]+)\s*:\s*([^;]+)/g)) {
    const [, prop, value] = m;
    const line = lineOf(text, offset + m.index);
    if (prop.startsWith("--")) continue;
    for (const c of value.matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\([^)]*\)/g)) {
      const family = familyOf(COLOR_FAMILY, prop);
      const all = c[0].startsWith("#") ? colorNames(c[0]) : [];
      const names = family && all.some((n) => family.test(n)) ? all.filter((n) => family.test(n)) : all;
      report("M101", "error", rel(file), line, `Raw color ${c[0]} in "${prop}".`, names.length ? `Use var(${names.join(") or var(")}).` : `Use a color token of ${topic.ds} (tokens.css).`);
    }
    const sizeFamily = familyOf(SIZE_FAMILY, prop);
    if (sizeFamily) {
      for (const px of value.matchAll(/(?<![\w-])(\d+(?:\.\d+)?px)\b/g)) {
        const hit = [...dsProps].find(([n, v]) => v === px[1] && sizeFamily.test(n));
        if (hit) report("M105", "warning", rel(file), line, `Raw ${px[1]} in "${prop}".`, `Use var(${hit[0]}).`);
      }
    }
    for (const v of value.matchAll(/var\((--[\w-]+)/g)) {
      if (!dsProps.has(v[1]) && !localProps.has(v[1])) report("M104", "error", rel(file), line, `Undefined variable ${v[1]}.`, `Check the name in ${topic.ds}/tokens.css or foundations.css.`);
    }
  }
}

for (const { file, text } of localCss) {
  for (const r of rules(text)) checkDeclarations(file, text, r.body, r.index + 1);
  if (topic.ds && !loads(file, text).includes(join(dsDir, "ds.css"))) {
    report("M106", "error", rel(file), 1, `Does not import the ${topic.ds} design system.`, `Start with @import "${dsFile("ds.css")}";`);
  }
}

const stateId = (label) => label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const usedComponents = new Set();
for (const { screen, file, text } of htmlFiles) {
  for (const m of text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    for (const r of rules(m[1])) checkDeclarations(file, text, r.body, m.index + m[0].indexOf(m[1]) + r.index + 1);
  }
  for (const m of text.matchAll(/\sstyle="([^"]*)"/g)) checkDeclarations(file, text, m[1], m.index);
  // Chart cards are built by chart.js at run time: the mount call is the use.
  if (text.includes("VChart.mount(")) usedComponents.add("chart");
  for (const tag of text.matchAll(/<[a-z][\w-]*\b[^>]*>/g)) {
    const cls = (tag[0].match(/\sclass="([^"]*)"/) || [, ""])[1].split(/\s+/).filter(Boolean);
    const line = lineOf(text, tag.index);
    for (const c of cls) {
      if (!dsClasses.has(c) && !localClasses.has(c)) report("M102", "error", rel(file), line, `Class "${c}" exists neither in ${topic.ds} nor in the topic CSS.`, `Use a component from ${topic.ds}/catalog/ or define .${c} in screens.css.`);
      const comp = components.find((x) => x.class === c);
      if (comp) usedComponents.add(comp.id);
    }
    const variant = (tag[0].match(/\sdata-variant="([^"]*)"/) || [])[1];
    if (variant) {
      const owner = cls.find((c) => dsVariants.has(c));
      if (!owner) report("M103", "error", rel(file), line, `data-variant="${variant}" on an element without a design system component.`, "Put data-variant on the component root (e.g. .btn).");
      else if (!dsVariants.get(owner).has(variant)) report("M103", "error", rel(file), line, `.${owner} has no variant "${variant}".`, `Use one of: ${[...dsVariants.get(owner)].join(", ")}, or none for the default.`);
    }
  }
  if (/\sdata-icon="/.test(text) && topic.ds && !loads(file, text).includes(join(dsDir, "ds.js"))) {
    report("M107", "error", rel(file), 1, "Uses data-icon without loading ds.js: icons stay empty.", `Add <script src="${dsFile("ds.js")}"></script> before </body>.`);
  }
  if (/\bd3\./.test(text) && !/<script[^>]+src="[^"]*d3[@.][^"]*"/.test(text)) {
    report("M108", "error", rel(file), 1, "Uses d3 without loading it.", 'Add <script src="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js"></script> before the chart script.');
  }
  // Colors hard-coded in scripts (D3 fills, strokes, scales) bypass the tokens like raw CSS values.
  for (const m of text.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
    for (const c of m[1].matchAll(/["'`](#[0-9a-fA-F]{3,8})["'`]/g)) {
      report("M101", "error", rel(file), lineOf(text, m.index + m[0].indexOf(m[1]) + c.index), `Raw color ${c[1]} in a script.`, 'Use "var(--chart-series-N)" or another token with .style().');
    }
  }
  // Every declared state beyond the first needs a hook in the screen or its CSS.
  const sources = text + localCss.map((c) => c.text).join("\n");
  for (const state of (screen.states || []).slice(1).map((st) => st.name || String(st))) {
    const id = stateId(state);
    if (!sources.includes(`"${id}"`)) report("M202", "error", rel(file), 1, `State "${state}" is declared but never rendered.`, `Style [data-state="${id}"] in screens.css, or use data-when="${id}" / a script branch on "${id}".`);
  }
}

// A flow answers one user story: a name, the story itself, then the steps that tell it.
// Steps name a screen id, optionally with a state id: "add-loan" or "add-loan:error".
for (const [i, flow] of (topic.flows || []).entries()) {
  const label = `flows[${i}]${flow.name ? ` "${flow.name}"` : ""}`;
  if (!flow.name || !flow.statement) report("M207", "error", "topic.json", 1, `${label}: a flow needs a "name" and the user story it answers in "statement".`, 'Add "name": "Lend an item" and "statement": "As a lender, I want …, so that …".');
  for (const step of flow.steps || []) {
    const [id, stateKey] = step.split(":");
    const s = (topic.screens || []).find((x) => x.id === id);
    const where = `flows[${i}]${flow.name ? ` "${flow.name}"` : ""}`;
    if (!s) report("M205", "error", "topic.json", 1, `${where}: step "${step}" names no screen.`, `Use a screen id: ${(topic.screens || []).map((x) => x.id).join(", ")}.`);
    else if (stateKey && !(s.states || []).some((st) => stateId(st.name || String(st)) === stateKey)) report("M205", "error", "topic.json", 1, `${where}: screen "${id}" has no state "${stateKey}".`, `Use one of: ${(s.states || []).map((st) => stateId(st.name || String(st))).join(", ") || "no state, drop the suffix"}.`);
  }
}

// A UX deliverable: a working document of the topic (ranking sheet, study), listed under the flows, not a screen.
for (const [i, d] of (topic.deliverables || []).entries()) {
  const label = `deliverables[${i}]${d.name ? ` "${d.name}"` : ""}`;
  if (!d.name || !d.file) report("M209", "error", "topic.json", 1, `${label}: a deliverable needs a "name" and a "file".`, 'Add "name": "Priorities" and "file": "screens/priorities.html".');
  else if (!existsSync(join(topicDir, d.file))) report("M208", "error", "topic.json", 1, `${label}: file "${d.file}" does not exist.`, "Point to a file of the topic folder.");
}

const declared = new Set(topic.components || []);
for (const id of declared) {
  if (!components.some((c) => c.id === id)) report("M203", "error", "topic.json", 1, `Component "${id}" is not in ${topic.ds}.`, `Use one of: ${components.map((c) => c.id).join(", ")}.`);
  else if (!usedComponents.has(id)) report("M204", "warning", "topic.json", 1, `Component "${id}" is listed but no screen uses it.`, "Remove it from components.");
}
for (const id of usedComponents) {
  if (!declared.has(id)) report("M204", "warning", "topic.json", 1, `Screens use "${id}" but components does not list it.`, `Add "${id}" to components so the handoff links its playground.`);
}

// --- Output ------------------------------------------------------------------------------------
for (const f of findings) console.log(`${f.code} ${f.level} ${f.file}:${f.line} ${f.message} -> ${f.fix}`);
const errors = findings.filter((f) => f.level === "error").length;
console.log(`${relative(ROOT, topicDir)}: ${errors} error(s), ${findings.length - errors} warning(s)`);
process.exit(errors ? 1 : 0);
