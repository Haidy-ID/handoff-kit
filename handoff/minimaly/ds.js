// Minimaly behaviors. Icons: <i class="icon" data-icon="bell"></i> becomes the inline Phosphor SVG.
// Weights through data-icon-style: regular (default), bold, fill, light, thin, duotone.
// Inline SVG, not an icon font, so Copy to Figma receives real vectors.
(() => {
  const CDN = "https://cdn.jsdelivr.net/npm/@phosphor-icons/core@2.1.1/assets";
  const cache = new Map();
  const load = (style, name) => {
    const key = style === "regular" ? `regular/${name}` : `${style}/${name}-${style}`;
    if (!cache.has(key)) cache.set(key, fetch(`${CDN}/${key}.svg`).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`Unknown icon ${key}`)))));
    return cache.get(key);
  };
  const render = (el) =>
    load(el.dataset.iconStyle || "regular", el.dataset.icon).then(
      (svg) => {
        el.innerHTML = svg.replace(/\s(width|height)="\d+"/g, "");
        el.querySelector("svg").setAttribute("aria-hidden", "true");
      },
      (e) => {
        el.dataset.iconError = e.message;
        console.error(e);
      },
    );
  // Pages that render their markup from JS call renderIcons(root) after each render.
  window.renderIcons = (root = document) => Promise.all([...root.querySelectorAll("[data-icon]:not(:has(svg))")].map(render));
  // Resolved once every icon of the page is in place; the render linter waits on it.
  window.iconsReady = window.renderIcons();

  // Tooltips: any element with data-tip="…" shows a .tooltip on hover or keyboard focus.
  // Works for markup rendered later (delegated). Placed above the element, or below when there is no room.
  // Timing from interior.dev's Tooltip Group: a cold pointer rests 200 ms before a bubble opens. Leaving waits 120 ms,
  // so crossing the gap to a neighbour does not blink. For 400 ms after a bubble closes, the next one opens at once.
  const OPEN_DELAY = 200;
  const LEAVE_GRACE = 120;
  const WARM_FOR = 400;
  const tip = Object.assign(document.createElement("div"), { className: "tooltip", role: "tooltip", hidden: true });
  tip.style.cssText = "position:fixed;z-index:1000;pointer-events:none";
  let openTimer = 0;
  let leaveTimer = 0;
  let owner = null;
  let warmUntil = 0;
  // cold: a click, a key or a scroll ends the group, the next bubble waits again.
  const hide = (cold) => {
    clearTimeout(openTimer);
    clearTimeout(leaveTimer);
    leaveTimer = 0;
    if (!tip.hidden) warmUntil = cold === true ? 0 : performance.now() + WARM_FOR;
    tip.hidden = true;
    owner = null;
  };
  const show = (el, instant) => {
    if (!tip.isConnected) document.body.append(tip);
    tip.textContent = el.dataset.tip;
    // Moving along a warm group swaps the text in place: no pop-in for each neighbour.
    tip.toggleAttribute("data-instant", instant);
    tip.hidden = false;
    const r = el.getBoundingClientRect();
    // Layout size, not the bounding box: the pop-in animation starts slightly scaled down.
    const t = { width: tip.offsetWidth, height: tip.offsetHeight };
    const left = Math.max(8, Math.min(innerWidth - t.width - 8, r.left + r.width / 2 - t.width / 2));
    // Above the element; below only when there is no room above.
    const above = r.top - 8 - t.height > 0;
    tip.style.left = `${left}px`;
    tip.style.top = `${above ? r.top - 8 - t.height : r.bottom + 8}px`;
    // The side drives the direction it opens from (CSS --from).
    tip.dataset.side = above ? "top" : "bottom";
  };
  const arm = (el, delay) => {
    clearTimeout(leaveTimer);
    leaveTimer = 0;
    if (el === owner) return;
    const warm = !tip.hidden || performance.now() < warmUntil;
    hide();
    owner = el;
    if (warm || !delay) show(el, warm);
    else openTimer = setTimeout(() => show(el, false), delay);
  };
  const leave = () => { if (owner && !leaveTimer) leaveTimer = setTimeout(hide, LEAVE_GRACE); };
  document.addEventListener("pointerover", (e) => {
    const el = e.target.closest?.("[data-tip]");
    el ? arm(el, OPEN_DELAY) : leave();
  });
  document.addEventListener("focusin", (e) => {
    const el = e.target.closest?.("[data-tip]");
    if (el?.matches(":focus-visible")) arm(el, 0);
  });
  addEventListener("focusout", hide, true);
  for (const type of ["pointerdown", "scroll", "keydown"]) addEventListener(type, () => hide(true), true);
  // Leaving the page, or entering a screen iframe, sends no pointerover here: hide on the way out.
  document.addEventListener("pointerout", (e) => { if (!e.relatedTarget) leave(); });

  // Select: the native <select> keeps the value and fires "change"; its list opens as a Minimaly menu instead of the
  // browser's. Works for selects rendered later (delegated). Keys: Enter, Space or ↓ open; ↑ ↓ move; Enter picks; Esc closes.
  let menu = null;
  const close = (refocus) => {
    if (!menu) return;
    const { el, select } = menu;
    menu = null;
    // hidden plays the closing transition (CSS), then the list goes.
    el.hidden = true;
    setTimeout(() => el.remove(), parseFloat(getComputedStyle(el).transitionDuration) * 1000 || 0);
    if (refocus) select.focus();
  };
  const pick = (select, value) => {
    if (select.value !== value) {
      select.value = value;
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    close(true);
  };
  const open = (select) => {
    close();
    const el = Object.assign(document.createElement("div"), { className: "popover select__menu", role: "listbox" });
    el.innerHTML = [...select.options].map((o) => `<button type="button" class="select__option" role="option" data-value="${o.value.replace(/"/g, "&quot;")}" aria-selected="${o.selected}"><span></span><i class="icon" data-icon="check"></i></button>`).join("");
    el.querySelectorAll(".select__option").forEach((b, i) => { b.firstChild.textContent = select.options[i].text; });
    document.body.append(el);
    window.renderIcons(el);
    const r = select.closest(".select").getBoundingClientRect();
    el.style.minWidth = `${r.width}px`;
    el.style.left = `${Math.min(r.left, innerWidth - el.offsetWidth - 8)}px`;
    const below = r.bottom + 4 + el.offsetHeight < innerHeight;
    el.style.top = `${below ? r.bottom + 4 : r.top - 4 - el.offsetHeight}px`;
    el.dataset.side = below ? "bottom" : "top";
    menu = { el, select };
    (el.querySelector('[aria-selected="true"]') || el.firstElementChild).focus();
  };
  document.addEventListener("mousedown", (e) => {
    // The whole box opens the list: the inline label and the caret included.
    const select = e.target.closest?.(".select")?.querySelector("select");
    if (select) {
      e.preventDefault();
      menu?.select === select ? close(true) : open(select);
    } else if (menu && !menu.el.contains(e.target)) close();
  });
  document.addEventListener("click", (e) => {
    const option = menu && e.target.closest(".select__option");
    if (option) pick(menu.select, option.dataset.value);
  });
  document.addEventListener("keydown", (e) => {
    if (menu) {
      const items = [...menu.el.querySelectorAll(".select__option")];
      const i = items.indexOf(document.activeElement);
      if (e.key === "Escape" || e.key === "Tab") { e.preventDefault(); close(true); }
      else if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); items[Math.max(0, Math.min(items.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)))].focus(); }
      e.stopPropagation();
      return;
    }
    const select = e.target.closest?.(".select select");
    if (select && ["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) { e.preventDefault(); open(select); }
  }, true);
  addEventListener("resize", () => close());

  // Live region shared by the behaviours below: a screen reader hears outcomes, the visible labels can stay short.
  const status = document.createElement("div");
  status.setAttribute("role", "status");
  status.style.cssText = "position:fixed;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap";
  const announce = (text) => {
    if (!status.isConnected) document.body.append(status);
    status.textContent = "";
    // Cleared first, so the same outcome twice in a row is announced twice.
    setTimeout(() => { status.textContent = text; }, 50);
  };

  // Segmented and tabs: one indicator per group slides under the chosen option, the highlight never jumps (interior.dev).
  // The page only flips aria-pressed (segmented) or aria-selected (tabs); the indicator follows, also for groups rendered later.
  const CHOSEN = { segmented: ':scope > .btn[aria-pressed="true"]', tabs: ':scope > [role="tab"][aria-selected="true"]' };
  const sizer = new ResizeObserver((entries) => entries.forEach((e) => placeIndicator(e.target)));
  const placeIndicator = (group) => {
    const kind = group.classList.contains("tabs") ? "tabs" : "segmented";
    let bar = group.querySelector(`:scope > .${kind}__indicator`);
    if (!bar) {
      bar = Object.assign(document.createElement("span"), { className: `${kind}__indicator` });
      bar.setAttribute("aria-hidden", "true");
      group.prepend(bar);
      sizer.observe(group);
    }
    const on = group.querySelector(CHOSEN[kind]);
    bar.hidden = !on;
    if (!on) return;
    bar.style.width = `${on.offsetWidth}px`;
    bar.style.transform = `translateX(${on.offsetLeft}px)`;
    // The first placement lands in place instead of sliding in from the left edge: reading the layout commits it
    // before the transition is switched on.
    if (on.offsetWidth && !bar.hasAttribute("data-ready")) {
      void bar.offsetWidth;
      bar.setAttribute("data-ready", "");
    }
  };

  // Async button (interior.dev Loading Button and Copy Button): idle, busy, done, error.
  // All labels share one grid cell, so the button keeps the width of its longest label and nothing around it moves.
  // Busy is not disabled: focus stays and a second click is ignored. The accessible name never changes; outcomes are announced.
  const STATES = [["busy", "circle-notch"], ["done", "check"], ["error", "warning"]];
  const buildButton = (btn) => {
    const copy = btn.hasAttribute("data-copy");
    const iconOnly = btn.dataset.variant === "icon";
    const idle = Object.assign(document.createElement("span"), { className: "btn__label" });
    idle.dataset.for = "idle";
    idle.append(...btn.childNodes);
    const name = btn.getAttribute("aria-label") || idle.textContent.trim();
    const text = {
      busy: btn.dataset.busy || idle.textContent.trim(),
      done: btn.dataset.done || (copy ? "Copied" : "Done"),
      error: btn.dataset.error || (copy ? "Failed" : "Try again"),
    };
    const labels = STATES.map(([state, icon]) => {
      const label = Object.assign(document.createElement("span"), { className: "btn__label" });
      label.dataset.for = state;
      label.innerHTML = `<i class="icon" data-icon="${icon}"></i>`;
      if (!iconOnly) label.append(text[state]);
      return label;
    });
    btn.append(idle, ...labels);
    for (const label of btn.children) label.setAttribute("aria-hidden", "true");
    btn.setAttribute("aria-label", name);
    btn.dataset.state = "idle";
    btn.asyncText = text;
    window.renderIcons(btn);
  };
  const holds = new WeakMap();
  const setState = (btn, state, hold) => {
    clearTimeout(holds.get(btn));
    btn.dataset.state = state;
    state === "busy" ? btn.setAttribute("aria-busy", "true") : btn.removeAttribute("aria-busy");
    if (state === "done" || state === "error") {
      announce(btn.asyncText[state]);
      holds.set(btn, setTimeout(() => setState(btn, "idle"), hold));
    }
  };
  // Pages run their action through the button: runButton(btn, () => fetch(…)). A throw or a rejection ends in error.
  // Reporting the error itself stays the page's job: the promise rejects with it.
  window.runButton = async (btn, action, hold = 1400) => {
    if (btn.dataset.state === "busy") return;
    setState(btn, "busy");
    try {
      const result = await action();
      setState(btn, "done", hold);
      return result;
    } catch (e) {
      setState(btn, "error", hold);
      throw e;
    }
  };
  // data-copy="…" copies on click with no script. An empty value copies nothing and reports nothing.
  // Each new copy restarts the 2 s hold instead of stacking timers.
  document.addEventListener("click", (e) => {
    const btn = e.target.closest?.(".btn[data-copy]");
    if (!btn?.dataset.copy) return;
    copyText(btn.dataset.copy).then(() => setState(btn, "done", 2000), () => setState(btn, "error", 2000));
  });
  // The async clipboard is refused in iframes without clipboard-write (Playground, handoff screens): copy through a selection then.
  const copyText = (text) =>
    (navigator.clipboard?.writeText(text) ?? Promise.reject()).catch(() => {
      const focused = document.activeElement;
      const area = Object.assign(document.createElement("textarea"), { value: text });
      area.style.cssText = "position:fixed;opacity:0";
      document.body.append(area);
      area.select();
      const copied = document.execCommand("copy");
      area.remove();
      focused?.focus();
      if (!copied) throw new Error("Clipboard refused");
    });

  // Value (interior.dev Value Flash): when the text of a .value changes, it lights up for --duration-flash
  // with an arrow for the direction. The page only sets textContent. data-label="…" also announces the settled
  // value, once the figure has been quiet for 700 ms.
  const values = new WeakMap();
  const quiet = new WeakMap();
  // The characters that changed, compared from the right (figures grow on the left), each in a .value__char that rolls in.
  // values already holds the new text, so the rewrite below does not count as a new change.
  const rollDigits = (el, prev, next) => {
    const offset = next.length - prev.length;
    let i = 0;
    el.replaceChildren(...[...next].map((ch, k) => {
      if (prev[k - offset] === ch) return document.createTextNode(ch);
      const span = Object.assign(document.createElement("span"), { className: "value__char", textContent: ch });
      span.style.setProperty("--i", i++);
      return span;
    }));
  };
  const toNumber = (text) => parseFloat(text.replace(/\u2212/g, "-").replace(/[^\d.-]/g, ""));
  const watchValue = (el) => {
    const next = el.textContent;
    const prev = values.get(el);
    values.set(el, next);
    if (prev === undefined || prev === next) return;
    const a = toNumber(prev);
    const b = toNumber(next);
    el.removeAttribute("data-trend");
    void el.offsetWidth; // restarts the flash when a new change lands mid-flash
    el.dataset.trend = b > a ? "up" : b < a ? "down" : "change";
    rollDigits(el, prev, next);
    if (el.dataset.label) {
      clearTimeout(quiet.get(el));
      quiet.set(el, setTimeout(() => announce(`${el.dataset.label}: ${el.textContent}`), 700));
    }
  };
  document.addEventListener("animationend", (e) => {
    if (e.animationName === "value-flash" && !e.pseudoElement) e.target.removeAttribute("data-trend");
  });

  // Skeleton (interior.dev Skeleton Swap): loadInto(box, load) holds the box at its final height while load() runs.
  // CSS keeps the skeleton invisible for its first 120 ms, so a faster answer never shows one. Once painted it stays
  // at least 380 ms, so it cannot blink. load() resolves to an HTML string or a node.
  const SKELETON_DELAY = 120;
  const SKELETON_MIN = 380;
  window.loadInto = async (box, load, { lines = 3, height, label } = {}) => {
    const start = performance.now();
    const skeleton = Object.assign(document.createElement("div"), { className: "skeleton" });
    if (height) {
      skeleton.dataset.variant = "block";
      skeleton.style.height = `${height}px`;
    } else skeleton.innerHTML = "<span></span>".repeat(lines);
    box.setAttribute("aria-busy", "true");
    box.replaceChildren(skeleton);
    try {
      const content = await load();
      const shown = performance.now() - start - SKELETON_DELAY;
      if (shown > 0 && shown < SKELETON_MIN) await new Promise((r) => setTimeout(r, SKELETON_MIN - shown));
      typeof content === "string" ? (box.innerHTML = content) : box.replaceChildren(content);
      window.renderIcons(box);
      if (label) announce(`${label} loaded`);
    } finally {
      box.removeAttribute("aria-busy");
    }
  };

  // Tabs (interior.dev Tabs): a .tabs role="tablist" of .tabs__tab role="tab", each aria-controls its .tabs__panel.
  // Click, arrows, Home and End select at once; only the selected tab is in the Tab order. The list fires "change".
  const tabsOf = (list) => [...list.querySelectorAll(':scope > [role="tab"]')];
  const selectTab = (tab, focus) => {
    const list = tab.closest(".tabs");
    const changed = tab.getAttribute("aria-selected") !== "true";
    for (const t of tabsOf(list)) {
      const on = t === tab;
      t.setAttribute("aria-selected", on);
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.hidden = !on;
    }
    if (focus) tab.focus();
    if (changed) list.dispatchEvent(new CustomEvent("change", { bubbles: true, detail: tab }));
  };
  const initTabs = (list) => {
    const tabs = tabsOf(list);
    const chosen = tabs.find((t) => t.getAttribute("aria-selected") === "true") || tabs.find((t) => !t.disabled);
    if (chosen) selectTab(chosen, false);
    placeIndicator(list);
  };
  document.addEventListener("click", (e) => {
    const tab = e.target.closest?.('.tabs > [role="tab"]');
    if (tab && !tab.disabled) selectTab(tab, false);
  });
  document.addEventListener("keydown", (e) => {
    const tab = e.target.closest?.('.tabs > [role="tab"]');
    if (!tab || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const tabs = tabsOf(tab.closest(".tabs")).filter((t) => !t.disabled);
    const i = tabs.indexOf(tab);
    const next = { ArrowLeft: tabs[(i - 1 + tabs.length) % tabs.length], ArrowRight: tabs[(i + 1) % tabs.length], Home: tabs[0], End: tabs.at(-1) }[e.key];
    selectTab(next, true);
  });

  // Menu (interior.dev Dropdown and Context Menu): a .popover.menu of .menu__item buttons, hidden in the markup.
  // data-menu="<id>" on a button opens it below; data-context-menu="<id>" on a surface opens it at the pointer on right-click,
  // or at the surface with the menu key or Shift+F10. Arrows move, Esc and Tab close, a chosen item closes it and focus returns.
  let openMenu = null;
  const menuItems = (el) => [...el.querySelectorAll('.menu__item:not(:disabled):not([aria-disabled="true"])')];
  const closeMenu = (refocus) => {
    if (!openMenu) return;
    const { el, trigger } = openMenu;
    openMenu = null;
    el.hidden = true;
    if (trigger.hasAttribute("data-menu")) trigger.setAttribute("aria-expanded", "false");
    if (refocus) trigger.focus();
  };
  const showMenu = (el, trigger, at) => {
    closeMenu();
    // Out of any transformed or clipping parent, so position: fixed means the viewport.
    if (el.parentElement !== document.body) document.body.append(el);
    el.hidden = false;
    const r = at ? { left: at.x, top: at.y, bottom: at.y } : trigger.getBoundingClientRect();
    el.style.left = `${Math.max(8, Math.min(r.left, innerWidth - el.offsetWidth - 8))}px`;
    const below = r.bottom + 4 + el.offsetHeight < innerHeight;
    el.style.top = `${below ? r.bottom + 4 : Math.max(8, r.top - 4 - el.offsetHeight)}px`;
    el.dataset.side = below ? "bottom" : "top";
    openMenu = { el, trigger };
    if (trigger.hasAttribute("data-menu")) trigger.setAttribute("aria-expanded", "true");
    menuItems(el)[0]?.focus();
  };
  const initMenuTrigger = (trigger) => {
    const el = document.getElementById(trigger.dataset.menu || trigger.dataset.contextMenu);
    if (!el) return;
    el.setAttribute("role", "menu");
    el.hidden = true;
    el.querySelectorAll(".menu__item").forEach((item) => item.setAttribute("role", "menuitem"));
    if (trigger.hasAttribute("data-menu")) {
      trigger.setAttribute("aria-haspopup", "menu");
      trigger.setAttribute("aria-expanded", "false");
    } else if (!trigger.hasAttribute("tabindex")) trigger.tabIndex = 0;
  };
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest?.("[data-menu]");
    if (trigger) {
      openMenu?.trigger === trigger ? closeMenu(true) : showMenu(document.getElementById(trigger.dataset.menu), trigger);
      return;
    }
    if (openMenu && e.target.closest?.(".menu__item") && openMenu.el.contains(e.target)) closeMenu(true);
  });
  document.addEventListener("contextmenu", (e) => {
    const surface = e.target.closest?.("[data-context-menu]");
    if (!surface) return;
    e.preventDefault();
    // A keyboard-opened context menu has no pointer position: it opens at the surface.
    const r = surface.getBoundingClientRect();
    const at = e.clientX || e.clientY ? { x: e.clientX, y: e.clientY } : { x: r.left, y: r.bottom };
    showMenu(document.getElementById(surface.dataset.contextMenu), surface, at);
  });
  document.addEventListener("mousedown", (e) => {
    if (openMenu && !openMenu.el.contains(e.target) && !openMenu.trigger.contains(e.target)) closeMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (!openMenu) return;
    const items = menuItems(openMenu.el);
    const i = items.indexOf(document.activeElement);
    const go = { ArrowDown: items[(i + 1) % items.length], ArrowUp: items[(i - 1 + items.length) % items.length], Home: items[0], End: items.at(-1) }[e.key];
    if (go) { e.preventDefault(); go.focus(); }
    else if (e.key === "Escape" || e.key === "Tab") { e.preventDefault(); closeMenu(true); }
  });
  addEventListener("scroll", (e) => { if (openMenu && !openMenu.el.contains(e.target)) closeMenu(); }, true);
  addEventListener("resize", () => closeMenu());

  // Modal and drawer: native <dialog class="modal|drawer">. data-open="<id>" opens one, data-close closes the one it sits in.
  // Esc closes the top one and focus returns to the opener (both native). The backdrop closes only on a press that both
  // starts and ends on it, so a text selection dragged out of the panel never closes it; data-static disables it.
  let pressedBackdrop = null;
  const onBackdrop = (e) => {
    const d = e.target;
    if (!d.matches?.("dialog:is(.modal, .drawer)[open]") || d.hasAttribute("data-static")) return null;
    const r = d.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom ? d : null;
  };
  document.addEventListener("pointerdown", (e) => { pressedBackdrop = onBackdrop(e); });
  document.addEventListener("click", (e) => {
    const opener = e.target.closest?.("[data-open]");
    if (opener) document.getElementById(opener.dataset.open)?.showModal();
    const closer = e.target.closest?.("dialog [data-close]");
    if (closer) closer.closest("dialog").close();
    if (pressedBackdrop && onBackdrop(e) === pressedBackdrop) pressedBackdrop.close();
    pressedBackdrop = null;
  });

  // Toast: toast("Saved", { variant: "success" | "critical", action: { label, onClick }, duration }) shows news at the
  // bottom right and returns a function that dismisses it. 4 s by default; critical stays until dismissed. Hovering or
  // focusing a toast pauses its clock. The same message again restarts its clock instead of stacking a copy. At most 3.
  const TOAST_ICONS = { success: "check-circle", critical: "warning-circle" };
  let toastRoot = null;
  const dismissToast = (el) => {
    if (el.hasAttribute("data-leaving")) return;
    clearTimeout(el.toastTimer);
    el.setAttribute("data-leaving", "");
    el.addEventListener("animationend", () => el.remove(), { once: true });
  };
  const runToast = (el, ms) => {
    clearTimeout(el.toastTimer);
    if (!ms) return;
    el.toastEnd = performance.now() + ms;
    el.toastTimer = setTimeout(() => dismissToast(el), ms);
  };
  window.toast = (message, { variant, action, duration = variant === "critical" ? 0 : 4000 } = {}) => {
    if (!toastRoot) toastRoot = Object.assign(document.createElement("div"), { className: "toasts" });
    if (!toastRoot.isConnected) document.body.append(toastRoot);
    let el = [...toastRoot.children].find((t) => t.toastMessage === message && !t.hasAttribute("data-leaving"));
    if (!el) {
      el = Object.assign(document.createElement("div"), { className: "toast" });
      el.toastMessage = message;
      if (variant) el.dataset.variant = variant;
      if (TOAST_ICONS[variant]) el.innerHTML = `<i class="icon" data-icon="${TOAST_ICONS[variant]}"></i>`;
      el.append(Object.assign(document.createElement("span"), { className: "toast__text", textContent: message }));
      if (action) {
        const b = Object.assign(document.createElement("button"), { className: "btn", textContent: action.label });
        b.addEventListener("click", () => { action.onClick?.(); dismissToast(el); });
        el.append(b);
      }
      const close = Object.assign(document.createElement("button"), { className: "btn", innerHTML: '<i class="icon" data-icon="x"></i>' });
      close.dataset.variant = "icon";
      close.setAttribute("aria-label", "Dismiss");
      close.addEventListener("click", () => dismissToast(el));
      el.append(close);
      el.toastDuration = duration;
      const pause = () => { clearTimeout(el.toastTimer); el.toastLeft = el.toastEnd - performance.now(); };
      const resume = () => { if (el.toastDuration && !el.matches(":hover, :focus-within")) runToast(el, Math.max(1000, el.toastLeft)); };
      el.addEventListener("pointerenter", pause);
      el.addEventListener("focusin", pause);
      el.addEventListener("pointerleave", resume);
      el.addEventListener("focusout", () => setTimeout(resume));
      toastRoot.append(el);
      window.renderIcons(el);
      const live = [...toastRoot.children].filter((t) => !t.hasAttribute("data-leaving"));
      live.slice(0, Math.max(0, live.length - 3)).forEach(dismissToast);
    }
    announce(message);
    runToast(el, duration);
    return () => dismissToast(el);
  };

  // Streaming text: streamText(el, text, { rate }) reveals an agent's answer word by word, rate in words per second (18).
  // Words due are computed from elapsed time, so the rate holds when frames drop. aria-busy holds the screen reader
  // until the end. A click on the text shows it all at once. Reduced motion shows it at once. Resolves when complete.
  const streams = new WeakMap();
  window.streamText = (el, text, { rate = 18 } = {}) => new Promise((resolve) => {
    streams.get(el)?.finish(false);
    const words = text.split(/(\s+)/);
    const start = performance.now();
    let timer = 0;
    const finish = (complete = true) => {
      clearTimeout(timer);
      streams.delete(el);
      if (complete) el.textContent = text;
      el.removeAttribute("aria-busy");
      resolve();
    };
    streams.set(el, { finish });
    el.setAttribute("aria-busy", "true");
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return finish();
    const tick = () => {
      const due = Math.floor(((performance.now() - start) / 1000) * rate);
      if (due * 2 >= words.length) return finish();
      el.textContent = words.slice(0, due * 2).join("");
      timer = setTimeout(tick, 1000 / rate / 2);
    };
    tick();
  });
  document.addEventListener("click", (e) => {
    const el = e.target.closest?.('.stream[aria-busy="true"]');
    if (el) streams.get(el)?.finish();
  });

  // Typing: the three dots dance a 12 s loop on one line, each figure melting into the next:
  // wave, ping-pong, wave, Newton's cradle. Every figure gets 2.4 s, every blend 0.6 s.
  // Each figure is a function of time, so a blend runs both at once and the dots never stop mid-move.
  // One keyframe track per dot, computed once and shared by every indicator. Reduced motion keeps the dots still.
  const ROUTINE = ["wave", "pong", "wave", "pendulum"], FIGURE = 3000, DANCE = ROUTINE.length * FIGURE;
  const figures = {
    wave: (i, t) => {
      const p = (((t - i * 160) / 1200) % 1 + 1) % 1, up = p < 0.6 ? Math.sin((Math.PI * p) / 0.6) : 0;
      return [(i - 1) * 8, -3 * up, 1, 0.3 + 0.7 * up];
    },
    // The middle dot hops between the outer two, which swell on each hit.
    pong: (i, t) => {
      const u = (t / 1200) % 1;
      if (i === 1) { const h = (u * 2) % 1; return [u < 0.5 ? -8 + 16 * h : 8 - 16 * h, -20 * h * (1 - h), 1, 1]; }
      const hit = Math.max(0, 1 - ((u - (i ? 0.5 : 0) + 1) % 1) / 0.25);
      return [i ? 13 : -13, 0, 1 + 0.35 * hit, 0.45 + 0.55 * hit];
    },
    // Newton's cradle: the outer dots swing out in turn and fall back, fastest at the hit. The middle one stays,
    // and each hit flashes it and nudges it the way the momentum goes, like the pong paddles.
    pendulum: (i, t) => {
      const u = (t / 1200) % 1, side = i - 1, hit = Math.max(0, 1 - ((u * 2) % 1) / 0.25);
      if (!side) return [(u < 0.5 ? -1.5 : 1.5) * hit, 0, 1 + 0.35 * hit, 0.55 + 0.45 * hit];
      const swing = (side < 0) === (u < 0.5) ? Math.sin(Math.PI * ((u * 2) % 1)) : 0;
      return [side * (8 + 6 * swing), -3 * swing * swing, 1, 0.55 + 0.45 * swing];
    },
  };
  const blend = (a, b, from, to, t) => {
    const x = Math.min(1, Math.max(0, (t - from) / (to - from))), w = x * x * (3 - 2 * x);
    return a.map((v, k) => v + (b[k] - v) * w);
  };
  const danceAt = (i, t) => {
    const k = Math.min(ROUTINE.length - 1, Math.floor(t / FIGURE)), next = ROUTINE[(k + 1) % ROUTINE.length];
    return blend(figures[ROUTINE[k]](i, t), figures[next](i, t), (k + 1) * FIGURE - 600, (k + 1) * FIGURE, t);
  };
  let dance;
  const startDance = (dots) => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || dots.firstElementChild?.getAnimations().length) return;
    dance ??= [0, 1, 2].map((i) => Array.from({ length: 361 }, (_, k) => {
      const [x, y, s, o] = danceAt(i, (k / 360) * DANCE);
      return { transform: `translate(${x - (i - 1) * 8}px, ${y}px) scale(${s})`, opacity: o };
    }));
    [...dots.children].slice(0, 3).forEach((dot, i) => dot.animate(dance[i], { duration: DANCE, iterations: Infinity }));
  };

  // Steps: each row gets its mark (spinner, check, cross); CSS shows the one matching data-state.
  const buildSteps = (list) => {
    for (const li of list.children) {
      if (!li.querySelector(".steps__mark")) li.insertAdjacentHTML("afterbegin", '<span class="steps__mark" aria-hidden="true"><span class="steps__spinner"></span><i class="icon" data-icon="check"></i><i class="icon" data-icon="x"></i></span>');
    }
    window.renderIcons(list);
  };
  // Divider: the two rules on each side of the label are real elements, so Copy to Figma keeps them.
  const buildDivider = (el) => {
    if (el.querySelector(".divider__line")) return;
    const line = () => Object.assign(document.createElement("span"), { className: "divider__line", ariaHidden: "true" });
    el.prepend(line());
    el.append(line());
  };
  // Steps: setSteps(list, current, failed) marks a run. Before current: done. current: active, or failed when failed is
  // true, and nothing after a failure pretends to have run. current = number of steps: the run is complete.
  window.setSteps = (list, current, failed = false) => {
    [...list.children].forEach((li, i) => {
      const state = i < current ? "done" : i === current ? (failed ? "failed" : "active") : null;
      state ? (li.dataset.state = state) : li.removeAttribute("data-state");
      i === current ? li.setAttribute("aria-current", "step") : li.removeAttribute("aria-current");
    });
    current < list.children.length && !failed ? list.setAttribute("aria-busy", "true") : list.removeAttribute("aria-busy");
  };

  // Progress: setProgress(el, value, max = 100). The fill and the readout both use the whole percent, so they never
  // disagree. value null = total not known yet: the fill crawls towards a third and the readout says data-working.
  // Reaching 100 is announced once.
  window.setProgress = (el, value, max = 100) => {
    const readout = el.querySelector(".progress__value");
    const bar = el.querySelector('[role="progressbar"]');
    if (value == null) {
      el.dataset.state = "unknown";
      readout.textContent = el.dataset.working || "Working";
      bar.removeAttribute("aria-valuenow");
      return;
    }
    const pct = Math.round((Math.min(max, Math.max(0, value)) / max) * 100);
    const done = pct === 100;
    if (done && el.dataset.state !== "done") announce(`${el.querySelector(".progress__label")?.textContent ?? "Progress"}: complete`);
    done ? (el.dataset.state = "done") : el.removeAttribute("data-state");
    el.style.setProperty("--progress", pct);
    readout.textContent = `${pct}%`;
    bar.setAttribute("aria-valuenow", pct);
  };

  // Pagination: <nav class="pagination" data-pages="24" data-page="1">. ds.js draws previous, 7 slots and next; a slot
  // is a page or a gap, and every slot is as wide as the largest number, so the arrows never move. Fires "change".
  const renderPagination = (nav) => {
    const pages = Math.max(1, +nav.dataset.pages || 1);
    const page = Math.min(pages, Math.max(1, +nav.dataset.page || 1));
    if (nav.renderedPage === `${page}/${pages}`) return;
    nav.renderedPage = `${page}/${pages}`;
    nav.style.setProperty("--digits", String(pages).length);
    const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
    const slots = pages <= 7 ? range(1, pages)
      : page <= 4 ? [...range(1, 5), "…", pages]
      : page >= pages - 3 ? [1, "…", ...range(pages - 4, pages)]
      : [1, "…", page - 1, page, page + 1, "…", pages];
    if (!nav.querySelector(".pagination__pages")) {
      nav.innerHTML = '<button class="btn" data-variant="icon" data-step="-1" aria-label="Previous page"><i class="icon" data-icon="caret-left"></i></button><span class="pagination__pages" style="display:contents"></span><button class="btn" data-variant="icon" data-step="1" aria-label="Next page"><i class="icon" data-icon="caret-right"></i></button>';
      if (!nav.hasAttribute("aria-label")) nav.setAttribute("aria-label", "Pagination");
      window.renderIcons(nav);
    }
    nav.querySelector('[data-step="-1"]').disabled = page === 1;
    nav.querySelector('[data-step="1"]').disabled = page === pages;
    nav.querySelector(".pagination__pages").innerHTML = slots
      .map((n) => (n === "…" ? '<span class="pagination__gap" aria-hidden="true">…</span>' : `<button class="btn" data-to="${n}" aria-label="Page ${n}"${n === page ? ' aria-current="page"' : ""}>${n}</button>`))
      .join("");
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest?.(".pagination .btn");
    if (!b) return;
    const nav = b.closest(".pagination");
    const page = b.dataset.to ? +b.dataset.to : +nav.dataset.page + +b.dataset.step;
    nav.dataset.page = page;
    renderPagination(nav);
    if (b.dataset.to) nav.querySelector('[aria-current="page"]').focus();
    nav.dispatchEvent(new CustomEvent("change", { bubbles: true, detail: page }));
  });

  // Sortable table: .table[data-sortable]. Each header becomes a button: ascending, descending, then the original order.
  // A cell's data-value sorts instead of its text. Rows glide from their old place to the new one.
  const initTable = (table) => {
    [...table.tBodies[0].rows].forEach((row, i) => { row.dataset.order ??= i; });
    for (const th of table.tHead.rows[0].cells) {
      if (th.dataset.sort === "false" || th.querySelector("button")) continue;
      const b = document.createElement("button");
      b.append(...th.childNodes);
      th.append(b);
      th.setAttribute("aria-sort", "none");
    }
    for (const b of table.tHead.querySelectorAll("th[aria-sort] button")) {
      if (!b.querySelector(".table__sort")) b.insertAdjacentHTML("beforeend", '<span class="table__sort" aria-hidden="true">↕</span>');
    }
  };
  const SORT_MARKS = { none: "↕", ascending: "↑", descending: "↓" };
  const sortKey = (cell) => {
    const text = (cell.dataset.value ?? cell.textContent).trim();
    const n = Number(text.replace(/−/g, "-").replace(/[,\s%]/g, ""));
    return text && !Number.isNaN(n) ? n : text.toLowerCase();
  };
  document.addEventListener("click", (e) => {
    const th = e.target.closest?.(".table[data-sortable] th[aria-sort]");
    if (!th || !e.target.closest("button")) return;
    const table = th.closest("table");
    const body = table.tBodies[0];
    const rows = [...body.rows];
    const next = { none: "ascending", ascending: "descending", descending: "none" }[th.getAttribute("aria-sort")];
    table.tHead.querySelectorAll("th[aria-sort]").forEach((h) => h.setAttribute("aria-sort", "none"));
    th.setAttribute("aria-sort", next);
    table.tHead.querySelectorAll("th[aria-sort]").forEach((h) => { const mark = h.querySelector(".table__sort"); if (mark) mark.textContent = SORT_MARKS[h.getAttribute("aria-sort")]; });
    const col = th.cellIndex;
    const dir = next === "descending" ? -1 : 1;
    const sorted = next === "none" ? [...rows].sort((a, b) => a.dataset.order - b.dataset.order) : [...rows].sort((a, b) => {
      const x = sortKey(a.cells[col]);
      const y = sortKey(b.cells[col]);
      return (typeof x === typeof y ? (x < y ? -1 : x > y ? 1 : 0) : typeof x === "number" ? -1 : 1) * dir;
    });
    const before = new Map(rows.map((r) => [r, r.getBoundingClientRect().top]));
    body.append(...sorted);
    const root = getComputedStyle(document.documentElement);
    const duration = parseFloat(root.getPropertyValue("--duration-slow"));
    if (!duration) return;
    for (const r of sorted) {
      const dy = before.get(r) - r.getBoundingClientRect().top;
      if (dy) r.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration, easing: root.getPropertyValue("--ease-out").trim() });
    }
  });

  // Scroll spy: .toc[data-spy] marks with aria-current the link of the section crossing the reading line, data-spy-offset px
  // from the top (96; set it to the height of a sticky header). At the very bottom the last section wins, however short.
  // Sticky header: data-stuck once content passes under it.
  const spies = new Set();
  const stickies = new Set();
  const spy = (nav) => {
    const line = +(nav.dataset.spyOffset || 96);
    const links = [...nav.querySelectorAll('a[href^="#"]')];
    const atEnd = innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
    const current = atEnd ? links.at(-1) : links.filter((a) => document.getElementById(decodeURIComponent(a.hash.slice(1)))?.getBoundingClientRect().top <= line).at(-1) || links[0];
    for (const a of links) a === current ? a.setAttribute("aria-current", "location") : a.removeAttribute("aria-current");
  };
  const stick = (header) => header.toggleAttribute("data-stuck", scrollY > 0 && header.getBoundingClientRect().top <= 0);
  addEventListener("scroll", () => { spies.forEach(spy); stickies.forEach(stick); }, { passive: true });

  // Hold to confirm (interior.dev): .btn[data-hold] for an action that cannot be undone. Holding the pointer, Space or Enter
  // fills it over 1.8 s; letting go drains it 2.5 times faster, and pressing again resumes from what is left. Only a full
  // hold fires "confirm" on the button, then data-confirmed ("Confirmed") shows in full for 1.6 s and the button, its job
  // done, turns disabled for good. A click alone does nothing.
  const HOLD = 1800;
  const HOLD_SHOWN = 1600;
  const DRAIN = 2.5;
  let held = null;
  // The clock decides, the animation only draws: commit runs on a timer from the measured progress, never on a frame.
  const progressOf = (h) => {
    const t = performance.now() - h.since;
    return h.dir > 0 ? Math.min(1, h.from + t / HOLD) : h.dir < 0 ? Math.max(0, h.from - (t * DRAIN) / HOLD) : h.from;
  };
  const drive = (btn, dir) => {
    const h = btn.hold;
    h.from = progressOf(h);
    h.since = performance.now();
    h.dir = dir;
    btn.toggleAttribute("data-holding", dir > 0);
    clearTimeout(h.timer);
    h.anim.currentTime = h.from * HOLD;
    h.anim.playbackRate = dir > 0 ? 1 : -DRAIN;
    h.anim.play();
    if (dir > 0) h.timer = setTimeout(() => commit(btn), (1 - h.from) * HOLD);
  };
  const commit = (btn) => {
    const h = btn.hold;
    held = null;
    Object.assign(h, { dir: 0, from: 1 });
    h.anim.pause();
    h.anim.currentTime = HOLD;
    btn.removeAttribute("data-holding");
    btn.dataset.state = "done";
    btn.dispatchEvent(new Event("confirm", { bubbles: true }));
    announce(btn.querySelector('[data-for="done"]').textContent);
    setTimeout(() => btn.setAttribute("aria-disabled", "true"), HOLD_SHOWN);
  };
  const buildHold = (btn) => {
    const idle = Object.assign(document.createElement("span"), { className: "btn__label" });
    idle.dataset.for = "idle";
    idle.append(...btn.childNodes);
    const done = Object.assign(document.createElement("span"), { className: "btn__label", innerHTML: '<i class="icon" data-icon="check"></i>' });
    done.dataset.for = "done";
    done.append(btn.dataset.confirmed || "Confirmed");
    const fill = Object.assign(document.createElement("span"), { className: "btn__fill" });
    btn.append(fill, idle, done);
    for (const el of btn.children) el.setAttribute("aria-hidden", "true");
    btn.setAttribute("aria-label", btn.getAttribute("aria-label") || idle.textContent.trim());
    btn.setAttribute("aria-description", `Press and hold for ${HOLD / 1000} seconds`);
    btn.dataset.state = "idle";
    const anim = fill.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: HOLD, fill: "both" });
    anim.pause();
    btn.hold = { anim, dir: 0, from: 0, since: 0, timer: 0 };
    window.renderIcons(btn);
  };
  const press = (btn) => {
    if (btn.dataset.state !== "idle" || btn.getAttribute("aria-disabled") === "true") return;
    held = btn;
    drive(btn, 1);
    btn.addEventListener("pointerleave", release, { once: true });
  };
  const release = () => {
    const btn = held;
    held = null;
    if (btn?.hold.dir > 0) drive(btn, -1);
  };
  document.addEventListener("pointerdown", (e) => {
    const btn = e.button === 0 && e.target.closest?.(".btn[data-hold]");
    if (btn) press(btn);
  });
  document.addEventListener("keydown", (e) => {
    const btn = (e.key === " " || e.key === "Enter") && !e.repeat && e.target.closest?.(".btn[data-hold]");
    if (btn) { e.preventDefault(); press(btn); }
  });
  for (const type of ["pointerup", "pointercancel", "keyup"]) document.addEventListener(type, () => held && release());

  // Checkbox: the check is drawn in an SVG inside .checkbox__box (two paths: the check, and the dash of indeterminate).
  const CHECK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path class="checkbox__check" d="M3.5 8.5l3 3 6-7"/><path class="checkbox__dash" d="M4 8h8"/></svg>';
  const buildCheckbox = (box) => { if (!box.firstElementChild) box.innerHTML = CHECK; };

  // Field: the label names the control, the hint and the error describe it, data-invalid sets aria-invalid.
  let fieldIds = 0;
  const idOf = (el) => el.id || (el.id = `field-${++fieldIds}`);
  const syncField = (field) => {
    const control = field.querySelector(":scope > :is(.input, .select, .textarea) :is(input, select, textarea)");
    if (!control) return;
    if (field.hasAttribute("data-invalid")) control.setAttribute("aria-invalid", "true");
    else control.removeAttribute("aria-invalid");
  };
  const buildField = (field) => {
    const control = field.querySelector(":scope > :is(.input, .select, .textarea) :is(input, select, textarea)");
    const label = field.querySelector(":scope > label.field__label");
    if (control && label) label.htmlFor = idOf(control);
    const notes = [...field.querySelectorAll(":scope > :is(.field__hint, .field__error)")].map(idOf);
    if (control && notes.length) control.setAttribute("aria-describedby", notes.join(" "));
    const error = field.querySelector(":scope > .field__error");
    if (error) error.setAttribute("aria-live", "polite");
    syncField(field);
  };

  // Textarea: data-max="280" caps the length and shows "used / max"; the counter turns critical once full.
  const countText = (box) => {
    const area = box.querySelector("textarea");
    const count = box.querySelector(".textarea__count");
    count.textContent = `${area.value.length} / ${box.dataset.max}`;
    box.toggleAttribute("data-full", area.value.length >= Number(box.dataset.max));
  };
  const buildTextarea = (box) => {
    box.querySelector("textarea").maxLength = Number(box.dataset.max);
    box.append(Object.assign(document.createElement("span"), { className: "textarea__count", ariaHidden: "true" }));
    countText(box);
  };
  document.addEventListener("input", (e) => {
    const box = e.target.closest?.(".textarea[data-max]");
    if (box) countText(box);
  });

  // Composer: Send is enabled once there is text; Enter sends, Shift+Enter breaks the line. Sending fires "send" on the
  // form (event.detail.text) and empties the field; the page sets aria-busy while the agent answers and listens for
  // "stop" from the Stop button.
  const syncComposer = (form) => { form.querySelector(".composer__send").disabled = !form.querySelector(".composer__input").value.trim(); };
  document.addEventListener("input", (e) => {
    const form = e.target.closest?.(".composer");
    if (form) syncComposer(form);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.shiftKey || e.isComposing || !e.target.matches?.(".composer__input")) return;
    e.preventDefault();
    const form = e.target.closest(".composer");
    if (!form.querySelector(".composer__send").disabled && form.getAttribute("aria-busy") !== "true") form.requestSubmit();
  });
  document.addEventListener("submit", (e) => {
    const form = e.target.closest?.(".composer");
    if (!form) return;
    e.preventDefault();
    const field = form.querySelector(".composer__input");
    const text = field.value.trim();
    if (!text || form.getAttribute("aria-busy") === "true") return;
    field.value = "";
    syncComposer(form);
    form.dispatchEvent(new CustomEvent("send", { bubbles: true, detail: { text } }));
  });
  document.addEventListener("click", (e) => {
    const form = e.target.closest?.(".composer");
    if (!form) return;
    if (e.target.closest(".composer__stop")) form.dispatchEvent(new CustomEvent("stop", { bubbles: true }));
    // The whole box is the field: a click on its padding or bar puts the caret in it.
    else if (!e.target.closest("button, a, input, textarea, select")) form.querySelector(".composer__input").focus();
  });

  // Tool call: the status mark (spinner, check, cross) is built once; CSS shows the one matching data-state. Its label
  // follows data-state for screen readers.
  const TOOL_STATES = { running: "Running", done: "Done", failed: "Failed" };
  const syncToolCall = (el) => el.querySelector(".tool-call__status")?.setAttribute("aria-label", TOOL_STATES[el.dataset.state] || "");
  const buildToolCall = (el) => {
    const summary = el.querySelector("summary");
    if (!summary || summary.querySelector(".tool-call__status")) return;
    summary.insertAdjacentHTML("beforeend", '<span class="tool-call__status" role="img"><span class="tool-call__spinner"></span><i class="icon" data-icon="check-circle"></i><i class="icon" data-icon="x-circle"></i></span>');
    syncToolCall(el);
    window.renderIcons(summary);
  };

  // Dropzone: files dropped on it or picked through its input. Files that do not match the input's accept, or weigh
  // more than data-max-mb, are refused: the zone flashes data-invalid. Accepted files fire "files" (event.detail.files).
  const takeFiles = (zone, list) => {
    const input = zone.querySelector('input[type="file"]');
    const kinds = (input.accept || "").split(",").map((k) => k.trim().toLowerCase()).filter(Boolean);
    const fits = (f) => !kinds.length || kinds.some((k) => (k.startsWith(".") ? f.name.toLowerCase().endsWith(k) : k.endsWith("/*") ? f.type.startsWith(k.slice(0, -1)) : f.type === k));
    const max = Number(zone.dataset.maxMb) * 1024 * 1024 || Infinity;
    const files = [...list].filter((f) => fits(f) && f.size <= max);
    zone.removeAttribute("data-invalid");
    if (files.length < list.length) requestAnimationFrame(() => zone.setAttribute("data-invalid", ""));
    if (files.length) zone.dispatchEvent(new CustomEvent("files", { bubbles: true, detail: { files } }));
  };
  for (const type of ["dragenter", "dragover"]) document.addEventListener(type, (e) => {
    const zone = e.target.closest?.(".dropzone");
    if (!zone || zone.querySelector("input:disabled")) return;
    e.preventDefault();
    zone.setAttribute("data-over", "");
  });
  document.addEventListener("dragleave", (e) => {
    const zone = e.target.closest?.(".dropzone");
    if (zone && !zone.contains(e.relatedTarget)) zone.removeAttribute("data-over");
  });
  document.addEventListener("drop", (e) => {
    const zone = e.target.closest?.(".dropzone");
    if (!zone) return;
    e.preventDefault();
    zone.removeAttribute("data-over");
    if (!zone.querySelector("input:disabled")) takeFiles(zone, e.dataTransfer.files);
  });
  document.addEventListener("change", (e) => {
    const zone = e.target.matches?.('.dropzone input[type="file"]') && e.target.closest(".dropzone");
    if (zone) { takeFiles(zone, e.target.files); e.target.value = ""; }
  });

  // Stepper: each stage gets its mark (to do, current, done: three icons, CSS shows one) between two dashed lines.
  const buildStepper = (list) => {
    for (const li of list.children) {
      if (li.querySelector(".stepper__track")) continue;
      li.insertAdjacentHTML("afterbegin", '<span class="stepper__track" aria-hidden="true"><span class="stepper__line"><span class="stepper__fill"></span></span><span class="stepper__mark"><i class="icon" data-icon="circle-dashed"></i><i class="icon" data-icon="circle-half"></i><i class="icon" data-icon="check"></i></span><span class="stepper__line"><span class="stepper__fill"></span></span></span>');
    }
    window.renderIcons(list);
  };

  // Combobox: typing filters the options on their title and detail; the first match is active. ↑ ↓ move, Enter picks,
  // Escape closes, a click picks. Picking writes the title in the field and fires "select" (event.detail: value, option).
  let comboIds = 0;
  const comboParts = (box) => ({ field: box.querySelector("input"), list: box.querySelector(".combobox__list"), options: [...box.querySelectorAll(".combobox__option")], empty: box.querySelector(".combobox__empty") });
  const setActive = (box, option, scroll = false) => {
    const { field, options } = comboParts(box);
    for (const o of options) o.setAttribute("aria-selected", String(o === option));
    option ? field.setAttribute("aria-activedescendant", option.id) : field.removeAttribute("aria-activedescendant");
    if (scroll) option?.scrollIntoView({ block: "nearest" });
  };
  const openCombo = (box, open) => {
    const { field, list } = comboParts(box);
    list.hidden = !open;
    field.setAttribute("aria-expanded", String(open));
  };
  const filterCombo = (box) => {
    const { field, options, empty } = comboParts(box);
    const q = field.value.trim().toLowerCase();
    for (const o of options) o.hidden = !!q && !o.textContent.toLowerCase().includes(q);
    const shown = options.filter((o) => !o.hidden);
    if (empty) empty.hidden = shown.length > 0;
    setActive(box, shown[0]);
  };
  const pickCombo = (box, option) => {
    const { field } = comboParts(box);
    field.value = option.querySelector(".combobox__title")?.textContent || option.textContent.trim();
    openCombo(box, false);
    box.dispatchEvent(new CustomEvent("select", { bubbles: true, detail: { value: option.dataset.value || field.value, option } }));
  };
  const buildCombobox = (box) => {
    const { field, list, options, empty } = comboParts(box);
    if (!field || !list || list.id) return;
    list.id = `combobox-${++comboIds}`;
    list.setAttribute("role", "listbox");
    list.hidden = true;
    Object.assign(field, { autocomplete: "off" });
    field.setAttribute("role", "combobox");
    field.setAttribute("aria-controls", list.id);
    field.setAttribute("aria-autocomplete", "list");
    field.setAttribute("aria-expanded", "false");
    options.forEach((o, i) => { o.id ||= `${list.id}-${i}`; o.setAttribute("role", "option"); o.setAttribute("aria-selected", "false"); });
    if (empty) empty.hidden = true;
  };
  document.addEventListener("input", (e) => {
    const box = e.target.closest?.(".combobox");
    if (!box) return;
    openCombo(box, true);
    filterCombo(box);
  });
  document.addEventListener("focusin", (e) => {
    const box = e.target.matches?.(".combobox input") && e.target.closest(".combobox");
    if (box) { openCombo(box, true); filterCombo(box); }
  });
  document.addEventListener("focusout", (e) => {
    const box = e.target.matches?.(".combobox input") && e.target.closest(".combobox");
    if (box && !box.contains(e.relatedTarget)) openCombo(box, false);
  });
  document.addEventListener("keydown", (e) => {
    const box = e.target.matches?.(".combobox input") && e.target.closest(".combobox");
    if (!box) return;
    const { list, options } = comboParts(box);
    const shown = options.filter((o) => !o.hidden);
    const at = shown.findIndex((o) => o.getAttribute("aria-selected") === "true");
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (list.hidden) { openCombo(box, true); filterCombo(box); return; }
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive(box, shown[(at + step + shown.length) % shown.length], true);
    } else if (e.key === "Enter" && !list.hidden && shown[at]) {
      e.preventDefault();
      pickCombo(box, shown[at]);
    } else if (e.key === "Escape" && !list.hidden) {
      e.preventDefault();
      openCombo(box, false);
    }
  });
  // mousedown, not click: the field keeps the focus, so focusout does not close the list before the pick.
  document.addEventListener("mousedown", (e) => {
    const option = e.target.closest?.(".combobox__option");
    if (!option) return;
    e.preventDefault();
    pickCombo(option.closest(".combobox"), option);
  });
  document.addEventListener("mousemove", (e) => {
    const option = e.target.closest?.(".combobox__option");
    if (option && option.getAttribute("aria-selected") !== "true") setActive(option.closest(".combobox"), option);
  });

  // Banner: [data-dismiss] inside a .banner folds it away, then removes it and fires "dismiss" on the parent.
  document.addEventListener("click", (e) => {
    const banner = e.target.closest?.(".banner [data-dismiss]")?.closest(".banner");
    if (!banner || banner.hasAttribute("data-leaving")) return;
    const parent = banner.parentElement;
    banner.setAttribute("data-leaving", "");
    const done = () => { banner.remove(); parent?.dispatchEvent(new CustomEvent("dismiss", { bubbles: true, detail: banner })); };
    banner.addEventListener("animationend", (a) => a.animationName === "banner-out" && done());
    if (!parseFloat(getComputedStyle(banner).animationDuration)) done();
  });

  // Number stepper: the arrows of .input__stepper step the number field of their .input, within its min, max and step.
  // They stay out of the Tab order: on the field, ↑ and ↓ do the same natively.
  document.addEventListener("click", (e) => {
    const arrow = e.target.closest?.(".input__stepper [data-step]");
    const field = arrow?.closest(".input")?.querySelector('input[type="number"]');
    if (!field || field.disabled) return;
    const before = field.value;
    arrow.dataset.step === "up" ? field.stepUp() : field.stepDown();
    if (field.value === before) return;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  });

  // App shell: [data-shell-toggle] folds the navigation rail to icons and back. Its aria-expanded follows.
  document.addEventListener("click", (e) => {
    const toggle = e.target.closest?.("[data-shell-toggle]");
    const shell = toggle && (toggle.closest(".shell") || document.querySelector(".shell"));
    if (!shell) return;
    const collapsed = shell.toggleAttribute("data-collapsed");
    toggle.setAttribute("aria-expanded", String(!collapsed));
  });

  // Rich editor: a contenteditable area with a toolbar, built from data-placeholder, data-hint and data-max. Formatting
  // goes through document.execCommand: deprecated, but the only dependency-free way to keep the native undo stack.
  // Fires "input" and "change" on the root with detail { html, text }.
  const MOD = /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl+";
  const RICH_TOOLS = [
    ["bold", "text-b", "Bold", "B"], ["italic", "text-italic", "Italic", "I"], ["underline", "text-underline", "Underline", "U"], null,
    ["bullets", "list-bullets", "Bulleted list"], ["numbers", "list-numbers", "Numbered list"], null,
    ["link", "link-simple", "Link", "K"], ["undo", "arrow-counter-clockwise", "Undo", "Z"], ["redo", "arrow-clockwise", "Redo", "⇧Z"],
  ];
  const RICH_COMMANDS = { bold: "bold", italic: "italic", underline: "underline", bullets: "insertUnorderedList", numbers: "insertOrderedList", undo: "undo", redo: "redo" };
  const RICH_KEYS = { b: "bold", i: "italic", u: "underline", k: "link", z: "undo", y: "redo" };
  const richEditors = new WeakMap();
  const buildRichEditor = (root) => {
    const content = root.innerHTML;
    const max = Number(root.dataset.max) || 0;
    const tools = RICH_TOOLS.map((t) => {
      if (!t) return '<span class="rich-editor__separator"></span>';
      const [name, icon, label, key] = t;
      const toggle = name !== "undo" && name !== "redo";
      return `<button type="button" class="btn" data-variant="icon" data-format="${name}" aria-label="${label}" data-tip="${key ? `${label} ${MOD}${key}` : label}"${toggle ? ' aria-pressed="false"' : ""} tabindex="-1"><i class="icon" data-icon="${icon}"></i></button>`;
    }).join("");
    root.innerHTML = `<div class="rich-editor__box"><div class="rich-editor__toolbar" role="toolbar" aria-label="Formatting">${tools}</div>`
      + '<div class="rich-editor__area" contenteditable="true" role="textbox" aria-multiline="true"></div><div class="rich-editor__placeholder" aria-hidden="true"></div>'
      + '<div class="popover rich-editor__link" hidden><label class="input"><i class="icon" data-icon="link-simple"></i><input type="url" placeholder="https://" aria-label="Link address"></label>'
      + '<div class="popover__foot"><button type="button" class="btn" data-variant="ghost" data-link="remove">Remove</button><button type="button" class="btn" data-variant="primary" data-link="apply">Apply</button></div></div></div>'
      + (root.dataset.hint || max ? `<div class="rich-editor__foot"><span>${root.dataset.hint || ""}</span>${max ? '<span class="rich-editor__count" aria-hidden="true"></span>' : ""}</div>` : "");
    const $ = (s) => root.querySelector(s);
    const area = $(".rich-editor__area");
    const pop = $(".rich-editor__link");
    const url = pop.querySelector("input");
    const buttons = [...root.querySelectorAll(".rich-editor__toolbar .btn")];
    const linkBtn = $('[data-format="link"]');
    area.innerHTML = content;
    $(".rich-editor__placeholder").textContent = root.dataset.placeholder || "";
    if (root.dataset.placeholder) area.setAttribute("aria-placeholder", root.dataset.placeholder);
    if (root.hasAttribute("aria-label")) { area.setAttribute("aria-label", root.getAttribute("aria-label")); root.removeAttribute("aria-label"); }
    let current = buttons[0];
    let range = null;
    let link = null;
    let committed = area.innerHTML;
    const value = () => ({ html: area.innerHTML, text: area.innerText });
    const anchor = () => { const n = range?.startContainer; return (n?.nodeType === 1 ? n : n?.parentElement)?.closest(".rich-editor__area a"); };
    // Back to the area with the selection it had, unless the caret is still there (keyboard shortcuts).
    const restore = () => {
      if (document.activeElement === area) return;
      area.focus();
      if (range) { const s = getSelection(); s.removeAllRanges(); s.addRange(range); }
    };
    const measure = () => {
      const length = area.textContent.length;
      root.toggleAttribute("data-empty", !length && !area.querySelector("ul, ol"));
      if (!max) return;
      $(".rich-editor__count").textContent = `${length.toLocaleString("en")} / ${max.toLocaleString("en")}`;
      root.toggleAttribute("data-full", length >= max);
    };
    const save = () => {
      const s = getSelection();
      if (s.rangeCount && area.contains(s.anchorNode)) range = s.getRangeAt(0).cloneRange();
    };
    // Called on selectionchange inside the area: keeps the range for the toolbar and the pressed states in step.
    const sync = () => {
      save();
      for (const b of buttons) {
        if (!b.hasAttribute("aria-pressed")) continue;
        const on = b === linkBtn ? !!anchor() : document.queryCommandState(RICH_COMMANDS[b.dataset.format]);
        b.setAttribute("aria-pressed", String(on));
      }
    };
    const closeLink = (refocus) => {
      if (pop.hidden) return;
      pop.hidden = true;
      if (refocus) restore();
    };
    const openLink = () => {
      save();
      link = anchor();
      url.value = link?.getAttribute("href") || "";
      pop.querySelector('[data-link="remove"]').hidden = !link;
      pop.hidden = false;
      pop.style.left = `${Math.max(0, Math.min(linkBtn.offsetLeft, root.offsetWidth - pop.offsetWidth))}px`;
      url.focus();
      url.select();
    };
    const selectLink = () => {
      if (!link?.isConnected) return;
      const s = getSelection();
      const r = document.createRange();
      r.selectNodeContents(link);
      s.removeAllRanges();
      s.addRange(r);
    };
    const applyLink = () => {
      let href = url.value.trim();
      if (href && !/^(https?:|mailto:|tel:|\/|#)/i.test(href)) href = `https://${href}`;
      closeLink(true);
      if (!href) return;
      selectLink();
      if (!getSelection().isCollapsed) return document.execCommand("createLink", false, href);
      const a = document.createElement("a");
      a.setAttribute("href", href);
      a.textContent = href;
      document.execCommand("insertHTML", false, a.outerHTML);
    };
    const act = (name) => {
      if (name === "link") return openLink();
      restore();
      document.execCommand(RICH_COMMANDS[name]);
    };
    // Markdown at the start of a line: "- " or "* " starts a bulleted list, "1. " a numbered one.
    const markdown = () => {
      const s = getSelection();
      const node = s.anchorNode;
      if (!s.isCollapsed || node.nodeType !== 3 || node.parentElement.closest("li")) return;
      const line = document.createRange();
      const block = node.parentElement.closest("div, p");
      line.setStart(block !== area && area.contains(block) ? block : area, 0);
      line.setEnd(node, s.anchorOffset);
      const text = line.toString();
      const list = /^[-*]\s$/.test(text) ? "insertUnorderedList" : /^1\.\s$/.test(text) ? "insertOrderedList" : "";
      if (!list) return;
      s.removeAllRanges();
      s.addRange(line);
      document.execCommand("delete");
      document.execCommand(list);
    };
    const syncState = () => {
      const disabled = root.getAttribute("aria-disabled") === "true";
      area.contentEditable = String(!disabled);
      if (disabled) area.setAttribute("aria-disabled", "true");
      else area.removeAttribute("aria-disabled");
      for (const b of buttons) b.tabIndex = !disabled && b === current ? 0 : -1;
      const field = root.closest(".field");
      if (field?.hasAttribute("data-invalid")) area.setAttribute("aria-invalid", "true");
      else area.removeAttribute("aria-invalid");
    };

    // Toolbar: mousedown keeps the selection in the area; one tab stop, ← → Home End move along the buttons.
    $(".rich-editor__toolbar").addEventListener("mousedown", (e) => e.preventDefault());
    $(".rich-editor__toolbar").addEventListener("click", (e) => {
      const b = e.target.closest("[data-format]");
      if (b) act(b.dataset.format);
    });
    $(".rich-editor__toolbar").addEventListener("keydown", (e) => {
      const i = buttons.indexOf(document.activeElement);
      const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: buttons.length - 1 }[e.key];
      if (i < 0 || next === undefined) return;
      e.preventDefault();
      current = buttons[(next + buttons.length) % buttons.length];
      syncState();
      current.focus();
    });
    area.addEventListener("keydown", (e) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      const name = key === "z" && e.shiftKey ? "redo" : e.shiftKey ? null : RICH_KEYS[key];
      if (!name) return;
      e.preventDefault();
      act(name);
    });
    // data-max caps typed and pasted text; pasting keeps the words, not the formatting of the source.
    const room = () => max - area.textContent.length + getSelection().toString().length;
    area.addEventListener("beforeinput", (e) => {
      if (max && e.inputType === "insertText" && e.data && e.data.length > room()) e.preventDefault();
    });
    area.addEventListener("paste", (e) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, max ? text.slice(0, Math.max(0, room())) : text);
    });
    area.addEventListener("input", (e) => {
      e.stopPropagation();
      if (e.inputType === "insertText" && e.data === " ") markdown();
      measure();
      root.dispatchEvent(new CustomEvent("input", { bubbles: true, detail: value() }));
    });
    area.addEventListener("focusin", () => closeLink(false));
    root.addEventListener("focusout", (e) => {
      if (root.contains(e.relatedTarget)) return;
      closeLink(false);
      if (area.innerHTML === committed) return;
      committed = area.innerHTML;
      root.dispatchEvent(new CustomEvent("change", { bubbles: true, detail: value() }));
    });
    url.addEventListener("input", (e) => e.stopPropagation());
    pop.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target === url) { e.preventDefault(); applyLink(); }
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeLink(true); }
    });
    pop.addEventListener("click", (e) => {
      const action = e.target.closest("[data-link]")?.dataset.link;
      if (action === "apply") applyLink();
      if (action === "remove") { closeLink(true); selectLink(); document.execCommand("unlink"); }
    });
    const field = root.closest(".field");
    const label = field?.querySelector(":scope > .field__label");
    if (label) {
      area.setAttribute("aria-labelledby", idOf(label));
      label.addEventListener("click", () => area.focus());
    }
    const notes = field ? [...field.querySelectorAll(":scope > :is(.field__hint, .field__error)")].map(idOf) : [];
    if (notes.length) area.setAttribute("aria-describedby", notes.join(" "));
    const watch = new MutationObserver(syncState);
    watch.observe(root, { attributes: true, attributeFilter: ["aria-disabled"] });
    if (field) watch.observe(field, { attributes: true, attributeFilter: ["data-invalid"] });
    richEditors.set(area, sync);
    syncState();
    measure();
    window.renderIcons(root);
  };
  document.addEventListener("selectionchange", () => {
    const n = getSelection().anchorNode;
    const area = (n?.nodeType === 1 ? n : n?.parentElement)?.closest(".rich-editor__area");
    if (area) richEditors.get(area)?.();
  });

  // Date picker: a field that opens a month calendar, built from data-value, data-min, data-max (ISO dates) and
  // data-placeholder. The days are an ARIA grid with one tab stop: ← → move a day, ↑ ↓ a week, PageUp PageDown a month,
  // Home End to the start and end of the week, Enter or Space picks, Escape closes. Picking fires "change" on the root
  // (event.detail.value, the ISO date). Weeks start on Monday; names come from the page language.
  const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const dateOf = (s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
    const d = m && new Date(+m[1], m[2] - 1, +m[3]);
    return d && d.getMonth() === m[2] - 1 ? d : null;
  };
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  // Same day in another month, or its last day when the month is shorter (31 January → 28 February).
  const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, Math.min(d.getDate(), new Date(d.getFullYear(), d.getMonth() + n + 1, 0).getDate()));
  const dayOfWeek = (d) => (d.getDay() + 6) % 7;
  const pickerBounds = (root) => [dateOf(root.dataset.min), dateOf(root.dataset.max)];
  const clampDate = (root, d) => { const [min, max] = pickerBounds(root); return min && d < min ? min : max && d > max ? max : d; };
  let pickerIds = 0;
  let openPicker = null;
  const syncDatePicker = (root) => {
    const { field, format } = root.picker;
    const value = dateOf(root.dataset.value);
    const text = value ? format.short.format(value) : root.dataset.placeholder || "";
    root.querySelector(".date-picker__value").textContent = text;
    root.toggleAttribute("data-empty", !value);
    const label = root.closest(".field")?.querySelector(":scope > .field__label")?.textContent.trim() || root.picker.name;
    field.setAttribute("aria-label", label ? `${label}, ${text}` : text);
    field.disabled = root.getAttribute("aria-disabled") === "true";
    if (root.closest(".field")?.hasAttribute("data-invalid")) field.setAttribute("aria-invalid", "true");
    else field.removeAttribute("aria-invalid");
    if (openPicker === root) renderMonth(root);
  };
  // The 42 day buttons are built once and rewritten in place, so the focused one never leaves the page.
  const renderMonth = (root, swap) => {
    const { focus, format, calendar } = root.picker;
    const [min, max] = pickerBounds(root);
    const first = new Date(focus.getFullYear(), focus.getMonth(), 1);
    const start = addDays(first, -dayOfWeek(first));
    const today = isoOf(new Date());
    calendar.querySelectorAll(".date-picker__day").forEach((b, i) => {
      const d = addDays(start, i);
      const iso = isoOf(d);
      b.dataset.date = iso;
      b.textContent = d.getDate();
      b.setAttribute("aria-label", format.full.format(d));
      b.tabIndex = iso === isoOf(focus) ? 0 : -1;
      b.toggleAttribute("data-outside", d.getMonth() !== first.getMonth());
      iso === today ? b.setAttribute("aria-current", "date") : b.removeAttribute("aria-current");
      (min && d < min) || (max && d > max) ? b.setAttribute("aria-disabled", "true") : b.removeAttribute("aria-disabled");
      iso === root.dataset.value ? b.parentElement.setAttribute("aria-selected", "true") : b.parentElement.removeAttribute("aria-selected");
    });
    calendar.querySelector(".date-picker__title").textContent = format.month.format(first);
    calendar.querySelector('[data-month="-1"]').disabled = !!min && addDays(first, -1) < min;
    calendar.querySelector('[data-month="1"]').disabled = !!max && new Date(first.getFullYear(), first.getMonth() + 1, 1) > max;
    if (swap) {
      calendar.removeAttribute("data-swap");
      void calendar.offsetWidth; // restarts the swap when months change quickly
      calendar.setAttribute("data-swap", "");
    }
  };
  // Moves the grid's tab stop to a day (kept within data-min and data-max); a day of another month shows that month.
  const moveToDay = (root, d, focus = true) => {
    const target = clampDate(root, d);
    const swap = target.getMonth() !== root.picker.focus.getMonth() || target.getFullYear() !== root.picker.focus.getFullYear();
    root.picker.focus = target;
    renderMonth(root, swap);
    if (focus) root.picker.calendar.querySelector(`[data-date="${isoOf(target)}"]`).focus();
  };
  const closeDatePicker = (refocus) => {
    if (!openPicker) return;
    const { field, calendar } = openPicker.picker;
    openPicker = null;
    calendar.hidden = true;
    field.setAttribute("aria-expanded", "false");
    if (refocus) field.focus();
  };
  const openDatePicker = (root) => {
    closeDatePicker();
    const { field, calendar } = root.picker;
    root.picker.focus = clampDate(root, dateOf(root.dataset.value) || new Date());
    calendar.removeAttribute("data-swap");
    openPicker = root;
    renderMonth(root);
    calendar.hidden = false;
    // Below the field, above it when only there is room; aligned on its right edge when the right side is short.
    const r = field.getBoundingClientRect();
    const below = r.bottom + 4 + calendar.offsetHeight <= innerHeight || r.top - 4 - calendar.offsetHeight < 0;
    calendar.dataset.side = below ? "bottom" : "top";
    r.left + calendar.offsetWidth > innerWidth - 8 ? (calendar.dataset.align = "end") : delete calendar.dataset.align;
    field.setAttribute("aria-expanded", "true");
    calendar.querySelector('.date-picker__day[tabindex="0"]').focus();
  };
  const pickDate = (root, iso) => {
    const changed = root.dataset.value !== iso;
    root.dataset.value = iso;
    syncDatePicker(root);
    closeDatePicker(true);
    if (changed) root.dispatchEvent(new CustomEvent("change", { bubbles: true, detail: { value: iso } }));
  };
  const buildDatePicker = (root) => {
    const id = `date-picker-${++pickerIds}`;
    const lang = root.closest("[lang]")?.lang || undefined;
    const fmt = (options) => new Intl.DateTimeFormat(lang, options);
    const week = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i)); // 1 January 2024 is a Monday
    const days = Array.from({ length: 6 }, () => `<tr>${'<td><button type="button" class="date-picker__day" tabindex="-1"></button></td>'.repeat(7)}</tr>`).join("");
    root.innerHTML = `<button type="button" class="input date-picker__field" id="${id}-field" aria-haspopup="dialog" aria-expanded="false" aria-controls="${id}"><i class="icon" data-icon="calendar-blank"></i><span class="date-picker__value"></span></button>`
      + `<div class="popover date-picker__calendar" id="${id}" role="dialog" aria-label="Choose a date" hidden><div class="date-picker__head">`
      + '<button type="button" class="btn" data-variant="icon" data-month="-1" aria-label="Previous month"><i class="icon" data-icon="caret-left"></i></button>'
      + `<span class="date-picker__title" id="${id}-title" aria-live="polite"></span>`
      + '<button type="button" class="btn" data-variant="icon" data-month="1" aria-label="Next month"><i class="icon" data-icon="caret-right"></i></button></div>'
      + `<table class="date-picker__grid" role="grid" aria-labelledby="${id}-title"><thead><tr>${week.map((d) => `<th scope="col" abbr="${fmt({ weekday: "long" }).format(d)}">${fmt({ weekday: "short" }).format(d)}</th>`).join("")}</tr></thead><tbody>${days}</tbody></table></div>`;
    root.picker = {
      field: root.querySelector(".date-picker__field"),
      calendar: root.querySelector(".date-picker__calendar"),
      name: root.getAttribute("aria-label"),
      focus: new Date(),
      format: { short: fmt({ day: "numeric", month: "short", year: "numeric" }), full: fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" }), month: fmt({ month: "long", year: "numeric" }) },
    };
    root.removeAttribute("aria-label");
    const field = root.closest(".field");
    const label = field?.querySelector(":scope > label.field__label");
    if (label) label.htmlFor = root.picker.field.id;
    const notes = field ? [...field.querySelectorAll(":scope > :is(.field__hint, .field__error)")].map(idOf) : [];
    if (notes.length) root.picker.field.setAttribute("aria-describedby", notes.join(" "));
    const watch = new MutationObserver(() => syncDatePicker(root));
    watch.observe(root, { attributes: true, attributeFilter: ["data-value", "data-min", "data-max", "data-placeholder", "aria-disabled"] });
    if (field) watch.observe(field, { attributes: true, attributeFilter: ["data-invalid"] });
    syncDatePicker(root);
    window.renderIcons(root);
  };
  document.addEventListener("click", (e) => {
    const root = e.target.closest?.(".date-picker");
    if (!root?.picker) return;
    if (e.target.closest(".date-picker__field")) openPicker === root ? closeDatePicker(true) : openDatePicker(root);
    const month = e.target.closest("[data-month]");
    if (month) moveToDay(root, addMonths(root.picker.focus, +month.dataset.month), false);
    const day = e.target.closest(".date-picker__day");
    if (day && day.getAttribute("aria-disabled") !== "true") pickDate(root, day.dataset.date);
  });
  document.addEventListener("keydown", (e) => {
    const root = e.target.closest?.(".date-picker");
    if (!root?.picker) return;
    if (e.target === root.picker.field) {
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && openPicker !== root) { e.preventDefault(); openDatePicker(root); }
      return;
    }
    if (e.key === "Escape") {
      // Stopped here, so a dialog around the picker stays open.
      e.preventDefault();
      e.stopPropagation();
      return closeDatePicker(true);
    }
    if (!e.target.matches(".date-picker__day")) return;
    const focus = root.picker.focus;
    const to = {
      ArrowLeft: addDays(focus, -1), ArrowRight: addDays(focus, 1), ArrowUp: addDays(focus, -7), ArrowDown: addDays(focus, 7),
      PageUp: addMonths(focus, -1), PageDown: addMonths(focus, 1), Home: addDays(focus, -dayOfWeek(focus)), End: addDays(focus, 6 - dayOfWeek(focus)),
    }[e.key];
    if (to) { e.preventDefault(); moveToDay(root, to); }
  });
  document.addEventListener("mousedown", (e) => { if (openPicker && !openPicker.contains(e.target)) closeDatePicker(); });
  document.addEventListener("focusout", (e) => { if (openPicker && e.target.closest?.(".date-picker") === openPicker && e.relatedTarget && !openPicker.contains(e.relatedTarget)) closeDatePicker(); });

  // Markup present at load and markup rendered later get the same behaviours.
  const each = (node, selector, fn) => {
    if (node.nodeType !== 1) return;
    if (node.matches(selector)) fn(node);
    node.querySelectorAll(selector).forEach(fn);
  };
  const enhance = (node) => {
    each(node, ".btn:is([data-busy], [data-done], [data-error], [data-copy]):not([data-state])", buildButton);
    each(node, ".segmented", placeIndicator);
    each(node, ".value", (el) => values.has(el) || values.set(el, el.textContent));
    each(node, ".tabs", initTabs);
    each(node, "[data-menu], [data-context-menu]", initMenuTrigger);
    each(node, ".pagination[data-pages]", renderPagination);
    each(node, ".table[data-sortable]", initTable);
    each(node, ".toc[data-spy]", (nav) => { spies.add(nav); spy(nav); });
    each(node, ".sticky-header", (header) => { stickies.add(header); stick(header); });
    each(node, ".btn[data-hold]:not([data-state])", buildHold);
    each(node, ".checkbox__box", buildCheckbox);
    each(node, ".field", buildField);
    each(node, ".textarea[data-max]:not(:has(.textarea__count))", buildTextarea);
    each(node, ".typing__dots", startDance);
    each(node, ".composer", syncComposer);
    each(node, ".tool-call", buildToolCall);
    each(node, ".stepper", buildStepper);
    each(node, ".combobox", buildCombobox);
    each(node, ".steps", buildSteps);
    each(node, ".divider", buildDivider);
    each(node, ".rich-editor:not(:has(.rich-editor__box))", buildRichEditor);
    each(node, ".date-picker:not(:has(.date-picker__field))", buildDatePicker);
  };
  enhance(document.body);
  new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === "attributes") {
        if (r.target.parentElement?.matches(".segmented, .tabs")) placeIndicator(r.target.parentElement);
        if (r.target.matches(".pagination")) renderPagination(r.target);
        if (r.target.matches(".field")) syncField(r.target);
        if (r.target.matches(".tool-call")) syncToolCall(r.target);
        continue;
      }
      const value = (r.target.nodeType === 1 ? r.target : r.target.parentElement)?.closest(".value");
      if (value) watchValue(value);
      if (r.type === "childList") r.addedNodes.forEach(enhance);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["aria-pressed", "aria-selected", "data-page", "data-invalid", "data-state"] });
})();
