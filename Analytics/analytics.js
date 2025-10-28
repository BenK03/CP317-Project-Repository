document.addEventListener("DOMContentLoaded", () => {
  const expenses = readExpenses();

  if (!expenses.length) {
    alert("No expense data found. Please add some expenses first.");
    return;
  }

  // --- Chart 1: Spending by Category ---
  const categoryTotals = {};
  expenses.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });

  new Chart(document.getElementById("categoryChart"), {
    type: "pie",
    data: {
      labels: Object.keys(categoryTotals),
      datasets: [{
        data: Object.values(categoryTotals),
        backgroundColor: [
          "#66bb6a", "#42a5f5", "#ffca28", "#ef5350",
          "#ab47bc", "#26c6da", "#8d6e63", "#9ccc65"
        ]
      }]
    }
  });

  // --- Chart 2: Spending Over Time ---
  const timeTotals = {};
  expenses.forEach(e => {
    const d = parseDateString(e.date);
    if (d) {
      const key = d.toISOString().split("T")[0];
      timeTotals[key] = (timeTotals[key] || 0) + e.amount;
    }
  });

  const sortedDates = Object.keys(timeTotals).sort();
  new Chart(document.getElementById("timeChart"), {
    type: "line",
    data: {
      labels: sortedDates,
      datasets: [{
        label: "Total Spending ($)",
        data: sortedDates.map(d => timeTotals[d]),
        fill: false,
        borderColor: "#2b7a4b",
        tension: 0.2
      }]
    }
  });

  // --- Chart 3: Impulse vs Planned ---
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