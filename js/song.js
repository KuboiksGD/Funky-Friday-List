// js/song.js
// Obsługa strony song.html: ładowanie pliku piosenki, renderowanie rankingu i obsługa formularza zgłoszeń.

(() => {
  // Helpers
  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function difficultyClass(diff) {
    if (!diff) return "badge medium";
    const d = diff.toString().toLowerCase();
    if (d.includes("easy")) return "badge easy";
    if (d.includes("medium")) return "badge medium";
    if (d.includes("hard")) return "badge hard";
    if (d.includes("extreme") || d.includes("demon")) return "badge extreme";
    return "badge medium";
  }

  function formatDate(d) {
    if (!d) return "—";
    const dt = new Date(d);
    if (isNaN(dt)) return d;
    return dt.toLocaleString();
  }

  function normalizeSubmissions(data) {
    const raw = data && (data.submissions || data.records || data.entries || data) || [];
    const arr = Array.isArray(raw) ? raw : [];
    return arr.map(s => ({
      user: s.user || s.player || s.name || s.nick || "Anon",
      accuracy: s.accuracy !== undefined && s.accuracy !== null ? Number(s.accuracy) : (s.percent !== undefined ? Number(s.percent) : null),
      link: s.link || s.video || s.url || "",
      date: s.date || s.timestamp || s.time || null,
      hz: s.hz || s.refresh || s.fps || "",
      misses: s.misses !== undefined ? Number(s.misses) : (s.miss !== undefined ? Number(s.miss) : null),
      notes: s.notes || s.note || ""
    }));
  }

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

  function storageKey(mod, file) {
    return `ffl_subs_${mod}__${file}`;
  }

  function loadLocalSubs(mod, file) {
    try {
      const raw = localStorage.getItem(storageKey(mod, file));
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  function saveLocalSubs(mod, file, arr) {
    try {
      localStorage.setItem(storageKey(mod, file), JSON.stringify(arr));
    } catch {}
  }

  // DOM refs
  const titleEl = document.getElementById("song-title");
  const subtitleEl = document.getElementById("song-subtitle");
  const metaEl = document.getElementById("song-meta");
  const loadingEl = document.getElementById("ranking-loading");
  const tableEl = document.getElementById("submissions-table");
  const bodyEl = document.getElementById("submissions-body");
  const noSubsEl = document.getElementById("no-submissions");
  const form = document.getElementById("submit-form");
  const msg = document.getElementById("form-message");
  const clearBtn = document.getElementById("btn-clear");

  // State cache
  let fileSubsCache = [];

  // Main init
  document.addEventListener("DOMContentLoaded", () => {
    const mod = getParam("mod");
    const file = getParam("file");
    const titleParam = getParam("title");

    if (!mod || !file) {
      titleEl.textContent = "Brak danych piosenki";
      loadingEl.textContent = "Nie podano moda lub pliku piosenki w URL.";
      return;
    }

    titleEl.textContent = decodeURIComponent(titleParam || file.replace(".json", ""));
    subtitleEl.textContent = `${decodeURIComponent(mod)} • ranking`;

    const songPath = `data/songs/${encodeURIComponent(mod)}/${encodeURIComponent(file)}`;

    fetch(songPath)
      .then(r => {
        if (!r.ok) throw new Error("Nie znaleziono pliku piosenki");
        return r.json();
      })
      .then(songData => {
        // Meta
        const diff = songData.difficulty || songData.level || songData.diff || "";
        const ver = songData.verification || songData.verifier || songData.verificationVideo || songData.verification_link || "";
        const notes = songData.notes || songData.description || "";

        metaEl.innerHTML = "";
        const diffSpan = document.createElement("span");
        diffSpan.className = "meta-item";
        diffSpan.innerHTML = `<span class="${difficultyClass(diff)}" style="padding:.25rem .6rem; border-radius:999px;">${diff || "—"}</span>`;
        metaEl.appendChild(diffSpan);

        if (ver) {
          const verSpan = document.createElement("span");
          verSpan.className = "meta-item";
          verSpan.innerHTML = `Weryfikacja: <a class="link" href="${ver}" target="_blank" rel="noopener noreferrer">video</a>`;
          metaEl.appendChild(verSpan);
        }

        if (notes) {
          const notesSpan = document.createElement("span");
          notesSpan.className = "meta-item";
          notesSpan.textContent = notes;
          metaEl.appendChild(notesSpan);
        }

        // Load submissions from file and localStorage
        fileSubsCache = normalizeSubmissions(songData);
        const localSubs = loadLocalSubs(mod, file);
        renderSubmissions(fileSubsCache.concat(localSubs));
      })
      .catch(err => {
        loadingEl.textContent = "Błąd: " + err.message;
        tableEl.classList.add("hidden");
        noSubsEl.classList.remove("hidden");
      });

    // Form handlers
    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      msg.classList.add("hidden");
      msg.textContent = "";

      const user = document.getElementById("input-user").value.trim();
      const accuracyRaw = document.getElementById("input-accuracy").value.trim();
      const video = document.getElementById("input-video").value.trim();
      const hz = document.getElementById("input-hz").value.trim();
      const misses = document.getElementById("input-misses").value.trim();
      const platform = document.getElementById("input-platform").value;
      const notes = document.getElementById("input-notes").value.trim();

      if (!user) return showFormMessage("Podaj nick gracza.");
      const accuracy = Number(accuracyRaw);
      if (isNaN(accuracy) || accuracy < 0 || accuracy > 100) return showFormMessage("Accuracy musi być liczbą od 0 do 100.");
      if (!video || (!video.includes("youtube.com") && !video.includes("youtu.be"))) return showFormMessage("Podaj poprawny link do YouTube.");
      const missesNum = misses === "" ? null : Number(misses);
      if (missesNum === null || isNaN(missesNum)) return showFormMessage("Podaj liczbę missów (0 jeśli brak).");
      if (missesNum !== 0) return showFormMessage("Zgłoszenie musi mieć 0 missów, aby zostać zaakceptowane.");

      const submission = {
        user,
        accuracy: Math.round(accuracy * 100) / 100,
        link: video,
        date: new Date().toISOString(),
        hz: hz || "",
        misses: missesNum,
        platform: platform || "",
        notes: notes || ""
      };

      // Persist locally
      const local = loadLocalSubs(mod, file);
      local.push(submission);
      saveLocalSubs(mod, file, local);

      // Re-render combining file cache + local
      renderSubmissions(fileSubsCache.concat(local));

      showFormMessage("Zgłoszenie dodane lokalnie. Poczekaj na weryfikację.", true);
      form.reset();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    clearBtn.addEventListener("click", () => {
      form.reset();
      msg.classList.add("hidden");
    });
  });

  // Renderowanie tabeli zgłoszeń
  function renderSubmissions(subs) {
    const normalized = (Array.isArray(subs) ? subs : []).map(s => ({
      user: s.user || "Anon",
      accuracy: s.accuracy !== undefined && s.accuracy !== null ? Number(s.accuracy) : null,
      link: s.link || s.video || "",
      date: s.date || new Date().toISOString(),
      hz: s.hz || "",
      misses: s.misses !== undefined ? Number(s.misses) : null,
      notes: s.notes || ""
    }));

    const sorted = sortSubmissions(normalized);
    bodyEl.innerHTML = "";

    if (sorted.length === 0) {
      loadingEl.classList.add("hidden");
      tableEl.classList.add("hidden");
      noSubsEl.classList.remove("hidden");
      return;
    }

    sorted.forEach((s, idx) => {
      const tr = document.createElement("tr");

      const rankTd = document.createElement("td");
      rankTd.textContent = idx + 1;
      tr.appendChild(rankTd);

      const userTd = document.createElement("td");
      userTd.textContent = s.user;
      tr.appendChild(userTd);

      const accTd = document.createElement("td");
      accTd.textContent = s.accuracy !== null ? `${s.accuracy}%` : "—";
      tr.appendChild(accTd);

      const dateTd = document.createElement("td");
      dateTd.textContent = formatDate(s.date);
      tr.appendChild(dateTd);

      const videoTd = document.createElement("td");
      if (s.link) {
        const a = document.createElement("a");
        a.href = s.link;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = "Oglądaj";
        a.className = "link";
        videoTd.appendChild(a);
      } else {
        videoTd.textContent = "—";
      }
      tr.appendChild(videoTd);

      const hzTd = document.createElement("td");
      hzTd.textContent = s.hz || "—";
      tr.appendChild(hzTd);

      bodyEl.appendChild(tr);
    });

    loadingEl.classList.add("hidden");
    tableEl.classList.remove("hidden");
    noSubsEl.classList.add("hidden");
  }

  function showFormMessage(text, success = false) {
    msg.textContent = text;
    msg.style.color = success ? "var(--accent-2)" : "var(--accent)";
    msg.classList.remove("hidden");
  }
})();
