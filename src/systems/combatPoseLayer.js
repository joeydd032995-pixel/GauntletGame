import * as THREE from 'three';
import { AnimationGraph } from './animation.js';

const baseUpdate=AnimationGraph.prototype.update;
const restCache=new WeakMap();
const clamp01=v=>Math.max(0,Math.min(1,v));
const smooth=t=>t*t*(3-2*t);
function pulse(t,a,b,c){if(t<=a||t>=c)return 0;if(t<b)return smooth((t-a)/(b-a));return 1-smooth((t-b)/(c-b));}
function rest(bone){if(!bone)return null;if(!restCache.has(bone))restCache.set(bone,bone.quaternion.clone());return restCache.get(bone);}
function layer(bone,euler,weight){if(!bone||weight<=0)return;const r=rest(bone),q=r.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...euler)));bone.quaternion.slerp(q,clamp01(weight));}
function heroLayer(graph){
  const root=graph.root,state=graph.state,t=graph.timeInState;
  const rl=root.getObjectByName('RightLowerArm'),rh=root.getObjectByName('RightHand'),ll=root.getObjectByName('LeftLowerArm'),lh=root.getObjectByName('LeftHand');
  if(state==='attack'){
    const p=pulse(t,0,.26,.68),release=pulse(t,.18,.35,.72);layer(rl,[-.58,.12,-.22],p*.92);layer(rh,[.14,-.18,-.34],release*.98);layer(ll,[.24,-.08,.12],p*.42);layer(lh,[.08,.05,.08],p*.25);
  }else if(state==='rift'){
    const p=pulse(t,.08,.55,1.02);layer(rl,[-.34,-.22,-.28],p*.82);layer(rh,[.18,.14,-.16],p*.72);layer(ll,[-.34,.22,.28],p*.82);layer(lh,[.18,-.14,.16],p*.72);
  }else if(state==='guard'){
    const p=pulse(t,0,.16,.57);layer(rl,[-.68,-.28,-.18],p*.95);layer(rh,[.12,.22,-.48],p);layer(ll,[-.5,.24,.26],p*.8);layer(lh,[.08,-.16,.24],p*.7);
  }else if(state==='parry'){
    const p=pulse(t,0,.12,.4);layer(rl,[-.84,.18,-.32],p);layer(rh,[.2,-.36,-.62],p);layer(ll,[.2,-.12,.12],p*.45);
  }
}
function enemyLayer(graph){
  const root=graph.root,state=graph.state,t=graph.timeInState;
  const rf=root.getObjectByName('EnemyForearmR'),rh=root.getObjectByName('EnemyHandR'),lf=root.getObjectByName('EnemyForearmL'),lh=root.getObjectByName('EnemyHandL');
  if(state==='enemyAttack'){
    const cock=pulse(t,.02,.25,.52),strike=pulse(t,.31,.55,.9);layer(rf,[-.78,.12,-.2],cock*.9);layer(rf,[.52,-.08,.12],strike*.96);layer(rh,[.18,-.08,-.5],Math.max(cock,strike));layer(lf,[.24,.08,.18],Math.max(cock,strike)*.45);layer(lh,[.08,-.04,.1],Math.max(cock,strike)*.35);
  }else if(state==='enemyHeavy'){
    const wind=pulse(t,.02,.4,.72),slam=pulse(t,.5,.78,1.17);layer(rf,[-1.02,.2,-.28],wind);layer(rh,[.28,-.15,-.62],wind);layer(rf,[.68,-.12,.18],slam);layer(rh,[-.1,.12,.24],slam);layer(lf,[-.18,-.05,.16],Math.max(wind,slam)*.5);
  }else if(state==='enemyStagger'){
    const p=pulse(t,0,.18,.68);layer(rf,[.38,.12,.22],p*.6);layer(lf,[.38,-.12,-.22],p*.6);
  }
}

if(!AnimationGraph.prototype.__gauntletCombatPoseLayer){
  AnimationGraph.prototype.__gauntletCombatPoseLayer=true;
  AnimationGraph.prototype.update=function(...args){const delta=baseUpdate.apply(this,args);if(this.root?.name==='HeroRig')heroLayer(this);else if(this.root?.name==='EnemyRig')enemyLayer(this);return delta;};
}
