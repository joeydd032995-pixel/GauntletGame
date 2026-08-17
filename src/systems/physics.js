import * as THREE from 'three';

const EPS = 1e-5;

export class PhysicsWorld {
  constructor({ terrainHeight, terrainNormal, gravity = -28 } = {}) {
    this.terrainHeight = terrainHeight;
    this.terrainNormal = terrainNormal;
    this.gravity = gravity;
    this.staticSpheres = [];
    this.staticBoxes = [];
  }

  addSphere(center, radius) {
    this.staticSpheres.push({ center: center.clone(), radius });
  }

  addBox(center, halfExtents) {
    this.staticBoxes.push({ center: center.clone(), halfExtents: halfExtents.clone() });
  }

  createCharacter(position, { radius = 0.42, height = 1.75, stepHeight = 0.42, slopeLimit = 0.72 } = {}) {
    return {
      position: position.clone(), velocity: new THREE.Vector3(), radius, height,
      stepHeight, slopeLimit, grounded: false, groundNormal: new THREE.Vector3(0, 1, 0),
      previousPosition: position.clone(), desiredVelocity: new THREE.Vector3()
    };
  }

  stepCharacter(body, dt) {
    body.previousPosition.copy(body.position);
    if (!body.grounded) body.velocity.y += this.gravity * dt;
    body.velocity.x = THREE.MathUtils.damp(body.velocity.x, body.desiredVelocity.x, body.grounded ? 18 : 5, dt);
    body.velocity.z = THREE.MathUtils.damp(body.velocity.z, body.desiredVelocity.z, body.grounded ? 18 : 5, dt);

    const delta = body.velocity.clone().multiplyScalar(dt);
    const substeps = Math.max(1, Math.ceil(delta.length() / Math.max(body.radius * 0.45, 0.1)));
    delta.multiplyScalar(1 / substeps);
    for (let i = 0; i < substeps; i++) {
      body.position.add(delta);
      this.#solveStatics(body);
      this.#solveTerrain(body);
    }
    return body.position.clone().sub(body.previousPosition);
  }

  #solveTerrain(body) {
    if (!this.terrainHeight) return;
    const ground = this.terrainHeight(body.position.x, body.position.z);
    const feet = body.position.y;
    const snapDistance = body.grounded ? body.stepHeight : 0.12;
    if (feet <= ground + snapDistance && body.velocity.y <= 1) {
      body.position.y = ground;
      if (body.velocity.y < 0) body.velocity.y = 0;
      body.grounded = true;
      if (this.terrainNormal) this.terrainNormal(body.position.x, body.position.z, body.groundNormal);
      else body.groundNormal.set(0, 1, 0);
      if (body.groundNormal.y < body.slopeLimit) {
        const downhill = new THREE.Vector3(body.groundNormal.x, 0, body.groundNormal.z).normalize();
        body.velocity.addScaledVector(downhill, Math.abs(this.gravity) * 0.12);
      }
    } else body.grounded = false;
  }

  #solveStatics(body) {
    const centerY = body.position.y + body.height * 0.5;
    const capsuleCenter = new THREE.Vector3(body.position.x, centerY, body.position.z);

    for (const s of this.staticSpheres) {
      const d = capsuleCenter.clone().sub(s.center);
      d.y = 0;
      const minDist = body.radius + s.radius;
      const len = d.length();
      if (len < minDist && len > EPS) {
        const push = (minDist - len) / len;
        body.position.x += d.x * push;
        body.position.z += d.z * push;
        const n = d.normalize();
        const vn = body.velocity.x * n.x + body.velocity.z * n.z;
        if (vn < 0) { body.velocity.x -= vn * n.x; body.velocity.z -= vn * n.z; }
      }
    }

    for (const b of this.staticBoxes) {
      const minX = b.center.x - b.halfExtents.x - body.radius;
      const maxX = b.center.x + b.halfExtents.x + body.radius;
      const minZ = b.center.z - b.halfExtents.z - body.radius;
      const maxZ = b.center.z + b.halfExtents.z + body.radius;
      if (body.position.x > minX && body.position.x < maxX && body.position.z > minZ && body.position.z < maxZ) {
        const px = Math.min(body.position.x - minX, maxX - body.position.x);
        const pz = Math.min(body.position.z - minZ, maxZ - body.position.z);
        if (px < pz) {
          body.position.x = body.position.x < b.center.x ? minX : maxX;
          body.velocity.x = 0;
        } else {
          body.position.z = body.position.z < b.center.z ? minZ : maxZ;
          body.velocity.z = 0;
        }
      }
    }
  }
}

export function terrainNormalFromHeight(heightFn, x, z, out = new THREE.Vector3(), sample = 0.18) {
  const l = heightFn(x - sample, z), r = heightFn(x + sample, z);
  const d = heightFn(x, z - sample), u = heightFn(x, z + sample);
  return out.set(l - r, sample * 2, d - u).normalize();
}
