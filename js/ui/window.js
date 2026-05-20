// View module
function bringToFront(target) {
  const wins = [...document.querySelectorAll(".win")].filter((w) => w !== target);
  wins.sort((a, b) => parseInt(a.style.zIndex || "0", 10) - parseInt(b.style.zIndex || "0", 10));
  wins.push(target);
  wins.forEach((w, i) => { w.style.zIndex = String(10 + i); });
}

// Update the macOS-style menu-bar app name to whatever window is front
export function updateMenuBar() {
  const appEl = document.querySelector(".menu-bar__app");
  if (!appEl) return;
  let top = null, topZ = -1;
  document.querySelectorAll(".win").forEach((w) => {
    if (w.dataset.state !== "open") return;       // ignore closing/closed windows
    const z = parseInt(w.style.zIndex || "0", 10);
    if (z >= topZ) { topZ = z; top = w; }
  });
  appEl.textContent = top ? (top.dataset.app || "Finder") : "Finder";
}

// Close every open window 
export function closeAllWindows() {
  document.querySelectorAll(".win").forEach((w) => {
    const closeBtn = w.querySelector(".win__light--close");
    if (closeBtn) closeBtn.click();
  });
}

export function createWindow({ title = "Window", content = "", app = "", width = "", height = "" } = {}) {
  const el = document.createElement("section");
  el.className = "win";
  el.dataset.app = app || title;     
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-label", title);


  if (width)  el.style.width  = typeof width  === "number" ? `${width}px`  : width;
  if (height) el.style.height = typeof height === "number" ? `${height}px` : height;
  el.innerHTML = `
    <header class="win__toolbar">
      <div class="win__lights">
        <button class="win__light win__light--close"    aria-label="Close"></button>
        <button class="win__light win__light--minimize" aria-label="Minimize"></button>
        <button class="win__light win__light--maximize" aria-label="Maximize"></button>
      </div>
      <span class="win__tb-title">${title}</span>
    </header>
    <div class="win__content"></div>
  `;
  el.querySelector(".win__content").innerHTML = content;

  el.dataset.state = "closed";
  document.body.appendChild(el);

  // Spawn at a small random offset from centre 
  let dx = Math.round((Math.random() - 0.5) * 260);
  let dy = Math.round((Math.random() - 0.5) * 120);
  const applyTransform = (s = 1) => {
    el.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${s})`;
  };
  // Initial closed-state scale. 
  applyTransform(0.85);

  function openFrom(originX, originY) {
    const r = el.getBoundingClientRect();
    el.style.transformOrigin = `${((originX - r.left) / r.width) * 100}% ${((originY - r.top) / r.height) * 100}%`;
    bringToFront(el);
    void el.offsetWidth;

    el.dataset.animating = "true";
    el.addEventListener("transitionend", function clear(e) {
      if (e.propertyName !== "transform") return;
      el.dataset.animating = "";
      el.removeEventListener("transitionend", clear);
    });
    requestAnimationFrame(() => {
      el.dataset.state = "open";
      applyTransform(1);
      updateMenuBar();
    });
  }

  let isClosed = false;
  function close() {
    if (isClosed) return;
    isClosed = true;
    el.dataset.animating = "true";
    el.style.transformOrigin = "50% 50%";
    el.dataset.state = "closed";
    el.style.transform =
      `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.92)`;
    updateMenuBar();

    el.addEventListener("transitionend", function done(e) {
      if (e.propertyName !== "transform") return;
      el.removeEventListener("transitionend", done);
      el.remove();
    });
  }

  el.querySelector(".win__light--close").addEventListener("click", close);


  const toolbar = el.querySelector(".win__toolbar");
  let dragging = false;
  toolbar.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    if (e.target.closest(".win__light")) return;
    if (dragging) return;
    e.preventDefault();
    dragging = true;
    el.dataset.dragging = "true";
    bringToFront(el);
    const pid = e.pointerId;
    const sX = e.clientX, sY = e.clientY, sDx = dx, sDy = dy;
    try { toolbar.setPointerCapture(pid); } catch (_) {}
    const move = (ev) => {
      if (!dragging) return;
      dx = sDx + (ev.clientX - sX);
      dy = sDy + (ev.clientY - sY);
      applyTransform(1);
    };
    const end = () => {
      if (!dragging) return;
      dragging = false;
      el.dataset.dragging = "";
      try { toolbar.releasePointerCapture(pid); } catch (_) {}
      window.removeEventListener("pointermove",   move);
      window.removeEventListener("pointerup",     end);
      window.removeEventListener("pointercancel", end);
      toolbar.removeEventListener("lostpointercapture", end);
    };
    window.addEventListener("pointermove",   move);
    window.addEventListener("pointerup",     end);
    window.addEventListener("pointercancel", end);
    toolbar.addEventListener("lostpointercapture", end);
  });

  el.addEventListener("pointerdown", () => {
    bringToFront(el);
    updateMenuBar();
  });

  return { el, openFrom, close };
}