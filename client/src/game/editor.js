const TOOLS = [
  { id: "erase", label: "ERASE" },
  { id: "block", label: "BLOCK" },
  { id: "spike", label: "SPIKE" },
  { id: "saw", label: "SAW" },
  { id: "orb", label: "ORB" },
  { id: "pad", label: "PAD" },
  { id: "coin", label: "COIN" },
  { id: "portal-cube", label: "CUBE" },
  { id: "portal-ship", label: "SHIP" },
  { id: "portal-ball", label: "BALL" },
  { id: "portal-wave", label: "WAVE" },
  { id: "portal-ufo", label: "UFO" },
  { id: "gravity", label: "GRAV" },
  { id: "speed", label: "2X" },
];

export class Editor {
  constructor(canvas, toolbar) {
    this.canvas = canvas;
    this.toolbar = toolbar;
    this.tool = "block";
    this.objects = [];
    this.camX = 0;
    this.cell = 28;
    this.dragging = false;
    this.onChange = () => {};
    this._buildToolbar();
    this._bind();
    this.draw();
  }

  _buildToolbar() {
    this.toolbar.innerHTML = TOOLS.map(
      (t) => `<button data-tool="${t.id}" class="${t.id === this.tool ? "on" : ""}">${t.label}</button>`
    ).join("");
    this.toolbar.querySelectorAll("button").forEach((b) => {
      b.onclick = () => {
        this.tool = b.dataset.tool;
        this.toolbar.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
      };
    });
  }

  _bind() {
    const pos = (e) => {
      const r = this.canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - r.left) / this.cell + this.camX);
      const y = Math.floor((r.bottom - e.clientY) / this.cell);
      return { x, y: Math.max(0, Math.min(9, y)) };
    };
    this.canvas.addEventListener("pointerdown", (e) => {
      this.dragging = true;
      this.paint(pos(e));
    });
    this.canvas.addEventListener("pointermove", (e) => {
      if (this.dragging) this.paint(pos(e));
    });
    window.addEventListener("pointerup", () => { this.dragging = false; });
    this.canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.camX = Math.max(0, this.camX + (e.deltaY > 0 ? 2 : -2));
      this.draw();
    }, { passive: false });
  }

  paint({ x, y }) {
    this.objects = this.objects.filter((o) => !(o.x === x && (o.y || 0) === y));
    if (this.tool !== "erase") {
      const o = this.make(this.tool, x, y);
      if (o) this.objects.push(o);
    }
    this.onChange(this.objects);
    this.draw();
  }

  make(tool, x, y) {
    if (tool === "block") return { t: "block", x, y, w: 1, h: 1 };
    if (tool === "spike") return { t: "spike", x, y, rot: 0 };
    if (tool === "saw") return { t: "saw", x, y };
    if (tool === "orb") return { t: "orb", x, y, kind: "yellow" };
    if (tool === "pad") return { t: "pad", x, y: 0, kind: "yellow" };
    if (tool === "coin") return { t: "coin", x, y, i: x };
    if (tool.startsWith("portal-")) return { t: "portal", x, y, form: tool.slice(7) };
    if (tool === "gravity") return { t: "gravity", x, y };
    if (tool === "speed") return { t: "speed", x, y, mult: 2 };
    return null;
  }

  load(objects) {
    this.objects = (objects || []).map((o) => ({ ...o }));
    this.draw();
  }

  toLevel(name, difficulty) {
    const maxX = this.objects.reduce((m, o) => Math.max(m, o.x), 40);
    return {
      speed: 10.4,
      length: maxX + 16,
      color: { bg: "#070112", ground: "#14082a", accent: "#00f5ff", accent2: "#ff2bd6" },
      objects: this.objects,
      name,
      difficulty,
    };
  }

  draw() {
    const ctx = this.canvas.getContext("2d");
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#070212";
    ctx.fillRect(0, 0, w, h);
    const cell = this.cell;
    ctx.strokeStyle = "rgba(0,245,255,0.08)";
    for (let x = 0; x < w; x += cell) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += cell) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    const gy = h - cell;
    ctx.fillStyle = "#14082a";
    ctx.fillRect(0, gy + cell * 0.7, w, 40);
    ctx.fillStyle = "#00f5ff";
    ctx.fillRect(0, gy + cell * 0.7, w, 2);

    const sx = (o) => (o.x - this.camX) * cell;
    const sy = (o) => h - ((o.y || 0) + 1) * cell;
    for (const o of this.objects) {
      const x = sx(o), y = sy(o);
      if (o.t === "block") { ctx.fillStyle = "#1a1030"; ctx.strokeStyle = "#00f5ff"; ctx.fillRect(x, y, cell, cell); ctx.strokeRect(x, y, cell, cell); }
      else if (o.t === "spike") { ctx.fillStyle = "#ff3864"; ctx.beginPath(); ctx.moveTo(x + cell / 2, y + 2); ctx.lineTo(x + cell - 2, y + cell - 2); ctx.lineTo(x + 2, y + cell - 2); ctx.fill(); }
      else if (o.t === "saw") { ctx.fillStyle = "#ff3864"; ctx.beginPath(); ctx.arc(x + cell / 2, y + cell / 2, cell * 0.4, 0, Math.PI * 2); ctx.fill(); }
      else if (o.t === "orb") { ctx.fillStyle = "#ffd166"; ctx.beginPath(); ctx.arc(x + cell / 2, y + cell / 2, cell * 0.28, 0, Math.PI * 2); ctx.fill(); }
      else if (o.t === "pad") { ctx.fillStyle = "#ffd166"; ctx.fillRect(x, y + cell * 0.7, cell, 6); }
      else if (o.t === "coin") { ctx.fillStyle = "#ffd166"; ctx.fillRect(x + 8, y + 8, cell - 16, cell - 16); }
      else if (o.t === "portal") { ctx.strokeStyle = "#3dffb0"; ctx.strokeRect(x + 8, y, 10, cell); }
      else { ctx.fillStyle = "#ffd166"; ctx.fillText(o.t[0].toUpperCase(), x + 8, y + 18); }
    }
    ctx.fillStyle = "#9a90b8";
    ctx.font = "12px Rajdhani, sans-serif";
    ctx.fillText(`x ${Math.floor(this.camX)}–${Math.floor(this.camX + w / cell)}   objects ${this.objects.length}   scroll wheel to pan`, 10, 16);
  }
}
