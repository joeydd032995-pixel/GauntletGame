import * as THREE from 'three';
import { createHeroAuthoredAnimationSet } from './authoredAnimation.js';

const bone=(name,x=0,y=0,z=0)=>{const b=new THREE.Bone();b.name=name;b.position.set(x,y,z);return b;};

export function createHeroRig(){
  const group=new THREE.Group();group.name='HeroRig';
  const hips=bone('Hips',0,1.02,0),spine=bone('Spine',0,.5,0),chest=bone('Chest',0,.48,0),neck=bone('Neck',0,.32,0),head=bone('Head',0,.25,0);
  hips.add(spine);spine.add(chest);chest.add(neck);neck.add(head);group.add(hips);
  const limbs={};
  for(const [side,s] of [['Left',-1],['Right',1]]){
    const upper=bone(`${side}UpperArm`,.44*s,.24,0),lower=bone(`${side}LowerArm`,.045*s,-.43,.025),hand=bone(`${side}Hand`,.018*s,-.34,.045);
    chest.add(upper);upper.add(lower);lower.add(hand);
    const thigh=bone(`${side}UpLeg`,.21*s,-.02,0),shin=bone(`${side}Leg`,.025*s,-.62,0),foot=bone(`${side}Foot`,0,-.57,.08);
    hips.add(thigh);thigh.add(shin);shin.add(foot);
    limbs[`${side.toLowerCase()}UpperArm`]=upper;limbs[`${side.toLowerCase()}LowerArm`]=lower;limbs[`${side.toLowerCase()}Hand`]=hand;limbs[`${side.toLowerCase()}Thigh`]=thigh;limbs[`${side.toLowerCase()}Shin`]=shin;limbs[`${side.toLowerCase()}Foot`]=foot;
  }
  const weaponRoot=bone('WeaponRoot',0,-.035,.035);limbs.rightHand.add(weaponRoot);weaponRoot.rotation.set(.04,0,-.18);
  return{group,bones:{hips,spine,chest,neck,head,leftFoot:limbs.leftFoot,rightFoot:limbs.rightFoot,rightArm:limbs.rightUpperArm,...limbs},weaponRoot};
}

export function createEnemyRig(){
  const group=new THREE.Group();group.name='EnemyRig';
  const hips=bone('EnemyHips',0,1.12,0),spine=bone('EnemySpine',0,.62,0),head=bone('EnemyHead',0,.57,0);hips.add(spine);spine.add(head);group.add(hips);
  const armL=bone('EnemyArmL',-.57,.34,0),armR=bone('EnemyArmR',.57,.34,0),forearmL=bone('EnemyForearmL',-.055,-.47,.025),forearmR=bone('EnemyForearmR',.055,-.47,.025),handL=bone('EnemyHandL',-.015,-.35,.045),handR=bone('EnemyHandR',.015,-.35,.045);
  spine.add(armL,armR);armL.add(forearmL);armR.add(forearmR);forearmL.add(handL);forearmR.add(handR);
  const limbs={};
  for(const [side,s] of [['Left',-1],['Right',1]]){
    const thigh=bone(`${side}UpLeg`,.28*s,-.08,0),shin=bone(`${side}Leg`,0,-.62,0),foot=bone(`${side}Foot`,0,-.58,.1);hips.add(thigh);thigh.add(shin);shin.add(foot);
    limbs[`${side.toLowerCase()}Thigh`]=thigh;limbs[`${side.toLowerCase()}Shin`]=shin;limbs[`${side.toLowerCase()}Foot`]=foot;
  }
  return{group,bones:{hips,spine,head,armL,armR,forearmL,forearmR,handL,handR,...limbs}};
}

export function createProceduralClips(rig){return createHeroAuthoredAnimationSet(rig);}
