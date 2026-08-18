import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

const BASE='/assets/authored/kaykit-dungeon';
const TEXTURE_URL=`${BASE}/dungeon_texture.png`;
const SOURCES={pillar:`${BASE}/pillar_decorated.obj`,crates:`${BASE}/crates_stacked.obj`,barrel:`${BASE}/barrel_large_decorated.obj`,brokenWall:`${BASE}/wall_broken.obj`,doorway:`${BASE}/wall_doorway.obj`,stairs:`${BASE}/stairs_wide.obj`};

function tune(object,material){let triangles=0,meshes=0;object.traverse(node=>{if(!node.isMesh)return;meshes++;const geometry=node.geometry,count=geometry?.index?.count??geometry?.attributes?.position?.count??0;triangles+=Math.floor(count/3);node.castShadow=true;node.receiveShadow=true;node.material=material;});return{triangles,meshes};}
function ground(object,heightFn,x,z,yOffset=0){object.position.set(x,heightFn(x,z)+yOffset,z);}
function clonePlaced(source,{x,z,rotation=0,scale=1,heightFn,kind,yOffset=0}){const clone=source.clone(true);clone.rotation.y=rotation;clone.scale.setScalar(scale);ground(clone,heightFn,x,z,yOffset);clone.userData.authoredHeroAsset=true;clone.userData.authoredKind=kind;return clone;}
function suppressProceduralNear(scene,anchors,radius=3.6){const ruin=scene.getObjectByName('RuinArena');if(!ruin)return 0;let hidden=0;for(const child of ruin.children){if(child.name==='GroundDetail'||child.type==='Mesh'&&child.geometry?.type==='RingGeometry')continue;const p=child.position;for(const anchor of anchors){if(Math.hypot(p.x-anchor.x,p.z-anchor.z)<=radius){child.visible=false;child.userData.suppressedByAuthoredEnvironment=true;hidden++;break;}}}return hidden;}

export async function installHybridEnvironment({scene,heightFn}){
  const status={target:'high-end OSRS/07Scape',source:'KayKit Dungeon Remastered CC0 authored hero modules',ready:false,accepted:false,error:null,texture:null,assets:{},instances:0,landmarks:0,suppressedProcedural:0,triangles:0,doorwayHeroPlacement:false,centralWallHeroPlacement:false,stairsHeroPlacement:false,note:'Authored hierarchy and procedural suppression are structural only; screenshot critic still controls visual approval.'};window.__GAUNTLET_HYBRID_ENVIRONMENT__=status;
  try{
    const texture=await new THREE.TextureLoader().loadAsync(TEXTURE_URL);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;texture.needsUpdate=true;
    const authoredMaterial=new THREE.MeshStandardMaterial({map:texture,color:0xa7aa9a,roughness:.95,metalness:.002,envMapIntensity:.12});status.texture={url:TEXTURE_URL,colorSpace:'srgb',authoredAtlas:true};const loader=new OBJLoader(),loaded={};
    await Promise.all(Object.entries(SOURCES).map(async([kind,url])=>{const object=await loader.loadAsync(url),audit=tune(object,authoredMaterial);status.assets[kind]={url,...audit};loaded[kind]=object;}));
    const root=new THREE.Group();root.name='AuthoredHeroEnvironment';root.userData.authoredHeroEnvironment=true;
    const placements=[
      // Open south approach: no doorway, broad wall or misoriented stairs modules on the combat camera axis.
      ['pillar',{x:-2.15,z:-11.15,rotation:.1,scale:1.04,kind:'pillar'}],['pillar',{x:2.15,z:-11.05,rotation:-.1,scale:1.02,kind:'pillar'}],
      ['pillar',{x:-3.55,z:-10.7,rotation:.18,scale:.78,kind:'pillar'}],['pillar',{x:3.55,z:-10.6,rotation:-.16,scale:.8,kind:'pillar'}],
      ['crates',{x:-4.25,z:-9.55,rotation:.5,scale:.7,kind:'crates'}],['barrel',{x:4.15,z:-9.7,rotation:-.35,scale:.7,kind:'barrel'}],['barrel',{x:-2.85,z:-9.25,rotation:.25,scale:.58,kind:'barrel'}],
      // West landmark: asymmetrical ruin mass remains outside the hero axis.
      ['brokenWall',{x:-10.4,z:-.7,rotation:Math.PI*.48,scale:1.05,kind:'brokenWall'}],['pillar',{x:-9.45,z:2.05,rotation:1.7,scale:.86,kind:'pillar'}],['crates',{x:-8.55,z:-2.5,rotation:-.42,scale:.9,kind:'crates'}],['barrel',{x:-7.75,z:-3.05,rotation:.3,scale:.84,kind:'barrel'}],
      // North-east landmark: smaller supply/ruin story.
      ['brokenWall',{x:8.8,z:6.8,rotation:-.72,scale:.92,kind:'brokenWall'}],['crates',{x:7.15,z:8.15,rotation:.88,scale:.86,kind:'crates'}],['barrel',{x:6.3,z:8.7,rotation:-.2,scale:.8,kind:'barrel'}],['barrel',{x:9.65,z:5.25,rotation:1.18,scale:.76,kind:'barrel'}],['pillar',{x:10.2,z:8.15,rotation:-.2,scale:.76,kind:'pillar'}]
    ];
    const landmarkAnchors=[{x:0,z:-10.7},{x:-9.7,z:-.2},{x:8.5,z:7.0}];for(const[kind,opts]of placements){root.add(clonePlaced(loaded[kind],{...opts,heightFn}));status.instances++;status.triangles+=status.assets[kind]?.triangles||0;}
    status.landmarks=landmarkAnchors.length;status.suppressedProcedural=suppressProceduralNear(scene,landmarkAnchors,3.25);scene.add(root);status.ready=true;status.root=root.name;return root;
  }catch(error){status.error=String(error?.message||error);throw error;}
}
