const unitSounds = {
  fire: [1700, .085], ready: [2200, .085], step: [240, .085],
  lob: [620, .19, 'triangle'], burst: [950, .12], jeep: [125, .50, 'sawtooth'],
  bike: [270, .55, 'sawtooth'], hover: [460, .48, 'sine'], sand: [190, .2],
  wire: [2400, .24, 'triangle'], wall: [105, .20], sniper: [2300, .13], nest: [1450, .085],
};
let gruntAudio;
let gruntNoise;

function playGruntSound(cue) {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (Audio) {
    gruntAudio ??= new Audio();
    if (gruntAudio.state === 'suspended') gruntAudio.resume().catch(() => {});
    const [pitch, duration, wave] = unitSounds[cue];
    const gain = gruntAudio.createGain();
    const now = gruntAudio.currentTime;
    gain.gain.setValueAtTime(cue === 'step' ? .12 : .20, now);
    gain.gain.exponentialRampToValueAtTime(.001, now + duration);
    gain.connect(gruntAudio.destination);
    if (wave) {
      const oscillator = gruntAudio.createOscillator();
      oscillator.type = wave;
      oscillator.frequency.setValueAtTime(pitch, now);
      oscillator.frequency.exponentialRampToValueAtTime(pitch * (cue === 'bike' || cue === 'hover' ? 1.8 : .55), now + duration);
      oscillator.connect(gain);
      oscillator.start(now);
      oscillator.stop(now + duration);
    } else {
      if (!gruntNoise) {
        gruntNoise = gruntAudio.createBuffer(1, Math.floor(gruntAudio.sampleRate * .18), gruntAudio.sampleRate);
        const samples = gruntNoise.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      }
      const source = gruntAudio.createBufferSource();
      const filter = gruntAudio.createBiquadFilter();
      source.buffer = gruntNoise;
      filter.type = 'bandpass';
      filter.frequency.value = pitch;
      source.connect(filter).connect(gain);
      source.start(now);
    }
  }
  if (cue === 'ready' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) {
    window.speechSynthesis.cancel();
    const voice = new window.SpeechSynthesisUtterance('Ready.');
    voice.rate = 1.12;
    voice.volume = .65;
    window.speechSynthesis.speak(voice);
  }
}

function drawBattleUnit(ctx, unit, now, selected) {
  function ellipse(color, x, y, rx, ry) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  function block(color, x, y, w, h) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }
  if (unit.target) {
    ctx.strokeStyle = '#183c34';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(unit.target.x, unit.target.y, 8, 0, Math.PI * 2);
    ctx.stroke();
    ellipse('#baf4e2', unit.target.x, unit.target.y, 3, 3);
  }
  ctx.save();
  ctx.translate(unit.x, unit.y);
  ellipse('#302e28aa', 3, 4, 18, 14);
  if (selected) {
    ctx.strokeStyle = '#baf4e2';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.rotate(unit.facing);
  const {name, group} = unit.design;
  if (group !== 'Soldiers' && group !== 'Captains') {
    drawEquipment(name, block, ellipse);
    if (now < unit.flashUntil) ellipse('#ffe29e', 28, 0, 5, 3);
    ctx.restore();
    return;
  }
  const stride = unit.moving && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? Math.sin(unit.distance * Math.PI / 10) * 8 : 0;
  block('#212c28', -14 + stride, -9, 9, 6);
  block('#212c28', -14 - stride, 3, 9, 6);
  ellipse('#212c28', -4, 0, 10, 13);
  ellipse('#69794f', -3, 0, 8, 11);
  block('#424e39', -14, -7, 6, 14);
  if (name === 'Heavy') {
    block('#354035', -10, -15, 18, 6);
    block('#354035', -10, 9, 18, 6);
  }
  if (name === 'Grenadier') block('#424e39', -17, -10, 7, 19);
  if (group === 'Captains') block('#f4dc92', -8, 2, 6, 6);
  block('#94e5cc', -6, -10, 7, 3);
  ellipse('#212c28', 4, 0, 9, 9);
  ellipse('#899565', 4, -1, 7, 7);
  ellipse('#69794f', 6, 0, 5, 6);
  const barrel = name === 'Sniper' ? 31 : name === 'Grenadier' ? 17 : 22;
  block('#212c28', 1, 7, barrel, name === 'Grenadier' || name === 'Heavy' ? 7 : 4);
  block('#82908a', 6, 7, 10, 1);
  if (now < unit.flashUntil) ellipse('#ffe29e', barrel + 3, 9, 5, 3);
  ctx.restore();
}

function drawEquipment(name, block, ellipse) {
  const dark = '#252c29';
  const olive = '#657552';
  const metal = '#68777a';
  const mint = '#94e5cc';
  const sandbag = '#c8ad80';
  switch (name) {
    case 'Jeep':
      for (const x of [-19, 11]) {
        block(dark, x, -15, 10, 8);
        block(dark, x, 7, 10, 8);
      }
      block(olive, -22, -10, 46, 20);
      block(dark, -13, -7, 21, 14);
      block(metal, -7, -9, 4, 18);
      block(mint, 13, -6, 7, 12);
      block(dark, -4, -2, 25, 4);
      break;
    case 'Motorcycle':
      block(dark, -21, -3, 42, 6);
      block(olive, -12, -5, 25, 10);
      block(metal, 8, -9, 4, 18);
      ellipse('#8e9b69', 1, 0, 7, 6);
      block(mint, 2, -3, 5, 3);
      break;
    case 'Speeder':
      ellipse(mint, -18, 0, 13, 7);
      ellipse(dark, 0, 0, 24, 12);
      ellipse(metal, 4, 0, 19, 9);
      ellipse(dark, 4, 0, 10, 6);
      block(mint, -17, -7, 5, 14);
      break;
    case 'Barrier':
      for (const x of [-16, 0, 16]) {
        ellipse('#917953', x, 4, 10, 6);
        ellipse(sandbag, x, -1, 10, 6);
      }
      break;
    case 'Barb Wire':
      block(dark, -26, -1, 52, 2);
      for (const x of [-19, -9, 1, 11, 21]) {
        ellipse(metal, x, 0, 7, 8);
        ellipse('#a5906b', x, 0, 4, 5);
      }
      break;
    case 'Tall Barrier':
      for (const x of [-24, -8, 8]) {
        block(dark, x, -7, 15, 16);
        block(metal, x + 1, -7, 13, 11);
        block('#b3bcbc', x + 1, -7, 13, 2);
      }
      break;
    case 'Sniper Tower':
      block(dark, -20, -20, 40, 40);
      block(olive, -16, -16, 32, 32);
      block('#8e9b69', -12, -12, 24, 24);
      block(mint, -15, -15, 9, 3);
      block(dark, -3, -2, 31, 4);
      break;
    case 'MG Nest':
      ellipse(dark, 0, 0, 22, 17);
      for (let i = 0; i < 9; i++) {
        const angle = i / 9 * Math.PI * 2;
        ellipse(sandbag, Math.cos(angle) * 18, Math.sin(angle) * 13, 5, 4);
      }
      block(olive, -9, -7, 14, 14);
      block(dark, 0, -2, 28, 5);
      break;
  }
}
