const ENABLED_KEY = "lovable-debug-ext-enabled";
const cb = document.getElementById("enabled");
const status = document.getElementById("status");

chrome.storage.local.get([ENABLED_KEY], (res) => {
  cb.checked = res[ENABLED_KEY] !== false;
});

cb.addEventListener("change", () => {
  chrome.storage.local.set({ [ENABLED_KEY]: cb.checked });
});

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const url = tabs[0]?.url || "";
  const isLovable = /https:\/\/[^/]*\.(lovable\.app|lovableproject\.com)\//.test(url);
  if (isLovable) {
    status.textContent = "✓ Projeto Lovable detectado nesta aba.";
    status.className = "status ok";
  } else {
    status.textContent = "Esta aba não é um projeto Lovable.";
    status.className = "status warn";
  }
});
