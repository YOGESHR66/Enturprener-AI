const activeCharts = new Map();

export function destroyAllCharts() {
  for (const chart of activeCharts.values()) {
    try {
      chart.destroy();
    } catch {
      // ignore
    }
  }
  activeCharts.clear();
}

export function renderFinancialCharts(scenario) {
  const ChartLib = window.Chart;
  if (!ChartLib || !scenario || !Array.isArray(scenario.series)) return;

  const revCanvas = document.getElementById("chart-rev-exp");
  const cfCanvas = document.getElementById("chart-cashflow");

  if (activeCharts.has("revExp")) {
    activeCharts.get("revExp").destroy();
    activeCharts.delete("revExp");
  }
  if (activeCharts.has("cashflow")) {
    activeCharts.get("cashflow").destroy();
    activeCharts.delete("cashflow");
  }

  const labels = scenario.series.map((p) => p.label);
  const revenues = scenario.series.map((p) => p.revenue);
  const expenses = scenario.series.map((p) => p.expenses);
  const cashflow = scenario.series.map((p) => p.cumulative_cashflow);

  if (revCanvas) {
    const c1 = new ChartLib(revCanvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Est. Revenue",
            data: revenues,
            backgroundColor: "#2563eb",
            borderRadius: 4,
          },
          {
            label: "Est. Expenses",
            data: expenses,
            backgroundColor: "#0b132b",
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top", labels: { boxWidth: 12, font: { family: "DM Sans" } } },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: "#f1f5f9" },
            ticks: { font: { family: "JetBrains Mono", size: 11 } },
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: "JetBrains Mono", size: 11 } },
          },
        },
      },
    });
    activeCharts.set("revExp", c1);
  }

  if (cfCanvas) {
    const c2 = new ChartLib(cfCanvas, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Est. Cumulative Cash Flow",
            data: cashflow,
            borderColor: "#2563eb",
            backgroundColor: "rgba(37, 99, 235, 0.12)",
            fill: true,
            tension: 0.25,
            pointRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top", labels: { boxWidth: 12, font: { family: "DM Sans" } } },
        },
        scales: {
          y: {
            grid: { color: "#f1f5f9" },
            ticks: { font: { family: "JetBrains Mono", size: 11 } },
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: "JetBrains Mono", size: 11 } },
          },
        },
      },
    });
    activeCharts.set("cashflow", c2);
  }
}

export function renderDashboardMiniChart(scenario) {
  const ChartLib = window.Chart;
  const canvas = document.getElementById("chart-dashboard-fin");
  if (!ChartLib || !canvas || !scenario || !Array.isArray(scenario.series)) return;

  if (activeCharts.has("dashFin")) {
    activeCharts.get("dashFin").destroy();
    activeCharts.delete("dashFin");
  }

  const c = new ChartLib(canvas, {
    type: "line",
    data: {
      labels: scenario.series.map((p) => p.label),
      datasets: [
        {
          label: "Est. Net Profit",
          data: scenario.series.map((p) => p.net_profit),
          borderColor: "#2563eb",
          backgroundColor: "rgba(37, 99, 235, 0.1)",
          fill: true,
          tension: 0.25,
          pointRadius: 2.5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { grid: { color: "#f1f5f9" }, ticks: { font: { family: "JetBrains Mono", size: 11 } } },
        x: { grid: { display: false }, ticks: { font: { family: "JetBrains Mono", size: 11 } } },
      },
    },
  });
  activeCharts.set("dashFin", c);
}
