(function () {
  let isRunning = false;

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function getGroupName() {
    const info = document.querySelector(
      '[data-testid="conversation-info-header-chat-title"]'
    );
    if (info) {
      const t = info.textContent?.trim();
      if (t) return t;
    }

    const headerSpan = document.querySelector(
      '[data-testid="conversation-header"] span[title]'
    );
    if (headerSpan) {
      const text = headerSpan.textContent?.trim();
      const title = headerSpan.getAttribute('title') || '';
      if (text && text !== title) return text;
    }

    return 'WhatsApp Group';
  }

  function parseMembersFromTitle(titleStr) {
    if (!titleStr) return [];
    const entries = titleStr.split(', ');
    const members = [];
    const seen = new Set();

    entries.forEach((raw) => {
      const t = raw.trim();
      if (!t) return;
      if (t.toLowerCase() === 'you') return;
      if (seen.has(t)) return;
      seen.add(t);

      const isPhone = t.startsWith('+');
      members.push({
        name: isPhone ? '' : t,
        phone: isPhone ? t : '',
        description: '',
      });
    });

    return members;
  }

  function enrichFromDrawer(members) {
    const drawer = document.querySelector('[data-testid="drawer-right"]');
    if (!drawer) return;

    const skipHeaders = [
      'Groups in common',
      'Messages',
      'Media',
      'Links',
      'Docs',
      'Muted',
      'Starred',
      'Notifications',
      'Encryption',
      'Disappearing',
    ];

    const items = drawer.querySelectorAll('[data-testid^="list-item-"]');
    items.forEach((item) => {
      const cellTitle = item.querySelector('[data-testid="cell-frame-title"]');
      if (!cellTitle) return;
      const titleText = cellTitle.textContent?.trim();
      if (!titleText) return;
      if (skipHeaders.some((h) => titleText.includes(h))) return;

      const cellSec = item.querySelector(
        '[data-testid="cell-frame-secondary"]'
      );
      let secText = '';
      if (cellSec) {
        secText = (cellSec.textContent || '').trim();
        if (
          secText.includes('are also in this group') ||
          secText.match(/^~\s*$/)
        )
          secText = '';
      }

      let matched = false;
      for (const m of members) {
        if (m.name === titleText || m.phone === titleText) {
          if (secText && !m.description) m.description = secText;
          if (!m.phone && secText) {
            const pm = secText.match(/\+?\d[\d\s\-()]{8,}/);
            if (pm) m.phone = pm[0].trim();
          }
          matched = true;
          break;
        }
      }

      if (!matched && titleText.startsWith('+')) {
        const existing = members.find((m) => m.phone === titleText);
        if (!existing) {
          members.push({
            name: '',
            phone: titleText,
            description: secText,
          });
        }
      }
    });
  }

  async function scrape() {
    if (isRunning) return { success: false, error: 'Already running' };
    isRunning = true;

    try {
      const headerSpan = document.querySelector(
        '[data-testid="conversation-header"] span[title]'
      );
      if (!headerSpan) {
        return {
          success: false,
          error: 'No chat open. Open a group chat first.',
        };
      }

      const titleStr = (headerSpan.getAttribute('title') || '').trim();
      if (!titleStr) {
        return { success: false, error: 'Could not read member data.' };
      }

      updateStatus('Parsing members...');
      const groupName = getGroupName();
      const members = parseMembersFromTitle(titleStr);

      if (members.length === 0) {
        return { success: false, error: 'No members found.' };
      }

      updateStatus('Enriching from panel...');
      enrichFromDrawer(members);

      updateStatus(`Found ${members.length} members in "${groupName}"`);

      return {
        success: true,
        data: { groupName, members },
        count: members.length,
      };
    } catch (e) {
      return { success: false, error: e.message };
    } finally {
      isRunning = false;
    }
  }

  function updateStatus(msg) {
    console.log('WA Scraper:', msg);
    const el = document.getElementById('wa-scraper-status');
    if (el) el.textContent = msg;
  }

  function downloadCSV(filename, members, gName) {
    let csv = 'Name,Phone Number,Description,Group\n';
    members.forEach((m) => {
      const row = [
        `"${(m.name || '').replace(/"/g, '""')}"`,
        `"${(m.phone || '').replace(/"/g, '""')}"`,
        `"${(m.description || '').replace(/"/g, '""')}"`,
        `"${gName.replace(/"/g, '""')}"`,
      ];
      csv += row.join(',') + '\n';
    });

    const blob = new Blob(['\ufeff' + csv], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function createWidget() {
    if (document.getElementById('wa-scraper-widget')) return;

    const widget = document.createElement('div');
    widget.id = 'wa-scraper-widget';
    widget.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <strong style="font-size:15px;">YOYOWS</strong>
        <span id="wa-scraper-close" style="cursor:pointer;opacity:0.7;font-size:18px;">&times;</span>
      </div>
      <div id="wa-scraper-status" style="font-size:12px;opacity:0.9;margin-bottom:8px;min-height:18px;">
        Open a group chat, then click Scrape
      </div>
      <button id="wa-scraper-btn" style="
        width:100%; padding:8px 16px; border:none; border-radius:8px;
        background:#075e54; color:white; font-weight:600;
        cursor:pointer; font-size:13px;
      ">Scrape Members</button>
    `;

    Object.assign(widget.style, {
      position: 'fixed',
      bottom: '90px',
      right: '20px',
      zIndex: '99999',
      background: '#00a884',
      color: 'white',
      padding: '12px 18px',
      borderRadius: '12px',
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '14px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      cursor: 'move',
      width: '220px',
      userSelect: 'none',
    });

    document.body.appendChild(widget);

    document.getElementById('wa-scraper-close').onclick = () => widget.remove();
    document.getElementById('wa-scraper-btn').onclick = async () => {
      const btn = document.getElementById('wa-scraper-btn');
      btn.disabled = true;
      btn.textContent = 'Scraping...';
      const result = await scrape();
      btn.disabled = false;
      btn.textContent = 'Scrape Members';
      if (result.success) {
        const fn = `keshavkajalwa_${result.data.groupName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
        downloadCSV(fn, result.data.members, result.data.groupName);
        updateStatus(`Done! ${result.count} members → ${fn}`);
      } else {
        updateStatus('Error: ' + result.error);
      }
    };

    let mx, my;
    widget.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON' || e.target.id === 'wa-scraper-close')
        return;
      e.preventDefault();
      mx = e.clientX;
      my = e.clientY;
      document.onmousemove = (ev) => {
        ev.preventDefault();
        widget.style.top = widget.offsetTop - (my - ev.clientY) + 'px';
        widget.style.left = widget.offsetLeft - (mx - ev.clientX) + 'px';
        widget.style.bottom = 'auto';
        widget.style.right = 'auto';
        mx = ev.clientX;
        my = ev.clientY;
      };
      document.onmouseup = () => {
        document.onmousemove = null;
        document.onmouseup = null;
      };
    });
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scrape') {
      scrape().then(sendResponse);
      return true;
    }
    if (request.action === 'ping') {
      sendResponse({ alive: true });
      return true;
    }
  });

  let injected = false;
  const mo = new MutationObserver(() => {
    if (!injected && document.querySelector('#app')) {
      injected = true;
      setTimeout(createWidget, 2000);
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });

  if (document.querySelector('#app')) {
    setTimeout(createWidget, 2000);
  }
})();
