import './styles.css';
import * as THREE from 'three';
import { PhysicsWorld, terrainNormalFromHeight } from './systems/physics.js';
import { AnimationGraph, authorEnemyClips } from './systems/animation.js';
import { createLayeredTerrain } from './systems/terrain.js';
import { createVolumetricAtmosphere } from './systems/atmosphere.js';
import { CombatVFX } from './systems/vfx.js';
import { createHeroRig, createEnemyRig, createProceduralClips } from './systems/rig.js';
import { SpatialAudioSystem } from './systems/audio.js';
import { WorldStreamer } from './systems/worldStreaming.js';
import { EnemyCombatBrain } from './systems/enemyAI.js';
import { createRenderingPipeline, configureHeroLightRig, createContactShadow } from './systems/rendering.js';
import { buildRuinArena, buildCrystalField } from './systems/environment.js';
import { ThirdPersonCameraRig } from './systems/cameraRig.js';
import { applyHeroArtPass, applyEnemyArtPass } from './systems/characterArt.js';

const app=document.querySelector('#app');
const scene=new THREE.Scene();scene.background=new THREE.Color(0x071116);scene.fog=new THREE.FogExp2(0x09161a,.0065);
const camera=new THREE.PerspectiveCamera(54,innerWidth/innerHeight,.07,520);
const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance',stencil:false});renderer.setSize(innerWidth,innerHeight);app.appendChild(renderer.domElement);
const rendering=createRenderingPipeline(renderer,scene,camera);const lights=configureHeroLightRig(scene);

const heightFn=(x,z)=>Math.sin(x*.075)*1.65+Math.cos(z*.058)*1.12+Math.sin((x+z)*.13)*.48+Math.sin(x*.021-z*.026)*1.25-Math.exp(-(x*x+z*z)/430)*1.2;
const normalFn=(x,z,out)=>terrainNormalFromHeight(heightFn,x,z,out);
const cameraRig=new ThirdPersonCameraRig(camera,{heightFn});
const {mesh:terrain}=createLayeredTerrain({size:240,segments:180,heightFn});scene.add(terrain);
const physics=new PhysicsWorld({terrainHeight:heightFn,terrainNormal:normalFn});
const world=new WorldStreamer({scene,camera,heightFn,chunkSize:30,radius:2});
let seed=712367;const rng=()=>((seed=(seed*48271)%2147483647)/2147483647);
buildRuinArena({scene,physics,heightFn,rng});buildCrystalField({scene,heightFn,rng});

const heroRig=createHeroRig();applyHeroArtPass(heroRig);const hero=heroRig.group;hero.position.set(0,heightFn(0,4),4);scene.add(hero);
const heroBody=physics.createCharacter(hero.position,{radius:.43,height:1.9,stepHeight:.44,slopeLimit:.7,acceleration:38,braking:46});
const heroAnim=new AnimationGraph({root:hero,clips:createProceduralClips(heroRig),terrainHeight:heightFn,terrainNormal:normalFn});heroAnim.trigger('idle',{loop:true});
const enemyRig=createEnemyRig();applyEnemyArtPass(enemyRig);const enemy=enemyRig.group;enemy.position.set(0,heightFn(0,-4),-4);scene.add(enemy);
const enemyBody=physics.createCharacter(enemy.position,{radius:.58,height:2.2,stepHeight:.38,slopeLimit:.68,acceleration:24,braking:34});
const enemyAnim=new AnimationGraph({root:enemy,clips:authorEnemyClips(enemy),terrainHeight:heightFn,terrainNormal:normalFn});enemyAnim.trigger('enemyIdle',{loop:true});

const atmosphere=createVolumetricAtmosphere({scene,camera,layers:10,radius:120,height:28});
const vfx=new CombatVFX(scene,camera),audio=new SpatialAudioSystem(camera),heroShadow=createContactShadow(scene),enemyShadow=createContactShadow(scene);
const enemyBrain=new EnemyCombatBrain({body:enemyBody,rig:enemyRig,animation:enemyAnim,vfx,audio,targetBody:heroBody});
let enemyTelegraph=null;

const dustCount=450,dustGeo=new THREE.BufferGeometry(),dustPos=new Float32Array(dustCount*3);for(let i=0;i<dustCount;i++){dustPos[i*3]=(rng()-.5)*130;dustPos[i*3+1]=rng()*21;dustPos[i*3+2]=(rng()-.5)*130;}dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPos,3));const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:0xc1e7df,size:.028,transparent:true,opacity:.24,depthWrite:false,blending:THREE.AdditiveBlending}));scene.add(dust);

const keys=new Set();let yaw=0,dragging=false,lastX=0,lastY=0,stamina=100,hp=100,enemyHp=100,riftT=0,guardT=0,attackT=0,attackWindow=false,dodgeT=0,time=0;
const unlock=()=>audio.unlock().catch(()=>{});addEventListener('pointerdown',unlock,{once:true});addEventListener('keydown',unlock,{once:true});
addEventListener('keydown',e=>{keys.add(e.code);if(e.repeat)return;
  if(e.code==='Digit1'&&attackT<=0&&hp>0){attackT=.62;attackWindow=true;heroAnim.trigger('attack',{fade:.035});const dir=new THREE.Vector3(Math.sin(hero.rotation.y),0,Math.cos(hero.rotation.y));vfx.slash({origin:hero.position.clone().add(new THREE.Vector3(0,1.25,0)),direction:dir});audio.playWhoosh(hero.position.clone().add(new THREE.Vector3(0,1.2,0)),1);}
  if(e.code==='Digit2'&&riftT<=0&&hp>0){riftT=4;vfx.rift(hero.position.clone(),{radius:3.6});audio.playRift(hero.position,1);if(hero.position.distanceTo(enemy.position)<8.2&&enemyHp>0){enemyHp=Math.max(0,enemyHp-28);enemyAnim.trigger('enemyHit',{fade:.025});vfx.impact(enemy.position.clone().add(new THREE.Vector3(0,1.5,0)),{color:0x9cecff,count:24,scale:1.15});audio.playImpact(enemy.position,1.15);}}
  if(e.code==='Digit3'&&guardT<=0&&hp>0)guardT=3;
  if(e.code==='Space'&&stamina>=22&&dodgeT<=0&&hp>0){stamina-=22;dodgeT=.55;heroAnim.trigger('dodge',{fade:.025});const d=new THREE.Vector3(Math.sin(hero.rotation.y),0,Math.cos(hero.rotation.y));heroBody.velocity.addScaledVector(d,7.5);audio.playWhoosh(hero.position,.72);}
});
addEventListener('keyup',e=>keys.delete(e.code));renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());renderer.domElement.addEventListener('pointerdown',e=>{if(e.button===2){dragging=true;lastX=e.clientX;lastY=e.clientY;}});addEventListener('pointerup',()=>dragging=false);addEventListener('pointermove',e=>{if(!dragging)return;cameraRig.orbit(e.clientX-lastX,e.clientY-lastY);yaw=cameraRig.yaw;lastX=e.clientX;lastY=e.clientY;});

const fwd=new THREE.Vector3(),right=new THREE.Vector3(),move=new THREE.Vector3(),tmp=new THREE.Vector3(),worldUp=new THREE.Vector3(0,1,0);
function update(dt){time+=dt;const simDt=vfx.update(dt);riftT=Math.max(0,riftT-dt);guardT=Math.max(0,guardT-dt);attackT=Math.max(0,attackT-dt);dodgeT=Math.max(0,dodgeT-dt);dust.rotation.y+=dt*.004;atmosphere.update(dt,time);world.update(hero.position);
  fwd.set(Math.sin(yaw),0,-Math.cos(yaw));right.set(Math.cos(yaw),0,Math.sin(yaw));move.set(0,0,0);if(keys.has('KeyW'))move.add(fwd);if(keys.has('KeyS'))move.sub(fwd);if(keys.has('KeyD'))move.add(right);if(keys.has('KeyA'))move.sub(right);if(move.lengthSq()>0)move.normalize();
  const sprint=keys.has('ShiftLeft')&&stamina>1&&dodgeT<=0,moveSpeed=sprint?8.4:4.85;heroBody.desiredVelocity.copy(move).multiplyScalar(dodgeT>0?2.5:moveSpeed);
  let angularSpeed=0;if(move.lengthSq()>0){const targetYaw=Math.atan2(move.x,move.z),delta=THREE.MathUtils.euclideanModulo(targetYaw-hero.rotation.y+Math.PI,Math.PI*2)-Math.PI;angularSpeed=delta/Math.max(dt,.001);hero.rotation.y+=delta*(1-Math.exp(-dt*(sprint?15:12)));if(sprint)stamina=Math.max(0,stamina-dt*18);else stamina=Math.min(100,stamina+dt*9);}else stamina=Math.min(100,stamina+dt*13);
  physics.stepCharacter(heroBody,simDt);hero.position.copy(heroBody.position);heroAnim.setLocomotion({speed:Math.hypot(heroBody.velocity.x,heroBody.velocity.z),angularSpeed,grounded:heroBody.grounded,combat:enemyHp>0&&hero.position.distanceTo(enemy.position)<14,dt:Math.max(simDt,.001)});const rootDelta=heroAnim.update(simDt,heroBody.desiredVelocity,fwd);if(['attack','dodge'].includes(heroAnim.state)&&rootDelta.length()<.85){tmp.set(rootDelta.x,0,rootDelta.z).applyAxisAngle(worldUp,hero.rotation.y);hero.position.add(tmp);heroBody.position.copy(hero.position);}
  if(attackWindow&&attackT<.35&&attackT>.25){attackWindow=false;if(enemyHp>0&&hero.position.distanceTo(enemy.position)<3.3){enemyHp=Math.max(0,enemyHp-17);enemyAnim.trigger('enemyHit',{fade:.025});vfx.impact(enemy.position.clone().add(new THREE.Vector3(0,1.42,0)),{count:20,scale:1});audio.playImpact(enemy.position,1);}}
  if(enemyHp<=0&&enemyBrain.state!=='dead'){enemyBrain.kill();enemyTelegraph?.dispose();enemyTelegraph=null;}
  if(enemyHp>0){tmp.subVectors(hero.position,enemy.position);const targetAngle=Math.atan2(tmp.x,tmp.z),ed=THREE.MathUtils.euclideanModulo(targetAngle-enemy.rotation.y+Math.PI,Math.PI*2)-Math.PI;enemy.rotation.y+=ed*(1-Math.exp(-dt*9));const ai=enemyBrain.update(simDt);if(ai.damage){hp=Math.max(0,hp-(guardT>0?Math.ceil(ai.damage*.3):ai.damage));if(hp>0)heroAnim.trigger('hit',{fade:.025});}
    if(enemyBrain.state==='windup'){if(!enemyTelegraph)enemyTelegraph=vfx.createTelegraph(enemy.position,{radius:2.6});enemyTelegraph.mesh.position.x=enemy.position.x;enemyTelegraph.mesh.position.z=enemy.position.z;enemyTelegraph.mesh.position.y=heightFn(enemy.position.x,enemy.position.z)+.04;enemyTelegraph.set(ai.telegraph||0);}else if(enemyTelegraph){enemyTelegraph.dispose();enemyTelegraph=null;}
    physics.stepCharacter(enemyBody,simDt);enemy.position.copy(enemyBody.position);enemyAnim.setLocomotion({speed:Math.hypot(enemyBody.velocity.x,enemyBody.velocity.z),angularSpeed:ed/Math.max(dt,.001),combat:true,grounded:enemyBody.grounded,dt:Math.max(simDt,.001)});enemyAnim.update(simDt,enemyBody.desiredVelocity,tmp);
  }
  if(hp<=0&&heroAnim.state!=='death'){heroAnim.trigger('death',{fade:.08});heroBody.desiredVelocity.set(0,0,0);}
  heroShadow.update(hero.position,heightFn,.9);enemyShadow.update(enemy.position,heightFn,1.15);enemyShadow.mesh.visible=enemyHp>0;
  const combat=enemyHp>0&&hero.position.distanceTo(enemy.position)<16?1:0;audio.setCombatIntensity(combat,dt);rendering.update(dt,{combat,darkness:.58});lights.fill.position.lerp(hero.position.clone().add(new THREE.Vector3(0,6,4)),1-Math.exp(-dt*2));
  cameraRig.yaw=yaw;cameraRig.update(dt,{player:hero.position,target:enemyHp>0?enemy.position:null,combat:!!combat,impulse:vfx.impulse});
  updateHud(sprint,combat);
}

function updateHud(sprint,combat){document.querySelector('#hp').style.width=`${hp}%`;document.querySelector('#stamina').style.width=`${stamina}%`;document.querySelector('#enemyHp').style.width=`${enemyHp}%`;document.querySelector('#hpText').textContent=`${Math.ceil(hp)} / 100`;document.querySelector('#staminaText').textContent=Math.ceil(stamina);document.querySelector('#targetCard').classList.toggle('hidden',!combat||enemyHp<=0);document.querySelector('#status').textContent=hp<=0?'DOWNED':guardT>0?'GUARDING':dodgeT>0?'EVADING':sprint?'SPRINTING':combat?'ENGAGED':'READY';document.querySelector('#cd1').textContent=attackT>0?attackT.toFixed(1):'';document.querySelector('#cd2').textContent=riftT>0?riftT.toFixed(1):'';document.querySelector('#cd3').textContent=guardT>0?guardT.toFixed(1):'';document.querySelector('#cd4').textContent=dodgeT>0?dodgeT.toFixed(1):'';const card=document.querySelector('#targetCard');card.dataset.state=enemyBrain.state;}

const clock=new THREE.Clock();function loop(){requestAnimationFrame(loop);update(Math.min(clock.getDelta(),.033));rendering.composer.render();}loop();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);rendering.resize(innerWidth,innerHeight);});
