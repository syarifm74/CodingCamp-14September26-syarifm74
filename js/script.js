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
let transactions    = [];   // { id, itemName, amount, category }
let customCategories = [];  // { name, color }
let expenseChart    = null; // Chart.js instance

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
 * Falls back to a neutral grey for unknown categories.
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
  // All colours used — cycle back using index
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

/**
 * Load custom categories from localStorage.
 * Returns an empty array if nothing is stored yet.
 */
function loadCustomCategories() {
  try {
    const stored = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.error('Failed to load custom categories:', err);
    return [];
  }
}

/**
 * Persist the current customCategories array to localStorage.
 */
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

/**
 * Validate a new category name.
 * Returns { valid: true } or { valid: false, message: string }.
 */
function validateCategory(name) {
  const trimmed = name.trim();

  if (!trimmed) {
    return { valid: false, message: 'Category name cannot be empty.' };
  }

  // Case-insensitive duplicate check across defaults AND custom categories
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

/**
 * Add a new custom category, persist, and update the UI.
 */
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

  // Refresh everything that depends on the category list
  renderCategoryOptions();
  renderCategoryPills();
  updateChart(); // chart data hasn't changed, but config may need new colour
}

/**
 * Delete a custom category by name.
 * Refuses to delete default categories (safety guard).
 * Note: existing transactions that used this category are NOT deleted —
 * they remain in the list and still count toward totals/chart
 * (the chart will auto-assign a fallback colour).
 */
function deleteCategory(name) {
  if (DEFAULT_CATEGORIES.includes(name)) return; // guard

  customCategories = customCategories.filter(function (c) {
    return c.name !== name;
  });

  saveCustomCategories();
  renderCategoryOptions();
  renderCategoryPills();
  updateChart();
}

/* ============================================================
   RENDER — CATEGORY SELECTOR (transaction form <select>)
   ============================================================ */

/**
 * Rebuild the <select> options to reflect defaults + custom categories.
 * Preserves the currently selected value where possible.
 */
function renderCategoryOptions() {
  const currentValue = categorySelect.value;

  // Remove all options except the placeholder (first option)
  while (categorySelect.options.length > 1) {
    categorySelect.remove(1);
  }

  getAllCategoryNames().forEach(function (name) {
    const option = document.createElement('option');
    option.value       = name;
    option.textContent = name;
    categorySelect.appendChild(option);
  });

  // Restore previous selection if it still exists
  if (currentValue && getAllCategoryNames().includes(currentValue)) {
    categorySelect.value = currentValue;
  }
}

/* ============================================================
   RENDER — CATEGORY PILLS (category manager UI)
   ============================================================ */

/**
 * Render the list of category pills inside the manager card.
 * Default categories show a lock icon and no delete button.
 * Custom categories show a delete (×) button.
 */
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
   ADD / DELETE TRANSACTIONS (MVP — unchanged logic)
   ============================================================ */

function addTransaction(itemName, amount, category) {
  const transaction = {
    id:       generateId(),
    itemName: itemName.trim(),
    amount:   parseFloat(parseFloat(amount).toFixed(2)),
    category: category,
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
}

/**
 * Render the transaction list. Shows/hides empty state.
 * Works with any category name (default or custom).
 */
function renderTransactions() {
  transactionList.innerHTML = '';

  if (transactions.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  // Newest first
  transactions.slice().reverse().forEach(function (t) {
    const color = getCategoryColor(t.category);

    const item = document.createElement('div');
    item.className = 'transaction-item';
    item.setAttribute('data-category', t.category);
    // Apply colour via inline custom property so any category gets a colour
    item.style.setProperty('--item-accent', color);

    item.innerHTML = `
      <div class="transaction-info">
        <div class="transaction-name">${escapeHtml(t.itemName)}</div>
        <div class="transaction-meta">
          <span class="badge" style="background:${color};">${escapeHtml(t.category)}</span>
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

/** Recalculate and display total spending. */
function updateTotal() {
  const total = transactions.reduce(function (sum, t) {
    return sum + t.amount;
  }, 0);
  totalAmountEl.textContent = formatCurrency(total);
}

/**
 * Build or update the Chart.js pie chart.
 * Dynamically supports any number of categories.
 */
function updateChart() {
  // Aggregate totals per category (all categories, not just defaults)
  const totalsMap = {};

  getAllCategoryNames().forEach(function (name) {
    totalsMap[name] = 0;
  });

  // Also include categories from existing transactions that may have been
  // deleted from the manager — so data is never silently lost
  transactions.forEach(function (t) {
    if (totalsMap[t.category] === undefined) {
      totalsMap[t.category] = 0;
    }
    totalsMap[t.category] += t.amount;
  });

  // Build chart arrays — only include categories that have spend > 0
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
    // Update in place — replace labels, data, and colours together
    expenseChart.data.labels                        = activeLabels;
    expenseChart.data.datasets[0].data              = activeData;
    expenseChart.data.datasets[0].backgroundColor   = activeColors;
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

// --- Add custom category button ---
btnAddCategory.addEventListener('click', function () {
  addCategory(newCategoryNameInput.value);
  newCategoryNameInput.value = '';
  newCategoryNameInput.focus();
});

// --- Allow pressing Enter in the category name input ---
newCategoryNameInput.addEventListener('keydown', function (event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    addCategory(newCategoryNameInput.value);
    newCategoryNameInput.value = '';
  }
});

// Clear category validation message when user starts typing
newCategoryNameInput.addEventListener('input', clearCategoryValidationMessage);

// --- Delete custom category (event delegation on pills container) ---
categoryPillsEl.addEventListener('click', function (event) {
  const btn = event.target.closest('.btn-delete-category');
  if (!btn) return;
  const name = btn.getAttribute('data-name');
  if (name) deleteCategory(name);
});

/* ============================================================
   INITIALISATION
   ============================================================ */

/**
 * Bootstrap the application:
 * 1. Load persisted custom categories from localStorage.
 * 2. Load persisted transactions from localStorage.
 * 3. Populate the category <select> with all categories.
 * 4. Render category pills.
 * 5. Render full UI (list + total + chart).
 */
(function init() {
  customCategories = loadCustomCategories();
  transactions     = loadTransactions();

  renderCategoryOptions(); // populate <select> before rendering transactions
  renderCategoryPills();   // populate manager UI
  render();                // list + total + chart
})();
