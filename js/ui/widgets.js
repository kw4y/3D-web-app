// js/ui/widgets.js


const BRIGHTON = { lat: 50.8225, lon: -0.1372, name: "Brighton" };

const WMO = {
  0: ["Clear", "sun"], 1: ["Mostly Clear", "sun"], 2: ["Partly Cloudy", "partly"],
  3: ["Cloudy", "cloud"], 45: ["Fog", "fog"], 48: ["Fog", "fog"],
  51: ["Drizzle", "drizzle"], 53: ["Drizzle", "drizzle"], 55: ["Drizzle", "drizzle"],
  56: ["Drizzle", "drizzle"], 57: ["Drizzle", "drizzle"],
  61: ["Rain", "rain"], 63: ["Rain", "rain"], 65: ["Heavy Rain", "rain"],
  66: ["Rain", "rain"], 67: ["Rain", "rain"],
  71: ["Snow", "snow"], 73: ["Snow", "snow"], 75: ["Snow", "snow"], 77: ["Snow", "snow"],
  80: ["Showers", "rain"], 81: ["Showers", "rain"], 82: ["Heavy Showers", "rain"],
  85: ["Snow Showers", "snow"], 86: ["Snow Showers", "snow"],
  95: ["Thunderstorm", "storm"], 96: ["Thunderstorm", "storm"], 99: ["Thunderstorm", "storm"],
};

function icon(kind) {
  const o = '<svg class="w-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">';
  const sun = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>';
  const cloud = '<path d="M7 18h9a3.5 3.5 0 0 0 .4-6.97 5 5 0 0 0-9.6-1.2A3.6 3.6 0 0 0 7 18Z"/>';
  const parts = {
    sun: sun,
    partly: '<circle cx="8" cy="8" r="3"/><path d="M8 2v1.5M2 8h1.5M3.8 3.8l1 1M12.2 3.8l-1 1"/><path d="M9 19h8a3 3 0 0 0 .3-5.97 4.3 4.3 0 0 0-8.2-1A3.1 3.1 0 0 0 9 19Z"/>',
    cloud: cloud,
    fog: cloud + '<path d="M5 21h11M7 23.5h9" opacity="0.7"/>',
    drizzle: cloud + '<path d="M9 19.5l-.6 1.5M13 19.5l-.6 1.5"/>',
    rain: cloud + '<path d="M8.5 19.5l-1 2.2M12 19.5l-1 2.2M15.5 19.5l-1 2.2"/>',
    snow: cloud + '<path d="M9 20.5h.01M12 21.5h.01M15 20.5h.01"/>',
    storm: cloud + '<path d="M12 18l-2 3.2h3L11 24"/>',
  };
  return o + (parts[kind] || cloud) + "</svg>";
}

function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}

export function initWidgets() {
  if (document.querySelector(".widgets")) return;       // guard double-init

  const wrap = el("div", "widgets");
  wrap.setAttribute("aria-hidden", "true");             // decorative layer

  //  Clock card 
  const clock = el("div", "widget widget--clock");
  const time  = el("div", "w-time", "--:--");
  const date  = el("div", "w-date", "");
  clock.append(time, date);

  //  Weather card 
  const weather = el("div", "widget widget--weather");
  weather.innerHTML =
    '<div class="w-head"><span class="w-loc">' + BRIGHTON.name + '</span></div>' +
    '<div class="w-now"><span class="w-muted">Loading\u2026</span></div>' +
    '<div class="w-hours"></div>';

  //  Calendar card 
  const cal = el("div", "widget widget--cal");

  wrap.append(clock, weather, cal);
  document.body.appendChild(wrap);

  //  tick the clock + calendar every second 
  function tick() {
    const d = new Date();
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    const s = String(d.getSeconds()).padStart(2, "0");
    time.innerHTML = `${String(h).padStart(2, "0")}:${m}<span class="w-secs">${s}</span>`;
    date.textContent = d.toLocaleDateString("en-GB",
      { weekday: "long", day: "numeric", month: "long" });

    // calendar
    const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    let week = "";
    const start = new Date(d); start.setDate(d.getDate() - d.getDay());
    for (let i = 0; i < 7; i++) {
      const cd = new Date(start); cd.setDate(start.getDate() + i);
      const today = cd.toDateString() === d.toDateString();
      week += `<div class="w-d${today ? " is-today" : ""}"><span>${dayNames[i]}</span><b>${cd.getDate()}</b></div>`;
    }
    cal.innerHTML =
      '<div class="w-month">' + d.toLocaleDateString("en-GB", { month: "long" }) + '</div>' +
      '<div class="w-weekday">' + d.toLocaleDateString("en-GB", { weekday: "long" }) + '</div>' +
      '<div class="w-daynum">' + d.getDate() + '</div>' +
      '<div class="w-week">' + week + '</div>';
  }
  tick();
  setInterval(tick, 1000);

  //  fetch Brighton weather from Open-Meteo 
  loadWeather(weather);
}

async function loadWeather(card) {
  const now   = card.querySelector(".w-now");
  const hours = card.querySelector(".w-hours");
  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${BRIGHTON.lat}&longitude=${BRIGHTON.lon}` +
    "&current=temperature_2m,weather_code" +
    "&hourly=temperature_2m,weather_code" +
    "&daily=temperature_2m_max,temperature_2m_min" +
    "&timezone=auto&forecast_days=1";
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const d = await res.json();

    const code = d.current.weather_code;
    const [label, kind] = WMO[code] || ["—", "cloud"];
    const t   = Math.round(d.current.temperature_2m);
    const hi  = Math.round(d.daily.temperature_2m_max[0]);
    const lo  = Math.round(d.daily.temperature_2m_min[0]);

    now.innerHTML =
      icon(kind) +
      `<div><div class="w-temp">${t}\u00B0</div></div>` +
      `<div style="margin-left:auto;text-align:right">` +
        `<div class="w-cond">${label}</div>` +
        `<div class="w-hilo">H:${hi}\u00B0 L:${lo}\u00B0</div>` +
      `</div>`;

    // next four hours from "now"
    const times = d.hourly.time;
    const start = times.findIndex(t => new Date(t) > new Date());
    const i0 = start < 0 ? 0 : start;
    let html = "";
    for (let i = i0; i < i0 + 4 && i < times.length; i++) {
      const hr = new Date(times[i]).getHours();
      const [, k] = WMO[d.hourly.weather_code[i]] || ["", "cloud"];
      html += `<div class="w-hour">${hr}h ${icon(k)} <b>${Math.round(d.hourly.temperature_2m[i])}\u00B0</b></div>`;
    }
    hours.innerHTML = html;
  } catch (err) {
    console.warn("[widgets] weather unavailable:", err.message);
    now.innerHTML = '<span class="w-muted">Weather unavailable offline</span>';
    hours.innerHTML = "";
  }
}