// Screen state from the URL (?state=filtered) so the handoff page can show every state of a screen.
const state = new URLSearchParams(location.search).get("state") || "default";
document.documentElement.dataset.state = state;
// Optional per-state content: <span data-when="long-title">…</span> is shown only in that state.
document.querySelectorAll("[data-when]").forEach((el) => { el.hidden = el.dataset.when !== state; });
// A theme change repaints at once: component color transitions would otherwise run each at its own speed, and the
// render lint would read their start colors.
new MutationObserver(() => {
  const root = document.documentElement;
  root.classList.add("theme-switch");
  getComputedStyle(root).color;
  requestAnimationFrame(() => root.classList.remove("theme-switch"));
}).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
// A link in the menu drawer may point inside the current page (#contact): the drawer closes so the target shows.
document.addEventListener("click", (e) => e.target.closest?.(".drawer a[href]")?.closest("dialog").close());
