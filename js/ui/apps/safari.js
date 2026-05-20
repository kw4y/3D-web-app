// "Safari app 

import { createWindow } from "../window.js";

let openInstance = null;

const PAGES = [
  { id: "submission", label: "Submission", url: "submission.html", title: "Submission" },
  { id: "sitemap",    label: "Site Map",   url: "sitemap.html",    title: "Site Map"   },
  { id: "references", label: "References", url: "references.html", title: "References" },
];

const HTML = `
<div class="sf-app">

  <!-- 
       Tab bar -->
  <div class="sf-tabs" data-bind="tabs" role="tablist">
    ${PAGES.map((p, i) => `
      <button class="sf-tab${i === 0 ? " is-active" : ""}"
              type="button"
              role="tab"
              data-page="${p.id}"
              data-url="${p.url}"
              data-title="${p.title}"
              aria-selected="${i === 0}">
        <span class="sf-tab__favicon sf-tab__favicon--${p.id}"></span>
        <span class="sf-tab__label">${p.label}</span>
      </button>
    `).join("")}
  </div>

  <!-- Toolbar -->
  <div class="sf-toolbar">
    <div class="sf-nav">
      <button class="sf-nav__btn" type="button" aria-label="Back" data-bind="back" disabled>
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M7.5 2L4 6l3.5 4"/>
        </svg>
      </button>
      <button class="sf-nav__btn" type="button" aria-label="Forward" data-bind="fwd" disabled>
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4.5 2L8 6l-3.5 4"/>
        </svg>
      </button>
    </div>

    <div class="sf-url-bar">
      <span class="sf-url-bar__lock" aria-hidden="true">
        <svg viewBox="0 0 12 14" fill="currentColor">
          <path d="M9 5H8V3.5C8 1.6 6.4 0 4.5 0 2.6 0 1 1.6 1 3.5V5H0v9h9V5zM2.4 3.5C2.4 2.3 3.3 1.4 4.5 1.4s2.1.9 2.1 2.1V5H2.4V3.5z"/>
        </svg>
      </span>
      <span class="sf-url-bar__url" data-bind="url">submission.html</span>
      <span class="sf-url-bar__refresh" aria-hidden="true">
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 6a4 4 0 1 1-1.2-2.8M10 2v2H8"/>
        </svg>
      </span>
    </div>

    <div class="sf-actions">
      <button class="sf-nav__btn" type="button" aria-label="Share" tabindex="-1">
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M7 1v8M3.5 4.5L7 1l3.5 3.5M2.5 8v4h9V8"/>
        </svg>
      </button>
      <button class="sf-nav__btn" type="button" aria-label="Show tabs" tabindex="-1">
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4">
          <rect x="1.5" y="3.5" width="11" height="7" rx="1"/>
          <path d="M1.5 6h11" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  </div>

  <!--  Iframe — -->
  <iframe class="sf-frame"
          data-bind="frame"
          src="submission.html"
          title="Submission Evidence"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms">
  </iframe>

</div>
`;

function wireShell(rootEl, win) {
  const frame    = rootEl.querySelector('[data-bind="frame"]');
  const urlEl    = rootEl.querySelector('[data-bind="url"]');
  const tabs     = rootEl.querySelector('[data-bind="tabs"]');
  const titleEl  = win.el.querySelector(".win__tb-title");

  tabs.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".sf-tab");
    if (!btn) return;

    // Swap iframe source + URL bar + window title
    frame.src = btn.dataset.url;
    urlEl.textContent = btn.dataset.url;
    if (titleEl) titleEl.textContent = btn.dataset.title;

    // Active-tab state
    tabs.querySelectorAll(".sf-tab").forEach((b) => {
      const active = b === btn;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-selected", String(active));
    });
  });
}

export function open(buttonEl) {
  if (openInstance && document.body.contains(openInstance.el)) {
    openInstance.close();
    openInstance = null;
    return;
  }

  const win = createWindow({
    title: "Submission",
    content: HTML,
    app: "Safari",
    width: "min(1040px, 92vw)",
    height: "min(720px, 88vh)",
  });
  win.el.classList.add("win--safari");
  wireShell(win.el, win);

  const r = buttonEl.getBoundingClientRect();
  win.openFrom(r.left + r.width / 2, r.top + r.height / 2);

  win.el.querySelector(".win__light--close").addEventListener("click", () => {
    openInstance = null;
  });

  openInstance = win;
}