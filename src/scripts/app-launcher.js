import { appData } from './data/apps.js';

export function initAppLauncher() {
  const launcherButtons = document.querySelectorAll(".app-card");
  const previewButtons = document.querySelectorAll(".preview-card");
  const detailLabel = document.getElementById("detailLabel");
  const detailTitle = document.getElementById("detailTitle");
  const detailText = document.getElementById("detailText");
  const detailList = document.getElementById("detailList");
  const detailFooter = document.getElementById("detailFooter");
  const activeAppName = document.getElementById("activeAppName");

  function setActiveApp(appKey) {
    const item = appData[appKey];
    if (!item) return;
    launcherButtons.forEach(btn => btn.classList.toggle("active", btn.dataset.app === appKey));
    previewButtons.forEach(btn => btn.setAttribute("aria-pressed", String(btn.dataset.app === appKey)));
    detailLabel.textContent = item.label;
    detailTitle.innerHTML = item.title;
    detailText.textContent = item.text;
    detailList.innerHTML = item.points.map(point => `<li>${point}</li>`).join("");
    detailFooter.textContent = item.footer;
    const activeLauncher = document.querySelector(`.app-card[data-app="${appKey}"] b`);
    if (activeAppName) activeAppName.textContent = activeLauncher?.textContent || appKey;

    // Fire tracking event
    if (typeof window.trackEvent === 'function') {
      window.trackEvent('AppLauncher_Click', { selected_app: appKey });
    }
  }

  // Preview cards (marquee)
  previewButtons.forEach(button => {
    button.addEventListener("click", () => {
      setActiveApp(button.dataset.app);
      document.getElementById("aplikasi")?.scrollIntoView({behavior:"smooth", block:"start"});
    });
  });

  // Launcher grid cards
  launcherButtons.forEach(button => {
    button.addEventListener("click", () => {
      setActiveApp(button.dataset.app);
      if (window.innerWidth <= 760) {
        document.querySelector('.app-detail')?.scrollIntoView({behavior:'smooth', block:'nearest'});
      }
    });
  });

  // Niche pack buttons
  document.querySelectorAll("[data-pack]").forEach(button => {
    button.addEventListener("click", () => {
      const pack = button.dataset.pack;
      detailLabel.textContent = "NICHE POSITIONING / " + pack.toUpperCase();
      detailTitle.innerHTML = `Start with <em>${pack}.</em>`;
      detailText.textContent = "Paket ini adalah titik masuk untuk membangun lini produk AI yang nyambung dengan market Anda. Ambil aplikasi yang paling relevan, beri nama baru, lalu kemas sebagai offer yang spesifik.";
      detailList.innerHTML = [
        "Mulai dari 1 produk unggulan agar positioning tetap tajam",
        "Gunakan bundle untuk menaikkan perceived value",
        "Jadikan aplikasi sebagai pintu masuk ke offer premium Anda"
      ].map(point => `<li>${point}</li>`).join("");
      detailFooter.textContent = "\u201cBukan tentang menjual lebih banyak aplikasi. Ini tentang meluncurkan produk yang tepat ke audiens yang tepat.\u201d";
      document.getElementById("aplikasi")?.scrollIntoView({behavior:"smooth", block:"start"});

      if (typeof window.trackEvent === 'function') {
        window.trackEvent('NichePack_Click', { selected_niche_pack: pack });
      }
    });
  });

  // Set initial active app
  const firstActive = document.querySelector(".app-card.active");
  if (firstActive) {
    setActiveApp(firstActive.dataset.app || "adsprint");
  }
}
