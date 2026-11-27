const world = 6400;
const depth = 560;
const roadWidth = 420;
const features = [
  [310, 0, 'base', 'Player base'],
  [6090, 0, 'base', 'Enemy base']
];
const field = document.querySelector('#field');
const radar = document.querySelector('#radar');
const overview = document.querySelector('#overview');
const landscape = document.querySelector('#landscape');
const briefingButton = document.querySelector('#base-briefing');
const briefing = document.querySelector('#briefing');
const windowBox = document.querySelector('#window');
const range = document.querySelector('#range');
const sand = '#f6de9c';
const player = '#94e5cc';
const enemy = '#ff9c7a';
let camera = 0;
let visible = 0;
let scale = 1;
let frame = 0;
let activeUnit;
const movementSpeed = .5;
const spawnedUnits = [];
let lastFrame = null;
const movement = {KeyW: [0, -1], KeyA: [-1, 0], KeyS: [0, 1], KeyD: [1, 0]};
const moveKeys = new Set();

function fit(canvas) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const density = window.devicePixelRatio || 1;
  const pixelsWide = Math.round(width * density);
  const pixelsHigh = Math.round(height * density);
  if (canvas.width !== pixelsWide || canvas.height !== pixelsHigh) {
    canvas.width = pixelsWide;
    canvas.height = pixelsHigh;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(density, 0, 0, density, 0, 0);
  return {ctx, width, height};
}

function roadCenter(x) {
  return depth / 2 + 46 * Math.sin(x / 340) + 19 * Math.sin(x / 161);
}

function polygon(ctx, color, points) {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  ctx.fill();
}

function road(ctx, left, right, halfWidth, color, offset = 0) {
  const centerline = [];
  for (let x = left; x < right; x += 12) centerline.push([x, roadCenter(x) + offset]);
  centerline.push([right, roadCenter(right) + offset]);
  const upper = centerline.map(([x, y]) => [x, y - halfWidth]);
  const lower = centerline.reverse().map(([x, y]) => [x, y + halfWidth]);
  polygon(ctx, color, upper.concat(lower));
}

function noise(x, y) {
  const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function paintGround(ctx, left, right) {
  ctx.fillStyle = '#4e5a41';
  ctx.fillRect(left, 0, right - left, depth);
  for (let x = Math.floor(left / 72) * 72; x < right; x += 72) {
    for (let y = 0; y < depth; y += 62) {
      const jitter = noise(x, y);
      const px = x + jitter * 62;
      const py = y + noise(y, x) * 50;
      ctx.fillStyle = jitter > .5 ? '#69724b' : '#3f513c';
      ctx.beginPath();
      ctx.ellipse(px, py, 19 + jitter * 38, 10 + jitter * 16, jitter * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  road(ctx, left, right, roadWidth / 2 + 13, '#676344');
  road(ctx, left, right, roadWidth / 2 + 5, '#99845d');
  road(ctx, left, right, roadWidth / 2, '#b69c72');
  road(ctx, left, right, 2, '#a18a64', -19);
  road(ctx, left, right, 2, '#a18a64', 19);

  for (let x = Math.floor(left / 25) * 25; x < right; x += 25) {
    for (let row = 0; row < depth; row += 30) {
      const jitter = noise(x, row);
      const y = row + jitter * 24;
      const onRoad = Math.abs(y - roadCenter(x)) < roadWidth / 2;
      ctx.fillStyle = onRoad ? '#967f5d90' : jitter > .5 ? '#8a8b59' : '#344833';
      ctx.fillRect(x + jitter * 17, y, 2 + jitter * 8, 2);
    }
  }
}

function structure(ctx, x, offset, type, label) {
  const base = type === 'base';
  const accent = base ? (x < world / 2 ? player : enemy) : sand;
  ctx.save();
  ctx.translate(x, roadCenter(x) + offset);

  function block(color, left, top, width, height) {
    ctx.fillStyle = color;
    ctx.fillRect(left, top, width, height);
  }

  let halfHeight = 26;
  if (type === 'rocks') {
    polygon(ctx, '#303e35', [[-58, 14], [-44, -13], [-21, -19], [5, -3], [26, -26], [48, -20], [61, 5], [40, 23], [-27, 26]]);
    polygon(ctx, '#8a8269', [[-52, 9], [-44, -13], [-21, -19], [2, -3], [-15, 14], [-37, 19]]);
    polygon(ctx, '#aaa083', [[10, -3], [26, -26], [48, -20], [55, 2], [39, 12], [18, 9]]);
  } else if (type === 'wall') {
    ctx.rotate(-.24);
    block('#303d32', -51, -3, 108, 16);
    for (let index = 0; index < 6; index++) block('#a29372', -54 + index * 18, -8, 16, 12);
  } else if (type === 'tower') {
    block('#303d3590', -18, -20, 59, 59);
    block('#343f37', -27, -27, 54, 54);
    block('#8a805f', -23, -23, 46, 46);
    block('#5d604c', -15, -15, 30, 30);
    block('#b2a478', -15, -15, 30, 4);
    block('#c8b991', -3, -3, 6, 6);
  } else if (base) {
    halfHeight = 72;
    block('#343c3490', -80, -61, 176, 147);
    block('#8a876a', -89, -72, 178, 144);
    block('#626853', -83, -66, 166, 132);
    block('#343e38', -56, -40, 112, 80);
    block('#8a9078', -51, -36, 102, 72);
    block('#666f5c', -46, -30, 92, 60);
    block(accent, -39, -3, 78, 6);
    block(accent, -77, -60, 13, 13);
    block(accent, 64, 47, 13, 13);
  } else {
    halfHeight = 39;
    block('#5e624c', -56, -38, 112, 76);
    block('#a79a77', -56, -38, 77, 9);
    block('#a79a77', -56, -29, 9, 57);
    block('#a79a77', -30, 29, 86, 9);
    block('#82795e', 47, 2, 9, 27);
    block('#817759', -13, -17, 26, 7);
  }

  ctx.restore();
  if (label) {
    ctx.font = '600 16px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    const width = ctx.measureText(label).width + 20;
    const y = roadCenter(x) + offset - halfHeight - 8;
    ctx.fillStyle = '#192728';
    ctx.fillRect(x - width / 2, y - 22, width, 24);
    ctx.fillStyle = accent;
    ctx.fillText(label, x, y - 5);
  }
}

function drawField(now) {
  const {ctx, height} = fit(landscape);
  const left = Math.max(0, Math.floor(camera / 20) * 20);
  const right = Math.min(world, camera + visible + 20);
  ctx.save();
  ctx.scale(scale, height / depth);
  ctx.translate(-camera, 0);
  paintGround(ctx, left, right);
  for (const [x, offset, type, label] of features) {
    if (x >= camera - 145 && x <= camera + visible + 145) structure(ctx, x, offset, type, label);
  }
  drawBattlefield(ctx, now);
  ctx.restore();
  const [baseX] = features[0];
  const baseEdge = baseX - 89;
  briefingButton.hidden = battlePhase !== 'prepare' || baseX + 89 <= camera || baseEdge >= camera + visible;
  briefingButton.style.left = (baseEdge - camera) * scale + 'px';
  briefingButton.style.top = (roadCenter(baseX) - 72) / depth * height + 'px';
  briefingButton.style.width = 178 * scale + 'px';
  briefingButton.style.height = 144 / depth * height + 'px';
}

function drawRadar() {
  const {ctx, width, height} = fit(overview);
  ctx.fillStyle = '#293a33';
  ctx.fillRect(0, 0, width, height);
  for (let tick = 1; tick < 16; tick++) {
    ctx.fillStyle = '#455449';
    ctx.fillRect(width * tick / 16, 0, 1, height);
  }
  ctx.save();
  ctx.scale(width / world, height / depth);
  road(ctx, 0, world, roadWidth / 2, '#958263');
  ctx.restore();
  for (const [x, offset, type] of features) {
    const px = x / world * width;
    const py = (roadCenter(x) + offset) / depth * height;
    const base = type === 'base';
    const size = base ? 8 : 4;
    ctx.fillStyle = base ? (x < world / 2 ? player : enemy) : '#d5c8a7';
    ctx.fillRect(px - size / 2, py - size / 2, size, size);
  }
  for (const unit of spawnedUnits) {
    ctx.fillStyle = unit.side === 'enemy' ? enemy : selectedUnits.has(unit) ? '#c2ffed' : '#76c7ae';
    ctx.beginPath();
    ctx.arc(unit.x / world * width, unit.y / depth * height, selectedUnits.has(unit) ? 3 : 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function maxCamera() {
  return world - visible;
}

function positionCamera(position) {
  camera = Math.max(0, Math.min(position, maxCamera()));
  radar.value = camera;
  radar.setAttribute('aria-valuetext', Math.round(camera / (maxCamera() || 1) * 100) + '% across battlefield');
  windowBox.style.left = camera / world * 100 + '%';
  windowBox.style.width = visible / world * 100 + '%';
  range.value = Math.round(camera) + '–' + Math.round(camera + visible) + ' / ' + world;
}

function requestDraw() {
  if (!frame) frame = requestAnimationFrame(tickField);
}

function pan(position) {
  positionCamera(position);
  requestDraw();
}

function updateUnit(seconds) {
  let dx = 0;
  let dy = 0;
  for (const key of moveKeys) {
    dx += movement[key][0];
    dy += movement[key][1];
  }
  if (activeUnit.target) {
    dx = activeUnit.target.x - activeUnit.x;
    dy = activeUnit.target.y - activeUnit.y;
  }
  const length = Math.hypot(dx, dy);
  const stride = activeUnit.design.speed * movementSpeed * seconds;
  activeUnit.moving = false;
  if (activeUnit.target && length === 0) activeUnit.target = null;
  if (!length || !stride) return;
  const step = activeUnit.target ? Math.min(stride, length) : stride;
  const x = Math.max(20, Math.min(world - 20, activeUnit.x + dx / length * step));
  const y = Math.max(20, Math.min(depth - 20, activeUnit.y + dy / length * step));
  const traveled = Math.hypot(x - activeUnit.x, y - activeUnit.y);
  activeUnit.facing = Math.atan2(dy, dx);
  activeUnit.moving = traveled > 0;
  const vehicle = activeUnit.design.group === 'Vehicles';
  const beat = vehicle ? activeUnit.design.speed * .65 : 20;
  if (Math.floor((activeUnit.distance + traveled) / beat) > Math.floor(activeUnit.distance / beat)) {
    playGruntSound(vehicle ? activeUnit.design.cue : 'step');
  }
  activeUnit.distance += traveled;
  activeUnit.x = x;
  activeUnit.y = y;
  if (activeUnit.target && step === length) activeUnit.target = null;
  if (activeUnit.moving) {
    if (x < camera + visible * .25) positionCamera(x - visible * .25);
    if (x > camera + visible * .75) positionCamera(x - visible * .75);
    drawRadar();
  }
}

function tickField(now) {
  frame = 0;
  if (battlePhase === 'battle') {
    const seconds = lastFrame === null ? 0 : Math.min((now - lastFrame) / 1000, .05);
    if (activeUnit && (moveKeys.size || activeUnit.target)) updateUnit(seconds);
    updateBattle(seconds, now);
    drawRadar();
  }
  drawField(now);
  lastFrame = battlePhase === 'battle' ? now : null;
  if (lastFrame !== null) requestDraw();
}

function resize() {
  scale = Math.max(.75, field.clientHeight / 610, field.clientWidth / 2400);
  const atEnemyBase = visible > 0 && camera === maxCamera();
  visible = field.clientWidth / scale;
  radar.max = maxCamera();
  drawRadar();
  pan(atEnemyBase ? maxCamera() : camera);
}

document.querySelector('#player').addEventListener('click', () => pan(0));
document.querySelector('#enemy').addEventListener('click', () => pan(maxCamera()));
radar.addEventListener('input', () => pan(radar.valueAsNumber));

let radarDrag;
function radarPosition(event) {
  const bounds = radar.getBoundingClientRect();
  return (event.clientX - bounds.left) / bounds.width * world;
}
radar.addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.button !== 0) return;
  event.preventDefault();
  radar.focus();
  const position = radarPosition(event);
  const offset = position >= camera && position <= camera + visible ? position - camera : visible / 2;
  radarDrag = {pointer: event.pointerId, offset};
  radar.setPointerCapture(event.pointerId);
  pan(position - offset);
});
radar.addEventListener('pointermove', event => {
  if (radarDrag?.pointer === event.pointerId) pan(radarPosition(event) - radarDrag.offset);
});
radar.addEventListener('lostpointercapture', event => {
  if (radarDrag?.pointer === event.pointerId) radarDrag = undefined;
});

let fieldDrag;
field.addEventListener('pointerdown', event => {
  if (briefingButton.contains(event.target)) return;
  if (!event.isPrimary || event.button !== 0) return;
  field.focus({preventScroll: true});
  fieldDrag = {pointer: event.pointerId, x: event.clientX, y: event.clientY, camera, dragged: false};
  field.setPointerCapture(event.pointerId);
  field.classList.add('dragging');
});
field.addEventListener('pointermove', event => {
  if (fieldDrag?.pointer !== event.pointerId) return;
  fieldDrag.dragged ||= Math.hypot(fieldDrag.x - event.clientX, fieldDrag.y - event.clientY) > 6;
  if (fieldDrag.dragged) pan(fieldDrag.camera + (fieldDrag.x - event.clientX) / scale);
});
field.addEventListener('pointerup', event => {
  if (fieldDrag?.pointer !== event.pointerId || fieldDrag.dragged) return;
  const {x, y} = fieldPosition(event);
  if (battlePhase === 'prepare') {
    placeDefense(x, y);
    return;
  }
  if (battlePhase === 'battle') handleBattleClick(x, y, event.shiftKey);
});
field.addEventListener('lostpointercapture', event => {
  if (fieldDrag?.pointer !== event.pointerId) return;
  fieldDrag = undefined;
  field.classList.remove('dragging');
});
field.addEventListener('wheel', event => {
  const distance = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? field.clientWidth : 1;
  if (event.ctrlKey || !distance) return;
  event.preventDefault();
  pan(camera + distance * unit / scale);
}, {passive: false});

document.addEventListener('keydown', event => {
  if (briefing.open || event.altKey || event.metaKey || event.ctrlKey) return;
  if (activeUnit?.design.group === 'Captains' && Object.hasOwn(movement, event.code)) {
    event.preventDefault();
    moveKeys.add(event.code);
    activeUnit.target = null;
    requestDraw();
    return;
  }
  switch (event.key) {
    case 'ArrowLeft': pan(camera - 70 / scale); break;
    case 'ArrowRight': pan(camera + 70 / scale); break;
    case 'Home': pan(0); break;
    case 'End': pan(maxCamera()); break;
    default: return;
  }
  event.preventDefault();
});
document.addEventListener('keyup', event => moveKeys.delete(event.code));
window.addEventListener('blur', () => moveKeys.clear());
briefingButton.addEventListener('click', () => {
  moveKeys.clear();
  if (activeUnit) {
    activeUnit.target = null;
    activeUnit.moving = false;
    requestDraw();
  }
});

new ResizeObserver(resize).observe(field);
resize();


