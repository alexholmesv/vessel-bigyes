# vessel-bigyes_architecture.md
> **BigYes Vessel — Definitive Architecture Map**  
> Elemental Affinity: `school` · Air / Mind  
> Table Prefix: `by_` · DB: `instances/bigyes/bigyes.db`  
> Last updated: 2026-06-04

---

## 1 · CONTEXT & ECOSYSTEM ALIGNMENT

### Vessel Identity
- **Vessel slug:** `bigyes`
- **Git submodule path:** `instances/bigyes/` (airlocked — own `.git`, own remote)
- **Elemental Affinity:** `school` (theatre / improv school domain)
- **Arcana Tier — live (Major Arcana):** `use_multirole_views: TRUE` — set in encrypted Runes at provision time via `migrate_bigyes_dojodesk.py`. BigYes is a **full multirole vessel**: teachers land at `/ensemble-room`, students at `/profile`, directors/stage_managers at `/dashboard`.
- **`use_multirole_views` flag meaning:** Controls whether the **scene-switcher UI** (`_scene_switcher.html`) appears in the navbar for owners/stage_managers to preview other role views. Does NOT gate the role-specific routes — those always exist.
- **Role-specific routes are always active** regardless of the flag. Identity at login determines the landing page automatically (see §4 Role Routing).

> ⚠️ `config.json` shows `use_multirole_views: false` — this is the **scaffold template default only**, not the live value. Live Runes are stored encrypted in `kotodama.db → vessels.runes` (Fernet/AES-256). BigYes was provisioned with `use_multirole_views: True`.

### Runes — Static Scaffold (`config.json`)
File: `instances/bigyes/config.json` — **scaffold defaults only, not authoritative at runtime**
```json
{
  "archetype": "school",
  "supports_multirole": true,
  "identity_types": ["owner", "manager", "teacher", "student"],
  "default_config": {
    "use_multirole_views": false,
    "features": {
      "financial_ledger": true,
      "client_crud": true,
      "class_scheduling": true,
      "belt_system": false,
      "email_notifications": true,
      "google_drive_backup": false
    }
  },
  "color_primary": "indigo"
}
```

### Runes — Live (`kotodama.db → vessels.runes`, Fernet-encrypted)
Provisioned values (set by `scripts/migrate_bigyes_dojodesk.py`):
```python
{
    "use_multirole_views": True,   # ← Major Arcana — scene switcher ON
    "features": {
        "financial_ledger": True,
        "client_crud": True,
        "class_scheduling": True,
        "belt_system": False,
        "email_notifications": True,
        "google_drive_backup": False,
    }
}
```
Runtime access: `get_tenant_config(g.tenant)` → `shared_backend/services/tenant_service.py` → decrypts `vessels.runes` → merges with `DEFAULT_CONFIG`.
```

### Platform Core Integration (`app.py`)
- **Tenant resolution:** `before_request` → strips subdomain from `Host` header → queries `vessels` table in `kotodama.db` → populates `g.tenant`
- **Admin / Scrying Pool path:** `ADMIN_SECRET_PATH` env var (default: `admin`) → registered as `/{ADMIN_SECRET_PATH}` blueprint prefix; bypasses tenant resolution entirely
- **Vessel URL builder:** `manifest_vessel_url(slug)` context processor — dev uses `http://{slug}.lvh.me:{PORT}`, prod uses `https://{slug}.{BASE_DOMAIN}`
- **i18n:** Flask-Babel locale selector reads `g.tenant` → `config.base_language` → optional `session['vessel_locale']` (only when `allow_multilang=True`)
- **DB teardown:** `close_platform_db()` + `close_all_tenant_dbs()` on every appcontext teardown
- **Security headers (all responses):** `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, HSTS (production only)

### Blueprints Registered in `app.py`
| Blueprint | Prefix | Module |
|---|---|---|
| `admin_bp` | `/{ADMIN_SECRET_PATH}` | `kotodama_admin/routes.py` — The Scrying Pool |
| `vessel_bp` | `/` (host-routed) | `vessel_engine/routes.py` — all vessel views |

### Key Environment Variables
| Var | Purpose |
|---|---|
| `SECRET_KEY` | Flask session signing |
| `ADMIN_SECRET_PATH` | Hidden Scrying Pool URL segment |
| `PLATFORM_DB_PATH` | Path to `kotodama.db` (platform-level) |
| `INSTANCES_DIR` | Root folder for vessel submodules (default: `instances`) |
| `KOTODAMA_SECRET_RUNES` | Fernet-encrypted platform config blob |
| `VESSEL_INIT_PASSPHRASE` | Default password for bulk-provisioned members |
| `BASE_DOMAIN` | Production domain for vessel URL construction |
| `ENV` | `development` or `production` |
| `RENDER_API_KEY` / `RENDER_SERVICE_ID` | Render.com deploy hooks |

---

## 2 · TAXONOMY & ACCESS MATRIX

### Identity vs Role Type
Two parallel fields exist on `by_clients`:
- **`identity`** — functional tier (controls routing, nav, view access)
- **`role_type`** — display/domain label (theatre vocabulary, shown in UI)

### Identity → Theatre Domain Mapping
| `identity` (DB) | Theatre Domain | Access Level | Landing Page | View |
|---|---|---|---|---|
| `stage_manager` | Director / Producer / Stage Manager | Full admin — can switch views, manage all | `/dashboard` | `admin.html` — full control panel |
| `teacher` | Performer / Instructor / Ensemble Lead | Teacher view — own classes, roster read | `/ensemble-room` | `ensemble_room.html` |
| `student` | Patron / Student / Ensemble Member | Student view — own profile, enrolled classes | `/profile` | `profile.html` |
| `trainer` | Trainer (gym carry-over, inactive) | — | n/a | n/a |

> BigYes has **three active role views** wired to `identity` at login. The scene-switcher (`_scene_switcher.html`) lets stage_managers/owners preview teacher and student views without logging in as those users. `use_multirole_views: True` in live Runes enables the switcher UI.

### Role Type Values (by_clients.role_type)
| `role_type` value | Display Use |
|---|---|
| `Patron` | Default student / base member |
| `Company_Player` | Core ensemble performer (appears in cast picker) |
| `Mocatriz` | Specialized performer tier — included in `cast_performers_json` |
| `Stage_Manager` | Admin-level staff identity |
| `Trainer` | Gym carry-over (not active in BigYes) |

### Superadmin Hardcoded Set
```python
_SUPERADMIN_EMAILS = {'admin@bigyes.com', 'ella@bigyes.com', 'kiva@bigyes.com'}
```
Checked in `_build_bigyes_context()` → exposes `is_superadmin` boolean to templates.

### View-Switch Permissions
```python
_CAN_SWITCH = {'owner', 'stage_manager'}
```
Only `is_owner=True` identities or `identity_type='stage_manager'` may call `/switch-view` or `/switch-role`.

### Platform DB Identity Schema (`kotodama.db`)
- **`persons`** — platform-level login credentials (`id`, `email`, `password_hash`, `full_name`, `role`, `is_active`, `reset_token`, `reset_token_expiry`)
- **`identities`** — vessel-scoped role bindings (`id`, `person_id`, `tenant_slug`, `identity_type`, `can_view_finances`, `is_owner`)
- **`vessels`** — tenant registry (`vessel_slug`, `custom_domain`, `status`, `schema_prefix`, `arcana_tier`, `elemental_affinity`, `name`)

---

## 3 · DATABASE SCHEMA & CONCURRENCY CONSTRAINTS

### Vessel DB
- **Path:** `instances/bigyes/bigyes.db`
- **Engine:** SQLite 3 (WAL mode implied by `-shm`/`-wal` sidecar files)
- **Table prefix:** `by_` — resolved by `_p(tenant)` in `vessel_engine/db_helpers.py`:
  ```python
  def _p(tenant: dict) -> str:
      return tenant.get('arcana_tier') or tenant['schema_prefix']
  ```
- **Connection:** `get_tenant_db(vessel_slug)` — per-request connection, closed on appcontext teardown
- **SQLite concurrency note:** Single-writer constraint. Gunicorn sync workers (1 worker recommended for SQLite) avoid write contention. Do not run `--workers > 1` without WAL mode confirmed.

### Wealth Tapestry Resolution
```python
def _ledger_table(tenant):
    # Prefers by_wealth_tapestry if migrated; falls back to by_financial_ledger
    if _table_exists(db, f'{p}_wealth_tapestry'):
        return f'{p}_wealth_tapestry'
    return f'{p}_financial_ledger'
```
Current state: BigYes uses `by_financial_ledger` (legacy name; `by_wealth_tapestry` migration not yet applied).

---

### Table Schemas

#### `by_clients` — Master Roster
```
id                       TEXT  PK (UUID)
full_name                TEXT  NOT NULL
name                     TEXT  (alias)
email                    TEXT  UNIQUE
phone                    TEXT
notes                    TEXT
trainer_id               TEXT  → by_clients.id
identity                 TEXT  NOT NULL  (student|teacher|stage_manager|trainer)
role_type                TEXT  (Patron|Company_Player|Mocatriz|Stage_Manager|Trainer)
is_active                INT   NOT NULL  DEFAULT 1
must_change_password     INT   NOT NULL  DEFAULT 0
password_change_requested INT  DEFAULT 0
can_view_finances        INT   DEFAULT 0
is_volunteer             INT   DEFAULT 0
points                   INT   (yes-and points / attendance counter)
bio                      TEXT
sessions_purchased       INT
sessions_used            INT
payment_status           TEXT  (paid|pending|overdue)
next_payment_due         TEXT
monthly_fee              REAL
created_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP
deleted_at               TIMESTAMP  ← soft-delete flag
restorable_until         TIMESTAMP  ← 24-hour undo window
```

#### `by_classes` — Class / Session Registry
```
id               TEXT  PK (UUID)
title            TEXT
name             TEXT  (canonical name field)
instructor       TEXT
instructor_id    TEXT
schedule_day     TEXT  (Monday|Tuesday|...|Sunday)
schedule_time    TEXT
week_days        TEXT
term_id          TEXT  → by_terms.id
fee              REAL
capacity         INT
capacity_limit   INT
status           TEXT
is_active        INT   NOT NULL DEFAULT 1
created_at       TIMESTAMP
deleted_at       TIMESTAMP
restorable_until TIMESTAMP
```

#### `by_enrollments` — Class Membership
```
id         TEXT  PK (UUID)
client_id  TEXT  NOT NULL → by_clients.id
class_id   TEXT  NOT NULL → by_classes.id
created_at TIMESTAMP
```

#### `by_terms` — Academic Term Periods
```
id         TEXT  PK  (e.g. "by_term_spring")
name       TEXT  NOT NULL
start_date TEXT  NOT NULL  (YYYY-MM-DD)
end_date   TEXT  NOT NULL  (YYYY-MM-DD)
created_at TIMESTAMP
```
Auto-seeded with Winter/Spring/Summer/Autumn 2026 on first `/classes` load via `seed_default_terms()`.

#### `by_financial_ledger` — Wealth Tapestry (Manifestations & Sacrifices)
```
id             INT   PK (autoincrement)
amount         REAL  NOT NULL
entry_type     TEXT  NOT NULL  (revenue=Manifestation | expense=Sacrifice)
category       TEXT  NOT NULL  (subscription|one_time|inventory|overhead)
description    TEXT
user_id        INT
payment_method TEXT
is_recurring   INT   DEFAULT 0
recurring_interval TEXT  (weekly|monthly|quarterly|yearly)
next_recurrence TEXT
expense_category   TEXT
recorded_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
client_id      TEXT
```

#### `by_shows` — Performance Bookings
```
id              TEXT  PK  (prefix: "sh_" + 8-char hex)
title           TEXT  NOT NULL
day             TEXT
time            TEXT
show_type_id    TEXT  → by_show_types.id
date            TEXT  (YYYY-MM-DD)
cost            TEXT
capacity        INT   DEFAULT 0
tickets_sold    INT
revenue_override REAL
created_at      TIMESTAMP
deleted_at      TIMESTAMP
restorable_until TIMESTAMP
```

#### `by_show_types` — Show Category Taxonomy
```
id          TEXT  PK
title       TEXT  NOT NULL
description TEXT
created_at  TIMESTAMP
```

#### `by_show_cast` — Show → Performer Pivot (composite PK)
```
show_id       TEXT  NOT NULL → by_shows.id
performer_id  TEXT  NOT NULL → by_clients.id
PRIMARY KEY (show_id, performer_id)
```

#### `by_volunteer_shifts` — Stagecraft Crew Slots
```
id         TEXT  PK  (prefix: "vs_" + 8-char hex)
show_id    TEXT  NOT NULL → by_shows.id
role       TEXT  NOT NULL  (Door|Bar|House Manager — seeded on show create)
student_id TEXT  → by_clients.id  (NULL = unclaimed)
created_at TIMESTAMP
```
Default roles seeded on `create_show()`: `['Door', 'Bar', 'House Manager']`

#### `by_member_payments` — Payment Ledger
```
id                TEXT  PK (UUID)
client_id         TEXT  NOT NULL → by_clients.id
amount            REAL  NOT NULL
sessions_purchased INT
payment_date      TEXT  NOT NULL
payment_method    TEXT
notes             TEXT
status            TEXT  (paid|pending|overdue)
period_month      INT
period_year       INT
created_at        TIMESTAMP
```

#### `by_attendance` — Check-in Log
```
id             TEXT  PK (UUID)
client_id      TEXT  NOT NULL → by_clients.id
class_id       TEXT  → by_classes.id
notes          TEXT
checked_in_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```
Each recorded check-in also increments `by_clients.points += 1`.

#### `by_inbox` / `by_inbox_replies` — Internal Messaging
```
-- by_inbox
id              TEXT  PK
sender_email    TEXT  NOT NULL
sender_name     TEXT  NOT NULL
recipient_email TEXT  NOT NULL
subject         TEXT
body            TEXT  NOT NULL
is_read         INT   DEFAULT 0
created_at      TIMESTAMP

-- by_inbox_replies
id           TEXT  PK
message_id   TEXT  NOT NULL → by_inbox.id
sender_email TEXT  NOT NULL
sender_name  TEXT  NOT NULL
body         TEXT  NOT NULL
created_at   TIMESTAMP
```
Schema is lazy-created on first use by `_ensure_inbox_schema()`.

#### `by_belt_promotions` — Belt/Rank Log (legacy, inactive in school mode)
```
id          TEXT  PK
client_id   TEXT  NOT NULL
belt_rank   TEXT  NOT NULL
promoted_at TIMESTAMP
```

#### `by_challenges` / `by_challenge_responses` — Improv Exercise Engine
```
-- by_challenges
id          TEXT  PK
class_id    TEXT
difficulty  TEXT
prompt      TEXT
deployed_at TIMESTAMP
is_active   INT

-- by_challenge_responses
id            TEXT  PK
challenge_id  TEXT
student_id    TEXT
response_text TEXT
submitted_at  TIMESTAMP
```

---

### Soft-Delete & 24-Hour Undo Architecture

**Columns:** `deleted_at TIMESTAMP`, `restorable_until TIMESTAMP` on `by_clients`, `by_classes`, `by_shows`.

**Idempotent column guard:**
```python
def _ensure_soft_delete_cols(db, table_name):
    for col in ('deleted_at', 'restorable_until'):
        try:
            execute(f"ALTER TABLE {table_name} ADD COLUMN {col} TIMESTAMP", db=db)
        except Exception:
            pass  # already present — SQLite raises OperationalError, not IF NOT EXISTS
```

**Bulk soft-delete flow:**
1. `POST /api/members/bulk-delete` → JSON `{"ids": [...]}`
2. `soft_delete_members_bulk(tenant, ids)` → sets `deleted_at = now`, `restorable_until = now + 24h`
3. All `get_clients()` queries filter `WHERE deleted_at IS NULL` — row hidden immediately

**Undo restore flow:**
1. `POST /api/bulk-restore` → JSON `{"ids": [...], "entity_type": "member"}`
2. `restore_bulk(tenant, 'member', ids)` → clears flags only if `restorable_until >= now`
3. `entity_type` must equal `'member'`; shows/classes use hard delete

**User re-creation collision rescue (two-layer):**

Layer 1 — Pre-scan (`revive_soft_deleted_client`):
```python
# Called before create_client() when email is provided
revived_id = revive_soft_deleted_client(g.tenant, email)
if revived_id:
    update_client(g.tenant, revived_id, full_name=..., is_active=1)
    revive_soft_deleted_person(email, get_platform_db())
```

Layer 2 — IntegrityError rescue (`revive_and_overwrite_soft_deleted_client`):
```python
# Called inside except sqlite3.IntegrityError block in bulk upload
revived_id = revive_and_overwrite_soft_deleted_client(
    tenant, email, full_name, role_type, identity
)
# Atomic: clears soft-delete + overwrites full_name / role_type / identity in one UPDATE
# Returns None if collision is an active (not soft-deleted) record → caller skips row
```

---

## 4 · CONTROLLER ROUTING & CORE CONTROLS

### Auth Decorators (vessel_engine/auth.py)
| Decorator | Guard |
|---|---|
| `@require_vessel_auth` | Active session `vessel_person_id` + matching `vessel_slug`; blocks `kamisama` platform admins |
| `@require_finance_access` | `require_vessel_auth` + `can_view_finances=True` or `is_owner=True` |
| `@require_owner_access` | `require_vessel_auth` + `is_owner=True` only |

### Template Resolution (vessel_engine/renderer.py)
`render_vessel_template(name, **ctx)` — searches `instances/{slug}/templates/` first, falls back to global `templates/`. BigYes overrides the entire dashboard via `admin.html` presence check:
```python
def _has_instance_template(template_name):
    path = os.path.join(root_path, instances_dir, slug, 'templates', template_name)
    return os.path.isfile(path)
```

### Route Map — `vessel_engine/routes.py`

#### Auth
| Method | Route | Rate Limit | Notes |
|---|---|---|---|
| GET/POST | `/login` | 15/min | bcrypt verify; checks `identities` table for vessel scope |
| GET | `/logout` | — | Clears `vessel_person_id`, `vessel_slug` from session |
| GET/POST | `/forgot-password` | 5/min | SHA-256 token stored; raw token in email link only |
| GET/POST | `/reset-password/<raw_token>` | 10/min | Token TTL: 30 min; verified via hash-compare |
| GET | `/set-locale` | — | Sets `session['vessel_locale']`; only active when `allow_multilang=True` |

**Password reset token design:**
- `raw_token = secrets.token_urlsafe(32)` — sent in URL, never stored
- `stored_token = sha256(raw_token).hexdigest()` — stored in `persons.reset_token`
- Expiry: ISO UTC string in `persons.reset_token_expiry`

#### Dashboard
| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/dashboard` | `require_vessel_auth` | Detects `admin.html` → `_build_bigyes_context()` → BigYes-specific render; else generic `dashboard.html` |

**`_build_bigyes_context(tenant, **overrides)` builds:**
- `shows`, `shifts`, `classes`, `users` / `performers` / `students` (all aliases to same list)
- `roster_json` — full member array as JSON for JS panels
- `classes_json`, `show_types_json`, `cast_performers_json` (Company_Player + Mocatriz only)
- `week_days` / `week_sessions` — current week calendar strip
- `student_count`, `teacher_count`
- `is_superadmin` — checked against `_SUPERADMIN_EMAILS` hardcoded set

#### Client / Student CRUD
| Method | Route | Notes |
|---|---|---|
| GET | `/students` `/members` `/clients` | Archetype-aware: `school` → `students.html`; `dojo` → `members.html` |
| GET/POST | `/students/new` | Soft-delete pre-scan on email before `create_client()` |
| GET/POST | `/students/<client_id>` | Edit + deactivate/reactivate toggle |

#### Classes & Calendar Engine
| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/classes` `/schedule` | `require_vessel_auth` | Full calendar + term management |
| GET/POST | `/classes/new` | `require_vessel_auth` | Creates class; seeds enrollment JSON blobs |
| GET/POST | `/classes/<class_id>` | `require_vessel_auth` | Edit + deactivate |

**Calendar query state (`/classes`):**
```
?view=week  (default)
    ?week_start=YYYY-MM-DD  → target week Monday; defaults to today's week
    returns: calendar_days[7] with .full, .short, .label, .iso, .is_today, .sessions[]
             prev_week / next_week ISO strings
             week_label: "DD Mon – DD Mon"

?view=month
    ?month_start=YYYY-MM-DD  → 1st of target month; defaults to today's month
    returns: month_weeks[up to 6][7] with .label, .is_today, .in_month, .iso, .sessions[]
             prev_month_start / next_month_start ISO strings
             month_label: "Month YYYY"
```
Sessions injected per day from `sessions_by_day` dict built from active class `schedule_day` field.

**Enrollment context blobs:**
- `all_students_json` — students + teachers + stage_managers (identities allowed in classes)
- `all_teachers_json` — identity == 'teacher' only
- `enrollment_map` — class_id → list of enrolled user objects

#### Multi-Role View System (Major Arcana — Active on BigYes)

BigYes has **three distinct role views** hardwired into the route layer. Identity assigned on the `identities` platform table determines the landing page at login. The scene-switcher additionally lets directors preview other views.

**Identity → Landing Page (always active, no flag required):**
```
ROLE_REDIRECT = {
    'owner':         '/dashboard',       → admin.html full director panel
    'manager':       '/dashboard',       → admin.html full director panel
    'stage_manager': '/dashboard',       → admin.html full director panel
    'teacher':       '/ensemble-room',   → ensemble_room.html teacher view
    'student':       '/profile',         → profile.html student view
}
```

**How identity drives view at login (`vessel_engine/auth.py`):**
1. Login validates `persons` + `identities` rows
2. `identity.identity_type` → stored in `g.current_identity`
3. `session.get('vessel_active_role')` → checked for override (only if set by scene switcher)
4. `g.original_identity_type` → always stores the real DB identity, even while previewing

**Scene-Switcher (Major Arcana UI — `use_multirole_views: True`):**

| Method | Route | Guard | Behaviour |
|---|---|---|---|
| GET | `/switch-role/<role>` | owner or stage_manager only | Sets `session['vessel_active_role']`; switching to `owner` pops the override |
| GET | `/switch-view/<role>` | owner or stage_manager only | Alias used by `_scene_switcher.html` partial |

```python
VALID_ROLES = {'owner', 'stage_manager', 'teacher', 'student', 'manager'}
_CAN_SWITCH  = {'owner', 'stage_manager'}
```

`_can_switch_view()` reads `g.original_identity_type` (real DB identity, not session-overridden) — prevents privilege escalation while previewing a lower role.

**`renderer.py` flags surfaced to all templates:**
- `is_sm_user` — True if owner or original_type == 'stage_manager'; controls scene-switcher visibility even while previewing teacher/student view
- `is_owner` — True if `identity.is_owner`
- `is_stage_manager` — True if active_role == 'stage_manager'
- `can_view_finances` — True if owner OR `identity.can_view_finances`

#### BigYes Backstage Routes (Stage Manager / Director View)
| Route | Template | Notes |
|---|---|---|
| `/backstage/callboard` | `callboard.html` | Student view: classes + roster + mail logs |
| `/backstage/shows` | `admin.html` | Show bookings panel; builds `shows_with_cast_json` from `by_show_cast` join |
| `/backstage/scene-library` | `scene_library.html` | Scene/improv library (stub) |
| `/backstage/reports` | `reports.html` | Reporting stub |
| `/backstage/activity-log` | `activity_log.html` | Filterable log (role, name, date_from, date_to) |
| `/backstage/finances` | `finances.html` | Ledger + class/show revenue breakdown |
| `/backstage/comms` | `comms.html` | Blast messaging — all members + class filter |
| `/performers` | `admin.html` | `show_roster=True` context override |
| `/ensemble-room` | `ensemble_room.html` | Teacher view — enrollment map per class, week strip |

#### Ensemble Room (`/ensemble-room`) Context
- `classes` / `active_classes` / `past_classes` — shaped with `sched`, `cap`, `term`, `room` aliases for JS template consumption
- `classes_json` — full serialized class list for AlpineJS panels
- `all_students_json` — pickable members for class enrollment modal
- `week_days` — 7-day strip with `.classes[]` per day for calendar display

#### Financials (Wealth Tapestry)
| Route | Guard | Notes |
|---|---|---|
| `/financials` | `require_finance_access` | Filters: `?month`, `?year`, `?date_from`, `?date_to`, `?tab` |
| `/financials/new` | `require_finance_access` | POST: `entry_type` ∈ (revenue\|expense), `category` ∈ (subscription\|one_time\|inventory\|overhead) |
| `/financials/payment/new` | `require_finance_access` | Gym archetype member payment; updates `by_clients.payment_status` |
| `/financials/payment/<id>/mark` | `require_finance_access` | Toggle payment record status |
| `/financials/member/<id>/mark` | `require_finance_access` | Quick-mark member payment_status |
| `/api/financials/message-unpaid` | `require_finance_access` | Bulk email to overdue/pending members via Resend |

#### API Endpoints — Roster
| Method | Route | Guard | Notes |
|---|---|---|---|
| POST | `/api/person/create` | `require_vessel_auth` | 3-table atomic write: `by_clients` + `persons` + `identities`; sets `must_change_password=1` |
| POST | `/api/person/update-details` | `require_vessel_auth` | Updates `full_name`, `bio` |
| POST | `/api/person/set-role` | `require_vessel_auth` | Updates `identity` + `role_type` |
| POST | `/api/person/set-active` | `require_vessel_auth` | Toggles `is_active` |
| POST | `/api/person/set-financial-access` | `require_owner_access` | Toggles `can_view_finances` |
| POST | `/api/person/request-password-change` | `require_vessel_auth` | Sets `password_change_requested=1` |
| POST | `/api/person/bulk-upload` | `require_vessel_auth` | CSV/XLSX or JSON; handles soft-delete collision; provisions platform credentials |

**Bulk upload password logic:**
- Column `passwords` or `password` in sheet → bcrypt-hashed to `persons.password_hash`; `must_change_password=1` set
- Absent → falls back to `VESSEL_INIT_PASSPHRASE` env; `must_change_password=1` still set

**`_provision_platform_person()` — 3-table write:**
1. `INSERT OR IGNORE INTO persons` (preserves existing hash)
2. Re-fetch authoritative `person_id`
3. `INSERT OR IGNORE INTO identities` with `vessel_slug` + `identity_type`

#### API Endpoints — Shows & Bookings
| Method | Route | Notes |
|---|---|---|
| POST | `/api/show/create` | Creates show + seeds 3 default volunteer shifts (Door, Bar, House Manager) + optional cast |
| POST | `/api/show/update/<id>` | Whitelist: title, day, time, show_type_id, date, cost, capacity, tickets_sold, revenue_override |
| POST | `/api/show/delete/<id>` | Hard delete: cascades to `by_volunteer_shifts` + `by_show_cast` |
| POST | `/api/shows/delete-all` | Purges all shows + related rows |
| GET | `/api/backstage/shows` | JSON list |
| POST | `/api/backstage/sync-classes` | Scrapes live site via `scripts/scrape_bigyes.py` |
| POST | `/api/backstage/box-office/sync` | Scrapes show listings from live site |
| POST | `/api/shows/sync-booking` | Syncs sold-out status |

#### API Endpoints — Bulk Delete / Restore
| Method | Route | Payload | Notes |
|---|---|---|---|
| POST | `/api/members/bulk-delete` | `{"ids": [...]}` | Soft-delete; 24h window |
| POST | `/api/bulk-restore` | `{"ids": [...], "entity_type": "member"}` | Clears flags if within window |

#### API Endpoints — Volunteer / Shifts
| Method | Route | Notes |
|---|---|---|
| POST | `/api/volunteer/designate` | Sets `is_volunteer=1` |
| POST | `/api/volunteer/remove` | Sets `is_volunteer=0` |
| POST | `/api/shift/admin-assign` | Sets `by_volunteer_shifts.student_id`; pass `null` to unassign |

---

## 5 · DESIGN SYSTEM — BigYes "Classy Witches" Grimoire Aesthetic

### Font Stack
| Role | Family | Weight |
|---|---|---|
| Display / Headers | Archivo Black | 900 |
| UI Sans | Archivo | 400–900 |
| Body Copy | Manrope | 400–700 |
| Mono / Eyebrow | DM Mono | 400–500 |

### Design Token Reference (CSS Custom Properties)
```css
/* Surfaces */
--by-bg:        #F4EEE2  /* warm parchment — page ground */
--by-bg-2:      #ECE3D0  /* alt rows, card panels */
--by-bg-3:      #E2D6BB  /* dividers, dashed rules */

/* Ink */
--by-ink:       #141210  /* primary text + all borders */
--by-ink-2:     #2A2723  /* body text on paper */
--by-ink-3:     #5C544A  /* muted / captions */
--by-ink-4:     #8A8073  /* hint / disabled */

/* Brand */
--by-yes:       #FFC629  /* marigold — CTAs, active nav, yes-block */
--by-yes-deep:  #E5A800  /* pressed / hover */
--by-yes-soft:  #FFE7A0  /* large background washes only */

/* Status */
--by-tomato:      #E5482A  /* errors, LIVE pulse — never decorative */
--by-tomato-deep: #B83218

/* Dark surfaces */
--by-night:      #141210
--by-night-soft: #1E1B17
--by-night-on:   #C9BFA8  /* muted text on dark */

/* Border shortcuts */
--by-bd:       1px solid #141210
--by-bd-thick: 1.5px solid #141210
--by-bd-soft:  1px solid #E2D6BB
--by-bd-dash:  1px dashed #E2D6BB

/* Hard offset shadow (brand lift — hover only) */
--by-sh-1:   4px 4px 0 0 #141210
--by-sh-yes: 4px 4px 0 0 #FFC629

/* Motion */
--by-snap:  120ms cubic-bezier(.2,.8,.2,1)
--by-stamp: 180ms cubic-bezier(.7,0,.2,1.4)

/* Border radius */
--by-r-1:    4px
--by-r-2:    10px
--by-r-pill: 999px
```

### Tailwind Extension (inline CDN config in `base.html`)
```js
tailwind.config = {
  theme: { extend: {
    fontFamily: {
      display: ["'Archivo Black'", ...],
      sans:    ["'Archivo'", ...],
      body:    ["'Manrope'", ...],
      mono:    ["'DM Mono'", ...],
    },
    colors: {
      'by-yes': '#FFC629', 'by-yes-deep': '#E5A800', 'by-yes-soft': '#FFE7A0',
      'by-ink': '#141210', 'by-ink-2': '#2A2723', 'by-ink-3': '#5C544A', 'by-ink-4': '#8A8073',
      'by-bg':  '#F4EEE2', 'by-bg-2': '#ECE3D0', 'by-bg-3': '#E2D6BB',
      'by-tomato': '#E5482A', 'by-tomato-deep': '#B83218',
      'by-night': '#141210', 'by-night-on': '#C9BFA8',
    },
    boxShadow: {
      'by-hard':     '4px 4px 0 0 #141210',
      'by-hard-yes': '4px 4px 0 0 #FFC629',
    },
  }}
}
```

### High-Visibility Roster Checkbox (global override in `base.html`)
Applied to all `input[type="checkbox"]:not(.sr-only)` — excludes toggle-peer checkboxes:
```css
input[type="checkbox"]:not(.sr-only) {
  -webkit-appearance: none;
  appearance: none;
  width: 15px; height: 15px;
  flex-shrink: 0;
  border: 2px solid #000;        /* hard black border always */
  border-radius: 3px;
  background: var(--by-bg);
  cursor: pointer;
  position: relative;
  transition: background var(--by-snap), box-shadow var(--by-snap);
  vertical-align: middle;
}
input[type="checkbox"]:not(.sr-only):checked {
  background: #FACC15;           /* yellow-400 fill on checked */
  border-color: #000;
}
/* Checkmark: rotated L-shape (not a unicode glyph) */
input[type="checkbox"]:not(.sr-only):checked::after {
  content: '';
  position: absolute;
  left: 3px; top: 0px;
  width: 5px; height: 9px;
  border: 2.5px solid #000;
  border-top: none; border-left: none;
  transform: rotate(45deg);      /* rotated L = checkmark */
}
input[type="checkbox"]:not(.sr-only):focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px #fff, 0 0 0 4px #000;  /* double ring for contrast */
}
input[type="checkbox"]:not(.sr-only):hover:not(:checked) {
  background: var(--by-bg-3);
}
```
**Rationale:** Yellow fill (#FACC15) + black border ensures checkboxes remain visible against parchment (`#F4EEE2`) and zebra-stripe (`#ECE3D0`) panel backgrounds without depending on browser defaults.

### Key UI Classes
| Class | Purpose |
|---|---|
| `.by-display` | Archivo Black, 900, uppercase, tight leading |
| `.by-eyebrow` | DM Mono, 11.5px, 0.14em tracking, uppercase muted |
| `.by-yes-block` | Inline marigold highlight block, skew(-6deg) |
| `.by-menu-item` | Dropdown item — hover uses `--by-bg-2` |
| `.by-select-wrap` | Custom select wrapper with CSS chevron |
| `shadow-by-hard` | Hard offset shadow (Tailwind alias) |
| `shadow-by-hard-yes` | Marigold hard shadow (Tailwind alias) |

### Select Reset (global in `base.html`)
All `<select>` elements get `appearance: none` + custom SVG arrow via `background-image`; focus ring = `box-shadow: 0 0 0 2px var(--by-yes)`.

---

## 6 · TEMPLATE MAP

### Instance Templates (`instances/bigyes/templates/`)
| Template | Route(s) | Role | Notes |
|---|---|---|---|
| `base.html` | — | Layout shell | Tokens, fonts, checkbox override, global select reset |
| `login.html` | `/login` | All | Rate-limited; supports `?reset=1` flash |
| `admin.html` | `/dashboard`, `/performers`, `/backstage/shows` | Director | Main BigYes control panel — roster, shows, calendar, financials panels |
| `backstage_layout.html` | — | Backstage | Layout shell for backstage section pages |
| `callboard.html` | `/backstage/callboard` | Student | Class list + comms |
| `ensemble_room.html` | `/ensemble-room` | Teacher | Class roster + week calendar |
| `classes.html` | `/classes` | Director | Calendar (week/month) + cohort management + term cards |
| `finances.html` | `/backstage/finances` | Director | Ledger + class/show revenue |
| `financials.html` | `/financials` | Finance-access | Full Wealth Tapestry with KPIs |
| `comms.html` | `/backstage/comms` | Director | Blast messaging panel |
| `scene_library.html` | `/backstage/scene-library` | Director | Improv scene library |
| `reports.html` | `/backstage/reports` | Director | Reporting |
| `activity_log.html` | `/backstage/activity-log` | Director | Filterable activity feed |
| `profile.html` | `/profile` | Student | Own profile, enrolled classes, shows/shifts |
| `settings.html` | `/settings` | All | Account settings |
| `privacy.html` | `/privacy` | Public | Privacy policy |
| `403.html` | — | — | Forbidden error page |

### Partials (`instances/bigyes/templates/partials/`)
| Partial | Purpose |
|---|---|
| `_sidebar.html` | Navigation sidebar with role-aware nav items |
| `_header_user_pill.html` | Top-right user identity pill |
| `_scene_switcher.html` | Role-view switcher dropdown (owners/stage_managers) |
| `_inbox_btn.html` | Unread message badge button |
| `_inbox_modal.html` | Slide-over inbox panel |
| `_kpi_card.html` | Reusable KPI metric card component |
| `_stat_row.html` | Horizontal stat row component |
| `_byselect.html` | Custom select component injected globally via `base.html` |
| `_activity_feed.html` | Activity log feed component |
| `_forced_pw_modal.html` | First-login forced password change modal |
| `_user_config_modal.html` | User settings/config slide-over |
| `_shows_bookings_js.html` | AlpineJS show bookings panel JS |

---

## 7 · KEY HELPER MODULES

### `vessel_engine/db_helpers.py`
All functions accept `tenant: dict` as first arg. SQL injection prevented by:
1. Table names built from `_p(tenant)` — trusted internal value, not user input
2. All values passed as positional `?` parameters

| Function | Purpose |
|---|---|
| `_p(tenant)` | Returns table prefix (`arcana_tier` or `schema_prefix`) |
| `_db(tenant)` | Returns vessel DB connection |
| `_ledger_table(tenant)` | Resolves Wealth Tapestry table name |
| `_table_exists(db, name)` | Safe table existence check via `sqlite_master` |
| `_ensure_soft_delete_cols(db, table)` | Idempotent ADD COLUMN guard |
| `get_clients_as_users(tenant)` | Full roster shaped for BigYes `admin.html` — includes enrolled_classes, initials, tint, identity labels |
| `update_client_extended(tenant, id, **fields)` | Allowlist-filtered UPDATE on extended client fields |
| `soft_delete_members_bulk(tenant, ids)` | 24-hour soft-delete window |
| `restore_bulk(tenant, 'member', ids)` | Clears soft-delete within window |
| `revive_soft_deleted_client(tenant, email)` | Pre-creation email collision scan |
| `revive_and_overwrite_soft_deleted_client(tenant, email, ...)` | IntegrityError rescue — atomic purge + attribute overwrite |
| `seed_default_terms(tenant)` | Inserts Winter/Spring/Summer/Autumn 2026 if table empty |
| `get_financial_kpi(tenant)` | Returns `total_revenue`, `total_expenses`, `net`, `mrr`, `by_category` |
| `get_reporting_kpi(tenant)` | Full business/retention/expansion KPI dict for reporting dashboard |

### `vessel_engine/auth.py`
- `require_vessel_auth` — session check + `is_kamisama()` block
- `require_finance_access` — owner or `can_view_finances`
- `require_owner_access` — `is_owner` only

### `vessel_engine/renderer.py`
- `render_vessel_template(name, **ctx)` — instance-first template resolution

### `vessel_engine/skiils.py`
Note: filename has typo (`skiils.py` not `skills.py`) — do not rename without checking imports.

---

## 8 · SCRIPTS & TOOLING

| Script | Purpose |
|---|---|
| `scripts/seed_bigyes.py` | Seeds initial roster + classes into `bigyes.db` |
| `scripts/scrape_bigyes.py` | Scrapes live BigYes site for shows + class sync |
| `scripts/provision_new_instance.py` | Scaffolds a new vessel submodule |
| `scripts/export_vessel_data.py` | Exports vessel DB data |
| `scripts/migrate_bigyes_dojodesk.py` | One-time migration from legacy mono-app |
| `backup_cron.py` | Background scheduler — runs on `python app.py` (dev only, not gunicorn) |
| `vessel_backup_restore.py` | 7z backup + restore utilities |
| `initialize_tables.py` | Platform DB schema initializer |
| `db_init.py` | `migrate_persons_reset_columns()` — idempotent reset-token column migration, runs every cold start |

---

## 9 · CONCURRENCY & DEPLOYMENT NOTES

- **SQLite WAL mode:** Confirmed active (`bigyes.db-shm` + `bigyes.db-wal` sidecar files present). Supports concurrent reads; single writer per DB file.
- **Gunicorn config:** `gunicorn.conf.py` present. Keep `workers=1` per vessel DB to avoid write contention unless WAL mode is explicitly verified with concurrent write tests.
- **Platform DB (`kotodama.db`):** Shared across all vessels. All platform writes (persons, identities, vessels) must account for this single-writer constraint.
- **Backup cadence:** `backups/bigyes/` — 7z archives, named `bigyes_YYYYMMDD_HHMMSS.7z`
- **Git submodule:** `instances/bigyes/.git` is a pointer file (standard submodule). Always `cd instances/bigyes && git commit` for vessel-specific changes; never commit vessel files from the kotodama root.
