import * as THREE from 'three';

const clamp01 = v => Math.max(0, Math.min(1, v));
const smooth = (a,b,t) => a + (b-a) * (1-Math.exp(-t));

export class AnimationGraph {
  constructor({ root, clips = {}, terrainHeight, terrainNormal }) {
    this.root = root;
    this.mixer = new THREE.AnimationMixer(root);
    this.actions = new Map();
    this.state = 'idle';
    this.previousState = null;
    this.speed = 0;
    this.angularSpeed = 0;
    this.grounded = true;
    this.combat = false;
    this.rootMotion = new THREE.Vector3();
    this.lastRootPosition = new THREE.Vector3();
    this.motionMatcher = new MotionMatcher();
    this.ik = new FootIK({ root, terrainHeight, terrainNormal });
    for (const [name, clip] of Object.entries(clips)) this.addClip(name, clip);
  }

  addClip(name, clip) {
    const action = this.mixer.clipAction(clip);
    action.enabled = true;
    action.clampWhenFinished = true;
    this.actions.set(name, action);
    this.motionMatcher.ingest(name, clip);
  }

  setLocomotion({ speed, angularSpeed = 0, grounded = true, combat = false }) {
    this.speed = speed;
    this.angularSpeed = angularSpeed;
    this.grounded = grounded;
    this.combat = combat;
  }

  trigger(name, { fade = 0.08, loop = false } = {}) {
    const action = this.actions.get(name);
    if (!action) return false;
    this.#transition(name, fade, loop ? THREE.LoopRepeat : THREE.LoopOnce);
    return true;
  }

  update(dt, desiredVelocity = new THREE.Vector3(), facing = new THREE.Vector3(0,0,-1)) {
    const forced = ['attack','hit','dodge','death'].includes(this.state) && this.actions.get(this.state)?.isRunning();
    if (!forced) {
      const next = this.motionMatcher.choose({ speed: this.speed, angularSpeed: this.angularSpeed, grounded: this.grounded, combat: this.combat, desiredVelocity, facing });
      if (next && next !== this.state) this.#transition(next, 0.14, THREE.LoopRepeat);
    }

    const hip = this.#findBone(['Hips','hips','Root','root']);
    if (hip) this.lastRootPosition.copy(hip.position);
    this.mixer.update(dt);
    if (hip) {
      this.rootMotion.copy(hip.position).sub(this.lastRootPosition);
      hip.position.x -= this.rootMotion.x;
      hip.position.z -= this.rootMotion.z;
    } else this.rootMotion.set(0,0,0);
    this.ik.update(dt);
    return this.rootMotion;
  }

  #transition(name, fade, loop) {
    const next = this.actions.get(name);
    if (!next) return;
    const prev = this.actions.get(this.state);
    if (prev && prev !== next) prev.fadeOut(fade);
    next.reset().setLoop(loop, loop === THREE.LoopOnce ? 1 : Infinity).fadeIn(fade).play();
    this.previousState = this.state;
    this.state = name;
  }

  #findBone(names) {
    let found = null;
    this.root.traverse(o => { if (!found && o.isBone && names.includes(o.name)) found = o; });
    return found;
  }
}

export class MotionMatcher {
  constructor() { this.samples = []; }
  ingest(name, clip) {
    const lower = name.toLowerCase();
    const tags = {
      grounded: !lower.includes('jump') && !lower.includes('fall'),
      combat: lower.includes('combat') || lower.includes('strafe'),
      speed: lower.includes('sprint') ? 8 : lower.includes('run') ? 5 : lower.includes('walk') ? 2.1 : 0,
      angularSpeed: lower.includes('turn') ? 2.2 : 0
    };
    this.samples.push({ name, clip, ...tags });
  }
  choose(query) {
    if (!this.samples.length) return query.speed > 4.5 ? 'run' : query.speed > 0.35 ? 'walk' : 'idle';
    let best = null, bestCost = Infinity;
    for (const s of this.samples) {
      let cost = Math.abs(s.speed - query.speed) * 1.2 + Math.abs(s.angularSpeed - Math.abs(query.angularSpeed)) * 0.35;
      if (s.grounded !== query.grounded) cost += 8;
      if (query.combat && s.combat) cost -= 0.5;
      if (!query.combat && s.combat) cost += 1;
      if (cost < bestCost) { bestCost = cost; best = s; }
    }
    return best?.name;
  }
}

export class FootIK {
  constructor({ root, terrainHeight, terrainNormal }) {
    this.root = root;
    this.height = terrainHeight;
    this.normal = terrainNormal;
    this.left = this.#find(['LeftFoot','foot_l','mixamorigLeftFoot']);
    this.right = this.#find(['RightFoot','foot_r','mixamorigRightFoot']);
    this.hips = this.#find(['Hips','hips','mixamorigHips']);
    this.rayOrigin = new THREE.Vector3();
    this.world = new THREE.Vector3();
    this.q = new THREE.Quaternion();
    this.up = new THREE.Vector3(0,1,0);
    this.n = new THREE.Vector3(0,1,0);
  }
  update(dt) {
    if (!this.height || (!this.left && !this.right)) return;
    const offsets = [];
    for (const foot of [this.left, this.right]) {
      if (!foot) continue;
      foot.getWorldPosition(this.world);
      const h = this.height(this.world.x, this.world.z);
      const delta = THREE.MathUtils.clamp(h - this.world.y + 0.04, -0.22, 0.42);
      offsets.push(delta);
      foot.position.y = smooth(foot.position.y, foot.position.y + delta, dt * 18);
      if (this.normal) {
        this.normal(this.world.x, this.world.z, this.n);
        this.q.setFromUnitVectors(this.up, this.n);
        foot.quaternion.slerp(this.q, clamp01(dt * 10));
      }
    }
    if (this.hips && offsets.length) {
      const lowest = Math.min(...offsets, 0);
      this.hips.position.y = smooth(this.hips.position.y, this.hips.position.y + lowest * 0.5, dt * 12);
    }
  }
  #find(names) {
    let found = null;
    this.root.traverse(o => { if (!found && (o.isBone || o.isObject3D) && names.includes(o.name)) found = o; });
    return found;
  }
}

export function authorEnemyClips(rig) {
  const times = [0, .18, .36, .62, .9];
  const tracks = [];
  const spine = rig.getObjectByName('EnemySpine');
  const arm = rig.getObjectByName('EnemyArmR');
  if (spine) tracks.push(new THREE.QuaternionKeyframeTrack(`${spine.name}.quaternion`, times, quatSeries([[0,0,0],[.08,0,0],[-.12,0,0],[.06,0,0],[0,0,0]])));
  if (arm) tracks.push(new THREE.QuaternionKeyframeTrack(`${arm.name}.quaternion`, times, quatSeries([[0,0,-.25],[-.4,.1,-.7],[.7,-.2,.6],[.15,0,-.2],[0,0,-.25]])));
  return {
    enemyAttack: new THREE.AnimationClip('enemyAttack', .9, tracks),
    enemyIdle: new THREE.AnimationClip('enemyIdle', 1.6, spine ? [new THREE.QuaternionKeyframeTrack(`${spine.name}.quaternion`, [0,.8,1.6], quatSeries([[0,0,0],[.04,0,.025],[0,0,0]]))] : [])
  };
}

function quatSeries(eulers) {
  const out=[];
  for(const [x,y,z] of eulers){ const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z)); out.push(q.x,q.y,q.z,q.w); }
  return out;
}
