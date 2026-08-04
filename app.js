const chartData = {
  7: {
    values: [8, 14, 11, 22, 19, 28, 33],
    labels: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
    completed: 147,
    summary: "+18.2%",
  },
  30: {
    values: [12, 18, 16, 24, 29, 27, 35],
    labels: ["W1", "W2", "W3", "W4", "W5", "W6", "W7"],
    completed: 524,
    summary: "+24.6%",
  },
  90: {
    values: [15, 21, 26, 23, 31, 38, 42],
    labels: ["M1", "M2", "M3", "M4", "M5", "M6", "M7"],
    completed: 1482,
    summary: "+31.8%",
  },
};

const menuButton = document.querySelector("#menuButton");
const mobileNav = document.querySelector("#mobileNav");

function closeMenu() {
  if (!menuButton || !mobileNav) return;
  mobileNav.hidden = true;
  menuButton.setAttribute("aria-expanded", "false");
}

menuButton?.addEventListener("click", () => {
  const willOpen = mobileNav.hidden;
  mobileNav.hidden = !willOpen;
  menuButton.setAttribute("aria-expanded", String(willOpen));
});

document.querySelectorAll("#mobileNav a").forEach((link) => link.addEventListener("click", closeMenu));
window.addEventListener("resize", () => {
  if (window.innerWidth > 760) closeMenu();
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 },
);

document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

function buildChart(values) {
  const width = 476;
  const startX = 24;
  const baseY = 180;
  const topY = 35;
  const max = Math.max(...values, 1);
  const step = width / (values.length - 1);
  const points = values.map((value, index) => {
    const x = startX + index * step;
    const y = baseY - (value / max) * (baseY - topY);
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  });
  return {
    line: points.map((point, index) => `${index ? "L" : "M"}${point.x} ${point.y}`).join(" "),
    area: `M${startX} ${baseY} ${points.map((point) => `L${point.x} ${point.y}`).join(" ")} L500 ${baseY} Z`,
    points,
  };
}

function animateNumber(element, nextValue) {
  if (!element) return;
  const startValue = Number(element.textContent.replace(/\D/g, "")) || 0;
  const duration = 420;
  const startTime = performance.now();

  const frame = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = Math.round(startValue + (nextValue - startValue) * eased).toLocaleString("vi-VN");
    if (progress < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function updateChart(range) {
  const data = chartData[range];
  if (!data) return;
  const chartLine = document.querySelector("#chartLine");
  const chartArea = document.querySelector("#chartArea");
  const chartPoints = document.querySelector("#chartPoints");
  const chartLabels = document.querySelector(".chart-labels");
  const completedMetric = document.querySelector("#completedMetric");
  const chartSummary = document.querySelector("#chartSummary");
  const geometry = buildChart(data.values);

  chartLine?.setAttribute("d", geometry.line);
  chartArea?.setAttribute("d", geometry.area);
  if (chartPoints) {
    chartPoints.innerHTML = geometry.points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="4" />`).join("");
  }
  if (chartLabels) {
    chartLabels.innerHTML = data.labels.map((label) => `<span>${label}</span>`).join("");
  }
  if (chartSummary) chartSummary.textContent = data.summary;
  animateNumber(completedMetric, data.completed);
}

document.querySelectorAll(".range-tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".range-tab").forEach((tab) => {
      const active = tab === button;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    updateChart(button.dataset.range);
  });
});

updateChart("7");
