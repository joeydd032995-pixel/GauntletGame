import fs from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';

const ROOT=path.resolve('public/assets/races');
const RACES=['cairnborn','brinesworn','myceliad','veylkin','echoed'];
const PROBES=['upper_arm_R','forearm_R','thigh_L'];
const loader=new GLTFLoader();

async function loadGlb(file){
  const data=await fs.readFile(file);
  const ab=data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength);
  return loader.parseAsync(ab,'');
}
function findWeightedVertex(mesh,boneName){
  const boneIndex=mesh.skeleton?.bones?.findIndex(b=>b.name===boneName);
  if(boneIndex==null||boneIndex<0)return null;
  const si=mesh.geometry.getAttribute('skinIndex'),sw=mesh.geometry.getAttribute('skinWeight'),pos=mesh.geometry.getAttribute('position');
  if(!si||!sw||!pos)return null;
  for(let i=0;i<pos.count;i++)for(let j=0;j<4;j++)if(si.getComponent(i,j)===boneIndex&&sw.getComponent(i,j)>.15)return{i,boneIndex};
  return null;
}
function vertexPosition(mesh,index){
  const v=new THREE.Vector3().fromBufferAttribute(mesh.geometry.getAttribute('position'),index);
  mesh.applyBoneTransform(index,v);
  return v;
}
function validateProbe(scene,meshes,boneName){
  for(const mesh of meshes){
    const hit=findWeightedVertex(mesh,boneName);if(!hit)continue;
    const bone=mesh.skeleton.bones[hit.boneIndex];
    scene.updateMatrixWorld(true);mesh.skeleton.update();
    const before=vertexPosition(mesh,hit.i);
    const base=bone.rotation.clone();bone.rotation.x+=0.35;scene.updateMatrixWorld(true);mesh.skeleton.update();
    const after=vertexPosition(mesh,hit.i);bone.rotation.copy(base);scene.updateMatrixWorld(true);mesh.skeleton.update();
    const delta=before.distanceTo(after);
    if(delta>.005)return{mesh:mesh.name,vertex:hit.i,delta:+delta.toFixed(6)};
  }
  throw new Error(`No deforming weighted vertex found for ${boneName}`);
}

const report={schemaVersion:1,rigType:'skinned-humanoid',skinning:'weighted-skeletal',races:{}};
for(const race of RACES){
  const file=path.join(ROOT,`gauntlet_${race}_v1.glb`);
  const gltf=await loadGlb(file),scene=cloneSkeleton(gltf.scene);
  const meshes=[],bones=[];scene.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);if(o.isBone)bones.push(o);});
  if(meshes.length<1)throw new Error(`${race}: no THREE.SkinnedMesh found`);
  if(bones.length<20)throw new Error(`${race}: only ${bones.length} bones`);
  for(const mesh of meshes){
    if(!mesh.geometry.getAttribute('skinIndex')||!mesh.geometry.getAttribute('skinWeight'))throw new Error(`${race}: ${mesh.name} missing skin attributes`);
    if(!mesh.skeleton?.bones?.length)throw new Error(`${race}: ${mesh.name} missing skeleton`);
  }
  const probes={};for(const boneName of PROBES)probes[boneName]=validateProbe(scene,meshes,boneName);
  report.races[race]={skinnedMeshes:meshes.length,bones:bones.length,probes};
}
await fs.writeFile(path.join(ROOT,'skinning-validation.json'),JSON.stringify(report,null,2)+'\n');
console.log('Skinned race deformation validation passed');
for(const [race,r] of Object.entries(report.races))console.log(`${race}: ${r.skinnedMeshes} skinned meshes, ${r.bones} bones, max probe ${Math.max(...Object.values(r.probes).map(p=>p.delta)).toFixed(4)}m`);
