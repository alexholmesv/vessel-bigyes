/* Phase 7.4d -- ND mode completion feedback.
 *
 * Shared helper: window.ndCelebrate(message) shows a celebratory toast
 * (bounce pop-in) with a brief confetti burst, plus a running session tally,
 * then auto-dismisses. No sound (user's explicit choice, 2026-10-29).
 *
 * Motion vs. the ND reduced-motion rule: nd-mode.css collapses every CSS
 * `transition`/`animation` under [data-mode="nd"] to ~0 via a blanket
 * `[data-mode="nd"] * { animation-duration: 0.01ms !important; ... }` rule.
 * The user originally asked for this feature to be a deliberate, narrowly
 * scoped exception (MASTER_PLAN.md Phase 7.4d) -- then on 2026-10-29
 * explicitly chose "Override it -- celebratory motion in ND mode too" when
 * asked directly, after confirming they wanted real confetti/bounce, not
 * sound, and were fine with it running in ND mode as well as everywhere
 * else. So this still needs to escape the blanket kill rule.
 *
 * How it escapes it: everything here runs through the Web Animations API
 * (`Element.animate()`), never a CSS `animation`/`transition` property. The
 * blanket rule only targets the CSS `animation-duration`/`transition-duration`
 * properties -- it has no effect on Animation objects created via
 * `.animate()`, since those aren't driven by a CSS animation-name at all.
 * This sidesteps the whole specificity/!important fight entirely rather
 * than trying to out-specificity a `[data-mode="nd"] *` selector.
 *
 * Tally scope: per browser session via sessionStorage, not per day. This is
 * a traditional multi-page app (no SPA router), so a plain JS variable would
 * reset to 0 on every single page navigation -- useless for a "running"
 * tally. sessionStorage persists across page loads within the same tab/
 * session and clears when the tab/window closes, which is what "per session"
 * has to mean here to actually feel like a running count. No backend change.
 */
(function () {
  var TALLY_KEY = 'nd_celebrate_tally';
  var TOAST_ID = 'nd-celebrate-toast';
  var DISMISS_MS = 3200;
  var CONFETTI_COUNT = 18;
  var FALLBACK_PALETTE = ['#FFC629', '#E5482A', '#2A8A4F', '#6B5CE7', '#06B6D4', '#E5A800'];

  function tallyGet() {
    try {
      return parseInt(sessionStorage.getItem(TALLY_KEY) || '0', 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  function tallyBump() {
    var n = tallyGet() + 1;
    try {
      sessionStorage.setItem(TALLY_KEY, String(n));
    } catch (e) {
      /* sessionStorage unavailable (private mode, etc.) -- degrade to no tally */
    }
    return n;
  }

  function palette() {
    var cs = getComputedStyle(document.documentElement);
    var names = ['--by-yes', '--by-tomato', '--by-success-green', '--by-future-purple', '--by-bs-teal', '--by-yes-deep'];
    var colors = [];
    for (var i = 0; i < names.length; i++) {
      var v = (cs.getPropertyValue(names[i]) || '').trim();
      colors.push(v || FALLBACK_PALETTE[i] || FALLBACK_PALETTE[0]);
    }
    return colors;
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function spawnConfetti(originEl) {
    if (!originEl || typeof originEl.animate !== 'function') return;
    var rect = originEl.getBoundingClientRect();
    var originX = rect.left + rect.width / 2;
    var originY = rect.top;
    var colors = palette();

    var container = document.createElement('div');
    container.setAttribute('aria-hidden', 'true');
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '10000';
    document.body.appendChild(container);

    var longest = 0;
    for (var i = 0; i < CONFETTI_COUNT; i++) {
      var piece = document.createElement('span');
      var size = rand(6, 11);
      piece.style.position = 'absolute';
      piece.style.left = originX + 'px';
      piece.style.top = originY + 'px';
      piece.style.width = size + 'px';
      piece.style.height = (size * rand(0.5, 1)) + 'px';
      piece.style.background = colors[i % colors.length];
      piece.style.borderRadius = (Math.random() < 0.5 ? '50%' : '2px');
      piece.style.willChange = 'transform, opacity';
      container.appendChild(piece);

      var dx = rand(-110, 110);
      var upY = rand(-90, -40);
      var fallY = rand(70, 140);
      var rot = rand(-260, 260);
      var dur = rand(750, 1150);
      longest = Math.max(longest, dur);

      piece.animate(
        [
          { transform: 'translate(0, 0) rotate(0deg)', opacity: 1, offset: 0 },
          { transform: 'translate(' + (dx * 0.6) + 'px, ' + upY + 'px) rotate(' + (rot * 0.5) + 'deg)', opacity: 1, offset: 0.35 },
          { transform: 'translate(' + dx + 'px, ' + fallY + 'px) rotate(' + rot + 'deg)', opacity: 0, offset: 1 }
        ],
        { duration: dur, easing: 'cubic-bezier(.17,.67,.23,.99)', fill: 'forwards' }
      );
    }

    window.setTimeout(function () {
      if (container.parentNode) container.parentNode.removeChild(container);
    }, longest + 60);
  }

  window.ndCelebrate = function (message) {
    var n = tallyBump();

    var existing = document.getElementById(TOAST_ID);
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }

    var el = document.createElement('div');
    el.id = TOAST_ID;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.style.position = 'fixed';
    el.style.bottom = '20px';
    el.style.right = '20px';
    el.style.zIndex = '9999';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.gap = '10px';
    el.style.padding = '12px 16px';
    el.style.maxWidth = '320px';
    el.style.border = '1.5px solid var(--by-ink, #141210)';
    el.style.background = 'var(--by-yes, #FFC629)';
    el.style.color = 'var(--by-ink, #141210)';
    el.style.fontFamily = 'var(--by-f-sans, sans-serif)';
    el.style.fontWeight = '700';
    el.style.fontSize = '13px';
    el.style.lineHeight = '1.3';
    el.style.boxShadow = 'var(--by-sh-yes, 0 2px 10px rgba(0,0,0,.2))';
    el.style.transformOrigin = 'bottom right';

    var check = document.createElement('span');
    check.setAttribute('aria-hidden', 'true');
    check.style.fontSize = '17px';
    check.style.lineHeight = '1';
    check.style.flexShrink = '0';
    check.textContent = '✓';

    var text = document.createElement('span');
    text.textContent = message + ' — ' + n + ' this session';

    el.appendChild(check);
    el.appendChild(text);
    document.body.appendChild(el);

    if (typeof el.animate === 'function') {
      el.animate(
        [
          { transform: 'scale(0.4)', opacity: 0, offset: 0 },
          { transform: 'scale(1.08)', opacity: 1, offset: 0.7 },
          { transform: 'scale(1)', opacity: 1, offset: 1 }
        ],
        { duration: 380, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' }
      );
    }

    spawnConfetti(el);

    window.setTimeout(function () {
      if (!el.parentNode) return;
      if (typeof el.animate === 'function') {
        var fadeOut = el.animate(
          [
            { transform: 'scale(1)', opacity: 1 },
            { transform: 'scale(0.85)', opacity: 0 }
          ],
          { duration: 220, easing: 'ease-in', fill: 'forwards' }
        );
        fadeOut.onfinish = function () {
          if (el.parentNode) el.parentNode.removeChild(el);
        };
      } else {
        el.parentNode.removeChild(el);
      }
    }, DISMISS_MS);

    return n;
  };
})();

/* Some success handlers reload the page immediately (window.location.reload())
 * or navigate to a new URL right after a successful save, so a toast fired
 * synchronously there would never be visible -- the page unloads before the
 * confetti/toast ever paints. ndCelebrateOnReload() stores the message and
 * fires it automatically once the fresh page has loaded instead. */
(function () {
  var PENDING_KEY = 'nd_celebrate_pending';

  window.ndCelebrateOnReload = function (message) {
    try {
      sessionStorage.setItem(PENDING_KEY, message);
    } catch (e) {
      /* no sessionStorage -- the toast just won't appear after this reload */
    }
  };

  function fireIfPending() {
    var msg;
    try {
      msg = sessionStorage.getItem(PENDING_KEY);
      if (msg) sessionStorage.removeItem(PENDING_KEY);
    } catch (e) {
      return;
    }
    if (msg && typeof window.ndCelebrate === 'function') {
      window.ndCelebrate(msg);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fireIfPending);
  } else {
    fireIfPending();
  }
})();
