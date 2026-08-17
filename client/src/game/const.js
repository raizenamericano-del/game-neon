export const UNIT = 44;
export const FIXED = 1 / 120;
export const SPEEDS = { 0.5: 8.6, 1: 10.2, 2: 12.4, 3: 14.8, 4: 18.2 };

export const CUBE = {
  gravity: 76,
  jump: 19.0,
  airJump: 17.4,
  hit: 0.78,
  coyote: 0.1,
  buffer: 0.14,
  airJumps: 1,
  slideHit: 0.36,
  slideTime: 0.42,
};

export const SHIP = {
  gravity: 24,
  thrust: 38,
  hit: 0.7,
  maxVy: 15,
};

export const BALL = {
  gravity: 72,
  hit: 0.76,
};

export const WAVE = {
  hit: 0.34,
};

export const UFO = {
  gravity: 38,
  jump: 13.2,
  hit: 0.7,
  maxVy: 17,
};

export const SKILLS = {
  dash: { cd: 3.2, dur: 0.22, invuln: 0.38, name: "DASH" },
  shield: { cd: 7.5, dur: 6, name: "AEGIS" },
  slow: { cd: 9.5, dur: 1.7, scale: 0.4, name: "OVERCLOCK" },
  nova: { cd: 11, dur: 0.7, radius: 3.4, name: "NOVA" },
};

export const FORMS = ["cube", "ship", "ball", "wave", "ufo"];
