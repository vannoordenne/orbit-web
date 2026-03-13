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

// ---------- WINDOW STATE ----------
let zCounter = 200;
const windowStack = [];
const windowOffsets = {
  about:     { top: 80,  left: 80  },
  research:  { top: 100, left: 140 },
  lab:       { top: 120, left: 200 },
  educatie:  { top: 140, left: 260 },
  talks:     { top: 90,  left: 300 },
  workshops: { top: 110, left: 360 },
  toolkit:   { top: 100, left: 420 },
  archive:   { top: 130, left: 200 },
  contact:   { top: 110, left: 320 },
};

function isMobile() {
  return window.innerWidth <= 768;
}

function openWindow(name) {
  if (isMobile()) return; // Mobile handles via CSS

  const win = document.getElementById('win-' + name);
  if (!win) return;

  // Close apple menu if open
  closeAppleMenu();

  if (win.classList.contains('visible')) {
    // Already open — bring to front
    bringToFront(win);
    return;
  }

  // Position based on preset offset
  const offset = windowOffsets[name] || { top: 100, left: 120 };
  win.style.top = offset.top + 'px';
  win.style.left = offset.left + 'px';

  win.classList.add('visible');
  bringToFront(win);

  // Add to stack
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
    // Restore
    win.style.top = win.dataset.origTop;
    win.style.left = win.dataset.origLeft;
    win.style.width = win.dataset.origWidth;
    win.style.height = win.dataset.origHeight || 'auto';
    win.dataset.zoomed = 'false';
  } else {
    // Save original
    win.dataset.origTop = win.style.top;
    win.dataset.origLeft = win.style.left;
    win.dataset.origWidth = win.style.width;
    win.dataset.origHeight = win.style.height;

    // Maximize
    win.style.top = '16px';
    win.style.left = '16px';
    win.style.width = (window.innerWidth - 100) + 'px';
    win.style.height = (window.innerHeight - 50) + 'px';
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

  // Find highest z-index
  let maxZ = 0;
  let topWin = null;
  allWindows.forEach(w => {
    const z = parseInt(w.style.zIndex || 0);
    if (z > maxZ) {
      maxZ = z;
      topWin = w;
    }
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

      // Keep within desktop bounds
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

// ---------- CLICK ON WINDOW TO FOCUS ----------
document.addEventListener('mousedown', e => {
  const win = e.target.closest('.window');
  if (win && win.classList.contains('visible')) {
    bringToFront(win);
    updateActiveStates();
  }
});

// ---------- APPLE MENU ----------
const appleMenuTrigger = document.getElementById('apple-menu-trigger');
const appleDropdown = document.getElementById('apple-dropdown');

function closeAppleMenu() {
  appleDropdown.classList.add('hidden');
}

appleMenuTrigger.addEventListener('click', e => {
  e.stopPropagation();
  appleDropdown.classList.toggle('hidden');
});

document.addEventListener('click', e => {
  if (!appleDropdown.contains(e.target) && e.target !== appleMenuTrigger) {
    closeAppleMenu();
  }
});

// ---------- MENU BAR ITEMS (stub) ----------
document.querySelectorAll('.menu-item').forEach(item => {
  item.addEventListener('click', () => {
    // placeholder — no dropdown logic for file/edit/view/special
  });
});

// ---------- TALK CARD TOGGLE ----------
function toggleCard(card) {
  // Don't toggle if clicking a button inside
  card.classList.toggle('open');
}

// Prevent button clicks from toggling card
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
document.querySelectorAll('.desktop-icon').forEach(icon => {
  icon.addEventListener('click', e => {
    document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
    icon.classList.add('selected');
    e.stopPropagation();
  });
});

document.getElementById('desktop').addEventListener('click', () => {
  document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
});

// ---------- MOBILE: SHOW ALL WINDOWS STACKED ----------
function handleMobileLayout() {
  if (isMobile()) {
    // Show all windows stacked on mobile
    document.querySelectorAll('.window').forEach(win => {
      win.classList.add('visible');
      win.style.top = '';
      win.style.left = '';
      win.style.width = '';
      win.style.height = '';
      win.style.zIndex = '';
    });
    // Hide home splash on mobile (it's redundant)
    const splash = document.getElementById('home-splash');
    if (splash) splash.style.display = 'none';
  }
}

// ---------- KEYBOARD SHORTCUTS ----------
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeAppleMenu();
  }
});

// ---------- INIT ----------
window.addEventListener('DOMContentLoaded', () => {
  makeDraggable();
  handleMobileLayout();

  // On desktop: open About window by default after a short delay
  if (!isMobile()) {
    setTimeout(() => {
      openWindow('about');
    }, 300);
  }
});

window.addEventListener('resize', () => {
  if (isMobile()) {
    handleMobileLayout();
  }
});
