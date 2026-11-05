import * as THREE from 'three';
import { TABLES, type TableDef, type WoodKind } from '../data/tables';

export interface TableMaterials {
  felt: THREE.MeshStandardMaterial;
  frame: THREE.MeshStandardMaterial;
  trim: THREE.MeshStandardMaterial;
}

function createFeltBumpMap(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  // Subtle woven baize pattern
  for (let y = 0; y < size; y += 2) {
    for (let x = 0; x < size; x += 2) {
      const v = 118 + (((x * 13 + y * 29) % 19) - 9);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 10);
  return tex;
}

function createFrameBumpMap(kind: WoodKind): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  if (kind === 'marble') {
    ctx.strokeStyle = '#969696';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(0, (i * 23) % size);
      ctx.bezierCurveTo(
        40,
        ((i + 1) * 31) % size,
        88,
        (i * 17) % size,
        size,
        ((i + 2) * 29) % size,
      );
      ctx.stroke();
    }
  } else {
    // Wood grain lines
    for (let y = 0; y < size; y++) {
      const v = 120 + Math.round(Math.sin(y * 0.35) * 10 + Math.cos(y * 1.1) * 5);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(0, y, size, 1);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

function createFeltColorMap(def: TableDef): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const w = 512;
  const h = 320;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const baseCol = new THREE.Color(def.materials.felt.color);
  const brightCol = baseCol.clone().multiplyScalar(1.26);
  const darkCol = baseCol.clone().multiplyScalar(0.68);
  const trimCol = new THREE.Color(def.materials.trim.color);
  const trimHex = `#${trimCol.getHexString()}`;

  // 1. Rich radial velvet gradient
  const grad = ctx.createRadialGradient(w / 2, h / 2, 24, w / 2, h / 2, w * 0.56);
  grad.addColorStop(0, `#${brightCol.getHexString()}`);
  grad.addColorStop(0.65, `#${baseCol.getHexString()}`);
  grad.addColorStop(1, `#${darkCol.getHexString()}`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // 2. Outer double filigree border line on the felt
  ctx.save();
  ctx.strokeStyle = trimHex;
  ctx.globalAlpha = 0.38;
  ctx.lineWidth = 3;
  ctx.strokeRect(22, 20, w - 44, h - 40);

  ctx.globalAlpha = 0.22;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(30, 28, w - 60, h - 56);

  // 3. Corner diamond flourishes
  const corners = [
    [30, 28],
    [w - 30, 28],
    [30, h - 28],
    [w - 30, h - 28],
  ];
  ctx.globalAlpha = 0.42;
  ctx.fillStyle = trimHex;
  for (const [cx, cy] of corners) {
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Center watermark rosette & royal ring
  const cx = w / 2;
  const cy = h / 2;
  ctx.globalAlpha = 0.16;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 66, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 52, 0, Math.PI * 2);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 8-pointed compass star watermark in the middle of the table
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const r = i % 2 === 0 ? 44 : 18;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const sharedFeltBump = createFeltBumpMap();

export function createTableMaterials(def: TableDef): TableMaterials {
  const m = def.materials;
  const feltMap = createFeltColorMap(def);
  const felt = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: feltMap,
    roughness: m.felt.roughness,
    metalness: 0.04,
    bumpMap: sharedFeltBump,
    bumpScale: 0.014,
  });
  if (!feltMap) {
    felt.color.setHex(m.felt.color);
  }

  const frameBump = createFrameBumpMap(m.frame.kind);
  const frame = new THREE.MeshStandardMaterial({
    color: m.frame.color,
    roughness: m.frame.roughness,
    metalness: m.frame.metalness,
    bumpMap: frameBump,
    bumpScale: m.frame.kind === 'marble' ? 0.01 : 0.022,
  });

  const trim = new THREE.MeshStandardMaterial({
    color: m.trim.color,
    roughness: m.trim.roughness,
    metalness: Math.min(0.88, m.trim.metalness),
  });

  return { felt, frame, trim };
}

export const ALL_TABLE_MATERIALS: Record<string, TableMaterials> = Object.fromEntries(
  TABLES.map((t) => [t.id, createTableMaterials(t)]),
);
