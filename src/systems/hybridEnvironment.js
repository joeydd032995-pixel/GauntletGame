import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

const BASE='/assets/authored/kaykit-dungeon';
const SOURCES={
  pillar:`${BASE}/pillar_decorated.obj`,
  crates:`${BASE}/crates_stacked.obj`,
  barrel:`${BASE}/barrel_large_decorated.obj`
};
const stone=new THREE.MeshStandardMaterial({color:0x6f7468,roughness:.9,metalness:.02});
const wood=new THREE.MeshStandardMaterial({color:0x745038,roughness:.86,metalness:.01});
const iron=new THREE.MeshStandardMaterial({color:0x55585a,roughness:.72,metalness:.38});

function tune(object,kind){
  let triangles=0,meshes=0;
  object.traverse(node=>{if(!node.isMesh)return;meshes++;const geometry=node.geometry;const count=geometry?.index?.count??geometry?.attributes?.position?.count??0;triangles+=Math.floor(count/3);node.castShadow=true;node.receiveShadow=true;node.material=kind==='pillar'?stone:kind==='barrel'?wood:wood;});
  return {triangles,meshes};
}
function ground(object,heightFn,x,z,yOffset=0){object.position.set(x,heightFn(x,z)+yOffset,z);}
function clonePlaced(source,{x,z,rotation=0,scale=1,heightFn,kind}){const clone=source.clone(true);clone.rotation.y=rotation;clone.scale.setScalar(scale);ground(clone,heightFn,x,z);clone.userData.authoredHeroAsset=true;clone.userData.authoredKind=kind;return clone;}

export async function installHybridEnvironment({scene,heightFn}){
  const status={target:'high-end OSRS/07Scape',source:'KayKit Dungeon Remastered CC0 authored-hero baseline',ready:false,accepted:false,error:null,assets:{},instances:0,triangles:0,note:'Structural authored environment presence is not visual approval.'};
  window.__GAUNTLET_HYBRID_ENVIRONMENT__=status;
  try{
    const loader=new OBJLoader();
    const [pillar,crates,barrel]=await Promise.all(Object.entries(SOURCES).map(async([kind,url])=>{const object=await loader.loadAsync(url);const audit=tune(object,kind);status.assets[kind]={url,...audit};return object;}));
    const root=new THREE.Group();root.name='AuthoredHeroEnvironment';root.userData.authoredHeroEnvironment=true;
    const placements=[
      [pillar,{x:-8.8,z:-6.2,rotation:.28,scale:1.15,kind:'pillar'}],
      [pillar,{x:8.6,z:5.8,rotation:Math.PI+.16,scale:1.08,kind:'pillar'}],
      [pillar,{x:-10.2,z:5.4,rotation:1.34,scale:.92,kind:'pillar'}],
      [crates,{x:-6.4,z:8.4,rotation:-.54,scale:.92,kind:'crates'}],
      [crates,{x:7.3,z:-8.3,rotation:2.12,scale:.84,kind:'crates'}],
      [barrel,{x:-5.6,z:9.5,rotation:.45,scale:.92,kind:'barrel'}],
      [barrel,{x:6.2,z:-9.0,rotation:-.7,scale:.88,kind:'barrel'}],
      [barrel,{x:10.4,z:2.9,rotation:1.4,scale:.78,kind:'barrel'}]
    ];
    for(const[source,opts]of placements){root.add(clonePlaced(source,{...opts,heightFn}));status.instances++;const a=status.assets[opts.kind];status.triangles+=a?.triangles||0;}
    scene.add(root);
    status.ready=true;
    status.root=root.name;
    return root;
  }catch(error){status.error=String(error?.message||error);throw error;}
}
