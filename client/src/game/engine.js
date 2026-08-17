import { FIXED, SPEEDS } from "./const.js";
import { Player } from "./player.js";
import { Particles } from "./particles.js";
import { Input } from "./input.js";
import { audio } from "../audio.js";

export class Game {
  constructor(canvas, hooks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.hooks = hooks;
    this.input = new Input();
    this.input.bind(canvas);
    this.fx = new Particles();
    this.player = new Player();
    this.level = null;
    this.running = false;
    this.paused = false;
    this.practice = false;
    this.checkpoints = [];
    this.cam = { x: 0, y: 3, shake: 0, flash: 0 };
    this.scale = 1;
    this.time = 0;
    this.attempt = 1;
    this.attemptJumps = 0;
    this.coins = new Set();
    this.used = new Set();
    this.disabled = new Set();
    this.replay = [];
    this.ghost = [];
    this.settings = { shake: true, particles: true, trail: true, flash: true };
    this.combo = 0;
    this.comboT = 0;
    this._raf = 0;
    this._acc = 0;
    this._last = 0;
    this._deathT = 0;
    this._winT = 0;
    this._groundDust = 0;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.vw = w;
    this.vh = h;
    this.scale = Math.max(32, Math.min(52, h / 12));
  }

  load(level, { practice = false, ghost = [], attempt = 1 } = {}) {
    this.level = level;
    this.practice = practice;
    this.ghost = ghost || [];
    this.attempt = attempt;
    this.checkpoints = practice ? [{ x: 2, y: 0, form: "cube", grav: -1, speed: level.speed, coins: [] }] : [];
    this.hardReset();
  }

  hardReset() {
    const start = this.checkpoints[this.checkpoints.length - 1];
    this.player.reset(start ? start.x : 2);
    if (start) {
      this.player.y = start.y;
      this.player.form = start.form;
      this.player.gravDir = start.grav;
    }
    const spd = start?.speed || this.level?.speed || SPEEDS[1];
    this.player.baseVx = spd;
    this.player.vx = spd;
    this.time = 0;
    this.coins = new Set(start?.coins || []);
    this.used = new Set();
    this.disabled = new Set();
    this.combo = 0;
    this.comboT = 0;
    this.replay = [];
    this.cam.x = this.player.x - 4;
    this.cam.y = 3.2;
    this.cam.shake = 0;
    this.cam.flash = 0;
    this.paused = false;
    this._deathT = 0;
    this._winT = 0;
    this.attemptJumps = 0;
    this.fx.clear();
    this.running = true;
  }

  start() {
    this.running = true;
    this._last = performance.now();
    this._acc = 0;
    cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this._raf);
  }

  loop = (now) => {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this._last) / 1000);
    this._last = now;
    this.input.poll();
    if (this.input.consumePause() && !this.player.dead && !this.player.win) {
      this.paused = !this.paused;
      this.hooks.onPause?.(this.paused);
    }
    if (this.input.consumeRestart()) this.retry();
    if (this.practice && this.input.consumePractice() && !this.player.dead) {
      this.checkpoints.push({
        x: this.player.x, y: this.player.y, form: this.player.form,
        grav: this.player.gravDir, speed: this.player.vx, coins: [...this.coins],
      });
      audio.checkpoint();
      this.hooks.onToast?.("Checkpoint planted");
    }
    if (!this.paused) {
      const scale = this.player.slowT > 0 ? 0.4 : 1;
      this._acc += dt * scale;
      while (this._acc >= FIXED) {
        this.fixed(FIXED);
        this._acc -= FIXED;
      }
    }
    this.draw();
    this._raf = requestAnimationFrame(this.loop);
  };

  retry() {
    if (!this.player.dead && !this.player.win) {
      this.hooks.onSubmit?.({
        percentage: this.percent(), died: true, completed: false, attempts: 1,
        jumps: this.attemptJumps, timeMs: Math.floor(this.time * 1000),
        coins: this.coins.size, replayData: this.replay.slice(),
      });
    }
    this.attempt++;
    this.hardReset();
    this.hooks.onAttempt?.(this.attempt);
  }

  percent() {
    if (!this.level) return 0;
    return Math.max(0, Math.min(100, ((this.player.x - 2) / (this.level.length - 2)) * 100));
  }

  oid(o) { return `${o.t}:${o.x}:${o.y || 0}`; }
  isOff(o) { return this.disabled.has(this.oid(o)); }

  addCombo(n = 1) {
    this.combo += n;
    this.comboT = 2.6;
  }

  tickSkills() {
    const p = this.player;
    if (this.input.consumeSkill("dash") && p.tryDash()) {
      audio.portal();
      this.fx.burst(p.x, p.y + 0.4, this.level.color.accent, 20);
      this.cam.flash = 0.22;
      this.addCombo(1);
    }
    if (this.input.consumeSkill("shield") && p.tryShield()) {
      audio.orb();
      this.fx.spark(p.x + 0.5, p.y + 0.5, "#4da3ff");
    }
    if (this.input.consumeSkill("slow") && p.trySlow()) {
      audio.pad();
      this.cam.flash = 0.18;
    }
    if (this.input.consumeSkill("nova") && p.tryNova()) {
      audio.complete();
      this.fx.burst(p.x + 0.5, p.y + 0.5, "#ffd166", 36);
      this.cam.shake = this.settings.shake ? 10 : 0;
      for (const o of this.level.objects) {
        if (["spike", "saw", "laser", "drone", "bar"].includes(o.t) && Math.abs(o.x - p.x) < 3.4) {
          this.disabled.add(this.oid(o));
        }
      }
      this.addCombo(2);
    }
  }

  fixed(dt) {
    if (this.player.dead) {
      this._deathT += dt;
      this.cam.shake *= 0.9;
      this.fx.update(dt);
      if (this._deathT > 0.42) this.retry();
      return;
    }
    if (this.player.win) {
      this._winT += dt;
      this.fx.update(dt);
      return;
    }

    this.time += dt;
    const p = this.player;
    this.tickSkills();
    const act = p.action(this.input.down, this.input.pressed, this.input.slide);
    if (act === "jump" || act === "airjump" || act === "flip") {
      audio.jump();
      this.attemptJumps++;
      this.fx.dust(p.x + 0.4, p.y, this.level.color.accent);
      if (act === "airjump") this.fx.spark(p.x + 0.4, p.y + 0.3, "#fff");
    } else if (act === "slide") {
      audio.click();
      this.fx.dust(p.x, p.y, this.level.color.accent2);
    }

    p.physics(dt, this.input.down);
    this.collide();
    this.triggers();
    if (this.comboT > 0) this.comboT -= dt;
    else this.combo = 0;

    if ((this.time * 60) % 3 < 1) {
      this.replay.push({ x: +p.x.toFixed(3), y: +p.y.toFixed(3), r: +p.rot.toFixed(3), f: p.form });
      if (this.replay.length > 3600) this.replay.shift();
    }
    if (p.grounded) {
      this._groundDust += dt;
      if (this._groundDust > 0.05) {
        this._groundDust = 0;
        this.fx.dust(p.x, p.y, this.level.color.accent2);
      }
    }
    if (p.x >= this.level.length) this.win();

    const targetCamY = Math.max(2.4, Math.min(6.5, p.y + 2.2));
    this.cam.x += (p.x - 5.2 - this.cam.x) * Math.min(1, 8 * dt);
    this.cam.y += (targetCamY - this.cam.y) * Math.min(1, 4 * dt);
    this.cam.shake *= 0.88;
    this.cam.flash *= 0.9;
    this.fx.update(dt);

    this.hooks.onHud?.({
      percent: this.percent(),
      attempt: this.attempt,
      form: p.form,
      combo: this.combo,
      cd: { ...p.cd },
      shield: p.shield,
      slow: p.slowT > 0,
      dash: p.dashing > 0,
      slide: p.sliding,
    });
  }

  collide() {
    const p = this.player;
    const box = p.box();
    const ground = 0;
    const ceil = this.level.ceiling || 10;
    const flyer = p.form === "ship" || p.form === "wave" || p.form === "ufo";
    const grace = (p.formGrace || 0) > 0;
    const overPit = this.near("pit").some((o) => p.x + 0.4 > o.x && p.x < o.x + (o.w || 3));

    if (p.gravDir < 0) {
      if (box.y <= ground) {
        if (overPit && !p.grounded) return this.hurt();
        if (flyer && !grace) return this.hurt();
        if (p.form === "wave" && p.vy < -1) return this.hurt();
        p.land(ground);
      }
    } else if (box.y + box.h >= ceil) {
      if (flyer && !grace) return this.hurt();
      p.y = ceil - box.h - (1 - p.hit()) / 2;
      p.vy = 0;
      p.grounded = true;
    }
    if (box.y + box.h > ceil + 0.05 || box.y < -0.5) return this.hurt();

    p.grounded = p.grounded && (p.gravDir < 0 ? box.y <= ground + 0.02 : false);

    for (const s of this.near("block")) {
      const sx = s.x, sy = s.y, sw = s.w || 1, sh = s.h || 1;
      if (!overlap(box.x, box.y, box.w, box.h, sx, sy, sw, sh)) continue;
      const prevY = box.y - p.vy * FIXED;
      const landing = !flyer && p.gravDir < 0 && p.vy <= 2 && prevY >= sy + sh - 0.5;
      const invLanding = !flyer && p.gravDir > 0 && p.vy >= 0 && prevY + box.h <= sy + 0.35;
      if (landing) p.land(sy + sh);
      else if (invLanding) {
        p.y = sy - (1 - p.hit());
        p.vy = 0;
        p.grounded = true;
      } else return this.hurt();
    }

    for (const s of this.near("spike")) {
      if (this.isOff(s)) continue;
      if (overlap(box.x, box.y, box.w, box.h, s.x + 0.22, (s.y || 0) + 0.14, 0.56, 0.56)) return this.hurt();
    }
    for (const s of this.near("saw")) {
      if (this.isOff(s)) continue;
      const cx = s.x + 0.5, cy = (s.y || 1) + 0.5;
      const px = box.x + box.w / 2, py = box.y + box.h / 2;
      if ((px - cx) ** 2 + (py - cy) ** 2 < (0.68 + box.w * 0.3) ** 2) return this.hurt();
    }
    for (const s of this.near("bar")) {
      if (this.isOff(s)) continue;
      if (overlap(box.x, box.y, box.w, box.h, s.x, s.y || 1.12, s.w || 1.6, 0.28)) {
        if (p.sliding) this.addCombo(1);
        else return this.hurt();
      }
    }
    for (const s of this.near("laser")) {
      if (this.isOff(s)) continue;
      const period = s.period || 1.6;
      const on = (this.time % period) < period * 0.45;
      if (on && overlap(box.x, box.y, box.w, box.h, s.x + 0.15, s.y || 0, 0.35, s.h || 3)) return this.hurt();
    }
    for (const s of this.near("drone")) {
      if (this.isOff(s)) continue;
      const cy = (s.y || 2.4) + Math.sin(this.time * 3 + s.x) * (s.amp || 1.1);
      const px = box.x + box.w / 2, py = box.y + box.h / 2;
      if ((px - (s.x + 0.5)) ** 2 + (py - cy) ** 2 < 0.55 ** 2) return this.hurt();
    }
  }

  hurt() {
    if (this.player.absorbHit()) {
      audio.orb();
      this.fx.burst(this.player.x + 0.5, this.player.y + 0.5, "#4da3ff", 18);
      this.cam.flash = 0.3;
      return;
    }
    this.die();
  }

  triggers() {
    const p = this.player;
    const box = p.box();
    for (const o of this.level.objects) {
      const id = this.oid(o);
      if (o.t === "portal" && !this.used.has(id) && p.x + 0.5 > o.x && p.x < o.x + 1.2) {
        this.used.add(id);
        if (p.setForm(o.form)) {
          audio.portal();
          this.fx.spark(p.x, p.y + 0.5, this.level.color.accent);
          this.cam.flash = 0.35;
        }
      }
      if (o.t === "speed" && !this.used.has(id) && p.x + 0.4 > o.x) {
        this.used.add(id);
        p.baseVx = SPEEDS[o.mult] || p.baseVx;
        p.vx = p.baseVx;
        audio.portal();
      }
      if (o.t === "gravity" && !this.used.has(id) && p.x + 0.4 > o.x) {
        this.used.add(id);
        p.gravDir *= -1;
        p.vy = 6 * -p.gravDir;
        audio.portal();
      }
      if (o.t === "orb" && !this.used.has(id) && overlap(box.x, box.y, box.w, box.h, o.x, o.y, 1, 1)) {
        if (this.input.pressed || this.input.down) {
          this.used.add(id);
          p.applyOrb(o.kind || "yellow");
          audio.orb();
          this.fx.spark(o.x + 0.5, o.y + 0.5, "#ffd166");
          this.attemptJumps++;
        }
      }
      if (o.t === "pad" && !this.used.has(id) && overlap(box.x, box.y, box.w, box.h, o.x, o.y || 0, 1, 0.4)) {
        this.used.add(id);
        p.applyPad(o.kind || "yellow");
        audio.pad();
        this.attemptJumps++;
      }
      if (o.t === "coin" && !this.coins.has(o.i ?? o.x) && overlap(box.x, box.y, box.w, box.h, o.x, o.y, 0.8, 0.8)) {
        this.coins.add(o.i ?? o.x);
        audio.coin();
        this.fx.burst(o.x + 0.5, o.y + 0.5, "#ffd166", 16);
        this.addCombo(1);
      }
      if (o.t === "ring" && !this.used.has(id) && overlap(box.x, box.y, box.w, box.h, o.x, o.y, 1, 1)) {
        this.used.add(id);
        audio.coin();
        p.refund(0.28);
        this.fx.spark(o.x + 0.5, o.y + 0.5, "#3dffb0");
        this.addCombo(2);
      }
      if (o.t === "crystal" && !this.used.has(id) && overlap(box.x, box.y, box.w, box.h, o.x, o.y, 1, 1)) {
        this.used.add(id);
        audio.orb();
        p.refund(0.55);
        this.fx.burst(o.x + 0.5, o.y + 0.5, "#c77dff", 18);
        this.addCombo(1);
      }
    }
  }

  near(type) {
    const x = this.player.x;
    return this.level.objects.filter((o) => o.t === type && o.x > x - 3 && o.x < x + 5);
  }

  die() {
    if (this.player.dead || this.player.win) return;
    this.player.dead = true;
    this._deathT = 0;
    audio.death();
    this.cam.shake = this.settings.shake ? 16 : 0;
    this.cam.flash = this.settings.flash ? 0.7 : 0;
    this.fx.burst(this.player.x + 0.5, this.player.y + 0.5, this.level.color.accent, 34);
    this.fx.burst(this.player.x + 0.5, this.player.y + 0.5, this.level.color.accent2, 18);
    this.hooks.onSubmit?.({
      percentage: this.percent(), died: true, completed: false, attempts: 1,
      jumps: this.attemptJumps, timeMs: Math.floor(this.time * 1000),
      coins: this.coins.size, replayData: this.replay.slice(),
    });
  }

  win() {
    if (this.player.win) return;
    this.player.win = true;
    this._winT = 0;
    audio.complete();
    this.cam.flash = 0.5;
    this.fx.burst(this.player.x, this.player.y + 0.5, "#ffd166", 40);
    this.hooks.onWin?.({
      percentage: 100, died: false, completed: true, attempts: this.attempt,
      jumps: this.attemptJumps, timeMs: Math.floor(this.time * 1000),
      coins: this.coins.size, practice: this.practice,
      replayData: this.replay.slice(), stars: this.practice ? 0 : this.level.stars || 0,
    });
  }

  toScreen(x, y) {
    const shakeX = this.cam.shake ? (Math.random() - 0.5) * this.cam.shake : 0;
    const shakeY = this.cam.shake ? (Math.random() - 0.5) * this.cam.shake : 0;
    return {
      x: (x - this.cam.x) * this.scale + shakeX,
      y: this.vh * 0.72 - (y - (this.cam.y - 3.2)) * this.scale + shakeY,
    };
  }

  draw() {
    const { ctx, vw, vh, level } = this;
    if (!level) return;
    ctx.fillStyle = level.color.bg;
    ctx.fillRect(0, 0, vw, vh);
    const g = ctx.createRadialGradient(vw * 0.3, vh * 0.2, 20, vw * 0.5, vh * 0.6, vw);
    g.addColorStop(0, hexA(level.color.accent, this.player.slowT > 0 ? 0.22 : 0.12));
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, vw, vh);
    this.drawParallax();
    this.drawGround();
    this.drawGhost();
    this.drawObjects();
    if (this.settings.trail) this.drawTrail();
    this.drawPlayer();
    this.fx.draw(ctx, (x, y) => this.toScreen(x, y));
    this.drawCheckpoints();
    if (this.cam.flash > 0.01) {
      ctx.fillStyle = `rgba(255,255,255,${this.cam.flash * 0.35})`;
      ctx.fillRect(0, 0, vw, vh);
    }
    if (this.player.dead) {
      ctx.fillStyle = `rgba(255, 40, 80, ${Math.min(0.28, this._deathT)})`;
      ctx.fillRect(0, 0, vw, vh);
    }
  }

  drawParallax() {
    const { ctx, vw, vh, cam, level } = this;
    ctx.save();
    ctx.strokeStyle = hexA(level.color.accent, 0.08);
    ctx.lineWidth = 1;
    const grid = this.scale;
    const ox = -((cam.x * this.scale) % grid);
    for (let x = ox; x < vw; x += grid) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, vh); ctx.stroke();
    }
    const groundY = this.toScreen(0, 0).y;
    for (let y = groundY; y > 0; y -= grid) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(vw, y); ctx.stroke();
    }
    ctx.beginPath();
    ctx.fillStyle = hexA(level.color.accent2, 0.1);
    const scroll = cam.x * 8;
    ctx.moveTo(0, vh);
    for (let x = 0; x <= vw; x += 8) {
      ctx.lineTo(x, vh * 0.62 + Math.sin((x + scroll) * 0.01) * 28 + Math.sin((x + scroll) * 0.023) * 14);
    }
    ctx.lineTo(vw, vh);
    ctx.fill();
    ctx.restore();
  }

  drawGround() {
    const { ctx, vw, level } = this;
    const y = this.toScreen(0, 0).y;
    ctx.fillStyle = level.color.ground;
    ctx.fillRect(0, y, vw, 400);
    ctx.shadowColor = level.color.accent;
    ctx.shadowBlur = 18;
    ctx.fillStyle = level.color.accent;
    ctx.fillRect(0, y, vw, 3);
    ctx.shadowBlur = 0;
    const cy = this.toScreen(0, this.level.ceiling || 10).y;
    ctx.fillStyle = level.color.ground;
    ctx.fillRect(0, 0, vw, cy);
    ctx.fillStyle = hexA(level.color.accent2, 0.7);
    ctx.fillRect(0, cy, vw, 2);
  }

  drawObjects() {
    const minX = this.cam.x - 2;
    const maxX = this.cam.x + this.vw / this.scale + 2;
    for (const o of this.level.objects) {
      if (o.x < minX || o.x > maxX) continue;
      if (o.t === "block") this.block(o);
      else if (o.t === "spike") this.spike(o);
      else if (o.t === "saw") this.saw(o);
      else if (o.t === "portal") this.portal(o);
      else if (o.t === "orb") this.orb(o);
      else if (o.t === "pad") this.pad(o);
      else if (o.t === "coin") this.coin(o);
      else if (o.t === "gravity") this.gportal(o, "G");
      else if (o.t === "speed") this.gportal(o, `${o.mult}x`);
      else if (o.t === "finish") this.finish(o);
      else if (o.t === "bar") this.drawBar(o);
      else if (o.t === "laser") this.drawLaser(o);
      else if (o.t === "ring") this.drawRing(o);
      else if (o.t === "crystal") this.drawCrystal(o);
      else if (o.t === "drone") this.drawDrone(o);
      else if (o.t === "hint") this.drawHint(o);
      else if (o.t === "pit") this.drawPit(o);
    }
  }

  block(o) {
    const { ctx } = this;
    const a = this.toScreen(o.x, o.y + (o.h || 1));
    ctx.fillStyle = "#140a24";
    ctx.strokeStyle = this.level.color.accent;
    ctx.lineWidth = 2;
    ctx.shadowColor = this.level.color.accent;
    ctx.shadowBlur = 10;
    roundRect(ctx, a.x, a.y, (o.w || 1) * this.scale, (o.h || 1) * this.scale, 4);
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
  }

  spike(o) {
    if (this.isOff(o)) return;
    const { ctx } = this;
    const c = this.toScreen(o.x + 0.5, (o.y || 0) + 0.5);
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(((o.rot || 0) * Math.PI) / 180);
    const s = this.scale * 0.52;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.92, s * 0.82);
    ctx.lineTo(-s * 0.92, s * 0.82);
    ctx.closePath();
    ctx.fillStyle = "#ff3864";
    ctx.shadowColor = "#ff3864";
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.restore();
    ctx.shadowBlur = 0;
  }

  saw(o) {
    if (this.isOff(o)) return;
    const { ctx } = this;
    const c = this.toScreen(o.x + 0.5, (o.y || 1) + 0.5);
    const r = this.scale * 0.7;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(this.time * 6);
    ctx.fillStyle = "#ff3864";
    ctx.shadowColor = "#ff3864";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const rr = i % 2 ? r : r * 0.62;
      ctx[i ? "lineTo" : "moveTo"](Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "#1a0810";
    ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.shadowBlur = 0;
  }

  portal(o) {
    const { ctx } = this;
    const c = this.toScreen(o.x + 0.4, o.y || 1);
    const col = { cube: "#00f5ff", ship: "#ff9f1c", ball: "#c77dff", wave: "#3dffb0", ufo: "#ff2bd6" }[o.form] || "#fff";
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.strokeStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = 18;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.scale * 0.28, this.scale * 0.9, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.shadowBlur = 0;
  }

  gportal(o, label) {
    const { ctx } = this;
    const c = this.toScreen(o.x + 0.4, o.y || 1);
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.strokeStyle = "#ffd166";
    ctx.shadowColor = "#ffd166";
    ctx.shadowBlur = 14;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.scale * 0.24, this.scale * 0.8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#ffd166";
    ctx.font = `700 ${Math.floor(this.scale * 0.28)}px Rajdhani, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(label, 0, 4);
    ctx.restore();
    ctx.shadowBlur = 0;
  }

  orb(o) {
    if (this.used.has(this.oid(o))) return;
    const { ctx } = this;
    const c = this.toScreen(o.x + 0.5, o.y + 0.5);
    const col = { yellow: "#ffd166", pink: "#ff7ad9", blue: "#4da3ff", red: "#ff5d5d", green: "#3dffb0" }[o.kind] || "#ffd166";
    ctx.fillStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(c.x, c.y, this.scale * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  pad(o) {
    if (this.used.has(this.oid(o))) return;
    const { ctx } = this;
    const a = this.toScreen(o.x, (o.y || 0) + 0.22);
    ctx.fillStyle = "#ffd166";
    ctx.shadowColor = "#ffd166";
    ctx.shadowBlur = 12;
    ctx.fillRect(a.x, a.y, this.scale, this.scale * 0.18);
    ctx.shadowBlur = 0;
  }

  coin(o) {
    if (this.coins.has(o.i ?? o.x)) return;
    const { ctx } = this;
    const c = this.toScreen(o.x + 0.5, o.y + 0.5);
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(this.time * 3);
    ctx.fillStyle = "#ffd166";
    ctx.shadowColor = "#ffd166";
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(0, -this.scale * 0.28);
    ctx.lineTo(this.scale * 0.22, 0);
    ctx.lineTo(0, this.scale * 0.28);
    ctx.lineTo(-this.scale * 0.22, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawBar(o) {
    if (this.isOff(o)) return;
    const { ctx } = this;
    const a = this.toScreen(o.x, (o.y || 1.12) + 0.28);
    ctx.fillStyle = "#ff9f1c";
    ctx.shadowColor = "#ff9f1c";
    ctx.shadowBlur = 14;
    ctx.fillRect(a.x, a.y, (o.w || 1.6) * this.scale, this.scale * 0.22);
    ctx.shadowBlur = 0;
  }

  drawLaser(o) {
    if (this.isOff(o)) return;
    const on = (this.time % (o.period || 1.6)) < (o.period || 1.6) * 0.45;
    const { ctx } = this;
    const a = this.toScreen(o.x, (o.y || 0) + (o.h || 3));
    ctx.fillStyle = on ? "rgba(255,56,100,0.85)" : "rgba(255,56,100,0.15)";
    ctx.shadowColor = "#ff3864";
    ctx.shadowBlur = on ? 18 : 0;
    ctx.fillRect(a.x + this.scale * 0.2, a.y, this.scale * 0.22, (o.h || 3) * this.scale);
    ctx.shadowBlur = 0;
  }

  drawRing(o) {
    if (this.used.has(this.oid(o))) return;
    const { ctx } = this;
    const c = this.toScreen(o.x + 0.5, o.y + 0.5);
    ctx.strokeStyle = "#3dffb0";
    ctx.shadowColor = "#3dffb0";
    ctx.shadowBlur = 16;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, this.scale * 0.42, this.scale * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  drawCrystal(o) {
    if (this.used.has(this.oid(o))) return;
    const { ctx } = this;
    const c = this.toScreen(o.x + 0.5, o.y + 0.5);
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(this.time * 2);
    ctx.fillStyle = "#c77dff";
    ctx.shadowColor = "#c77dff";
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(0, -this.scale * 0.32);
    ctx.lineTo(this.scale * 0.22, 0);
    ctx.lineTo(0, this.scale * 0.32);
    ctx.lineTo(-this.scale * 0.22, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawDrone(o) {
    if (this.isOff(o)) return;
    const cy = (o.y || 2.4) + Math.sin(this.time * 3 + o.x) * (o.amp || 1.1);
    const c = this.toScreen(o.x + 0.5, cy);
    const { ctx } = this;
    ctx.fillStyle = "#ff2bd6";
    ctx.shadowColor = "#ff2bd6";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(c.x, c.y, this.scale * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  drawHint(o) {
    if (Math.abs(this.player.x - o.x) > 14) return;
    const s = this.toScreen(o.x, o.y || 3.2);
    const { ctx } = this;
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.font = `700 ${Math.floor(this.scale * 0.26)}px Rajdhani, sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(o.text, s.x, s.y);
  }

  drawPit(o) {
    const a = this.toScreen(o.x, 0);
    this.ctx.fillStyle = "#020008";
    this.ctx.fillRect(a.x, a.y, (o.w || 3) * this.scale, 80);
  }

  drawTrail() {
    const { ctx, player } = this;
    for (let i = player.trail.length - 1; i > 0; i--) {
      const t = player.trail[i];
      const s = this.toScreen(t.x + 0.5, t.y + 0.5);
      ctx.globalAlpha = 0.05 * (1 - i / player.trail.length);
      ctx.fillStyle = this.level.color.accent;
      ctx.fillRect(s.x - this.scale * 0.32, s.y - this.scale * 0.32, this.scale * 0.64, this.scale * 0.64);
    }
    ctx.globalAlpha = 1;
  }

  drawGhost() {
    if (!this.ghost?.length) return;
    let best = this.ghost[0];
    for (const g of this.ghost) {
      if (g.x <= this.player.x) best = g;
      else break;
    }
    const s = this.toScreen(best.x + 0.5, best.y + 0.5);
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.translate(s.x, s.y);
    ctx.rotate(-(best.r || 0));
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(-this.scale * 0.34, -this.scale * 0.34, this.scale * 0.68, this.scale * 0.68);
    ctx.restore();
  }

  drawPlayer() {
    const { ctx, player } = this;
    const s = this.toScreen(player.x + 0.5, player.y + (player.sliding ? 0.22 : 0.5));
    const col = player.dashing > 0 ? "#ffffff" : this.level.color.accent;
    if (player.shield) {
      ctx.save();
      ctx.strokeStyle = "#4da3ff";
      ctx.shadowColor = "#4da3ff";
      ctx.shadowBlur = 18;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(s.x, s.y, this.scale * 0.7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(player.sliding ? 0 : -player.rot);
    if (player.blink > 0) ctx.globalAlpha = 0.45 + Math.sin(player.blink * 40) * 0.35;
    ctx.shadowColor = col;
    ctx.shadowBlur = player.dashing > 0 ? 28 : 18;
    const sz = this.scale * (player.sliding ? 0.92 : 0.78);
    const sy = player.sliding ? this.scale * 0.34 : sz;
    ctx.fillStyle = col;
    ctx.strokeStyle = "#041018";
    ctx.lineWidth = 2;
    if (player.form === "cube") {
      roundRect(ctx, -sz / 2, -sy / 2, sz, sy, 6);
      ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#041018";
      ctx.fillRect(-sz * 0.16, -sy * 0.16, sz * 0.32, sy * 0.32);
    } else if (player.form === "ship") {
      ctx.beginPath();
      ctx.moveTo(sz * 0.58, 0);
      ctx.lineTo(-sz * 0.46, -sz * 0.4);
      ctx.lineTo(-sz * 0.22, 0);
      ctx.lineTo(-sz * 0.46, sz * 0.4);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    } else if (player.form === "ball") {
      ctx.beginPath();
      ctx.arc(0, 0, sz * 0.48, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    } else if (player.form === "wave") {
      ctx.beginPath();
      ctx.moveTo(sz * 0.5, 0);
      ctx.lineTo(-sz * 0.4, -sz * 0.28);
      ctx.lineTo(-sz * 0.12, 0);
      ctx.lineTo(-sz * 0.4, sz * 0.28);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.ellipse(0, 0, sz * 0.5, sz * 0.22, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  finish(o) {
    const { ctx } = this;
    const a = this.toScreen(o.x, 0);
    const top = this.toScreen(o.x, 8);
    const grd = ctx.createLinearGradient(a.x, top.y, a.x + this.scale * 1.4, a.y);
    grd.addColorStop(0, hexA(this.level.color.accent, 0.05));
    grd.addColorStop(0.5, hexA(this.level.color.accent, 0.55));
    grd.addColorStop(1, hexA(this.level.color.accent2, 0.15));
    ctx.fillStyle = grd;
    ctx.fillRect(a.x, top.y, this.scale * 1.3, a.y - top.y);
    ctx.fillStyle = "#fff";
    ctx.font = `900 ${Math.floor(this.scale * 0.42)}px Orbitron, sans-serif`;
    ctx.save();
    ctx.translate(a.x + this.scale * 0.35, (a.y + top.y) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText("FINISH", 0, 0);
    ctx.restore();
  }

  drawCheckpoints() {
    if (!this.practice) return;
    const { ctx } = this;
    for (const c of this.checkpoints) {
      const s = this.toScreen(c.x + 0.5, c.y + 1.2);
      ctx.fillStyle = "#3dffb0";
      ctx.fillRect(s.x - 2, s.y, 4, this.scale);
    }
  }
}

function overlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function hexA(hex, a) {
  const n = hex.replace("#", "");
  return `rgba(${parseInt(n.slice(0, 2), 16)},${parseInt(n.slice(2, 4), 16)},${parseInt(n.slice(4, 6), 16)},${a})`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
