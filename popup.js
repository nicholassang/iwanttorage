document.getElementById('toggleBtn').addEventListener('click', async () => {
  if (toggleBtn.textContent === "Turn on") {
    toggleBtn.textContent = "Turn off";
  } else {
    toggleBtn.textContent = "Turn on";
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { action: 'toggle' });
});