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
  { id: 'about',     label: 'About',            icon: 'folder', top: 80,  left: 80,  width: 560, menuBar: true },
  { id: 'research',  label: 'Research',          icon: 'folder', top: 100, left: 140, width: 520, menuBar: true, menuBarChildren: ['archive'] },
  { id: 'lab',       label: 'Lab',               icon: 'folder', top: 120, left: 200, width: 520, menuBar: true },
  { id: 'educatie',  label: 'Educatie',          icon: 'folder', top: 140, left: 260, width: 540, menuBar: true, menuBarChildren: ['workshops', 'talks', 'toolkit'] },
  { id: 'talks',     label: 'Talks',             icon: 'folder', top: 90,  left: 300, width: 580, desktop: true },
  { id: 'workshops', label: 'Workshops',         icon: 'folder', top: 110, left: 360, width: 620, desktop: true },
  { id: 'toolkit',   label: 'Dark Tech Toolkit', icon: 'disk',   top: 100, left: 420, width: 560, desktop: true },
  { id: 'archive',   label: 'Archive',           icon: 'folder', top: 130, left: 200, width: 480 },
  { id: 'contact',   label: 'Contact / Book us', icon: 'doc',    top: 110, left: 320, width: 560, desktop: true },
];

// ---------- WINDOW STATE ----------
let zCounter = 200;
const windowStack = [];

function isMobile() {
  return window.innerWidth <= 768;
}

function openWindow(name) {
  if (isMobile()) return;

  const win = document.getElementById('win-' + name);
  if (!win) return;

  closeAllDropdowns();

  if (win.classList.contains('visible')) {
    bringToFront(win);
    return;
  }

  const cfg = WINDOWS.find(w => w.id === name) || { top: 100, left: 120, width: 520 };
  win.style.top = cfg.top + 'px';
  win.style.left = cfg.left + 'px';
  if (cfg.width) win.style.width = cfg.width + 'px';

  win.classList.add('visible');
  bringToFront(win);

  if (!windowStack.includes(name)) {
    windowStack.push(name);
  }

  updateActiveStates();
}

function closeWindow(name) {
  const win = document.getElementById('win-' + name);
  if (!win) return;
  win.classList.remove('visible', 'active', 'inactive');

  const idx = windowStack.indexOf(name);
  if (idx > -1) windowStack.splice(idx, 1);

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
}

// ---------- BUILD DESKTOP ICONS ----------
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
}

document.addEventListener('click', e => {
  if (!e.target.closest('#menu-bar')) {
    closeAllDropdowns();
  }
});

// ---------- CLICK ON WINDOW TO FOCUS ----------
document.addEventListener('mousedown', e => {
  const win = e.target.closest('.window');
  if (win && win.classList.contains('visible')) {
    bringToFront(win);
    updateActiveStates();
  }
});

// ---------- TALK CARD TOGGLE ----------
function toggleCard(card) {
  card.classList.toggle('open');
}

document.addEventListener('click', e => {
  if (e.target.classList.contains('win-cta') || e.target.tagName === 'BUTTON') {
    e.stopPropagation();
  }
});

// ---------- CONTACT FORM ----------
function handleFormSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const success = document.getElementById('form-success');
  form.style.display = 'none';
  if (success) success.classList.remove('hidden');
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

// ---------- KEYBOARD SHORTCUTS ----------
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeAllDropdowns();
});

// ---------- INIT ----------
window.addEventListener('DOMContentLoaded', async () => {
  buildDesktopIcons();
  buildMenuBarItems();
  await loadAllWindowContent();
  makeDraggable();
  handleMobileLayout();

  if (!isMobile()) {
    setTimeout(() => openWindow('about'), 300);
  }
});

window.addEventListener('resize', () => {
  if (isMobile()) handleMobileLayout();
});
