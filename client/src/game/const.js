export const UNIT = 44;
export const FIXED = 1 / 120;
export const SPEEDS = { 0.5: 8.4, 1: 10.4, 2: 12.85, 3: 15.6, 4: 19.4 };

export const CUBE = {
  gravity: 92,
  jump: 19.4,
  hit: 0.8,
  coyote: 0.07,
  buffer: 0.1,
};

export const SHIP = {
  gravity: 26,
  thrust: 40,
  hit: 0.72,
  maxVy: 16,
};

export const BALL = {
  gravity: 78,
  hit: 0.78,
};

export const WAVE = {
  hit: 0.34,
};

export const UFO = {
  gravity: 40,
  jump: 13.6,
  hit: 0.72,
  maxVy: 18,
};

export const FORMS = ["cube", "ship", "ball", "wave", "ufo"];

export const COLORS = {
  spike: "#ff3864",
  block: "#1a1030",
  blockLine: "#00f5ff",
  orb: { yellow: "#ffd166", pink: "#ff7ad9", blue: "#4da3ff", red: "#ff5d5d", green: "#3dffb0" },
  pad: { yellow: "#ffd166", pink: "#ff7ad9", blue: "#4da3ff", red: "#ff5d5d" },
  coin: "#ffd166",
  portal: {
    cube: "#00f5ff",
    ship: "#ff9f1c",
    ball: "#c77dff",
    wave: "#3dffb0",
    ufo: "#ff2bd6",
  },
};
