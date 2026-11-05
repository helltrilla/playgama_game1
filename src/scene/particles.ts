import * as THREE from 'three';

export const MAX_PARTICLES = 60;

interface Sparkle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
}

export class ParticleSystem {
  readonly points: THREE.Points;
  private readonly sparkles: Sparkle[] = [];
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly geo: THREE.BufferGeometry;

  constructor() {
    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 3);

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.sparkles.push({
        active: false,
        x: 0,
        y: -100,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.6,
        size: 0.1,
      });
      this.positions[i * 3 + 1] = -100;
    }

    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geo, mat);
  }

  burst(x: number, y: number, z: number, color: THREE.Color, count = 12): void {
    let spawned = 0;
    for (let i = 0; i < MAX_PARTICLES && spawned < count; i++) {
      const s = this.sparkles[i];
      if (s.active) continue;

      s.active = true;
      s.x = x;
      s.y = y + 0.1;
      s.z = z;

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 2.2;
      s.vx = Math.cos(angle) * speed * 0.6;
      s.vy = 1.5 + Math.random() * 2.0;
      s.vz = Math.sin(angle) * speed * 0.6;
      s.life = 0;
      s.maxLife = 0.4 + Math.random() * 0.4;

      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;

      spawned++;
    }
    this.geo.attributes.color.needsUpdate = true;
  }

  update(dt: number): void {
    const pos = this.geo.attributes.position;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const s = this.sparkles[i];
      if (!s.active) continue;

      s.life += dt;
      if (s.life >= s.maxLife) {
        s.active = false;
        this.positions[i * 3 + 1] = -100;
        continue;
      }

      s.vy -= 9.8 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;

      this.positions[i * 3] = s.x;
      this.positions[i * 3 + 1] = s.y;
      this.positions[i * 3 + 2] = s.z;
    }
    pos.needsUpdate = true;
  }
}
