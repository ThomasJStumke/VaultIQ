# VaultIQ: Visual Language & Design System

## 1. Aesthetic Direction: "The Digital Fortress"
VaultIQ avoids generic software palettes. It uses a **Dark Academia / Cyber-Governance** theme designed to convey security, authority, and data precision.

- **Background:** Deep Slate (`#020617`) paired with subtle grain textures to reduce eye strain during long audit sessions.
- **Surface:** Glassmorphic cards with ultra-thin white borders (`white/5`) to create depth without clutter.
- **Accent:** **Royal Indigo** (`#6366f1`) for primary actions; **Rose** for critical non-compliance; **Emerald** for verified status.

## 2. Typography Strategy
- **Headings:** Inter (Extra Bold / Black) with tracking-tighter (`-0.05em`). This creates a "Newspaper Headline" feel for executive reports.
- **Data/Mono:** JetBrains Mono for audit tokens, SHA-256 hashes, and file paths to emphasize technical integrity.
- **UI:** Inter (Medium) for maximum legibility in complex grids.

## 3. Component Architecture
- **The Glass Card:** The container for every data point. Uses `backdrop-blur-xl` and `border-white/5`.
- **The Glow Metric:** Pulse animations on critical stats to draw the eye to risk areas.
- **Micro-Animations:** Staggered entrances for list items and smooth scale-up hovers for heatmap cells.

## 4. Mobile Strategy (Responsive Design)
- **Fluid Grids:** 4-column executive KPIs collapse to a single scrolling column on mobile.
- **Tap-Target Scaling:** Buttons maintain a minimum 44px hit-area despite the dense data layout.
- **Off-Canvas Nav:** The sidebar transforms into a bottom-sheet or hamburger menu on smaller viewports.
