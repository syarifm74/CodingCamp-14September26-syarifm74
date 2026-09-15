/* ============================================================
   Expense & Budget Visualizer — script.js
   RevoU Fundamental Course — Mini Coding Project
   ============================================================ */

/* ---------- Constants ---------- */
const STORAGE_KEY            = 'expense_visualizer_transactions';
const CATEGORIES_STORAGE_KEY = 'expense_visualizer_custom_categories';

// Default categories — always present, never deletable
const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Fun'];

// Preset colours for default categories
const DEFAULT_CATEGORY_COLORS = {
  Food:      '#f97316',
  Transport: '#3b82f6',
  Fun:       '#a855f7',
};

// Palette for auto-assigning colours to new custom categories
const CUSTOM_COLOR_PALETTE = [
  '#10b981', '#f59e0b', '#ef4444', '#06b6d4',
  '#ec4899', '#84cc16', '#6366f1', '#14b8a6',
  '#f43f5e', '#8b5cf6', '#0ea5e9', '#d97706',
];

/* ---------- State ---------- */
let transactions     = [];   // { id, itemName, amount, category, date }
let customCategories = [];   // { name, color }
let expenseChart     = null; // Chart.js instance (global pie chart)

/* ---------- DOM References — MVP ---------- */
const form            = document.getElementById('transactionForm');
const itemNameInput   = document.getElementById('itemName');
const amountInput     = document.getElementById('amount');
const categorySelect  = document.getElementById('category');
const validationMsg   = document.getElementById('validationMsg');
const totalAmountEl   = document.getElementById('totalAmount');
const transactionList = document.getElementById('transactionList');
const emptyState      = document.getElementById('emptyState');
const chartCanvas     = document.getElementById('expenseChart');
const chartEmptyMsg   = document.getElementById('chartEmptyMsg');

/* ---------- DOM References — Category Manager ---------- */
const newCategoryNameInput  = document.getElementById('newCategoryName');
const categoryValidationMsg = document.getElementById('categoryValidationMsg');
const btnAddCategory        = document.getElementById('btnAddCategory');
const categoryPillsEl       = document.getElementById('categoryPills');

/* ---------- DOM References — Monthly Summary ---------- */
const monthSelectorInput  = document.getElementById('monthSelector');
const monthlyTotalEl      = document.getElementById('monthlyTotal');
const monthlyCountEl      = document.getElementById('monthlyCount');
const monthlyBreakdownEl  = document.getElementById('monthlyBreakdown');
const monthlyEmptyMsgEl   = document.getElementById('monthlyEmptyMsg');

/* ============================================================
   HELPERS
   ============================================================ */

/**
 * Format a number as Indonesian Rupiah.
 * e.g. 25000 → "Rp 25.000"
 */
function formatCurrency(amount) {
  return 'Rp ' + amount.toLocaleString('id-ID');
}

/**
 * Escape HTML special characters to prevent XSS when
 * inserting user input via innerHTML.
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;');
}

/**
 * Generate a simple unique ID using timestamp + random suffix.
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

/**
 * Return today's date as an ISO date string "YYYY-MM-DD".
 * Used to stamp new transactions.
 */
function getTodayISO() {
  const now = new Date();
  const year  = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day   = String(now.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

/**
 * Return the current month as "YYYY-MM" for the month selector default.
 */
function getCurrentYearMonth() {
  const now = new Date();
  const year  = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return year + '-' + month;
}

/**
 * Extract "YYYY-MM" from a transaction's date field.
 * Returns null if the date is missing or invalid (backward compatibility).
 */
function getYearMonth(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  // dateStr format is "YYYY-MM-DD" — take the first 7 characters
  const ym = dateStr.substring(0, 7);
  // Validate: must match YYYY-MM pattern
  if (!/^\d{4}-\d{2}$/.test(ym)) return null;
  return ym;
}

/**
 * Format a "YYYY-MM" string into a readable label like "September 2026".
 */
function formatYearMonth(ym) {
  if (!ym) return 'Unknown';
  // Parse as first day of that month in UTC to avoid timezone shifts
  const date = new Date(ym + '-01T00:00:00Z');
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', timeZone: 'UTC' });
}

/* ============================================================
   CATEGORY HELPERS
   ============================================================ */

/**
 * Return a combined list of all category names (defaults + custom).
 */
function getAllCategoryNames() {
  const customNames = customCategories.map(function (c) { return c.name; });
  return DEFAULT_CATEGORIES.concat(customNames);
}

/**
 * Look up the display colour for any category name.
 * Falls back to a neutral grey for unknown/deleted categories.
 */
function getCategoryColor(name) {
  if (DEFAULT_CATEGORY_COLORS[name]) {
    return DEFAULT_CATEGORY_COLORS[name];
  }
  const custom = customCategories.find(function (c) { return c.name === name; });
  return custom ? custom.color : '#94a3b8';
}

/**
 * Pick the next available colour from the palette,
 * cycling through if all are already in use.
 */
function pickNextColor() {
  const usedColors = customCategories.map(function (c) { return c.color; });
  const unused = CUSTOM_COLOR_PALETTE.filter(function (c) {
    return !usedColors.includes(c);
  });
  if (unused.length > 0) return unused[0];
  return CUSTOM_COLOR_PALETTE[customCategories.length % CUSTOM_COLOR_PALETTE.length];
}

/* ============================================================
   LOCAL STORAGE — TRANSACTIONS
   ============================================================ */

function loadTransactions() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.error('Failed to load transactions:', err);
    return [];
  }
}

function saveTransactions() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (err) {
    console.error('Failed to save transactions:', err);
  }
}

/* ============================================================
   LOCAL STORAGE — CUSTOM CATEGORIES
   ============================================================ */

function loadCustomCategories() {
  try {
    const stored = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.error('Failed to load custom categories:', err);
    return [];
  }
}

function saveCustomCategories() {
  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(customCategories));
  } catch (err) {
    console.error('Failed to save custom categories:', err);
  }
}

/* ============================================================
   VALIDATION — TRANSACTION FORM
   ============================================================ */

function validateForm(itemName, amount, category) {
  if (!itemName.trim()) {
    return { valid: false, message: 'Please enter an item name.' };
  }
  if (!amount) {
    return { valid: false, message: 'Please enter an amount.' };
  }
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return { valid: false, message: 'Amount must be a positive number greater than zero.' };
  }
  if (!category) {
    return { valid: false, message: 'Please select a category.' };
  }
  return { valid: true };
}

function showValidationMessage(message) {
  validationMsg.textContent = message;
}

function clearValidationMessage() {
  validationMsg.textContent = '';
}

/* ============================================================
   VALIDATION — CATEGORY MANAGER
   ============================================================ */

function validateCategory(name) {
  const trimmed = name.trim();

  if (!trimmed) {
    return { valid: false, message: 'Category name cannot be empty.' };
  }

  const allNames = getAllCategoryNames().map(function (n) {
    return n.toLowerCase();
  });

  if (allNames.includes(trimmed.toLowerCase())) {
    return { valid: false, message: '"' + trimmed + '" already exists as a category.' };
  }

  return { valid: true, trimmed: trimmed };
}

function showCategoryValidationMessage(message) {
  categoryValidationMsg.textContent = message;
}

function clearCategoryValidationMessage() {
  categoryValidationMsg.textContent = '';
}

/* ============================================================
   ADD / DELETE CUSTOM CATEGORIES
   ============================================================ */

function addCategory(name) {
  const result = validateCategory(name);

  if (!result.valid) {
    showCategoryValidationMessage(result.message);
    return;
  }

  clearCategoryValidationMessage();

  customCategories.push({
    name:  result.trimmed,
    color: pickNextColor(),
  });

  saveCustomCategories();
  renderCategoryOptions();
  renderCategoryPills();
  updateChart();
}

function deleteCategory(name) {
  if (DEFAULT_CATEGORIES.includes(name)) return;

  customCategories = customCategories.filter(function (c) {
    return c.name !== name;
  });

  saveCustomCategories();
  renderCategoryOptions();
  renderCategoryPills();
  updateChart();
}

/* ============================================================
   RENDER — CATEGORY SELECTOR
   ============================================================ */

function renderCategoryOptions() {
  const currentValue = categorySelect.value;

  while (categorySelect.options.length > 1) {
    categorySelect.remove(1);
  }

  getAllCategoryNames().forEach(function (name) {
    const option = document.createElement('option');
    option.value       = name;
    option.textContent = name;
    categorySelect.appendChild(option);
  });

  if (currentValue && getAllCategoryNames().includes(currentValue)) {
    categorySelect.value = currentValue;
  }
}

/* ============================================================
   RENDER — CATEGORY PILLS
   ============================================================ */

function renderCategoryPills() {
  categoryPillsEl.innerHTML = '';

  getAllCategoryNames().forEach(function (name) {
    const isDefault = DEFAULT_CATEGORIES.includes(name);
    const color     = getCategoryColor(name);

    const pill = document.createElement('div');
    pill.className = 'category-pill';
    pill.style.setProperty('--pill-color', color);

    if (isDefault) {
      pill.innerHTML = `
        <span class="pill-dot"></span>
        <span class="pill-name">${escapeHtml(name)}</span>
        <span class="pill-default-badge">default</span>
      `;
    } else {
      pill.innerHTML = `
        <span class="pill-dot"></span>
        <span class="pill-name">${escapeHtml(name)}</span>
        <button
          class="btn-delete-category"
          aria-label="Delete category: ${escapeHtml(name)}"
          data-name="${escapeHtml(name)}"
        >×</button>
      `;
    }

    categoryPillsEl.appendChild(pill);
  });
}

/* ============================================================
   ADD / DELETE TRANSACTIONS
   ============================================================ */

/**
 * Create a new transaction with an automatic date stamp (today).
 */
function addTransaction(itemName, amount, category) {
  const transaction = {
    id:       generateId(),
    itemName: itemName.trim(),
    amount:   parseFloat(parseFloat(amount).toFixed(2)),
    category: category,
    date:     getTodayISO(),   // "YYYY-MM-DD" — added for Monthly Summary
  };

  transactions.push(transaction);
  saveTransactions();
  render();
}

function deleteTransaction(id) {
  transactions = transactions.filter(function (t) {
    return t.id !== id;
  });
  saveTransactions();
  render();
}

/* ============================================================
   RENDERING — TRANSACTIONS, TOTAL, CHART
   ============================================================ */

/** Master render — call on any state change. */
function render() {
  renderTransactions();
  updateTotal();
  updateChart();
  updateMonthlySummary(); // keep summary in sync with every state change
}

/**
 * Render the full transaction list (all transactions, not filtered).
 * Each item shows its date for transparency.
 */
function renderTransactions() {
  transactionList.innerHTML = '';

  if (transactions.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  transactions.slice().reverse().forEach(function (t) {
    const color   = getCategoryColor(t.category);
    // Format date for display — handle missing date gracefully
    const dateLabel = t.date ? formatDateDisplay(t.date) : '';

    const item = document.createElement('div');
    item.className = 'transaction-item';
    item.setAttribute('data-category', t.category);
    item.style.setProperty('--item-accent', color);

    item.innerHTML = `
      <div class="transaction-info">
        <div class="transaction-name">${escapeHtml(t.itemName)}</div>
        <div class="transaction-meta">
          <span class="badge" style="background:${color};">${escapeHtml(t.category)}</span>
          ${dateLabel ? '<span class="transaction-date">' + escapeHtml(dateLabel) + '</span>' : ''}
        </div>
      </div>
      <div class="transaction-amount">${formatCurrency(t.amount)}</div>
      <button
        class="btn-delete"
        aria-label="Delete transaction: ${escapeHtml(t.itemName)}"
        data-id="${t.id}"
      >Delete</button>
    `;

    transactionList.appendChild(item);
  });
}

/**
 * Format an ISO date string "YYYY-MM-DD" into a short readable label
 * like "16 Sep 2026". Returns empty string on invalid input.
 */
function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Recalculate and display total spending (all transactions). */
function updateTotal() {
  const total = transactions.reduce(function (sum, t) {
    return sum + t.amount;
  }, 0);
  totalAmountEl.textContent = formatCurrency(total);
}

/**
 * Build or update the global Chart.js pie chart (all transactions).
 * Unchanged from Optional Challenge #1.
 */
function updateChart() {
  const totalsMap = {};

  getAllCategoryNames().forEach(function (name) {
    totalsMap[name] = 0;
  });

  transactions.forEach(function (t) {
    if (totalsMap[t.category] === undefined) {
      totalsMap[t.category] = 0;
    }
    totalsMap[t.category] += t.amount;
  });

  const activeLabels = [];
  const activeData   = [];
  const activeColors = [];

  Object.keys(totalsMap).forEach(function (name) {
    if (totalsMap[name] > 0) {
      activeLabels.push(name);
      activeData.push(totalsMap[name]);
      activeColors.push(getCategoryColor(name));
    }
  });

  const hasData = activeData.length > 0;

  if (!hasData) {
    chartEmptyMsg.classList.remove('hidden');
    if (expenseChart) {
      expenseChart.destroy();
      expenseChart = null;
    }
    return;
  }

  chartEmptyMsg.classList.add('hidden');

  if (expenseChart) {
    expenseChart.data.labels                      = activeLabels;
    expenseChart.data.datasets[0].data            = activeData;
    expenseChart.data.datasets[0].backgroundColor = activeColors;
    expenseChart.update();
  } else {
    expenseChart = new Chart(chartCanvas, {
      type: 'pie',
      data: {
        labels: activeLabels,
        datasets: [{
          data:            activeData,
          backgroundColor: activeColors,
          borderColor:     '#ffffff',
          borderWidth:     3,
          hoverOffset:     8,
        }],
      },
      options: {
        responsive:          true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding:       16,
              font:          { size: 13 },
              usePointStyle: true,
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const value = context.parsed;
                const total = context.dataset.data.reduce(function (a, b) {
                  return a + b;
                }, 0);
                const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return ' ' + context.label + ': ' + formatCurrency(value) + ' (' + pct + '%)';
              },
            },
          },
        },
      },
    });
  }
}

/* ============================================================
   MONTHLY SUMMARY
   ============================================================ */

/**
 * Filter transactions to only those matching the selected "YYYY-MM".
 * Transactions with no date field are excluded (backward compatibility —
 * they are never deleted, just not counted in a monthly view).
 */
function getTransactionsForMonth(ym) {
  return transactions.filter(function (t) {
    return getYearMonth(t.date) === ym;
  });
}

/**
 * Render the Monthly Summary section for the currently selected month.
 * Called automatically whenever state changes (add, delete, month change, load).
 */
function updateMonthlySummary() {
  const selectedYM = monthSelectorInput.value; // "YYYY-MM" or "" if not set

  // If the selector has no value yet, nothing to show
  if (!selectedYM) {
    monthlyBreakdownEl.innerHTML = '';
    monthlyTotalEl.textContent   = 'Rp 0';
    monthlyCountEl.textContent   = '0';
    monthlyEmptyMsgEl.classList.remove('hidden');
    return;
  }

  const monthTransactions = getTransactionsForMonth(selectedYM);

  if (monthTransactions.length === 0) {
    monthlyBreakdownEl.innerHTML = '';
    monthlyTotalEl.textContent   = 'Rp 0';
    monthlyCountEl.textContent   = '0';
    monthlyEmptyMsgEl.classList.remove('hidden');
    return;
  }

  // Hide empty message — we have data
  monthlyEmptyMsgEl.classList.add('hidden');

  // ---- Calculate totals ----
  const total = monthTransactions.reduce(function (sum, t) {
    return sum + t.amount;
  }, 0);

  monthlyTotalEl.textContent  = formatCurrency(total);
  monthlyCountEl.textContent  = monthTransactions.length;

  // ---- Category breakdown ----
  // Aggregate spend per category for this month
  const categoryTotals = {};

  monthTransactions.forEach(function (t) {
    if (categoryTotals[t.category] === undefined) {
      categoryTotals[t.category] = 0;
    }
    categoryTotals[t.category] += t.amount;
  });

  // Sort categories by spend descending
  const sortedCategories = Object.keys(categoryTotals).sort(function (a, b) {
    return categoryTotals[b] - categoryTotals[a];
  });

  // Render breakdown rows
  monthlyBreakdownEl.innerHTML = '';

  sortedCategories.forEach(function (name) {
    const catAmount = categoryTotals[name];
    const pct       = total > 0 ? (catAmount / total) * 100 : 0;
    const color     = getCategoryColor(name);

    const row = document.createElement('div');
    row.className = 'breakdown-row';

    row.innerHTML = `
      <div class="breakdown-label">
        <span class="breakdown-dot" style="background:${color};"></span>
        <span class="breakdown-category-name">${escapeHtml(name)}</span>
      </div>
      <div class="breakdown-bar-wrap">
        <div class="breakdown-bar" style="width:${pct.toFixed(1)}%; background:${color};"></div>
      </div>
      <div class="breakdown-figures">
        <span class="breakdown-amount">${formatCurrency(catAmount)}</span>
        <span class="breakdown-pct">${pct.toFixed(1)}%</span>
      </div>
    `;

    monthlyBreakdownEl.appendChild(row);
  });
}

/* ============================================================
   EVENT LISTENERS
   ============================================================ */

// --- Transaction form submission ---
form.addEventListener('submit', function (event) {
  event.preventDefault();

  const itemName = itemNameInput.value;
  const amount   = amountInput.value;
  const category = categorySelect.value;

  const result = validateForm(itemName, amount, category);

  if (!result.valid) {
    showValidationMessage(result.message);
    return;
  }

  clearValidationMessage();
  addTransaction(itemName, amount, category);
  form.reset();
  itemNameInput.focus();
});

// Clear transaction validation on input
[itemNameInput, amountInput, categorySelect].forEach(function (el) {
  el.addEventListener('input', clearValidationMessage);
});

// --- Delete transaction (event delegation) ---
transactionList.addEventListener('click', function (event) {
  const btn = event.target.closest('.btn-delete');
  if (!btn) return;
  const id = btn.getAttribute('data-id');
  if (id) deleteTransaction(id);
});

// --- Add custom category ---
btnAddCategory.addEventListener('click', function () {
  addCategory(newCategoryNameInput.value);
  newCategoryNameInput.value = '';
  newCategoryNameInput.focus();
});

newCategoryNameInput.addEventListener('keydown', function (event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    addCategory(newCategoryNameInput.value);
    newCategoryNameInput.value = '';
  }
});

newCategoryNameInput.addEventListener('input', clearCategoryValidationMessage);

// --- Delete custom category (event delegation) ---
categoryPillsEl.addEventListener('click', function (event) {
  const btn = event.target.closest('.btn-delete-category');
  if (!btn) return;
  const name = btn.getAttribute('data-name');
  if (name) deleteCategory(name);
});

// --- Month selector change ---
monthSelectorInput.addEventListener('change', function () {
  updateMonthlySummary();
});

/* ============================================================
   INITIALISATION
   ============================================================ */

/**
 * Bootstrap the application:
 * 1. Load persisted custom categories.
 * 2. Load persisted transactions.
 * 3. Set month selector to current month.
 * 4. Populate category <select> and pills.
 * 5. Render full UI (list + total + chart + monthly summary).
 */
(function init() {
  customCategories = loadCustomCategories();
  transactions     = loadTransactions();

  // Default the month selector to the current month
  monthSelectorInput.value = getCurrentYearMonth();

  renderCategoryOptions();
  renderCategoryPills();
  render(); // calls renderTransactions + updateTotal + updateChart + updateMonthlySummary
})();
