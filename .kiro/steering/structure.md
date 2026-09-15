---
inclusion: always
---

# Project Structure

## File layout
```
/
├── index.html          # Single HTML page — all markup and CDN script tags
├── css/
│   └── style.css       # All styles — exactly one CSS file
├── js/
│   └── script.js       # All JavaScript — exactly one JS file
└── .kiro/
    └── steering/
        ├── product.md
        ├── tech.md
        └── structure.md
```

**Rule: only one CSS file and one JavaScript file. Do not split or add more.**

## index.html conventions
- Chart.js CDN `<script>` tag must appear **before** `js/script.js`
- All section IDs are stable; changing them requires updating JS selectors
- Theme toggle button is inside `.header-inner` in the `<header>`
- Page layout order: header → main (balance → top-grid → category manager → transactions → monthly summary) → footer

## CSS conventions (`css/style.css`)
- CSS variables defined in `:root` (light theme defaults)
- Dark theme overrides in a single `[data-theme="dark"]` block
- Component sections are separated by large block comments
- No class name prefixes / BEM — flat descriptive class names
- Category accent colours are applied via inline CSS custom properties (`--item-accent`, `--pill-color`) set by JavaScript, not by CSS attribute selectors

## JavaScript conventions (`js/script.js`)
- Three `localStorage` keys — never change their names without migrating existing data
- `DEFAULT_CATEGORIES` is a `const` array — never modified at runtime
- `transactions` and `customCategories` are the two main state arrays
- `render()` is the master update function — call it after any state change to transactions
- `updateMonthlySummary()` is called inside `render()` and also directly on month-selector change
- `applyTheme()` must be called **first** in `init()` before `render()` to avoid a flash of the wrong theme
- All user-supplied strings inserted via `innerHTML` must be passed through `escapeHtml()`
- Transaction data shape: `{ id, itemName, amount, category, date }` — `date` is `"YYYY-MM-DD"`, old records without `date` are handled gracefully

## Key DOM element IDs
| ID | Purpose |
|---|---|
| `transactionForm` | Add transaction form |
| `itemName`, `amount`, `category` | Form inputs |
| `validationMsg` | Transaction form validation message |
| `totalAmount` | Global total spending display |
| `transactionList` | Scrollable list container |
| `emptyState` | Empty-state message (`.hidden` class toggles visibility) |
| `expenseChart` | Chart.js canvas |
| `chartEmptyMsg` | Chart empty-state message |
| `newCategoryName`, `categoryValidationMsg`, `btnAddCategory`, `categoryPills` | Category manager |
| `monthSelector`, `monthlyTotal`, `monthlyCount`, `monthlyBreakdown`, `monthlyEmptyMsg` | Monthly summary |
| `themeToggleBtn` | Dark/light mode toggle |
