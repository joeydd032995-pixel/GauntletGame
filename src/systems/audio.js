import * as THREE from 'three';

export class SpatialAudioSystem {
  constructor(camera) {
    this.camera = camera;
    this.listener = new THREE.AudioListener();
    camera.add(this.listener);
    this.ctx = this.listener.context;
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.7;
    this.master.connect(this.ctx.destination);
    this.music = this.ctx.createGain();
    this.ambience = this.ctx.createGain();
    this.combat = this.ctx.createGain();
    this.music.gain.value = 0.16;
    this.ambience.gain.value = 0.26;
    this.combat.gain.value = 0.8;
    this.music.connect(this.master); this.ambience.connect(this.master); this.combat.connect(this.master);
    this.started = false;
    this.sources = [];
    this.combatIntensity = 0;
  }

  async unlock() {
    if (this.ctx.state !== 'running') await this.ctx.resume();
    if (!this.started) { this.started = true; this.#startAmbience(); }
  }

  setCombatIntensity(value, dt = 0.016) {
    this.combatIntensity = THREE.MathUtils.damp(this.combatIntensity, THREE.MathUtils.clamp(value, 0, 1), 4.5, dt);
    const t = this.ctx.currentTime;
    this.music.gain.cancelScheduledValues(t);
    this.music.gain.linearRampToValueAtTime(0.14 + this.combatIntensity * 0.08, t + 0.08);
    this.ambience.gain.linearRampToValueAtTime(0.28 - this.combatIntensity * 0.1, t + 0.08);
  }

  playWhoosh(position, power = 1) {
    if (!this.started) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const noise = this.#noiseBuffer(.17);
    const src = this.ctx.createBufferSource(); src.buffer = noise;
    const filter = this.ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.setValueAtTime(1300, now); filter.frequency.exponentialRampToValueAtTime(280, now + .16); filter.Q.value = .75;
    const gain = this.ctx.createGain(); gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(.26 * power, now + .018); gain.gain.exponentialRampToValueAtTime(.0001, now + .17);
    const pan = this.#panner(position); src.connect(filter).connect(gain).connect(pan).connect(this.combat);
    osc.type='sine'; osc.frequency.setValueAtTime(180,now); osc.frequency.exponentialRampToValueAtTime(72,now+.12); const og=this.ctx.createGain(); og.gain.setValueAtTime(.0001,now);og.gain.exponentialRampToValueAtTime(.08*power,now+.01);og.gain.exponentialRampToValueAtTime(.0001,now+.14);osc.connect(og).connect(pan);
    src.start(now); osc.start(now); osc.stop(now+.18);
  }

  playImpact(position, power = 1) {
    if (!this.started) return;
    const now=this.ctx.currentTime;
    const src=this.ctx.createBufferSource(); src.buffer=this.#noiseBuffer(.22);
    const low=this.ctx.createBiquadFilter(); low.type='lowpass'; low.frequency.value=520;
    const gain=this.ctx.createGain(); gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.4*power,now+.006);gain.gain.exponentialRampToValueAtTime(.0001,now+.2);
    const pan=this.#panner(position); src.connect(low).connect(gain).connect(pan).connect(this.combat); src.start(now);
    const osc=this.ctx.createOscillator(); osc.type='triangle';osc.frequency.setValueAtTime(95,now);osc.frequency.exponentialRampToValueAtTime(42,now+.16);const og=this.ctx.createGain();og.gain.setValueAtTime(.18*power,now);og.gain.exponentialRampToValueAtTime(.0001,now+.18);osc.connect(og).connect(pan);osc.start(now);osc.stop(now+.2);
  }

  playRift(position, power = 1) {
    if (!this.started) return;
    const now=this.ctx.currentTime, pan=this.#panner(position);
    for (const f of [72,108,216]) { const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type='sawtooth';o.frequency.setValueAtTime(f,now);o.frequency.exponentialRampToValueAtTime(f*1.8,now+.5);g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.055*power,now+.04);g.gain.exponentialRampToValueAtTime(.0001,now+.62);o.connect(g).connect(pan);o.start(now);o.stop(now+.65); }
  }

  #panner(position) {
    const p=this.ctx.createPanner(); p.panningModel='HRTF';p.distanceModel='inverse';p.refDistance=2;p.maxDistance=55;p.rolloffFactor=1.25;p.positionX.value=position.x;p.positionY.value=position.y;p.positionZ.value=position.z;return p;
  }

  #noiseBuffer(duration) {
    const len=Math.max(32,Math.floor(this.ctx.sampleRate*duration)),b=this.ctx.createBuffer(1,len,this.ctx.sampleRate),d=b.getChannelData(0);let last=0;for(let i=0;i<len;i++){const white=Math.random()*2-1;last=last*.72+white*.28;d[i]=last;}return b;
  }

  #startAmbience() {
    const now=this.ctx.currentTime;
    const noise=this.ctx.createBufferSource();noise.buffer=this.#noiseBuffer(4);noise.loop=true;const filter=this.ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=700;const g=this.ctx.createGain();g.gain.value=.16;noise.connect(filter).connect(g).connect(this.ambience);noise.start(now);
    const drone=this.ctx.createOscillator();drone.type='sine';drone.frequency.value=48;const dg=this.ctx.createGain();dg.gain.value=.018;drone.connect(dg).connect(this.ambience);drone.start(now);
  }
}
