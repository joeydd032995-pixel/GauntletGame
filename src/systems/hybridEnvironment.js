import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

const BASE='/assets/authored/kaykit-dungeon';
const SOURCES={
  pillar:`${BASE}/pillar_decorated.obj`,
  crates:`${BASE}/crates_stacked.obj`,
  barrel:`${BASE}/barrel_large_decorated.obj`,
  brokenWall:`${BASE}/wall_broken.obj`,
  archedWall:`${BASE}/wall_arched.obj`,
  stairs:`${BASE}/stairs_wide.obj`
};
const stone=new THREE.MeshStandardMaterial({color:0x77766b,roughness:.92,metalness:.01});
const weatheredStone=new THREE.MeshStandardMaterial({color:0x686b61,roughness:.96,metalness:0});
const wood=new THREE.MeshStandardMaterial({color:0x684a34,roughness:.9,metalness:.01});

function materialFor(kind){if(kind==='barrel'||kind==='crates')return wood;if(kind==='brokenWall'||kind==='archedWall'||kind==='stairs')return weatheredStone;return stone;}
function tune(object,kind){
  let triangles=0,meshes=0;
  object.traverse(node=>{if(!node.isMesh)return;meshes++;const geometry=node.geometry;const count=geometry?.index?.count??geometry?.attributes?.position?.count??0;triangles+=Math.floor(count/3);node.castShadow=true;node.receiveShadow=true;node.material=materialFor(kind);});
  return {triangles,meshes};
}
function ground(object,heightFn,x,z,yOffset=0){object.position.set(x,heightFn(x,z)+yOffset,z);}
function clonePlaced(source,{x,z,rotation=0,scale=1,heightFn,kind,yOffset=0}){const clone=source.clone(true);clone.rotation.y=rotation;clone.scale.setScalar(scale);ground(clone,heightFn,x,z,yOffset);clone.userData.authoredHeroAsset=true;clone.userData.authoredKind=kind;return clone;}
function suppressProceduralNear(scene,anchors,radius=3.6){const ruin=scene.getObjectByName('RuinArena');if(!ruin)return 0;let hidden=0;for(const child of ruin.children){if(child.name==='GroundDetail'||child.type==='Mesh'&&child.geometry?.type==='RingGeometry')continue;const p=child.position;for(const anchor of anchors){if(Math.hypot(p.x-anchor.x,p.z-anchor.z)<=radius){child.visible=false;child.userData.suppressedByAuthoredEnvironment=true;hidden++;break;}}}return hidden;}

export async function installHybridEnvironment({scene,heightFn}){
  const status={target:'high-end OSRS/07Scape',source:'KayKit Dungeon Remastered CC0 authored hero modules',ready:false,accepted:false,error:null,assets:{},instances:0,landmarks:0,suppressedProcedural:0,triangles:0,note:'Authored hierarchy and procedural suppression are structural only; screenshot critic still controls visual approval.'};
  window.__GAUNTLET_HYBRID_ENVIRONMENT__=status;
  try{
    const loader=new OBJLoader();
    const loaded={};
    await Promise.all(Object.entries(SOURCES).map(async([kind,url])=>{const object=await loader.loadAsync(url);const audit=tune(object,kind);status.assets[kind]={url,...audit};loaded[kind]=object;}));
    const root=new THREE.Group();root.name='AuthoredHeroEnvironment';root.userData.authoredHeroEnvironment=true;
    const placements=[
      // South landmark: recognizable authored gateway/approach silhouette.
      ['archedWall',{x:0,z:-11.25,rotation:0,scale:1.22,kind:'archedWall'}],
      ['stairs',{x:0,z:-9.45,rotation:Math.PI,scale:1.08,kind:'stairs',yOffset:.01}],
      ['pillar',{x:-2.35,z:-10.95,rotation:.12,scale:1.06,kind:'pillar'}],
      ['pillar',{x:2.35,z:-10.95,rotation:-.12,scale:1.06,kind:'pillar'}],
      // West landmark: broken ruin mass, intentionally asymmetric.
      ['brokenWall',{x:-10.4,z:-.7,rotation:Math.PI*.48,scale:1.32,kind:'brokenWall'}],
      ['pillar',{x:-9.45,z:2.05,rotation:1.7,scale:.88,kind:'pillar'}],
      ['crates',{x:-8.55,z:-2.5,rotation:-.42,scale:.9,kind:'crates'}],
      ['barrel',{x:-7.75,z:-3.05,rotation:.3,scale:.84,kind:'barrel'}],
      // North-east landmark: smaller ruin/supply story to break radial repetition.
      ['brokenWall',{x:8.8,z:6.8,rotation:-.72,scale:1.02,kind:'brokenWall'}],
      ['crates',{x:7.15,z:8.15,rotation:.88,scale:.86,kind:'crates'}],
      ['barrel',{x:6.3,z:8.7,rotation:-.2,scale:.8,kind:'barrel'}],
      ['barrel',{x:9.65,z:5.25,rotation:1.18,scale:.76,kind:'barrel'}]
    ];
    const landmarkAnchors=[{x:0,z:-10.8},{x:-9.7,z:-.2},{x:8.5,z:7.0}];
    for(const[kind,opts]of placements){const source=loaded[kind];root.add(clonePlaced(source,{...opts,heightFn}));status.instances++;status.triangles+=status.assets[kind]?.triangles||0;}
    status.landmarks=landmarkAnchors.length;
    status.suppressedProcedural=suppressProceduralNear(scene,landmarkAnchors,3.75);
    scene.add(root);
    status.ready=true;status.root=root.name;
    return root;
  }catch(error){status.error=String(error?.message||error);throw error;}
}
