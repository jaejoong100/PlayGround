// Tiny procedural audio engine — no assets, no waiting.
export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.engine = null;
    this.engineGain = null;
    this.lastShot = 0;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.55;
    this.master.connect(this.ctx.destination);
    this.noise = this.makeNoise();
    this.startEngine();
  }

  makeNoise() {
    const len = this.ctx.sampleRate * 1.2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  setMuted(v) {
    this.muted = v;
    if (this.master) this.master.gain.setTargetAtTime(v ? 0 : 0.55, this.ctx.currentTime, 0.03);
  }

  startEngine() {
    if (!this.ctx || this.engine) return;
    const o = this.ctx.createOscillator();
    const o2 = this.ctx.createOscillator();
    const f = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    o.type = 'sawtooth';
    o2.type = 'triangle';
    o.frequency.value = 42;
    o2.frequency.value = 63;
    f.type = 'lowpass';
    f.frequency.value = 190;
    f.Q.value = 2;
    g.gain.value = 0;
    o.connect(f); o2.connect(f); f.connect(g); g.connect(this.master);
    o.start(); o2.start();
    this.engine = { o, o2 };
    this.engineGain = g;
  }

  engineOn(on, speed = 1) {
    if (!this.engineGain || !this.ctx) return;
    this.engineGain.gain.setTargetAtTime(on ? 0.035 * speed : 0, this.ctx.currentTime, 0.12);
    if (this.engine) {
      this.engine.o.frequency.setTargetAtTime(40 + speed * 11, this.ctx.currentTime, 0.2);
      this.engine.o2.frequency.setTargetAtTime(61 + speed * 16, this.ctx.currentTime, 0.2);
    }
  }

  tone(freq, dur, type = 'square', vol = 0.08, slide = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  noiseBurst(dur = 0.12, vol = 0.12, freq = 900, q = 0.7) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    const f = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    src.buffer = this.noise;
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur + 0.02);
  }

  shot(weapon = 'pistol') {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    if (now - this.lastShot < 0.035) return;
    this.lastShot = now;
    if (weapon === 'shotgun') {
      this.noiseBurst(0.16, 0.16, 520, 0.6);
      this.tone(72, 0.12, 'sawtooth', 0.06, -30);
    } else if (weapon === 'rail') {
      this.tone(160, 0.3, 'sawtooth', 0.11, -110);
      this.noiseBurst(0.22, 0.1, 1600, 0.8);
    } else if (weapon === 'arc') {
      this.tone(900, 0.12, 'square', 0.05, 600);
      this.noiseBurst(0.09, 0.07, 2500, 1.2);
    } else if (weapon === 'flamer') {
      this.noiseBurst(0.08, 0.035, 330, 0.5);
    } else if (weapon === 'smg') {
      this.tone(145, 0.045, 'square', 0.035, -40);
      this.noiseBurst(0.04, 0.05, 1200, 0.8);
    } else {
      this.tone(115, 0.07, 'square', 0.055, -45);
      this.noiseBurst(0.055, 0.07, 1000, 0.8);
    }
  }

  hit() { this.noiseBurst(0.05, 0.035, 220, 0.8); }
  kill() {
    this.noiseBurst(0.12, 0.06, 160, 0.6);
    this.tone(65, 0.1, 'triangle', 0.04, -25);
  }
  hurt() {
    this.tone(90, 0.25, 'sawtooth', 0.12, -55);
    this.noiseBurst(0.2, 0.12, 240, 0.5);
  }
  explode() {
    this.noiseBurst(0.5, 0.24, 90, 0.4);
    this.tone(48, 0.45, 'sine', 0.16, -25);
  }
  pickup() {
    this.tone(720, 0.07, 'sine', 0.05, 240);
    setTimeout(() => this.tone(1080, 0.07, 'sine', 0.04, 200), 55);
  }
  buy() {
    this.tone(420, 0.07, 'square', 0.045, 100);
    setTimeout(() => this.tone(760, 0.1, 'square', 0.04, 140), 60);
  }
  deny() {
    this.tone(140, 0.12, 'square', 0.06, -30);
  }
  build() {
    this.tone(180, 0.08, 'square', 0.05, 90);
    setTimeout(() => this.noiseBurst(0.1, 0.06, 700, 0.8), 40);
  }
  wave() {
    this.tone(220, 0.18, 'sawtooth', 0.07, 80);
    setTimeout(() => this.tone(330, 0.3, 'sawtooth', 0.06, 100), 150);
  }
  pulse() {
    this.tone(80, 0.6, 'sine', 0.16, 220);
    this.noiseBurst(0.4, 0.1, 300, 0.5);
  }
  win() {
    [330, 440, 550, 660].forEach((f, i) => setTimeout(() => this.tone(f, 0.35, 'triangle', 0.08, 40), i * 130));
  }
  lose() {
    [220, 180, 140, 90].forEach((f, i) => setTimeout(() => this.tone(f, 0.5, 'sawtooth', 0.08, -30), i * 160));
  }
}

export const sound = new Sound();
