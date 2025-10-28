const xValues = ["Italy", "France", "Spain", "USA", "Argentina"];
const yValues = [55, 49, 44, 24, 15];
const barColors = ["red", "green", "blue", "orange", "brown"];

const listEl = document.getElementById("list");
const form = document.getElementById("create-form");
const input = document.getElementById("text");

const labelInput = document.getElementById("label-input");
const amountInput = document.getElementById("amount-input");
const dateInput = document.getElementById("date-input");
const categoryInput = document.getElementById("category-select");

var categories = [];

function add_category(name) {
	if (categories.includes(name)) return -1;
	categories.push(name);
	const cat_select = document.getElementById("category-select");
	const cat_option = document.createElement("option");
	cat_option.value = name;
	cat_option.textContent = name;
	cat_select.appendChild(cat_option);
}

add_category("None");

var category_analytics_list = [];
function transac_struct(category_id, amount, name, date) {
	this.category_id = category_id;
	this.amount = amount;
	this.name = name;
	this.date = date;
}
var transac_list = [];
function analytic_struct(total_amount, num_of_transactions) {
	this.total_amount = total_amount;
	this.num_of_transactions = num_of_transactions;
}

function update_chart(chart_obj, canvas, type, labels, dataset, title) {
	if (chart_obj) chart_obj.destroy();
	chart_obj = new Chart(canvas, {
		type: type,
		data: {
			labels: labels,
			datasets: [
				{
					data: dataset,
				},
			],
		},
		options: {
			plugins: {
				title: {
					display: true,
					text: title,
					font: { size: 16 },
				},
			},
		},
	});
	return chart_obj;
}

const pie_chart1 = document.getElementById("pieChart1");
const pie_chart2 = document.getElementById("pieChart2");
var pie_chart1_obj;
var pie_chart2_obj;

function setup_pie_chart() {
	let pie_labels = [];
	let total_expenses = [];
	let total_num = [];
	for (let i = 0; i < categories.length; i++) {
		if (!category_analytics_list[i]) continue;
		pie_labels.push(categories[i]); //push category name
		total_expenses.push(category_analytics_list[i].total_amount);
		total_num.push(category_analytics_list[i].num_of_transactions);
	}
	if (category_analytics_list.length == 0) return;
	pie_chart1_obj = update_chart(
		pie_chart1_obj,
		pie_chart1,
		"pie",
		pie_labels,
		total_expenses,
		"Total Expenses By Category",
	);
	pie_chart2_obj = update_chart(
		pie_chart2_obj,
		pie_chart2,
		"pie",
		pie_labels,
		total_num,
		"Total Number of Transactions By Category",
	);
}

const analytics_div = document.getElementById("analytics-here");
var html_analytics_list = [];
function update_analytics_list_html() {
	analytics_div.innerHTML = "";
	for (let i = 0; i < categories.length; i++) {
		if (!category_analytics_list[i]) continue;
		const wrap = document.createElement("div");
		wrap.className = "analytics_category";
		wrap.textContent = categories[i];
		const total_expense = document.createElement("div");
		total_expense.textContent = category_analytics_list[i].total_amount;
		const total_transac = document.createElement("div");
		total_transac.textContent = category_analytics_list[i].num_of_transactions;
		wrap.appendChild(total_expense);
		wrap.appendChild(total_transac);
		analytics_div.appendChild(wrap);
	}
	setup_pie_chart();
}

function update_category(index) {
	var total_amnt = 0;
	var num_transac = 0;
	for (let i = 0; i < transac_list.length; i++) {
		let trans = transac_list[i];
		if (trans.category_id == index) {
			total_amnt += trans.amount;
			num_transac++;
		}
	}
	category_analytics_list[index] = new analytic_struct(total_amnt, num_transac);
}

function add_transaction(category_id, amount, name, date) {
	let created = new transac_struct(category_id, amount, name, date);
	transac_list.push(created);
	update_category(category_id);
	update_analytics_list_html();
	return created;
}

const fileInput = document.getElementById("upload");
const table = document.getElementById("table");

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

const radio_mode0 = document.getElementById("mode0");
const radio_mode1 = document.getElementById("mode1");

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

const btnCategory = document.getElementById("btnCategory");
const btnAmount = document.getElementById("btnAmount");
const btnLabel = document.getElementById("btnLabel");
const btnDate = document.getElementById("btnDate");

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

const btnFinalize = document.getElementById("btnFinalize");
btnFinalize.addEventListener("click", (e) => {
	for (let r = 0; r < table.rows.length; r++) {
		const row = table.rows[r];
		let cat_name = "None";
		let add_amount = 0;
		let add_date = 0;
		let add_label = "";
		for (let c = 0; c < row.cells.length; c++) {
			if (row.cells[c].classList.contains("csv_category")) {
				cat_name = row.cells[c].innerHTML;
				if (!categories.includes(cat_name)) add_category(cat_name);
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
		cat_id = categories.indexOf(cat_name);
		if (cat_id < 0) cat_id = 0;
		let created = add_transaction(cat_id, add_amount, add_label, add_date);
		renderItem2(created);
	}
});

fileInput.addEventListener("change", previewFile);

function previewFile() {
	const file = fileInput.files[0];
	const reader = new FileReader();

	reader.addEventListener("load", () => {
		//csv_preview.innerText = reader.result;
		csv_parse_from_string(reader.result);
	});

	if (file) {
		reader.readAsText(file);
	}
}

function renderItem(msg) {
	const wrap = document.createElement("div");
	wrap.className = "item";

	const text = document.createElement("div");
	text.textContent = msg.label;

	const meta = document.createElement("div");
	meta.className = "meta";
	//meta.textContent = new Date(msg.ts).toLocaleString();
	//meta.textContent = msg.amount;
	meta.textContent = new Date(msg.ts).toLocaleString() + " " + msg.amount;

	wrap.appendChild(text);
	wrap.appendChild(meta);
	listEl.prepend(wrap);
}

function renderItem2(transaction) {
	let wrap = document.createElement("div");
	wrap.className = "item";
	let text = document.createElement("div");
	text.textContent = transaction.name;
	let meta = document.createElement("div");
	meta.className = "meta";
	meta.textContent = transaction.amount;
	wrap.appendChild(text);
	wrap.appendChild(meta);
	listEl.prepend(wrap);
}

async function loadAll() {
	return;
	try {
		const res = await fetch("/api/messages");
		const data = await res.json();
		data.slice().reverse().forEach(renderItem);
	} catch (e) {
		console.error("Failed to load messages", e);
	}
}

// flask backend code, wip
form.addEventListener("submit", async (ev) => {
	ev.preventDefault();
	const labelValue = labelInput.value.trim();
	const amountValue = amountInput.value.trim();
	const dateValue = dateInput.value;
	const categoryIndex = categories.indexOf(categoryInput.value);

	let created = add_transaction(
		categoryIndex,
		parseFloat(amountValue),
		labelValue,
		dateValue,
	);
	renderItem2(created);
	return;

	//if (!text) return;

	try {
		const res = await fetch("/api/messages", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				label: labelValue,
				amount: amountValue,
				date: dateValue,
			}),
		});

		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			alert(err.error || "Failed to add message.");
			return;
		}

		const created = await res.json();
		renderItem(created);
		input.value = "";
		input.focus();
	} catch (e) {
		console.error("Failed to create message", e);
	}
});

loadAll();
