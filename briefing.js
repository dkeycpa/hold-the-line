const startingResources = 500;
const catalog = {};
for (const {name, group, cost} of unitDesigns) {
  if (group !== 'Captains') (catalog[group] ??= []).push([name, cost]);
}
const room = document.querySelector('#briefing');
const briefingForm = document.querySelector('#briefing-form');
const catalogPanel = document.querySelector('#catalog');
const remaining = document.querySelector('#remaining');
const rosterSummary = document.querySelector('#roster-summary');
const rows = new Map();
let savedRoster = {captain: '', quantities: {}};
let quantities = {};

for (const [category, items] of Object.entries(catalog)) {
  const group = document.createElement('fieldset');
  const legend = document.createElement('legend');
  legend.textContent = category;
  group.append(legend);
  for (const [name, cost] of items) {
    const row = document.createElement('div');
    row.className = 'catalog-row';
    row.innerHTML = '<div><strong></strong><small></small></div><div class="quantity"><button type="button">−</button><span></span><button type="button">+</button></div>';
    row.querySelector('strong').textContent = name;
    row.querySelector('small').textContent = cost + ' resources each';
    const [remove, add] = row.querySelectorAll('button');
    const count = row.querySelector('.quantity span');
    remove.setAttribute('aria-label', 'Remove one ' + name);
    add.setAttribute('aria-label', 'Add one ' + name);
    rows.set(name, {cost, remove, add, count});
    remove.addEventListener('click', () => changeQuantity(name, -1));
    add.addEventListener('click', () => changeQuantity(name, 1));
    group.append(row);
  }
  catalogPanel.append(group);
}

function getTotals() {
  let spent = 0;
  let count = 0;
  for (const [name, quantity] of Object.entries(quantities)) {
    spent += rows.get(name).cost * quantity;
    count += quantity;
  }
  return {left: startingResources - spent, count};
}

function updateRoster() {
  const {left, count} = getTotals();
  remaining.value = left + ' / ' + startingResources + ' resources left';
  rosterSummary.textContent = count + (count === 1 ? ' purchase' : ' purchases');
  for (const [name, row] of rows) {
    const quantity = quantities[name] || 0;
    row.count.textContent = quantity;
    row.remove.disabled = quantity === 0;
    row.add.disabled = row.cost > left;
  }
}

function changeQuantity(name, change) {
  const next = (quantities[name] || 0) + change;
  if (next < 0 || (change > 0 && rows.get(name).cost > getTotals().left)) return;
  quantities[name] = next;
  updateRoster();
}

document.querySelector('#base-briefing').addEventListener('click', () => {
  quantities = {...savedRoster.quantities};
  for (const option of briefingForm.elements.captain) {
    option.checked = option.value === savedRoster.captain;
  }
  updateRoster();
  room.showModal();
});

document.querySelector('#cancel-briefing').addEventListener('click', () => room.close());
briefingForm.addEventListener('submit', event => {
  event.preventDefault();
  const captain = briefingForm.elements.captain.value;
  savedRoster = {captain, quantities: {...quantities}};
  const {count} = getTotals();
  document.querySelector('.heading span').textContent = captain + ' Captain · ' +
    count + (count === 1 ? ' purchase' : ' purchases') + ' saved';
  room.close();
});
