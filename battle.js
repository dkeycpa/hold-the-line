const playerBaseX = features[0][0];
const enemyBaseX = features[1][0];
const baseHealth = 500;
const resourceIncome = 12;
const deploymentEdge = playerBaseX + 220;
const deploymentEnd = world / 2 - 80;
const deploymentMargin = 55;
const rosterDesigns = unitDesigns.filter(({group}) => group === 'Soldiers' || group === 'Vehicles');
const defenseDesigns = unitDesigns.filter(({name}) => name === 'Barrier' || name === 'MG Nest');
const captainStats = {
  'Navy SEAL': {hp: 180, range: 205, damage: 18},
  Sniper: {hp: 120, range: 345, damage: 55},
};
const enemyWaves = [
  {time: 0, roster: ['Grunt', 'Grunt', 'Grunt']},
  {time: 13, roster: ['Grunt', 'Grunt', 'Grenadier', 'Heavy']},
  {time: 26, roster: ['Grunt', 'Heavy', 'Jeep', 'Jeep']},
  {time: 42, roster: ['Heavy', 'Heavy', 'Grenadier', 'Jeep', 'Speeder']},
];

const statusDisplay = document.querySelector('#battle-status');
const resourceDisplay = document.querySelector('#battle-resources');
const playerHealthDisplay = document.querySelector('#player-health');
const enemyHealthDisplay = document.querySelector('#enemy-health');
const battleControls = document.querySelector('#controls');
const openBriefingButton = document.querySelector('#open-briefing');
const placementControls = document.querySelector('#placement-controls');
const defenseType = document.querySelector('#defense-type');
const undoDefenseButton = document.querySelector('#undo-defense');
const startBattleButton = document.querySelector('#start-battle');
const orderControls = document.querySelector('#unit-orders');
const orderDisplay = document.querySelector('#selected-order');
const groupButton = document.querySelector('#select-group');
const holdButton = document.querySelector('#hold-position');
const advanceButton = document.querySelector('#advance-unit');
const reinforcementControls = document.querySelector('#reinforcement-controls');
const reinforcementType = document.querySelector('#reinforcement-type');
const recruitButton = document.querySelector('#recruit-unit');
const restartButton = document.querySelector('#restart-battle');

function addPurchaseOptions(select, designs) {
  for (const {name, cost} of designs) select.append(new Option(name + ' · ' + cost, name));
}
defenseType.append(new Option('Choose a defense', ''));
addPurchaseOptions(defenseType, defenseDesigns);
addPurchaseOptions(reinforcementType, rosterDesigns);

const bases = [
  {side: 'player', x: playerBaseX, y: roadCenter(playerBaseX), hp: baseHealth},
  {side: 'enemy', x: enemyBaseX, y: roadCenter(enemyBaseX), hp: baseHealth},
];
const defenses = [];
let battlePhase = 'prepare';
let placementPoint;
const selectedUnits = new Set();
let choosingHoldPoint = false;
let selectingGroup = false;
let resources = startingResources;
let elapsed = 0;
let incomeSeconds = 0;
let nextWave = 0;
let reinforcementLane = 0;

function defenseCost() {
  return defenses.reduce((sum, unit) => sum + unit.design.cost, 0);
}

function refreshResources() {
  resourceDisplay.value = resources + ' resources';
  const design = rosterDesigns.find(({name}) => name === reinforcementType.value);
  recruitButton.disabled = battlePhase !== 'battle' || resources < design.cost;
  for (const option of defenseType.options) {
    const defense = defenseDesigns.find(({name}) => name === option.value);
    option.disabled = Boolean(defense && resources < defense.cost);
  }
  undoDefenseButton.disabled = defenses.length === 0;
}

function refreshHealth() {
  playerHealthDisplay.textContent = 'Player base · ' + Math.ceil(bases[0].hp) + ' HP';
  enemyHealthDisplay.textContent = 'Enemy base · ' + Math.ceil(bases[1].hp) + ' HP';
}

function rosterSaved() {
  resources = getTotals().left;
  placementControls.hidden = false;
  startBattleButton.disabled = false;
  statusDisplay.textContent = savedRoster.captain + ' roster ready';
  battleControls.textContent = 'Place defenses on your side, or start battle.';
  refreshResources();
  pan(0);
  startBattleButton.focus();
}

function fieldPosition(event) {
  const bounds = field.getBoundingClientRect();
  return {x: camera + (event.clientX - bounds.left) / scale, y: (event.clientY - bounds.top) / bounds.height * depth};
}

function canPlaceDefense(x, y, design) {
  return resources >= design.cost && x >= deploymentEdge && x <= deploymentEnd &&
    y >= deploymentMargin && y <= depth - deploymentMargin &&
    defenses.every(unit => Math.hypot(unit.x - x, unit.y - y) >= 80);
}

function createBattleUnit(design, side, x, y) {
  const unit = {
    design, side, x, y, hp: design.hp, lane: y,
    facing: side === 'player' ? 0 : Math.PI, distance: 0,
    target: null, moving: false, flashUntil: 0, nextFire: 0,
  };
  spawnedUnits.push(unit);
  return unit;
}

function placeDefense(x, y) {
  const design = defenseDesigns.find(({name}) => name === defenseType.value);
  if (!savedRoster.captain || !design) return;
  if (!canPlaceDefense(x, y, design)) {
    statusDisplay.textContent = 'Pick a clear spot inside the highlighted area and check your resources.';
    return;
  }
  defenses.push(createBattleUnit(design, 'player', x, y));
  resources -= design.cost;
  statusDisplay.textContent = design.name + ' placed';
  refreshResources();
  if (resources < design.cost) {
    defenseType.value = '';
    defenseType.dispatchEvent(new Event('change'));
  }
  drawRadar();
  requestDraw();
}

defenseType.addEventListener('change', () => {
  placementPoint = null;
  battleControls.textContent = defenseType.value
    ? 'Click a clear spot in the highlighted area.'
    : 'Place defenses on your side, or start battle.';
  requestDraw();
});
field.addEventListener('pointermove', event => {
  if (battlePhase !== 'prepare' || !defenseType.value) return;
  placementPoint = fieldPosition(event);
  requestDraw();
});
field.addEventListener('pointerleave', () => {
  placementPoint = null;
  requestDraw();
});
undoDefenseButton.addEventListener('click', () => {
  const unit = defenses.pop();
  if (!unit) return;
  spawnedUnits.splice(spawnedUnits.indexOf(unit), 1);
  resources += unit.design.cost;
  statusDisplay.textContent = unit.design.name + ' removed and refunded';
  refreshResources();
  drawRadar();
  requestDraw();
});

function refreshOrders() {
  const count = selectedUnits.size;
  const captainSelected = activeUnit?.design.group === 'Captains';
  holdButton.disabled = count === 0 || captainSelected;
  advanceButton.disabled = !choosingHoldPoint && ![...selectedUnits].some(unit => unit.holdPoint);
  holdButton.setAttribute('aria-pressed', choosingHoldPoint);
  groupButton.setAttribute('aria-pressed', selectingGroup);
  const selection = count === 1 ? activeUnit.design.name : count + ' units selected';
  if (choosingHoldPoint) orderDisplay.textContent = selection + ' · Click where to hold';
  else if (selectingGroup) orderDisplay.textContent = selection + ' · Click units to add or remove';
  else if (count === 0) orderDisplay.textContent = 'Select a friendly unit';
  else if (captainSelected) orderDisplay.textContent = selection + ' · WASD or click to move';
  else {
    const holding = [...selectedUnits].filter(unit => unit.holdPoint).length;
    const order = holding === count ? 'Holding' : holding === 0 ? 'Advancing' : holding + ' holding';
    orderDisplay.textContent = selection + ' · ' + order;
  }
}

function updateSelection() {
  const singleUnit = selectedUnits.size === 1 ? selectedUnits.values().next().value : null;
  if (activeUnit !== singleUnit) {
    if (activeUnit) activeUnit.target = null;
    moveKeys.clear();
    activeUnit = singleUnit;
  }
  if (!selectedUnits.size) choosingHoldPoint = false;
  refreshOrders();
}

function resumeAdvance() {
  for (const unit of selectedUnits) {
    unit.holdPoint = null;
    unit.target = null;
  }
  choosingHoldPoint = false;
  selectingGroup = false;
  refreshOrders();
}

groupButton.addEventListener('click', () => {
  selectingGroup = !selectingGroup;
  choosingHoldPoint = false;
  refreshOrders();
});
holdButton.addEventListener('click', () => {
  if (holdButton.disabled) return;
  choosingHoldPoint = !choosingHoldPoint;
  selectingGroup = false;
  refreshOrders();
});
advanceButton.addEventListener('click', resumeAdvance);

function setHoldPosition(x, y) {
  const spacing = 48;
  const columns = Math.min(4, selectedUnits.size);
  const rows = Math.ceil(selectedUnits.size / columns);
  const halfWidth = (columns - 1) * spacing / 2;
  const centerX = Math.max(20 + halfWidth, Math.min(world - 20 - halfWidth, x));
  // Keep even large groups inside the playable depth.
  const rowSpacing = rows > 1 ? Math.min(spacing, (depth - 40) / (rows - 1)) : 0;
  const verticalMargin = (rows - 1) * rowSpacing / 2;
  const centerY = Math.max(20 + verticalMargin, Math.min(depth - 20 - verticalMargin, y));
  let slot = 0;
  for (const unit of selectedUnits) {
    unit.target = null;
    unit.holdPoint = {
      x: centerX + (slot % columns) * spacing - halfWidth,
      y: centerY + Math.floor(slot / columns) * rowSpacing - verticalMargin,
    };
    slot++;
  }
  moveKeys.clear();
  choosingHoldPoint = false;
  refreshOrders();
}

function handleBattleClick(x, y, addToGroup) {
  if (choosingHoldPoint && selectedUnits.size) {
    setHoldPosition(x, y);
    return;
  }

  const grouping = selectingGroup || addToGroup;
  let selected;
  let closest = Infinity;
  for (const unit of spawnedUnits) {
    const captain = unit.design.group === 'Captains';
    if (unit.side !== 'player' || !unit.design.speed || (grouping && captain)) continue;
    const distance = Math.hypot(unit.x - x, unit.y - y);
    if (distance > closest || distance > (captain ? 28 * captainScale : 28)) continue;
    closest = distance;
    selected = unit;
  }
  if (selected) {
    if (!grouping || activeUnit?.design.group === 'Captains') selectedUnits.clear();
    if (!selectedUnits.delete(selected)) selectedUnits.add(selected);
    updateSelection();
  } else if (!grouping && activeUnit?.design.group === 'Captains') {
    activeUnit.target = {
      x: Math.max(20, Math.min(world - 20, x)),
      y: Math.max(20, Math.min(depth - 20, y)),
    };
  }
}

function drawBattlefield(ctx, now) {
  if (battlePhase === 'prepare' && defenseType.value) {
    ctx.fillStyle = '#94e5cc22';
    ctx.fillRect(deploymentEdge, deploymentMargin, deploymentEnd - deploymentEdge, depth - deploymentMargin * 2);
    ctx.strokeStyle = player;
    ctx.setLineDash([9, 7]);
    ctx.strokeRect(deploymentEdge, deploymentMargin, deploymentEnd - deploymentEdge, depth - deploymentMargin * 2);
    ctx.setLineDash([]);
    if (placementPoint) {
      const {x, y} = placementPoint;
      const design = defenseDesigns.find(({name}) => name === defenseType.value);
      ctx.strokeStyle = canPlaceDefense(x, y, design) ? player : enemy;
      ctx.beginPath();
      ctx.arc(x, y, 29, 0, 2 * Math.PI);
      ctx.stroke();
    }
  }
  for (const unit of selectedUnits) {
    if (battlePhase !== 'battle' || !unit.holdPoint) continue;
    const {x, y} = unit.holdPoint;
    ctx.strokeStyle = player;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  for (const unit of spawnedUnits) {
    if (unit.x < camera - 55 || unit.x > camera + visible + 55) continue;
    drawBattleUnit(ctx, unit, now, selectedUnits.has(unit));
    if (battlePhase === 'prepare') continue;
    ctx.fillStyle = '#182426';
    ctx.fillRect(unit.x - 18, unit.y - 31, 36, 5);
    ctx.fillStyle = unit.side === 'player' ? player : enemy;
    ctx.fillRect(unit.x - 18, unit.y - 31, 36 * unit.hp / unit.design.hp, 5);
  }
}

function spawnAtBase(design, side, slot) {
  const base = bases[side === 'player' ? 0 : 1];
  const direction = side === 'player' ? 1 : -1;
  const x = base.x + direction * (125 + Math.floor(slot / 5) * 24);
  const y = base.y + ((slot % 5 + 2) % 5 - 2) * 66;
  return createBattleUnit(design, side, x, y);
}

startBattleButton.addEventListener('click', () => {
  if (battlePhase !== 'prepare' || !savedRoster.captain) return;
  battlePhase = 'battle';
  const captain = unitDesigns.find(({name}) => name === savedRoster.captain);
  selectedUnits.add(spawnAtBase({...captain, ...captainStats[captain.name]}, 'player', 0));
  let slot = 1;
  for (const [name, count] of Object.entries(savedRoster.quantities)) {
    const design = rosterDesigns.find(unit => unit.name === name);
    for (let index = 0; index < count; index++) spawnAtBase(design, 'player', slot++);
  }
  openBriefingButton.hidden = true;
  placementControls.hidden = true;
  startBattleButton.hidden = true;
  reinforcementControls.hidden = false;
  orderControls.hidden = false;
  updateSelection();
  battleControls.textContent = 'Click a friendly unit, or use Select Group to pick several. WASD moves the selected captain.';
  statusDisplay.textContent = 'Battle begun · +' + resourceIncome + ' resources per second';
  refreshResources();
  pan(0);
  field.focus();
});

reinforcementType.addEventListener('change', refreshResources);
recruitButton.addEventListener('click', () => {
  const design = rosterDesigns.find(({name}) => name === reinforcementType.value);
  if (battlePhase !== 'battle' || resources < design.cost) return;
  spawnAtBase(design, 'player', reinforcementLane++ % 5);
  resources -= design.cost;
  statusDisplay.textContent = design.name + ' recruited';
  refreshResources();
});

function findTarget(unit, opposingBase) {
  let closest = null;
  let bestDistance = unit.design.range;
  for (const target of spawnedUnits) {
    if (target.side === unit.side || target.hp <= 0) continue;
    const distance = Math.hypot(target.x - unit.x, target.y - unit.y);
    if (distance > bestDistance) continue;
    closest = target;
    bestDistance = distance;
  }
  if (closest) return closest;
  const baseDistance = Math.hypot(opposingBase.x - unit.x, opposingBase.y - unit.y);
  return opposingBase.hp > 0 && baseDistance <= unit.design.range + 65 ? opposingBase : null;
}

function advanceUnit(unit, base, seconds) {
  const destinationY = Math.abs(base.x - unit.x) < 340 ? base.y : unit.lane;
  moveToward(unit, base.x, destinationY, seconds);
}

function moveToward(unit, x, y, seconds) {
  const dx = x - unit.x;
  const dy = y - unit.y;
  const distance = Math.hypot(dx, dy);
  const step = Math.min(distance, unit.design.speed * movementSpeed * seconds * 1.65);
  if (!step) return;
  unit.facing = Math.atan2(dy, dx);
  unit.x = step === distance ? x : unit.x + dx / distance * step;
  unit.y = step === distance ? y : unit.y + dy / distance * step;
  unit.distance += step;
  unit.moving = true;
}

function updateBattle(seconds, now) {
  elapsed += seconds;
  const wholeSeconds = Math.floor(elapsed + 1e-8);
  if (wholeSeconds > incomeSeconds) {
    resources += (wholeSeconds - incomeSeconds) * resourceIncome;
    incomeSeconds = wholeSeconds;
    refreshResources();
  }

  const wave = enemyWaves[nextWave];
  if (wave && elapsed >= wave.time) {
    wave.roster.forEach((name, slot) => {
      spawnAtBase(rosterDesigns.find(unit => unit.name === name), 'enemy', slot);
    });
    nextWave++;
    statusDisplay.textContent = 'Enemy wave ' + nextWave + ' of ' + enemyWaves.length + ' deployed';
  }

  for (const unit of spawnedUnits) {
    if (unit.hp <= 0) continue;
    const base = bases[unit.side === 'player' ? 1 : 0];
    const target = unit.design.damage ? findTarget(unit, base) : null;
    const manuallyMoving = unit === activeUnit && (moveKeys.size || unit.target);
    if (manuallyMoving) continue;
    unit.moving = false;
    if (unit.holdPoint) moveToward(unit, unit.holdPoint.x, unit.holdPoint.y, seconds);
    if (target) {
      unit.facing = Math.atan2(target.y - unit.y, target.x - unit.x);
      if (now >= unit.nextFire) {
        unit.nextFire = now + unit.design.interval * 1000;
        unit.flashUntil = now + 85;
        target.hp = Math.max(0, target.hp - unit.design.damage);
        if (!target.design) refreshHealth();
      }
    } else if (!unit.holdPoint && unit.design.group !== 'Captains') {
      advanceUnit(unit, base, seconds);
    }
  }

  for (let index = spawnedUnits.length - 1; index >= 0; index--) {
    if (spawnedUnits[index].hp > 0) continue;
    if (selectedUnits.delete(spawnedUnits[index])) updateSelection();
    spawnedUnits.splice(index, 1);
  }
  if (!bases[0].hp || !bases[1].hp) finishBattle();
}

function finishBattle() {
  battlePhase = 'finished';
  if (activeUnit) activeUnit.target = null;
  moveKeys.clear();
  reinforcementControls.hidden = true;
  orderControls.hidden = true;
  choosingHoldPoint = false;
  selectingGroup = false;
  restartButton.hidden = false;
  if (!bases[0].hp && !bases[1].hp) {
    statusDisplay.textContent = 'Draw · both bases fell';
  } else {
    statusDisplay.textContent = bases[0].hp ? 'Victory · enemy base destroyed' : 'Defeat · your base was destroyed';
  }
  battleControls.textContent = 'Play again to try a different roster or defense layout.';
  refreshResources();
  restartButton.focus();
}

restartButton.addEventListener('click', () => {
  battlePhase = 'prepare';
  resetRoster();
  defenses.length = 0;
  spawnedUnits.length = 0;
  selectedUnits.clear();
  activeUnit = null;
  bases.forEach(base => { base.hp = baseHealth; });
  resources = startingResources;
  elapsed = incomeSeconds = nextWave = reinforcementLane = 0;
  defenseType.value = '';
  placementPoint = null;
  openBriefingButton.hidden = false;
  startBattleButton.hidden = false;
  startBattleButton.disabled = true;
  restartButton.hidden = true;
  statusDisplay.textContent = 'Choose a captain and roster to prepare for battle.';
  battleControls.textContent = 'Destroy the enemy base before yours falls.';
  refreshResources();
  refreshHealth();
  drawRadar();
  pan(0);
  openBriefingButton.focus();
});

refreshResources();
refreshHealth();
