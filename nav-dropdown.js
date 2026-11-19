/*
 * NNP Christian Union - Clustered dropdown navigation behaviour
 * Dependency-free. Uses event delegation, so it also works if the header
 * is injected into pages with fetch().
 */
(function () {
  'use strict';

  /* Self-loading stylesheet: pages that only include this script (or that
     inject the header's HTML without its <head>) still get the styles.
     The CSS is expected next to this file. */
  var self = document.currentScript;
  if (self && self.src && !document.querySelector('link[href*="nav-dropdown.css"]')) {
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = self.src.replace(/\.js(\?.*)?$/, '.css$1');
    document.head.appendChild(css);
  }

  var OPEN_DELAY = 90;   // ms of hover before a panel opens (avoids accidental flicker)
  var CLOSE_DELAY = 220; // ms grace so the pointer can cross the gap into the panel
  var hoverMode = window.matchMedia('(min-width: 992px) and (hover: hover)');
  var timers = new WeakMap();

  function all() { return document.querySelectorAll('#top-header .has-mega'); }
  function caretOf(li) { return li.querySelector('.mega-caret'); }

  function setOpen(li, on) {
    clearTimeout(timers.get(li));
    li.classList.toggle('is-open', on);
    var c = caretOf(li);
    if (c) c.setAttribute('aria-expanded', String(on));
  }

  function openOnly(li) {
    all().forEach(function (o) { if (o !== li) setOpen(o, false); });
    setOpen(li, true);
  }

  function closeAll() { all().forEach(function (o) { setOpen(o, false); }); }

  function schedule(li, on, ms) {
    clearTimeout(timers.get(li));
    timers.set(li, setTimeout(function () { on ? openOnly(li) : setOpen(li, false); }, ms));
  }

  /* Hover (desktop with a real pointer): open automatically */
  document.addEventListener('mouseenter', function (e) {
    var t = e.target;
    if (!hoverMode.matches || !(t instanceof Element) || !t.matches('#top-header .has-mega')) return;
    schedule(t, true, OPEN_DELAY);
  }, true);

  document.addEventListener('mouseleave', function (e) {
    var t = e.target;
    if (!hoverMode.matches || !(t instanceof Element) || !t.matches('#top-header .has-mega')) return;
    schedule(t, false, CLOSE_DELAY);
  }, true);

  document.addEventListener('click', function (e) {
    var caret = e.target.closest('#top-header .mega-caret');
    if (caret) {                                   // caret: keyboard / touch toggle
      var li = caret.closest('.has-mega');
      li.classList.contains('is-open') ? setOpen(li, false) : openOnly(li);
      return;
    }

    var mToggle = e.target.closest('#top-header .m-toggle');
    if (mToggle) {                                 // mobile accordion
      var sub = document.getElementById(mToggle.getAttribute('aria-controls'));
      var expand = mToggle.getAttribute('aria-expanded') !== 'true';
      mToggle.setAttribute('aria-expanded', String(expand));
      if (sub) sub.hidden = !expand;
      return;
    }

    // a button inside a panel (e.g. "Become a Member") should close the panel
    if (e.target.closest('#top-header .mega-panel [data-bs-toggle]')) { closeAll(); return; }

    // click anywhere outside the menus closes them
    if (!e.target.closest('#top-header .has-mega')) closeAll();
  });

  /* Keyboard: Esc closes and returns focus to the caret */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var openLi = document.querySelector('#top-header .has-mega.is-open');
    if (!openLi) return;
    setOpen(openLi, false);
    var c = caretOf(openLi);
    if (c) c.focus();
  });

  /* Keyboard: close when focus leaves the menu */
  document.addEventListener('focusout', function (e) {
    var li = e.target.closest && e.target.closest('#top-header .has-mega');
    if (!li || !li.classList.contains('is-open')) return;
    if (!e.relatedTarget || !li.contains(e.relatedTarget)) {
      if (!hoverMode.matches || !li.matches(':hover')) setOpen(li, false);
    }
  });

  /* Resizing across the breakpoint resets everything */
  hoverMode.addEventListener('change', closeAll);
})();
