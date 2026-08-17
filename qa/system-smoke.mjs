import assert from 'node:assert/strict';
import * as THREE from 'three';
import { PhysicsWorld, terrainNormalFromHeight } from '../src/systems/physics.js';
import { MotionMatcher } from '../src/systems/animation.js';
import { EnemyCombatBrain } from '../src/systems/enemyAI.js';

function testGrounding(){
  const height=()=>0,world=new PhysicsWorld({terrainHeight:height,terrainNormal:(x,z,o)=>o.set(0,1,0)}),body=world.createCharacter(new THREE.Vector3(0,2,0));
  for(let i=0;i<180;i++)world.stepCharacter(body,1/60);
  assert.ok(body.grounded,'character should settle grounded');assert.ok(Math.abs(body.position.y)<.001,`expected ground y=0, got ${body.position.y}`);
}
function testCollision(){
  const world=new PhysicsWorld({terrainHeight:()=>0,terrainNormal:(x,z,o)=>o.set(0,1,0)}),body=world.createCharacter(new THREE.Vector3(-2,0,0),{radius:.4});world.addBox(new THREE.Vector3(0,1,0),new THREE.Vector3(.5,1,.5));body.grounded=true;
  for(let i=0;i<120;i++){body.desiredVelocity.set(5,0,0);world.stepCharacter(body,1/60);}assert.ok(body.position.x<-.88,`capsule penetrated box: x=${body.position.x}`);
}
function testNormal(){const out=terrainNormalFromHeight((x,z)=>x*.2,0,0);assert.ok(out.y>.8&&out.x<0,'height-field normal should tilt against +x slope');}
function testMotionMatcher(){
  const mm=new MotionMatcher();for(const name of['idle','walk','run'])mm.ingest(name,new THREE.AnimationClip(name,1,[]));
  assert.equal(mm.choose({speed:0,acceleration:0,angularSpeed:0,grounded:true,combat:false,direction:0,current:'idle'}),'idle');
  mm.lastChoice='walk';assert.equal(mm.choose({speed:2.4,acceleration:0,angularSpeed:0,grounded:true,combat:false,direction:0,current:'walk'}),'walk');
  mm.lastChoice='run';assert.equal(mm.choose({speed:5.3,acceleration:0,angularSpeed:0,grounded:true,combat:false,direction:0,current:'run'}),'run');
}
function testEnemyState(){
  const enemy={position:new THREE.Vector3(0,0,0),desiredVelocity:new THREE.Vector3(),velocity:new THREE.Vector3()},target={position:new THREE.Vector3(0,0,2.8),velocity:new THREE.Vector3()},animation={trigger:()=>true};const brain=new EnemyCombatBrain({body:enemy,rig:{},animation,vfx:null,audio:null,targetBody:target});brain.cooldown=0;
  let r=brain.update(1/60);assert.equal(brain.state,'windup');assert.equal(r.damage,0);
  for(let i=0;i<60&&brain.state==='windup';i++)brain.update(1/60);assert.equal(brain.state,'strike');
  let damaged=false;for(let i=0;i<30;i++){r=brain.update(1/60);if(r.damage>0)damaged=true;if(brain.state==='recover')break;}assert.ok(damaged,'close target should receive strike damage');assert.ok(['strike','recover'].includes(brain.state));
}

testGrounding();testCollision();testNormal();testMotionMatcher();testEnemyState();
console.log('Gauntlet system smoke: PASS');
