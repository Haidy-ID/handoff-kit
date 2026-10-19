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
    el.remove();
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
  };
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
  // hold fires "confirm" on the button, then data-confirmed ("Confirmed") shows for 1.6 s. A click alone does nothing.
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
    btn.dataset.state = "done";
    btn.dispatchEvent(new Event("confirm", { bubbles: true }));
    announce(btn.querySelector('[data-for="done"]').textContent);
    setTimeout(() => {
      Object.assign(h, { dir: 0, from: 0 });
      h.anim.pause();
      h.anim.currentTime = 0;
      btn.dataset.state = "idle";
    }, HOLD_SHOWN);
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
  };
  enhance(document.body);
  new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === "attributes") {
        if (r.target.parentElement?.matches(".segmented, .tabs")) placeIndicator(r.target.parentElement);
        if (r.target.matches(".pagination")) renderPagination(r.target);
        continue;
      }
      const value = (r.target.nodeType === 1 ? r.target : r.target.parentElement)?.closest(".value");
      if (value) watchValue(value);
      if (r.type === "childList") r.addedNodes.forEach(enhance);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["aria-pressed", "aria-selected", "data-page"] });
})();
