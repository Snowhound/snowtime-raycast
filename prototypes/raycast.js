// Renders a prototype page: a picker for its fixture states, a theme switch, and one Raycast
// view per state. A view is plain data shaped like the Raycast components the command will
// use (List, Form, ActionPanel, MenuBarExtra, Toast, HUD), so porting it is a rename.
//
//   Raycast.prototype({ title, notes: ['…'], states: { 'Name': () => view }, initial: 'Name' })
//
// Views:
//   { type: 'list', searchPlaceholder, searchText, accessory, navigationTitle, isLoading,
//     sections: [{ title, subtitle, items: [{ icon, title, subtitle, accessories, actions }] }],
//     emptyView: { icon, title, description, actions }, toast }
//   { type: 'form', navigationTitle, isLoading, fields: [...], actions, toast }
//     A field is { type: 'textfield' | 'textarea' | 'dropdown' | 'separator' | 'description',
//     title, value, placeholder, info, infoOpen, error, icon, focused }; an open dropdown adds
//     open: true and options: [{ title, icon, iconColor, section }].
//   A toast is { style: 'success' | 'failure' | 'animated', title, message, primaryAction }.
//   { type: 'hud', title, icon }
//   { type: 'menubar', icon, title, tooltip, open, sections: [{ title, items: [...] }] }
//     A menu item is { icon, iconColor, title, subtitle, shortcut, tooltip, goto }, or
//     { info: true, ... } for a greyed-out line without an action.
//
// An action is { title, icon, shortcut: 'cmd+shift+c', style: 'destructive', goto: 'State' }.
// The first is the primary action (↵, or ⌘↵ in a form); in a list the second runs with ⌘↵.
// `goto` switches to another state, so a page can walk through a flow.
(function () {
  // Raycast `Icon` names, drawn with Lucide paths. Unknown names fall back to a circle.
  const paths = {
    Play: '<polygon points="6 3 20 12 6 21 6 3"/>',
    Forward: '<polygon points="13 19 22 12 13 5 13 19"/><polygon points="2 19 11 12 2 5 2 19"/>',
    Stop: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
    Clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    List: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    Folder:
      '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    Tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5"/>',
    Building:
      '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
    Warning:
      '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
    Checkmark: '<path d="M20 6 9 17l-5-5"/>',
    Gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    CopyClipboard:
      '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    Globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/>',
    ArrowClockwise: '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>',
    Key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
    Plus: '<path d="M5 12h14M12 5v14"/>',
    Pencil:
      '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
    Calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    Person: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
    WifiDisabled:
      '<path d="M12 20h.01M8.5 16.43a5 5 0 0 1 7 0M2 8.82a15 15 0 0 1 4.17-2.65M10.66 5c4.01-.36 8.14.9 11.34 3.76M16.85 11.25a10 10 0 0 1 2.22 1.68M5 13a10 10 0 0 1 5.24-2.76M2 2l20 20"/>',
    Circle: '<circle cx="12" cy="12" r="10"/>',
    CircleFilled: '<circle cx="12" cy="12" r="7" fill="currentColor"/>',
  };

  const colors = {
    red: "var(--red)",
    green: "var(--green)",
    orange: "var(--orange)",
    blue: "var(--accent)",
    accent: "var(--accent)",
  };

  const keys = {
    cmd: "⌘",
    shift: "⇧",
    opt: "⌥",
    ctrl: "⌃",
    enter: "↵",
    backspace: "⌫",
    delete: "⌫",
    escape: "esc",
  };

  function esc(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );
  }

  function icon(name, color) {
    if (!name) return "";
    if (name === "Snowtime") return '<img src="../extension/assets/extension-icon.png" alt="" width="16" height="16">';
    // The menu bar's template image, in the bar's own text color (menu-bar-mark.js).
    if (name === "SnowtimeTemplate" && window.MENU_BAR_MARK) {
      return `<span class="mark" title="Template image">${window.MENU_BAR_MARK}</span>`;
    }
    // The same mark with an error badge, from the extension's PNG, tinted like the mark:
    // inverted in dark mode as the tint does.
    if (name === "SnowtimeTemplateError") {
      return '<span class="mark" title="Template image: menu-bar-icon-error.png"><img src="../extension/assets/menu-bar-icon-error.png" alt=""></span>';
    }
    const style = color ? ` style="color:${colors[color] ?? color}"` : "";
    return `<svg class="icon" viewBox="0 0 24 24"${style} aria-hidden="true"><title>Icon.${esc(name)}</title>${paths[name] ?? paths.Circle}</svg>`;
  }

  function shortcut(value) {
    if (!value) return "";
    return value
      .split("+")
      .map((k) => `<kbd>${esc(keys[k] ?? k.toUpperCase())}</kbd>`)
      .join("");
  }

  function accessory(a) {
    if (a.tag) {
      const value = typeof a.tag === "string" ? a.tag : a.tag.value;
      const color = typeof a.tag === "string" ? undefined : colors[a.tag.color];
      return `<span class="accessory tag"${color ? ` style="--tag:${color}"` : ""} title="${esc(a.tooltip)}">${esc(value)}</span>`;
    }
    return `<span class="accessory" title="${esc(a.tooltip)}">${icon(a.icon, a.iconColor)}${esc(a.text)}</span>`;
  }

  function toastHtml(toast) {
    if (!toast) return "";
    return `<div class="toast ${esc(toast.style ?? "success")}"><span class="dot"></span><strong>${esc(toast.title)}</strong>${
      toast.message ? `<span class="message">${esc(toast.message)}</span>` : ""
    }${toast.primaryAction ? `<span class="toast-action" title="Toast.primaryAction">${esc(toast.primaryAction.title)}</span>` : ""}</div>`;
  }

  function actionBar(view, actions) {
    const left = view.toast
      ? toastHtml(view.toast)
      : `<img src="../extension/assets/extension-icon.png" alt=""><span>${esc(view.navigationTitle ?? "Snowtime")}</span>`;
    const primary = actions[0];
    return `<div class="actionbar"><div class="left">${left}</div>${
      primary
        ? `<span class="primary">${esc(primary.title)} ${shortcut(view.type === "form" ? "cmd+enter" : "enter")}</span><span class="divider"></span>
           <span class="more">Actions ${shortcut("cmd+k")}</span>`
        : ""
    }</div>`;
  }

  // A form submits with ⌘↵, so its first action takes ⌘↵ and its second has none by default.
  function panelHtml(actions, isForm) {
    let html = "";
    let section;
    actions.forEach((a, i) => {
      if (a.section !== section) {
        section = a.section;
        if (section) html += `<div class="section-title">${esc(section)}</div>`;
      }
      const keysHtml =
        i === 0
          ? shortcut(isForm ? "cmd+enter" : "enter")
          : i === 1 && !a.shortcut && !isForm
            ? shortcut("cmd+enter")
            : shortcut(a.shortcut);
      html += `<div class="row${a.style === "destructive" ? " destructive" : ""}" data-action="${i}" aria-selected="${i === 0}">${icon(a.icon)}<span class="title">${esc(a.title)}</span><span class="shortcut">${keysHtml}</span></div>`;
    });
    return html;
  }

  function listHtml(view) {
    const items = [];
    let body = "";
    for (const section of view.sections ?? []) {
      if (section.items.length === 0) continue;
      if (section.title) {
        body += `<div class="section-title">${esc(section.title)}${section.subtitle ? `<span>${esc(section.subtitle)}</span>` : ""}</div>`;
      }
      for (const item of section.items) {
        body += `<div class="row" data-item="${items.length}" aria-selected="${items.length === 0}">${icon(item.icon, item.iconColor)}<span class="title">${esc(item.title)}</span><span class="subtitle">${esc(item.subtitle)}</span><span class="accessories">${(item.accessories ?? []).map(accessory).join("")}</span></div>`;
        items.push(item);
      }
    }
    if (items.length === 0 && view.emptyView && !view.isLoading) {
      const e = view.emptyView;
      body = `<div class="empty">${icon(e.icon ?? "Circle")}<div class="title">${esc(e.title)}</div><div class="description">${esc(e.description)}</div></div>`;
    }
    const search = `<div class="searchbar">${view.back ? '<span class="back">←</span>' : ""}<input placeholder="${esc(view.searchPlaceholder)}" value="${esc(view.searchText)}" aria-label="Search">${
      view.accessory ? `<span class="dropdown" title="List.Dropdown">${esc(view.accessory)}</span>` : ""
    }</div>`;
    return {
      html: `${search}${view.isLoading ? '<div class="loading-bar"></div>' : ""}<div class="content">${body}</div>`,
      actionsFor: (i) => (items.length ? (items[i]?.actions ?? []) : (view.emptyView?.actions ?? [])),
      count: items.length,
    };
  }

  function fieldHtml(f) {
    if (f.type === "separator") return '<div class="separator"></div>';
    if (f.type === "description") return `<div class="description-text">${esc(f.text)}</div>`;
    const value = f.value || f.placeholder || "";
    const classes = [
      "control",
      f.value ? "" : "placeholder",
      f.type === "dropdown" ? "dropdown-control" : "",
      f.type === "textarea" ? "textarea" : "",
      f.focused ? "focused" : "",
      f.error ? "invalid" : "",
    ];
    return `<label>${esc(f.title)}</label><div class="field"><div class="${classes.join(" ")}" title="Form.${esc(
      { textfield: "TextField", dropdown: "Dropdown", textarea: "TextArea" }[f.type] ?? f.type,
    )}">${f.icon ? icon(f.icon, f.iconColor) + "&nbsp;" : ""}${esc(value)}</div>${f.error ? `<div class="error">${esc(f.error)}</div>` : ""}${
      f.info ? infoHtml(f) : ""
    }${f.open ? optionsHtml(f) : ""}</div>`;
  }

  // A field's `info`: Raycast shows an ⓘ beside the field, with the text as its tooltip.
  // `infoOpen` shows the tooltip, so a state can put the text in a screenshot.
  function infoHtml(f) {
    return `<span class="info-icon" tabindex="0" aria-label="${esc(f.info)}">ⓘ<span class="tooltip"${
      f.infoOpen ? ' data-open="true"' : ""
    }>${esc(f.info)}</span></span>`;
  }

  // An open Form.Dropdown: its options, in sections when they have one, the value checked.
  function optionsHtml(f) {
    let html = "";
    let section;
    for (const o of f.options ?? []) {
      if (o.section !== section) {
        section = o.section;
        if (section) html += `<div class="section-title">${esc(section)}</div>`;
      }
      const selected = o.title === f.value;
      html += `<div class="row" aria-selected="${selected}">${icon(o.icon, o.iconColor)}<span class="title">${esc(o.title)}</span>${
        selected ? `<span class="accessories">${icon("Checkmark")}</span>` : ""
      }</div>`;
    }
    return `<div class="options" title="Form.Dropdown.Item">${html}</div>`;
  }

  function formHtml(view) {
    const search = `<div class="searchbar">${view.back ? '<span class="back">←</span>' : ""}<span class="title">${esc(view.navigationTitle ?? "")}</span></div>`;
    return {
      html: `${search}${view.isLoading ? '<div class="loading-bar"></div>' : ""}<div class="content"><div class="form">${(view.fields ?? []).map(fieldHtml).join("")}</div></div>`,
      actionsFor: () => view.actions ?? [],
      count: 0,
    };
  }

  function menuHtml(view) {
    const items = [];
    let menu = "";
    (view.sections ?? []).forEach((section, s) => {
      if (s > 0) menu += '<div class="separator"></div>';
      if (section.title) menu += `<div class="section-title">${esc(section.title)}</div>`;
      for (const item of section.items) {
        // An item without an action is information: Raycast greys it out.
        menu += `<div class="row${item.info ? " info" : ""}" data-menu="${items.length}" title="${esc(item.tooltip)}">${icon(item.icon, item.iconColor)}<span class="title">${esc(item.title)}</span>${
          item.subtitle ? `<span class="subtitle">${esc(item.subtitle)}</span>` : ""
        }${item.shortcut ? `<span class="shortcut">${shortcut(item.shortcut)}</span>` : ""}</div>`;
        items.push(item);
      }
    });
    const extra = `<span class="extra${view.open ? " open" : ""}" title="${esc(view.tooltip ?? "MenuBarExtra")}">${icon(view.icon ?? "Snowtime")}${
      view.title ? `<span>${esc(view.title)}</span>` : ""
    }</span>`;
    return {
      html: `<div class="menubar"><span class="clock">Wi-Fi</span>${extra}<span class="clock">Mon Oct 5 10:42 AM</span></div>${
        view.open ? `<div class="menu-anchor"><div class="menu">${menu}</div></div>` : ""
      }`,
      items,
    };
  }

  function render(stage, view, goto) {
    if (view.type === "hud") {
      stage.innerHTML = `<div class="hud" title="showHUD">${icon(view.icon ?? "Checkmark")}<span>${esc(view.title)}</span></div>`;
      return;
    }
    if (view.type === "menubar") {
      const menu = menuHtml(view);
      stage.innerHTML = menu.html;
      stage.querySelectorAll("[data-menu]").forEach((row) => {
        const item = menu.items[Number(row.dataset.menu)];
        if (item.goto) row.addEventListener("click", () => goto(item.goto));
      });
      return;
    }
    const built = view.type === "form" ? formHtml(view) : listHtml(view);
    stage.innerHTML = `<div class="window" tabindex="0">${built.html}${actionBar(view, built.actionsFor(0))}<div class="panel" hidden></div></div>`;
    const win = stage.querySelector(".window");
    const panel = win.querySelector(".panel");
    let selected = 0;

    function actions() {
      return built.actionsFor(selected);
    }

    function select(i) {
      if (built.count === 0) return;
      selected = Math.max(0, Math.min(built.count - 1, i));
      win.querySelectorAll("[data-item]").forEach((row) => {
        row.setAttribute("aria-selected", String(Number(row.dataset.item) === selected));
      });
      win.querySelector(`[data-item="${selected}"]`)?.scrollIntoView({ block: "nearest" });
      win.querySelector(".actionbar").outerHTML = actionBar(view, actions());
    }

    function run(action) {
      if (action?.goto) goto(action.goto);
    }

    function togglePanel(open = panel.hidden) {
      panel.hidden = !open;
      if (open) {
        panel.innerHTML = panelHtml(actions(), view.type === "form");
        panel
          .querySelectorAll("[data-action]")
          .forEach((row) => row.addEventListener("click", () => run(actions()[Number(row.dataset.action)])));
      }
    }

    win.addEventListener("click", (event) => {
      const row = event.target.closest("[data-item]");
      if (row) select(Number(row.dataset.item));
      if (event.target.closest(".more")) togglePanel();
      if (event.target.closest(".primary")) run(actions()[0]);
    });
    win.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") select(selected + 1);
      else if (event.key === "ArrowUp") select(selected - 1);
      else if (event.key === "k" && event.metaKey) togglePanel();
      else if (event.key === "Escape") togglePanel(false);
      else if (event.key === "Enter" && view.type === "form") {
        if (event.metaKey) run(actions()[0]);
      } else if (event.key === "Enter") run(actions()[event.metaKey ? 1 : 0]);
      else return;
      event.preventDefault();
    });
    win.focus();
  }

  function themeFromUrl() {
    const theme = new URLSearchParams(location.search).get("theme");
    if (theme) return theme === "dark";
    return matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function setParam(key, value) {
    const params = new URLSearchParams(location.search);
    params.set(key, value);
    history.replaceState(null, "", `?${params}`);
  }

  window.Raycast = {
    prototype({ title, notes = [], states, initial }) {
      document.title = `${title} · Snowtime for Raycast`;
      document.documentElement.classList.toggle("dark", themeFromUrl());
      const names = Object.keys(states);
      const fromUrl = new URLSearchParams(location.search).get("state");
      let current = names.includes(fromUrl) ? fromUrl : (initial ?? names[0]);

      document.body.innerHTML = `<div class="stage">
        <div class="toolbar"><h1>${esc(title)}</h1>
          <select id="fixture" aria-label="Fixture state">${names.map((n) => `<option>${esc(n)}</option>`).join("")}</select>
          <button id="theme" type="button">Toggle theme</button></div>
        <div id="view"></div>
        <div class="notes">${notes.map((n) => `<p>${esc(n)}</p>`).join("")}</div></div>`;

      const picker = document.getElementById("fixture");
      const view = document.getElementById("view");

      function goto(name) {
        current = name;
        picker.value = name;
        setParam("state", name);
        render(view, states[name](), goto);
      }

      picker.addEventListener("change", () => goto(picker.value));
      document.getElementById("theme").addEventListener("click", () => {
        const dark = document.documentElement.classList.toggle("dark");
        setParam("theme", dark ? "dark" : "light");
      });
      goto(current);
    },
  };
})();
