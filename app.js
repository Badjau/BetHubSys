const form = document.querySelector("#entry-form");
const rows = document.querySelector("#entry-rows");
const totalOutput = document.querySelector("#total-amount");
const submitButton = document.querySelector("#submit-button");
const amountInput = document.querySelector("#amount");
const overviewActions = document.querySelector("#overview-actions");
const overviewTotal = document.querySelector("#overview-total");
const resetButton = document.querySelector("#reset-button");
const exportButton = document.querySelector("#export-button");

const entries = new Map();
const paidEntries = new Map();
let nextEntryId = 1;
const money = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const tableNumber = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
let editWarningShown = false;

amountInput.addEventListener("blur", () => {
  if (amountInput.value !== "" && Number.isFinite(amountInput.valueAsNumber)) {
    amountInput.value = amountInput.valueAsNumber.toFixed(2);
  }
});

function displayNumber(value) {
  return tableNumber.format(value);
}

function render() {
  rows.replaceChildren();
  let grandTotal = 0;

  for (const entry of entries.values()) {
    const { id, number } = entry;
    const rowTotal = entry.quantity * entry.amount;
    grandTotal += rowTotal;
    const row = document.createElement("tr");
    row.dataset.id = id;

    for (const [field, value] of [["number", number], ["quantity", entry.quantity], ["amount", entry.amount]]) {
      const cell = document.createElement("td");
      const input = document.createElement("input");
      input.className = "table-editor";
      input.type = field === "number" ? "text" : "number";
      if (field !== "number") {
        input.min = "0.01";
        input.step = field === "amount" ? "0.01" : "any";
      }
      input.value = field === "amount" ? Number(value).toFixed(2) : String(value);
      input.dataset.field = field;
      input.setAttribute("aria-label", `${field} for ${number}`);
      cell.append(input);
      row.append(cell);
    }

    const totalCell = document.createElement("td");
    totalCell.className = "row-total";
    totalCell.textContent = displayNumber(rowTotal);
    row.append(totalCell);
    rows.append(row);
  }

  totalOutput.textContent = money.format(grandTotal);
}

rows.addEventListener("focusin", (event) => {
  if (!event.target.matches("input[data-field]") || editWarningShown) return;
  editWarningShown = true;
  window.alert("Table fields are editable. Changes update totals, and rows merge when both Number and Amount match.");
});

rows.addEventListener("change", (event) => {
  const input = event.target.closest("input[data-field]");
  if (!input) return;

  const row = input.closest("tr");
  const id = row.dataset.id;
  const entry = entries.get(id);
  if (!entry) return;

  const numberInput = row.querySelector('[data-field="number"]');
  const quantityInput = row.querySelector('[data-field="quantity"]');
  const amountCellInput = row.querySelector('[data-field="amount"]');
  const number = numberInput.value.trimEnd();
  const quantity = Number(quantityInput.value);
  const amount = Number(amountCellInput.value);

  if (!number || !quantityInput.validity.valid || !Number.isFinite(quantity) || quantity <= 0 ||
      !amountCellInput.validity.valid || !Number.isFinite(amount) || amount <= 0) {
    render();
    return;
  }

  const duplicate = [...entries.values()].find((candidate) =>
    candidate.id !== id && candidate.number === number && candidate.amount.toFixed(2) === amount.toFixed(2)
  );

  if (duplicate) {
    duplicate.quantity += quantity;
    entries.delete(id);
    row.remove();
    const duplicateRow = [...rows.rows].find((candidate) => candidate.dataset.id === duplicate.id);
    duplicateRow.querySelector('[data-field="quantity"]').value = String(duplicate.quantity);
    duplicateRow.querySelector(".row-total").textContent = displayNumber(duplicate.quantity * duplicate.amount);
  } else {
    entry.number = number;
    entry.quantity = quantity;
    entry.amount = amount;
    row.querySelector('[data-field="number"]').value = number;
    for (const field of ["number", "quantity", "amount"]) {
      row.querySelector(`[data-field="${field}"]`).setAttribute("aria-label", `${field} for ${number}`);
    }
    row.querySelector('[data-field="quantity"]').value = String(quantity);
    row.querySelector('[data-field="amount"]').value = amount.toFixed(2);
    row.querySelector(".row-total").textContent = displayNumber(quantity * amount);
  }

  totalOutput.textContent = money.format([...entries.values()].reduce((sum, item) => sum + item.quantity * item.amount, 0));
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const number = String(data.get("number")).trimEnd();
  const quantity = Number(data.get("quantity"));
  const amount = Number(data.get("amount"));
  if (!number || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(amount) || amount <= 0) return;

  const existing = [...entries.values()].find((entry) =>
    entry.number === number && entry.amount.toFixed(2) === amount.toFixed(2)
  );
  if (existing) {
    existing.quantity += quantity;
  } else {
    const id = String(nextEntryId++);
    entries.set(id, { id, number, quantity, amount });
  }

  form.reset();
  render();
  document.querySelector("#number").focus();
});

submitButton.addEventListener("click", () => {
  if (entries.size === 0) return;

  for (const entry of entries.values()) {
    const key = JSON.stringify([entry.number, entry.amount.toFixed(2)]);
    const paidEntry = paidEntries.get(key);
    if (paidEntry) {
      paidEntry.quantity += entry.quantity;
    } else {
      paidEntries.set(key, { number: entry.number, quantity: entry.quantity, amount: entry.amount });
    }
  }

  entries.clear();
  form.reset();
  render();
  renderOverview();
});

resetButton.addEventListener("click", () => {
  if (paidEntries.size === 0 || !window.confirm("Clear all entries saved in the overview?")) return;
  paidEntries.clear();
  renderOverview();
});

exportButton.addEventListener("click", () => {
  if (paidEntries.size === 0) return;
  downloadCsv([...paidEntries.values()]);
});

function renderOverview() {
  const grandTotal = [...paidEntries.values()].reduce((sum, entry) => sum + entry.quantity * entry.amount, 0);
  overviewTotal.textContent = money.format(grandTotal);
  overviewActions.hidden = paidEntries.size === 0;
}

function csvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function downloadCsv(paidEntries) {
  const lines = [["Number", "Quantity", "Amount", "Total Amount"].map(csvCell).join(",")];
  for (const entry of paidEntries) {
    lines.push([entry.number, displayNumber(entry.quantity), entry.amount.toFixed(2), (entry.quantity * entry.amount).toFixed(2)].map(csvCell).join(","));
  }
  const grandTotal = paidEntries.reduce((sum, entry) => sum + entry.quantity * entry.amount, 0);
  lines.push(["", "", "Total", grandTotal.toFixed(2)].map(csvCell).join(","));
  const file = new Blob([`\uFEFF${lines.join("\r\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = "total-amount.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
