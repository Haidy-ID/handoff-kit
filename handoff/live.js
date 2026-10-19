// Live reload on the local server: polls serve.py every second and reloads the page when a site file changes.
// The viewer state lives in the URL (view, flow, screen, device), so a reload comes back to the same place.
// Another server has no /__handoff/revision route: the first failed poll stops it.
(() => {
  if (!["localhost", "127.0.0.1", "[::1]"].includes(location.hostname)) return;
  let seen = null;
  const poll = async () => {
    const res = await fetch("/__handoff/revision", { cache: "no-store" }).catch(() => null);
    const body = res?.ok ? await res.json().catch(() => null) : null;
    if (!body) return;
    if (seen !== null && body.revision !== seen) return location.reload();
    seen = body.revision;
    setTimeout(poll, 1000);
  };
  poll();
})();
