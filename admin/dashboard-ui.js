/* ==========================================================================
   NNP CU Dashboard — UI enhancements
   --------------------------------------------------------------------------
   Purely presentational and additive. This file:
     • never imports or calls Firebase, never reads/writes the database
     • never edits dashboard.js, element IDs, links or data attributes
     • only observes the rendered DOM and adds extras (theme, palette, table
       sorting/paging/export, mobile nav, etc.)
   If this file fails to load, the dashboard keeps working exactly as before.
   Load it as a plain <script> (NOT type="module") in <head>.
   ========================================================================== */
(function () {
  'use strict';

  var THEME_KEY = 'nnpcu.theme';
  var SIDEBAR_KEY = 'nnpcu.sidebar';
  var DENSITY_KEY = 'nnpcu.density';
  var root = document.documentElement;

  /* ---------- safe storage ---------- */
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };

  /* ---------- theme (runs immediately to avoid a flash) ---------- */
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function resolveTheme() {
    var saved = store.get(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return mq && mq.matches ? 'dark' : 'light';
  }
  function applyTheme() {
    var t = resolveTheme();
    root.setAttribute('data-theme', t);
    root.setAttribute('data-bs-theme', t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#071a10' : '#0a4325');
  }
  function setTheme(t) { if (t) store.set(THEME_KEY, t); else store.del(THEME_KEY); applyTheme(); }
  function toggleTheme() { setTheme(resolveTheme() === 'dark' ? 'light' : 'dark'); }
  applyTheme();
  if (mq) {
    var onSys = function () { if (!store.get(THEME_KEY)) applyTheme(); };
    if (mq.addEventListener) mq.addEventListener('change', onSys); else if (mq.addListener) mq.addListener(onSys);
  }

  /* ---------- helpers ---------- */
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function mk(tag, cls, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    n.setAttribute('data-ui', '');
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var ICONS = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    chevron: '<path d="m15 6-6 6 6 6"/>',
    up: '<path d="m6 15 6-6 6 6"/>',
    download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
    rows: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    prev: '<path d="m15 6-6 6 6 6"/>',
    next: '<path d="m9 6 6 6-6 6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/>',
    bell: '<path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'
  };
  function svg(name) {
    return '<svg class="svg-i" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }

  /* ---------- tiny toast (reuses the existing #toastWrap container) ---------- */
  function uiToast(message) {
    var wrap = document.getElementById('toastWrap');
    if (!wrap) return;
    var n = document.createElement('div');
    n.className = 'toast-note';
    n.textContent = message;
    wrap.appendChild(n);
    setTimeout(function () { if (n.parentNode) n.remove(); }, 2600);
  }

  /* ---------- clicking helpers for the existing nav buttons ---------- */
  function navButtons() { return $$('#moduleNav .nav-item'); }
  function navLabel(b) {
    var spans = $$('span', b);
    var label = spans.length ? spans[spans.length - 1] : b;
    return (label.textContent || '').trim();
  }
  function goModule(m) {
    var b = $('#moduleNav .nav-item[data-module="' + m + '"]');
    if (b && !b.hidden) b.click();
  }

  /* ======================================================================
     Command palette
     ====================================================================== */
  var palette, paletteInput, paletteList, paletteItems = [], paletteIndex = 0, lastFocus = null;

  function buildCommands() {
    var cmds = [];
    navButtons().forEach(function (b) {
      if (b.hidden) return;
      var icon = $('.nav-icon', b);
      cmds.push({
        group: 'Go to', label: navLabel(b), hint: '', icon: icon ? icon.innerHTML : svg('home'),
        run: function () { b.click(); }
      });
    });
    cmds.push({ group: 'Actions', label: resolveTheme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme', hint: 'Theme', icon: svg(resolveTheme() === 'dark' ? 'sun' : 'moon'), run: toggleTheme });
    cmds.push({ group: 'Actions', label: 'Use system theme', hint: 'Theme', icon: svg('bolt'), run: function () { setTheme(null); } });
    cmds.push({ group: 'Actions', label: document.body.classList.contains('sidebar-collapsed') ? 'Expand sidebar' : 'Collapse sidebar', hint: 'Layout', icon: svg('chevron'), run: toggleSidebar });
    var pub = $('.site-link');
    if (pub) cmds.push({ group: 'Actions', label: 'View public website', hint: '', icon: svg('globe'), run: function () { pub.click(); } });
    var out = document.getElementById('logoutButton');
    if (out) cmds.push({ group: 'Actions', label: 'Sign out', hint: '', icon: svg('out'), run: function () { out.click(); } });
    return cmds;
  }

  function renderPalette(query) {
    var q = (query || '').trim().toLowerCase();
    var all = buildCommands();
    paletteItems = all.filter(function (c) { return !q || c.label.toLowerCase().indexOf(q) !== -1 || c.group.toLowerCase().indexOf(q) !== -1; });
    paletteIndex = 0;
    paletteList.innerHTML = '';
    if (!paletteItems.length) {
      var empty = document.createElement('li');
      empty.className = 'ui-palette-empty';
      empty.textContent = 'No matches for “' + query + '”';
      paletteList.appendChild(empty);
      return;
    }
    var lastGroup = '';
    paletteItems.forEach(function (c, i) {
      if (c.group !== lastGroup) {
        lastGroup = c.group;
        var g = document.createElement('li');
        g.className = 'ui-palette-group';
        g.setAttribute('role', 'presentation');
        g.textContent = c.group;
        paletteList.appendChild(g);
      }
      var li = document.createElement('li');
      li.className = 'ui-palette-item' + (i === 0 ? ' active' : '');
      li.setAttribute('role', 'option');
      li.dataset.index = String(i);
      li.innerHTML = '<svg class="svg-i" viewBox="0 0 24 24" aria-hidden="true">' + c.icon.replace(/^<svg[^>]*>|<\/svg>$/g, '') + '</svg><span></span><small></small>';
      li.querySelector('span').textContent = c.label;
      li.querySelector('small').textContent = c.hint;
      li.addEventListener('mousemove', function () { setActive(i, false); });
      li.addEventListener('click', function () { runCommand(i); });
      paletteList.appendChild(li);
    });
  }
  function setActive(i, scroll) {
    if (!paletteItems.length) return;
    paletteIndex = (i + paletteItems.length) % paletteItems.length;
    $$('.ui-palette-item', paletteList).forEach(function (el) {
      var on = Number(el.dataset.index) === paletteIndex;
      el.classList.toggle('active', on);
      if (on && scroll) el.scrollIntoView({ block: 'nearest' });
    });
  }
  function runCommand(i) {
    var c = paletteItems[i];
    closePalette();
    if (c) setTimeout(c.run, 30);
  }
  function openPalette() {
    if (!palette) return;
    lastFocus = document.activeElement;
    palette.hidden = false;
    paletteInput.value = '';
    renderPalette('');
    setTimeout(function () { paletteInput.focus(); }, 0);
  }
  function closePalette() {
    if (!palette || palette.hidden) return;
    palette.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function buildPalette() {
    palette = mk('div', 'ui-palette', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Quick navigation' });
    palette.hidden = true;
    palette.innerHTML =
      '<div class="ui-palette-box">' +
      '<div class="ui-palette-input">' + svg('search') + '<input type="text" autocomplete="off" spellcheck="false" placeholder="Jump to a section or run a command…" aria-label="Search sections and commands"><kbd>Esc</kbd></div>' +
      '<ul class="ui-palette-list" role="listbox"></ul>' +
      '<div class="ui-palette-foot"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> select</span><span><kbd>Esc</kbd> close</span></div>' +
      '</div>';
    document.body.appendChild(palette);
    paletteInput = $('input', palette);
    paletteList = $('.ui-palette-list', palette);
    paletteInput.addEventListener('input', function () { renderPalette(paletteInput.value); });
    palette.addEventListener('mousedown', function (e) { if (e.target === palette) closePalette(); });
    palette.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(paletteIndex + 1, true); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(paletteIndex - 1, true); }
      else if (e.key === 'Enter') { e.preventDefault(); runCommand(paletteIndex); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePalette(); }
      else if (e.key === 'Tab') { e.preventDefault(); }
    });
  }

  /* ======================================================================
     Sidebar collapse (desktop)
     ====================================================================== */
  function toggleSidebar() {
    var on = !document.body.classList.contains('sidebar-collapsed');
    document.body.classList.toggle('sidebar-collapsed', on);
    store.set(SIDEBAR_KEY, on ? 'collapsed' : 'open');
    var b = $('.ui-collapse');
    if (b) b.setAttribute('aria-label', on ? 'Expand sidebar' : 'Collapse sidebar');
  }

  /* ======================================================================
     Chrome: topbar buttons, collapse handle, bottom nav, banners
     ====================================================================== */
  var bottomNav;
  var BOTTOM = [['overview', 'Home', 'home'], ['announcements', 'News', 'bell'], ['events', 'Events', 'cal'], ['membership', 'People', 'users']];

  function buildChrome() {
    var right = $('.topbar-right');
    if (right) {
      var cmd = mk('button', 'ui-cmd-btn', { type: 'button', 'aria-label': 'Open quick search' });
      cmd.innerHTML = svg('search') + '<span>Search…</span><kbd>Ctrl K</kbd>';
      cmd.addEventListener('click', openPalette);
      var theme = mk('button', 'ui-iconbtn ui-theme-btn', { type: 'button', 'aria-label': 'Toggle light or dark theme', title: 'Toggle theme' });
      theme.innerHTML = '<span class="ui-moon">' + svg('moon') + '</span><span class="ui-sun">' + svg('sun') + '</span>';
      theme.addEventListener('click', toggleTheme);
      var firstChild = right.firstChild;
      right.insertBefore(cmd, firstChild);
      right.insertBefore(theme, firstChild);
    }

    var sidebar = document.getElementById('sidebar');
    if (sidebar) {
      var col = mk('button', 'ui-collapse', { type: 'button', 'aria-label': 'Collapse sidebar', title: 'Collapse / expand sidebar' });
      col.innerHTML = svg('chevron');
      col.addEventListener('click', toggleSidebar);
      sidebar.appendChild(col);
    }
    if (store.get(SIDEBAR_KEY) === 'collapsed') {
      document.body.classList.add('sidebar-collapsed');
      var cb = $('.ui-collapse');
      if (cb) cb.setAttribute('aria-label', 'Expand sidebar');
    }
    if (store.get(DENSITY_KEY) === 'compact') document.body.classList.add('ui-compact');

    // tooltips for the icon-only (collapsed) sidebar
    navButtons().forEach(function (b) { if (!b.title) b.title = navLabel(b); });

    // mobile bottom navigation
    bottomNav = mk('nav', 'ui-bottomnav', { 'aria-label': 'Primary' });
    BOTTOM.forEach(function (item) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.bn = item[0];
      btn.setAttribute('data-ui', '');
      btn.innerHTML = svg(item[2]) + '<span>' + item[1] + '</span>';
      btn.addEventListener('click', function () { goModule(item[0]); });
      bottomNav.appendChild(btn);
    });
    var more = document.createElement('button');
    more.type = 'button';
    more.setAttribute('data-ui', '');
    more.innerHTML = svg('menu') + '<span>More</span>';
    more.addEventListener('click', function () {
      var t = document.getElementById('menuToggle');
      if (t) t.click();
    });
    bottomNav.appendChild(more);
    document.body.appendChild(bottomNav);

    // offline banner
    var shell = $('.page-shell');
    var topbar = $('.topbar');
    var off = mk('div', 'ui-offline', { role: 'status' });
    off.textContent = 'You’re offline — changes will not sync until your connection returns.';
    off.hidden = navigator.onLine !== false;
    if (shell && topbar) topbar.insertAdjacentElement('afterend', off);
    window.addEventListener('offline', function () { off.hidden = false; });
    window.addEventListener('online', function () { off.hidden = true; uiToast('Back online'); });

    // back-to-top
    var top = mk('button', 'ui-top', { type: 'button', 'aria-label': 'Back to top' });
    top.innerHTML = svg('up');
    top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }); });
    document.body.appendChild(top);
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { top.classList.toggle('show', window.scrollY > 480); ticking = false; });
    }, { passive: true });

    document.body.classList.add('ui-ready');
  }

  function syncNav() {
    var title = document.getElementById('pageTitle');
    navButtons().forEach(function (b) {
      if (b.classList.contains('active')) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    if (bottomNav) {
      $$('button[data-bn]', bottomNav).forEach(function (btn) {
        var src = $('#moduleNav .nav-item[data-module="' + btn.dataset.bn + '"]');
        btn.hidden = !src || src.hidden;
        btn.classList.toggle('active', !!src && src.classList.contains('active'));
      });
    }
    if (title && title.textContent) {
      var t = title.textContent.trim() + ' · NNP CU';
      if (document.title !== t) document.title = t;
    }
  }

  /* ======================================================================
     Rendered-content enhancements (observer driven, all idempotent)
     ====================================================================== */
  var main, obs, scheduled = false;
  var lastModule = '';
  var tableState = { col: -1, dir: 1, page: 1, size: 10 };
  var lastStats = {};

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () { scheduled = false; try { enhance(); } catch (e) { /* never break the dashboard */ } });
  }

  function enhance() {
    if (!main) return;
    var title = (document.getElementById('pageTitle') || {}).textContent || '';
    if (title !== lastModule) {
      lastModule = title;
      tableState.col = -1; tableState.dir = 1; tableState.page = 1;
      main.classList.remove('ui-swap'); void main.offsetWidth; main.classList.add('ui-swap');
      window.scrollTo(0, 0);
    }
    syncNav();
    enhanceWelcome();
    enhanceStats();
    enhanceToolbar();
    enhanceTables();
    enhancePassword();
    $$('code', main).forEach(function (c) { if (!c.title) c.title = 'Click to copy'; });
    obs.takeRecords(); // ignore the mutations we just made ourselves
  }

  function greeting() {
    var h = new Date().getHours();
    return h < 5 ? 'Working late' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }

  function enhanceWelcome() {
    var w = $('.welcome', main);
    if (!w || $('.ui-welcome-meta', w)) return;
    var meta = mk('div', 'ui-welcome-meta');
    var date = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    var s1 = document.createElement('span'); s1.textContent = greeting() + ' · ' + date;
    var s2 = document.createElement('span'); s2.innerHTML = 'Press <kbd>Ctrl</kbd> <kbd>K</kbd> to jump anywhere';
    meta.appendChild(s1); meta.appendChild(s2);
    var actions = $('.welcome-actions', w);
    if (actions) w.insertBefore(meta, actions); else w.appendChild(meta);
  }

  function enhanceStats() {
    var cards = $$('.stat-card', main);
    cards.forEach(function (card) {
      var val = $('.value', card), lab = $('.label', card);
      if (!val || val.dataset.uiDone) return;
      val.dataset.uiDone = '1';
      var raw = (val.textContent || '').trim();
      if (!/^\d{1,9}$/.test(raw)) return;
      var key = lastModule + '|' + (lab ? lab.textContent : '');
      var target = parseInt(raw, 10);
      var from = Object.prototype.hasOwnProperty.call(lastStats, key) ? lastStats[key] : 0;
      lastStats[key] = target;
      if (reduceMotion || from === target || !val.firstChild) return;
      var node = val.firstChild, start = null, dur = 750;
      node.nodeValue = String(from);
      (function step(ts) {
        if (!node.parentNode) return;
        if (start === null) start = ts;
        var p = Math.min(1, (ts - start) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        node.nodeValue = String(Math.round(from + (target - from) * eased));
        if (p < 1) requestAnimationFrame(step); else node.nodeValue = String(target);
      })(performance.now());
    });
  }

  /* ----- toolbar extras (density + export) ----- */
  function csvCell(v) { return '"' + String(v).replace(/"/g, '""') + '"'; }

  function exportTable() {
    var table = $('#tableHost table', main);
    if (!table) { uiToast('Nothing to export yet.'); return; }
    var heads = $$('thead th', table).map(function (th) { return (th.dataset.uiText || th.textContent).trim(); });
    var actionIdx = heads.length - 1; // last column is "Actions"
    var rows = [heads.slice(0, actionIdx)];
    $$('tbody tr', table).forEach(function (tr) {
      rows.push($$('td', tr).slice(0, actionIdx).map(function (td) { return td.textContent.trim(); }));
    });
    var h2 = $('.module-head h2', main);
    var name = ((h2 && h2.textContent) || 'records').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    var csv = '\ufeff' + rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
    var url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    var a = document.createElement('a');
    a.href = url; a.download = 'nnp-cu-' + name + '-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    uiToast('Exported ' + (rows.length - 1) + ' row' + (rows.length === 2 ? '' : 's') + ' to CSV.');
  }

  function enhanceToolbar() {
    var bar = $('.toolbar', main);
    if (!bar || $('.ui-tools', bar)) return;
    var tools = mk('div', 'ui-tools');
    var count = mk('span', 'ui-count'); count.textContent = '0 records';
    var dens = mk('button', 'btn btn-sm btn-outline-secondary', { type: 'button', title: 'Switch between comfortable and compact rows' });
    dens.innerHTML = svg('rows') + '<span>Density</span>';
    dens.addEventListener('click', function () {
      var on = document.body.classList.toggle('ui-compact');
      store.set(DENSITY_KEY, on ? 'compact' : 'comfortable');
    });
    var exp = mk('button', 'btn btn-sm btn-outline-secondary', { type: 'button', title: 'Download the rows currently shown as CSV' });
    exp.innerHTML = svg('download') + '<span>Export CSV</span>';
    exp.addEventListener('click', exportTable);
    tools.appendChild(count); tools.appendChild(dens); tools.appendChild(exp);
    var muted = $('.muted', bar);
    if (muted) bar.insertBefore(tools, muted); else bar.appendChild(tools);
    var search = $('#searchRows', bar);
    if (search) search.addEventListener('input', function () { tableState.page = 1; });
  }

  /* ----- tables: labels (mobile cards), sorting, pagination ----- */
  function cellValue(tr, idx) {
    var td = tr.children[idx];
    return td ? td.textContent.trim() : '';
  }
  function sortKey(text) {
    if (text === '' || text === '—') return { empty: true };
    if (/^-?\d+(\.\d+)?$/.test(text)) return { num: parseFloat(text) };
    if (/\d{1,4}[\/.\-]\d{1,2}[\/.\-]\d{1,4}/.test(text)) { var d = Date.parse(text); if (!isNaN(d)) return { num: d }; }
    return { str: text.toLowerCase() };
  }
  function compare(a, b) {
    if (a.empty || b.empty) return a.empty && b.empty ? 0 : a.empty ? 1 : -1;
    if (a.num !== undefined && b.num !== undefined) return a.num - b.num;
    var x = a.num !== undefined ? String(a.num) : a.str, y = b.num !== undefined ? String(b.num) : b.str;
    return x.localeCompare(y, undefined, { numeric: true, sensitivity: 'base' });
  }

  function labelTable(table) {
    var heads = $$('thead th', table).map(function (th) { return th.dataset.uiText || (th.dataset.uiText = th.textContent.trim()); });
    $$('tbody tr', table).forEach(function (tr) {
      $$('td', tr).forEach(function (td, i) {
        if (td.dataset.label === undefined) td.setAttribute('data-label', i === heads.length - 1 && /^action/i.test(heads[i] || '') ? '' : (heads[i] || ''));
      });
    });
  }

  function enhanceTables() {
    $$('.table', main).forEach(labelTable);

    var host = $('#tableHost', main);
    if (!host) return;
    var pager = $('.ui-pager', host.parentNode);
    var table = $('table', host);
    if (!table) { if (pager) pager.hidden = true; updateCount(0); return; }

    // one-time setup for this table element (it is replaced on every re-render)
    if (!table.dataset.uiInit) {
      table.dataset.uiInit = '1';
      $$('tbody tr', table).forEach(function (tr, i) { tr.dataset.uiIdx = String(i); });
      var ths = $$('thead th', table);
      ths.forEach(function (th, i) {
        if (i === ths.length - 1) return; // Actions column
        th.classList.add('ui-sortable');
        th.tabIndex = 0;
        th.setAttribute('role', 'columnheader');
        var activate = function () {
          if (tableState.col === i) {
            if (tableState.dir === 1) tableState.dir = -1; else { tableState.col = -1; tableState.dir = 1; }
          } else { tableState.col = i; tableState.dir = 1; }
          tableState.page = 1;
          enhance();
        };
        th.addEventListener('click', activate);
        th.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } });
      });
    }
    var theads = $$('thead th', table);
    theads.forEach(function (th, i) {
      if (tableState.col === i) th.setAttribute('aria-sort', tableState.dir === 1 ? 'ascending' : 'descending');
      else th.removeAttribute('aria-sort');
    });

    // sort (only touch the DOM when the order actually changes)
    var body = $('tbody', table);
    var rows = $$('tr', body);
    var sorted = rows.slice().sort(function (a, b) {
      if (tableState.col < 0) return Number(a.dataset.uiIdx) - Number(b.dataset.uiIdx);
      var r = compare(sortKey(cellValue(a, tableState.col)), sortKey(cellValue(b, tableState.col))) * tableState.dir;
      return r || Number(a.dataset.uiIdx) - Number(b.dataset.uiIdx);
    });
    var changed = sorted.some(function (r, i) { return r !== rows[i]; });
    if (changed) sorted.forEach(function (r) { body.appendChild(r); });

    // paginate
    var total = sorted.length;
    var size = tableState.size === 0 ? total || 1 : tableState.size;
    var pages = Math.max(1, Math.ceil(total / size));
    if (tableState.page > pages) tableState.page = pages;
    var from = (tableState.page - 1) * size;
    sorted.forEach(function (r, i) { r.hidden = !(i >= from && i < from + size); });

    updateCount(total);
    ensurePager(host);
    updatePager(total, from, Math.min(total, from + size), pages);
  }

  function updateCount(n) {
    var c = $('.ui-count', main);
    if (!c) return;
    var t = n + ' record' + (n === 1 ? '' : 's');
    if (c.textContent !== t) c.textContent = t;
  }

  function ensurePager(host) {
    var parent = host.parentNode;
    if ($('.ui-pager', parent)) return;
    var pager = mk('div', 'ui-pager');
    pager.innerHTML =
      '<span class="ui-pager-info" aria-live="polite"></span>' +
      '<span class="ui-pager-right">' +
      '<label class="visually-hidden" for="uiPageSize">Rows per page</label>' +
      '<select class="form-select form-select-sm" id="uiPageSize" data-ui><option value="10">10 / page</option><option value="25">25 / page</option><option value="50">50 / page</option><option value="0">All</option></select>' +
      '<button type="button" class="btn btn-sm btn-outline-secondary" data-act="prev" aria-label="Previous page">' + svg('prev') + '</button>' +
      '<span class="ui-pager-page"></span>' +
      '<button type="button" class="btn btn-sm btn-outline-secondary" data-act="next" aria-label="Next page">' + svg('next') + '</button>' +
      '</span>';
    host.insertAdjacentElement('afterend', pager);
    var sel = $('select', pager);
    sel.value = String(tableState.size);
    sel.addEventListener('change', function () { tableState.size = parseInt(sel.value, 10); tableState.page = 1; enhance(); });
    pager.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-act]');
      if (!b || b.disabled) return;
      tableState.page += b.dataset.act === 'next' ? 1 : -1;
      if (tableState.page < 1) tableState.page = 1;
      enhance();
      var h = $('#tableHost', main); if (h) h.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  function updatePager(total, from, to, pages) {
    var pager = $('.ui-pager', main);
    if (!pager) return;
    pager.hidden = total <= 10;
    var info = $('.ui-pager-info', pager), pg = $('.ui-pager-page', pager);
    var a = total ? (from + 1) + '–' + to + ' of ' + total : 'No rows';
    var b = 'Page ' + tableState.page + ' / ' + pages;
    if (info.textContent !== a) info.textContent = a;
    if (pg.textContent !== b) pg.textContent = b;
    $('[data-act="prev"]', pager).disabled = tableState.page <= 1;
    $('[data-act="next"]', pager).disabled = tableState.page >= pages;
    $('[data-act="prev"]', pager).classList.toggle('disabled', tableState.page <= 1);
    $('[data-act="next"]', pager).classList.toggle('disabled', tableState.page >= pages);
  }

  /* ----- password strength meter (Settings → My account) ----- */
  function enhancePassword() {
    var form = document.getElementById('passwordForm');
    if (!form) return;
    var input = form.elements && form.elements.newPassword;
    if (!input || input.dataset.uiMeter) return;
    input.dataset.uiMeter = '1';
    var meter = mk('div', 'ui-meter');
    meter.innerHTML = '<div class="ui-meter-bar"><i></i></div><small>Strength</small>';
    input.insertAdjacentElement('afterend', meter);
    var bar = $('i', meter), label = $('small', meter);
    input.addEventListener('input', function () {
      var v = input.value, s = 0;
      if (v.length >= 8) s++;
      if (v.length >= 12) s++;
      if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++;
      if (/\d/.test(v)) s++;
      if (/[^A-Za-z0-9]/.test(v)) s++;
      if (!v) s = 0;
      var levels = [['0%', '#c4483d', 'Strength'], ['25%', '#c4483d', 'Weak'], ['45%', '#e08a2e', 'Fair'], ['65%', '#d9b24c', 'Good'], ['85%', '#4fae72', 'Strong'], ['100%', '#157a45', 'Excellent']];
      var l = levels[s];
      bar.style.width = l[0]; bar.style.background = l[1]; label.textContent = l[2];
    });
  }

  /* ======================================================================
     Global interactions
     ====================================================================== */
  function typing(e) {
    var t = e.target;
    return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  }

  function bindGlobal() {
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (palette && !palette.hidden) closePalette(); else openPalette();
        return;
      }
      if (e.key === '/' && !typing(e) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        var s = document.getElementById('searchRows');
        e.preventDefault();
        if (s) { s.focus(); s.select(); } else openPalette();
      }
    });

    // click a toast to dismiss it
    var wrap = document.getElementById('toastWrap');
    if (wrap) wrap.addEventListener('click', function (e) { var n = e.target.closest('.toast-note'); if (n) n.remove(); });

    // click <code> to copy (UIDs, database paths)
    document.addEventListener('click', function (e) {
      var c = e.target.closest && e.target.closest('.content code');
      if (!c) return;
      var text = c.textContent.trim();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { uiToast('Copied to clipboard'); }, function () { /* ignore */ });
      }
    });

    // swipe from the left edge opens the drawer; swipe left closes it (touch only)
    var sx = 0, sy = 0, tracking = false;
    document.addEventListener('touchstart', function (e) {
      var t = e.touches[0];
      sx = t.clientX; sy = t.clientY;
      tracking = e.touches.length === 1;
    }, { passive: true });
    document.addEventListener('touchend', function (e) {
      if (!tracking) return;
      tracking = false;
      if (window.innerWidth > 860) return;
      var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 0.6) return;
      var sidebar = document.getElementById('sidebar'), toggle = document.getElementById('menuToggle');
      if (!sidebar || !toggle) return;
      var open = sidebar.classList.contains('open');
      if (dx > 0 && sx < 28 && !open) toggle.click();
      else if (dx < 0 && open) toggle.click();
    }, { passive: true });
  }

  /* ======================================================================
     Boot
     ====================================================================== */
  function boot() {
    applyTheme(); // meta[theme-color] exists now
    main = document.getElementById('mainContent');
    if (!main) return;
    buildChrome();
    buildPalette();
    bindGlobal();
    obs = new MutationObserver(schedule);
    obs.observe(main, { childList: true, subtree: true });
    var nav = document.getElementById('moduleNav');
    if (nav) new MutationObserver(function () { syncNav(); }).observe(nav, { attributes: true, subtree: true, attributeFilter: ['class', 'hidden'] });
    var title = document.getElementById('pageTitle');
    if (title) new MutationObserver(schedule).observe(title, { childList: true, characterData: true, subtree: true });
    syncNav();
    schedule();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
