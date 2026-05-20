// Dock controller.


import * as ModelsApp from "./apps/models.js";
import * as AboutApp  from "./apps/about.js";
import * as SafariApp from "./apps/safari.js";
import * as SpotifyApp from "./apps/spotify.js";
import { closeAllWindows } from "./window.js";


const APPS = {
  "Models":  ModelsApp,
  "About":   AboutApp,
  "Safari":  SafariApp,
  "Spotify": SpotifyApp,
};

export function initDock() {
  const buttons = document.querySelectorAll(".dock__item");
  let wiredCount = 0;

  buttons.forEach((btn) => {
    const label = btn.getAttribute("aria-label");


    if (label === "Launchpad") {
      btn.addEventListener("click", () => closeAllWindows());
      wiredCount++;
      return;
    }

    const app = APPS[label];
    if (!app) return;       // no app registered for this icon — skip silently
    btn.addEventListener("click", () => app.open(btn));
    wiredCount++;
  });

  console.log(`[dock] initialised, ${wiredCount} app(s) wired`);
}