import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const SOURCES={
  hero:{url:'/assets/authored/kaykit-adventurers/Knight.glb',label:'Vanguard / KayKit Knight CC0',height:2.48,bulk:1.02},
  enemy:{url:'/assets/authored/kaykit-adventurers/Barbarian.glb',label:'Dread Warden / KayKit Barbarian CC0',height:2.72,bulk:1.08}
};

const STATE_KEYWORDS={
  idle:[['idle'],['standing']],
  walk:[['walk'],['walking']],
  run:[['run'],['running'],['jog']],
  sprint:[['sprint'],['run'],['running']],
  attack:[['attack','melee'],['attack','1'],['attack'],['slash'],['swing']],
  rift:[['attack','spell'],['cast'],['spell'],['attack','2'],['attack']],
  guard:[['block'],['guard'],['defend'],['idle']],
  parry:[['block'],['parry'],['guard'],['attack']],
  dodge:[['roll'],['dodge'],['evade'],['jump']],
  hit:[['hit'],['damage'],['hurt']],
  death:[['death'],['die'],['dead']],
  turnLeft:[['turn','left'],['walk']],
  turnRight:[['turn','right'],['walk']],
  enemyIdle:[['idle'],['standing']],
  enemyWalk:[['walk'],['walking']],
  enemyRun:[['run'],['running'],['walk']],
  enemyAttack:[['attack','melee'],['attack','1'],['attack'],['swing']],
  enemyHeavy:[['attack','heavy'],['attack','2'],['attack'],['swing']],
  enemyHit:[['hit'],['damage'],['hurt']],
  enemyStagger:[['hit'],['damage'],['hurt']],
  enemyDeath:[['death'],['die'],['dead']]
};
const ONCE=new Set(['attack','rift','parry','dodge','hit','death','enemyAttack','enemyHeavy','enemyHit','enemyStagger','enemyDeath']);

const clean=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function scoreClip(name,terms){const n=clean(name);let score=0;for(const term of terms){if(!n.includes(term))return-1;score+=term.length*4;}if(n===terms.join(' '))score+=30;return score-n.length*.03;}
function resolveClip(clips,state){
  const patterns=STATE_KEYWORDS[state]||STATE_KEYWORDS.idle;let winner=null,best=-Infinity;
  for(let p=0;p<patterns.length;p++)for(const clip of clips){const score=scoreClip(clip.name,patterns[p])-p*12;if(score>best){best=score;winner=clip;}}
  return winner||clips[0]||null;
}
function materialDirection(material){
  if(!material)return material;const m=material.clone();
  if('roughness'in m)m.roughness=Math.max(.56,m.roughness??.7);
  if('metalness'in m)m.metalness=Math.min(.38,m.metalness??0);
  if('envMapIntensity'in m)m.envMapIntensity=Math.min(.48,m.envMapIntensity??.4);
  if('clearcoat'in m)m.clearcoat=Math.min(.08,m.clearcoat??0);
  m.needsUpdate=true;return m;
}
function tuneAndMeasure(model){
  let triangles=0,meshes=0,skinnedMeshes=0,materials=0;const seenMaterials=new Set();
  model.traverse(o=>{if(!o.isMesh)return;meshes++;if(o.isSkinnedMesh)skinnedMeshes++;o.castShadow=true;o.receiveShadow=true;o.frustumCulled=true;
    if(Array.isArray(o.material))o.material=o.material.map(m=>materialDirection(m));else o.material=materialDirection(o.material);
    const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats)if(m&&!seenMaterials.has(m)){seenMaterials.add(m);materials++;}
    const g=o.geometry;if(g){const count=g.index?.count??g.attributes?.position?.count??0;triangles+=Math.floor(count/3);}
  });
  return{triangles,meshes,skinnedMeshes,materials};
}
function normalizeModel(model,targetHeight,bulk){
  model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());if(!Number.isFinite(size.y)||size.y<.01)throw new Error(`Invalid authored character bounds ${size.y}`);
  const scale=targetHeight/size.y;model.scale.set(scale*bulk,scale,scale*bulk);model.updateMatrixWorld(true);const normalized=new THREE.Box3().setFromObject(model);model.position.y-=normalized.min.y;model.updateMatrixWorld(true);return{sourceHeight:size.y,targetHeight,scale};
}
function captureLegacyMeshes(rig){const meshes=[];rig.group.traverse(o=>{if(o.isMesh)meshes.push(o);});return meshes;}
function countVisible(list){return list.reduce((n,o)=>n+(o.visible?1:0),0);}
function makeActor(role,rig,source){
  const status={role,source:source.label,url:source.url,ready:false,installed:false,error:null,clips:[],clipMap:{},triangles:0,meshes:0,skinnedMeshes:0,materials:0,visibleProceduralMeshes:0,currentState:null,currentClip:null};
  const legacy=captureLegacyMeshes(rig),loader=new GLTFLoader();let mixer=null,currentAction=null,model=null;
  const load=new Promise(resolve=>loader.load(source.url,gltf=>{
    try{
      model=gltf.scene;model.name=role==='hero'?'VanguardAuthoredPresentation':'WardenAuthoredPresentation';model.userData.authoredCharacter=true;model.userData.license='CC0-1.0';
      const metrics=tuneAndMeasure(model),normalization=normalizeModel(model,source.height,source.bulk);rig.group.add(model);for(const m of legacy)m.visible=false;
      mixer=new THREE.AnimationMixer(model);status.clips=gltf.animations.map(c=>c.name);for(const state of Object.keys(STATE_KEYWORDS)){const clip=resolveClip(gltf.animations,state);if(clip)status.clipMap[state]=clip.name;}
      Object.assign(status,metrics,{normalization,ready:true,installed:true,visibleProceduralMeshes:countVisible(legacy)});resolve(status);
    }catch(error){status.ready=true;status.error=String(error?.message||error);resolve(status);}
  },undefined,error=>{status.ready=true;status.error=String(error?.message||error);resolve(status);}));
  function setState(state,speed=0){
    if(!mixer||!model||!status.installed)return;const clipName=status.clipMap[state]||status.clipMap.idle;if(!clipName)return;if(status.currentState===state&&currentAction)return;
    const clip=THREE.AnimationClip.findByName(mixer._root?.animations||[],clipName)||null;
    const resolved=clip||resolveClip(Array.from(mixer._actions||[]).map(a=>a?._clip).filter(Boolean),state);
    const actual=resolved||null;if(!actual)return;
    const next=mixer.clipAction(actual);next.enabled=true;next.clampWhenFinished=ONCE.has(state);next.setLoop(ONCE.has(state)?THREE.LoopOnce:THREE.LoopRepeat,ONCE.has(state)?1:Infinity);next.reset();
    const locomotion=['walk','run','sprint','enemyWalk','enemyRun'].includes(state);next.timeScale=locomotion?THREE.MathUtils.clamp((speed||1)/(state.includes('Walk')||state==='walk'?2.5:5.2),.72,1.42):1;
    next.fadeIn(currentAction?.isRunning?.()?.07:.02).play();if(currentAction&&currentAction!==next)currentAction.fadeOut(.09);currentAction=next;status.currentState=state;status.currentClip=actual.name;
  }
  function update(dt,state,speed){if(mixer){setState(state,speed);mixer.update(dt);}status.visibleProceduralMeshes=countVisible(legacy);}
  return{status,load,update,get model(){return model;}};
}

export function installAuthoredCharacterPresentation({heroRig,enemyRig}){
  const hero=makeActor('hero',heroRig,SOURCES.hero),enemy=makeActor('enemy',enemyRig,SOURCES.enemy),status={target:'high-end OSRS/07Scape',ready:false,accepted:false,hero:hero.status,enemy:enemy.status,error:null};
  const ready=Promise.all([hero.load,enemy.load]).then(()=>{status.ready=true;const errors=[hero.status.error,enemy.status.error].filter(Boolean);status.error=errors.length?errors.join(' | '):null;return status;});
  function update(dt,{heroState='idle',enemyState='enemyIdle',heroSpeed=0,enemySpeed=0}={}){hero.update(dt,heroState,heroSpeed);enemy.update(dt,enemyState,enemySpeed);}
  return{status,ready,update};
}
