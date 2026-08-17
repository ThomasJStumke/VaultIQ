---
name: VaultIQ
description: Academic compliance and governance platform — "Digital Fortress" dark academia / cyber-governance visual language.
colors:
  background: "#020617"
  surface: "#0f172a"
  surface-2: "#1e293b"
  border: "rgba(255,255,255,0.10)"
  foreground: "#ffffff"
  muted-foreground: "#94a3b8"
  subtle-foreground: "#64748b"
  accent-indigo: "#6366f1"
  status-success: "#34d399"
  status-warning: "#fbbf24"
  status-danger: "#f87171"
  status-info: "#60a5fa"
  status-ai: "#a78bfa"
typography:
  heading:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 900
    letterSpacing: "-0.05em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 500
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  glass-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

## Overview
VaultIQ is institutional governance tooling for university academic compliance: tracking evidence artifacts, staff, and student evaluation data across a role-tiered audience (Lecturer → HOD → Faculty Admin → Executive Dean → DVC/CQPA). The visual language is deliberately "Dark Academia / Cyber-Governance": deep slate backgrounds, glassmorphic cards, and a Royal Indigo accent, intended to read as authoritative and precise rather than playful. Light mode is a fully-specified counterpart, not an afterthought — every token has a light-mode override in `src/index.css`.

## Colors
- **Background:** Deep slate (`#020617` dark / `#f8fafc` light).
- **Surface:** Glassmorphic cards — `backdrop-blur-xl` with hairline `white/5` (dark) or `slate/10` (light) borders.
- **Accent:** Royal Indigo (`#6366f1`) for primary actions and interactive emphasis; used consistently across modules (compliance engine, file vault, staff, evaluations) rather than per-screen ad hoc.
- **Status:** Emerald = compliant/verified, Amber = warning/pending, Rose/Red = non-compliant/critical, Blue = informational, Violet = AI-assisted actions.
- All Tailwind palette shades used in components resolve through CSS variables (`--accent-400`, `--emerald-400`, etc.), so a single edit in `index.css` re-themes the whole app — components must never hardcode literal hex values in place of a token.

## Typography
- **Headings:** Inter Extra Bold/Black, `tracking-tighter` — a "newspaper headline" register for executive reports and section titles.
- **Body/UI:** Inter Medium for legibility across dense data grids.
- **Data/Mono:** JetBrains Mono for audit tokens, SHA-256 hashes, and file paths, to visually separate technical/immutable values from prose.

## Layout
- Dashboard/table-first density: sidebar navigation with role-scoped items, content area organized into KPI rows above tabular/list detail.
- Executive dashboards use 4-column KPI grids that collapse to a single column on mobile.

## Elevation & Depth
- The glass card (`backdrop-blur-xl`, `border-white/5`, soft drop shadow) is the one container primitive — used for panels, modals, and list rows. Depth comes from blur and hairline borders, not stacked drop shadows.

## Shapes
- Rounded corners scale from `rounded-lg`/`rounded-xl` on interactive controls to `rounded-2xl`/`rounded-3xl` on cards and modals — consistently large radii reinforce the "vault/panel" feel.

## Components
- **Glass Card:** primary content container (`.glass-card` utility class in `index.css`).
- **Status Pill/Badge:** small uppercase, high-tracking labels tinted by status color (success/warning/danger/info) — used for compliance and role states.
- **Pulse Metric:** `animate-pulse` on icons/badges signaling active risk or an in-progress/live state (e.g. sandbox mode, unread items, drag targets). Standardized during this pass — `animate-bounce` occurrences were replaced with `animate-pulse` to match this documented pattern; bounce/elastic easing is not part of the system.

## Do's and Don'ts
- Do route all color usage through the CSS variable tokens so light/dark stay in sync.
- Do use JetBrains Mono only for genuinely technical values (hashes, IDs, paths), never for prose.
- Don't introduce gradient text, decorative purple-cyan gradients, or bounce/elastic easing — those read as generic AI-dashboard tells and are not part of this system.
- Don't stack multiple bordered/shadowed containers inside a glass card; the glass card is the depth primitive, nesting another bordered box inside it flattens the hierarchy.
