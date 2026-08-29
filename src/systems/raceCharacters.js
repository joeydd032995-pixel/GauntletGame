import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';

export const RACE_ORDER=['cairnborn','brinesworn','myceliad','veylkin','echoed'];
const MANIFEST_URL='/assets/races/manifest.json';
const loader=new GLTFLoader();
let manifestPromise=null;
const cache=new Map();
const clean=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const PIVOT_NAMES=['torso','head','upper_arm_L','upper_arm_R','forearm_L','forearm_R','thigh_L','thigh_R','shin_L','shin_R'];

function manifest(){return manifestPromise??=fetch(MANIFEST_URL,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`race manifest ${r.status}`);return r.json();});}
function load(url){if(!cache.has(url))cache.set(url,loader.loadAsync(url).catch(e=>{cache.delete(url);throw e;}));return cache.get(url);}
function cloneScene(source){return cloneSkeleton(source);}
function isInsideRace(mesh,layer){for(let p=mesh;p;p=p.parent)if(p===layer)return true;return false;}
function tune(root){
  let triangles=0,meshes=0,skinnedMeshes=0,bones=0,materials=0;const seen=new Set();
  root.traverse(o=>{if(o.isBone)bones++;if(!o.isMesh)return;meshes++;if(o.isSkinnedMesh)skinnedMeshes++;o.castShadow=true;o.receiveShadow=true;o.frustumCulled=true;
    const g=o.geometry,count=g?.index?.count??g?.attributes?.position?.count??0;triangles+=Math.floor(count/3);
    const list=Array.isArray(o.material)?o.material:[o.material];for(const m of list){if(!m)continue;if(!seen.has(m)){seen.add(m);materials++;}if('roughness'in m)m.roughness=Math.max(.62,m.roughness??.8);if('envMapIntensity'in m)m.envMapIntensity=.28;m.needsUpdate=true;}
  });return{triangles,meshes,skinnedMeshes,bones,materials};
}
function capturePivots(root,allowMissing=false){
  const pivots={};for(const n of PIVOT_NAMES){const o=root.getObjectByName(n);if(o)pivots[n]={o,base:o.rotation.clone()};}
  const missing=PIVOT_NAMES.filter(n=>!pivots[n]);if(missing.length&&!allowMissing)throw new Error(`Race LOD missing animation pivots: ${missing.join(', ')}`);
  return pivots;
}
function animate(pivots,state,speed,time){
  const set=(name,x=0,y=0,z=0)=>{const p=pivots[name];if(!p)return;p.o.rotation.set(p.base.x+x,p.base.y+y,p.base.z+z);};
  const move=Math.min(1,speed/5),freq=speed>6?11:7.5,gait=Math.sin(time*freq)*move;
  set('upper_arm_L', gait*.34,0,0);set('upper_arm_R',-gait*.34,0,0);
  set('forearm_L',Math.max(0,-gait)*.20,0,0);set('forearm_R',Math.max(0,gait)*.20,0,0);
  set('thigh_L',-gait*.48,0,0);set('thigh_R',gait*.48,0,0);
  set('shin_L',Math.max(0,gait)*.36,0,0);set('shin_R',Math.max(0,-gait)*.36,0,0);
  set('torso',0,0,-gait*.025);set('head',0,gait*.018,0);
  if(state==='attack'){set('torso',-.12,.16,0);set('upper_arm_R',-.95,-.1,-.18);set('forearm_R',-.65,0,0);}
  else if(state==='rift'){set('upper_arm_L',-.5,0,-.3);set('upper_arm_R',-.5,0,.3);set('forearm_L',-.45,0,0);set('forearm_R',-.45,0,0);}
  else if(state==='guard'||state==='parry'){set('upper_arm_L',-.58,0,-.18);set('upper_arm_R',-.58,0,.18);set('forearm_L',-.7,0,0);set('forearm_R',-.7,0,0);}
  else if(state==='dodge')set('torso',-.28,0,gait*.05);
  else if(state==='hit')set('torso',.16,0,.10);
  else if(state==='death')set('torso',0,0,1.15);
}
function requestedRace(){
  const q=new URLSearchParams(location.search).get('race');
  const saved=localStorage.getItem('gauntlet.race');
  const key=clean(q||saved||'cairnborn');
  return RACE_ORDER.find(r=>clean(r)===key)||'cairnborn';
}

export function installRaceCharacterSystem(heroRoot){
  const layer=new THREE.Group();layer.name='GauntletRaceLayer';layer.userData.raceCharacterRoot=true;heroRoot.add(layer);
  const status={target:'high-end OSRS/07Scape',source:'Higgsfield locked Character Elements',ready:false,current:null,faction:null,elementId:null,referenceLock:null,generatorVersion:null,error:null,triangles:0,heroTriangles:0,meshes:0,skinnedMeshes:0,bones:0,materials:0,productionMesh:true,skinnedMesh:true,skinning:'weighted-skeletal',rigType:'skinned-humanoid',previewUnaccepted:false,lod:'hero',lodReady:{hero:false,mid:false,far:false},lodError:null,lodDistances:{heroMax:11,midMax:24}};
  let lodScenes={hero:null,mid:null,far:null},lodReports={hero:null,mid:null,far:null},activeLod='hero',pivots={},token=0,time=0,lodOverride=null;

  function suppressLegacy(){
    heroRoot.traverse(o=>{if(!o.isMesh)return;if(isInsideRace(o,layer)){o.userData.raceCharacter=true;}else{o.visible=false;o.userData.hiddenByRaceCharacter=true;}});
  }
  function activateLod(next){
    const scene=lodScenes[next];if(!scene||next===activeLod)return false;
    for(const [key,value] of Object.entries(lodScenes))if(value)value.visible=key===next;
    activeLod=next;pivots=capturePivots(scene,status.previewUnaccepted);const report=lodReports[next];
    status.lod=next;status.triangles=report?.triangles||status.triangles;status.meshes=report?.meshes||status.meshes;status.skinnedMeshes=report?.skinnedMeshes||status.skinnedMeshes;status.bones=report?.bones||status.bones;status.materials=report?.materials||status.materials;
    return true;
  }
  async function prepareLod(entry,lod,generation){
    const field=`${lod}Url`,url=entry[field];if(!url)return;
    try{
      const gltf=await load(url);if(generation!==token)return;
      const scene=cloneScene(gltf.scene);scene.name=`RaceVisual:${entry.label}:${lod}`;scene.userData.raceCharacter=true;scene.userData.lod=lod;scene.userData.previewUnaccepted=entry.previewUnaccepted===true;scene.visible=lod==='hero';
      const report=tune(scene);const preview=entry.previewUnaccepted===true;
      if(!preview&&(report.skinnedMeshes<1||report.bones<20))throw new Error(`Race ${entry.key}/${lod} is not a valid skinned humanoid: ${JSON.stringify(report)}`);
      capturePivots(scene,preview);lodScenes[lod]=scene;lodReports[lod]=report;layer.add(scene);status.lodReady[lod]=true;
      if(lod==='hero'){activeLod='hero';pivots=capturePivots(scene,preview);status.triangles=report.triangles;status.heroTriangles=report.triangles;status.meshes=report.meshes;status.skinnedMeshes=report.skinnedMeshes;status.bones=report.bones;status.materials=report.materials;}
    }catch(error){if(generation!==token)return;if(lod==='hero')throw error;status.lodError=`${lod}: ${String(error?.message||error)}`;console.warn(`Race ${lod} LOD load failed`,error);}
  }
  async function setRace(key){
    key=RACE_ORDER.includes(clean(key))?clean(key):key;
    const generation=++token;status.ready=false;status.error=null;status.lodError=null;status.lod='hero';status.lodReady={hero:false,mid:false,far:false};activeLod='hero';lodScenes={hero:null,mid:null,far:null};lodReports={hero:null,mid:null,far:null};pivots={};layer.clear();
    try{
      const mf=await manifest(),entry=mf.races.find(r=>r.key===key)||mf.races.find(r=>r.key===mf.defaultRace);if(!entry)throw new Error(`Unknown race ${key}`);
      status.previewUnaccepted=entry.previewUnaccepted===true;status.lodDistances=mf.lodDistances||status.lodDistances;
      const heroUrl=entry.heroUrl||entry.url;if(!heroUrl)throw new Error(`Race ${entry.key} has no hero URL`);
      const heroEntry={...entry,heroUrl};await prepareLod(heroEntry,'hero',generation);if(generation!==token)return;
      status.current=entry.key;status.label=entry.label;status.faction=entry.faction;status.elementId=entry.elementId;status.referenceLock=entry.referenceLock?{...entry.referenceLock}:null;status.generatorVersion=entry.generatorVersion||mf.generatorVersion||null;status.ready=true;status.productionMesh=entry.productionMesh===true;status.skinnedMesh=entry.skinnedMesh===true;status.skinning=entry.skinning||'weighted-skeletal';status.rigType=entry.rigType||'skinned-humanoid';
      localStorage.setItem('gauntlet.race',entry.key);window.dispatchEvent(new CustomEvent('gauntlet-race-change',{detail:snapshot()}));suppressLegacy();
      Promise.allSettled([prepareLod(entry,'mid',generation),prepareLod(entry,'far',generation)]).then(()=>{if(generation===token)window.dispatchEvent(new CustomEvent('gauntlet-race-lod-ready',{detail:snapshot()}));});
    }catch(error){status.error=String(error?.message||error);status.ready=false;console.error('Race character load failed',error);}
  }
  function desiredLod(distance){if(lodOverride)return lodOverride;const d=Math.max(0,Number(distance)||0),cuts=status.lodDistances||{};if(d<=(cuts.heroMax??11))return'hero';if(d<=(cuts.midMax??24))return'mid';return'far';}
  function update(dt,state,speed,distance=0){time+=dt;if(!status.ready)return;const wanted=desiredLod(distance);if(lodScenes[wanted])activateLod(wanted);animate(pivots,state,speed,time);suppressLegacy();}
  function snapshot(){return{...status,referenceLock:status.referenceLock?{...status.referenceLock}:null,lodReady:{...status.lodReady},available:[...RACE_ORDER]};}
  function setLodOverride(value=null){lodOverride=['hero','mid','far'].includes(value)?value:null;const wanted=desiredLod(0);if(lodScenes[wanted])activateLod(wanted);return snapshot();}
  const api={setRace,update,snapshot,setLodOverride,layer,status};window.__GAUNTLET_RACES__=api;setRace(requestedRace());return api;
}
