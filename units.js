const unitDesigns = [
  { name: 'Navy SEAL', group: 'Captains', cost: 0, speed: 95, interval: .65, action: 'Test fire', cue: 'fire' },
  { name: 'Sniper', group: 'Captains', cost: 0, speed: 65, interval: 2.4, action: 'Test aimed shot', cue: 'sniper' },
  { name: 'Grunt', group: 'Soldiers', cost: 40, hp: 100, speed: 80, range: 180, damage: 12, interval: .8, action: 'Test fire', cue: 'fire' },
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


