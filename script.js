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
// menuBarChildren     → sub-window IDs shown in the dropdown under this item
// desktop: true       → icon on the desktop
// appleMenu: true     → appears in the ⌘ apple dropdown
const WINDOWS = [
  { id: 'about',     label: 'About',            icon: 'folder', top: 80,  left: 80,  width: 560, menuBar: false },
  { id: 'founders',  label: 'Meet the founders', icon: 'folder', top: 100, left: 160, width: 680 },
  { id: 'research',  label: 'Research',          icon: 'folder', top: 100, left: 140, width: 520, menuBar: true, menuBarChildren: ['archive'] },
  { id: 'lab',       label: 'Lab',               icon: 'folder', top: 120, left: 200, width: 520, menuBar: true },
  { id: 'educatie',  label: 'Education',          icon: 'folder', top: 140, left: 260, width: 540, menuBar: true, menuBarChildren: ['talks', 'workshops', 'toolkit'] },
  { id: 'talks',     label: 'Talks',             icon: 'folder', top: 90,  left: 300, width: 580, desktop: true },
  { id: 'workshops', label: 'Workshops',         icon: 'folder', top: 110, left: 360, width: 620, desktop: true },
  { id: 'toolkit',   label: 'Dark Tech Toolkit', icon: 'toolbox', top: 100, left: 420, width: 560, desktop: true },
  { id: 'archive',   label: 'Archive',           icon: 'folder', top: 130, left: 200, width: 480 },
  { id: 'contact',   label: 'Contact / Book us', icon: 'doc',    top: 110, left: 320, width: 560, desktop: true },
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

function openWindow(name) {
  const win = document.getElementById('win-' + name);
  if (!win) return;

  closeAllDropdowns();

  if (isMobile()) {
    closeMobileNav();
    win.classList.remove('mobile-collapsed', 'mobile-hidden');
    scheduleOpenFirstTalkCard(name);
    setTimeout(() => win.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    return;
  }

  if (win.classList.contains('visible')) {
    bringToFront(win);
    if (name === 'founders') positionFoundersWindow(win);
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
    fetch(`content/${w.id}.html`)
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
const DESKTOP_ICON_MARGIN = 16;
const DESKTOP_ICON_WIDTH = 72;

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
    div.innerHTML = `<div class="icon-img icon-${w.icon}"></div><span class="icon-label">${w.label}</span>`;
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

      w.menuBarChildren.forEach(childId => {
        const child = WINDOWS.find(x => x.id === childId);
        if (!child) return;
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.textContent = child.label;
        item.onclick = () => openWindow(child.id);
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
  WINDOWS.forEach(w => {
    const item = document.createElement('div');
    item.className = 'mobile-nav-item';
    item.textContent = w.label;
    item.addEventListener('click', () => openWindow(w.id));
    nav.appendChild(item);
  });
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

function toggleCard(card) {
  if (suppressCardToggle) return;
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
    openWindow(openTrigger.dataset.openWindow);
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

  if (!isMobile()) {
    setTimeout(() => openWindow('about'), 300);
  }

  initCursorOrbit();
});

window.addEventListener('resize', () => {
  if (isMobile()) handleMobileLayout();
});
