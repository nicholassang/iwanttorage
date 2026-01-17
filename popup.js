document.addEventListener('DOMContentLoaded', () => {
  const toggleSwitch = document.getElementById('toggleSwitch');

  toggleSwitch.addEventListener('change', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    try {
      chrome.tabs.sendMessage(tab.id, { action: 'toggle' });
    } catch {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['dist/content.js']
      }).then(() => {
        chrome.tabs.sendMessage(tab.id, { action: 'toggle' });
      });
    }
  });
});