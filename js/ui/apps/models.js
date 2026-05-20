// Models app.


import { createWindow }      from "../window.js";
import { createModelViewer } from "../../three/modelviewer.js";

let openInstance = null;

// ============================================================
// Model data
// ============================================================
const MODELS = [
  {
    title: "Character",
    desc: [
      "Shoes badly textured by design.",
    ],

    stats: { Vertices: "7,945", Faces: "7,462", Materials: "2" },
    skipLiveStats: true,

    glb: "assets/Models/character_tpose.glb",
  },
  {
    title: "Green Apple",
    desc: [
      "Hand-painted text on PBR skin",
      "Cycles graph baked for glTF",
    ],

    stats: { Vertices: "4,776", Faces: "4,756", Materials: "3" },
    skipLiveStats: true,
    glb: "assets/Models/apple.glb",
  },
  {
    title: "Headphones",
    desc: [
      "Inspired by the Sony MDR-G72",
      "Matte black headband and cable, chrome jack",
    ],

    stats: { Vertices: "17,362", Faces: "17,220", Materials: "4" },
    skipLiveStats: true,
    glb: "assets/Models/headphones.glb",
  },
  {
    title: "Lily Chou-Chou CD",
    desc: [
      "Disc label with circular UV projection",
      "Bevel + subsurf decimated for glTF",
    ],

    stats: { Vertices: "4,120", Faces: "4,122", Materials: "4" },
    skipLiveStats: true,
    glb: "assets/Models/cd.glb",
  },
];


// Icon paths 
const ICONS_PATH = "assets/icons";

const img = (name, alt = "") =>
  `<img src="${ICONS_PATH}/${name}" alt="${alt}" class="bl-svg-icon">`;

const BLENDER_LOGO    = img("blender.svg", "Blender");
const ICON_ARROW      = img("arrow.svg");

const ICON_COLLECTION = img("collection.svg");
const ICON_MESH       = img("cube.svg");
const ICON_LIGHTSUB   = img("lightbulb.svg");
const ICON_BULLET     = img("bullet.svg");
const ICON_LIGHT      = img("light.svg");

// Viewport toolbar icons
const ICON_OBJECTMODE = img("objectmode.svg");
const ICON_VIEWER     = img("viewer.svg");
const ICON_GIZMO      = img("gizmo.svg");
const ICON_OVERLAY    = img("overlay.svg");
const ICON_SOLID      = img("solid.svg");
const ICON_MATERIAL   = img("material.svg");
const ICON_RENDERED   = img("rendered.svg");
const ICON_WIREFRAME  = img("wireframe.svg");
const ICON_ROTATE     = img("rotate.svg");
const ICON_ZOOM       = img("zoom.svg");   

const ICONS = {
  collection: ICON_COLLECTION,
  mesh:       ICON_MESH,
  lightsub:   ICON_LIGHTSUB,
  bullet:     ICON_BULLET,
  light:      ICON_LIGHT,
};

// HTML template

const HTML = `
<div class="bl-app">
  <!-- Top row: logo + app menus + workspace tabs, all on one line.
       Blender 5.x merges these onto a single row; pixel-sampled values
       used in CSS. -->
  <div class="bl-top">
    <div class="bl-top__logo">${BLENDER_LOGO}</div>
    <div class="bl-top__menus">
      <span class="bl-top__menu">File</span>
      <span class="bl-top__menu">Edit</span>
      <span class="bl-top__menu">Render</span>
      <span class="bl-top__menu">Window</span>
      <span class="bl-top__menu">Help</span>
    </div>
    <div class="bl-tabs">
      <span class="bl-tab is-active">Layout</span>
      <span class="bl-tab">Modeling</span>
      <span class="bl-tab">Sculpting</span>
      <span class="bl-tab">UV Editing</span>
      <span class="bl-tab">Texture Paint</span>
      <span class="bl-tab">Shading</span>
      <span class="bl-tab">Animation</span>
    </div>
  </div>

  <div class="bl-body">

    <div class="bl-viewport">
      <!-- Viewport toolbar - mode buttons left, view/shading cluster right -->
      <div class="bl-vptoolbar">
        <div class="bl-vptoolbar__left">
          <!-- Two-button mode group: Object Mode (Blender) | Showcase Mode -->
          <div class="bl-vptb-group" data-bind="modeGroup">
            <button class="bl-vptb-btn bl-vptb-btn--seg bl-vptb-btn--mode is-active"
                    type="button" data-mode="blender" title="Object Mode (grid + axes)">
              <span class="bl-vptb-icon">${ICON_OBJECTMODE}</span>
              <span class="bl-vptb-label">Object Mode</span>
            </button>
            <button class="bl-vptb-btn bl-vptb-btn--seg bl-vptb-btn--mode"
                    type="button" data-mode="showcase" title="Showcase Mode (turntable)">
              <span class="bl-vptb-icon">${ICON_OBJECTMODE}</span>
              <span class="bl-vptb-label">Showcase Mode</span>
            </button>
          </div>
        </div>

        <div class="bl-vptoolbar__right">
          <button class="bl-vptb-btn" type="button" title="Viewport">${ICON_VIEWER}</button>
          <button class="bl-vptb-btn" type="button" title="Gizmos">${ICON_GIZMO}</button>
          <button class="bl-vptb-btn" type="button" title="Overlays">${ICON_OVERLAY}</button>

          <!-- Shading mode group: 4 buttons fused into a pill -->
          <div class="bl-vptb-group" data-bind="shadingGroup">
            <button class="bl-vptb-btn bl-vptb-btn--seg" type="button" data-shade="wireframe" title="Wireframe">${ICON_WIREFRAME}</button>
            <button class="bl-vptb-btn bl-vptb-btn--seg is-active" type="button" data-shade="solid" title="Solid">${ICON_SOLID}</button>
            <button class="bl-vptb-btn bl-vptb-btn--seg" type="button" data-shade="material" title="Material Preview">${ICON_MATERIAL}</button>
            <button class="bl-vptb-btn bl-vptb-btn--seg" type="button" data-shade="rendered" title="Rendered">${ICON_RENDERED}</button>
          </div>
        </div>
      </div>

      <canvas class="bl-viewport__canvas"></canvas>
      <!-- Navigation gizmo overlay - capture pointer events; ViewHelper draws into the canvas underneath -->
      <div class="bl-gizmo" data-bind="gizmo" aria-hidden="true"></div>
      <div class="bl-viewport__placeholder" data-bind="placeholder">Model</div>
    </div>

    <aside class="bl-side">
      <div class="bl-side__top" data-bind="tree"></div>

      <div class="bl-side__bot">
        <button class="bl-nav__chev" data-dir="-1" aria-label="Previous model">
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 2L4 6l3.5 4"/></svg>
        </button>
        <div class="bl-nav__center">
          <div class="bl-nav__name"  data-bind="navName">-</div>
          <div class="bl-nav__count" data-bind="navCount">- / -</div>
        </div>
        <button class="bl-nav__chev" data-dir="+1" aria-label="Next model">
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 2L8 6l-3.5 4"/></svg>
        </button>
      </div>

      <!-- Object Properties - stub panel showing Blender's transform fields -->
      <div class="bl-side__props">
        <div class="bl-props__header">Object Properties</div>

        <div class="bl-props__group">
          <div class="bl-props__group-title">Transform</div>

          <div class="bl-props__row">
            <span class="bl-props__row-label">Location</span>
            <div class="bl-props__fields">
              <div class="bl-props__field"><span class="bl-props__axis bl-props__axis--x">X</span><span class="bl-props__val">0.000</span></div>
              <div class="bl-props__field"><span class="bl-props__axis bl-props__axis--y">Y</span><span class="bl-props__val">0.000</span></div>
              <div class="bl-props__field"><span class="bl-props__axis bl-props__axis--z">Z</span><span class="bl-props__val">0.000</span></div>
            </div>
          </div>

          <div class="bl-props__row">
            <span class="bl-props__row-label">Rotation</span>
            <div class="bl-props__fields">
              <div class="bl-props__field"><span class="bl-props__axis bl-props__axis--x">X</span><span class="bl-props__val">0&deg;</span></div>
              <div class="bl-props__field"><span class="bl-props__axis bl-props__axis--y">Y</span><span class="bl-props__val">0&deg;</span></div>
              <div class="bl-props__field"><span class="bl-props__axis bl-props__axis--z">Z</span><span class="bl-props__val">0&deg;</span></div>
            </div>
          </div>

          <div class="bl-props__row">
            <span class="bl-props__row-label">Scale</span>
            <div class="bl-props__fields">
              <div class="bl-props__field"><span class="bl-props__axis bl-props__axis--x">X</span><span class="bl-props__val">1.000</span></div>
              <div class="bl-props__field"><span class="bl-props__axis bl-props__axis--y">Y</span><span class="bl-props__val">1.000</span></div>
              <div class="bl-props__field"><span class="bl-props__axis bl-props__axis--z">Z</span><span class="bl-props__val">1.000</span></div>
            </div>
          </div>
        </div>
      </div>
    </aside>

  </div>

  <!-- Status bar - Blender's bottom strip showing current mouse controls
       and version. Our viewer only has one mouse control (left-click drag
       to rotate), plus scroll-zoom; status bar reflects that honestly. -->
  <div class="bl-bottom">
    <div class="bl-bottom__hints">
      <span class="bl-bottom__hint">
        <span class="bl-bottom__icon">${ICON_ROTATE}</span>
        <span class="bl-bottom__label">Rotate View</span>
      </span>
      <span class="bl-bottom__hint">
        <span class="bl-bottom__icon">${ICON_ZOOM}</span>
        <span class="bl-bottom__label">Zoom</span>
      </span>
    </div>
    <div class="bl-bottom__version">5.1.1</div>
  </div>
</div>
`;

// Tree builder
function buildTree(model) {
  const rows = [];
  rows.push({ blank: true });
  rows.push({ depth: 0, expandable: true, expanded: true, icon: "collection", label: "Scene Collection" });
  rows.push({ depth: 1, expandable: true, expanded: true, icon: "collection", label: "Collection" });
  rows.push({ depth: 2, expandable: true, expanded: true, icon: "mesh", label: model.title, selected: true, connectorAt: 2 });

  model.desc.forEach((line) => {
    rows.push({ depth: 3, expandable: false, icon: "bullet", label: line, connectorAt: 2 });
  });

  rows.push({ depth: 2, expandable: true, expanded: true, icon: "light", label: "Statistics", connectorAt: 2 });

  Object.entries(model.stats).forEach(([k, v]) => {
    rows.push({ depth: 3, expandable: false, icon: "lightsub", label: `${k}: ${v}`, connectorAt: 2 });
  });

  return rows;
}

function renderTree(rows, paddedTo) {
  const renderedRows = rows.map((r) => {
    if (r.blank) return `<div class="bl-tree__row bl-tree__row--blank"></div>`;
    const caret = r.expandable
      ? `<span class="bl-tree__caret ${r.expanded ? "is-down" : ""}">${ICON_ARROW}</span>`
      : `<span class="bl-tree__caret bl-tree__caret--empty"></span>`;
    const icon  = `<span class="bl-tree__icon">${ICONS[r.icon] || ""}</span>`;
    const sel   = r.selected ? ' data-selected="true"' : "";
    const conn  = r.connectorAt ? ` data-connector-at="${r.connectorAt}"` : "";
    return `<div class="bl-tree__row" data-depth="${r.depth}"${sel}${conn}>${caret}${icon}<span class="bl-tree__label">${r.label}</span></div>`;
  });

  const blanks = Math.max(0, paddedTo - rows.length);
  for (let n = 0; n < blanks; n++) {
    renderedRows.push(`<div class="bl-tree__row bl-tree__row--blank"></div>`);
  }
  return renderedRows.join("");
}

// Wire sjhell
function wireShell(rootEl) {
  let i = 1;
  const TOTAL_ROWS = 18;

  const $ = (sel) => rootEl.querySelector(sel);
  const placeholderEl = $('[data-bind="placeholder"]');
  const canvasEl      = rootEl.querySelector(".bl-viewport__canvas");
  const treeEl        = $('[data-bind="tree"]');
  const navNameEl     = $('[data-bind="navName"]');
  const navCountEl    = $('[data-bind="navCount"]');
  const gizmoEl       = $('[data-bind="gizmo"]');
  const modeGroup     = $('[data-bind="modeGroup"]');
  const shadingGroup  = $('[data-bind="shadingGroup"]');


  const viewer = createModelViewer(canvasEl, gizmoEl);

  const render = () => {
    const m = MODELS[i];
    treeEl.innerHTML        = renderTree(buildTree(m), TOTAL_ROWS);
    navNameEl.textContent   = m.title;
    navCountEl.textContent  = `${i + 1} / ${MODELS.length}`;
    placeholderEl.textContent = m.title;

    if (m.glb) {
      // Capture the current model index.
      const loadingIndex = i;
  
      const onStats = m.skipLiveStats ? undefined : (stats) => {
        if (loadingIndex !== i) return;
        MODELS[loadingIndex].stats = {
          Vertices:  stats.vertices.toLocaleString(),
          Faces:     stats.faces.toLocaleString(),
          Materials: String(stats.materials),
        };
        treeEl.innerHTML = renderTree(buildTree(MODELS[loadingIndex]), TOTAL_ROWS);
      };
      viewer.loadModel(m.glb, onStats);
      placeholderEl.style.display = "none";
      canvasEl.style.display = "block";
    } else {
      viewer.clearModel();
      placeholderEl.style.display = "grid";
      canvasEl.style.display = "none";
    }
  };
  render();

  // Model navigator
  rootEl.querySelectorAll(".bl-nav__chev").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dir = parseInt(btn.dataset.dir, 10);
      i = (i + dir + MODELS.length) % MODELS.length;
      render();
    });
  });


  shadingGroup.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-shade]");
    if (!btn) return;
    const mode = btn.dataset.shade;
    viewer.setShadingMode(mode);
    shadingGroup.querySelectorAll("[data-shade]").forEach((b) => {
      b.classList.toggle("is-active", b === btn);
    });
  });

  // ----- Blender / Showcase mode toggle
  modeGroup.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-mode]");
    if (!btn) return;
    const mode = btn.dataset.mode;   // "blender" | "showcase"
    viewer.setMode(mode);
    modeGroup.querySelectorAll("[data-mode]").forEach((b) => {
      b.classList.toggle("is-active", b === btn);
    });
    gizmoEl.style.display = mode === "blender" ? "block" : "none";
  });

  return { dispose: () => viewer.dispose() };
}

// Public API

export function open(buttonEl) {
  if (openInstance && document.body.contains(openInstance.win.el)) {
    // Re-clicking the dock icon closes the open window (toggle).
    openInstance.win.close();
    openInstance.shell.dispose();
    openInstance = null;
    return;
  }

  const win = createWindow({ title: "Models", content: HTML });
  const shell = wireShell(win.el);

  const r = buttonEl.getBoundingClientRect();
  win.openFrom(r.left + r.width / 2, r.top + r.height / 2);

  win.el.querySelector(".win__light--close").addEventListener("click", () => {
    shell.dispose();
    openInstance = null;
  });

  openInstance = { win, shell };
}