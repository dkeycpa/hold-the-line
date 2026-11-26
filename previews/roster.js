const units = [
  { name: 'Grenadier', group: 'Soldiers', cost: 65, hp: 90, speed: 70, range: 230, damage: 40, interval: 2.4, action: 'Lob grenade', role: 'Arcing splash clears clustered ground units. Round launcher, tall pack, hollow thunk and delayed pop.', cue: 'lob' },
  { name: 'Heavy', group: 'Soldiers', cost: 90, hp: 220, speed: 48, range: 155, damage: 9, interval: .3, action: 'Fire burst', role: 'Holds one contested position. Broad shoulder plates, low stance and a rolling burst.', cue: 'burst' },
  { name: 'Jeep', group: 'Vehicles', cost: 120, hp: 210, speed: 125, range: 195, damage: 15, interval: .55, action: 'Drive & fire', role: 'Mobile sustained fire. Open cab, roll cage and a low engine growl.', cue: 'jeep' },
  { name: 'Motorcycle', group: 'Vehicles', cost: 70, hp: 70, speed: 200, range: 0, damage: 0, interval: 0, action: 'Scout ahead', role: 'Fast unarmed scout. Slim wheels, forward-leaning rider and a rising engine whine.', cue: 'bike' },
  { name: 'Speeder', group: 'Vehicles', cost: 110, hp: 100, speed: 245, range: 145, damage: 28, interval: 1.3, action: 'Dash & fire', role: 'Fast hit-and-run pressure. Low hover body, bright thrusters and a sharp electronic pulse.', cue: 'hover' },
  { name: 'Barrier', group: 'Obstacles', cost: 25, hp: 220, speed: 0, range: 0, damage: 0, interval: 0, action: 'Block approach', role: 'Low cover that blocks movement. Sandbag stack with a soft, dusty impact.', cue: 'sand' },
  { name: 'Barb Wire', group: 'Obstacles', cost: 15, hp: 75, speed: 0, range: 0, damage: 0, interval: 0, action: 'Slow crossing', role: 'Slows ground movement by 45% while crossing. Coiled silhouette and a metallic snag.', cue: 'wire' },
  { name: 'Tall Barrier', group: 'Obstacles', cost: 40, hp: 350, speed: 0, range: 0, damage: 0, interval: 0, action: 'Block line of sight', role: 'Blocks movement and direct fire through its footprint. Tall concrete slabs and a hard impact.', cue: 'wall' },
  { name: 'Sniper Tower', group: 'Buildings', cost: 100, hp: 140, speed: 0, range: 360, damage: 70, interval: 3.2, action: 'Fire aimed shot', role: 'Long-range pressure on single targets. Raised platform, long barrel and one crisp crack.', cue: 'sniper' },
  { name: 'MG Nest', group: 'Buildings', cost: 125, hp: 260, speed: 0, range: 215, damage: 8, interval: .2, action: 'Fire burst', role: 'Sustained fire over a fixed lane. Low sandbag ring, shielded gun and a tight rattle.', cue: 'nest' },
];

const root = document.querySelector('#roster');
const select = root.querySelector('#unit');
const demo = root.querySelector('#demo');
const impact = root.querySelector('#impact');
const canvas = root.querySelector('canvas');
const ctx = canvas.getContext('2d');
const status = root.querySelector('#unit-status');
const stats = root.querySelector('dl');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const colors = { sky:'#253b37', hills:'#40594a', sand:'#af956d', dust:'#c8ad80', dark:'#252c29',
  olive:'#657552', light:'#8e9b69', metal:'#68777a', mint:'#94e5cc', flash:'#ffe2a0', skin:'#bd9875' };
let unit = units[0], frame, audio, noise;
let view = { time:0, move:0, flash:false, hit:false };

for (const group of new Set(units.map(item => item.group))) {
  const options = document.createElement('optgroup');
  options.label = group;
  units.filter(item => item.group === group).forEach(item => options.append(new Option(item.name)));
  select.append(options);
}

function box(color, x, y, w, h) {
  ctx.fillStyle = colors[color];
  ctx.fillRect(x, y, w, h);
}
function oval(color, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = colors[color];
  ctx.fill();
}
function line(color, width, points) {
  ctx.beginPath();
  points.forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
  ctx.strokeStyle = colors[color];
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.stroke();
}
function soldier(heavy, stride) {
  const shoulder = heavy ? 23 : 14;
  line('dark', 10, [[-5,-29],[-5-stride,-12],[-9-stride,-3]]);
  line('olive', 9, [[6,-29],[6+stride,-12],[10+stride,-3]]);
  box('dark', 5+stride, -6, 14, 6);
  box('olive', -shoulder, -57, shoulder+13, 28);
  box('dark', -shoulder-4, -59, heavy ? 14 : 10, heavy ? 24 : 29);
  oval('skin', 4, -62, 9, 10);
  oval('light', 0, -70, heavy ? 14 : 12, 9);
  box('mint', -shoulder+2, -54, 10, 4);
  line('light', 8, [[-4,-51],[7,-43],[20,-48]]);
  box('dark', 10, -53, heavy ? 32 : 23, heavy ? 7 : 10);
  box('metal', 22, -53, heavy ? 27 : 13, heavy ? 3 : 8);
}
function wheel(x, y, size) {
  oval('dark', x, y, size, size);
  oval('metal', x, y, size*.52, size*.52);
  line('dark', 2, [[x-size*.4,y],[x+size*.4,y]]);
}
function sandbags(y) {
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 4-row; i++) oval(row ? 'dust' : 'sand', -36+i*24+row*12, y-row*10, 14, 7);
  }
}
function unitArt(stride) {
  switch (unit.name) {
    case 'Grenadier': soldier(false, stride); return [36,-49];
    case 'Heavy': soldier(true, stride); return [50,-51];
    case 'Jeep':
      line('dark', 4, [[-36,-26],[-26,-51],[3,-51],[16,-28]]);
      box('olive', -49,-31,101,22); box('light', 13,-35,36,8); box('mint',12,-26,17,4);
      wheel(-31,-10,12); wheel(33,-10,12);
      box('dark', -8,-48,32,4); line('metal', 3, [[4,-46],[4,-29]]);
      return [25,-46];
    case 'Motorcycle':
      wheel(-28,-10,11); wheel(30,-10,11);
      line('olive', 6, [[-28,-10],[-10,-23],[9,-21],[30,-10],[16,-32]]);
      line('light', 9, [[-12,-25],[-2,-42],[14,-33]]);
      oval('light', 6,-47,9,8); box('mint',10,-48,7,3); return [32,-12];
    case 'Speeder':
      oval('mint', -34,-16,20+Math.abs(stride),3);
      oval('dark',0,-24,49,11); oval('metal',5,-27,42,8);
      oval('dark',3,-35,19,7); box('mint',-23,-28,16,3); return [48,-25];
    case 'Barrier':
      sandbags(-6); return [35,-12];
    case 'Barb Wire':
      for (let i = -38; i <= 38; i += 16) {
        oval('dark',i,-11,12,11); oval('metal',i,-11,10,9); oval('hills',i,-11,7,6);
        line('dark', 2, [[i-4,-20],[i-8,-24]]);
      }
      line('dark', 2, [[-48,-4],[46,-17]]); return [40,-14];
    case 'Tall Barrier':
      for(let x=-40; x<36; x+=20) {
        box('dark',x,-62,19,62); box('metal',x+2,-59,15,56); box('light',x+2,-15,15,4);
      }
      return [40,-37];
    case 'Sniper Tower':
      line('dark',6,[[-37,0],[-23,-57],[20,-57],[34,0]]);
      line('olive',4,[[-30,-7],[21,-49],[-22,-49],[28,-7]]);
      box('olive',-33,-69,65,18); box('mint',-29,-66,13,3);
      oval('light',1,-74,9,8); box('dark',4,-73,51,3); return [56,-72];
    case 'MG Nest':
      box('olive',-17,-27,33,19); box('dark',-4,-30,45,5);
      sandbags(-6); return [42,-28];
  }
}

function draw() {
  const w = canvas.clientWidth, h = canvas.clientHeight, density = devicePixelRatio || 1;
  if (canvas.width !== Math.round(w*density) || canvas.height !== Math.round(h*density)) {
    canvas.width = Math.round(w*density);
    canvas.height = Math.round(h*density);
  }
  ctx.setTransform(density,0,0,density,0,0);
  box('sky',0,0,w,h);
  oval('hills',w*.25,h*.82,w*.39,h*.43); oval('hills',w*.78,h*.74,w*.42,h*.32);
  box('sand',0,h*.74,w,h*.26);
  for (let i=0;i<20;i++) oval('dust',i*w/20,h*(.8+(i%4)*.045),5+i%5,1);
  const size = Math.min(h/104,w/185);
  ctx.save();
  ctx.translate(w*(.40+view.move*.25),h*.86);
  ctx.scale(size,size);
  oval('dark',0,1,38,3);
  if (view.hit && !reduced.matches) ctx.translate(-3,0);
  const stride = reduced.matches || !view.move ? 0 : Math.sin(view.time*20)*9;
  const [x,y] = unitArt(stride);
  if (view.flash && !reduced.matches) {
    line('flash',2,[[x,y],[x+10,y-2],[x+6,y],[x+10,y+3],[x,y]]);
  }
  if (view.hit) line('flash',2,[[-15,-37],[-8,-30],[-18,-26]]);
  ctx.restore();
  if (unit.group === 'Obstacles' && view.time > 0 && view.time < 1.6 && !view.hit) {
    const crossing = unit.cue === 'wire';
    const approach = Math.min(view.time / .85, 1);
    const progress = crossing ? approach * .32 + Math.max(0, view.time - .85) * .30 : approach * .24;
    const x = w * (.07 + (reduced.matches ? .24 : progress));
    oval('dark', x, h * .86, 8, 2);
    line('dark', 3, [[x-4,h*.86],[x,h*.82],[x+4,h*.86]]);
    box('metal',x-4,h*.78,8,h*.045);
    oval('flash',x,h*.77,4,4);
  }
  if (unit.cue === 'lob' && view.time > 1.1 && view.time < 1.85 && !reduced.matches) {
    const t = (view.time-1.1)/.75;
    oval('flash',w*(.57+t*.29),h*(.45-.9*t*(1-t)+.37*t),4,4);
  }
}

const soundProfiles = {
  lob:[620,.19,'triangle'], burst:[950,.12], jeep:[125,.50,'sawtooth'],
  bike:[270,.55,'sawtooth'], hover:[460,.48,'sine'], sand:[190,.2],
  wire:[2400,.24,'triangle'], wall:[105,.20], sniper:[2300,.13],
  nest:[1450,.085], hit:[380,.16], shot:[1500,.07], pop:[280,.20],
};
function sound(cue) {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;
  audio ??= new Audio();
  audio.resume().catch(() => {});
  const [pitch,duration,wave] = soundProfiles[cue];
  const now = audio.currentTime;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(.20,now);
  gain.gain.exponentialRampToValueAtTime(.001,now+duration);
  gain.connect(audio.destination);
  if (wave) {
    const voice = audio.createOscillator();
    voice.type = wave;
    voice.frequency.setValueAtTime(pitch,now);
    voice.frequency.exponentialRampToValueAtTime(pitch*(cue === 'bike' || cue === 'hover' ? 1.8 : .55),now+duration);
    voice.connect(gain);
    voice.start(now);
    voice.stop(now+duration);
    return;
  }
  if (!noise) {
    noise = audio.createBuffer(1,audio.sampleRate,audio.sampleRate);
    const samples = noise.getChannelData(0);
    for(let i=0;i<samples.length;i++) samples[i] = Math.random()*2-1;
  }
  const source = audio.createBufferSource();
  source.buffer = noise;
  const filter = audio.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = pitch;
  source.connect(filter).connect(gain);
  source.start(now);
  source.stop(now+duration);
}

function loadUnit() {
  cancelAnimationFrame(frame);
  unit = units.find(item => item.name === select.value);
  view = { time:0, move:0, flash:false, hit:false };
  root.querySelector('#unit-role').textContent = unit.role;
  canvas.setAttribute('aria-label',unit.name + ' side-view concept. ' + unit.role);
  demo.textContent = unit.action;
  status.textContent = 'Ready · first-pass stats';
  stats.replaceChildren();
  const entries = [
    ['Cost', unit.cost+' resources'], ['Hit points',unit.hp], ['Move speed',unit.speed ? unit.speed+' units/s' : 'Stationary'],
    ['Range',unit.range ? unit.range+' units' : '—'], ['Damage',unit.damage ? unit.damage+(unit.cue==='lob' ? ' splash' : ' per hit') : '—'],
    ['Attack interval',unit.interval ? unit.interval+' s' : '—'],
  ];
  for (const [name,value] of entries) {
    const group = document.createElement('div');
    const label = document.createElement('dt');
    const number = document.createElement('dd');
    label.textContent = name;
    number.textContent = value;
    group.append(label,number); stats.append(group);
  }
  draw();
}

function play(hit) {
  cancelAnimationFrame(frame);
  status.textContent = hit ? 'Impact · 12 damage' : unit.action;
  sound(hit ? (unit.group === 'Obstacles' ? unit.cue : 'hit') : unit.speed ? (unit.group === 'Vehicles' ? unit.cue : 'sand') : unit.cue);
  const shots = { lob:[1.1,1.85], burst:[1.1,1.4,1.7,2], jeep:[1.1,1.65,2.2],
    hover:[1.1,2.4], sniper:[1.1], nest:[1.1,1.3,1.5,1.7,1.9] }[unit.cue] || [];
  let next = 0;
  const start = performance.now();
  const duration = hit ? .45 : Math.max(1.6,(shots.at(-1) || 0)+.45);
  function tick(now) {
    const time = (now-start)/1000;
    if (!hit && next < shots.length && time >= shots[next]) {
      const cue = unit.cue === 'lob' && next === 1 ? 'pop' : unit.group === 'Vehicles' ? 'shot' : unit.cue;
      sound(cue);
      next++;
    }
    view = {
      time,
      move: !hit && unit.speed && !reduced.matches ? Math.min(time,1)*unit.speed/245 : 0,
      flash: !hit && next > 0 && time-shots[next-1] < .085,
      hit: hit && time < .26,
    };
    draw();
    if (time < duration) frame = requestAnimationFrame(tick);
    else if (!hit) status.textContent = 'Ready';
  }
  frame = requestAnimationFrame(tick);
}
select.addEventListener('change',loadUnit);
demo.addEventListener('click',() => play(false));
impact.addEventListener('click',() => play(true));
new ResizeObserver(draw).observe(canvas);
loadUnit();
