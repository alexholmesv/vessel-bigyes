# BigYes Vessel Changelog

All notable changes to the BigYes instance are documented here.
Only changes to files within `instances/bigyes/` are listed.

---

## [1.2.0] — 2026-06-07

### Fixed
- **Challenge system: student dashboard permanently showed "No prompt right now" despite deployed challenges**

  **Root cause (5 interdependent bugs):**

  1. **`by_challenges` missing `expires_at` + `created_at` columns** — The `_ensure_challenge_schema()` migration in `vessel_engine/db_helpers.py` used ALTER TABLE to add missing columns, but SQLite rejects `DEFAULT CURRENT_TIMESTAMP` in ALTER TABLE ADD COLUMN. The `except Exception: pass` block silently swallowed the error, leaving the table without these columns. The `get_pending_challenges()` query filtered via `WHERE expires_at > ?` which threw `OperationalError: no such column: expires_at` — caught by the JS `.catch()` handler which silently showed the idle state.

  2. **`by_challenge_responses` missing `created_at` column** — Same SQLite ALTER TABLE limitation. The `get_challenge_responses()` function queries `ORDER BY created_at`, causing a 500 Internal Server Error on every poll. This was the most recent blocker (visible in Flask logs).

  3. **`class_id` polling mismatch** — The student JS polled `/api/challenge/pending?class_id=<first_alphabetical_class>`, but challenges were deployed to other classes the student was enrolled in. Removed the `class_id` query param so all enrolled-class challenges appear.

  4. **Jinja2 overlay bytecode cache isolation** — `render_vessel_template()` in `vessel_engine/renderer.py` creates a Jinja2 `.overlay()` environment at line 68. This overlay has its **own isolated bytecode cache** completely separate from `app.jinja_env.cache`. Even after all backend fixes and template changes, the browser received a stale compiled version of `profile.html` that didn't include the fixed JS code. Fixed by adding `env.cache = {}`, `env.cache_size = 0`, and `env.auto_reload = True` directly on the overlay environment.

  5. **Flask/Jinja caching not fully disabled for development** — `app.py` needed `TEMPLATES_AUTO_RELOAD=True`, `SEND_FILE_MAX_AGE_DEFAULT=0`, and `jinja_env.cache={}` to ensure hot-reload of template changes.

  **DB migrations applied to `bigyes.db`:**
  - `ALTER TABLE by_challenges ADD COLUMN created_at TIMESTAMP` + backfill from `deployed_at`
  - `ALTER TABLE by_challenges ADD COLUMN expires_at TIMESTAMP` + set to `deployed_at + 48h`
  - `ALTER TABLE by_challenge_responses ADD COLUMN created_at TIMESTAMP` + backfill from `submitted_at`

### Added
- **18 trophies / achievements** in profile.html — `First Scene` (accept first challenge), `Scene Veteran` / `Stage Regular` / `Daredevil` / `Unstoppable` (accept 5/10/15/20), `Crowd Pleaser` through `Grand Champion` (win 1/5/10/15/20), `Rising Star` / `Improv Adept` / `Improv Master` (50/150/300 pts), `Crowd Favorite`, `Social Butterfly`, `Iron Will`, `Perfect Attendance`
- **Trophy hover tooltip** — description appears on hover in achievements card
- **Improv-flavored idle message** — "When your teacher throws down an improv dare it'll pop up right here..."
- **Teacher challenge close/delete** — `POST /api/challenge/close/<id>` and `POST /api/challenge/delete/<id>`
- **Diagnostic endpoints** — `/debug-env` (process identity) and `/api/challenge/debug` (raw DB state)

### Changed
- `templates/profile.html` — poll now calls `/api/challenge/pending` without `class_id` filter; idle message rewritten; trophy cards added with hover tooltip
- `vessel_engine/renderer.py` — overlay environment bytecode cache zeroed + auto_reload enabled
- `vessel_engine/db_helpers.py` — migration default changed from `CURRENT_TIMESTAMP` to `NULL` for ALTER TABLE compatibility; `post_challenge()` now inserts `created_at`; added `close_challenge()`, `delete_challenge()`, `_check_perfect_attendance()`; added `challenges_accepted` tracking; 18 trophy definitions
- `vessel_engine/routes.py` — added `close_challenge`/`delete_challenge` imports; added close/delete/debug routes
- `app.py` — `TEMPLATES_AUTO_RELOAD=True`, `SEND_FILE_MAX_AGE_DEFAULT=0`, `jinja_env` cache disabled; added `/debug-env` endpoint

### New scripts
- `scripts/clear_cache.sh` — purges all `__pycache__/` and `.pyc` across repo + `instances/` submodules

---

## [1.1.0] — 2026-06-05

### Fixed
- **Ensemble Room teacher messaging delivers real inbox messages** — `sendTeacherMessage()` POSTed to `/api/teacher/message`, which was a backend stub returning `{"ok": True}` without persisting anything. Backend replaced with full multi-target inbox delivery (class UUID expansion, deduplication, `send_inbox_message()`). Messages now appear in recipient inboxes and unread badges light up.
- **Scraper auto-generates volunteer shift slots** — `scripts/scrape_bigyes.py` now creates 4 default slots (Door, Bar×2, House Manager) per scraped show. Added `_backfill_shift_slots()` for pre-existing scraped shows on production.
- **Scraper ensures soft-delete columns exist** — production DBs predate soft-delete; scraper now runs idempotent `ALTER TABLE` before touching `deleted_at`/`restorable_until` columns.

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