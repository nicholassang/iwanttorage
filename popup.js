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
    chrome.tabs.sendMessage(tab.id, { action: "toggle" }, () => {
      toggleSwitch.disabled = false;
    });
  }

  toggleSwitch.addEventListener("change", toggleScript);
});