export class Input {
  constructor() {
    this.down = false;
    this.pressed = false;
    this.released = false;
    this._was = false;
    this.pause = false;
    this.restart = false;
    this.practiceTap = false;
    this._bound = false;
  }

  bind(canvas) {
    if (this._bound) return;
    this._bound = true;
    const on = () => { this.down = true; };
    const off = () => { this.down = false; };

    window.addEventListener("keydown", (e) => {
      if (["Space", "ArrowUp", "KeyW"].includes(e.code)) {
        e.preventDefault();
        this.down = true;
      }
      if (e.code === "Escape") this.pause = true;
      if (e.code === "KeyR") this.restart = true;
      if (e.code === "KeyC") this.practiceTap = true;
    });
    window.addEventListener("keyup", (e) => {
      if (["Space", "ArrowUp", "KeyW"].includes(e.code)) this.down = false;
    });
    canvas.addEventListener("pointerdown", (e) => {
      if (e.button === 2) {
        this.practiceTap = true;
        return;
      }
      on();
    });
    window.addEventListener("pointerup", off);
    window.addEventListener("blur", off);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  poll() {
    this.pressed = this.down && !this._was;
    this.released = !this.down && this._was;
    this._was = this.down;
  }

  consumePause() {
    const v = this.pause;
    this.pause = false;
    return v;
  }

  consumeRestart() {
    const v = this.restart;
    this.restart = false;
    return v;
  }

  consumePractice() {
    const v = this.practiceTap;
    this.practiceTap = false;
    return v;
  }
}
