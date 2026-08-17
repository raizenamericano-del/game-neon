import { CUBE, SHIP, BALL, WAVE, UFO, SKILLS } from "./const.js";

export class Player {
  constructor() {
    this.reset(0);
  }

  reset(startX = 0) {
    this.x = startX;
    this.y = 0;
    this.baseVx = 10.2;
    this.vx = 10.2;
    this.vy = 0;
    this.rot = 0;
    this.rotV = 0;
    this.form = "cube";
    this.gravDir = -1;
    this.grounded = true;
    this.coyote = 0;
    this.buffer = 0;
    this.airLeft = CUBE.airJumps;
    this.sliding = false;
    this.slideT = 0;
    this.dead = false;
    this.win = false;
    this.jumps = 0;
    this.size = 1;
    this.trail = [];
    this.blink = 0;
    this.formGrace = 0;
    this.invuln = 0;
    this.dashing = 0;
    this.shield = false;
    this.shieldT = 0;
    this.slowT = 0;
    this.novaT = 0;
    this.cd = { dash: 0, shield: 0, slow: 0, nova: 0 };
  }

  hit() {
    if (this.sliding && this.form === "cube") return CUBE.slideHit;
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
    this.sliding = false;
    if (form === "cube" || form === "ball") this.rot = 0;
    if ((form === "ship" || form === "ufo" || form === "wave") && this.y < 0.55) {
      this.y = 0.6;
      this.vy = Math.max(this.vy, 4);
    }
    this.blink = 0.18;
    this.formGrace = 0.28;
    return true;
  }

  doJump(air = false) {
    const power = air ? CUBE.airJump : CUBE.jump;
    this.vy = power * -this.gravDir;
    this.grounded = false;
    this.coyote = 0;
    this.buffer = 0;
    this.sliding = false;
    this.slideT = 0;
    this.rotV = -this.gravDir * Math.PI * 2 * (air ? 2.8 : 2.2);
    this.jumps++;
    return air ? "airjump" : "jump";
  }

  action(hold, pressed, wantSlide) {
    if (this.form === "cube") {
      if (pressed) this.buffer = CUBE.buffer;
      const canGround = this.grounded || this.coyote > 0;
      if (canGround && this.buffer > 0) {
        this.airLeft = CUBE.airJumps;
        return this.doJump(false);
      }
      if (pressed && !canGround && this.airLeft > 0) {
        this.airLeft--;
        return this.doJump(true);
      }
      if (wantSlide && this.grounded && !this.sliding) {
        this.sliding = true;
        this.slideT = CUBE.slideTime;
        return "slide";
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

  tryDash() {
    if (this.cd.dash > 0 || this.dead) return false;
    this.cd.dash = SKILLS.dash.cd;
    this.dashing = SKILLS.dash.dur;
    this.invuln = Math.max(this.invuln, SKILLS.dash.invuln);
    this.sliding = false;
    return true;
  }

  tryShield() {
    if (this.cd.shield > 0 || this.dead) return false;
    this.cd.shield = SKILLS.shield.cd;
    this.shield = true;
    this.shieldT = SKILLS.shield.dur;
    return true;
  }

  trySlow() {
    if (this.cd.slow > 0 || this.dead) return false;
    this.cd.slow = SKILLS.slow.cd;
    this.slowT = SKILLS.slow.dur;
    return true;
  }

  tryNova() {
    if (this.cd.nova > 0 || this.dead) return false;
    this.cd.nova = SKILLS.nova.cd;
    this.novaT = SKILLS.nova.dur;
    this.invuln = Math.max(this.invuln, 0.2);
    return true;
  }

  absorbHit() {
    if (this.invuln > 0) return true;
    if (this.shield) {
      this.shield = false;
      this.shieldT = 0;
      this.invuln = 0.45;
      this.blink = 0.45;
      return true;
    }
    return false;
  }

  refund(amount = 0.35) {
    for (const k of Object.keys(this.cd)) {
      this.cd[k] = Math.max(0, this.cd[k] - amount * (SKILLS[k]?.cd || 4));
    }
  }

  applyOrb(kind) {
    if (kind === "yellow") {
      this.vy = CUBE.jump * 1.08 * -this.gravDir;
      this.rotV = -this.gravDir * Math.PI * 2 * 2.2;
    } else if (kind === "pink") {
      this.vy = CUBE.jump * 0.75 * -this.gravDir;
    } else if (kind === "red") {
      this.vy = CUBE.jump * 1.38 * -this.gravDir;
    } else if (kind === "blue") {
      this.gravDir *= -1;
      this.vy = 8 * -this.gravDir;
    } else if (kind === "green") {
      this.gravDir *= -1;
      this.vy = CUBE.jump * -this.gravDir;
    }
    this.grounded = false;
    this.sliding = false;
    this.jumps++;
    this.coyote = 0;
    this.buffer = 0;
  }

  applyPad(kind) {
    this.applyOrb(kind === "pink" ? "pink" : kind === "red" ? "red" : kind === "blue" ? "blue" : "yellow");
  }

  physics(dt, hold) {
    if (this.dashing > 0) {
      this.dashing -= dt;
      this.vx = this.baseVx * 2.15;
      this.vy *= 0.55;
    } else {
      this.vx += (this.baseVx - this.vx) * Math.min(1, 8 * dt);
    }

    if (this.form === "cube") {
      if (this.dashing <= 0) this.vy += CUBE.gravity * this.gravDir * dt;
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
      this.rot += (this.vy * 0.05 - this.rot) * 8 * dt;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.coyote > 0) this.coyote -= dt;
    if (this.buffer > 0) this.buffer -= dt;
    if (this.blink > 0) this.blink -= dt;
    if (this.formGrace > 0) this.formGrace -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.slowT > 0) this.slowT -= dt;
    if (this.novaT > 0) this.novaT -= dt;
    if (this.shieldT > 0) {
      this.shieldT -= dt;
      if (this.shieldT <= 0) this.shield = false;
    }
    if (this.sliding) {
      this.slideT -= dt;
      if (this.slideT <= 0 || !this.grounded) this.sliding = false;
    }
    for (const k of Object.keys(this.cd)) {
      if (this.cd[k] > 0) this.cd[k] -= dt;
    }

    this.trail.unshift({ x: this.x, y: this.y, r: this.rot, f: this.form, s: this.sliding });
    if (this.trail.length > 16) this.trail.pop();
  }

  land(surfaceY) {
    const h = this.hit();
    this.y = surfaceY + (this.gravDir < 0 ? 0 : -h);
    this.vy = 0;
    this.grounded = true;
    this.coyote = CUBE.coyote;
    this.airLeft = CUBE.airJumps;
    if (this.form === "cube" && !this.sliding) {
      this.rot = Math.round(this.rot / (Math.PI / 2)) * (Math.PI / 2);
      this.rotV = 0;
    }
  }

  box() {
    const h = this.hit();
    const inset = (1 - (this.sliding ? 0.92 : h)) / 2;
    const w = this.sliding ? 0.92 : h;
    return {
      x: this.x + (this.sliding ? 0.04 : inset),
      y: this.y + (this.gravDir < 0 ? 0 : 1 - h),
      w,
      h,
    };
  }
}
