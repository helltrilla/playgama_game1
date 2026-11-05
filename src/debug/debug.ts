import type { GameEngine } from '../core/game';
import type { GameScene } from '../scene/scene';
import type { AudioController } from '../audio/audio';
import type { Platform } from '../platform/platform';

export interface DebugApi {
  addGold(n: number | string | bigint): void;
  setTable(id: string): void;
  reset(): Promise<void>;
  getState(): unknown;
  step(ms: number): void;
  getStats(): unknown;
  flush(): Promise<boolean>;
}

declare global {
  interface Window {
    __game?: DebugApi;
    __DEBUG__?: boolean;
  }
}

export function setupDebug(
  engine: GameEngine,
  scene: GameScene,
  _audio: AudioController,
  _platform: Platform,
  onReset: () => Promise<void>,
): void {
  const isDebugUrl =
    typeof window !== 'undefined' &&
    (window.location.search.includes('debug') ||
      window.location.search.includes('test') ||
      Boolean(window.__DEBUG__));

  // Expose __game debug API for testing & manual debugging
  window.__game = {
    addGold(n: number | string | bigint) {
      const val = typeof n === 'bigint' ? n : BigInt(n);
      engine.addGold(val, 'debug');
    },
    setTable(id: string) {
      if (!engine.isTableUnlocked(id)) {
        engine.state.unlocked.push(id);
      }
      engine.setActiveTable(id);
    },
    async reset() {
      await onReset();
    },
    getState() {
      return JSON.parse(
        JSON.stringify(engine.state, (_, v) => (typeof v === 'bigint' ? v.toString() : v)),
      );
    },
    step(ms: number) {
      engine.step(ms / 1000);
    },
    getStats() {
      return {
        ...engine.state.stats,
        fps: Math.round(fps),
        drawCalls: scene.renderer.info.render.calls,
        triangles: scene.renderer.info.render.triangles,
      };
    },
    flush() {
      return engine.save.flush();
    },
  };

  if (!isDebugUrl) return;

  // Lightweight FPS & Draw calls overlay
  const overlay = document.createElement('div');
  overlay.id = 'debug-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '84px';
  overlay.style.left = '12px';
  overlay.style.padding = '4px 8px';
  overlay.style.background = 'rgba(0, 0, 0, 0.8)';
  overlay.style.color = '#00ff88';
  overlay.style.fontFamily = 'monospace';
  overlay.style.fontSize = '12px';
  overlay.style.zIndex = '9999';
  overlay.style.pointerEvents = 'none';
  overlay.style.borderRadius = '4px';
  document.body.appendChild(overlay);

  let frameCount = 0;
  let lastTime = performance.now();
  let fps = 60;

  function updateDebugFps(): void {
    frameCount++;
    const now = performance.now();
    if (now - lastTime >= 1000) {
      fps = (frameCount * 1000) / (now - lastTime);
      frameCount = 0;
      lastTime = now;

      overlay.textContent = `FPS: ${Math.round(fps)} | Calls: ${scene.renderer.info.render.calls} | Tris: ${scene.renderer.info.render.triangles} | Coins: ${scene.coinSystem.activeCount}`;
    }
    requestAnimationFrame(updateDebugFps);
  }

  requestAnimationFrame(updateDebugFps);
}
