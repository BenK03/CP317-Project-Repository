// Runs after HTML loads
document.addEventListener("DOMContentLoaded", () => {
	// Find the Add Expense form
	const expenseForm = document.getElementById("expense-form");

	if (expenseForm) {
		// Date input inside the form
		const dateInput = expenseForm.querySelector("#date");

		// If user edits date, clear old error
		if (dateInput) {
			dateInput.addEventListener("input", () =>
				dateInput.setCustomValidity(""),
			);
		}
		//button that clears local storage
		const clearInput = document.getElementById("btnClearLocalStorage");
		clearInput.addEventListener("click", (e) => {
			e.preventDefault();
			resetExpenses();
		});

		expenseForm.addEventListener("submit", (event) => {
			event.preventDefault();

			// Get the inputs
			const amountInput = expenseForm.querySelector("#amount");
			const categoryInput = expenseForm.querySelector("#category");
			const impulseInput = expenseForm.querySelector("#impulse");

			// If anything is missing, do nothing
			if (!amountInput || !categoryInput || !impulseInput || !dateInput) {
				return;
			}

			// Read values from the form
			const amountValue = parseFloat(amountInput.value);
			const categoryValue = categoryInput.value;
			const impulseValue = impulseInput.value;
			const dateValue = dateInput.value.trim();

			const datePattern = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;

			if (!datePattern.test(dateValue)) {
				dateInput.setCustomValidity("Please enter the date as DD/MM/YYYY.");
				dateInput.reportValidity();
				return;
			}

			// Check it is a real calendar date
			const [day, month, year] = dateValue.split("/").map(Number);
			const parsedDate = new Date(year, month - 1, day);
			const isValidDate =
				parsedDate.getFullYear() === year &&
				parsedDate.getMonth() === month - 1 &&
				parsedDate.getDate() === day;

			if (!isValidDate) {
				dateInput.setCustomValidity(
					"Please enter a valid calendar date in DD/MM/YYYY format.",
				);
				dateInput.reportValidity();
				return;
			}

			dateInput.setCustomValidity("");

			add_transaction(categoryValue, amountValue, dateValue, impulseValue);

			expenseForm.reset();
		});
	}

	const overviewList = document.getElementById("expense-list");
	if (overviewList) {
		renderOverview(overviewList);
	}
});

//global array of strings for category names
var categories_list = [];

function update_categories() {
	const cat_select = document.getElementById("category");
	cat_select.innerHTML = "";
	for (let i = 0; i < categories_list.length; i++) {
		const cat_option = document.createElement("option"); //update category dropdown
		cat_option.value = categories_list[i].id;
		cat_option.textContent = categories_list[i].label;
		cat_select.appendChild(cat_option);
	}
}

function does_category_exist(id) {
	if (categories_list.some((e) => e.id === id)) return true;
	else return false;
}

//add category and update the category dropdown option
function add_category(name, color) {
	let category_obj = { id: name, label: name, color: color };
	if (does_category_exist(name)) return -1;
	categories_list.push(category_obj);
	update_categories();
}

add_category("None", 0x000);

// Read expenses from your browser storage
function readExpenses() {
	try {
		const storedExpenses = localStorage.getItem("expenses");
		if (!storedExpenses) {
			return [];
		}

		const parsedExpenses = JSON.parse(storedExpenses);

		if (!Array.isArray(parsedExpenses)) {
			return [];
		}

		return parsedExpenses
			.filter((item) => typeof item === "object" && item !== null)
			.map((item) => ({
				amount:
					typeof item.amount === "number"
						? item.amount
						: parseFloat(item.amount) || 0,
				category: typeof item.category === "string" ? item.category : "",
				impulse: typeof item.impulse === "string" ? item.impulse : "",
				date: typeof item.date === "string" ? item.date : "",
			}));
	} catch (error) {
		console.error("Unable to read expenses from local storage", error);
		return [];
	}
}

// Save all expenses back to your browser storage
function persistExpenses(expenses) {
	localStorage.setItem("expenses", JSON.stringify(expenses));
}

function resetExpenses() {
	localStorage.setItem("expenses", "");
}

// Show the expense list and the total
function renderOverview(listElement) {
	const totalElement = document.getElementById("expense-total");
	const expenses = readExpenses();

	listElement.innerHTML = "";

	// If nothing saved yet
	if (!expenses.length) {
		const emptyItem = document.createElement("li");
		emptyItem.textContent = "No expenses recorded yet.";
		listElement.appendChild(emptyItem);

		if (totalElement) {
			totalElement.textContent = "Total: $0.00";
		}

		return;
	}

	let total = 0;

	// Sort by date
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

	// Build list and add up the total
	expenses.forEach((expense) => {
		const amount =
			typeof expense.amount === "number"
				? expense.amount
				: parseFloat(expense.amount) || 0;
		total += amount;

		const listItem = document.createElement("li");
		const impulseLabel =
			expense.impulse === "yes" ? "Impulse: Yes" : "Impulse: No";
		listItem.textContent = `Amount: $${amount.toFixed(2)} | Category: ${expense.category} | ${impulseLabel} | ${expense.date}`;
		listElement.appendChild(listItem);
	});

	// Show total money
	if (totalElement) {
		totalElement.textContent = `Total: $${total.toFixed(2)}`;
	}
}

// Turn "DD/MM/YYYY" into a Date; return null if it is bad
function parseDateString(value) {
	if (typeof value !== "string") {
		return null;
	}

	const parts = value.split("/");
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

	if (
		date.getFullYear() !== year ||
		date.getMonth() !== month - 1 ||
		date.getDate() !== day
	) {
		return null;
	}

	return date;
}

/*


	CSV IMPORTER CODE!!!


*/

//add a new transaction to the transac_list and update all analytics
function add_transaction(categoryValue, amountValue, dateValue, impulseValue) {
	// let created = new transac_struct(category_id, amount, name, date);
	// transac_list.push(created);
	// update_category(category_id);
	// update_analytics_list_html();
	// return created;

	// Make an expense object
	const expense = {
		amount: Number.isNaN(amountValue) ? 0 : amountValue,
		category: categoryValue,
		impulse: impulseValue,
		date: dateValue,
	};

	// Get old expenses, add the new one, save all
	const expenses = readExpenses();
	expenses.push(expense);
	persistExpenses(expenses);
}

const fileInput = document.getElementById("upload"); //upload csv button
const table = document.getElementById("table"); //where the csv table will be generated in HTML

/*
	This is the function that parses the csv and creates the table in HTML
	str - string that contains the entire csv contents
*/
function csv_parse_from_string(str) {
	table.innerHTML = "";
	let rows = str.split("\n");
	for (let y = 0; y < rows.length; y++) {
		const element_row = document.createElement("tr");
		let entries = rows[y].split(",");
		for (let x = 0; x < entries.length; x++) {
			const element_entry = document.createElement("td");
			element_entry.textContent = entries[x];
			element_row.appendChild(element_entry);
		}
		table.appendChild(element_row);
	}
}

let selected_column;
let csv_mode = 0; //0 - select column, 1 - set row to be ignored

//radio buttons for switching the mode between selecting individual columns or toggling rows to be ignored
const radio_mode0 = document.getElementById("mode0");
const radio_mode1 = document.getElementById("mode1");

/*
	These event listeners just handle the radio button inputs so that they change the mode
*/
radio_mode0.addEventListener("change", (e) => {
	if (radio_mode0.checked) {
		csv_mode = 0;
	}
});

radio_mode1.addEventListener("change", (e) => {
	if (radio_mode1.checked) {
		csv_mode = 1;
	}
});

/*
	When clicking on the csv HTML table, this iterates through each cell and has different behavior depending upon the mode
		csv_mode = 0 - add the "selected" class to every cell in the entire column, removing it from other columns if they exist
		csv_mode = 1 - toggle the "ignoring" class for a row in case it shouldn't be included as a transaction
*/
table.addEventListener("mousedown", (e) => {
	if (e.target.tagName == "TD") {
		selected_column = e.target.cellIndex;
		let selected_row = e.target.parentElement.rowIndex;
		for (let r = 0; r < table.rows.length; r++) {
			const row = table.rows[r];
			for (let c = 0; c < row.cells.length; c++) {
				if (csv_mode == 0)
					if (
						c == selected_column &&
						!row.cells[c].classList.contains("ignoring")
					)
						row.cells[c].classList.add("selected");
					else row.cells[c].classList.remove("selected");
				if (csv_mode == 1)
					if (r == selected_row)
						if (!row.cells[c].classList.contains("ignoring")) {
							row.cells[c].setAttribute("class", "");
							row.cells[c].classList.add("ignoring");
							//row.cells[c].classList.remove("selected");
						} else row.cells[c].classList.remove("ignoring");
			}
		}
	}
});

// Buttons for setting column attributes
const btnCategory = document.getElementById("btnCategory");
const btnAmount = document.getElementById("btnAmount");
const btnLabel = document.getElementById("btnLabel");
const btnDate = document.getElementById("btnDate");

/*
	csv_category - this column contains the categories of the transactions and will either assign the
	row to an existing category or create a new one if it doesnt already exist
*/
btnCategory.addEventListener("click", (e) => {
	for (let r = 0; r < table.rows.length; r++) {
		const row = table.rows[r];
		for (let c = 0; c < row.cells.length; c++) {
			if (row.cells[c].classList.contains("selected")) {
				row.cells[c].setAttribute("class", "");
				row.cells[c].classList.add("csv_category");
				//row.cells[c].classList.remove("selected");
			} else {
				row.cells[c].classList.remove("csv_category");
			}
		}
	}
});

/*
	csv_amount - this column contains transaction amounts
*/
btnAmount.addEventListener("click", (e) => {
	for (let r = 0; r < table.rows.length; r++) {
		const row = table.rows[r];
		for (let c = 0; c < row.cells.length; c++) {
			if (row.cells[c].classList.contains("selected")) {
				row.cells[c].setAttribute("class", "");
				row.cells[c].classList.add("csv_amount");
				//row.cells[c].classList.remove("selected");
			} else {
				row.cells[c].classList.remove("csv_amount");
			}
		}
	}
});

/*
	csv_label - this column contains the names of the transactions as you normally see on bank statements
*/
btnLabel.addEventListener("click", (e) => {
	for (let r = 0; r < table.rows.length; r++) {
		const row = table.rows[r];
		for (let c = 0; c < row.cells.length; c++) {
			if (row.cells[c].classList.contains("selected")) {
				row.cells[c].setAttribute("class", "");
				row.cells[c].classList.add("csv_label");
				//row.cells[c].classList.remove("selected");
			} else {
				row.cells[c].classList.remove("csv_label");
			}
		}
	}
});

/*
	csv_date - date of the transaction
*/
btnDate.addEventListener("click", (e) => {
	for (let r = 0; r < table.rows.length; r++) {
		const row = table.rows[r];
		for (let c = 0; c < row.cells.length; c++) {
			if (row.cells[c].classList.contains("selected")) {
				row.cells[c].setAttribute("class", "");
				row.cells[c].classList.add("csv_date");
				//row.cells[c].classList.remove("selected");
			} else {
				row.cells[c].classList.remove("csv_date");
			}
		}
	}
});

/*
	on Finalize, iterate through each row, then retrieve category, amount, date and name/label by iterating through each cell in the row and searching
	for the respective html classes, then finally create the transaction for that row before moving onto the next
*/
const btnFinalize = document.getElementById("btnFinalize");
btnFinalize.addEventListener("click", (e) => {
	for (let r = 0; r < table.rows.length; r++) {
		const row = table.rows[r];
		let cat_name = "None";
		let add_amount = 0;
		let add_date = "";
		let add_label = "";
		for (let c = 0; c < row.cells.length; c++) {
			if (row.cells[c].classList.contains("csv_category")) {
				cat_name = row.cells[c].innerHTML;
				if (does_category_exist(cat_name)) add_category(cat_name, 0x000);
			}
			if (row.cells[c].classList.contains("csv_amount")) {
				add_amount = parseFloat(row.cells[c].innerHTML);
			}
			if (row.cells[c].classList.contains("csv_date")) {
				add_date = row.cells[c].innerHTML;
			}
			if (row.cells[c].classList.contains("csv_label")) {
				add_label = row.cells[c].innerHTML;
			}
		}
		const datePattern = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;

		if (!datePattern.test(add_date)) {
			let parse_date = new Date(
				add_date.replace(" ", "T").replace(/(\.\d{3})\d+$/, "$1") + "Z",
			);
			add_transaction(
				cat_name,
				add_amount,
				parse_date.getDate() +
					"/" +
					parse_date.getMonth() +
					"/" +
					parse_date.getFullYear(),
				false,
			);
		} else {
			add_transaction(cat_name, add_amount, add_date, false);
		}
	}
});

fileInput.addEventListener("change", previewFile); //the Upload CSV button will call previewFile()

function previewFile() {
	const file = fileInput.files[0];
	const reader = new FileReader();

	reader.addEventListener("load", () => {
		//this will only fire once the file is done loading
		csv_parse_from_string(reader.result); //reader.result will contain the entire csv contents, will be changed in the final product
	});

	if (file) {
		reader.readAsText(file); //reads the csv file, will fire the "load" event once finished
	}
}
