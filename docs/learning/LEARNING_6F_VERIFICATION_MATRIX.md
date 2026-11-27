# Phase 6F — Verification matrix

**Theme:** Light only — dark mode waived per [LEARNING_6_DECISIONS.md](./LEARNING_6_DECISIONS.md).

**How to use:** Run in a browser with learning flag on (`VITE_LEARNING_GUIDES_ENABLED=true`) unless noted. Mark **PASS** / **FAIL** / **NA** and note in [LEARNING_6F_RESULTS.md](./LEARNING_6F_RESULTS.md).

| ID | Dimension | Route / surface | Steps | Result |
|----|-----------|-----------------|-------|--------|
| V360 | Viewport 360px | `/` | Hero + 4 feature cards stack; no horizontal page scroll | |
| V360 | Viewport 360px | `/app` | Welcome, continue learning, queue readable; sidebar drawer opens | |
| V360 | Viewport 360px | `/app/learning` | Search, tabs, row actions wrap | |
| V360 | Viewport 360px | Study shell | Outline + article column stack; code scrolls horizontally | |
| V768 | Viewport 768px | `/` | Feature grid 2 columns | |
| V768 | Viewport 768px | `/app/learning` | Tabs + list usable | |
| V1440 | Viewport 1440px | `/` | Feature grid 4 columns | |
| V1440 | Viewport 1440px | `/app` | Sidebar + main layout | |
| Z200 | 200% zoom | `/app` | Focus order: header → welcome → sections | |
| Z200 | 200% zoom | `/app/learning` | Search label visible; tabs reachable | |
| MOT | `prefers-reduced-motion: reduce` | Any `/app/*` | Button transitions disabled (theme.css); no looping animations | |
| FLAG | Flag off | `/app` | No My guides nav; no continue learning | |
| FLAG | Flag on | `/app` | My guides + continue learning present | |
| STRESS | Long code line | Study step | `<pre>` scrolls (`overflow-x-auto`), page does not widen | |
| STRESS | Long text/URL | Study step | Text wraps (`break-words`) | |
| STRESS | Long guide title | Library / outline | Title visible without layout break | |
| STRESS | Deep outline | Structure | 4+ levels indent; controls reachable | |
| KB | Keyboard | `/app/learning` | Tab: search → Active tab → Continue link | |
| KB | Keyboard | `/app` | Welcome Dismiss focusable | |
| KB | Keyboard | Mobile shell | Drawer trap / restore (AppShell) | |
| TREE | Large tree | Manual spot | Backend limits: `MAX_NODES` 2000, `MAX_DEPTH` 32 — optional import/load | |

**Automated coverage (Vitest):** `BlockViews.test.tsx`, `GuideOutline.test.tsx`, `LandingFeatures.test.tsx`, existing shell tests — see LEARNING_6F_RESULTS.