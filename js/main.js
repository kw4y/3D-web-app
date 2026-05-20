// Entry point: clock + 3D scene + dock controller.

import { initScene } from "./three/scene.js";
import { initDock }  from "./ui/dock.js";
import { initWidgets } from "./ui/widgets.js";

console.log("[main.js] loaded");

//  Clock 
const clockEl = document.getElementById("clock");
function updateClock() {
  if (!clockEl) return;
  const d = new Date();
  const day  = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  clockEl.textContent = `${day}  ${time}`;
}
updateClock();
setInterval(updateClock, 30_000);

//  3D scene 
initScene();

//  Loading overlay 

const loaderEl = document.getElementById("loader");
function hideLoader() {
  if (!loaderEl || loaderEl.classList.contains("is-hidden")) return;
  loaderEl.classList.add("is-hidden");
  setTimeout(() => loaderEl.remove(), 700);   // remove after the fade
}
document.addEventListener("scene:ready", hideLoader, { once: true });
setTimeout(hideLoader, 15000);                 // safety fallback (slow connections / ITS)

//  Dock interactions 
initDock();

//  Desktop widgets (Clock · Weather · Calendar) 
initWidgets();