// Spotifyapp —
import { createWindow } from "../window.js";

let openInstance = null;

// Lily Chou-Chou — 呼吸 (Kokyu / Breathe)
// https://open.spotify.com/album/4IVnHzCk8zgJ1ivesDoTc3
const ALBUM_ID = "4IVnHzCk8zgJ1ivesDoTc3";

const HTML = `
<div class="sp-app">
  <iframe class="sp-frame"
          src="https://open.spotify.com/embed/album/${ALBUM_ID}?utm_source=generator&theme=0"
          width="100%" height="100%"
          frameborder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          title="Lily Chou-Chou — 呼吸 (Kokyu)">
  </iframe>
</div>
`;

export function open(buttonEl) {
  if (openInstance && document.body.contains(openInstance.el)) {
    openInstance.close();
    openInstance = null;
    return;
  }

  const win = createWindow({
    title: "Spotify",
    content: HTML,
    app: "Spotify",
    width: 440,
    height: 192,         
  });
  win.el.classList.add("win--spotify");   

  const r = buttonEl.getBoundingClientRect();
  win.openFrom(r.left + r.width / 2, r.top + r.height / 2);

  win.el.querySelector(".win__light--close").addEventListener("click", () => {
    openInstance = null;
  });

  openInstance = win;
}