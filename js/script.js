/* ============================================================
   Expense & Budget Visualizer — script.js
   RevoU Fundamental Course — Mini Coding Project
   ============================================================ */

/* ---------- Constants ---------- */
const STORAGE_KEY = 'expense_visualizer_transactions';

const CATEGORY_COLORS = {
  Food:      '#f97316',
  Transport: '#3b82f6',
  Fun:       '#a855f7',
};

/* ---------- State ---------- */
// transactions is the single source of truth — an array of objects:
// { id: string, itemName: string, amount: number, category: string }
let transactions = [];

// Chart.js instance (kept so we can update/destroy it)
let expenseChart = null;

/* ---------- DOM References ---------- */
const form           = document.getElementById('transactionForm');
const itemNameInput  = document.getElementById('itemName');
const amountInput    = document.getElementById('amount');
const categorySelect = document.getElementById('category');
const validationMsg  = document.getElementById('validationMsg');
const totalAmountEl  = document.getElementById('totalAmount');
const transactionList = document.getElementById('transactionList');
const emptyState     = document.getElementById('emptyState');
const chartCanvas    = document.getElementById('expenseChart');
const chartEmptyMsg  = document.getElementById('chartEmptyMsg');

/* ============================================================
   LOCAL STORAGE
   ============================================================ */

/**
 * Load transactions from localStorage.
 * Returns an empty array if nothing is stored yet.
 */
function loadTransactions() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.error('Failed to load transactions from localStorage:', err);
    return [];
  }
}

/**
 * Save the current transactions array to localStorage.
 */
function saveTransactions() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (err) {
    console.error('Failed to save transactions to localStorage:', err);
  }
}

/* ============================================================
   VALIDATION
   ============================================================ */

/**
 * Validate form inputs.
 * Returns { valid: true } on success, or { valid: false, message: string } on failure.
 */
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

/**
 * Show or clear the validation message paragraph.
 */
function showValidationMessage(message) {
  validationMsg.textContent = message;
}

function clearValidationMessage() {
  validationMsg.textContent = '';
}

/* ============================================================
   ADD / DELETE TRANSACTIONS
   ============================================================ */

/**
 * Create a new transaction object and add it to the list.
 * Persists, then re-renders everything.
 */
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

/**
 * Remove a transaction by its id.
 * Persists, then re-renders everything.
 */
function deleteTransaction(id) {
  transactions = transactions.filter(function (t) {
    return t.id !== id;
  });
  saveTransactions();
  render();
}

/**
 * Generate a simple unique ID using timestamp + random suffix.
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

/* ============================================================
   RENDERING
   ============================================================ */

/**
 * Master render function — call this whenever state changes.
 * Updates the transaction list, total, and chart in one go.
 */
function render() {
  renderTransactions();
  updateTotal();
  updateChart();
}

/**
 * Render the transaction list to the DOM.
 * Shows or hides the empty-state message as needed.
 */
function renderTransactions() {
  // Clear current list
  transactionList.innerHTML = '';

  if (transactions.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  // Render newest first
  const reversed = transactions.slice().reverse();

  reversed.forEach(function (t) {
    const item = document.createElement('div');
    item.className = 'transaction-item';
    item.setAttribute('data-category', t.category);

    item.innerHTML = `
      <div class="transaction-info">
        <div class="transaction-name">${escapeHtml(t.itemName)}</div>
        <div class="transaction-meta">
          <span class="badge badge-${t.category}">${t.category}</span>
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
 * Calculate and display the total spending.
 */
function updateTotal() {
  const total = transactions.reduce(function (sum, t) {
    return sum + t.amount;
  }, 0);

  totalAmountEl.textContent = formatCurrency(total);
}

/**
 * Build or update the Chart.js pie chart.
 * Handles the empty-state message for the chart area.
 */
function updateChart() {
  // Aggregate totals per category
  const totals = {
    Food:      0,
    Transport: 0,
    Fun:       0,
  };

  transactions.forEach(function (t) {
    if (totals[t.category] !== undefined) {
      totals[t.category] += t.amount;
    }
  });

  const labels = Object.keys(totals);
  const data   = Object.values(totals);
  const colors = labels.map(function (l) { return CATEGORY_COLORS[l]; });

  const hasData = data.some(function (v) { return v > 0; });

  // Show or hide the "no data" message
  if (hasData) {
    chartEmptyMsg.classList.add('hidden');
  } else {
    chartEmptyMsg.classList.remove('hidden');
    // Destroy existing chart if present so canvas is clean
    if (expenseChart) {
      expenseChart.destroy();
      expenseChart = null;
    }
    return;
  }

  if (expenseChart) {
    // Update existing chart data in place (smooth update)
    expenseChart.data.datasets[0].data = data;
    expenseChart.update();
  } else {
    // Create a new chart instance
    expenseChart = new Chart(chartCanvas, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data:            data,
          backgroundColor: colors,
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
              padding:   16,
              font:      { size: 13 },
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
                return ` ${context.label}: ${formatCurrency(value)} (${pct}%)`;
              },
            },
          },
        },
      },
    });
  }
}

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
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ============================================================
   EVENT LISTENERS
   ============================================================ */

// Form submission
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

  // Reset form fields
  form.reset();
  itemNameInput.focus();
});

// Delete buttons — using event delegation on the list container
transactionList.addEventListener('click', function (event) {
  const btn = event.target.closest('.btn-delete');
  if (!btn) return;

  const id = btn.getAttribute('data-id');
  if (id) {
    deleteTransaction(id);
  }
});

// Clear validation message when user starts typing/selecting again
[itemNameInput, amountInput, categorySelect].forEach(function (el) {
  el.addEventListener('input', clearValidationMessage);
});

/* ============================================================
   INITIALISATION
   ============================================================ */

/**
 * Bootstrap the application:
 * 1. Load persisted data from localStorage.
 * 2. Render the initial state.
 */
(function init() {
  transactions = loadTransactions();
  render();
})();
