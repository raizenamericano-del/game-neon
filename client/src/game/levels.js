const palettes = [
  { bg: "#070112", ground: "#14082a", accent: "#00f5ff", accent2: "#ff2bd6" },
  { bg: "#060116", ground: "#1a0730", accent: "#7b2fff", accent2: "#00f5ff" },
  { bg: "#08010e", ground: "#22081c", accent: "#ff9f1c", accent2: "#ff2bd6" },
  { bg: "#010914", ground: "#061828", accent: "#3dffb0", accent2: "#00f5ff" },
  { bg: "#0c0310", ground: "#24081c", accent: "#ff2bd6", accent2: "#c77dff" },
  { bg: "#03140f", ground: "#06241a", accent: "#3dffb0", accent2: "#ffd166" },
  { bg: "#100308", ground: "#280610", accent: "#ff3864", accent2: "#ff9f1c" },
  { bg: "#04010f", ground: "#12082a", accent: "#4da3ff", accent2: "#7b2fff" },
  { bg: "#0a0214", ground: "#1a0528", accent: "#c77dff", accent2: "#00f5ff" },
  { bg: "#050008", ground: "#160610", accent: "#ffd166", accent2: "#ff2bd6" },
];

class W {
  constructor() {
    this.objects = [];
    this._end = 80;
    this.ceiling = 10;
  }
  add(o) { this.objects.push(o); return this; }
  spike(x, y = 0, rot = 0) { return this.add({ t: "spike", x, y, rot }); }
  block(x, y = 0, w = 1, h = 1) { return this.add({ t: "block", x, y, w, h }); }
  saw(x, y = 1.4) { return this.add({ t: "saw", x, y }); }
  portal(x, form, y = 1.2) { return this.add({ t: "portal", x, y, form }); }
  orb(x, y, kind = "yellow") { return this.add({ t: "orb", x, y, kind }); }
  pad(x, kind = "yellow", y = 0) { return this.add({ t: "pad", x, y, kind }); }
  coin(x, y, i = 0) { return this.add({ t: "coin", x, y, i }); }
  gravity(x, y = 1.2) { return this.add({ t: "gravity", x, y }); }
  speed(x, mult = 2, y = 1.2) { return this.add({ t: "speed", x, y, mult }); }
  bar(x, w = 1.6) { return this.add({ t: "bar", x, y: 1.12, w }); }
  pit(x, w = 3) { return this.add({ t: "pit", x, w }); }
  laser(x, y = 0, h = 3, period = 1.6) { return this.add({ t: "laser", x, y, h, period }); }
  ring(x, y = 2.2) { return this.add({ t: "ring", x, y }); }
  crystal(x, y = 1.8) { return this.add({ t: "crystal", x, y }); }
  drone(x, y = 2.4, amp = 1.1) { return this.add({ t: "drone", x, y, amp }); }
  hint(x, text) { return this.add({ t: "hint", x, y: 3.2, text }); }
  spikes(x, n, gap = 5) {
    for (let i = 0; i < n; i++) this.spike(x + i * gap);
    return this;
  }
  row(x, n) {
    for (let i = 0; i < n; i++) this.spike(x + i);
    return this;
  }
  end(x) {
    this._end = x;
    this.add({ t: "finish", x, y: 0 });
    return this;
  }
}

function pack(id, name, difficulty, stars, speed, pal, fn) {
  const w = new W();
  fn(w);
  return {
    id, name, difficulty, stars, coins: 3, speed,
    color: pal, ceiling: w.ceiling, length: w._end, objects: w.objects, official: true,
  };
}

export const OFFICIAL = [
  pack("01-first-pulse", "First Pulse", 1, 2, 10.2, palettes[0], (w) => {
    w.hint(8, "TAP / SPACE  ·  JUMP");
    w.spike(16);
    w.spike(24);
    w.hint(30, "S / ↓  ·  SLIDE UNDER");
    w.bar(36);
    w.coin(42, 2.6, 0);
    w.hint(48, "JUMP AGAIN IN AIR");
    w.row(54, 3);
    w.hint(66, "SHIFT  ·  DASH THROUGH");
    w.row(72, 5);
    w.crystal(80, 1.6);
    w.bar(88);
    w.spike(96);
    w.spike(102);
    w.coin(108, 2.8, 1);
    w.row(116, 2);
    w.bar(124);
    w.coin(132, 2.4, 2);
    w.spike(138);
    w.end(150);
  }),

  pack("02-neon-streets", "Neon Streets", 2, 3, 10.2, palettes[1], (w) => {
    w.hint(10, "MIX IT  ·  JUMP · SLIDE · DASH");
    w.spike(16);
    w.bar(24);
    w.spike(32);
    w.row(40, 3);
    w.coin(48, 3.0, 0);
    w.pad(54, "yellow");
    w.ring(60, 3.4);
    w.bar(68);
    w.spike(76);
    w.crystal(82, 1.8);
    w.row(88, 4);
    w.hint(98, "E  ·  AEGIS BLOCKS ONE HIT");
    w.spike(106);
    w.bar(114);
    w.row(122, 2);
    w.coin(128, 2.6, 1);
    w.drone(136, 2.2, 0.9);
    w.spike(144);
    w.coin(150, 2.8, 2);
    w.bar(156);
    w.end(170);
  }),

  pack("03-cyber-drift", "Cyber Drift", 3, 4, 10.2, palettes[2], (w) => {
    w.spikes(14, 3, 6);
    w.portal(30, "ship");
    w.hint(34, "HOLD TO CLIMB  ·  RELEASE TO DIVE");
    w.saw(42, 2.8);
    w.saw(50, 4.6);
    w.coin(56, 3.2, 0);
    w.saw(62, 3.0);
    w.ring(70, 4.2);
    w.saw(76, 5.0);
    w.saw(84, 2.6);
    w.coin(90, 4.4, 1);
    w.drone(98, 3.6, 1.2);
    w.portal(108, "cube");
    w.bar(116);
    w.row(124, 3);
    w.coin(132, 2.6, 2);
    w.spike(140);
    w.end(154);
  }),

  pack("04-voltage", "Voltage", 4, 5, 10.2, palettes[3], (w) => {
    w.hint(10, "Q  ·  OVERCLOCK SLOWS TIME");
    w.spike(16);
    w.laser(24, 0, 2.6, 1.5);
    w.bar(32);
    w.row(40, 3);
    w.crystal(50, 1.8);
    w.laser(58, 0, 3.2, 1.3);
    w.coin(64, 3.0, 0);
    w.pad(72, "yellow");
    w.ring(78, 3.6);
    w.row(86, 4);
    w.bar(96);
    w.spike(104);
    w.coin(110, 2.6, 1);
    w.drone(118, 2.4, 1);
    w.laser(126, 0, 2.8, 1.4);
    w.row(136, 2);
    w.coin(144, 2.8, 2);
    w.end(158);
  }),

  pack("05-gravity-well", "Gravity Well", 5, 6, 10.2, palettes[4], (w) => {
    w.spike(14);
    w.bar(22);
    w.portal(30, "ball");
    w.hint(34, "TAP TO FLIP GRAVITY");
    w.block(38, 8, 50, 1);
    w.spike(44, 1);
    w.spike(54, 7, 180);
    w.coin(60, 4.0, 0);
    w.spike(68, 1);
    w.spike(78, 7, 180);
    w.ring(86, 4.2);
    w.spike(92, 1);
    w.coin(100, 4.0, 1);
    w.spike(108, 7, 180);
    w.portal(118, "cube");
    w.bar(126);
    w.row(134, 3);
    w.coin(142, 2.6, 2);
    w.end(156);
  }),

  pack("06-plasma-wave", "Plasma Wave", 6, 7, 10.2, palettes[5], (w) => {
    w.spike(14);
    w.row(22, 2);
    w.portal(30, "wave");
    w.hint(34, "HOLD UP  ·  RELEASE DOWN");
    w.block(42, 7.2, 8, 3);
    w.coin(52, 4.4, 0);
    w.saw(58, 4.2);
    w.block(66, 7.0, 8, 3);
    w.ring(76, 4.6);
    w.saw(82, 3.6);
    w.coin(90, 4.8, 1);
    w.portal(100, "cube");
    w.bar(108);
    w.row(116, 3);
    w.crystal(124, 1.7);
    w.row(132, 5);
    w.coin(142, 2.8, 2);
    w.end(156);
  }),

  pack("07-quantum-flux", "Quantum Flux", 7, 8, 10.2, palettes[6], (w) => {
    w.hint(10, "F  ·  NOVA CLEARS NEARBY HAZARDS");
    w.spike(16);
    w.bar(24);
    w.portal(32, "ufo");
    w.hint(36, "TAP TO FLAP");
    w.block(40, 8, 36, 1);
    w.saw(48, 3.2);
    w.saw(56, 5.0);
    w.coin(62, 3.4, 0);
    w.saw(70, 3.0);
    w.drone(78, 4.2, 1.1);
    w.coin(86, 4.6, 1);
    w.portal(96, "cube");
    w.row(104, 3);
    w.laser(114, 0, 2.8, 1.25);
    w.bar(124);
    w.row(132, 4);
    w.coin(142, 2.8, 2);
    w.end(156);
  }),

  pack("08-dark-matter", "Dark Matter", 8, 9, 10.2, palettes[7], (w) => {
    w.spike(14);
    w.row(22, 3);
    w.bar(32);
    w.crystal(40, 1.8);
    w.row(46, 5);
    w.portal(58, "ship");
    w.saw(66, 3.2);
    w.saw(74, 5.0);
    w.coin(80, 3.6, 0);
    w.drone(88, 3.8, 1.2);
    w.portal(98, "cube");
    w.bar(106);
    w.laser(114, 0, 3.0, 1.2);
    w.row(124, 3);
    w.coin(132, 2.8, 1);
    w.pad(140, "yellow");
    w.ring(146, 3.6);
    w.row(154, 4);
    w.coin(164, 2.8, 2);
    w.end(178);
  }),

  pack("09-event-horizon", "Event Horizon", 9, 10, 12.4, palettes[8], (w) => {
    w.speed(8, 2);
    w.spike(16);
    w.bar(24);
    w.row(32, 3);
    w.laser(42, 0, 2.6, 1.15);
    w.crystal(50, 1.8);
    w.row(56, 5);
    w.portal(70, "ufo");
    w.saw(78, 3.4);
    w.coin(84, 3.2, 0);
    w.saw(90, 5.0);
    w.portal(100, "wave");
    w.block(108, 7.2, 10, 3);
    w.coin(118, 4.6, 1);
    w.portal(128, "cube");
    w.bar(136);
    w.row(144, 3);
    w.drone(154, 2.4, 1);
    w.row(164, 4);
    w.coin(174, 2.8, 2);
    w.end(188);
  }),

  pack("10-singularity", "Singularity", 10, 12, 12.4, palettes[9], (w) => {
    w.hint(8, "USE EVERYTHING");
    w.speed(10, 2);
    w.spike(18);
    w.bar(26);
    w.row(34, 3);
    w.laser(44, 0, 2.8, 1.1);
    w.crystal(52, 1.7);
    w.row(58, 5);
    w.portal(72, "ship");
    w.saw(80, 3.2);
    w.saw(88, 5.0);
    w.coin(94, 3.4, 0);
    w.portal(104, "ball");
    w.block(108, 8, 20, 1);
    w.spike(114, 1);
    w.spike(124, 7, 180);
    w.coin(130, 4.0, 1);
    w.portal(140, "ufo");
    w.saw(148, 3.4);
    w.portal(158, "cube");
    w.bar(166);
    w.row(174, 3);
    w.hint(182, "NOVA [F] THE WALL");
    w.row(186, 6);
    w.coin(198, 2.8, 2);
    w.pad(206, "red");
    w.row(214, 4);
    w.end(230);
  }),
];

// helper used above — attach on prototype-style via W
W.prototype.novaGate = function novaGate() {
  this.hint(182, "NOVA [F] THE WALL");
  this.row(186, 6);
  return this;
};

export function getOfficial(id) {
  return OFFICIAL.find((l) => l.id === id);
}

export function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeDaily(seed, dateKey) {
  const rand = mulberry32(seed);
  const base = OFFICIAL[Math.floor(rand() * OFFICIAL.length)];
  const pal = palettes[Math.floor(rand() * palettes.length)];
  return {
    ...base,
    id: `daily-${dateKey}`,
    name: `Daily · ${dateKey}`,
    color: pal,
    objects: base.objects.map((o) => ({ ...o })),
    official: false,
    daily: true,
    stars: 5,
  };
}

export function emptyCustom() {
  return {
    id: "draft",
    name: "Untitled",
    difficulty: 3,
    stars: 0,
    coins: 0,
    speed: 10.2,
    color: palettes[0],
    ceiling: 10,
    length: 80,
    objects: [],
    official: false,
  };
}
