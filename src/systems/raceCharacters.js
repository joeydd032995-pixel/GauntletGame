import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const RACE_ORDER=['cairnborn','brinesworn','myceliad','veylkin','echoed'];
const MANIFEST_URL='/assets/races/manifest.json';
const loader=new GLTFLoader();
let manifestPromise=null;
const cache=new Map();
const clean=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'');

function manifest(){return manifestPromise??=fetch(MANIFEST_URL,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(\`race manifest \${r.status}\`);return r.json();});}
function load(url){if(!cache.has(url))cache.set(url,loader.loadAsync(url).catch(e=>{cache.delete(url);throw e;}));return cache.get(url);}
function cloneScene(source){return source.clone(true);}
function isInsideRace(mesh,layer){for(let p=mesh;p;p=p.parent)if(p===layer)return true;return false;}
function tune(root){
  let triangles=0,meshes=0,materials=0;const seen=new Set();
  root.traverse(o=>{if(!o.isMesh)return;meshes++;o.castShadow=true;o.receiveShadow=true;o.frustumCulled=true;
    const g=o.geometry,count=g?.index?.count??g?.attributes?.position?.count??0;triangles+=Math.floor(count/3);
    const list=Array.isArray(o.material)?o.material:[o.material];for(const m of list){if(!m)continue;if(!seen.has(m)){seen.add(m);materials++;}if('roughness'in m)m.roughness=Math.max(.62,m.roughness??.8);if('envMapIntensity'in m)m.envMapIntensity=.28;m.needsUpdate=true;}
  });return{triangles,meshes,materials};
}
function capturePivots(root){
  const names=['torso','head','upper_arm_L','upper_arm_R','forearm_L','forearm_R','thigh_L','thigh_R','shin_L','shin_R'];
  const pivots={};for(const n of names){const o=root.getObjectByName(n);if(o)pivots[n]={o,base:o.rotation.clone()};}return pivots;
}
function animate(pivots,state,speed,time,dt){
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
  const status={target:'high-end OSRS/07Scape',source:'Higgsfield locked Character Elements',ready:false,current:null,faction:null,elementId:null,error:null,triangles:0,meshes:0,materials:0,productionMesh:false,rigType:'articulated-rigid-part'};
  let model=null,pivots={},token=0,time=0;
  async function setRace(key){
    key=RACE_ORDER.includes(clean(key))?clean(key):key;
    const generation=++token;status.ready=false;status.error=null;
    try{
      const mf=await manifest(),entry=mf.races.find(r=>r.key===key)||mf.races.find(r=>r.key===mf.defaultRace);
      if(!entry)throw new Error(\`Unknown race \${key}\`);
      const gltf=await load(entry.url);if(generation!==token)return;
      layer.clear();model=cloneScene(gltf.scene);model.name=\`RaceVisual:\${entry.label}\`;model.userData.raceCharacter=true;
      const report=tune(model);layer.add(model);pivots=capturePivots(model);
      status.current=entry.key;status.label=entry.label;status.faction=entry.faction;status.elementId=entry.elementId;status.triangles=report.triangles;status.meshes=report.meshes;status.materials=report.materials;status.ready=true;
      localStorage.setItem('gauntlet.race',entry.key);
      window.dispatchEvent(new CustomEvent('gauntlet-race-change',{detail:snapshot()}));
      suppressLegacy();
    }catch(error){status.error=String(error?.message||error);status.ready=false;console.error('Race character load failed',error);}
  }
  function suppressLegacy(){
    heroRoot.traverse(o=>{if(!o.isMesh)return;if(isInsideRace(o,layer)){o.visible=true;o.userData.raceCharacter=true;}else{o.visible=false;o.userData.hiddenByRaceCharacter=true;}});
  }
  function update(dt,state,speed){time+=dt;if(model&&status.ready){animate(pivots,state,speed,time,dt);suppressLegacy();}}
  function snapshot(){return{...status,available:[...RACE_ORDER]};}
  const api={setRace,update,snapshot,layer,status};
  window.__GAUNTLET_RACES__=api;
  setRace(requestedRace());
  return api;
}
