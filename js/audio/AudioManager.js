/**
 * ============================================================
 * CYBER PORTFOLIO — F21: js/audio/AudioManager.js
 * ============================================================
 * Gestiona todos los efectos de audio del portfolio:
 * - Sonidos de UI (hover, click, transición)
 * - Música de fondo ambiental
 * - Síntesis procedural via Web Audio API (sin archivos externos)
 * - Control de volumen, mute y preferencias persistentes
 * ============================================================
 */

class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;

    this.isMuted = false;
    this.isInitialized = false;
    this.musicPlaying = false;
    this.musicNodes = {};

    this._volumes = {
      master: 0.6,
      sfx: 0.8,
      music: 0.25,
    };

    this._loadPreferences();
    this._bindAutoInit();
  }

  // ─────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────

  /**
   * Inicializa el AudioContext (requiere gesto de usuario).
   * Se llama automáticamente en el primer click/keydown.
   */
  init() {
    if (this.isInitialized) return;

    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();

      this.masterGain = this._createGain(this._volumes.master);
      this.sfxGain    = this._createGain(this._volumes.sfx);
      this.musicGain  = this._createGain(this._volumes.music);

      // Cadena: sfxGain → masterGain → destination
      //         musicGain → masterGain → destination
      this.sfxGain.connect(this.masterGain);
      this.musicGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      if (this.isMuted) this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.isInitialized = true;
      console.log('[AudioManager] Initialized');
    } catch (err) {
      console.warn('[AudioManager] Web Audio API not available:', err);
    }
  }

  // ─────────────────────────────────────────
  // SONIDOS UI (síntesis procedural)
  // ─────────────────────────────────────────

  /**
   * Sonido suave de hover — tick digital corto
   */
  playHover() {
    if (!this._ready()) return;
    this._synth({
      type: 'square',
      freq: [1200, 900],
      duration: 0.06,
      attack: 0.002,
      release: 0.04,
      gainPeak: 0.08,
      output: this.sfxGain,
    });
  }

  /**
   * Sonido de click — pulso con descenso de frecuencia
   */
  playClick() {
    if (!this._ready()) return;
    this._synth({
      type: 'sine',
      freq: [800, 300],
      duration: 0.12,
      attack: 0.003,
      release: 0.09,
      gainPeak: 0.18,
      output: this.sfxGain,
    });
  }

  /**
   * Sonido de transición de sección — sweep ascendente
   */
  playTransition() {
    if (!this._ready()) return;
    this._synth({
      type: 'sawtooth',
      freq: [200, 1800],
      duration: 0.35,
      attack: 0.01,
      release: 0.28,
      gainPeak: 0.12,
      output: this.sfxGain,
    });
    // Capa de ruido filtrado
    this._noise({
      filterFreq: 3000,
      duration: 0.35,
      gainPeak: 0.04,
      output: this.sfxGain,
    });
  }

  /**
   * Sonido de error / acceso denegado
   */
  playError() {
    if (!this._ready()) return;
    this._synth({
      type: 'sawtooth',
      freq: [220, 110],
      duration: 0.3,
      attack: 0.005,
      release: 0.25,
      gainPeak: 0.2,
      output: this.sfxGain,
    });
  }

  /**
   * Sonido de éxito / confirmación
   */
  playSuccess() {
    if (!this._ready()) return;
    const notes = [523, 659, 784]; // C5 E5 G5
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this._synth({
          type: 'sine',
          freq: [freq, freq * 1.01],
          duration: 0.18,
          attack: 0.005,
          release: 0.14,
          gainPeak: 0.14,
          output: this.sfxGain,
        });
      }, i * 80);
    });
  }

  /**
   * Efecto de tecleo (typewriter)
   */
  playType() {
    if (!this._ready()) return;
    const freqs = [1400, 1600, 1800, 1300];
    const f = freqs[Math.floor(Math.random() * freqs.length)];
    this._synth({
      type: 'square',
      freq: [f, f * 0.9],
      duration: 0.04,
      attack: 0.001,
      release: 0.03,
      gainPeak: 0.05,
      output: this.sfxGain,
    });
  }

  /**
   * Sonido de escaneo / glitch
   */
  playGlitch() {
    if (!this._ready()) return;
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        this._noise({
          filterFreq: 800 + Math.random() * 4000,
          duration: 0.05,
          gainPeak: 0.06 + Math.random() * 0.06,
          output: this.sfxGain,
        });
      }, i * 40);
    }
  }

  // ─────────────────────────────────────────
  // MÚSICA AMBIENTAL PROCEDURAL
  // ─────────────────────────────────────────

  /**
   * Inicia el drone ambiental cyberpunk en loop
   */
  startMusic() {
    if (!this._ready() || this.musicPlaying) return;
    this.musicPlaying = true;
    this._startDrone();
    this._startPulse();
    console.log('[AudioManager] Ambient music started');
  }

  /**
   * Detiene la música ambiental con fade out
   */
  stopMusic(fadeTime = 1.5) {
    if (!this.isInitialized || !this.musicPlaying) return;
    this.musicPlaying = false;

    const now = this.ctx.currentTime;
    this.musicGain.gain.linearRampToValueAtTime(0, now + fadeTime);

    setTimeout(() => {
      Object.values(this.musicNodes).forEach(node => {
        try { node.stop(); } catch (_) {}
      });
      this.musicNodes = {};
      this.musicGain.gain.setValueAtTime(this._volumes.music, this.ctx.currentTime);
    }, (fadeTime + 0.2) * 1000);
  }

  // ─────────────────────────────────────────
  // VOLUMEN Y MUTE
  // ─────────────────────────────────────────

  setMasterVolume(value) {
    this._volumes.master = Math.max(0, Math.min(1, value));
    if (this.isInitialized && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this._volumes.master, this.ctx.currentTime);
    }
    this._savePreferences();
  }

  setSfxVolume(value) {
    this._volumes.sfx = Math.max(0, Math.min(1, value));
    if (this.isInitialized) {
      this.sfxGain.gain.setValueAtTime(this._volumes.sfx, this.ctx.currentTime);
    }
    this._savePreferences();
  }

  setMusicVolume(value) {
    this._volumes.music = Math.max(0, Math.min(1, value));
    if (this.isInitialized) {
      this.musicGain.gain.setValueAtTime(this._volumes.music, this.ctx.currentTime);
    }
    this._savePreferences();
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isInitialized) {
      const target = this.isMuted ? 0 : this._volumes.master;
      this.masterGain.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 0.1);
    }
    this._savePreferences();
    return this.isMuted;
  }

  getMute()    { return this.isMuted; }
  getVolumes() { return { ...this._volumes }; }

  // ─────────────────────────────────────────
  // INTERNO — síntesis
  // ─────────────────────────────────────────

  _synth({ type, freq, duration, attack, release, gainPeak, output }) {
    const now  = this.ctx.currentTime;
    const osc  = this.ctx.createOscillator();
    const gain = this._createGain(0);

    osc.type = type;
    osc.frequency.setValueAtTime(freq[0], now);
    osc.frequency.linearRampToValueAtTime(freq[1], now + duration);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + attack);
    gain.gain.linearRampToValueAtTime(0, now + duration - release);

    osc.connect(gain);
    gain.connect(output);

    osc.start(now);
    osc.stop(now + duration);
  }

  _noise({ filterFreq, duration, gainPeak, output }) {
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const source  = this.ctx.createBufferSource();
    const filter  = this.ctx.createBiquadFilter();
    const gain    = this._createGain(0);
    const now     = this.ctx.currentTime;

    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 2;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.01);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(output);

    source.start(now);
    source.stop(now + duration);
  }

  _startDrone() {
    const freqs = [55, 82.5, 110]; // A1 E2 A2
    freqs.forEach((freq, i) => {
      const osc  = this.ctx.createOscillator();
      const gain = this._createGain(0.06 - i * 0.015);
      const lfo  = this.ctx.createOscillator();
      const lfoG = this._createGain(freq * 0.008);

      lfo.frequency.value = 0.1 + i * 0.07;
      lfo.connect(lfoG);
      lfoG.connect(osc.frequency);

      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(this.musicGain);

      lfo.start();
      osc.start();

      this.musicNodes[`drone_${i}`] = osc;
      this.musicNodes[`droneLfo_${i}`] = lfo;
    });
  }

  _startPulse() {
    const schedule = () => {
      if (!this.musicPlaying) return;

      const now    = this.ctx.currentTime;
      const osc    = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain   = this._createGain(0);

      osc.type = 'square';
      osc.frequency.value = [110, 165, 220][Math.floor(Math.random() * 3)];

      filter.type = 'lowpass';
      filter.frequency.value = 600;

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.07, now + 0.02);
      gain.gain.linearRampToValueAtTime(0, now + 0.18);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(now);
      osc.stop(now + 0.2);

      const interval = 1.2 + Math.random() * 2.4;
      setTimeout(schedule, interval * 1000);
    };
    setTimeout(schedule, 1000);
  }

  // ─────────────────────────────────────────
  // INTERNO — utilidades
  // ─────────────────────────────────────────

  _createGain(value) {
    const g = this.ctx.createGain();
    g.gain.value = value;
    return g;
  }

  _ready() {
    if (!this.isInitialized) this.init();
    return this.isInitialized && this.ctx.state !== 'closed';
  }

  _bindAutoInit() {
    const handler = () => {
      this.init();
      document.removeEventListener('click', handler);
      document.removeEventListener('keydown', handler);
    };
    document.addEventListener('click', handler, { once: true });
    document.addEventListener('keydown', handler, { once: true });
  }

  _savePreferences() {
    try {
      localStorage.setItem('cyber_audio', JSON.stringify({
        muted: this.isMuted,
        volumes: this._volumes,
      }));
    } catch (_) {}
  }

  _loadPreferences() {
    try {
      const saved = JSON.parse(localStorage.getItem('cyber_audio') || 'null');
      if (saved) {
        this.isMuted     = saved.muted   ?? false;
        this._volumes    = { ...this._volumes, ...saved.volumes };
      }
    } catch (_) {}
  }

  // ─────────────────────────────────────────
  // SUSPEND / RESUME (visibilidad de página)
  // ─────────────────────────────────────────

  suspend() {
    if (this.isInitialized && this.ctx.state === 'running') this.ctx.suspend();
  }

  resume() {
    if (this.isInitialized && this.ctx.state === 'suspended') this.ctx.resume();
  }

  /**
   * Destruye el AudioContext y libera recursos.
   */
  destroy() {
    this.stopMusic(0.1);
    setTimeout(() => {
      if (this.ctx) this.ctx.close();
      this.isInitialized = false;
    }, 300);
  }
}

// Singleton exportado para uso global
// Singleton global (usado por AppInit como window.audioManager)
window.audioManager = new AudioManager();
