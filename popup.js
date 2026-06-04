const scrapeBtn = document.getElementById('scrapeBtn');
const openWidgetBtn = document.getElementById('openWidgetBtn');
const statusBox = document.getElementById('statusBox');
const countDisplay = document.getElementById('countDisplay');

function setStatus(msg, type = '') {
  statusBox.textContent = msg;
  statusBox.className = 'status-box ' + type;
  statusBox.style.display = 'block';
}

function setCount(n) {
  countDisplay.innerHTML = `Members: <span class="count-badge">${n}</span>`;
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function ensureWhatsAppTab() {
  const tab = await getActiveTab();
  if (!tab || !tab.url || !tab.url.includes('web.whatsapp.com')) {
    setStatus('Open web.whatsapp.com first and navigate to a group.', 'error');
    return null;
  }
  return tab;
}

async function pingContentScript(tabId) {
  try {
    const resp = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
    return resp && resp.alive;
  } catch {
    return false;
  }
}

function downloadXLSX(data) {
  const wb = XLSX.utils.book_new();
  const wsData = [
    ['Name', 'Phone Number', 'Description', 'Group']
  ];
  data.members.forEach((m) => {
    wsData.push([m.name || '', m.phone || '', m.description || '', data.groupName]);
  });
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [
    { wch: 30 },
    { wch: 20 },
    { wch: 40 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Members');
  const filename = `keshavkajalwa_${data.groupName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

scrapeBtn.addEventListener('click', async () => {
  const tab = await ensureWhatsAppTab();
  if (!tab) return;

  const alive = await pingContentScript(tab.id);
  if (!alive) {
    setStatus('Extension not loaded. Refresh WhatsApp Web and try again.', 'error');
    return;
  }

  scrapeBtn.disabled = true;
  scrapeBtn.textContent = 'Scraping...';
  setStatus('Scrolling through members and extracting data...', '');

  try {
    const resp = await chrome.tabs.sendMessage(tab.id, { action: 'scrape' });
    if (resp.success) {
      setStatus(
        `Done! ${resp.count} members from "${resp.data.groupName}". Downloading XLSX...`,
        'success'
      );
      setCount(resp.count);
      downloadXLSX(resp.data);
    } else {
      setStatus(resp.error || 'Scrape failed. Make sure a group chat is open.', 'error');
    }
  } catch (e) {
    setStatus('Connection error: ' + e.message + '. Try refreshing WhatsApp Web.', 'error');
  } finally {
    scrapeBtn.disabled = false;
    scrapeBtn.textContent = 'Scrape Members';
  }
});

openWidgetBtn.addEventListener('click', async () => {
  const tab = await ensureWhatsAppTab();
  if (!tab) return;
  setStatus('Floating widget is at bottom-right of WhatsApp Web. Click "Scrape Members" there for CSV export.', 'success');
});

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  if (tab && tab.url && tab.url.includes('web.whatsapp.com')) {
    setStatus('Ready. Open a group chat, then click Scrape.', '');
  }
});
