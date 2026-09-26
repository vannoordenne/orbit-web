/* ============================================
   or.bit — Desktop Interface Logic
   ============================================ */

'use strict';

// ---------- CLOCK ----------
function updateClock() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  const el = document.getElementById('clock');
  if (el) el.textContent = h + ':' + m;
}
updateClock();
setInterval(updateClock, 10000);

// ---------- WINDOW CONFIG ----------
// To add a new window:
//   1. Add an entry here
//   2. Add a <div class="window" id="win-{id}"> in index.html
//   3. Add content/{id}.html
//
// menuBar: true       → clickable item in the top menu bar
// menuBarChildren     → dropdown entries: window id string, or { label, url } for external links
// desktop: true       → icon on the desktop
// appleMenu: true     → appears in the ⌘ apple dropdown
const WINDOWS = [
  { id: 'about',     label: 'About',            icon: 'folder', top: 64,  left: 180, width: 560, desktop: true },
  { id: 'founders',  label: 'Meet the founders', icon: 'folder', top: 105, left: 250, width: 680 },
  { id: 'research',  label: 'Research',          icon: 'folder', top: 78,  left: 360, width: 560, menuBar: true, desktop: true, menuBarChildren: [
    'dark-tech',
    'archive',
  ]},
  { id: 'lab',       label: 'Lab',               icon: 'folder', top: 155, left: 500, width: 520, menuBar: true, desktop: true },
  { id: 'educatie',  label: 'Education',          icon: 'folder', top: 100, left: 440, width: 540, menuBar: true, desktop: true, menuBarChildren: [
    { label: 'Dark Tech Method', url: 'https://darktechmethod.com' },
    'talks',
    'workshops',
    'speculation',
    'toolkit',
  ]},
  { id: 'dark-tech', label: 'Dark Tech',         icon: 'folder', top: 100, left: 400, width: 560 },
  { id: 'talks',     label: 'Talks',             icon: 'folder', top: 90,  left: 320, width: 580 },
  { id: 'workshops', label: 'Workshops',         icon: 'folder', top: 165, left: 240, width: 620 },
  { id: 'speculation', label: 'The Speculation Game', desktopLabel: 'Speculation Game', icon: 'cards', top: 70, left: 520, width: 560 },
  { id: 'toolkit',   label: 'Dark Tech Toolkit', icon: 'toolbox', top: 185, left: 300, width: 560 },
  { id: 'archive',   label: 'Archive',           icon: 'folder', top: 200, left: 200, width: 480 },
  { id: 'contact',   label: 'Contact',           icon: 'mail',   top: 125, left: 560, width: 560, desktop: true },
];

const MOBILE_NAV_ORDER = [
  'about', 'research', 'dark-tech', 'lab', 'educatie',
  'talks', 'workshops', 'speculation', 'toolkit',
  'archive', 'contact',
];

// ---------- WINDOW STATE ----------
let zCounter = 200;
const windowStack = [];

function isMobile() {
  return window.innerWidth <= 768;
}

function positionFoundersWindow(win) {
  if (isMobile()) return;
  const aboutWin = document.getElementById('win-about');
  if (!aboutWin || !aboutWin.classList.contains('visible')) return;
  const aboutTop = parseInt(aboutWin.style.top, 10) || 80;
  const aboutLeft = parseInt(aboutWin.style.left, 10) || 80;
  win.style.top = (aboutTop + 36) + 'px';
  win.style.left = (aboutLeft + 48) + 'px';
}

function openWindow(name, options = {}) {
  const win = document.getElementById('win-' + name);
  if (!win) return;

  closeAllDropdowns();

  if (isMobile()) {
    closeMobileNav();
    win.classList.remove('mobile-collapsed', 'mobile-hidden');
    scheduleOpenFirstTalkCard(name);
    if (options.card) scheduleOpenTalkCard(name, options.card);
    setTimeout(() => win.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    if (options.updateUrl !== false) syncDeepLink(name, options.card);
    return;
  }

  if (win.classList.contains('visible')) {
    bringToFront(win);
    if (name === 'founders') positionFoundersWindow(win);
    if (options.card) scheduleOpenTalkCard(name, options.card);
    if (options.updateUrl !== false) syncDeepLink(name, options.card);
    return;
  }

  const cfg = WINDOWS.find(w => w.id === name) || { top: 100, left: 120, width: 520 };
  win.style.top = cfg.top + 'px';
  win.style.left = cfg.left + 'px';
  if (cfg.width) win.style.width = cfg.width + 'px';
  win.style.maxHeight = (window.innerHeight - cfg.top - 32) + 'px';

  win.classList.add('visible');
  bringToFront(win);

  if (!windowStack.includes(name)) {
    windowStack.push(name);
  }

  updateActiveStates();
  scheduleOpenFirstTalkCard(name);
  if (options.card) scheduleOpenTalkCard(name, options.card);
  if (options.updateUrl !== false) syncDeepLink(name, options.card);

  if (name === 'founders') positionFoundersWindow(win);
}

function closeWindow(name) {
  const win = document.getElementById('win-' + name);
  if (!win) return;

  if (isMobile()) {
    win.classList.toggle('mobile-collapsed');
    return;
  }

  win.classList.remove('visible', 'active', 'inactive');

  const idx = windowStack.indexOf(name);
  if (idx > -1) windowStack.splice(idx, 1);

  updateActiveStates();
}

function collapseAllWindows() {
  closeAllDropdowns();
  closeMobileNav();

  if (isMobile()) {
    document.querySelectorAll('.window').forEach(win => {
      win.classList.add('mobile-collapsed');
    });
    return;
  }

  document.querySelectorAll('.window.visible').forEach(win => {
    win.classList.remove('visible', 'active', 'inactive');
    if (win.dataset.zoomed === 'true') {
      win.style.top = win.dataset.origTop || '';
      win.style.left = win.dataset.origLeft || '';
      win.style.width = win.dataset.origWidth || '';
      win.style.height = win.dataset.origHeight || 'auto';
      win.dataset.zoomed = 'false';
    }
  });

  windowStack.length = 0;
  updateActiveStates();
}

function zoomWindow(name) {
  const win = document.getElementById('win-' + name);
  if (!win) return;

  if (win.dataset.zoomed === 'true') {
    win.style.top = win.dataset.origTop;
    win.style.left = win.dataset.origLeft;
    win.style.width = win.dataset.origWidth;
    win.style.height = win.dataset.origHeight || 'auto';
    win.dataset.zoomed = 'false';
  } else {
    win.dataset.origTop = win.style.top;
    win.dataset.origLeft = win.style.left;
    win.dataset.origWidth = win.style.width;
    win.dataset.origHeight = win.style.height;

    win.style.top = '20px';
    win.style.left = '0px';
    win.style.width = window.innerWidth + 'px';
    win.style.height = (window.innerHeight - 20) + 'px';
    win.dataset.zoomed = 'true';
  }
}

function bringToFront(win) {
  zCounter++;
  win.style.zIndex = zCounter;
  updateActiveStates();
}

function updateActiveStates() {
  const allWindows = document.querySelectorAll('.window.visible');
  if (allWindows.length === 0) return;

  let maxZ = 0;
  let topWin = null;
  allWindows.forEach(w => {
    const z = parseInt(w.style.zIndex || 0);
    if (z > maxZ) { maxZ = z; topWin = w; }
  });

  allWindows.forEach(w => {
    if (w === topWin) {
      w.classList.add('active');
      w.classList.remove('inactive');
    } else {
      w.classList.remove('active');
      w.classList.add('inactive');
    }
  });
}

// ---------- DRAGGABLE WINDOWS ----------
function makeDraggable() {
  document.querySelectorAll('.title-bar').forEach(bar => {
    let isDragging = false;
    let startX, startY, winStartX, winStartY;

    // Mobile: tap title bar to toggle collapse
    bar.addEventListener('click', e => {
      if (!isMobile()) return;
      if (e.target.classList.contains('win-btn')) return;
      const win = bar.closest('.window');
      if (!win) return;
      win.classList.toggle('mobile-collapsed');
    });

    bar.addEventListener('mousedown', e => {
      if (isMobile()) return;
      if (e.target.classList.contains('win-btn')) return;

      const win = bar.closest('.window');
      if (!win) return;

      bringToFront(win);
      updateActiveStates();

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      winStartX = parseInt(win.style.left) || 0;
      winStartY = parseInt(win.style.top) || 0;

      e.preventDefault();
    });

    document.addEventListener('mousemove', e => {
      if (!isDragging) return;
      const win = bar.closest('.window');
      if (!win) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      let newLeft = winStartX + dx;
      let newTop = winStartY + dy;

      const minTop = 4;
      const maxTop = window.innerHeight - 40;
      const maxLeft = window.innerWidth - 60;

      newTop = Math.max(minTop, Math.min(maxTop, newTop));
      newLeft = Math.max(-win.offsetWidth + 80, Math.min(maxLeft, newLeft));

      win.style.left = newLeft + 'px';
      win.style.top = newTop + 'px';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  });
}

// ---------- LOAD WINDOW CONTENT ----------
async function loadAllWindowContent() {
  await Promise.all(WINDOWS.map(w =>
    fetch(`/content/${w.id}.html`)
      .then(r => r.text())
      .then(html => {
        const scroll = document.querySelector(`#win-${w.id} .window-scroll`);
        if (scroll) scroll.innerHTML = html;
      })
      .catch(() => {})
  ));
  initTalkCards();
}

// ---------- BUILD DESKTOP ICONS ----------
const DESKTOP_ICON_GAP = 20;
const DESKTOP_ICON_MARGIN = 18;
const DESKTOP_ICON_WIDTH = 88;

function initDesktopIconPositions(force = false) {
  const icons = document.querySelectorAll('.desktop-grid .desktop-icon');
  const baseLeft = window.innerWidth - DESKTOP_ICON_MARGIN - DESKTOP_ICON_WIDTH;
  let y = DESKTOP_ICON_MARGIN;

  icons.forEach((icon) => {
    if (force || !icon.style.left) {
      icon.style.left = baseLeft + 'px';
      icon.style.top = y + 'px';
    }
    y += icon.offsetHeight + DESKTOP_ICON_GAP;
  });
}

function resetDesktopIconPositions() {
  document.querySelectorAll('.desktop-grid .desktop-icon').forEach(icon => {
    icon.style.left = '';
    icon.style.top = '';
    icon.classList.remove('selected');
  });
  initDesktopIconPositions(true);
  closeDesktopContextMenu();
}

function closeDesktopContextMenu() {
  const menu = document.getElementById('desktop-context-menu');
  if (menu) menu.classList.add('hidden');
}

function initDesktopContextMenu() {
  if (isMobile()) return;

  let menu = document.getElementById('desktop-context-menu');
  if (!menu) {
    menu = document.createElement('div');
    menu.id = 'desktop-context-menu';
    menu.className = 'desktop-context-menu hidden';
    menu.innerHTML = `
      <div class="dropdown-item" data-action="reset-icons">Reset all folders</div>
      <div class="dropdown-divider"></div>
      <div class="dropdown-item" data-action="collapse-windows">Collapse all windows</div>
    `;
    document.body.appendChild(menu);

    menu.addEventListener('click', e => {
      const item = e.target.closest('[data-action]');
      if (!item) return;
      if (item.dataset.action === 'reset-icons') resetDesktopIconPositions();
      if (item.dataset.action === 'collapse-windows') collapseAllWindows();
    });
  }

  document.getElementById('desktop').addEventListener('contextmenu', e => {
    if (isMobile()) return;
    e.preventDefault();
    closeAllDropdowns();

    menu.classList.remove('hidden');
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';

    requestAnimationFrame(() => {
      const rect = menu.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        menu.style.left = (window.innerWidth - rect.width - 8) + 'px';
      }
      if (rect.bottom > window.innerHeight) {
        menu.style.top = (window.innerHeight - rect.height - 8) + 'px';
      }
    });
  });
}

function makeDesktopIconsDraggable() {
  if (isMobile()) return;

  document.querySelectorAll('.desktop-icon').forEach(icon => {
    icon.addEventListener('mousedown', e => {
      if (e.button !== 0) return;

      let isDragging = false;
      const startX = e.clientX;
      const startY = e.clientY;
      const iconStartX = parseInt(icon.style.left, 10) || 0;
      const iconStartY = parseInt(icon.style.top, 10) || 0;

      document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
      icon.classList.add('selected', 'dragging');

      function onMouseMove(ev) {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;

        if (!isDragging && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
        isDragging = true;

        let newLeft = iconStartX + dx;
        let newTop = iconStartY + dy;

        const minTop = 8;
        const maxTop = window.innerHeight - icon.offsetHeight - 8;
        const maxLeft = window.innerWidth - icon.offsetWidth - 8;

        newTop = Math.max(minTop, Math.min(maxTop, newTop));
        newLeft = Math.max(8, Math.min(maxLeft, newLeft));

        icon.style.left = newLeft + 'px';
        icon.style.top = newTop + 'px';
      }

      function onMouseUp() {
        icon.classList.remove('dragging');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      e.preventDefault();
    });
  });
}

function buildDesktopIcons() {
  const grid = document.querySelector('.desktop-grid');
  const trash = document.getElementById('trash-icon');
  WINDOWS.filter(w => w.desktop).forEach(w => {
    const div = document.createElement('div');
    div.className = 'desktop-icon';
    div.setAttribute('ondblclick', `openWindow('${w.id}')`);
    div.innerHTML = `<div class="icon-img icon-${w.icon}"></div><span class="icon-label">${w.desktopLabel || w.label}</span>`;
    grid.insertBefore(div, trash);
  });
}

// ---------- BUILD MENU BAR ITEMS ----------
function buildMenuBarItems() {
  const container = document.getElementById('menu-items');
  WINDOWS.filter(w => w.menuBar).forEach(w => {
    const span = document.createElement('span');
    span.className = 'menu-item';
    span.textContent = w.label;

    if (w.menuBarChildren && w.menuBarChildren.length > 0) {
      // Build dropdown
      const dropdown = document.createElement('div');
      dropdown.className = 'dropdown hidden';
      dropdown.id = `dropdown-${w.id}`;

      const selfItem = document.createElement('div');
      selfItem.className = 'dropdown-item';
      selfItem.textContent = w.label;
      selfItem.onclick = () => { closeAllDropdowns(); openWindow(w.id); };
      dropdown.appendChild(selfItem);

      const divider = document.createElement('div');
      divider.className = 'dropdown-divider';
      dropdown.appendChild(divider);

      w.menuBarChildren.forEach(childRef => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';

        if (typeof childRef === 'object' && childRef.url) {
          item.textContent = childRef.label;
          item.onclick = () => {
            closeAllDropdowns();
            window.open(childRef.url, '_blank', 'noopener,noreferrer');
          };
        } else {
          const childId = typeof childRef === 'string' ? childRef : childRef.id;
          const child = WINDOWS.find(x => x.id === childId);
          if (!child) return;
          item.textContent = child.label;
          item.onclick = () => openWindow(child.id);
        }

        dropdown.appendChild(item);
      });

      document.body.appendChild(dropdown);

      span.addEventListener('click', e => {
        e.stopPropagation();
        const isOpen = !dropdown.classList.contains('hidden');
        closeAllDropdowns();
        if (!isOpen) {
          const rect = span.getBoundingClientRect();
          dropdown.style.left = rect.left + 'px';
          dropdown.classList.remove('hidden');
          span.classList.add('menu-item-open');
        }
      });
    } else {
      span.addEventListener('click', () => openWindow(w.id));
    }

    container.appendChild(span);
  });
}

// ---------- DROPDOWN MANAGEMENT ----------
function closeAllDropdowns() {
  document.querySelectorAll('.dropdown').forEach(d => d.classList.add('hidden'));
  document.querySelectorAll('.menu-item-open').forEach(el => el.classList.remove('menu-item-open'));
  closeDesktopContextMenu();
}

document.addEventListener('click', e => {
  if (!e.target.closest('#menu-bar') && !e.target.closest('#mobile-nav')) {
    closeAllDropdowns();
    closeMobileNav();
  }
  if (!e.target.closest('#desktop-context-menu')) {
    closeDesktopContextMenu();
  }
});

// ---------- MOBILE NAV ----------
function toggleMobileNav() {
  const nav = document.getElementById('mobile-nav');
  if (!nav) return;
  nav.classList.toggle('hidden');
}

function closeMobileNav() {
  const nav = document.getElementById('mobile-nav');
  if (nav) nav.classList.add('hidden');
}

function buildMobileNav() {
  const nav = document.getElementById('mobile-nav');
  if (!nav) return;

  MOBILE_NAV_ORDER.forEach(id => {
    const w = WINDOWS.find(x => x.id === id);
    if (!w) return;
    const item = document.createElement('div');
    item.className = 'mobile-nav-item';
    item.textContent = w.label;
    item.addEventListener('click', () => openWindow(w.id));
    nav.appendChild(item);
  });

  const methodItem = document.createElement('a');
  methodItem.className = 'mobile-nav-item';
  methodItem.href = 'https://darktechmethod.com';
  methodItem.target = '_blank';
  methodItem.rel = 'noopener noreferrer';
  methodItem.textContent = 'Dark Tech Method';
  methodItem.addEventListener('click', () => closeMobileNav());
  nav.appendChild(methodItem);
}

// ---------- CLICK ON WINDOW TO FOCUS ----------
document.addEventListener('mousedown', e => {
  const win = e.target.closest('.window');
  if (win && win.classList.contains('visible')) {
    bringToFront(win);
    updateActiveStates();
  }
});

// ---------- TALK CARD TOGGLE ----------
let suppressCardToggle = false;

function toggleCard(el, event) {
  if (suppressCardToggle) return;
  if (event && event.target.closest('a, button, [data-open-window]')) return;
  const card = el.classList.contains('talk-card') ? el : el.closest('.talk-card');
  if (!card) return;
  card.classList.toggle('open');
}

function openFirstTalkCard(windowId) {
  const scroll = document.querySelector(`#win-${windowId} .window-scroll`);
  if (!scroll) return;
  const cards = scroll.querySelectorAll(':scope > .talk-card');
  if (cards.length === 0) return;
  cards[0].classList.add('open');
}

function scheduleOpenFirstTalkCard(windowId) {
  openFirstTalkCard(windowId);
  suppressCardToggle = true;
  setTimeout(() => {
    openFirstTalkCard(windowId);
    suppressCardToggle = false;
  }, 50);
}

function openTalkCard(windowId, cardId) {
  const scroll = document.querySelector(`#win-${windowId} .window-scroll`);
  if (!scroll || !cardId) return;
  const card = scroll.querySelector(`[data-card-id="${cardId}"]`);
  if (!card) return;
  scroll.querySelectorAll(':scope > .talk-card').forEach(c => c.classList.remove('open'));
  card.classList.add('open');
}

function scheduleOpenTalkCard(windowId, cardId) {
  openTalkCard(windowId, cardId);
  suppressCardToggle = true;
  setTimeout(() => {
    openTalkCard(windowId, cardId);
    suppressCardToggle = false;
  }, 60);
}

// ---------- DEEP LINKS (path / ?open= / #) ----------
// Examples:
//   /speculation-game
//   /designing-dark-tech
//   ?open=speculation
//   #toolkit
const DEEP_LINK_ALIASES = {
  education: { id: 'educatie' },
  speculation: { id: 'speculation' },
  'speculation-game': { id: 'speculation' },
  toolkit: { id: 'toolkit' },
  'dark-tech-toolkit': { id: 'toolkit' },
  'dark-tech': { id: 'dark-tech' },
  'dark-tech-method': { id: 'dark-tech' },
  'designing-dark-tech': { id: 'workshops', card: 'designing-dark-tech' },
};

// Preferred pretty path when syncing the URL
const DEEP_LINK_PATHS = {
  about: 'about',
  founders: 'founders',
  research: 'research',
  'dark-tech': 'dark-tech',
  lab: 'lab',
  educatie: 'education',
  talks: 'talks',
  workshops: 'workshops',
  speculation: 'speculation-game',
  toolkit: 'dark-tech-toolkit',
  archive: 'archive',
  contact: 'contact',
};

const RESERVED_PATH_SEGMENTS = new Set([
  '', 'index.html', 'style.css', 'script.js', 'content', 'images',
  'marise', 'jolijn', 'print', 'card-marise.html', 'card-jolijn.html',
]);

function resolveDeepLinkTarget(raw) {
  if (!raw) return null;
  const key = String(raw).trim().toLowerCase().replace(/^\/+|\/+$/g, '');
  if (!key || RESERVED_PATH_SEGMENTS.has(key)) return null;
  if (DEEP_LINK_ALIASES[key]) return { ...DEEP_LINK_ALIASES[key] };
  if (WINDOWS.some(w => w.id === key)) return { id: key };
  return null;
}

function getDeepLinkFromLocation() {
  const params = new URLSearchParams(window.location.search);
  const openParam = params.get('open');
  const cardParam = params.get('card');
  let target = resolveDeepLinkTarget(openParam);

  if (!target) {
    const path = window.location.pathname.replace(/\/+$/, '');
    const segment = path.split('/').filter(Boolean).pop() || '';
    target = resolveDeepLinkTarget(segment);
  }

  if (!target && window.location.hash) {
    const hash = window.location.hash.replace(/^#\/?/, '').split('&')[0];
    target = resolveDeepLinkTarget(hash);
  }

  if (target && cardParam) target.card = cardParam;
  return target;
}

function syncDeepLink(windowId, cardId) {
  let slug = null;

  if (cardId) {
    const aliasEntry = Object.entries(DEEP_LINK_ALIASES).find(([, v]) => (
      v.id === windowId && v.card === cardId
    ));
    slug = aliasEntry ? aliasEntry[0] : null;
  }

  if (!slug) slug = DEEP_LINK_PATHS[windowId] || windowId;

  const usePrettyPath = !['localhost', '127.0.0.1'].includes(window.location.hostname);
  const url = new URL(window.location.href);

  if (usePrettyPath) {
    url.pathname = '/' + slug;
    url.search = '';
    url.hash = '';
  } else {
    url.pathname = '/';
    url.searchParams.set('open', slug);
    url.searchParams.delete('card');
    url.hash = '';
  }

  const next = url.pathname + url.search + url.hash;
  const current = window.location.pathname + window.location.search + window.location.hash;
  if (next !== current) {
    history.replaceState({ open: windowId, card: cardId || null }, '', next);
  }
}

function applyDeepLink(target) {
  if (!target || !target.id) return false;
  if (!document.getElementById('win-' + target.id)) return false;
  openWindow(target.id, { card: target.card, updateUrl: true });
  return true;
}

function initTalkCards() {
  document.querySelectorAll('.window-scroll').forEach(scroll => {
    const first = scroll.querySelector(':scope > .talk-card');
    if (first) first.classList.add('open');
  });
}

document.addEventListener('click', e => {
  const openTrigger = e.target.closest('[data-open-window]');
  if (openTrigger) {
    e.preventDefault();
    e.stopPropagation();
    openWindow(openTrigger.dataset.openWindow, {
      card: openTrigger.dataset.openCard || undefined,
    });
    return;
  }

  if (e.target.classList.contains('win-cta') || e.target.tagName === 'BUTTON') {
    e.stopPropagation();
  }
});

// ---------- CONTACT FORM (Web3Forms) ----------
const CONTACT_FORM_ENDPOINT = 'https://api.web3forms.com/submit';

function hideFormNotices() {
  ['form-success', 'form-error'].forEach(id => {
    document.getElementById(id)?.classList.add('hidden');
  });
}

function resetContactForm() {
  const form = document.getElementById('contact-form');
  const success = document.getElementById('form-success');
  const error = document.getElementById('form-error');
  if (form) {
    form.reset();
    form.style.display = '';
  }
  if (success) success.classList.add('hidden');
  if (error) error.classList.add('hidden');
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('.form-submit');
  const success = document.getElementById('form-success');
  const error = document.getElementById('form-error');
  const errorText = document.getElementById('form-error-text');
  const accessKey = form.querySelector('[name="access_key"]')?.value?.trim();

  if (form.querySelector('[name="botcheck"]')?.checked) return;

  hideFormNotices();

  if (!accessKey || accessKey === 'YOUR_WEB3FORMS_ACCESS_KEY') {
    if (error && errorText) {
      errorText.textContent = 'Form not configured yet. Email hello@or-bit.xyz directly.';
      error.classList.remove('hidden');
    }
    return;
  }

  const originalLabel = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending…';

  try {
    const payload = Object.fromEntries(new FormData(form));
    const response = await fetch(CONTACT_FORM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    const message = typeof data.message === 'string' ? data.message : '';

    if (response.ok && data.success) {
      form.reset();
      form.style.display = 'none';
      if (success) success.classList.remove('hidden');
      return;
    }

    if (error && errorText) {
      errorText.textContent = message || 'Something went wrong. Please try again or email hello@or-bit.xyz directly.';
      error.classList.remove('hidden');
    }
  } catch {
    if (error) error.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel;
  }
}

// ---------- DESKTOP ICON SELECTION ----------
document.querySelector('.desktop-grid').addEventListener('click', e => {
  const icon = e.target.closest('.desktop-icon');
  if (!icon) return;
  document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
  icon.classList.add('selected');
  e.stopPropagation();
});

document.getElementById('desktop').addEventListener('click', () => {
  document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
});

// ---------- MOBILE: SHOW ALL WINDOWS STACKED ----------
function handleMobileLayout() {
  if (isMobile()) {
    document.querySelectorAll('.window').forEach(win => {
      win.classList.add('visible');
      win.style.top = '';
      win.style.left = '';
      win.style.width = '';
      win.style.height = '';
      win.style.zIndex = '';
    });
    const splash = document.getElementById('home-splash');
    if (splash) splash.style.display = 'none';
  }
}

// ---------- CURSOR ORBIT ----------
function initCursorOrbit() {
  if (window.innerWidth <= 768) return;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99998;';
  document.body.appendChild(canvas);

  document.body.style.cursor = 'none';

  const ctx = canvas.getContext('2d');

  let mouseX = -999, mouseY = -999;
  let angle = 0;

  const A     = 38;
  const B     = 11;
  const TILT  = -0.3;
  const COUNT = 36;
  const SPEED = 0.026;

  const cosT = Math.cos(TILT);
  const sinT = Math.sin(TILT);

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  document.addEventListener('mouseleave', () => {
    mouseX = -999;
    mouseY = -999;
  });

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (mouseX > 0 && mouseY > 20) {
      angle += SPEED;

      for (let i = 0; i < COUNT; i++) {
        const a     = angle + (i * Math.PI * 2 / COUNT);
        const depth = Math.sin(a);
        if (depth >= 0) continue;
        const ex    = Math.cos(a) * A;
        const ey    = Math.sin(a) * B;
        const x     = mouseX + ex * cosT - ey * sinT;
        const y     = mouseY + ex * sinT + ey * cosT;
        const alpha = 0.15 + ((depth + 1) / 2) * 0.85;
        ctx.fillStyle = `rgba(0,0,0,${alpha.toFixed(2)})`;
        ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      }

      ctx.fillStyle = '#000';
      [
        [0,0],
        [0,1],[1,1],
        [0,2],[2,2],
        [0,3],[3,3],
        [0,4],[1,4],[2,4],[3,4],
      ].forEach(([dx, dy]) => ctx.fillRect(mouseX + dx, mouseY + dy, 1, 1));

      for (let i = 0; i < COUNT; i++) {
        const a     = angle + (i * Math.PI * 2 / COUNT);
        const depth = Math.sin(a);
        if (depth < 0) continue;
        const ex    = Math.cos(a) * A;
        const ey    = Math.sin(a) * B;
        const x     = mouseX + ex * cosT - ey * sinT;
        const y     = mouseY + ex * sinT + ey * cosT;
        const alpha = 0.15 + ((depth + 1) / 2) * 0.85;
        ctx.fillStyle = `rgba(0,0,0,${alpha.toFixed(2)})`;
        ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
    }

    requestAnimationFrame(draw);
  }

  draw();
}

// ---------- KEYBOARD SHORTCUTS ----------
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeAllDropdowns();
});

// ---------- INIT ----------
window.addEventListener('DOMContentLoaded', async () => {
  buildDesktopIcons();
  initDesktopIconPositions();
  makeDesktopIconsDraggable();
  initDesktopContextMenu();
  buildMenuBarItems();
  buildMobileNav();
  await loadAllWindowContent();
  makeDraggable();
  handleMobileLayout();

  const deepLink = getDeepLinkFromLocation();
  if (deepLink) {
    setTimeout(() => applyDeepLink(deepLink), 300);
  } else if (!isMobile()) {
    setTimeout(() => openWindow('about', { updateUrl: false }), 300);
  }

  initCursorOrbit();
});

window.addEventListener('popstate', () => {
  const deepLink = getDeepLinkFromLocation();
  if (deepLink) applyDeepLink(deepLink);
});

window.addEventListener('hashchange', () => {
  const deepLink = getDeepLinkFromLocation();
  if (deepLink) applyDeepLink(deepLink);
});

window.addEventListener('resize', () => {
  if (isMobile()) handleMobileLayout();
});
