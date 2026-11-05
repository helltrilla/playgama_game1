// Sound playback of pre-recorded CC0 samples (ogg) through WebAudio + ONE volume controller.
export type SfxName = 'coin' | 'big' | 'buy' | 'unlock' | 'click' | 'error';

const SFX_FILES: Record<string, string> = {
  coin0: 'coin_0',
  coin1: 'coin_1',
  coin2: 'coin_2',
  coin3: 'coin_3',
  coin4: 'coin_4',
  big: 'big',
  buy: 'buy',
  unlock: 'unlock',
  click: 'click',
  error: 'error',
  m0: 'music_0',
  m1: 'music_1',
  m2: 'music_2',
  m3: 'music_3',
};

export interface VolumeFlags {
  manualMute: boolean;
  platformMuted: boolean; // bridge.platform.isAudioEnabled === false
  paused: boolean; // game paused (hidden tab, platform pause, fullscreen ad)
  ad: boolean; // ad is playing
}

export class AudioController {
  flags: VolumeFlags = { manualMute: false, platformMuted: false, paused: false, ad: false };
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private raw = new Map<string, ArrayBuffer>();
  private unlocked = false;
  private lastCoin = 0;
  private lastSfx: Record<string, number> = {};
  private musicTimer: number | undefined;
  private musicIdx = 0;
  private musicSrc: AudioBufferSourceNode | null = null;
  private listeners: (() => void)[] = [];

  /** Fetches the sound files (no decoding yet: AudioContext needs a user gesture on some browsers). */
  async preload(onProgress: (done: number, total: number) => void): Promise<void> {
    const entries = Object.entries(SFX_FILES);
    let done = 0;
    await Promise.all(
      entries.map(async ([key, file]) => {
        try {
          const r = await fetch(`./audio/${file}.ogg`);
          if (r.ok) this.raw.set(key, await r.arrayBuffer());
        } catch {
          /* missing sound is not fatal */
        }
        onProgress(++done, entries.length);
      }),
    );
    this.ensureCtx();
  }

  get audible(): boolean {
    const f = this.flags;
    return !(f.manualMute || f.platformMuted || f.paused || f.ad);
  }

  onChange(cb: () => void): void {
    this.listeners.push(cb);
  }

  private ensureCtx(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.5;
      this.musicGain.gain.value = 0.2;
      if (typeof this.ctx.createDynamicsCompressor === 'function') {
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.value = -18;
        comp.knee.value = 12;
        comp.ratio.value = 8;
        comp.attack.value = 0.003;
        comp.release.value = 0.15;
        this.sfxGain.connect(comp);
        comp.connect(this.master);
      } else {
        this.sfxGain.connect(this.master);
      }
      this.musicGain.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.decodeAll();
      return this.ctx;
    } catch {
      return null;
    }
  }

  private decodeAll(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    this.raw.forEach((data, key) => {
      ctx.decodeAudioData(
        data.slice(0),
        (buf) => this.buffers.set(key, buf),
        () => undefined,
      );
    });
  }

  /** Call from the first pointer gesture. */
  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    this.ensureCtx();
    this.apply();
    this.scheduleMusic(4000);
  }

  apply(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) {
      this.listeners.forEach((l) => l());
      return;
    }
    const on = this.audible;
    this.master.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.02);
    if (on) {
      if (ctx.state === 'suspended' && this.unlocked) void ctx.resume().catch(() => undefined);
    } else {
      // keep context alive briefly so the fade completes, then suspend to save battery
      window.setTimeout(() => {
        if (!this.audible && this.ctx && this.ctx.state === 'running')
          void this.ctx.suspend().catch(() => undefined);
      }, 120);
    }
    this.listeners.forEach((l) => l());
  }

  set(flag: keyof VolumeFlags, value: boolean): void {
    if (this.flags[flag] === value) return;
    this.flags[flag] = value;
    this.apply();
  }

  private play(key: string, rate = 1, gain = 1, dest: AudioNode | null = this.sfxGain): void {
    const ctx = this.ctx;
    const buf = this.buffers.get(key);
    if (!ctx || !buf || !dest || !this.audible) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    if (gain !== 1) {
      const g = ctx.createGain();
      g.gain.value = gain;
      src.connect(g);
      g.connect(dest);
    } else {
      src.connect(dest);
    }
    src.start();
  }

  coin(kind: number): void {
    const now = performance.now();
    if (now - this.lastCoin < 110) return; // soft rate limit so rapid coin tosses never stack loudly
    this.lastCoin = now;
    const i = (Math.random() * 5) | 0;
    const base = kind === 2 ? 0.85 : kind === 1 ? 1.08 : 0.96;
    this.play('coin' + i, base * (0.92 + Math.random() * 0.18), kind ? 0.48 : 0.34);
  }

  sfx(name: Exclude<SfxName, 'coin'>, rate = 1): void {
    const now = performance.now();
    const minGap = name === 'big' ? 320 : name === 'unlock' ? 380 : 55;
    if (now - (this.lastSfx[name] ?? 0) < minGap) return;
    this.lastSfx[name] = now;
    const gain = name === 'big' ? 0.35 : name === 'click' ? 0.42 : name === 'unlock' ? 0.48 : 0.55;
    this.play(name, rate, gain);
  }

  // Soft ambient music: short CC0 steel-drum motifs with long pauses.
  private scheduleMusic(delay: number): void {
    window.clearTimeout(this.musicTimer);
    this.musicTimer = window.setTimeout(() => {
      if (this.audible && this.musicGain) {
        const key = 'm' + (this.musicIdx++ % 4);
        const buf = this.buffers.get(key);
        if (buf && this.ctx) {
          this.musicSrc = this.ctx.createBufferSource();
          this.musicSrc.buffer = buf;
          this.musicSrc.connect(this.musicGain);
          this.musicSrc.start();
        }
      }
      this.scheduleMusic(16000 + Math.random() * 14000);
    }, delay);
  }
}

export const audio = new AudioController();
