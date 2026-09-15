---
inclusion: always
---

# Product — Expense & Budget Visualizer

## What it is
A client-side web application that lets users track personal spending, visualize it by category, and review monthly summaries.

## Target users
Students and individuals who want a simple, no-account spending tracker that works entirely in the browser with no backend.

## Core features (MVP)
- Add expenses with a name, amount, and category (Food / Transport / Fun)
- Delete individual transactions
- Total spending shown prominently and updated in real time
- Pie chart visualization of spending by category (Chart.js)
- All data persisted in browser localStorage — no server required

## Optional features implemented
1. **Custom Categories** — users can create and delete their own spending categories; custom categories appear in the form selector and the chart
2. **Monthly Summary** — filter transactions by month with a total, transaction count, and per-category progress-bar breakdown
3. **Dark / Light Mode** — full theme toggle with localStorage persistence; chart legend colours update with the theme

## Constraints
- Client-side only — no backend, no database, no authentication
- No frameworks (no React, Vue, Angular)
- No utility CSS libraries (no Bootstrap, Tailwind)
- Must work by opening `index.html` directly in a modern browser
