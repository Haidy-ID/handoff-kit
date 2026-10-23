// Screen state from the URL (?state=done); without one, the default written on <html data-state>.
const state = new URLSearchParams(location.search).get("state") || document.documentElement.dataset.state || "default";
document.documentElement.dataset.state = state;
// <div data-when="done command-palette"> shows only in the listed states.
document.querySelectorAll("[data-when]").forEach((el) => { el.hidden = !el.dataset.when.split(" ").includes(state); });
// Opens a screen the way a link click does, so the handoff Prototype mode loads it in its own frame.
const go = (href) => {
  const a = Object.assign(document.createElement("a"), { href });
  document.body.append(a);
  a.click();
  a.remove();
};
// Day picker of the generated app: one pressed day.
document.addEventListener("click", (e) => {
  const day = e.target.closest(".gym__days .btn");
  if (day) day.parentElement.querySelectorAll(".btn").forEach((b) => b.setAttribute("aria-pressed", String(b === day)));
});
