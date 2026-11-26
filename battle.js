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
  for (const unit of spawnedUnits) {
    if (unit.x < camera - 55 || unit.x > camera + visible + 55) continue;
    drawBattleUnit(ctx, unit, now, unit === activeUnit);
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
  activeUnit = spawnAtBase({...captain, ...captainStats[captain.name]}, 'player', 0);
  let slot = 1;
  for (const [name, count] of Object.entries(savedRoster.quantities)) {
    const design = rosterDesigns.find(unit => unit.name === name);
    for (let index = 0; index < count; index++) spawnAtBase(design, 'player', slot++);
  }
  openBriefingButton.hidden = true;
  placementControls.hidden = true;
  startBattleButton.hidden = true;
  reinforcementControls.hidden = false;
  battleControls.textContent = 'Troops advance automatically. Use WASD or click the field to guide your captain.';
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
  const dx = base.x - unit.x;
  const dy = destinationY - unit.y;
  const distance = Math.hypot(dx, dy);
  const step = Math.min(distance, unit.design.speed * seconds * 1.65);
  if (!step) return;
  unit.facing = Math.atan2(dy, dx);
  unit.x += dx / distance * step;
  unit.y += dy / distance * step;
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
    if (target) {
      unit.facing = Math.atan2(target.y - unit.y, target.x - unit.x);
      if (now >= unit.nextFire) {
        unit.nextFire = now + unit.design.interval * 1000;
        unit.flashUntil = now + 85;
        target.hp = Math.max(0, target.hp - unit.design.damage);
        if (!target.design) refreshHealth();
      }
    } else {
      advanceUnit(unit, base, seconds);
    }
  }

  for (let index = spawnedUnits.length - 1; index >= 0; index--) {
    if (spawnedUnits[index].hp > 0) continue;
    if (spawnedUnits[index] === activeUnit) {
      activeUnit = null;
      moveKeys.clear();
      battleControls.textContent = 'Your captain fell. You can still recruit reinforcements.';
    }
    spawnedUnits.splice(index, 1);
  }
  if (!bases[0].hp || !bases[1].hp) finishBattle();
}

function finishBattle() {
  battlePhase = 'finished';
  if (activeUnit) activeUnit.target = null;
  moveKeys.clear();
  reinforcementControls.hidden = true;
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
