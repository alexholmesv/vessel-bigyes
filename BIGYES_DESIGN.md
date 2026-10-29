# BigYes Design Language

## Color Palette

**Surface** (warm paper)
- `--bg`: #F4EEE2 (page bg)
- `--bg-2`: #ECE3D0 (deep)
- `--bg-3`: #E2D6BB (dividers)

**Ink** (text/borders)
- `--ink`: #141210 (primary)
- `--ink-2`: #2A2723 (darker body)
- `--ink-3`: #5C544A (muted)
- `--ink-4`: #8A8073 (hint)

**Signature** (marigold yellow)
- `--yes`: #FFC629 (primary accent)
- `--yes-deep`: #E5A800 (pressed)
- `--yes-soft`: #FFE7A0 (secondary)

**Secondary** (tomato red)
- `--tomato`: #E5482A (alert/danger)
- `--tomato-deep`: #B83218 (pressed)

**Stage** (hero/inversion)
- `--night`: #141210 (dark bg)
- `--night-soft`: #1E1B17 (dark bg alt)

## Typography

- **Display**: Archivo Black
- **Sans**: Archivo
- **Body**: Manrope
- **Mono**: DM Mono

## Spacing (4px base)

s-1: 4px | s-2: 8px | s-3: 12px | s-4: 16px | s-5: 24px | s-6: 32px | s-7: 48px | s-8: 64px | s-9: 96px

## Radii

- r-1: 4px (tight)
- r-2: 10px (standard)
- r-pill: 999px (pill/circle)

## Accessibility — ND Mode

Neurodivergent-friendly mode: reduced visual density, calmer visuals, one action at a time,
visible completion feedback. Toggled per-person from a compact switch in the top navbar on
every authenticated view (Phase 7.4f -- moved off the profile page), persisted on the platform
`persons.accessibility_mode` column.

**Mechanism:**
- `<html data-mode="{{ 'nd' if nd_mode else 'standard' }}">` on every BigYes template with its
  own `<html>` (11 templates total — base, admin, classes, ensemble_room, 403,
  backstage_layout, backstage_volunteer_shifts, comms, login, profile, volunteer_shifts).
- All 11 now load `static/css/nd-mode.css`, scoped under `[data-mode="nd"]`.
- Toggle endpoint: `POST /api/me/accessibility-mode` (`vessel_engine/routes/accessibility.py`).

**Status (as of Phase 7.4g):** attribute + stylesheet link wired everywhere. `nd-mode.css`
now has reduced motion (7.4b), soften-keep-brand calm visuals (7.4b), and per-size
font-size/line-height overrides for every text-[Npx]/leading-* value actually used across the
templates (7.4c). The toggle lives in the top navbar on every authenticated view, not a
profile-page card (7.4f). The Dashboard homepage (`/dashboard`, nd_mode only) has a guided
"what do you want to do?" action box with keyword-matched quick actions (7.4g). Still open:
completion-feedback styling (7.4d) and step-by-step one-action-at-a-time forms (7.4e+). See
MASTER_PLAN.md Phase 7 for the full breakdown.
