// js/mod.js

// Utility: pobiera parametr z URL
function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// Mapowanie trudności na klasy badge (zgodne ze style.css)
function difficultyClass(diff) {
  if (!diff) return "badge medium";
  const d = diff.toString().toLowerCase();
  if (d.includes("easy")) return "badge easy";
  if (d.includes("medium")) return "badge medium";
  if (d.includes("hard")) return "badge hard";
  if (d.includes("extreme") || d.includes("demon")) return "badge extreme";
  return "badge medium";
}

// Sortowanie zgłoszeń: accuracy desc, potem data asc
function sortSubmissions(subs) {
  return subs.slice().sort((a, b) => {
    const aAcc = a.accuracy !== undefined && a.accuracy !== null ? Number(a.accuracy) : 0;
    const bAcc = b.accuracy !== undefined && b.accuracy !== null ? Number(b.accuracy) : 0;
    if (bAcc !== aAcc) return bAcc - aAcc;
    const da = a.date ? new Date(a.date) : new Date(0);
    const db = b.date ? new Date(b.date) : new Date(0);
    return da - db;
  });
}

// Bezpieczne fetchowanie JSONa
async function fetchJson(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return null;
  }
}

// Renderuje stronę moda: nagłówek i kafelki piosenek
async function renderModPage() {
  const folder = getParam("mod");
  const grid = document.getElementById("song-grid");
  const errorEl = document.getElementById("error");
  const titleEl = document.getElementById("mod-title");
  const descEl = document.getElementById("mod-desc");

  if (!folder) {
    errorEl.textContent = "Nie podano moda. Wróć do strony głównej i wybierz moda.";
    errorEl.style.display = "block";
    return;
  }

  const mods = await fetchJson("data/mods.json");
  if (!mods) {
    errorEl.textContent = "Nie można załadować data/mods.json";
    errorEl.style.display = "block";
    return;
  }

  const mod = mods.find(m => m.folder === folder);
  if (!mod) {
    errorEl.textContent = `Nie znaleziono moda: ${folder}`;
    errorEl.style.display = "block";
    return;
  }

  // Ustaw nagłówek
  titleEl.textContent = mod.mod;
  descEl.textContent = mod.description || "";

  // Wyczyść grid
  grid.innerHTML = "";

  // Dla każdego utworu stwórz kafelek
  for (const song of (mod.songs || [])) {
    const card = document.createElement("div");
    card.className = "mod-card";
    card.tabIndex = 0;
    card.setAttribute("role", "group");
    card.setAttribute("aria-label", `Piosenka ${song.title}`);

    // Meta
    const meta = document.createElement("div");
    meta.className = "mod-meta";

    const icon = document.createElement("div");
    icon.className = "mod-icon";
    icon.textContent = (mod.icon || mod.mod.charAt(0)).toString().slice(0, 2);
    if (mod.color) {
      icon.style.background = `linear-gradient(135deg, ${mod.color}33, ${mod.color}1a)`;
    }

    const metaText = document.createElement("div");
    metaText.style.flex = "1";

    const name = document.createElement("div");
    name.className = "mod-name";
    name.textContent = song.title;

    const desc = document.createElement("div");
    desc.className = "mod-desc";
    desc.textContent = `Plik: ${song.file} • Trudność: ${song.difficulty || "—"}`;

    metaText.appendChild(name);
    metaText.appendChild(desc);

    meta.appendChild(icon);
    meta.appendChild(metaText);

    // Akcje
    const actions = document.createElement("div");
    actions.className = "mod-actions";

    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.gap = "0.5rem";
    left.style.alignItems = "center";

    const badge = document.createElement("span");
    badge.className = difficultyClass(song.difficulty);
    badge.textContent = song.difficulty || "Unknown";

    left.appendChild(badge);

    const preview = document.createElement("div");
    preview.className = "text-muted";
    preview.style.fontSize = ".9rem";
    preview.style.marginLeft = ".5rem";
    preview.textContent = "Ładowanie zgłoszeń...";

    left.appendChild(preview);

    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.gap = ".5rem";

    const rankBtn = document.createElement("button");
    rankBtn.className = "btn";
    rankBtn.textContent = "Ranking";
    rankBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const url = `song.html?mod=${encodeURIComponent(folder)}&file=${encodeURIComponent(song.file)}&title=${encodeURIComponent(song.title)}`;
      window.location.href = url;
    });

    const submitBtn = document.createElement("button");
    submitBtn.className = "btn secondary";
    submitBtn.textContent = "Submit";
    submitBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const url = `song.html?mod=${encodeURIComponent(folder)}&file=${encodeURIComponent(song.file)}&title=${encodeURIComponent(song.title)}#submit`;
      window.location.href = url;
    });

    right.appendChild(submitBtn);
    right.appendChild(rankBtn);

    actions.appendChild(left);
    actions.appendChild(right);

    card.appendChild(meta);
    card.appendChild(actions);

    // Pobierz plik piosenki, aby wyświetlić top submit
    (async () => {
      const songPath = `data/songs/${encodeURIComponent(folder)}/${encodeURIComponent(song.file)}`;
      const songData = await fetchJson(songPath);
      if (!songData) {
        preview.textContent = "Brak danych piosenki";
        return;
      }

      // Akceptujemy różne nazwy pola: submissions, records, entries
      const subs = Array.isArray(songData.submissions) ? songData.submissions
                  : Array.isArray(songData.records) ? songData.records
                  : Array.isArray(songData.entries) ? songData.entries
                  : [];

      if (!subs || subs.length === 0) {
        preview.textContent = "Brak zgłoszeń";
        return;
      }

      // Normalizacja minimalna
      const normalized = subs.map(s => ({
        user: s.user || s.player || s.name || "Anon",
        accuracy: s.accuracy !== undefined ? Number(s.accuracy) : (s.percent !== undefined ? Number(s.percent) : null),
        date: s.date || s.timestamp || null
      }));

      const sorted = sortSubmissions(normalized);
      const top = sorted[0];
      const acc = top && top.accuracy !== null ? `${top.accuracy}%` : "—";
      const user = top && top.user ? top.user : "Anon";
      preview.textContent = `Top: ${user} • ${acc}`;
    })();

    // Keyboard: Enter otwiera ranking
    card.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        rankBtn.click();
      }
    });

    // Kliknięcie na kafelek otwiera ranking
    card.addEventListener("click", () => rankBtn.click());

    grid.appendChild(card);
  }
}

// Inicjalizacja po załadowaniu DOM
document.addEventListener("DOMContentLoaded", () => {
  renderModPage();
});
