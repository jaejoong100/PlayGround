// THE LONG ROAD — game data
// All balance lives here so the run stays tunable.

export const CARS = {
  interceptor: {
    id: 'interceptor', name: 'INTERCEPTOR', klass: 'MUSCLE', cost: 0,
    color: '#c8452d', color2: '#742517', accent: '#f0b24b', trim: '#191b18',
    desc: 'Balanced V8 bruiser. The road knows its name.',
    stats: { speed: 1.00, handling: 1.00, armor: 1.00, ram: 1.00 },
    perk: 'NO WEAKNESS. NO EXCUSES.'
  },
  wraith: {
    id: 'wraith', name: 'WRAITH', klass: 'SPORT', cost: 520,
    color: '#2a8c9c', color2: '#123f49', accent: '#9ff4ff', trim: '#141b1e',
    desc: 'Low, loud, and allergic to staying put.',
    stats: { speed: 1.24, handling: 1.18, armor: 0.82, ram: 0.90 },
    perk: 'FASTEST LEGS. THINNEST SKIN.'
  },
  bruiser: {
    id: 'bruiser', name: 'BRUISER', klass: 'PICKUP', cost: 760,
    color: '#69753a', color2: '#39411d', accent: '#d7d287', trim: '#1a1d14',
    desc: 'A rolling argument. It usually wins.',
    stats: { speed: 0.86, handling: 0.82, armor: 1.44, ram: 1.38 },
    perk: 'SOAKS HITS. MAKES HITS.'
  },
  nomad: {
    id: 'nomad', name: 'NOMAD', klass: 'BUGGY', cost: 1050,
    color: '#c47a25', color2: '#6d3d10', accent: '#ffd27a', trim: '#201b13',
    desc: 'Three dead cars, one cage, zero regrets.',
    stats: { speed: 1.06, handling: 1.30, armor: 0.96, ram: 1.02 },
    perk: 'DANCES THROUGH THE HORDE.'
  },
  revenant: {
    id: 'revenant', name: 'REVENANT', klass: 'BLACKTOP', cost: 1600,
    color: '#852c40', color2: '#3d101d', accent: '#ff6b7d', trim: '#0e1012',
    desc: 'Matte black. Warm engine. No radio.',
    stats: { speed: 1.14, handling: 1.08, armor: 1.22, ram: 1.24 },
    perk: 'A HEARSE THAT REFUSED TO RETIRE.'
  }
};

export const WEAPONS = {
  pistol: {
    id: 'pistol', name: 'RUST PISTOL', short: 'PISTOL', cost: 0, type: 'bullet',
    dmg: 19, rate: 0.27, range: 340, speed: 1150, color: '#ffd36b',
    desc: 'One careful owner. Several careless zombies.',
    statline: '19 DMG · 3.7/S'
  },
  shotgun: {
    id: 'shotgun', name: 'SCRAP SHOTGUN', short: 'SHOTGUN', cost: 260, type: 'shotgun',
    dmg: 11, pellets: 5, spread: 0.22, rate: 0.72, range: 285, speed: 900, color: '#ffb15b',
    desc: 'Five arguments at once, all of them rude.',
    statline: '55 BURST · 1.4/S'
  },
  smg: {
    id: 'smg', name: 'RATTLE SMG', short: 'SMG', cost: 430, type: 'bullet',
    dmg: 8.5, rate: 0.095, range: 365, speed: 1200, color: '#ffe28a',
    desc: 'Accuracy by volume. Volume by spite.',
    statline: '8.5 DMG · 10.5/S'
  },
  flamer: {
    id: 'flamer', name: "DRAGON'S BREATH", short: 'FLAMER', cost: 680, type: 'flame',
    dmg: 5.2, rate: 0.065, range: 195, cone: 0.52, color: '#ff7a2a',
    desc: 'The horde is medium-rare. Perfect.',
    statline: 'BURN CONE · 15/S'
  },
  arc: {
    id: 'arc', name: 'ARC RIFLE', short: 'ARC', cost: 920, type: 'arc',
    dmg: 36, rate: 0.52, range: 410, chain: 3, color: '#7de8ff',
    desc: 'Lightning in a lunchbox. Do not lick it.',
    statline: '36 DMG · CHAINS x3'
  },
  rail: {
    id: 'rail', name: 'WIDOWMAKER', short: 'RAIL', cost: 1400, type: 'rail',
    dmg: 98, rate: 1.15, range: 640, color: '#ff5f5f',
    desc: 'A straight line through a bad neighborhood.',
    statline: '98 DMG · PIERCES ALL'
  }
};

export const ARMOR = {
  none: {
    id: 'none', name: 'NO ARMOR', cost: 0, armor: 0, health: 0, speed: 1,
    desc: 'Weight is a luxury. So is a ribcage.',
    statline: '0 ARMOR'
  },
  scrap: {
    id: 'scrap', name: 'SCRAP PLATES', cost: 180, armor: 34, health: 0, speed: 1,
    desc: 'Bolted-on road signs and stubbornness.',
    statline: '+34 ARMOR'
  },
  riot: {
    id: 'riot', name: 'RIOT VEST', cost: 420, armor: 62, health: 10, speed: 0.99,
    desc: 'Still smells like the precinct locker room.',
    statline: '+62 ARMOR · +10 HULL'
  },
  duster: {
    id: 'duster', name: 'KEVLAR DUSTER', cost: 700, armor: 88, health: 18, speed: 0.97,
    desc: 'Long coat. Longer list of enemies.',
    statline: '+88 ARMOR · +18 HULL'
  },
  juggernaut: {
    id: 'juggernaut', name: 'JUGGERNAUT RIG', cost: 1100, armor: 132, health: 30, speed: 0.91,
    desc: 'You are no longer a person. You are a door.',
    statline: '+132 ARMOR · +30 HULL'
  }
};

export const PARTS = {
  engine: {
    id: 'engine', name: 'BORED-OUT V8', icon: 'engine', max: 4, cost: 120, growth: 1.7,
    effect: '+7% travel speed', detail: '+2% weapon damage'
  },
  tires: {
    id: 'tires', name: 'RALLY TIRES', icon: 'tire', max: 4, cost: 95, growth: 1.65,
    effect: '+7% handling', detail: 'sharper steering'
  },
  plating: {
    id: 'plating', name: 'WELDED PLATING', icon: 'plate', max: 4, cost: 110, growth: 1.7,
    effect: '+16 max armor', detail: 'refills at stops'
  },
  ram: {
    id: 'ram', name: 'COW CATCHER', icon: 'ram', max: 4, cost: 105, growth: 1.65,
    effect: '+26 ram damage', detail: 'splatters walkers'
  },
  nitro: {
    id: 'nitro', name: 'NITRO TANK', icon: 'nitro', max: 3, cost: 140, growth: 1.8,
    effect: '-1.2s boost cooldown', detail: 'shorter NOS recharge'
  },
  scavenger: {
    id: 'scavenger', name: 'SCAVENGER RIG', icon: 'scrap', max: 4, cost: 130, growth: 1.7,
    effect: '+8% scrap earned', detail: 'pockets with teeth'
  },
  targeting: {
    id: 'targeting', name: 'TARGETING CHIP', icon: 'chip', max: 4, cost: 150, growth: 1.7,
    effect: '+5% range & fire rate', detail: 'the gun thinks for you'
  },
  fuel: {
    id: 'fuel', name: 'AUX FUEL CELL', icon: 'fuel', max: 4, cost: 120, growth: 1.7,
    effect: '+12 max hull', detail: 'goes boom less often'
  },
  suspension: {
    id: 'suspension', name: 'HEAVY SUSPENSION', icon: 'spring', max: 3, cost: 125, growth: 1.8,
    effect: '-7% crash damage', detail: 'soft landing, hard impact'
  },
  roof: {
    id: 'roof', name: 'ROOF RACK', icon: 'rack', max: 4, cost: 135, growth: 1.7,
    effect: '+6% weapon damage', detail: 'more gun per gun'
  },
  recovery: {
    id: 'recovery', name: 'FIELD REPAIR KIT', icon: 'wrench', max: 3, cost: 140, growth: 1.8,
    effect: '+5% stop healing', detail: 'duct tape and hope'
  },
  horn: {
    id: 'horn', name: 'WAR HORN', icon: 'horn', max: 3, cost: 115, growth: 1.75,
    effect: '+8% nearby slow', detail: 'very rude acoustics'
  }
};

export const TURRETS = {
  gunner: {
    id: 'gunner', name: 'SCRAP GUNNER', cost: 0, color: '#f0b24b',
    desc: 'Reliable autogun. Cheap lead, honest work.',
    dmg: 13, rate: 0.33, range: 265, levelScale: 0.55,
    statline: 'RAPID SINGLE-TARGET'
  },
  pyro: {
    id: 'pyro', name: 'PYRO NEST', cost: 260, color: '#ff6a2a',
    desc: 'A pilot light with a grudge.',
    dmg: 5.5, rate: 0.15, range: 165, levelScale: 0.55,
    statline: 'BURN CONE · SHORT RANGE'
  },
  tesla: {
    id: 'tesla', name: 'TESLA COIL', cost: 430, color: '#7de8ff',
    desc: 'Stolen from a science fair. Wired to a truck.',
    dmg: 24, rate: 0.62, range: 255, levelScale: 0.55,
    statline: 'CHAIN LIGHTNING x3'
  },
  mortar: {
    id: 'mortar', name: 'THUMP MORTAR', cost: 620, color: '#d7a3ff',
    desc: 'Indirect fire for direct problems.',
    dmg: 46, rate: 1.5, range: 370, levelScale: 0.5,
    statline: 'SPLASH DAMAGE'
  },
  sniper: {
    id: 'sniper', name: 'LONG WIDOW', cost: 780, color: '#ff7c7c',
    desc: 'Reaches out and touches someone.',
    dmg: 78, rate: 1.35, range: 530, levelScale: 0.5,
    statline: 'LONG RANGE · HEAVY HIT'
  },
  cryo: {
    id: 'cryo', name: 'CRYO VENT', cost: 900, color: '#9fd8ff',
    desc: 'Makes the dead cool again. Literally.',
    dmg: 4.5, rate: 0.5, range: 215, levelScale: 0.5,
    statline: 'AREA SLOW · CHIP DAMAGE'
  }
};

export const BASE_MODULES = {
  hull: {
    id: 'hull', name: 'REINFORCED HULL', icon: 'hull', max: 3, cost: 180, growth: 1.7,
    desc: '+45 rig integrity per level.'
  },
  hardpoint: {
    id: 'hardpoint', name: 'EXTRA HARDPOINT', icon: 'hardpoint', max: 3, cost: 240, growth: 1.8,
    desc: '+1 turret slot per level.'
  },
  ammo: {
    id: 'ammo', name: 'AMMO CRATE', icon: 'ammo', max: 3, cost: 200, growth: 1.75,
    desc: '+12% turret damage per level.'
  },
  optics: {
    id: 'optics', name: 'NIGHT OPTICS', icon: 'optics', max: 2, cost: 220, growth: 1.8,
    desc: '+12% turret range per level.'
  },
  repair: {
    id: 'repair', name: 'REPAIR DRONE', icon: 'drone', max: 2, cost: 300, growth: 1.8,
    desc: 'Restores 10% rig integrity between waves.'
  },
  barricade: {
    id: 'barricade', name: 'RAZOR BARRICADE', icon: 'barricade', max: 2, cost: 320, growth: 1.8,
    desc: 'Slows enemies near the rig by 25%.'
  }
};

export const STOPS = [
  {
    id: 'diner', name: 'LAST CHANCE DINER', mile: 12, waves: 2, boss: false,
    tagline: 'Coffee, pie, and the end of the world.',
    biome: 'diner',
    palette: { ground: '#55452f', ground2: '#3d3020', road: '#2b2c28', road2: '#20211e', line: '#d8c48e', accent: '#ff8b3d', night: 0.08, prop: 'cactus', fog: '#d38a4d' }
  },
  {
    id: 'bridge', name: 'RUSTWATER BRIDGE', mile: 34, waves: 2, boss: false,
    tagline: 'The river below has been dead for years.',
    biome: 'bridge',
    palette: { ground: '#263e44', ground2: '#172b31', road: '#292d2d', road2: '#1d2121', line: '#c7d6ca', accent: '#5ed4c8', night: 0.18, prop: 'bridge', fog: '#5c8d91' }
  },
  {
    id: 'tunnel', name: 'BLACKPINE TUNNEL', mile: 58, waves: 3, boss: false,
    tagline: 'Two miles of dark. One way out.',
    biome: 'tunnel',
    palette: { ground: '#202124', ground2: '#151619', road: '#242629', road2: '#1a1c1e', line: '#e2bc65', accent: '#ffb347', night: 0.55, prop: 'tunnel', fog: '#8a7048' }
  },
  {
    id: 'boneyard', name: 'THE BONE YARD', mile: 84, waves: 3, boss: true,
    tagline: 'Every car here died doing something stupid.',
    biome: 'boneyard',
    palette: { ground: '#6c5638', ground2: '#4b3a25', road: '#30302b', road2: '#22231f', line: '#d7c9a1', accent: '#ffa23f', night: 0.08, prop: 'wreck', fog: '#b88a51' }
  },
  {
    id: 'motel', name: 'NEON MOTEL', mile: 112, waves: 3, boss: false,
    tagline: 'Vacancy. Vacancy. Vacancy.',
    biome: 'motel',
    palette: { ground: '#31283b', ground2: '#211a2b', road: '#29282e', road2: '#1d1c22', line: '#d6b9d8', accent: '#ff4fa3', night: 0.42, prop: 'palm', fog: '#8d4b8f' }
  },
  {
    id: 'crow', name: "CROW'S NEST", mile: 143, waves: 3, boss: false,
    tagline: 'The trees are full. They are not birds.',
    biome: 'forest',
    palette: { ground: '#24382a', ground2: '#17271b', road: '#282d28', road2: '#1d211d', line: '#b8ca9b', accent: '#9ad66b', night: 0.28, prop: 'pine', fog: '#5a8060' }
  },
  {
    id: 'ashfield', name: 'ASHFIELD', mile: 177, waves: 4, boss: false,
    tagline: 'The fire never went out. Neither did they.',
    biome: 'ash',
    palette: { ground: '#3d3834', ground2: '#292522', road: '#2b2a28', road2: '#20201e', line: '#cdbba9', accent: '#ff6a2a', night: 0.34, prop: 'deadtree', fog: '#7d6155' }
  },
  {
    id: 'relay', name: 'RELAY STATION 9', mile: 214, waves: 4, boss: true,
    tagline: 'Still broadcasting. Nobody is listening.',
    biome: 'relay',
    palette: { ground: '#26343d', ground2: '#19242b', road: '#292e31', road2: '#1e2225', line: '#b9cbd2', accent: '#6cb7ff', night: 0.44, prop: 'antenna', fog: '#50748e' }
  },
  {
    id: 'quarry', name: 'THE QUARRY', mile: 253, waves: 4, boss: false,
    tagline: 'They dug too deep. Something dug back.',
    biome: 'quarry',
    palette: { ground: '#665238', ground2: '#473824', road: '#34322c', road2: '#26251f', line: '#d8c08d', accent: '#f2a640', night: 0.1, prop: 'rock', fog: '#b4874c' }
  },
  {
    id: 'redgate', name: 'REDGATE', mile: 295, waves: 4, boss: false,
    tagline: 'Checkpoint closed. Checkpoint very closed.',
    biome: 'redgate',
    palette: { ground: '#452a28', ground2: '#2f1b1a', road: '#2e2b2a', road2: '#211f1e', line: '#d6b2a3', accent: '#ff4738', night: 0.3, prop: 'barricade', fog: '#8f443b' }
  },
  {
    id: 'glass', name: 'GLASS CITY', mile: 340, waves: 5, boss: true,
    tagline: 'A skyline of broken mirrors.',
    biome: 'city',
    palette: { ground: '#1f2832', ground2: '#141b22', road: '#262b2f', road2: '#1b1f22', line: '#bfe1e8', accent: '#65e8ff', night: 0.55, prop: 'building', fog: '#3d7588' }
  },
  {
    id: 'haven', name: 'HAVEN', mile: 388, waves: 5, boss: true,
    tagline: 'The last gate. Make it count.',
    biome: 'haven',
    palette: { ground: '#354b35', ground2: '#233522', road: '#2b302a', road2: '#20241e', line: '#e2d4a2', accent: '#ffd36b', night: 0.08, prop: 'gate', fog: '#8eaa6a' }
  }
];

export const ENEMIES = {
  walker: {
    id: 'walker', name: 'WALKER', hp: 30, speed: 48, dmg: 8, scrap: 4, radius: 13,
    color: '#8b9a62', cloth: '#4d5a3b', skin: '#a9b47d'
  },
  crawler: {
    id: 'crawler', name: 'CRAWLER', hp: 18, speed: 92, dmg: 5, scrap: 4, radius: 10,
    color: '#a96a4e', cloth: '#5e3a2d', skin: '#c58e6c'
  },
  runner: {
    id: 'runner', name: 'RUNNER', hp: 23, speed: 138, dmg: 6, scrap: 5, radius: 11,
    color: '#b56d52', cloth: '#6d3225', skin: '#c99576'
  },
  bloater: {
    id: 'bloater', name: 'BLOATER', hp: 78, speed: 31, dmg: 14, scrap: 8, radius: 19,
    color: '#7d944e', cloth: '#4b5b2e', skin: '#99a96a'
  },
  brute: {
    id: 'brute', name: 'BRUTE', hp: 190, speed: 34, dmg: 22, scrap: 16, radius: 23,
    color: '#6e7a56', cloth: '#3f4733', skin: '#86916b'
  },
  screamer: {
    id: 'screamer', name: 'SCREAMER', hp: 760, speed: 27, dmg: 30, scrap: 90, radius: 34,
    color: '#a94343', cloth: '#4b1e1e', skin: '#c47a6a', boss: true
  }
};

export const BOSS_NAMES = [
  'THE BONE COLLECTOR',
  'THE NIGHT WATCHMAN',
  'THE GLASS KING',
  'THE LAST WARDEN'
];

export const TIPS = [
  'Drag anywhere to steer. Your gun finds its own targets.',
  'Armor refills at every stop. Hull does not.',
  'Place turrets before the wave. Tap a placed turret to recall it.',
  'Medium-weak zombies. Extremely strong numbers.',
  'Boss stops come every four stops. Bring turrets.',
  'Scrap is forever. Spend it in the garage.',
  'A rammed walker is a solved walker.',
  'The rig can be repaired between waves. The driver cannot.'
];
