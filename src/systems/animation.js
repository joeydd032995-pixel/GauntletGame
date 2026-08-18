import * as THREE from 'three';
import { createWardenAuthoredAnimationSet } from './authoredAnimation.js';

const clamp01=v=>Math.max(0,Math.min(1,v));
const damp=(a,b,lambda,dt)=>THREE.MathUtils.damp(a,b,lambda,dt);
const FORCED=new Set(['attack','rift','guard','parry','hit','dodge','death','enemyAttack','enemyHeavy','enemyHit','enemyStagger','enemyDeath']);

export class AnimationGraph{
  constructor({root,clips={},terrainHeight,terrainNormal}){
    this.root=root;this.mixer=new THREE.AnimationMixer(root);this.actions=new Map();this.state='idle';this.previousState=null;
    this.speed=0;this.angularSpeed=0;this.grounded=true;this.combat=false;this.acceleration=0;this.direction=0;this.rootMotion=new THREE.Vector3();this.lastRootPosition=new THREE.Vector3();
    this.motionMatcher=new MotionMatcher();this.ik=new FootIK({root,terrainHeight,terrainNormal});this.transitionLock=0;this.lastSpeed=0;this.transitionCount=0;this.timeInState=0;
    for(const[name,clip]of Object.entries(clips))this.addClip(name,clip);
  }
  addClip(name,clip){const action=this.mixer.clipAction(clip);action.enabled=true;action.clampWhenFinished=true;this.actions.set(name,action);this.motionMatcher.ingest(name,clip);}
  setLocomotion({speed,angularSpeed=0,grounded=true,combat=false,direction=0,dt=.016}){this.acceleration=(speed-this.lastSpeed)/Math.max(dt,.001);this.lastSpeed=speed;this.speed=speed;this.angularSpeed=angularSpeed;this.grounded=grounded;this.combat=combat;this.direction=direction;}
  trigger(name,{fade=.07,loop=false}={}){if(!this.actions.has(name))return false;this.#transition(name,fade,loop?THREE.LoopRepeat:THREE.LoopOnce,true);return true;}
  update(dt,desiredVelocity=new THREE.Vector3(),facing=new THREE.Vector3(0,0,-1)){
    this.timeInState+=dt;this.transitionLock=Math.max(0,this.transitionLock-dt);
    const current=this.actions.get(this.state),forced=FORCED.has(this.state)&&current?.isRunning();
    if(!forced&&this.transitionLock<=0){const next=this.motionMatcher.choose({speed:this.speed,acceleration:this.acceleration,angularSpeed:this.angularSpeed,grounded:this.grounded,combat:this.combat,direction:this.direction,desiredVelocity,facing,current:this.state});if(next&&next!==this.state)this.#transition(next,.1,THREE.LoopRepeat,false);}
    this.#syncLocomotionRate();
    const hip=this.#find(['Hips','EnemyHips','Root','root']);if(hip)this.lastRootPosition.copy(hip.position);this.mixer.update(dt);
    if(hip){this.rootMotion.copy(hip.position).sub(this.lastRootPosition);hip.position.x-=this.rootMotion.x;hip.position.z-=this.rootMotion.z;}else this.rootMotion.set(0,0,0);
    this.ik.update(dt);return this.rootMotion;
  }
  getTelemetry(){return{state:this.state,timeInState:+this.timeInState.toFixed(3),speed:+this.speed.toFixed(3),transitions:this.transitionCount,footIK:this.ik.getTelemetry()};}
  #syncLocomotionRate(){const ref=this.state==='sprint'?8.2:this.state==='run'?5.2:this.state==='walk'?2.3:this.state==='enemyWalk'?2.8:0;if(!ref)return;const a=this.actions.get(this.state);if(a)a.timeScale=THREE.MathUtils.clamp(this.speed/ref,.72,1.38);}
  #transition(name,fade,loop,forced){const next=this.actions.get(name);if(!next)return;const prev=this.actions.get(this.state);if(prev&&prev!==next)prev.fadeOut(fade);next.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).setLoop(loop,loop===THREE.LoopOnce?1:Infinity).fadeIn(fade).play();this.previousState=this.state;this.state=name;this.timeInState=0;this.transitionCount++;this.transitionLock=forced?.09:.055;}
  #find(names){let found=null;this.root.traverse(o=>{if(!found&&o.isBone&&names.includes(o.name))found=o;});return found;}
}

export class MotionMatcher{
  constructor(){this.samples=[];this.lastChoice='idle';this.switchMargin=.3;}
  ingest(name,clip){const n=name.toLowerCase();if(!/(idle|walk|run|sprint|strafe|turn)/.test(n))return;let speed=0;if(n.includes('sprint'))speed=8.2;else if(n.includes('run'))speed=5.2;else if(n.includes('walk'))speed=n.includes('enemy')?2.8:2.3;else if(n.includes('strafe'))speed=3.2;this.samples.push({name,clip,speed,grounded:!n.includes('jump')&&!n.includes('fall'),combat:n.includes('combat')||n.includes('strafe')||n.includes('enemy'),turn:n.includes('turn')?2.2:0,direction:n.includes('back')?Math.PI:n.includes('left')?-Math.PI/2:n.includes('right')?Math.PI/2:0});}
  choose(q){if(!this.samples.length)return q.speed>6.2?'sprint':q.speed>3.4?'run':q.speed>.35?'walk':'idle';let best=null,bestCost=Infinity;for(const s of this.samples){let cost=Math.abs(s.speed-q.speed)*1.18+Math.abs(s.turn-Math.abs(q.angularSpeed))*.3+Math.abs(s.direction-q.direction)*.11;if(s.grounded!==q.grounded)cost+=12;if(q.combat!==s.combat&&s.name!=='idle')cost+=q.combat?.5:.35;if(q.current===s.name)cost-=.38;if(Math.abs(q.acceleration)>10&&s.speed>q.speed)cost-=.12;if(cost<bestCost){bestCost=cost;best=s;}}const chosen=best?.name||this.lastChoice;if(chosen!==this.lastChoice){const cur=this.samples.find(s=>s.name===this.lastChoice);if(cur){const currentCost=Math.abs(cur.speed-q.speed)*1.18+Math.abs(cur.turn-Math.abs(q.angularSpeed))*.3;if(currentCost<bestCost+this.switchMargin)return this.lastChoice;}this.lastChoice=chosen;}return this.lastChoice;}
}

export class FootIK{
  constructor({root,terrainHeight,terrainNormal}){
    this.root=root;this.height=terrainHeight;this.normal=terrainNormal;this.hips=this.#find(['Hips','EnemyHips']);this.feet=[this.#chain('Left'),this.#chain('Right')].filter(Boolean);this.rest=new Map();this.n=new THREE.Vector3(0,1,0);this.world=new THREE.Vector3();this.prev=new Map();this.locks=new Map();this.samples=0;this.slideSum=0;this.slidePeak=0;this.lockAcquisitions=0;this.lockReleases=0;this.lockErrorSum=0;this.lockErrorPeak=0;this.lockErrorSamples=0;
    for(const c of this.feet){this.rest.set(c.foot,{pos:c.foot.position.clone(),quat:c.foot.quaternion.clone()});if(c.shin)this.rest.set(c.shin,{quat:c.shin.quaternion.clone()});if(c.thigh)this.rest.set(c.thigh,{quat:c.thigh.quaternion.clone()});c.foot.getWorldPosition(this.world);this.prev.set(c.foot,this.world.clone());this.locks.set(c.foot,{active:false,world:new THREE.Vector3()});}if(this.hips)this.rest.set(this.hips,{pos:this.hips.position.clone()});
  }
  update(dt){if(!this.height||!this.feet.length)return;let hipDrop=0;for(const c of this.feet){
      c.foot.getWorldPosition(this.world);const h=this.height(this.world.x,this.world.z),clearance=this.world.y-h,prev=this.prev.get(c.foot),vertical=Math.abs((this.world.y-prev.y)/Math.max(dt,.001)),lock=this.locks.get(c.foot),wasLocked=lock.active;const contact=clearance<.11&&vertical<1.25;
      if(contact&&!lock.active){lock.active=true;lock.world.set(this.world.x,h+.045,this.world.z);this.lockAcquisitions++;}
      if(lock.active){const poseDrift=Math.hypot(this.world.x-lock.world.x,this.world.z-lock.world.z);if(clearance>.22||vertical>2.4||poseDrift>.82){lock.active=false;this.lockReleases++;}}
      const targetY=h+.045,delta=THREE.MathUtils.clamp(targetY-this.world.y,-.16,.34),r=this.rest.get(c.foot);c.foot.position.y=damp(c.foot.position.y,r.pos.y+delta,24,dt);hipDrop=Math.min(hipDrop,delta);
      if(lock.active){const localTarget=c.foot.parent.worldToLocal(lock.world.clone()),dx=THREE.MathUtils.clamp(localTarget.x-c.foot.position.x,-.34,.34),dz=THREE.MathUtils.clamp(localTarget.z-c.foot.position.z,-.34,.34),blend=1-Math.exp(-58*dt);c.foot.position.x+=dx*blend;c.foot.position.z+=dz*blend;}
      if(this.normal){this.normal(this.world.x,this.world.z,this.n);const target=new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.atan2(this.n.z,Math.max(.2,this.n.y)),0,-Math.atan2(this.n.x,Math.max(.2,this.n.y))));c.foot.quaternion.slerp(target,clamp01(dt*14));if(c.shin){const q=this.rest.get(c.shin).quat.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(THREE.MathUtils.clamp(-delta*.72,-.24,.32),0,0)));c.shin.quaternion.slerp(q,clamp01(dt*12));}}
      c.foot.updateMatrixWorld(true);c.foot.getWorldPosition(this.world);
      if(lock.active){const lockError=Math.hypot(this.world.x-lock.world.x,this.world.z-lock.world.z);this.lockErrorSamples++;this.lockErrorSum+=lockError;this.lockErrorPeak=Math.max(this.lockErrorPeak,lockError);}
      if(wasLocked&&contact&&lock.active){const slide=Math.hypot(this.world.x-prev.x,this.world.z-prev.z)/Math.max(dt,.001);this.samples++;this.slideSum+=slide;this.slidePeak=Math.max(this.slidePeak,slide);}prev.copy(this.world);
    }if(this.hips){const r=this.rest.get(this.hips).pos;this.hips.position.y=damp(this.hips.position.y,r.y+hipDrop*.52,16,dt);}}
  getTelemetry(){return{contactSamples:this.samples,averageSlide:+(this.samples?this.slideSum/this.samples:0).toFixed(3),peakSlide:+this.slidePeak.toFixed(3),lockedFeet:[...this.locks.values()].filter(x=>x.active).length,lockAcquisitions:this.lockAcquisitions,lockReleases:this.lockReleases,averageLockError:+(this.lockErrorSamples?this.lockErrorSum/this.lockErrorSamples:0).toFixed(3),peakLockError:+this.lockErrorPeak.toFixed(3)};}
  #chain(side){const foot=this.#find([`${side}Foot`,side==='Left'?'foot_l':'foot_r']);if(!foot)return null;return{foot,shin:this.#find([side==='Left'?'LeftLeg':'RightLeg']),thigh:this.#find([side==='Left'?'LeftUpLeg':'RightUpLeg'])};}
  #find(names){let found=null;this.root.traverse(o=>{if(!found&&o.isBone&&names.includes(o.name))found=o;});return found;}
}

export function authorEnemyClips(root){return createWardenAuthoredAnimationSet({group:root});}
