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
		/*
		const clearInput = document.getElementById("btnClearLocalStorage");
		clearInput.addEventListener("click", (e) => {
			e.preventDefault();
			resetExpenses();
		});
		*/
		expenseForm.addEventListener("submit", async (event) => {
			event.preventDefault();
			console.log("test!");
			// Get the inputs
			const amountInput = expenseForm.querySelector("#amount");
			const labelInput = expenseForm.querySelector("#label");
			const categoryInput = expenseForm.querySelector("#category");
			const impulseInput = expenseForm.querySelector("#impulse");

			// If anything is missing, do nothing
			if (!amountInput || !categoryInput || !impulseInput || !dateInput) {
				return;
			}

			// Read values from the form
			const amountValue = parseFloat(amountInput.value);
			const labelValue = labelInput ? labelInput.value.trim() : "";
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

			const wasSaved = await add_transaction(
				categoryValue,
				amountValue,
				dateValue,
				impulseValue,
				labelValue,
			);

			if (wasSaved) {
				expenseForm.reset();
			}
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
var global_expenses;

async function runInit() {
	if (!global_expenses) {
		global_expenses = await readExpenses();
	}
	console.log("Global Expenses");
	console.log(global_expenses);
	for (let i = 0; i < global_expenses.length; i++) {
		add_category(global_expenses[i].category, 0x000);
	}
}

add_category("None", 0x000);
runInit();

// Read expenses from your browser storage
async function readExpenses() {
	let storedExpenses = [];

	const request = await fetch("/load_transcript");

	const result = await request.json();

	storedExpenses = result.data;
	console.log("Loaded json:", storedExpenses);

	if (!storedExpenses) {
		console.log("nice");
		return [];
	}

	//const parsedExpenses = JSON.parse(storedExpenses);
	if (!Array.isArray(storedExpenses)) {
		return [];
	}

	return storedExpenses
		.filter((item) => typeof item === "object" && item !== null)
		.map((item) => ({
			amount:
				typeof item.amount === "number"
					? item.amount
					: parseFloat(item.amount) || 0,
			label: typeof item.label === "string" ? item.label : "",
			category: typeof item.category === "string" ? item.category : "",
			impulse: typeof item.impulse === "string" ? item.impulse : "",
			date: typeof item.date === "string" ? item.date : "",
		}));
}

// Save all expenses back to your browser storage
function persistExpenses(expenses) {
	localStorage.setItem("expenses", JSON.stringify(expenses));
	fetch("/save_transcript", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ data: expenses }),
	})
		.then((response) => response.json())
		.then((result) => {
			console.log("Saved!", result);
		})
		.catch((err) => console.error(err));
}

function resetExpenses() {
	localStorage.setItem("expenses", "");
}

// Show the expense list and the total
async function renderOverview(listElement) {
	const totalElement = document.getElementById("expense-total");
	const expenses = await readExpenses();

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

		// left side
		const leftDiv = document.createElement("div");
		leftDiv.className = "expense-left";

		const catSpan = document.createElement("div");
		catSpan.className = "expense-category";
		catSpan.textContent = expense.category;

		const impulseSpan = document.createElement("div");
		impulseSpan.className = "expense-subtext";

		const isImpulse = expense.impulse === "yes" ? "Impulse" : "Planned";
		impulseSpan.textContent = `${isImpulse} • ${expense.date}`;

		leftDiv.appendChild(catSpan);
		leftDiv.appendChild(impulseSpan);

		// middle
		const middleDiv = document.createElement("div");
		middleDiv.className = "expense-middle";
		// show if label exsists
		if (expense.label) {
			middleDiv.textContent = expense.label;
		}

		// right
		const rightDiv = document.createElement("div");
		rightDiv.className = "expense-right";
		rightDiv.textContent = `$${amount.toFixed(2)}`;

		listItem.appendChild(leftDiv);
		listItem.appendChild(middleDiv);
		listItem.appendChild(rightDiv);

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

function normalizeImpulseValue(rawImpulse) {
	if (typeof rawImpulse === "string") {
		return rawImpulse.toLowerCase();
	}

	if (rawImpulse === true) {
		return "yes";
	}

	if (rawImpulse === false) {
		return "no";
	}

	return "";
}

async function getMonthlyImpulseStats(targetDate) {
	if (!(targetDate instanceof Date) || Number.isNaN(targetDate)) {
		return { count: 0, total: 0 };
	}

	const expenses = await readExpenses();
	const month = targetDate.getMonth();
	const year = targetDate.getFullYear();
	let count = 0;
	let total = 0;

	expenses.forEach((expense) => {
		const expenseDate = parseDateString(expense.date);
		const isImpulse =
			typeof expense.impulse === "string" &&
			expense.impulse.toLowerCase() === "yes";

		if (
			isImpulse &&
			expenseDate &&
			expenseDate.getMonth() === month &&
			expenseDate.getFullYear() === year
		) {
			const amount =
				typeof expense.amount === "number"
					? expense.amount
					: parseFloat(expense.amount) || 0;
			total += amount;
			count += 1;
		}
	});

	return { count, total };
}

function createImpulseConfirmation() {
	const modal = document.getElementById("impulse-modal");
	const messageEl = document.getElementById("impulse-modal-message");
	const confirmBtn = document.getElementById("impulse-confirm");
	const cancelBtn = document.getElementById("impulse-cancel");

	if (!modal || !messageEl || !confirmBtn || !cancelBtn) {
		return async (message) => window.confirm(message);
	}

	let resolveChoice = null;

	const close = () => {
		modal.classList.remove("open");
		modal.setAttribute("aria-hidden", "true");
	};

	const handleChoice = (choice) => {
		if (resolveChoice) {
			resolveChoice(choice);
			resolveChoice = null;
		}
		close();
	};

	confirmBtn.addEventListener("click", () => handleChoice(true));
	cancelBtn.addEventListener("click", () => handleChoice(false));

	return (message) => {
		messageEl.textContent = message;
		modal.classList.add("open");
		modal.setAttribute("aria-hidden", "false");
		return new Promise((resolve) => {
			resolveChoice = resolve;
		});
	};
}

const requestImpulseConfirmation = createImpulseConfirmation();

/*


	CSV IMPORTER CODE!!!


*/

//add a new transaction to the transac_list and update all analytics
async function add_transaction(
	categoryValue,
	amountValue,
	dateValue,
	impulseValue,
	labelValue = "",
) {
	// let created = new transac_struct(category_id, amount, name, date);
	// transac_list.push(created);
	// update_category(category_id);
	// update_analytics_list_html();
	// return created;

	// Make an expense object
	const expense = {
		amount: Number.isNaN(amountValue) ? 0 : amountValue,
		category: categoryValue,
		impulse: normalizeImpulseValue(impulseValue),
		date: dateValue,
		label: labelValue,
	};

	// If impulse, check monthly impulse purchases
	if (expense.impulse === "yes") {
		const purchaseDate = parseDateString(expense.date);
		const { count, total } = await getMonthlyImpulseStats(purchaseDate);
		console.log("Impulse");
		console.log(count);
		console.log(total);
		// if count >= 4 then pop the window up
		if (count >= 4) {
			const pendingCount = count + 1;
			const pendingTotal = total + expense.amount;
			const message = `You have spent $${pendingTotal.toFixed(
				2,
			)} on impulse purchases this month and have made ${pendingCount} impulse purchases.\nAre you sure you want to continue?`;
			const shouldLog = await requestImpulseConfirmation(message);

			if (!shouldLog) {
				return false;
			}
		}
	}

	// Get old expenses, add the new one, save all
	if (!global_expenses) {
		global_expenses = await readExpenses();
	}
	const expenses = global_expenses;
	expenses.push(expense);
	persistExpenses(expenses);

	return true;
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
btnFinalize.addEventListener("click", async (e) => {
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
			await add_transaction(
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
			await add_transaction(cat_name, add_amount, add_date, false);
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

const addCategory = document.getElementById("addCategory");
addCategory.addEventListener("keyup", function (event) {
	if (event.key === "Enter") {
		add_category(addCategory.value, 0x000);
		addCategory.value = "";
	}
});
// monthly budget input handling
document.addEventListener("DOMContentLoaded", () => {
	const budgetInput = document.getElementById("monthly-budget");
	if (!budgetInput) return;

	const storedBudget = parseFloat(localStorage.getItem("monthlyBudget") || "0");
	if (!isNaN(storedBudget) && storedBudget > 0) {
		budgetInput.value = storedBudget;
	}

	budgetInput.addEventListener("change", () => {
		const value = parseFloat(budgetInput.value);
		if (!isNaN(value) && value >= 0) {
			localStorage.setItem("monthlyBudget", String(value));
		}
	});
});

/*

		Moving PDF import code here!

*/

import * as pdfjsLib from "https://unpkg.com/pdfjs-dist@5.4.449/build/pdf.mjs";
pdfjsLib.GlobalWorkerOptions.workerSrc =
	"https://unpkg.com/pdfjs-dist@5.4.449/build/pdf.worker.mjs";

const file_Input = document.getElementById("file-input");
const pagesContainer = document.getElementById("pages-container");
const infoDiv = document.getElementById("info");

let pdfDoc = null;

// Global selection across ALL pages:
// [{ pageNum, item }]
let selectedItems = [];
let selAmounts = [];
let selCategories = [];
let selDates = [];

// Per-page contexts so we can redraw highlights everywhere
// pageContexts[pageNum] = { textItems, viewport, overlayCtx, overlayCanvas }
const pageContexts = {};

// Drag state (global – only one drag at a time)
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let dragEnd = { x: 0, y: 0 };
let currentPageBeingDragged = null;

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const pdfFinalize = document.getElementById("pdfFinalize");
pdfFinalize.addEventListener("click", async (e) => {
	console.log(selAmounts);
	console.log(selCategories);
	console.log(selDates);
	for (let i = 0; i < selAmounts.length; i++) {
		if (selAmounts[i] < 0.0) {
			continue;
		}
		await add_transaction(
			selCategories[i],
			selAmounts[i],
			selDates[i],
			false,
			"",
		);
		await sleep(50); //todo: send entire transactions list at once instead of this horrific bandaid fix
	}
});
const pdfAmount = document.getElementById("pdfAmount");
pdfAmount.addEventListener("click", async (e) => {
	for (let i = 0; i < selectedItems.length; i++) {
		let testString = selectedItems[i].item.str;
		selAmounts.push(parseFloat(testString.replace(/[^0-9.-]/g, "")));
	}
});
const pdfCategory = document.getElementById("pdfCategory");
pdfCategory.addEventListener("click", async (e) => {
	for (let i = 0; i < selectedItems.length; i++) {
		let testString = selectedItems[i].item.str;
		selCategories.push(testString);
	}
});
function convertDate(str) {
	const MONTHS = {
		JAN: 1,
		FEB: 2,
		MAR: 3,
		APR: 4,
		MAY: 5,
		JUN: 6,
		JUL: 7,
		AUG: 8,
		SEP: 9,
		OCT: 10,
		NOV: 11,
		DEC: 12,
	};

	const [monStr, dayStr] = str.trim().split(/\s+/);
	const month = MONTHS[monStr.toUpperCase()];
	const day = parseInt(dayStr, 10);
	const year = 2025;

	// zero-pad
	const dd = day.toString().padStart(2, "0");
	const mm = month.toString().padStart(2, "0");

	return `${dd}/${mm}/${year}`;
}
const pdfDate = document.getElementById("pdfDate");
pdfDate.addEventListener("click", async (e) => {
	for (let i = 0; i < selectedItems.length; i++) {
		let testString = selectedItems[i].item.str;
		selDates.push(convertDate(testString));
	}
});

file_Input.addEventListener("change", (e) => {
	const file = e.target.files[0];
	if (!file) return;

	const reader = new FileReader();
	reader.onload = async (ev) => {
		const data = new Uint8Array(ev.target.result);
		pagesContainer.innerHTML = "";
		infoDiv.textContent = "";

		selectedItems = [];
		Object.keys(pageContexts).forEach((k) => delete pageContexts[k]);

		pdfDoc = await pdfjsLib.getDocument({ data }).promise;
		infoDiv.textContent = `Loaded PDF with ${pdfDoc.numPages} pages.\nRendering...`;

		// Render all pages
		for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
			await renderPageView(pageNum);
		}

		infoDiv.textContent += `\nDone. Click or drag on any page to select text.`;
	};
	reader.readAsArrayBuffer(file);
});

// --- Helpers ---

function applyViewport(point, viewport) {
	const [A, B, C, D, E, F] = viewport.transform;
	const [x, y] = point;
	return [A * x + C * y + E, B * x + D * y + F];
}

function pdfBoxToCanvasBox(pdfBox, viewport) {
	const p1 = applyViewport([pdfBox.x1, pdfBox.y1], viewport);
	const p2 = applyViewport([pdfBox.x2, pdfBox.y2], viewport);

	const left = Math.min(p1[0], p2[0]);
	const top = Math.min(p1[1], p2[1]);
	const right = Math.max(p1[0], p2[0]);
	const bottom = Math.max(p1[1], p2[1]);

	return {
		x: left,
		y: top,
		width: right - left,
		height: bottom - top,
	};
}

function rectsIntersect(r1, r2) {
	return !(
		r2.x > r1.x + r1.width ||
		r2.x + r2.width < r1.x ||
		r2.y > r1.y + r1.height ||
		r2.y + r2.height < r1.y
	);
}

function getCanvasCoords(canvas, event) {
	const rect = canvas.getBoundingClientRect();
	return {
		x: event.clientX - rect.left,
		y: event.clientY - rect.top,
	};
}

function drawItemHighlight(ctx, box) {
	ctx.save();
	ctx.fillStyle = "rgba(255, 255, 0, 0.35)";
	ctx.strokeStyle = "rgba(255, 200, 0, 1)";
	ctx.lineWidth = 1;
	ctx.fillRect(box.x, box.y, box.width, box.height);
	ctx.strokeRect(box.x, box.y, box.width, box.height);
	ctx.restore();
}

function drawSelectionRect(ctx, sel) {
	ctx.save();
	ctx.strokeStyle = "rgba(0, 128, 255, 1)";
	ctx.fillStyle = "rgba(0, 128, 255, 0.15)";
	ctx.lineWidth = 1;
	ctx.fillRect(sel.x, sel.y, sel.width, sel.height);
	ctx.strokeRect(sel.x, sel.y, sel.width, sel.height);
	ctx.restore();
}

function getSelectionRect() {
	const x = Math.min(dragStart.x, dragEnd.x);
	const y = Math.min(dragStart.y, dragEnd.y);
	const width = Math.abs(dragEnd.x - dragStart.x);
	const height = Math.abs(dragEnd.y - dragStart.y);
	return { x, y, width, height };
}

// Redraw all global highlights, plus optional live selection rect
function redrawGlobalHighlights(selectionRect = null) {
	// Clear overlays on all pages
	for (const pageNum in pageContexts) {
		const { overlayCtx, overlayCanvas } = pageContexts[pageNum];
		overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
	}

	// Draw persistent selection on each page
	for (const sel of selectedItems) {
		const { pageNum, item } = sel;
		const ctxInfo = pageContexts[pageNum];
		if (!ctxInfo) continue;

		const { viewport, overlayCtx } = ctxInfo;
		const box = pdfBoxToCanvasBox(item.pdfBox, viewport);
		drawItemHighlight(overlayCtx, box);
	}

	// Draw live drag rectangle on the current page, if any
	if (
		selectionRect &&
		selectionRect.width > 0 &&
		selectionRect.height > 0 &&
		currentPageBeingDragged != null
	) {
		const ctxInfo = pageContexts[currentPageBeingDragged];
		if (ctxInfo) {
			drawSelectionRect(ctxInfo.overlayCtx, selectionRect);
		}
	}
}

// --- Render a single page with its own canvases and events ---

async function renderPageView(pageNum) {
	const page = await pdfDoc.getPage(pageNum);
	const scale = 1.5;
	const viewport = page.getViewport({ scale });

	// DOM structure:
	// wrapper
	//   label
	//   pageCanvasContainer
	//     pdfCanvas
	//     overlayCanvas
	const wrapper = document.createElement("div");
	wrapper.className = "page-wrapper";

	const label = document.createElement("div");
	label.className = "page-label";
	label.textContent = `Page ${pageNum}`;

	const pageCanvasContainer = document.createElement("div");
	pageCanvasContainer.className = "page-canvas-container";

	const pdfCanvas = document.createElement("canvas");
	const overlayCanvas = document.createElement("canvas");
	overlayCanvas.className = "overlay-canvas";

	pdfCanvas.width = viewport.width;
	pdfCanvas.height = viewport.height;
	overlayCanvas.width = viewport.width;
	overlayCanvas.height = viewport.height;

	pageCanvasContainer.appendChild(pdfCanvas);
	pageCanvasContainer.appendChild(overlayCanvas);

	wrapper.appendChild(label);
	wrapper.appendChild(pageCanvasContainer);

	pagesContainer.appendChild(wrapper);

	const pdfCtx = pdfCanvas.getContext("2d");
	const overlayCtx = overlayCanvas.getContext("2d");

	// Render PDF page
	await page.render({ canvasContext: pdfCtx, viewport }).promise;

	// Extract text items in PDF space
	const textContent = await page.getTextContent();
	const textItems = textContent.items.map((item, index) => {
		const [a, b, c, d, e, f] = item.transform;

		// PDF-space box: baseline as bottom
		const x1 = e;
		const y1 = f;
		const x2 = x1 + item.width;
		const y2 = y1 + item.height;

		return {
			index,
			str: item.str,
			pdfBox: { x1, y1, x2, y2 },
		};
	});

	// Register this page's context globally
	pageContexts[pageNum] = {
		textItems,
		viewport,
		overlayCtx,
		overlayCanvas,
	};

	// --- Events for this page ---

	// Drag selection (start)
	pdfCanvas.addEventListener("mousedown", (event) => {
		const { x, y } = getCanvasCoords(pdfCanvas, event);
		isDragging = true;
		currentPageBeingDragged = pageNum;
		dragStart = { x, y };
		dragEnd = { x, y };

		// Clear any live box, keep current highlights
		redrawGlobalHighlights();
	});

	// Drag selection (move)
	pdfCanvas.addEventListener("mousemove", (event) => {
		if (!isDragging || currentPageBeingDragged !== pageNum) return;

		const { x, y } = getCanvasCoords(pdfCanvas, event);
		dragEnd = { x, y };

		const sel = getSelectionRect();
		const newlySelected = [];
		for (const item of textItems) {
			const box = pdfBoxToCanvasBox(item.pdfBox, viewport);
			if (rectsIntersect(sel, box) && item.str != "" && item.str != " ") {
				newlySelected.push(item);
			}
		}

		// Replace global selection with this drag's items
		selectedItems = newlySelected.map((item) => ({
			pageNum,
			item,
		}));
		redrawGlobalHighlights(sel);
	});

	// Global mouseup handles finishing the drag
	window.addEventListener("mouseup", (event) => {
		if (!isDragging || currentPageBeingDragged !== pageNum) return;
		isDragging = false;

		const sel = getSelectionRect();

		const newlySelected = [];
		for (const item of textItems) {
			const box = pdfBoxToCanvasBox(item.pdfBox, viewport);
			if (rectsIntersect(sel, box) && item.str != "" && item.str != " ") {
				newlySelected.push(item);
			}
		}

		// Replace global selection with this drag's items
		selectedItems = newlySelected.map((item) => ({
			pageNum,
			item,
		}));

		redrawGlobalHighlights();
		currentPageBeingDragged = null;

		const combinedText = newlySelected.map((i) => i.str).join(" ");
		infoDiv.textContent =
			`Drag selection on page ${pageNum}: ${newlySelected.length} items\n` +
			combinedText;
	});
}
