/*
 * ND Mode step-by-step wizard (Phase 7.4e/l).
 *
 * Generic, content-agnostic: it does NOT know what "Add Person" or
 * "Add Class" mean. Every right-side slide-over panel in this app
 * (".by-panel > .by-panel-inner") shares the same three-part shape --
 * a header, a scrollable body whose direct children are naturally
 * one logical field-group each (name+email, password, role type, ...),
 * and a footer with Cancel + the real submit button. That shared shape
 * is enough to turn ANY such modal into a one-section-at-a-time flow
 * under ND mode, with no markup changes required per modal.
 *
 * Call ndWizardOnOpen(modalId) at the end of openModal(), and
 * ndWizardOnClose(modalId) at the start of closeModal(), in any
 * template that defines those functions. Outside ND mode this is a
 * silent no-op -- standard mode keeps showing the full form at once.
 *
 * Wizards are for ENTERING or EDITING information only. A panel whose job
 * is to show a summary/lookup (e.g. a student's info panel) should carry
 * data-nd-wizard-skip-all on the .by-panel element itself -- it then opens
 * exactly as standard mode does, no stepping, everything visible at once.
 */
(function () {
  function isNdMode() {
    return document.documentElement.getAttribute('data-mode') === 'nd';
  }

  function getPanelParts(panelEl) {
    var inner = panelEl.querySelector('.by-panel-inner');
    if (!inner) return null;
    var children = Array.prototype.slice.call(inner.children);
    if (children.length < 3) return null;
    var header = children[0];
    var footer = children[children.length - 1];
    var body = inner.querySelector('.overflow-y-auto') || children[1];
    return { inner: inner, header: header, footer: footer, body: body };
  }

  // Which direct children of the scrollable body count as a "step".
  // Status/feedback rows (id ending in -status) aren't a step the person
  // fills in -- they're where success/error text appears -- so they ride
  // along inside whichever step is active rather than becoming one.
  function sectionCandidates(body) {
    return Array.prototype.slice.call(body.children).filter(function (el) {
      if (el.id && /-status$/.test(el.id)) return false;
      if (el.hasAttribute('data-nd-wizard-skip')) return false;
      if (el.tagName === 'SCRIPT') return false;
      return true;
    });
  }

  // Deliberately NOT window.getComputedStyle(el).display: the wizard's own
  // step-hiding mechanism (the .nd-step-hide CSS class, see nd-mode.css) also
  // resolves to display:none in computed style. Using computed style here
  // would make visibleSteps() see a step the wizard itself just hid as "not
  // a real step anymore" instead of "temporarily inactive" -- after the very
  // first render every other section collapses out of the step list for
  // good, the step count drops to 1, and "Review" appears immediately with
  // every other field (Title, Day/Time, ...) unreachable until Review force-
  // reveals everything. Checking only the app's own two hiding conventions
  // (the Tailwind `hidden` class, and inline style.display -- see e.g. the
  // avatar-preview comment in modal-my-config) sidesteps that collision
  // entirely: a field-group conditionally hidden by business logic (like
  // Schedule a Show's Title field when an existing show type is picked)
  // is still correctly excluded from the step list, but the wizard's own
  // bookkeeping no longer poisons it.
  function isHiddenNow(el) {
    if (el.classList.contains('hidden')) return true;
    return el.style.display === 'none';
  }

  var active = null;

  function teardown() {
    if (!active) return;
    active.allSections.forEach(function (el) { el.classList.remove('nd-step-hide', 'nd-step-invalid'); });
    if (active.navEl && active.navEl.parentNode) active.navEl.parentNode.removeChild(active.navEl);
    if (active.footer) active.footer.classList.remove('hidden');
    active.panelEl.classList.remove('nd-wizard-active');
    active = null;
  }

  function visibleSteps() {
    // Recomputed on every render: picking a Role Type mid-flow can reveal
    // or hide a later section (Access Level, Can View Finances, ...), so
    // the step count and order are never assumed fixed up front.
    return active.allSections.filter(function (el) { return !isHiddenNow(el); });
  }

  function stepValid(stepEl) {
    var required = stepEl.querySelectorAll('input[required], select[required], textarea[required]');
    for (var i = 0; i < required.length; i++) {
      if (!required[i].value || !required[i].value.trim()) return false;
    }
    return true;
  }

  function renderNav(steps) {
    if (!active.navEl) {
      active.navEl = document.createElement('div');
      active.navEl.className = 'nd-step-nav';
      active.body.appendChild(active.navEl);
    } else {
      active.body.appendChild(active.navEl); // keep it trailing the active step
    }
    var isLast = active.stepIndex >= steps.length - 1;
    var isFirst = active.stepIndex === 0;
    active.navEl.innerHTML =
      '<div class="nd-step-progress">' + (active.stepIndex + 1) + ' / ' + steps.length + '</div>' +
      '<div class="nd-step-nav-btns">' +
        (isFirst ? '' : '<button type="button" class="btn-ghost h-10 px-4 text-[13px] font-body" data-nd-step-back>' + (window.ND_WIZARD_LABELS ? window.ND_WIZARD_LABELS.back : 'Back') + '</button>') +
        '<button type="button" class="btn-spot h-10 px-5 text-[13px]" data-nd-step-next>' +
          (isLast ? (window.ND_WIZARD_LABELS ? window.ND_WIZARD_LABELS.review : 'Review') : (window.ND_WIZARD_LABELS ? window.ND_WIZARD_LABELS.next : 'Next')) +
        '</button>' +
      '</div>';
    active.navEl.querySelector('[data-nd-step-next]').onclick = function () { advance(isLast); };
    var backBtn = active.navEl.querySelector('[data-nd-step-back]');
    if (backBtn) backBtn.onclick = function () { active.stepIndex--; renderStep(); };
  }

  function renderStep() {
    var steps = visibleSteps();
    if (!steps.length) return;
    if (active.stepIndex >= steps.length) active.stepIndex = steps.length - 1;
    active.allSections.forEach(function (el) { el.classList.add('nd-step-hide'); });
    steps[active.stepIndex].classList.remove('nd-step-hide');
    renderNav(steps);
  }

  function advance(wasLast) {
    var steps = visibleSteps();
    var cur = steps[active.stepIndex];
    if (cur && !stepValid(cur)) {
      cur.classList.add('nd-step-invalid');
      setTimeout(function () { cur.classList.remove('nd-step-invalid'); }, 900);
      return;
    }
    if (wasLast) {
      finishToReview();
    } else {
      active.stepIndex++;
      renderStep();
    }
  }

  // The final "Review" tap un-blurs every section for one last look-over
  // and reveals the real Cancel/submit footer -- the existing submit
  // handler (createPerson(), createClass(), ...) runs completely unchanged.
  function finishToReview() {
    active.allSections.forEach(function (el) { el.classList.remove('nd-step-hide'); });
    if (active.navEl && active.navEl.parentNode) { active.navEl.parentNode.removeChild(active.navEl); active.navEl = null; }
    active.footer.classList.remove('hidden');
    active.panelEl.classList.add('nd-wizard-reviewing');
  }

  window.ndWizardOnOpen = function (panelId) {
    teardown();
    if (!isNdMode()) return;
    var panelEl = document.getElementById(panelId);
    if (!panelEl) return;
    // View-only panels (e.g. a student's info/summary) are for looking things
    // up, not entering data -- stepping them one field at a time would hide
    // the very thing the person opened the panel to see. The wizard is only
    // for entering/editing information, so a panel can opt out entirely with
    // data-nd-wizard-skip-all and it renders exactly as standard mode does:
    // everything visible at once, no step nav, no Review gate.
    if (panelEl.hasAttribute('data-nd-wizard-skip-all')) return;
    var parts = getPanelParts(panelEl);
    if (!parts) return;
    var allSections = sectionCandidates(parts.body);
    if (allSections.length < 2) return; // nothing to step through
    active = {
      panelId: panelId, panelEl: panelEl, body: parts.body, footer: parts.footer,
      allSections: allSections, stepIndex: 0, navEl: null
    };
    parts.footer.classList.add('hidden');
    panelEl.classList.add('nd-wizard-active');
    renderStep();
  };

  window.ndWizardOnClose = function (panelId) {
    if (active && active.panelId === panelId) teardown();
  };

  // Content-agnostic re-render hook. A step's own business logic can change
  // ANOTHER section's visibility while that section isn't the active step
  // (e.g. Schedule a Show's Title field toggling off a later, already-passed
  // step) -- visibleSteps() picks that up fine on the next Next/Back because
  // renderStep() always recomputes from scratch. But when a click INSIDE the
  // currently active step changes that same step's own visibility (e.g. the
  // Add Class past-term warning hiding itself when "Confirm" or "Pick
  // another term" is clicked), nothing calls renderStep() again until the
  // person manually hits Next/Back -- they're left staring at a blank step
  // with a stale "N / M" counter. Rather than teach the wizard about every
  // modal's own business logic, any template function that hides/reveals a
  // step-candidate section mid-step calls this afterward; it's a no-op when
  // no wizard is active or ND mode is off.
  window.ndWizardRefresh = function () {
    if (active) renderStep();
  };
})();
