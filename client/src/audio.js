export class AudioBus {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.unlocked = false;
    this.musicOn = false;
    this._step = 0;
    this._next = 0;
    this._timer = 0;
    this.bpm = 132;
    this.vols = { master: 0.8, music: 0.55, sfx: 0.85 };
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.applyVol();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    this.unlocked = true;
  }

  setVolumes(master, music, sfx) {
    this.vols = { master: master / 100, music: music / 100, sfx: sfx / 100 };
    this.applyVol();
  }

  applyVol() {
    if (!this.master) return;
    this.master.gain.value = this.vols.master;
    this.musicGain.gain.value = this.vols.music;
    this.sfxGain.gain.value = this.vols.sfx;
  }

  tone(freq, dur = 0.12, type = "square", gain = 0.08, dest = "sfx", slide = 0) {
    if (!this.unlocked) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(dest === "music" ? this.musicGain : this.sfxGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noise(dur = 0.2, gain = 0.1) {
    if (!this.unlocked) return;
    const t = this.ctx.currentTime;
    const n = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 900;
    src.buffer = n;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxGain);
    src.start(t);
  }

  jump() { this.tone(520, 0.09, "square", 0.07, "sfx", 280); }
  orb() { this.tone(740, 0.1, "triangle", 0.08, "sfx", 200); }
  pad() { this.tone(360, 0.14, "sawtooth", 0.06, "sfx", 420); }
  coin() { this.tone(980, 0.12, "triangle", 0.07, "sfx", 400); this.tone(1320, 0.16, "sine", 0.04); }
  portal() { this.tone(220, 0.22, "sawtooth", 0.05, "sfx", 600); }
  click() { this.tone(700, 0.04, "square", 0.03); }
  death() {
    this.noise(0.28, 0.14);
    this.tone(240, 0.32, "sawtooth", 0.08, "sfx", -180);
  }
  complete() {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.18, "triangle", 0.07), i * 90);
    });
  }
  checkpoint() { this.tone(440, 0.08, "square", 0.05); this.tone(660, 0.1, "triangle", 0.04); }

  startMusic() {
    if (!this.unlocked || this.musicOn) return;
    this.musicOn = true;
    this._step = 0;
    this._next = this.ctx.currentTime + 0.05;
    this._tick();
  }

  stopMusic() {
    this.musicOn = false;
    if (this._timer) cancelAnimationFrame(this._timer);
  }

  _tick = () => {
    if (!this.musicOn) return;
    const ctx = this.ctx;
    const stepSec = 60 / this.bpm / 4;
    while (this._next < ctx.currentTime + 0.12) {
      const s = this._step % 16;
      const bar = Math.floor(this._step / 16) % 4;
      if (s % 4 === 0) this._kick(this._next);
      if (s === 4 || s === 12) this._snare(this._next);
      if (s % 2 === 0) this._hat(this._next, 0.03);
      else this._hat(this._next, 0.012);

      const bass = [65.4, 65.4, 73.4, 82.4][bar];
      if (s === 0 || s === 6 || s === 10) this._note(this._next, bass, 0.22, "sawtooth", 0.045);
      const arp = [523.25, 659.25, 783.99, 987.77, 783.99, 659.25];
      if (s % 2 === 0) this._note(this._next, arp[(s / 2 + bar) % arp.length], 0.1, "square", 0.018);

      this._step++;
      this._next += stepSec;
    }
    this._timer = requestAnimationFrame(this._tick);
  };

  _note(time, freq, dur, type, gain) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, time);
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    o.connect(g);
    g.connect(this.musicGain);
    o.start(time);
    o.stop(time + dur + 0.02);
  }

  _kick(time) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(140, time);
    o.frequency.exponentialRampToValueAtTime(42, time + 0.12);
    g.gain.setValueAtTime(0.16, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
    o.connect(g);
    g.connect(this.musicGain);
    o.start(time);
    o.stop(time + 0.18);
  }

  _snare(time) {
    this._note(time, 180, 0.08, "triangle", 0.03);
  }

  _hat(time, gain) {
    this._note(time, 9000, 0.03, "square", gain * 0.35);
  }
}

export const audio = new AudioBus();
