// js/script.js
// Ładuje data/mods.json i renderuje kafelki modów na stronie głównej (index.html)

document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("mod-grid");
  const errorEl = document.getElementById("error");

  async function loadMods() {
    try {
      const res = await fetch("data/mods.json", { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const mods = await res.json();
      if (!Array.isArray(mods) || mods.length === 0) {
        showError("Brak modów w data/mods.json");
        return;
      }
      renderMods(mods);
    } catch (err) {
      showError("Błąd podczas ładowania danych: " + err.message);
    }
  }

  function showError(msg) {
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.style.display = "block";
    } else {
      console.error(msg);
    }
  }

  function renderMods(mods) {
    grid.innerHTML = "";

    mods.forEach(mod => {
      // Główny przycisk/kafelek
      const card = document.createElement("button");
      card.type = "button";
      card.className = "mod-card";
      card.setAttribute("aria-label", `Otwórz moda ${mod.mod}`);
      card.tabIndex = 0;

      if (mod.color) card.style.borderColor = mod.color;

      // Meta (ikonka + tekst)
      const meta = document.createElement("div");
      meta.className = "mod-meta";

      const icon = document.createElement("div");
      icon.className = "mod-icon";
      icon.textContent = mod.icon || mod.mod.charAt(0);
      if (mod.color) icon.style.background = `linear-gradient(135deg, ${mod.color}33, ${mod.color}1a)`;

      const metaText = document.createElement("div");
      metaText.style.flex = "1";

      const name = document.createElement("div");
      name.className = "mod-name";
      name.textContent = mod.mod;

      const desc = document.createElement("div");
      desc.className = "mod-desc";
      desc.textContent = mod.description || "";

      metaText.appendChild(name);
      metaText.appendChild(desc);
      meta.appendChild(icon);
      meta.appendChild(metaText);

      // Akcje (Info, Otwórz)
      const actions = document.createElement("div");
      actions.className = "mod-actions";

      const infoBtn = document.createElement("button");
      infoBtn.className = "btn secondary";
      infoBtn.type = "button";
      infoBtn.textContent = "Info";
      infoBtn.addEventListener("click", e => {
        e.stopPropagation();
        window.alert(`${mod.mod}\n\n${mod.description || "Brak opisu"}`);
      });

      const openBtn = document.createElement("button");
      openBtn.className = "btn";
      openBtn.type = "button";
      openBtn.textContent = "Otwórz";
      openBtn.addEventListener("click", e => {
        e.stopPropagation();
        window.location.href = `mod.html?mod=${encodeURIComponent(mod.folder)}`;
      });

      actions.appendChild(infoBtn);
      actions.appendChild(openBtn);

      // Złożenie kafelka
      card.appendChild(meta);
      card.appendChild(actions);

      // Kliknięcie na kafelek otwiera moda
      card.addEventListener("click", () => {
        window.location.href = `mod.html?mod=${encodeURIComponent(mod.folder)}`;
      });

      // Obsługa klawiatury (Enter / Space)
      card.addEventListener("keydown", ev => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          window.location.href = `mod.html?mod=${encodeURIComponent(mod.folder)}`;
        }
      });

      grid.appendChild(card);
    });
  }

  // Start
  loadMods();
});
