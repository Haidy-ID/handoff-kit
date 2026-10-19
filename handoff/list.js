// Topic list of the site root index.html: <script src="handoff/list.js"></script>.
// Reads handoff.config.json and topics.json at the site root. Topic paths are relative to the root.
// The view lives in the URL (?q=&group=&show=) so it can be shared as a link.
(async () => {
  const KIT = new URL(".", document.currentScript.src);
  const ROOT = new URL("..", KIT);
  const STATUS = { draft: "Draft", review: "In review", ready: "Ready for development", shipped: "Shipped" };
  const TONE = { draft: "warning", review: "accent", ready: "success" };
  const LABEL = { app: "Application", team: "Team", pi: "PI" };
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const get = (f) => fetch(new URL(f, ROOT), { cache: "no-store" }).then((r) => r.json());

  const [site, paths] = await Promise.all([get("handoff.config.json"), get("topics.json")]);
  const topics = await Promise.all(paths.map((p) => get(`${p}/topic.json`).then((t) => ({ ...t, path: p }))));
  const GROUPS = site.groupBy;
  const TEAMS = site.teams || [];

  // Header from the config: brand (logo is the tab icon too), title and intro.
  const logo = site.logo && new URL(site.logo, ROOT);
  if (logo) document.head.append(Object.assign(document.createElement("link"), { rel: "icon", href: logo }));
  document.title = site.name;
  document.getElementById("brand").innerHTML = `${logo ? `<img src="${logo}" alt="" width="40" height="40">` : ""}<b>${esc(site.name)}</b>`;
  document.getElementById("title").textContent = site.name;
  document.getElementById("intro").textContent = site.intro || "";
  document.head.append(Object.assign(document.createElement("script"), { src: new URL("updates.js", KIT) }));

  // A topic with two teams shows in both team groups.
  const KEYS = {
    app: (t) => [t.app || "No application"],
    team: (t) => (t.teams?.length ? t.teams : ["No team"]),
    pi: (t) => [t.pi || "No PI"],
  };
  const piNumber = (pi) => Number((pi.match(/\d+/) || [-1])[0]);
  // Teams follow handoff.config.json → teams, unknown teams last.
  const ORDER = {
    app: (a, b) => a.localeCompare(b),
    team: (a, b) => (TEAMS.indexOf(a) + 1 || 99) - (TEAMS.indexOf(b) + 1 || 99),
    pi: (a, b) => piNumber(b) - piNumber(a),
  };
  const SHOW = { all: () => true, active: (t) => t.status !== "shipped", shipped: (t) => t.status === "shipped" };
  // Search matches every word, in any order, against title, intent, application, teams and PI.
  const haystack = (t) => [t.title, t.intent, t.app, ...(t.teams || []), t.pi].join(" ").toLowerCase();
  const matches = (q) => (t) => q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => haystack(t).includes(w));

  // A topic with screens opens on its handoff page, a free prototype opens on its own entry point.
  const href = (t) => (t.screens?.length || !t.prototype ? `${ROOT}${t.path}/` : `${ROOT}${t.path}/${t.prototype}`);
  const icon = (name) => `<i class="icon" data-icon="${name}"></i>`;
  const chip = (text, iconName, round) => (text ? `<span class="chip"${round ? ' data-variant="round"' : ""}>${icon(iconName)}${esc(text)}</span>` : "");

  // Live preview of the first screen (or the prototype entry), top of the page, scaled into a fixed thumbnail.
  const THUMB = { width: 128, height: 80 };
  const preview = (t) => {
    const src = t.screens?.[0]?.file || t.prototype;
    if (!src) return `<span class="thumb"></span>`;
    const vp = t.viewport || { width: 1440, height: 900 };
    const scale = THUMB.width / vp.width;
    return `<span class="thumb"><iframe src="${ROOT}${t.path}/${src}" width="${vp.width}" height="${Math.ceil(THUMB.height / scale)}" style="transform:scale(${scale})" loading="lazy" tabindex="-1" aria-hidden="true"></iframe></span>`;
  };

  const row = (t) => `
    <a class="topic" href="${href(t)}">
      ${preview(t)}
      <span><b>${esc(t.title)}</b><small>${esc(t.intent)}</small></span>
      <span class="tags">${chip(t.app, "app-window")}${(t.teams || []).map((team) => chip(team, "users", true)).join("")}${chip(t.pi, "calendar-blank", true)}</span>
      <span class="meta">${icon("clock")}${esc(t.updated)}</span>
      <span class="badge"${TONE[t.status] ? ` data-variant="${TONE[t.status]}"` : ""}>${STATUS[t.status] || esc(t.status)}</span>
    </a>`;

  const $ = (id) => document.getElementById(id);
  $("group").innerHTML = GROUPS.map((g) => `<option value="${g}">${LABEL[g]}</option>`).join("");

  const render = () => {
    const params = new URLSearchParams(location.search);
    const group = GROUPS.includes(params.get("group")) ? params.get("group") : GROUPS[0];
    const show = SHOW[params.get("show")] ? params.get("show") : "all";
    const q = params.get("q") || "";
    $("group").value = group;
    $("show").value = show;
    if ($("q").value !== q) $("q").value = q;

    const visible = topics.filter(SHOW[show]).filter(matches(q));
    const groups = [...new Set(visible.flatMap(KEYS[group]))].sort(ORDER[group]);
    $("list").innerHTML = groups.length
      ? groups.map((g) => `
        <section class="app"><h2>${esc(g)}</h2>
          ${visible.filter((t) => KEYS[group](t).includes(g)).sort((a, b) => b.updated.localeCompare(a.updated)).map(row).join("")}
        </section>`).join("")
      : `<p class="empty">No topic in this view.</p>`;
    window.renderIcons?.($("list"));
    tipCut();
  };
  // An intent cut at three lines shows in full in a tooltip.
  const tipCut = () => document.querySelectorAll(".topic small").forEach((s) => {
    if (s.scrollHeight > s.clientHeight + 1) s.dataset.tip = s.textContent;
    else delete s.dataset.tip;
  });
  addEventListener("resize", tipCut);

  // Every control writes the URL, render() reads it.
  const update = (key, value) => {
    const params = new URLSearchParams(location.search);
    value ? params.set(key, value) : params.delete(key);
    history.replaceState(null, "", params.size ? `?${params}` : location.pathname);
    render();
  };
  $("group").addEventListener("change", (e) => update("group", e.target.value));
  $("show").addEventListener("change", (e) => update("show", e.target.value));
  $("q").addEventListener("input", (e) => update("q", e.target.value));
  render();
})();
