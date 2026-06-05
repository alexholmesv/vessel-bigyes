# BigYes Vessel Changelog

All notable changes to the BigYes instance are documented here.
Only changes to files within `instances/bigyes/` are listed.

---

## [1.0.0] — 2026-06-05

### Added
- **`syncPts(newBalance)` JavaScript function** in `profile.html` — unified call that updates all three points displays (`ptsHeader`, `ptsNum`, `sidePoints`) from a single source. Any future action that earns points (challenge submit, etc.) just calls `syncPts(newBalance)`.
- **Dynamic points breakdown** in `profile.html` — stat bars now render from `points_breakdown` template context showing attendance count/pts, challenge submissions/wins/pts, and volunteer shifts claimed/pts with progress bar widths.

### Changed
- **`templates/partials/_sidebar.html`** — sidebar "Profile" nav link fixed from `href="/"` to `href="/profile"`; mobile bottom tab "Profile" link also fixed. Dead Achievements and Settings nav items (both `href="#"`) removed.
- **`templates/profile.html`** — replaced old "View and claim available shifts" + "Browse shifts" card with a compact single-row "Volunteer Shifts →" link with pool status chip.
- **`templates/volunteer_shifts.html`** — all three `href="/"` instances (logo, user-menu "Back to Profile", bottom back button) changed to `href="/profile"`. Drop-shift text changed from "You can drop a shift up to 24h before the show" to "Yes-and your way out — talk to your Stage Manager". Challenge label updated from "1pt for submitted response, 15pts for winner" to "1pt for submitted response, 10pts for winner".

### Fixed
- **Volunteer shift names showing codes in SM view** — stale seed data had assigned `student_id='s2'` (a non-UUID synthetic value) to volunteer shifts, which didn't match any `by_clients` row. The admin template falls back to showing `shift.student_id` raw text when no user lookup succeeds. Re-seeded shifts data with valid UUIDs that resolve to real student names.
---

## [0.4.0] — 2026-06-04

### Added
- **Dynamic trophy grid** in `profile.html` — rendered from server `trophies` context instead of static badge tiles.
- **Compose button** in `templates/partials/_inbox_modal.html` — "+" button in header with `composeMsg()` and `sendCompose()` functions for student-to-student/teacher messaging.

### Changed
- `templates/profile.html` — removed entire `{% if mock_preview %}...{% endif %}` design mockup block; removed "Demo: toggle volunteer" button and its JS handler; replaced static badge tiles with live dynamic trophy grid from DB.
- Challenge JS in `profile.html` — `renderAvailable()`, `loadChallenges()`, `acceptChallenge()`, `startLive()` updated to match new API shapes (`title`/`description`/`accepted`/`responded`/`total_responders`/`posted_by_name`/`points` instead of legacy `difficulty`/`prompt`/`class_title`/`status`).
- `_inbox_modal.html` — added "+" compose button in header with recipient dropdown, subject, and body fields.

---

## [0.1.0] — 2026-06-04

### Added
- **Checkbox UI redesign** — checkbox component overhaul in BigYes templates.

### Changed
- `templates/profile.html` — removed `{% if mock_preview %}...{% endif %}` mockup block; removed "Demo: toggle volunteer" button and JS handler; replaced static badge tiles with live dynamic trophy grid.

---

## [0.0.2] — 2026-06-04

### Fixed
- `templates/classes.html` — restored week/month calendar views (previously rendered empty due to missing context variables).

---

## [0.0.1] — 2026-06-04

Initial BigYes vessel provisioning from school archetype with templates (admin, profile, classes, login, forgot/reset password, settings, privacy, sidebar, inbox modal, volunteer shifts) and static assets.