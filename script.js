document.addEventListener('DOMContentLoaded', () => {
    const expenseForm = document.getElementById('expense-form');

    if (expenseForm) {
        const dateInput = expenseForm.querySelector('#date');

        if (dateInput) {
            dateInput.addEventListener('input', () => dateInput.setCustomValidity(''));
        }

        expenseForm.addEventListener('submit', (event) => {
            event.preventDefault();

            const amountInput = expenseForm.querySelector('#amount');
            const categoryInput = expenseForm.querySelector('#category');
            const impulseInput = expenseForm.querySelector('#impulse');

            if (!amountInput || !categoryInput || !impulseInput || !dateInput) {
                return;
            }

            const amountValue = parseFloat(amountInput.value);
            const categoryValue = categoryInput.value;
            const impulseValue = impulseInput.value;
            const dateValue = dateInput.value.trim();

            const datePattern = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;

            if (!datePattern.test(dateValue)) {
                dateInput.setCustomValidity('Please enter the date as DD/MM/YYYY.');
                dateInput.reportValidity();
                return;
            }

            const [day, month, year] = dateValue.split('/').map(Number);
            const parsedDate = new Date(year, month - 1, day);
            const isValidDate = parsedDate.getFullYear() === year &&
                parsedDate.getMonth() === month - 1 &&
                parsedDate.getDate() === day;

            if (!isValidDate) {
                dateInput.setCustomValidity('Please enter a valid calendar date in DD/MM/YYYY format.');
                dateInput.reportValidity();
                return;
            }

            dateInput.setCustomValidity('');

            const expense = {
                amount: Number.isNaN(amountValue) ? 0 : amountValue,
                category: categoryValue,
                impulse: impulseValue,
                date: dateValue
            };

            const expenses = readExpenses();
            expenses.push(expense);
            persistExpenses(expenses);

            expenseForm.reset();
        });
    }

    const overviewList = document.getElementById('expense-list');
    if (overviewList) {
        renderOverview(overviewList);
    }
});

function readExpenses() {
    try {
        const storedExpenses = localStorage.getItem('expenses');
        if (!storedExpenses) {
            return [];
        }

        const parsedExpenses = JSON.parse(storedExpenses);

        if (!Array.isArray(parsedExpenses)) {
            return [];
        }

        return parsedExpenses
            .filter((item) => typeof item === 'object' && item !== null)
            .map((item) => ({
                amount: typeof item.amount === 'number' ? item.amount : parseFloat(item.amount) || 0,
                category: typeof item.category === 'string' ? item.category : '',
                impulse: typeof item.impulse === 'string' ? item.impulse : '',
                date: typeof item.date === 'string' ? item.date : ''
            }));
    } catch (error) {
        console.error('Unable to read expenses from local storage', error);
        return [];
    }
}

function persistExpenses(expenses) {
    localStorage.setItem('expenses', JSON.stringify(expenses));
}

function renderOverview(listElement) {
    const totalElement = document.getElementById('expense-total');
    const expenses = readExpenses();

    listElement.innerHTML = '';

    if (!expenses.length) {
        const emptyItem = document.createElement('li');
        emptyItem.textContent = 'No expenses recorded yet.';
        listElement.appendChild(emptyItem);

        if (totalElement) {
            totalElement.textContent = 'Total: $0.00';
        }

        return;
    }

    let total = 0;

    expenses.sort((a, b) => {
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
    });

    expenses.forEach((expense) => {
        const amount = typeof expense.amount === 'number' ? expense.amount : parseFloat(expense.amount) || 0;
        total += amount;

        const listItem = document.createElement('li');
        const impulseLabel = expense.impulse === 'yes' ? 'Impulse: Yes' : 'Impulse: No';
        listItem.textContent = `Amount: $${amount.toFixed(2)} | Category: ${expense.category} | ${impulseLabel} | ${expense.date}`;
        listElement.appendChild(listItem);
    });

    if (totalElement) {
        totalElement.textContent = `Total: $${total.toFixed(2)}`;
    }
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

    if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) {
        return null;
    }

    const date = new Date(year, month - 1, day);

    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
        return null;
    }

    return date;
}
