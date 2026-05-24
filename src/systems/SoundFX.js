/* ========================================
   SOUND SYSTEM — Web Audio API SFX
   No external audio files needed!
   ======================================== */

const SoundFX = {
  ctx: null,

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {}
  },

  // Ensure AudioContext is resumed (iOS requires user gesture)
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  play(type) {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    this.resume();

    switch (type) {
      case 'jump': this._tone(400, 0.1, 'sine', 0.3, 600); break;
      case 'web': this._sweep(800, 200, 0.15, 'sawtooth', 0.15); break;
      case 'saber': this._sweep(200, 600, 0.2, 'sawtooth', 0.2); break;
      case 'hit': this._noise(0.1, 0.4); break;
      case 'hurt': this._tone(200, 0.3, 'square', 0.2, 100); break;
      case 'collect': this._tone(800, 0.08, 'sine', 0.2, 1200); break;
      case 'powerup': this._arpeggio([523, 659, 784, 1047], 0.12, 0.25); break;
      case 'levelup': this._arpeggio([523, 659, 784, 1047, 1318], 0.15, 0.3); break;
      case 'boss': this._tone(80, 0.5, 'sawtooth', 0.3, 60); break;
      case 'die': this._sweep(400, 80, 0.5, 'square', 0.25); break;
      case 'click': this._tone(600, 0.05, 'sine', 0.15); break;
      case 'unlock': this._arpeggio([392, 523, 659, 784, 1047], 0.1, 0.3); break;
      case 'star': this._arpeggio([784, 988, 1175], 0.15, 0.2); break;
    }
  },

  _tone(freq, dur, type, vol, endFreq) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (endFreq) osc.frequency.linearRampToValueAtTime(endFreq, ctx.currentTime + dur);
    gain.gain.setValueAtTime(vol || 0.2, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur);
  },

  _sweep(startFreq, endFreq, dur, type, vol) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + dur);
    gain.gain.setValueAtTime(vol || 0.15, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur);
  },

  _noise(dur, vol) {
    const ctx = this.ctx;
    const bufferSize = ctx.sampleRate * dur;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol || 0.3, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime);
  },

  _arpeggio(freqs, noteDur, vol) {
    freqs.forEach((freq, i) => {
      const delay = i * noteDur * 0.8;
      setTimeout(() => this._tone(freq, noteDur, 'sine', vol), delay * 1000);
    });
  },
};
