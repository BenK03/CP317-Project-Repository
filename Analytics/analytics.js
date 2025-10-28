document.addEventListener("DOMContentLoaded", () => {
  const expenses = readExpenses();

  if (!expenses.length) {
    alert("No expense data found. Please add some expenses first.");
    return;
  }

  // --- Chart 1: Spending by Category (Today Only) ---

  // checks if 2 dates are the same
  function isSameLocalDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
          a.getMonth() === b.getMonth() &&
          a.getDate() === b.getDate();
  }
  //current day
  const today = new Date();

  //changed date to corrent object formant
  const todaysExpenses = (expenses || []).filter(e => {
    const d = parseDateString(e.date);
    return d && isSameLocalDay(d, today);
  });

  // creates cateegores for today's chart
  const categoryTotals = {};
  for (const e of todaysExpenses) {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.amount || 0);
  }

  // no spending today
  const catEl = document.getElementById("categoryChart");
  const labels = Object.keys(categoryTotals);
  const values = Object.values(categoryTotals);

  //using chart js, this creates the donut
  //  chart
  if (labels.length === 0) {
    const empty = document.createElement("div");
    empty.style.padding = "1rem";
    empty.textContent = "No spending today.";
    catEl.replaceWith(empty);
  } else {
    new Chart(catEl, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: [
            "#66bb6a", "#42a5f5", "#ffca28", "#ef5350",
            "#ab47bc", "#26c6da", "#8d6e63", "#9ccc65"
          ]
        }]
      }
    });
  }

  // --- Chart 2: Weekly Spend (Sunday–Saturday) ---

  // format date as "YYYY-MM-DD"
  function ymd(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // find wich day is Sunday of this week
  const T0day = new Date();
  const dayOfWeek = T0day.getDay(); 
  const startOfWeek = new Date(T0day);
  startOfWeek.setDate(T0day.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);

  // puts in all days of the week in a list
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    weekDays.push(d);
  }

  // resets totals
  const weeklyTotals = {};
  for (const d of weekDays) weeklyTotals[ymd(d)] = 0;

  // add up all expenses for each day 
  for (const e of expenses) {
    const d = parseDateString(e.date);
    if (!d) continue;

    // Normalize to local midnight
    const dayOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (dayOnly >= startOfWeek && dayOnly <= new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 6)) {
      const key = ymd(dayOnly);
      weeklyTotals[key] = (weeklyTotals[key] || 0) + Number(e.amount || 0);
    }
  }

  // lables
  const weekLabels = weekDays.map(d => d.toLocaleDateString(undefined, { weekday: "short" }));
  const weekValues = weekDays.map(d => weeklyTotals[ymd(d)] || 0);

  //set up acaully chart
  new Chart(document.getElementById("timeChart"), {
    type: "bar",
    data: {
      labels: weekLabels,
      datasets: [{
        label: "Amount Spent ($)",
        data: weekValues,
        backgroundColor: "#42a5f5"
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, title: { display: true, text: "Amount ($)" } },
        x: { title: { display: true, text: "Day of Week" } }
      },
      plugins: {
        tooltip: {
          callbacks: {
            title: (items) => {
              const i = items[0].dataIndex;
              const d = weekDays[i];
              return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
            }
          }
        }
      }
    }
  });
  // --- Chart 3: Monthly Spend (All Months Present in Data) ---

  // build months
  const monthlyTotals = {};
  for (const e of expenses) {
    const d = parseDateString(e.date); //-> from the main file
    if (!d) continue;

    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyTotals[key] = (monthlyTotals[key] || 0) + Number(e.amount || 0);
  }

  // Sort each month
  const monthKeys = Object.keys(monthlyTotals).sort();

  // labales for each month
  const monthLabels = monthKeys.map((k) => {
    const [y, m] = k.split("-").map(Number);
    const dt = new Date(y, m - 1, 1);
    return dt.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  });

  // values for each month
  const monthValues = monthKeys.map((k) => monthlyTotals[k]);

  // create chart
  new Chart(document.getElementById("monthlyChart"), {
    type: "line",
    data: {
      labels: monthLabels,
      datasets: [{
        label: "Amount Spent ($)",
        data: monthValues,
        backgroundColor: "#9ccc65"
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, title: { display: true, text: "Amount ($)" } },
        x: { title: { display: true, text: "Month" } }
      },
      plugins: {
        tooltip: {
          callbacks: {
            // Show full month+year in tooltip title
            title: (items) => items[0].label
          }
        }
      }
    }
  });

  // --- Chart 4: Impulse vs Planned ---
  let impulseYes = 0, impulseNo = 0;
  expenses.forEach(e => {
    if (e.impulse === "yes") impulseYes += e.amount;
    else impulseNo += e.amount;
  });

  new Chart(document.getElementById("impulseChart"), {
    type: "bar",
    data: {
      labels: ["Impulse Purchases", "Planned Purchases"],
      datasets: [{
        label: "Total Amount ($)",
        data: [impulseYes, impulseNo],
        backgroundColor: ["#ef5350", "#66bb6a"]
      }]
    },
    options: {
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
});