// Small Markdown renderer for the topic journal and the Markdown deliverables (stories, studies). No dependency.
// Headings, paragraphs, lists, quotes, code, bold, italic and links. "> Gap: …" renders as a gap callout:
// a moment the story tells that no screen shows yet. Links go through options.link(href), which returns a URL or null.
window.renderMarkdown = (text, { link = (href) => href } = {}) => {
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  // Only web, relative and resolver-made links: javascript: and other schemes stay plain text.
  const safe = (href) => {
    const url = link(href);
    return url && !/^[a-z][\w+.-]*:/i.test(url.replace(/^https?:/i, "")) ? url : null;
  };
  const inline = (s) => esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<i>$2</i>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, href) => {
      const url = safe(href.replace(/&amp;/g, "&"));
      return url ? `<a href="${esc(url)}"${/^https?:/i.test(url) ? ' target="_blank"' : ""}>${label}</a>` : label;
    });

  const out = [];
  let list = null, para = [];
  const flush = () => {
    if (para.length) out.push(`<p>${inline(para.join(" "))}</p>`);
    para = [];
    if (list) out.push(`</${list}>`);
    list = null;
  };
  for (const raw of text.replace(/\r/g, "").split("\n")) {
    const line = raw.trimEnd();
    let m;
    if (!line.trim()) flush();
    else if ((m = line.match(/^(#{1,4})\s+(.*)/))) { flush(); const n = Math.min(m[1].length + 1, 5); out.push(`<h${n}>${inline(m[2])}</h${n}>`); }
    else if ((m = line.match(/^>\s*Gap:\s*(.*)/i))) { flush(); out.push(`<p class="md-gap"><span class="badge" data-variant="warning">Gap</span>${inline(m[1])}</p>`); }
    else if ((m = line.match(/^>\s?(.*)/))) { flush(); out.push(`<blockquote>${inline(m[1])}</blockquote>`); }
    else if ((m = line.match(/^\s*([-*]|\d+\.)\s+(.*)/))) {
      const tag = /\d/.test(m[1]) ? "ol" : "ul";
      if (para.length) { out.push(`<p>${inline(para.join(" "))}</p>`); para = []; }
      if (list !== tag) { if (list) out.push(`</${list}>`); out.push(`<${tag}>`); list = tag; }
      out.push(`<li>${inline(m[2])}</li>`);
    } else {
      if (list) { out.push(`</${list}>`); list = null; }
      para.push(line.trim());
    }
  }
  flush();
  return out.join("\n");
};
