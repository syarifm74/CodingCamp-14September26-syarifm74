---
inclusion: always
---

# Tech Stack

## Languages
- HTML5
- CSS3
- Vanilla JavaScript (ES6+) — no transpiler, no bundler

## External library
- **Chart.js 4.4.3** — loaded via CDN (`https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js`)
- No other third-party libraries or frameworks

## Browser storage
- `localStorage` only — three independent keys:
  - `expense_visualizer_transactions` — JSON array of transaction objects
  - `expense_visualizer_custom_categories` — JSON array of `{ name, color }` objects
  - `expense_visualizer_theme` — plain string `"light"` or `"dark"`

## Browser support
- Modern evergreen browsers: Chrome, Firefox, Edge, Safari
- No IE or legacy browser support required

## Build tooling
- None — no npm, no webpack, no Vite, no Babel
- Open `index.html` directly in a browser to run

## Styling approach
- Pure CSS3 with CSS custom properties (variables) for theming
- Dark mode implemented via `[data-theme="dark"]` attribute on `<html>` overriding `:root` variables
- No preprocessors (no SASS, LESS)
- Responsive with CSS Grid and Flexbox; breakpoints at 700px, 600px, 480px, 420px

## JavaScript patterns
- All logic in a single IIFE-booted module pattern (no ES modules)
- Event delegation for dynamically rendered lists
- Functions are named and kept small and single-purpose
- No classes — plain functions and state variables at module scope
