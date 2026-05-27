/* ========================================
   MUSIC SYSTEM — Procedural Chiptune BGM
   Web Audio API — No external files!
   ======================================== */

const MusicSystem = {
  ctx: null,
  masterGain: null,
  currentTrack: null,
  isPlaying: false,
  isMuted: false,
  _intervals: [],
  _oscillators: [],
  _volume: 0.18,

  init() {
    if (this.ctx) return;
    try {
      this.ctx = SoundFX.ctx || new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._volume;
      this.masterGain.connect(this.ctx.destination);
      // Restore mute preference
      this.isMuted = localStorage.getItem('ChronoverseMusicMuted') === 'true';
      if (this.isMuted) this.masterGain.gain.value = 0;
    } catch (e) {
      console.log('[Music] Init failed:', e);
    }
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  // ── Toggle On/Off ──
  toggle() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('ChronoverseMusicMuted', this.isMuted);
    if (this.masterGain) {
      this.masterGain.gain.linearRampToValueAtTime(
        this.isMuted ? 0 : this._volume,
        this.ctx.currentTime + 0.3
      );
    }
    this._updateToggleUI();
    return !this.isMuted;
  },

  _updateToggleUI() {
    const btn = document.getElementById('music-toggle-btn');
    if (btn) {
      btn.style.display = 'flex';
      btn.innerText = this.isMuted ? '🔇' : '🎵';
      btn.title = this.isMuted ? 'Music: OFF' : 'Music: ON';
      btn.style.opacity = this.isMuted ? '0.4' : '1';
    }
  },

  // ── Stop all music ──
  stop() {
    this._intervals.forEach(id => clearInterval(id));
    this._intervals = [];
    this._oscillators.forEach(osc => {
      try { osc.stop(); } catch(e) {}
    });
    this._oscillators = [];
    this.isPlaying = false;
    this.currentTrack = null;
  },

  // ── Play a named track ──
  play(trackName) {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    this.resume();

    // Don't restart the same track
    if (this.currentTrack === trackName && this.isPlaying) return;

    this.stop();
    this.currentTrack = trackName;
    this.isPlaying = true;

    switch (trackName) {
      case 'menu':      this._playMenuTrack(); break;
      case 'gameplay':   this._playGameplayTrack(); break;
      case 'boss':       this._playBossTrack(); break;
      case 'victory':    this._playVictoryTrack(); break;
      case 'hub':        this._playHubTrack(); break;
      default:           this._playMenuTrack(); break;
    }
  },

  // ── Helper: schedule a note ──
  _note(freq, startTime, duration, type, vol) {
    if (!this.ctx || !this.masterGain) return null;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(vol || 0.12, startTime);
    gain.gain.linearRampToValueAtTime(0.01, startTime + duration * 0.9);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration);
    this._oscillators.push(osc);
    return osc;
  },

  // ── Helper: bass drum ──
  _kick(startTime) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, startTime);
    osc.frequency.exponentialRampToValueAtTime(40, startTime + 0.15);
    gain.gain.setValueAtTime(0.35, startTime);
    gain.gain.linearRampToValueAtTime(0, startTime + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(startTime);
    osc.stop(startTime + 0.2);
    this._oscillators.push(osc);
  },

  // ── Helper: hi-hat (noise) ──
  _hihat(startTime) {
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 8000;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, startTime);
    gain.gain.linearRampToValueAtTime(0, startTime + 0.05);
    source.connect(hp);
    hp.connect(gain);
    gain.connect(this.masterGain);
    source.start(startTime);
  },

  // ──────────────────────────────────
  //  TRACK: MENU — Dreamy, atmospheric
  // ──────────────────────────────────
  _playMenuTrack() {
    const bpm = 80;
    const beatDur = 60 / bpm;
    // Pentatonic melody in C minor, dreamy feel
    const melody = [
      523, 0, 392, 0, 523, 587, 0, 784,
      698, 0, 523, 0, 392, 0, 349, 0,
      523, 0, 587, 0, 698, 784, 0, 698,
      587, 0, 523, 0, 392, 0, 0, 0
    ];
    const bass = [
      131, 131, 131, 131, 175, 175, 175, 175,
      156, 156, 156, 156, 131, 131, 131, 131,
      131, 131, 131, 131, 175, 175, 175, 175,
      156, 156, 156, 156, 131, 131, 131, 131
    ];

    let step = 0;
    const loop = () => {
      if (!this.isPlaying || this.currentTrack !== 'menu') return;
      const now = this.ctx.currentTime;
      // Play 4 beats ahead
      for (let i = 0; i < 4; i++) {
        const idx = (step + i) % melody.length;
        const t = now + i * beatDur;
        // Melody
        if (melody[idx] > 0) {
          this._note(melody[idx], t, beatDur * 0.8, 'sine', 0.07);
        }
        // Pad (chord tone, octave down)
        if (bass[idx] > 0) {
          this._note(bass[idx], t, beatDur * 1.5, 'triangle', 0.06);
        }
      }
      step = (step + 4) % melody.length;
    };

    loop();
    const id = setInterval(loop, beatDur * 4 * 1000);
    this._intervals.push(id);
  },

  // ──────────────────────────────────
  //  TRACK: HUB — Upbeat, adventurous
  // ──────────────────────────────────
  _playHubTrack() {
    const bpm = 120;
    const beatDur = 60 / bpm;
    // Heroic melody
    const melody = [
      523, 587, 659, 784, 880, 784, 659, 523,
      587, 659, 784, 880, 988, 880, 784, 659,
      523, 0, 659, 0, 784, 0, 988, 880,
      784, 659, 523, 0, 440, 523, 587, 0
    ];
    const bass = [
      131, 0, 131, 0, 175, 0, 175, 0,
      196, 0, 196, 0, 220, 0, 175, 0,
      131, 0, 131, 0, 175, 0, 175, 0,
      196, 0, 196, 0, 131, 0, 131, 0
    ];

    let step = 0;
    const loop = () => {
      if (!this.isPlaying || this.currentTrack !== 'hub') return;
      const now = this.ctx.currentTime;
      for (let i = 0; i < 8; i++) {
        const idx = (step + i) % melody.length;
        const t = now + i * beatDur;
        if (melody[idx] > 0) {
          this._note(melody[idx], t, beatDur * 0.6, 'square', 0.06);
        }
        if (bass[idx] > 0) {
          this._note(bass[idx], t, beatDur * 0.9, 'triangle', 0.08);
        }
        // Drums
        if (i % 2 === 0) this._kick(t);
        if (i % 2 === 1) this._hihat(t);
      }
      step = (step + 8) % melody.length;
    };

    loop();
    const id = setInterval(loop, beatDur * 8 * 1000);
    this._intervals.push(id);
  },

  // ──────────────────────────────────
  //  TRACK: GAMEPLAY — Fast, energetic
  // ──────────────────────────────────
  _playGameplayTrack() {
    const bpm = 140;
    const beatDur = 60 / bpm;
    // Fast action melody
    const melody = [
      659, 784, 880, 784, 659, 587, 523, 587,
      659, 784, 988, 880, 784, 659, 587, 523,
      440, 523, 587, 659, 784, 880, 784, 659,
      587, 523, 440, 392, 440, 523, 587, 659
    ];
    const bass = [
      165, 0, 165, 0, 196, 0, 196, 0,
      220, 0, 220, 0, 196, 0, 165, 0,
      131, 0, 131, 0, 165, 0, 165, 0,
      196, 0, 196, 0, 165, 0, 165, 0
    ];
    const arp = [
      330, 392, 330, 440, 392, 330, 440, 392,
      330, 392, 440, 523, 440, 392, 330, 392,
      262, 330, 262, 392, 330, 262, 392, 330,
      330, 392, 330, 440, 330, 392, 330, 392
    ];

    let step = 0;
    const loop = () => {
      if (!this.isPlaying || this.currentTrack !== 'gameplay') return;
      const now = this.ctx.currentTime;
      for (let i = 0; i < 8; i++) {
        const idx = (step + i) % melody.length;
        const t = now + i * beatDur;
        // Lead melody
        if (melody[idx] > 0) {
          this._note(melody[idx], t, beatDur * 0.5, 'square', 0.05);
        }
        // Bass
        if (bass[idx] > 0) {
          this._note(bass[idx], t, beatDur * 0.8, 'triangle', 0.1);
        }
        // Arpeggio layer
        if (arp[idx] > 0) {
          this._note(arp[idx], t, beatDur * 0.3, 'sawtooth', 0.025);
        }
        // Drum pattern
        if (i % 2 === 0) this._kick(t);
        this._hihat(t);
      }
      step = (step + 8) % melody.length;
    };

    loop();
    const id = setInterval(loop, beatDur * 8 * 1000);
    this._intervals.push(id);
  },

  // ──────────────────────────────────
  //  TRACK: BOSS — Dark, intense
  // ──────────────────────────────────
  _playBossTrack() {
    const bpm = 160;
    const beatDur = 60 / bpm;
    // Minor key, aggressive
    const melody = [
      330, 392, 440, 466, 440, 392, 330, 294,
      330, 392, 440, 523, 494, 440, 392, 330,
      262, 294, 330, 392, 440, 466, 440, 392,
      330, 294, 262, 247, 262, 294, 330, 0
    ];
    const bass = [
      110, 0, 110, 110, 0, 110, 110, 0,
      131, 0, 131, 131, 0, 131, 131, 0,
      110, 0, 110, 110, 0, 110, 110, 0,
      98, 0, 98, 98, 0, 110, 110, 0
    ];

    let step = 0;
    const loop = () => {
      if (!this.isPlaying || this.currentTrack !== 'boss') return;
      const now = this.ctx.currentTime;
      for (let i = 0; i < 8; i++) {
        const idx = (step + i) % melody.length;
        const t = now + i * beatDur;
        if (melody[idx] > 0) {
          this._note(melody[idx], t, beatDur * 0.4, 'sawtooth', 0.05);
        }
        if (bass[idx] > 0) {
          this._note(bass[idx], t, beatDur * 0.7, 'square', 0.08);
        }
        // Heavy drums
        this._kick(t);
        if (i % 2 === 1) this._hihat(t);
      }
      step = (step + 8) % melody.length;
    };

    loop();
    const id = setInterval(loop, beatDur * 8 * 1000);
    this._intervals.push(id);
  },

  // ──────────────────────────────────
  //  TRACK: VICTORY — Triumphant
  // ──────────────────────────────────
  _playVictoryTrack() {
    const bpm = 100;
    const beatDur = 60 / bpm;
    // Major key fanfare
    const melody = [
      523, 659, 784, 1047, 0, 988, 880, 784,
      659, 784, 880, 1047, 0, 0, 0, 0,
      523, 659, 784, 1047, 1175, 1319, 1175, 1047,
      880, 784, 659, 523, 0, 0, 0, 0
    ];

    let step = 0;
    const playOnce = () => {
      if (!this.isPlaying || this.currentTrack !== 'victory') return;
      const now = this.ctx.currentTime;
      for (let i = 0; i < melody.length; i++) {
        const t = now + i * beatDur * 0.5;
        if (melody[i] > 0) {
          this._note(melody[i], t, beatDur * 0.4, 'sine', 0.09);
          this._note(melody[i] * 0.5, t, beatDur * 0.6, 'triangle', 0.06);
        }
        if (i % 4 === 0) this._kick(t);
      }
    };
    playOnce();
    // Loop victory every ~8 seconds
    const id = setInterval(playOnce, melody.length * beatDur * 0.5 * 1000);
    this._intervals.push(id);
  }
};
