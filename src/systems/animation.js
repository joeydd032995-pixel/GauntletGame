import * as THREE from 'three';

const clamp01=v=>Math.max(0,Math.min(1,v));
const damp=(a,b,lambda,dt)=>THREE.MathUtils.damp(a,b,lambda,dt);

export class AnimationGraph {
  constructor({root,clips={},terrainHeight,terrainNormal}){
    this.root=root;this.mixer=new THREE.AnimationMixer(root);this.actions=new Map();this.state='idle';this.previousState=null;
    this.speed=0;this.angularSpeed=0;this.grounded=true;this.combat=false;this.acceleration=0;this.direction=0;this.rootMotion=new THREE.Vector3();this.lastRootPosition=new THREE.Vector3();
    this.motionMatcher=new MotionMatcher();this.ik=new FootIK({root,terrainHeight,terrainNormal});this.transitionLock=0;this.lastSpeed=0;
    for(const [name,clip] of Object.entries(clips))this.addClip(name,clip);
  }
  addClip(name,clip){const action=this.mixer.clipAction(clip);action.enabled=true;action.clampWhenFinished=true;this.actions.set(name,action);this.motionMatcher.ingest(name,clip);}
  setLocomotion({speed,angularSpeed=0,grounded=true,combat=false,direction=0,dt=.016}){this.acceleration=(speed-this.lastSpeed)/Math.max(dt,.001);this.lastSpeed=speed;this.speed=speed;this.angularSpeed=angularSpeed;this.grounded=grounded;this.combat=combat;this.direction=direction;}
  trigger(name,{fade=.07,loop=false}={}){if(!this.actions.has(name))return false;this.#transition(name,fade,loop?THREE.LoopRepeat:THREE.LoopOnce,true);return true;}
  update(dt,desiredVelocity=new THREE.Vector3(),facing=new THREE.Vector3(0,0,-1)){
    this.transitionLock=Math.max(0,this.transitionLock-dt);
    const forced=['attack','hit','dodge','death','enemyAttack','enemyHit','enemyDeath'].includes(this.state)&&this.actions.get(this.state)?.isRunning();
    if(!forced&&this.transitionLock<=0){const next=this.motionMatcher.choose({speed:this.speed,acceleration:this.acceleration,angularSpeed:this.angularSpeed,grounded:this.grounded,combat:this.combat,direction:this.direction,desiredVelocity,facing,current:this.state});if(next&&next!==this.state)this.#transition(next,.11,THREE.LoopRepeat,false);}
    const hip=this.#find(['Hips','EnemyHips','Root','root']);if(hip)this.lastRootPosition.copy(hip.position);this.mixer.update(dt);
    if(hip){this.rootMotion.copy(hip.position).sub(this.lastRootPosition);hip.position.x-=this.rootMotion.x;hip.position.z-=this.rootMotion.z;}else this.rootMotion.set(0,0,0);
    this.ik.update(dt);return this.rootMotion;
  }
  #transition(name,fade,loop,forced){const next=this.actions.get(name);if(!next)return;const prev=this.actions.get(this.state);if(prev&&prev!==next)prev.fadeOut(fade);next.reset().setLoop(loop,loop===THREE.LoopOnce?1:Infinity).fadeIn(fade).play();this.previousState=this.state;this.state=name;this.transitionLock=forced?.08:.06;}
  #find(names){let found=null;this.root.traverse(o=>{if(!found&&o.isBone&&names.includes(o.name))found=o;});return found;}
}

export class MotionMatcher {
  constructor(){this.samples=[];this.lastChoice='idle';this.hold=.12;this.holdTimer=0;}
  ingest(name,clip){const n=name.toLowerCase();let speed=0;if(n.includes('sprint'))speed=8.2;else if(n.includes('run'))speed=5.2;else if(n.includes('walk'))speed=2.3;else if(n.includes('strafe'))speed=3.2;this.samples.push({name,clip,speed,grounded:!n.includes('jump')&&!n.includes('fall'),combat:n.includes('combat')||n.includes('strafe'),turn:n.includes('turn')?2.2:0,direction:n.includes('back')?Math.PI:n.includes('left')?-Math.PI/2:n.includes('right')?Math.PI/2:0});}
  choose(q){if(!this.samples.length)return q.speed>6.2?'run':q.speed>.45?'walk':'idle';let best=null,bestCost=Infinity;for(const s of this.samples){let cost=Math.abs(s.speed-q.speed)*1.15+Math.abs(s.turn-Math.abs(q.angularSpeed))*.42+Math.abs(s.direction-q.direction)*.12;if(s.grounded!==q.grounded)cost+=10;if(q.combat!==s.combat)cost+=q.combat?1.1:.6;if(q.current===s.name)cost-=.32;if(Math.abs(q.acceleration)>12&&s.speed>q.speed)cost-=.15;if(cost<bestCost){bestCost=cost;best=s;}}
    const chosen=best?.name||this.lastChoice;if(chosen!==this.lastChoice){const current=this.samples.find(s=>s.name===this.lastChoice);if(current){let currentCost=Math.abs(current.speed-q.speed)*1.15;if(currentCost<bestCost+.28)return this.lastChoice;}this.lastChoice=chosen;}return this.lastChoice;}
}

export class FootIK {
  constructor({root,terrainHeight,terrainNormal}){
    this.root=root;this.height=terrainHeight;this.normal=terrainNormal;this.hips=this.#find(['Hips','EnemyHips']);
    this.feet=[this.#chain('Left'),this.#chain('Right')].filter(Boolean);this.rest=new Map();this.n=new THREE.Vector3(0,1,0);this.up=new THREE.Vector3(0,1,0);this.world=new THREE.Vector3();this.world2=new THREE.Vector3();
    for(const c of this.feet){this.rest.set(c.foot,c.foot.position.clone());if(c.shin)this.rest.set(c.shin,c.shin.quaternion.clone());if(c.thigh)this.rest.set(c.thigh,c.thigh.quaternion.clone());}if(this.hips)this.rest.set(this.hips,this.hips.position.clone());
  }
  update(dt){if(!this.height||!this.feet.length)return;let lowest=0;for(const c of this.feet){c.foot.getWorldPosition(this.world);const h=this.height(this.world.x,this.world.z);const delta=THREE.MathUtils.clamp(h-this.world.y+.055,-.18,.38);lowest=Math.min(lowest,delta);const restFoot=this.rest.get(c.foot);c.foot.position.y=damp(c.foot.position.y,restFoot.y+delta,20,dt);
      if(this.normal){this.normal(this.world.x,this.world.z,this.n);const tiltX=Math.atan2(this.n.z,Math.max(.2,this.n.y));const tiltZ=-Math.atan2(this.n.x,Math.max(.2,this.n.y));const target=new THREE.Quaternion().setFromEuler(new THREE.Euler(tiltX,0,tiltZ));c.foot.quaternion.slerp(target,clamp01(dt*12));if(c.shin){const restQ=this.rest.get(c.shin);const bend=new THREE.Quaternion().setFromEuler(new THREE.Euler(THREE.MathUtils.clamp(-delta*.65,-.22,.28),0,0));const q=restQ.clone().multiply(bend);c.shin.quaternion.slerp(q,clamp01(dt*10));}}
    }
    if(this.hips){const restHip=this.rest.get(this.hips);this.hips.position.y=damp(this.hips.position.y,restHip.y+lowest*.58,15,dt);}
  }
  #chain(side){const foot=this.#find([`${side}Foot`,side==='Left'?'foot_l':'foot_r']);if(!foot)return null;return{foot,shin:this.#find([side==='Left'?'LeftLeg':'RightLeg']),thigh:this.#find([side==='Left'?'LeftUpLeg':'RightUpLeg'])};}
  #find(names){let found=null;this.root.traverse(o=>{if(!found&&o.isBone&&names.includes(o.name))found=o;});return found;}
}

export function authorEnemyClips(rig){
  const spine=rig.getObjectByName('EnemySpine'),arm=rig.getObjectByName('EnemyArmR'),hips=rig.getObjectByName('EnemyHips');const tracks=[];
  if(spine)tracks.push(new THREE.QuaternionKeyframeTrack(`${spine.name}.quaternion`,[0,.16,.34,.52,.82],quatSeries([[0,0,0],[.09,.02,0],[-.18,-.03,.03],[.08,0,-.02],[0,0,0]])));
  if(arm)tracks.push(new THREE.QuaternionKeyframeTrack(`${arm.name}.quaternion`,[0,.16,.34,.52,.82],quatSeries([[0,0,-.25],[-.55,.12,-.9],[.92,-.24,.62],[.1,0,-.25],[0,0,-.25]])));
  if(hips)tracks.push(new THREE.VectorKeyframeTrack(`${hips.name}.position`,[0,.32,.5,.82],[0,1.08,0,0,1.03,-.08,0,1.07,-.42,0,1.08,0]));
  const idle=spine?[new THREE.QuaternionKeyframeTrack(`${spine.name}.quaternion`,[0,.8,1.6],quatSeries([[0,0,0],[.045,0,.025],[0,0,0]]))]:[];
  const hit=spine?[new THREE.QuaternionKeyframeTrack(`${spine.name}.quaternion`,[0,.08,.24,.42],quatSeries([[0,0,0],[-.32,.08,.06],[-.12,0,0],[0,0,0]]))]:[];
  const death=spine?[new THREE.QuaternionKeyframeTrack(`${spine.name}.quaternion`,[0,.3,.78,1.3],quatSeries([[0,0,0],[-.35,.1,.15],[-1.08,.18,.25],[-1.35,.2,.2]]))]:[];
  return{enemyAttack:new THREE.AnimationClip('enemyAttack',.82,tracks),enemyIdle:new THREE.AnimationClip('enemyIdle',1.6,idle),enemyHit:new THREE.AnimationClip('enemyHit',.42,hit),enemyDeath:new THREE.AnimationClip('enemyDeath',1.3,death)};
}

function quatSeries(eulers){const out=[];for(const [x,y,z] of eulers){const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z));out.push(q.x,q.y,q.z,q.w);}return out;}
