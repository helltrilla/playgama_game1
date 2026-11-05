import * as THREE from 'three';
import { formatBig } from '../core/bignum';

export interface FloatingTextManager {
  spawn(
    worldPos: THREE.Vector3,
    amount: bigint,
    kind?: 'normal' | 'lucky' | 'diamond' | 'edge',
    edgeMult?: number,
  ): void;
  update(): void;
  dispose(): void;
}

export function createFloatingTextManager(
  container: HTMLElement,
  camera: THREE.Camera,
  maxItems = 12,
): FloatingTextManager {
  interface PoolItem {
    el: HTMLElement;
    worldPos: THREE.Vector3;
    expiresAt: number;
    active: boolean;
  }

  const pool: PoolItem[] = [];
  for (let i = 0; i < maxItems; i++) {
    const el = document.createElement('div');
    el.className = 'floating-text';
    el.style.display = 'none';
    container.appendChild(el);
    pool.push({
      el,
      worldPos: new THREE.Vector3(),
      expiresAt: 0,
      active: false,
    });
  }

  const tempVec = new THREE.Vector3();
  let nextIdx = 0;
  let lastNormalSpawnAt = 0;

  function spawn(
    worldPos: THREE.Vector3,
    amount: bigint,
    kind: 'normal' | 'lucky' | 'diamond' | 'edge' = 'normal',
    edgeMult = 25,
  ): void {
    const now = performance.now();
    if (kind === 'normal' && now - lastNormalSpawnAt < 55) {
      return;
    }
    if (kind === 'normal') {
      lastNormalSpawnAt = now;
    }

    const item = pool[nextIdx];
    nextIdx = (nextIdx + 1) % maxItems;

    item.worldPos.copy(worldPos);
    item.expiresAt = now + (kind === 'edge' ? 850 : 580);
    item.active = true;

    item.el.className = `floating-text ${kind !== 'normal' ? kind : ''}`;
    item.el.textContent =
      kind === 'edge' ? `x${edgeMult}! +${formatBig(amount)}` : `+${formatBig(amount)}`;
    item.el.style.display = 'block';

    updateElementPosition(item);
  }

  function updateElementPosition(item: PoolItem): void {
    tempVec.copy(item.worldPos);
    tempVec.project(camera);

    const halfW = window.innerWidth * 0.5;
    const halfH = window.innerHeight * 0.5;
    const screenX = Math.round(tempVec.x * halfW + halfW);
    const screenY = Math.round(-tempVec.y * halfH + halfH);

    item.el.style.left = `${screenX}px`;
    item.el.style.top = `${screenY}px`;
  }

  function update(): void {
    const now = performance.now();
    for (let i = 0; i < maxItems; i++) {
      const item = pool[i];
      if (!item.active) continue;
      if (now >= item.expiresAt) {
        item.active = false;
        item.el.style.display = 'none';
        continue;
      }
      updateElementPosition(item);
    }
  }

  function dispose(): void {
    for (const item of pool) {
      item.active = false;
      item.el.remove();
    }
  }

  return {
    spawn,
    update,
    dispose,
  };
}
