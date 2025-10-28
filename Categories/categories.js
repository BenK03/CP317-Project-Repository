// category list shown on the page
(function () {
    const CATEGORY_PRESETS = [
        { id: 'housing', label: 'Housing', color: '#60a5fa' },
        { id: 'utilities', label: 'Utilities', color: '#facc15' },
        { id: 'transportation', label: 'Transportation', color: '#34d399' },
        { id: 'food', label: 'Food', color: '#fb7185' },
        { id: 'entertainment', label: 'Entertainment', color: '#a855f7' },
        { id: 'health', label: 'Health', color: '#22d3ee' },
        { id: 'savings', label: 'Savings', color: '#f97316' },
        { id: 'miscellaneous', label: 'Miscellaneous', color: '#c084fc' },
        { id: 'impulse', label: 'Impulse purchases', color: '#f87171' }
    ];

    // Impulse buys
    const IMPULSE_CATEGORY_ID = 'impulse';
    const FALLBACK_COLORS = ['#4ade80', '#2dd4bf', '#38bdf8', '#f59e0b', '#f472b6', '#f97316'];

    // Run after page loads
    document.addEventListener('DOMContentLoaded', () => {
        const chipsContainer = document.getElementById('category-chips');
        const sectionsContainer = document.getElementById('category-sections');
        const emptyMessage = document.getElementById('categories-empty');

        // If anything is missing, stop
        if (!chipsContainer || !sectionsContainer || !emptyMessage) {
            return;
        }

        // Get saved expenses and turn them into category data
        const expenses = fetchExpenses();
        const categories = buildCategoryData(expenses);
        const hasAnyExpense = expenses.length > 0;

        renderChips(chipsContainer, categories);
        renderSections(sectionsContainer, categories);

        emptyMessage.hidden = hasAnyExpense || categories.some((category) => category.expenses.length > 0);
    });

    // Read expenses from readExpenses() if available if not read from localStorage
    function fetchExpenses() {
        if (typeof readExpenses === 'function') {
            return readExpenses();
        }

        // Plan B: read directly from localStorage
        try {
            const storedValue = localStorage.getItem('expenses');
            if (!storedValue) {
                return [];
            }

            const parsed = JSON.parse(storedValue);
            if (!Array.isArray(parsed)) {
                return [];
            }

            // Keep only objects
            return parsed.filter((item) => typeof item === 'object' && item !== null);
        } catch (error) {
            console.error('Unable to read expenses for categories view', error);
            return [];
        }
    }

    // Build a list of categories with totals and items
    function buildCategoryData(expenses) {
        const presetMap = new Map(CATEGORY_PRESETS.map((item) => [item.id, item]));
        const categories = new Map();
        const categoryOrder = [];
        let fallbackIndex = 0;

        // Make sure a category exists, create if missing
        const ensureCategory = (id) => {
            if (!categories.has(id)) {
                const preset = presetMap.get(id);
                const label = preset?.label ?? formatCategoryLabel(id);
                const color = preset?.color ?? FALLBACK_COLORS[fallbackIndex++ % FALLBACK_COLORS.length];

                categories.set(id, {
                    id,
                    label,
                    color,
                    expenses: [],
                    total: 0
                });
                categoryOrder.push(id);
            }

            return categories.get(id);
        };

        // Create all preset categories
        CATEGORY_PRESETS.forEach((preset) => ensureCategory(preset.id));

        // Place each expense into its category and update totals
        expenses.forEach((expense) => {
            const normalized = normalizeExpense(expense);
            const categoryEntry = ensureCategory(normalized.categoryId);

            categoryEntry.expenses.push({
                ...normalized,
                categoryId: categoryEntry.id,
                categoryLabel: categoryEntry.label
            });
            categoryEntry.total += normalized.amount;

            if (normalized.isImpulse) {
                const impulseEntry = ensureCategory(IMPULSE_CATEGORY_ID);

                impulseEntry.expenses.push({
                    ...normalized,
                    categoryId: impulseEntry.id,
                    categoryLabel: impulseEntry.label,
                    sourceCategoryLabel: categoryEntry.label
                });
                impulseEntry.total += normalized.amount;
            }
        });

        return categoryOrder.map((id) => categories.get(id));
    }

    function normalizeExpense(expense) {
        const amount = sanitizeAmount(expense?.amount);
        const categoryId = sanitizeCategory(expense?.category);
        const date = typeof expense?.date === 'string' ? expense.date : '';
        const impulse = typeof expense?.impulse === 'string' ? expense.impulse.toLowerCase() : '';

        return {
            amount,
            categoryId,
            date,
            displayDate: formatDisplayDate(date),
            isImpulse: impulse === 'yes'
        };
    }

    // Make sure amount is a number
    function sanitizeAmount(value) {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }

        const parsed = Number.parseFloat(value);
        return Number.isNaN(parsed) ? 0 : parsed;
    }

    // Make sure category is a simple lowercase id
    function sanitizeCategory(value) {
        if (typeof value !== 'string' || !value.trim()) {
            return 'uncategorized';
        }

        return value.trim().toLowerCase();
    }

    function formatCategoryLabel(id) {
        if (id === 'uncategorized') {
            return 'Uncategorized';
        }

        return id
            .split(/[\s_-]+/)
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    }

    // Show dates as DD/MM/YYYY or a simple fallback
    function formatDisplayDate(value) {
        const parsedDate = parseDateString(value);
        if (!parsedDate) {
            return value || 'Date not provided';
        }

        const day = String(parsedDate.getDate()).padStart(2, '0');
        const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const year = String(parsedDate.getFullYear());
        return `${day}/${month}/${year}`;
    }

    function parseDateString(value) {
        if (typeof value !== 'string') {
            return null;
        }

        const parts = value.split('/');
        if (parts.length !== 3) {
            return null;
        }

        const [dayStr, monthStr, yearStr] = parts;
        const day = Number.parseInt(dayStr, 10);
        const month = Number.parseInt(monthStr, 10);
        const year = Number.parseInt(yearStr, 10);

        if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) {
            return null;
        }

        const date = new Date(year, month - 1, day);
        if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
            return null;
        }

        return date;
    }

    function renderChips(container, categories) {
        container.innerHTML = '';

        categories.forEach((category) => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'category-chip';
            chip.textContent = category.label;
            chip.style.setProperty('--chip-color', category.color);
            chip.setAttribute('data-category', category.id);

            chip.addEventListener('click', () => {
                const target = document.getElementById(`category-${category.id}`);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });

            container.appendChild(chip);
        });
    }

    // Build one section per category with items + total
    function renderSections(container, categories) {
        container.innerHTML = '';

        categories.forEach((category) => {
            const section = document.createElement('section');
            section.className = 'category-card';
            section.id = `category-${category.id}`;
            section.style.setProperty('--category-color', category.color);

            const header = document.createElement('div');
            header.className = 'category-header';

            const title = document.createElement('h2');
            title.className = 'category-name';
            title.textContent = category.label;

            const count = document.createElement('span');
            count.className = 'category-count';
            const expenseCount = category.expenses.length;
            count.textContent = expenseCount === 1 ? '1 expense' : `${expenseCount} expenses`;

            header.appendChild(title);
            header.appendChild(count);
            section.appendChild(header);

            const list = document.createElement('ul');
            list.className = 'category-expense-list';

            if (!category.expenses.length) {
                const emptyItem = document.createElement('li');
                emptyItem.className = 'category-expense-empty';
                emptyItem.textContent = 'No expenses recorded for this category yet.';
                list.appendChild(emptyItem);
            } else {
                const sortedExpenses = [...category.expenses].sort(sortByDateDesc);
                sortedExpenses.forEach((expense) => list.appendChild(createExpenseRow(expense)));
            }

            section.appendChild(list);

            const total = document.createElement('p');
            total.className = 'category-total';
            total.textContent = `Total: $${category.total.toFixed(2)}`;

            section.appendChild(total);
            container.appendChild(section);
        });
    }

    // Sort by newest dates first
    function sortByDateDesc(a, b) {
        const dateA = parseDateString(a.date);
        const dateB = parseDateString(b.date);

        if (!dateA && !dateB) {
            return 0;
        }

        if (!dateA) {
            return 1;
        }

        if (!dateB) {
            return -1;
        }

        return dateB.getTime() - dateA.getTime();
    }

    // Make one list item (date/tags/amount)
    function createExpenseRow(expense) {
        const item = document.createElement('li');
        item.className = 'category-expense-item';

        const meta = document.createElement('div');
        meta.className = 'category-expense-meta';

        const date = document.createElement('span');
        date.textContent = expense.displayDate;
        meta.appendChild(date);

        const tags = document.createElement('div');
        tags.className = 'category-expense-tags';

        if (expense.isImpulse) {
            const impulseTag = document.createElement('span');
            impulseTag.textContent = 'Impulse purchase';
            tags.appendChild(impulseTag);
        } else {
            const impulseTag = document.createElement('span');
            impulseTag.textContent = 'Planned purchase';
            tags.appendChild(impulseTag);
        }

        if (expense.sourceCategoryLabel) {
            const sourceTag = document.createElement('span');
            sourceTag.textContent = `Category: ${expense.sourceCategoryLabel}`;
            tags.appendChild(sourceTag);
        }

        meta.appendChild(tags);

        const amount = document.createElement('span');
        amount.className = 'category-expense-amount';
        amount.textContent = `$${expense.amount.toFixed(2)}`;

        item.appendChild(meta);
        item.appendChild(amount);

        return item;
    }
})();
