# JVD Design Direction — from the Figma References

**Date:** 2026-07-04 · Companion to `SYSTEM_AUDIT_AND_REFACTOR_PLAN.md` (Phase 3)
**Sources reviewed in Figma (view access confirmed):**

| File | What it is | What we take from it |
|---|---|---|
| **Micro-Dashboard** (5 frames, 1920×962, dark) | Dark project-management dashboard with a smart-animate feature-spotlight sequence | Dark theme, dashboard layout, motion language |
| **Design-2025** (5 frames, 1440×770, light, "linkd") | Applicants management app: home (empty + populated) and a 3-step modal flow | Light theme, list/row patterns, modal wizard, empty states |
| **Dashboard Flaws** (8 frames, 1440×792, light) | Notion/Attio-style Employee Management System: data table, incident analytics, activity drawer, share popover, onboarding cards | Data tables, drawers, popovers, onboarding, stats/charts |

Together these define one coherent design language — the **Linear/Notion/Attio school**: neutral surfaces, one accent color, pill badges, rounded-16 cards, soft wide shadows, data-dense typed tables, right-side detail drawers, compact centered modals, ⌘K quick actions, and short smart-animate transitions. This document turns that into concrete tokens and components for the JVD frontend.

---

## 1. Design Tokens (→ Tailwind v4 `@theme` in `frontend/src/index.css`)

### 1.1 Color — light theme (primary; from Design-2025 + Dashboard Flaws)

| Token | Value (approx from Figma) | Use |
|---|---|---|
| `--color-bg` | `#FAFAFA` | App background |
| `--color-surface` | `#FFFFFF` | Cards, tables, modals |
| `--color-surface-muted` | `#F5F5F5` | Sidebar, table header, input bg |
| `--color-border` | `#E8E8E8` | Hairline borders everywhere (1px, never darker) |
| `--color-text` | `#171717` | Primary text |
| `--color-text-muted` | `#737373` | Secondary text, descriptions, timestamps |
| `--color-primary` | `#171717` (near-black) | Primary buttons ("Create Listing", "Add", "Send") — **black pills, not blue** |
| `--color-accent` | `#1D4ED8` (JVD Blue, deepened) | The ONLY interactive/brand color: links, active nav, focus, selected rows, progress, charts |
| `--color-success` | `#16A34A` on `#DCFCE7` | "Active", "approved" pills |
| `--color-warning` | `#D97706` on `#FEF3C7` (JVD Yellow → amber) | "pending", expiring — warning states ONLY |
| `--color-danger` | `#DC2626` on `#FEE2E2` (JVD Red) | Destructive, errors, overdue — danger states ONLY |

> **Brand mapping:** JVD's trademark red/blue/yellow triad is used *semantically*, never decoratively — blue = interactive, red = danger, yellow = warning; the full triad appears only in the logo, login accent, and report letterheads. Full rationale and uniformity rules: `PRODUCT_IMPROVEMENT_SPEC.md` §1.

### 1.2 Color — dark theme (from Micro-Dashboard; maps to existing ThemeContext dark mode)

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#000000` | App background (true black) |
| `--color-surface` | `#0D0D0D`–`#141414` | Cards with `#262626` hairline borders |
| `--color-text` | `#FAFAFA` / muted `#8A8A8A` | |
| `--color-accent` | `#3B82F6` (vivid blue) | Timeline bars, active states, send buttons |

### 1.3 Shape, elevation, spacing

- **Radius:** cards/modals **14–16px**, inputs/buttons **10–12px**, pills **9999px**, table rows **8px**. (Measured: Share Popover 14.17px, Onboarding cards 12px.)
- **Shadow (floating elements only — popovers, modals, drawers):** `0 4px 100px rgba(0,0,0,0.15)` — soft, huge blur, near-zero offset. Cards on the canvas get **border, not shadow**.
- **Borders over shadows** for resting elements; elevation is reserved for things that float.
- **Spacing:** 16px base padding (Figma padding blocks read 16/8/16); dense tables 8px vertical; page gutters 24–32px.
- **Buttons:** pill or 10px radius; primary = solid near-black (light) / white-on-dark; secondary = 1px border, transparent fill; heights ~36px.

### 1.4 Typography

- One grotesque sans throughout (Inter or Geist; the Figma uses an Inter-class face).
- Page title ~22–24px semibold with a one-line muted description under it (see "Employee Management System" / "Incident Tracking" headers).
- Table/body 13–14px; labels/timestamps 12px muted.
- Big stat numbers (dashboard) ~28–32px semibold with a muted unit label ("214 Total").

### 1.5 Motion (from Micro-Dashboard's prototype settings + Micro-Animations)

Figma interactions read: **Smart animate, ease-in-and-out, 1000ms, staged delays 600–1600ms** for the showcase. For a working app, scale that down:

- **Standard easing:** `cubic-bezier(0.4, 0, 0.2, 1)` everywhere.
- **Durations:** hover/press 120–150ms · dropdown/popover 180ms · modal/drawer 250–300ms (fade + 8px slide/scale-from-98%) · page content 200ms fade-up with 30–50ms per-item stagger on lists.
- **Skeletons, not spinners:** the Drawer frame shows gray skeleton blocks behind the drawer — use skeleton placeholders shaped like the final content for all loading states.
- Implement with `framer-motion` (already installed): one `<AnimatePresence>` wrapper per Modal/Drawer/Toast, a shared `stagger` variant for lists. No bespoke animation code in pages.

---

## 2. Component Library (build in `components/ui/`, one PR each)

Each maps directly to something visible in the Figma files:

| # | Component | Spec (from Figma) | Replaces in JVD today |
|---|---|---|---|
| 1 | **AppShell / Sidebar** | Fixed left sidebar on muted bg: workspace block (logo + org + chevron), "Quick actions ⌘K" row, nav items w/ icon + label + optional "New"/count badge, active item = filled soft-gray rounded row; Help Center pinned bottom | Current layout in `components/layout/` |
| 2 | **CommandPalette** | ⌘K opens search-everything dialog (nav, actions, entities) | New — the single biggest "feels professional" win |
| 3 | **DataTable** | Header: breadcrumb, title + muted description, tab bar (entity views + "+"), toolbar right (sort ↕, filter, view, search, customize, black **Add** pill). Body: checkbox col, typed column headers w/ icons, colored category dots, status pills, inactive rows grayed w/ strikethrough, row hover reveals actions, kebab menu | Every hand-rolled table (Employees, Users, Invoices, TripTickets…) |
| 4 | **ListRow card** | Design-2025 pattern: white rounded row, title + status pill, subtitle w/ icon + date, right-side ghost action buttons (☆ Shortlist / ✉ Outreach analogs) + kebab | HR Applications, task lists, approval queues |
| 5 | **StatusPill** | Colored pill, lowercase label, tinted bg + strong text (green/yellow/red/indigo) | `StatusBadge.tsx` (restyle) |
| 6 | **Modal (wizard-capable)** | Compact centered card ~360–420px, radius 16, title left, optional search field, content list, footer = ghost secondary left + solid black primary right; supports multi-step (Choose template → Compose → Confirm) | `Modal.tsx` + sweetalert2 usages |
| 7 | **Drawer** | Right-side panel: title + close, info banner (tinted blue, rounded), vertical activity timeline (dot + title + timestamp, nested detail card w/ avatar rows, dataset tags, summary, action link) | `EntityPreviewPanel.tsx` — extend, don't replace |
| 8 | **SharePopover** | Invite input + role dropdown + Invite btn; "General access" rows w/ icon + title + subtitle; people list w/ per-person role dropdown; footer link + black "Copy Link" btn | Portal-link sharing, document sharing |
| 9 | **StatCard + Chart** | Big number + muted label + "View all >", indigo bar chart (rounded tops, hairline gridlines, muted axis) via existing `recharts` | Dashboard widgets in `pages/dashboards/` |
| 10 | **EmptyState** | Centered: bold one-liner ("No applicants yet"), muted explanation, primary black CTA + ghost "Learn more" | Every blank table/list today |
| 11 | **OnboardingChecklist** | Floating card: "Getting started" title + collapse, checklist w/ filled-blue done circles, "Watch tutorial" ghost row, footer "4 of 6 complete" + indigo progress bar | New — user onboarding for each module |
| 12 | **FeatureCallout / Tooltip card** | Small card (≈184×195): illustration, bold title, muted body, "Dismiss" dark button; + "New Feature" changelog card w/ date + NEW badge | Release announcements after refactor phases |
| 13 | **Toast** | Single system (react-hot-toast, restyled to tokens) | Kills the sweetalert2/toast split |
| 14 | **GanttTimeline** (later) | Micro-Dashboard's project overview: phase columns w/ blue range bar + milestone dots w/ date labels | Travel bookings / trip scheduling views |

**Rules:** pages compose these and never hand-roll tables, modals, pills, or empty states again. One icon set (`lucide-react`), delete `react-icons` as pages migrate. Storybook (or a simple `/design` route) renders every component in all states.

---

## 2.1 Surface Decision Guide — modal vs drawer vs page vs toast

**Current state (measured):** 38 pages use the shared `Modal`, 22 pages hand-roll their own `fixed inset-0` overlays (most without max-height → the "content won't fit" bug), 10 `Swal.fire` calls still exist alongside 291 `toast` calls, and only `EntityPreviewPanel` behaves like a drawer. Everything else pops dead-center regardless of what it is. These rules make the choice mechanical:

**Ask one question: what is the user doing?**

| Surface | Use when | Size/behavior | Never for |
|---|---|---|---|
| **Toast** | Reporting an outcome; no decision needed ("Invoice saved") | Auto-dismiss ~4s, top-right; only button allowed is Undo | Errors needing action; anything with a form |
| **ConfirmDialog** (small centered) | ONE irreversible yes/no ("Delete this supplier?") | ≤400px; title + one sentence + Cancel/ghost + action button (red if destructive) | Forms; multi-choice; info dumps |
| **Modal** (centered, compact) | Creating or completing **one small thing**: quick-add record, a wizard step (the Design-2025 flow) | Widths 400/480/560; `max-h-[85vh]` with sticky header/footer and scrollable body; radius 16px | Anything with tabs, tables, or >~6 fields; editing existing records with context |
| **Drawer** (slides from the **right**) | Viewing/acting on an **existing record without leaving the list**: entity preview, approval detail + workflow timeline, activity/audit history, filters, notifications panel | 400–560px wide, full height, scrollable, list stays visible behind (the Figma "Proposal Activity" pattern) | Creating brand-new complex records; primary navigation |
| **Full page** (route) | Anything complex: >6–8 fields, multi-section forms, embedded tables, needs a shareable URL/back button (invoice creation, contract builder, payroll run, checkout) | Normal route with breadcrumb | — |

*(Note: drawers slide from the **right** — the left edge belongs to the nav sidebar. The Figma reference drawer is right-side too.)*

**Escalation rules (these catch 90% of today's misuse):**
1. If a modal needs to scroll a lot, grow tabs, or open **another** modal → it should have been a **page** (or the second step of a wizard). Nested modals are banned.
2. If the user needs to see the list/table while working → **drawer**, not modal.
3. If nothing is being asked of the user → **toast**, not a dialog. (This retires all 10 sweetalert2 success/error popups: outcomes → toast, confirmations → ConfirmDialog.)
4. One overlay at a time; a drawer may spawn a ConfirmDialog, nothing else.
5. All overlays: Esc + overlay-click to close (blocked only mid-destructive-action), focus trap, body scroll lock — provided by the shared components, which is why hand-rolling is banned.

**Migration:** delete `sweetalert2` (10 call sites → ConfirmDialog/toast); convert the 22 hand-rolled overlays to shared `Modal`/`Drawer` as each page is redesigned; retag current center-modals that are really record-detail views (approvals, previews, document views) as drawers; normalize `Modal` radius from `2.5rem` to 16px per §1.3.

---

## 3. Mapping to JVD Screens (Phase 3 order)

1. **Login / 2FA / Set-password** — first impression; centered card on `--color-bg`, black pill CTA, motion on transitions between steps.
2. **App shell + sidebar + ⌘K** — restyles every page at once; biggest visible jump.
3. **Dashboards** — StatCard + Chart + activity feed (Micro-Dashboard layout, light theme by default, dark theme supported).
4. **HR Employees** — the Dashboard-Flaws Employment Table is literally this screen (departments, active/inactive, payroll tabs). Build DataTable here first.
5. **HR Applications** — Design-2025 is literally this screen (applicants, shortlist/outreach, listing wizard). Use ListRow + Modal wizard.
6. **Sales checkout + contracts** — Modal wizard + SharePopover (portal links) + Drawer (contract activity timeline).
7. **Accounting / Travel / Logistics / the rest** — DataTable + Drawer + EmptyState conversions, module by module.

---

## 4. Practical notes

- The files are **view-only** for our account (`m=dev` Dev Mode inspect requires an editor seat — "Request access" if exact px/hex exports are wanted; the values above were read visually and from the properties panel and are close enough to start).
- The "micro"/"linkd" branding in the references is template branding — swap in JVD identity (logo, brand accent) at the AppShell level via tokens, nothing else changes.
- Light theme is the default for the working app (all data-dense references are light); the Micro-Dashboard dark theme becomes the polished dark mode for the existing ThemeContext toggle.
- Every component lands with its states (default/hover/active/disabled/loading/empty/error) before any page migrates — that's what makes the app feel designed rather than themed.
