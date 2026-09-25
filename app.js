const form = document.querySelector("#entry-form");
const rows = document.querySelector("#entry-rows");
const totalOutput = document.querySelector("#total-amount");
const submitButton = document.querySelector("#submit-button");
const overview = document.querySelector("#overview");
const overviewTotal = document.querySelector("#overview-total");
const exportButton = document.querySelector("#export-button");

const entries = new Map();
const money = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const tableNumber = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

function displayNumber(value) {
  return tableNumber.format(value);
}

function render() {
  rows.replaceChildren();
  let grandTotal = 0;

  for (const [number, entry] of entries) {
    const rowTotal = entry.quantity * entry.amount;
    grandTotal += rowTotal;
    const row = document.createElement("tr");
    for (const value of [number, displayNumber(entry.quantity), displayNumber(entry.amount), displayNumber(rowTotal)]) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    }
    rows.append(row);
  }

  totalOutput.textContent = money.format(grandTotal);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const number = String(data.get("number")).trimEnd();
  const quantity = Number(data.get("quantity"));
  const amount = Number(data.get("amount"));
  if (!number || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(amount) || amount <= 0) return;

  const existing = entries.get(number);
  if (existing) {
    const nextQuantity = existing.quantity + quantity;
    const combinedTotal = existing.quantity * existing.amount + quantity * amount;
    existing.quantity = nextQuantity;
    existing.amount = combinedTotal / nextQuantity;
  } else {
    entries.set(number, { quantity, amount });
  }

  form.reset();
  render();
  document.querySelector("#number").focus();
});

submitButton.addEventListener("click", () => {
  overviewTotal.textContent = `Total Amount: ${money.format([...entries.values()].reduce((sum, entry) => sum + entry.quantity * entry.amount, 0))}`;
  overview.hidden = false;
});

function csvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

exportButton.addEventListener("click", () => {
  const lines = [["Number", "Quantity", "Amount", "Total Amount"].map(csvCell).join(",")];
  for (const [number, entry] of entries) {
    lines.push([number, displayNumber(entry.quantity), entry.amount.toFixed(2), (entry.quantity * entry.amount).toFixed(2)].map(csvCell).join(","));
  }
  const grandTotal = [...entries.values()].reduce((sum, entry) => sum + entry.quantity * entry.amount, 0);
  lines.push(["", "", "Total", grandTotal.toFixed(2)].map(csvCell).join(","));
  const file = new Blob([`\uFEFF${lines.join("\r\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = "overview.csv";
  link.click();
  URL.revokeObjectURL(url);
});
