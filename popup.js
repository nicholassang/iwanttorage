document.addEventListener("DOMContentLoaded", async () => {
  const toggleSwitch = document.getElementById("toggleSwitch");
  const tldDisplay = document.getElementById("tld");

  // Get active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let scriptInjected = false;

  // Show TLD in toolbar
  try {
    const url = new URL(tab.url);
    const domainParts = url.hostname.split(".");
    tldDisplay.textContent = domainParts.slice(-2).join(".");
    if (tldDisplay.textContent == "newtab"){tldDisplay.textContent = "This page is protected by Google, please search something instead"}
  } catch {
    tldDisplay.textContent = "unknown";
  }

  // Initialize slider based on storage
  chrome.storage.local.get("scriptActive", (data) => {
    toggleSwitch.checked = !!data.scriptActive;
  });

  // Function to inject content script if needed
  async function injectScriptOnce() {
    if (scriptInjected) return;
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["dist/content.js"]
      });
      scriptInjected = true;
    } catch (err) {
      console.error("Content script injection failed:", err);
    }
  }

  // Toggle function
  async function toggleScript() {
    toggleSwitch.disabled = true;

    if (!tab.url.startsWith("http")) {
      toggleSwitch.disabled = false;
      return;
    }

    await injectScriptOnce();

    // Send toggle message
    try {
      await waitForContentScript(tab.id);
      await chrome.tabs.sendMessage(tab.id, { action: "toggle" });
    } catch (err) {
      console.warn("Toggle failed:", err.message);
    }

    toggleSwitch.disabled = false;
  }

  toggleSwitch.addEventListener("change", toggleScript);
});

async function waitForContentScript(tabId, timeout = 1500) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, { action: "ping" });
      if (response?.ready) return true;
    } catch (e) {
      console.log(e)
    }
    await new Promise(r => setTimeout(r, 100));
  }

  throw new Error("Content script not ready");
}