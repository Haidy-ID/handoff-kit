// Update button of the topbar (list and handoff pages): opens a panel that compares handoff/VERSION with the latest
// GitHub release. Served by serve.py on this machine, it installs the update (POST /__handoff/update); published, it links the zip.
(() => {
  const KIT = new URL(".", document.currentScript.src);
  const REPO = "Haidy-ID/handoff-kit";
  const LOCAL = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const icon = (name) => `<i class="icon" data-icon="${name}"></i>`;
  const newer = (a, b) => {
    const [x, y] = [a, b].map((v) => v.replace(/^v/, "").split(".").map(Number));
    for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
    return false;
  };

  const anchor = document.querySelector('.topbar a[href*="playground"]');
  // Last item of the topbar, after a divider.
  anchor.insertAdjacentHTML("afterend", `<span class="topbar__divider" aria-hidden="true"></span><button class="btn" data-variant="icon" id="update-toggle" aria-label="Updates" aria-expanded="false" data-tip="Check for a new version of the kit">${icon("arrow-circle-up")}</button>`);
  const toggle = document.getElementById("update-toggle");
  const panel = Object.assign(document.createElement("div"), { className: "popover update-panel", id: "update-panel", hidden: true });
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Updates");
  document.body.append(panel);

  const render = (html) => {
    panel.innerHTML = html;
    window.renderIcons?.(panel);
  };
  const row = (label, value) => `<div class="update-panel__row"><span>${label}</span><b>${esc(value)}</b></div>`;

  const check = async () => {
    render(`<p class="popover__label">Handoff Kit</p>${row("Installed", "…")}${row("Latest", "Checking…")}`);
    const [installed, release] = await Promise.all([
      fetch(new URL("VERSION", KIT), { cache: "no-store" }).then((r) => r.text()).then((t) => t.trim()),
      fetch(`https://api.github.com/repos/${REPO}/releases/latest`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    if (!release) return render(`<p class="popover__label">Handoff Kit</p>${row("Installed", installed)}<p class="update-panel__note">GitHub cannot be reached. Try again later.</p>`);
    const latest = release.tag_name.replace(/^v/, "");
    const head = `<p class="popover__label">Handoff Kit</p>${row("Installed", installed)}${row("Latest", latest)}`;
    const notes = `<a class="btn" data-variant="ghost" href="${esc(release.html_url)}" target="_blank">${icon("arrow-square-out")}Release notes</a>`;
    if (!newer(latest, installed)) return render(`${head}<p class="update-panel__note">${icon("check")}Up to date.</p><div class="popover__foot">${notes}</div>`);
    const action = LOCAL
      ? `<button class="btn" data-variant="primary" id="update-install">${icon("arrow-circle-up")}Update to ${esc(latest)}</button>`
      : `<a class="btn" data-variant="primary" href="https://github.com/${REPO}/archive/refs/tags/${esc(release.tag_name)}.zip">${icon("download-simple")}Download zip</a>`;
    const how = LOCAL
      ? "Replaces the handoff/ folder. Topics and handoff.config.json stay as they are. Check the release notes for topic.json changes."
      : "Replace your handoff/ folder with the one in the zip. Topics and handoff.config.json stay as they are.";
    render(`${head}<p class="update-panel__note">${how}</p><div class="popover__foot">${notes}${action}</div>`);
  };

  const install = async (btn) => {
    btn.disabled = true;
    btn.textContent = "Updating…";
    const res = await fetch("/__handoff/update", { method: "POST", headers: { "X-Handoff": "update" } }).catch(() => null);
    const body = await res?.json().catch(() => null);
    if (res?.ok && body?.version) {
      render(`<p class="popover__label">Handoff Kit</p><p class="update-panel__note">${icon("check")}Updated to ${esc(body.version)}. Reloading…</p>`);
      return setTimeout(() => location.reload(), 800);
    }
    // Another local server (python -m http.server, an editor preview) has no update route.
    const why = body?.error || "This server cannot install updates. Run python serve.py at the site root, then try again.";
    render(`<p class="popover__label">Handoff Kit</p><p class="update-panel__note update-panel__note--error">${esc(why)}</p>`);
  };

  const close = () => {
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  };
  const open = () => {
    const r = toggle.getBoundingClientRect();
    panel.hidden = false;
    panel.style.top = `${r.bottom + 4}px`;
    panel.style.left = `${Math.max(8, Math.min(r.right - panel.offsetWidth, innerWidth - panel.offsetWidth - 8))}px`;
    toggle.setAttribute("aria-expanded", "true");
    check();
  };
  toggle.addEventListener("click", () => (panel.hidden ? open() : close()));
  panel.addEventListener("click", (e) => { const btn = e.target.closest("#update-install"); if (btn) install(btn); });
  document.addEventListener("click", (e) => { if (!panel.hidden && !panel.contains(e.target) && !toggle.contains(e.target)) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) { close(); toggle.focus(); } });
  window.renderIcons?.(toggle.parentElement);
})();
