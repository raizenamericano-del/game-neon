function make() {
  return { x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 2, color: "#fff", drag: 1, g: 0, spin: 0, rot: 0, shape: "sq" };
}

export class Particles {
  constructor(cap = 280) {
    this.free = Array.from({ length: cap }, make);
    this.live = [];
    this.enabled = true;
  }

  spawn(n, fn) {
    if (!this.enabled) return;
    for (let i = 0; i < n; i++) {
      const p = this.free.pop() || make();
      p.drag = 0.98;
      p.g = 0;
      p.spin = 0;
      p.rot = 0;
      p.shape = "sq";
      fn(p, i);
      p.max = p.life;
      this.live.push(p);
    }
  }

  burst(x, y, color, n = 22) {
    this.spawn(n, (p) => {
      const a = Math.random() * Math.PI * 2;
      const s = 4 + Math.random() * 16;
      p.x = x; p.y = y;
      p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s;
      p.life = 0.35 + Math.random() * 0.4;
      p.size = 2 + Math.random() * 5;
      p.color = color;
      p.g = -18;
    });
  }

  dust(x, y, color) {
    this.spawn(6, (p) => {
      p.x = x + (Math.random() - 0.5); p.y = y;
      p.vx = -2 - Math.random() * 4; p.vy = 1 + Math.random() * 3;
      p.life = 0.25; p.size = 2; p.color = color; p.g = -10;
    });
  }

  spark(x, y, color) {
    this.spawn(10, (p) => {
      p.x = x; p.y = y;
      p.vx = (Math.random() - 0.5) * 8; p.vy = 2 + Math.random() * 6;
      p.life = 0.3; p.size = 2 + Math.random() * 2; p.color = color;
    });
  }

  update(dt) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.live.splice(i, 1);
        if (this.free.length < 360) this.free.push(p);
        continue;
      }
      p.vy += p.g * dt;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
    }
  }

  draw(ctx, toScreen) {
    for (const p of this.live) {
      const s = toScreen(p.x, p.y);
      const a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.fillRect(s.x - p.size / 2, s.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    while (this.live.length) this.free.push(this.live.pop());
  }
}
