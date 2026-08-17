import { CUBE, SHIP, BALL, WAVE, UFO } from "./const.js";

export class Player {
  constructor() {
    this.reset(0);
  }

  reset(startX = 0) {
    this.x = startX;
    this.y = 0;
    this.vx = 10.4;
    this.vy = 0;
    this.rot = 0;
    this.rotV = 0;
    this.form = "cube";
    this.gravDir = -1;
    this.grounded = true;
    this.coyote = 0;
    this.buffer = 0;
    this.dead = false;
    this.win = false;
    this.jumps = 0;
    this.size = 1;
    this.trail = [];
    this.blink = 0;
    this.formGrace = 0;
  }

  hit() {
    if (this.form === "wave") return WAVE.hit;
    if (this.form === "ship") return SHIP.hit;
    if (this.form === "ufo") return UFO.hit;
    if (this.form === "ball") return BALL.hit;
    return CUBE.hit;
  }

  setForm(form) {
    if (this.form === form) return false;
    this.form = form;
    this.rotV = 0;
    if (form === "cube" || form === "ball") this.rot = 0;
    if ((form === "ship" || form === "ufo" || form === "wave") && this.y < 0.55) {
      this.y = 0.6;
      this.vy = Math.max(this.vy, 4);
    }
    this.blink = 0.18;
    this.formGrace = 0.22;
    return true;
  }

  action(hold, pressed) {
    if (this.form === "cube") {
      if (pressed) this.buffer = CUBE.buffer;
      if ((this.grounded || this.coyote > 0) && this.buffer > 0) {
        this.vy = CUBE.jump * -this.gravDir;
        this.grounded = false;
        this.coyote = 0;
        this.buffer = 0;
        this.rotV = -this.gravDir * Math.PI * 2 * 2.35;
        this.jumps++;
        return "jump";
      }
    } else if (this.form === "ship") {
      if (hold) return "thrust";
    } else if (this.form === "ball") {
      if (pressed) {
        this.gravDir *= -1;
        this.vy = 6 * -this.gravDir;
        this.grounded = false;
        this.jumps++;
        return "flip";
      }
    } else if (this.form === "wave") {
      return hold ? "up" : "down";
    } else if (this.form === "ufo") {
      if (pressed) {
        this.vy = UFO.jump * -this.gravDir;
        this.jumps++;
        return "jump";
      }
    }
    return null;
  }

  applyOrb(kind) {
    if (kind === "yellow") {
      this.vy = CUBE.jump * 1.05 * -this.gravDir;
      this.grounded = false;
      this.rotV = -this.gravDir * Math.PI * 2 * 2.2;
    } else if (kind === "pink") {
      this.vy = CUBE.jump * 0.72 * -this.gravDir;
      this.grounded = false;
    } else if (kind === "red") {
      this.vy = CUBE.jump * 1.4 * -this.gravDir;
      this.grounded = false;
    } else if (kind === "blue") {
      this.gravDir *= -1;
      this.vy = 8 * -this.gravDir;
    } else if (kind === "green") {
      this.gravDir *= -1;
      this.vy = CUBE.jump * -this.gravDir;
    }
    this.jumps++;
    this.coyote = 0;
    this.buffer = 0;
  }

  applyPad(kind) {
    this.applyOrb(kind === "pink" ? "pink" : kind === "red" ? "red" : kind === "blue" ? "blue" : "yellow");
  }

  physics(dt, hold) {
    if (this.form === "cube") {
      this.vy += CUBE.gravity * this.gravDir * dt;
      this.rot += this.rotV * dt;
    } else if (this.form === "ship") {
      this.vy += (hold ? -SHIP.thrust : SHIP.gravity) * this.gravDir * dt;
      this.vy = Math.max(-SHIP.maxVy, Math.min(SHIP.maxVy, this.vy));
      const target = Math.atan2(this.vy, this.vx);
      this.rot += (target - this.rot) * Math.min(1, 10 * dt);
    } else if (this.form === "ball") {
      this.vy += BALL.gravity * this.gravDir * dt;
      this.rot += (-this.vx * 2.2 * -this.gravDir) * dt;
    } else if (this.form === "wave") {
      this.vy = (hold ? 1 : -1) * this.vx * -this.gravDir;
      this.rot = Math.atan2(this.vy, this.vx);
    } else if (this.form === "ufo") {
      this.vy += UFO.gravity * this.gravDir * dt;
      this.vy = Math.max(-UFO.maxVy, Math.min(UFO.maxVy, this.vy));
      this.rot += ((this.vy * 0.05) - this.rot) * 8 * dt;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.coyote > 0) this.coyote -= dt;
    if (this.buffer > 0) this.buffer -= dt;
    if (this.blink > 0) this.blink -= dt;
    if (this.formGrace > 0) this.formGrace -= dt;

    this.trail.unshift({ x: this.x, y: this.y, r: this.rot, f: this.form });
    if (this.trail.length > 14) this.trail.pop();
  }

  land(surfaceY) {
    const h = this.hit();
    this.y = surfaceY + (this.gravDir < 0 ? 0 : -h);
    this.vy = 0;
    this.grounded = true;
    this.coyote = CUBE.coyote;
    if (this.form === "cube") {
      this.rot = Math.round(this.rot / (Math.PI / 2)) * (Math.PI / 2);
      this.rotV = 0;
    }
  }

  box() {
    const h = this.hit();
    const inset = (1 - h) / 2;
    return { x: this.x + inset, y: this.y + (this.gravDir < 0 ? 0 : 1 - h), w: h, h };
  }
}
