// Home of the site root index.html: one card per group of handoff.config.json → groups,
// with its topic count, the topics in progress and the last update read from each group's topics.json.
(async () => {
  const KIT = new URL(".", document.currentScript.src);
  const ROOT = new URL("..", KIT);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const get = (url) => fetch(url, { cache: "no-store" }).then((r) => r.json());
  const site = await get(new URL("handoff.config.json", ROOT));

  const logo = site.logo && new URL(site.logo, ROOT);
  if (logo) document.head.append(Object.assign(document.createElement("link"), { rel: "icon", href: logo }));
  document.title = site.name;
  document.getElementById("brand").innerHTML = `${logo ? `<img src="${logo}" alt="" width="40" height="40">` : ""}<b>${esc(site.name)}</b>`;
  document.getElementById("title").textContent = site.name;
  document.getElementById("intro").textContent = site.intro || "";

  const cards = await Promise.all(site.groups.map(async (g) => {
    const base = new URL(`${g.path}/`, ROOT);
    const topics = await Promise.all((await get(new URL("topics.json", base))).map((p) => get(new URL(`${p}/topic.json`, base))));
    const active = topics.filter((t) => t.status !== "shipped").length;
    const last = topics.map((t) => t.updated).sort().pop();
    return `
      <a class="card group" href="${base}">
        <div class="card__body">
          <h2><span class="group__icon"><i class="icon" data-icon="${esc(g.icon)}"></i></span>${esc(g.title)}<i class="icon group__arrow" data-icon="arrow-right"></i></h2>
          <p>${esc(g.text)}</p>
          <div class="group__meta"><span class="chip">${topics.length} topic${topics.length === 1 ? "" : "s"}</span><span class="chip">${active} in progress</span><small>${last ? `Updated ${esc(last)}` : "No topic yet"}</small></div>
        </div>
      </a>`;
  }));
  document.getElementById("groups").innerHTML = cards.join("");
  window.renderIcons?.();
  for (const name of ["updates.js", "live.js"]) document.head.append(Object.assign(document.createElement("script"), { src: new URL(name, KIT) }));
})();
