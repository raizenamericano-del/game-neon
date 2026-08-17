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
  add(o) {
    this.objects.push(o);
    return this;
  }
  spike(x, y = 0, rot = 0) { return this.add({ t: "spike", x, y, rot }); }
  block(x, y = 0, w = 1, h = 1) { return this.add({ t: "block", x, y, w, h }); }
  saw(x, y = 1.2) { return this.add({ t: "saw", x, y }); }
  portal(x, form, y = 1.2) { return this.add({ t: "portal", x, y, form }); }
  orb(x, y, kind = "yellow") { return this.add({ t: "orb", x, y, kind }); }
  pad(x, kind = "yellow", y = 0) { return this.add({ t: "pad", x, y, kind }); }
  coin(x, y, i = 0) { return this.add({ t: "coin", x, y, i }); }
  gravity(x, y = 1.2) { return this.add({ t: "gravity", x, y }); }
  speed(x, mult = 2, y = 1.2) { return this.add({ t: "speed", x, y, mult }); }
  spikes(x, n, gap = 3, y = 0) {
    for (let i = 0; i < n; i++) this.spike(x + i * gap, y);
    return this;
  }
  roof(x, n, ceil = 8) {
    for (let i = 0; i < n; i++) this.spike(x + i, ceil - 1, 180);
    return this;
  }
  stairs(x, n) {
    for (let i = 0; i < n; i++) this.block(x + i, 0, 1, i + 1);
    return this;
  }
  plat(x, y, w) { return this.block(x, y, w, 1); }
  corridor(x, w, floorY, gap) {
    this.block(x, 0, w, floorY);
    this.block(x, floorY + gap, w, 8);
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
    id,
    name,
    difficulty,
    stars,
    coins: 3,
    speed,
    color: pal,
    ceiling: w.ceiling,
    length: w._end,
    objects: w.objects,
    official: true,
  };
}

export const OFFICIAL = [
  pack("01-first-pulse", "First Pulse", 1, 2, 10.4, palettes[0], (w) => {
    w.spikes(16, 3, 5);
    w.coin(18, 2.6, 0);
    w.spike(34);
    w.spike(36);
    w.block(42, 0, 4, 1);
    w.spike(44, 1);
    w.orb(50, 2.4, "yellow");
    w.spike(52);
    w.spike(54);
    w.pad(60, "yellow");
    w.spike(64);
    w.spike(67);
    w.coin(72, 3.2, 1);
    w.spikes(78, 4, 4);
    w.block(96, 0, 6, 1);
    w.spike(98, 1);
    w.spike(100, 1);
    w.orb(106, 2.6);
    w.spike(108);
    w.coin(114, 2.8, 2);
    w.spikes(118, 3, 3.5);
    w.end(136);
  }),

  pack("02-neon-streets", "Neon Streets", 2, 3, 10.4, palettes[1], (w) => {
    w.spikes(14, 4, 3.6);
    w.stairs(30, 3);
    w.spike(34, 3);
    w.orb(38, 4.2);
    w.spike(40, 0);
    w.plat(46, 2, 4);
    w.spike(48, 3);
    w.coin(50, 4.4, 0);
    w.pad(56, "yellow");
    w.spikes(60, 3, 2.8);
    w.block(72, 0, 3, 2);
    w.orb(76, 3.4, "pink");
    w.spike(78);
    w.spike(80);
    w.coin(86, 2.8, 1);
    w.spikes(90, 5, 3.2);
    w.pad(108, "pink");
    w.plat(114, 3, 5);
    w.spike(116, 4);
    w.coin(118, 5.2, 2);
    w.orb(122, 4.4);
    w.spikes(126, 4, 3);
    w.end(146);
  }),

  pack("03-cyber-drift", "Cyber Drift", 3, 4, 10.4, palettes[2], (w) => {
    w.spikes(14, 3, 4);
    w.portal(28, "ship");
    w.block(36, 8, 40, 2);
    w.saw(42, 3.2);
    w.saw(50, 4.8);
    w.coin(54, 3.4, 0);
    w.saw(58, 3);
    w.block(64, 0, 4, 2);
    w.saw(72, 5);
    w.coin(78, 4.6, 1);
    w.saw(82, 3.2);
    w.saw(88, 5.1);
    w.block(94, 5, 5, 2);
    w.coin(104, 3.2, 2);
    w.saw(108, 4);
    w.portal(118, "cube");
    w.spikes(124, 4, 3.4);
    w.end(146);
  }),

  pack("04-voltage", "Voltage", 4, 5, 12.85, palettes[3], (w) => {
    w.speed(8, 2);
    w.spikes(16, 4, 3.2);
    w.pad(30, "yellow");
    w.spike(34); w.spike(36);
    w.orb(42, 2.8, "yellow");
    w.spike(44); w.spike(46);
    w.portal(54, "ship");
    w.block(58, 8, 28, 2);
    w.saw(64, 3.6);
    w.saw(70, 5);
    w.coin(74, 3.2, 0);
    w.saw(78, 3.4);
    w.block(84, 0, 3, 2);
    w.coin(92, 4.8, 1);
    w.portal(100, "cube");
    w.spikes(106, 3, 2.8);
    w.orb(116, 2.6, "pink");
    w.spike(118);
    w.coin(124, 3, 2);
    w.pad(130, "red");
    w.spikes(136, 4, 3);
    w.end(156);
  }),

  pack("05-gravity-well", "Gravity Well", 5, 6, 10.4, palettes[4], (w) => {
    w.spikes(14, 3, 3.5);
    w.portal(26, "ball");
    w.block(30, 0, 70, 1);
    w.block(30, 8, 70, 1);
    w.spike(36, 1);
    w.spike(44, 7, 180);
    w.spike(52, 1);
    w.coin(56, 4, 0);
    w.spike(60, 7, 180);
    w.spike(68, 1);
    w.spike(70, 1);
    w.spike(78, 7, 180);
    w.coin(84, 4.2, 1);
    w.spike(88, 1);
    w.spike(96, 7, 180);
    w.spike(104, 1);
    w.gravity(112);
    w.spike(118, 7, 180);
    w.coin(124, 4, 2);
    w.portal(132, "cube");
    w.spikes(138, 4, 3);
    w.end(158);
  }),

  pack("06-plasma-wave", "Plasma Wave", 6, 7, 10.4, palettes[5], (w) => {
    w.spikes(14, 2, 4);
    w.portal(24, "wave");
    w.block(32, 7.2, 8, 3);
    w.block(42, 0, 5, 2.4);
    w.block(42, 7.6, 5, 2);
    w.coin(50, 4.6, 0);
    w.block(54, 7.0, 10, 3);
    w.saw(60, 4.6);
    w.block(68, 0, 6, 2.2);
    w.block(68, 7.4, 6, 2);
    w.coin(78, 5.2, 1);
    w.block(82, 6.6, 12, 3);
    w.saw(90, 4.1);
    w.coin(98, 4, 2);
    w.portal(110, "cube");
    w.spikes(114, 5, 3);
    w.end(138);
  }),

  pack("07-quantum-flux", "Quantum Flux", 7, 8, 12.85, palettes[6], (w) => {
    w.speed(6, 2);
    w.spikes(14, 3, 3);
    w.portal(26, "ufo");
    w.block(30, 8, 50, 1);
    w.saw(36, 3.5);
    w.saw(44, 5.4);
    w.coin(50, 3.2, 0);
    w.saw(56, 3.6);
    w.block(62, 1, 3, 2);
    w.saw(70, 5.2);
    w.coin(76, 4.6, 1);
    w.saw(82, 3.2);
    w.portal(90, "ship");
    w.block(94, 8, 24, 2);
    w.saw(100, 3.8);
    w.saw(108, 5);
    w.coin(114, 3.4, 2);
    w.portal(122, "cube");
    w.pad(128, "yellow");
    w.spikes(132, 4, 2.8);
    w.end(152);
  }),

  pack("08-dark-matter", "Dark Matter", 8, 9, 12.85, palettes[7], (w) => {
    w.spikes(12, 4, 2.8);
    w.orb(24, 2.4, "yellow");
    w.spike(26); w.spike(28);
    w.portal(34, "wave");
    w.block(42, 7.0, 16, 3);
    w.saw(48, 4.7);
    w.portal(62, "ball");
    w.block(66, 8, 28, 1);
    w.spike(70, 1);
    w.spike(78, 7, 180);
    w.coin(84, 4, 0);
    w.spike(88, 1);
    w.portal(98, "ship");
    w.block(102, 8, 22, 2);
    w.saw(108, 3.6);
    w.coin(114, 4.8, 1);
    w.saw(118, 5);
    w.portal(128, "cube");
    w.pad(134, "red");
    w.coin(140, 4.4, 2);
    w.spikes(144, 5, 2.6);
    w.end(166);
  }),

  pack("09-event-horizon", "Event Horizon", 9, 10, 15.6, palettes[8], (w) => {
    w.speed(6, 3);
    w.spikes(14, 5, 2.6);
    w.orb(28, 2.5);
    w.spike(30); w.spike(32);
    w.portal(38, "ufo");
    w.block(42, 8, 20, 1);
    w.saw(48, 3.4);
    w.saw(54, 5.4);
    w.coin(58, 3, 0);
    w.portal(66, "wave");
    w.block(74, 7.2, 12, 3);
    w.coin(80, 4.8, 1);
    w.portal(90, "ship");
    w.block(94, 8, 18, 2);
    w.saw(100, 3.8);
    w.saw(108, 5);
    w.portal(116, "cube");
    w.pad(122, "yellow");
    w.spikes(126, 4, 2.4);
    w.orb(138, 2.4, "pink");
    w.coin(144, 3.2, 2);
    w.spikes(148, 4, 2.5);
    w.end(168);
  }),

  pack("10-singularity", "Singularity", 10, 12, 15.6, palettes[9], (w) => {
    w.speed(5, 3);
    w.spikes(12, 4, 2.4);
    w.pad(24, "yellow");
    w.spike(27); w.spike(29);
    w.portal(34, "ship");
    w.block(38, 8, 16, 2);
    w.saw(44, 3.6);
    w.saw(50, 5);
    w.portal(58, "wave");
    w.block(66, 7.2, 10, 3);
    w.coin(70, 4.7, 0);
    w.portal(80, "ball");
    w.block(84, 8, 18, 1);
    w.spike(88, 1);
    w.spike(94, 7, 180);
    w.coin(100, 4, 1);
    w.portal(108, "ufo");
    w.block(112, 8, 16, 1);
    w.saw(118, 3.5);
    w.saw(124, 5.4);
    w.portal(132, "cube");
    w.speed(136, 4);
    w.orb(142, 2.6, "red");
    w.spike(144); w.spike(146);
    w.pad(152, "yellow");
    w.coin(158, 4.2, 2);
    w.spikes(162, 6, 2.3);
    w.gravity(178);
    w.spike(184, 0);
    w.portal(190, "ship");
    w.block(194, 0, 14, 1);
    w.block(194, 7, 14, 2);
    w.saw(200, 4);
    w.portal(212, "cube");
    w.end(226);
  }),
];

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
  const objects = base.objects.map((o) => ({ ...o }));
  if (rand() > 0.5) {
    for (const o of objects) {
      if (o.t === "spike" && rand() > 0.7) o.x += rand() > 0.5 ? 0.5 : -0.5;
    }
  }
  return {
    ...base,
    id: `daily-${dateKey}`,
    name: `Daily · ${dateKey}`,
    color: pal,
    objects,
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
    speed: 10.4,
    color: palettes[0],
    ceiling: 10,
    length: 80,
    objects: [],
    official: false,
  };
}
