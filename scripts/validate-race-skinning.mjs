import fs from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';

const ROOT=path.resolve('public/assets/races');
const RACES=['cairnborn','brinesworn','myceliad','veylkin','echoed'];
const LODS={hero:'',mid:'_mid',far:'_far'};
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
function validateWeights(mesh){
  const si=mesh.geometry.getAttribute('skinIndex'),sw=mesh.geometry.getAttribute('skinWeight'),pos=mesh.geometry.getAttribute('position');
  if(!si||!sw||!pos)throw new Error(`${mesh.name}: missing skin attributes`);
  const boneCount=mesh.skeleton?.bones?.length||0;if(!boneCount)throw new Error(`${mesh.name}: missing skeleton`);
  let maxInfluences=0,minSum=Infinity,maxSum=-Infinity,weightedVertices=0;
  const influencedBones=new Set();
  for(let i=0;i<pos.count;i++){
    let sum=0,influences=0;
    for(let j=0;j<4;j++){
      const index=si.getComponent(i,j),weight=sw.getComponent(i,j);
      if(!Number.isFinite(index)||!Number.isFinite(weight)||weight<0)throw new Error(`${mesh.name}: invalid skin value at vertex ${i}`);
      if(index>=boneCount)throw new Error(`${mesh.name}: joint index ${index} >= bone count ${boneCount}`);
      if(weight>1e-6){sum+=weight;influences++;influencedBones.add(index);}
    }
    if(influences===0)throw new Error(`${mesh.name}: unweighted vertex ${i}`);
    if(Math.abs(sum-1)>1e-3)throw new Error(`${mesh.name}: weights sum ${sum} at vertex ${i}`);
    weightedVertices++;maxInfluences=Math.max(maxInfluences,influences);minSum=Math.min(minSum,sum);maxSum=Math.max(maxSum,sum);
  }
  return{vertices:weightedVertices,maxInfluences,influencedBones:influencedBones.size,minWeightSum:+minSum.toFixed(6),maxWeightSum:+maxSum.toFixed(6)};
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

const report={schemaVersion:2,rigType:'skinned-humanoid',skinning:'weighted-skeletal',races:{}};
for(const race of RACES){
  report.races[race]={};
  for(const [lod,suffix] of Object.entries(LODS)){
    const file=path.join(ROOT,`gauntlet_${race}${suffix}_v1.glb`);
    const gltf=await loadGlb(file),scene=cloneSkeleton(gltf.scene);
    const meshes=[],bones=[];scene.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);if(o.isBone)bones.push(o);});
    if(meshes.length<1)throw new Error(`${race}/${lod}: no THREE.SkinnedMesh found`);
    if(bones.length<20)throw new Error(`${race}/${lod}: only ${bones.length} bones`);
    const weightReports=meshes.map(validateWeights);
    const probes={};for(const boneName of PROBES)probes[boneName]=validateProbe(scene,meshes,boneName);
    report.races[race][lod]={
      skinnedMeshes:meshes.length,bones:bones.length,
      vertices:weightReports.reduce((s,r)=>s+r.vertices,0),
      maxInfluences:Math.max(...weightReports.map(r=>r.maxInfluences)),
      influencedBones:Math.max(...weightReports.map(r=>r.influencedBones)),
      minWeightSum:Math.min(...weightReports.map(r=>r.minWeightSum)),
      maxWeightSum:Math.max(...weightReports.map(r=>r.maxWeightSum)),
      probes
    };
  }
}
await fs.writeFile(path.join(ROOT,'skinning-validation.json'),JSON.stringify(report,null,2)+'\n');
console.log('Skinned race deformation + weight-integrity validation passed');
for(const [race,lods] of Object.entries(report.races)){
  const h=lods.hero,m=lods.mid,f=lods.far;
  const maxProbe=Math.max(...Object.values(h.probes).map(p=>p.delta));
  console.log(`${race}: hero ${h.skinnedMeshes}s/${h.bones}b/${h.vertices}v, mid ${m.skinnedMeshes}s, far ${f.skinnedMeshes}s, maxInfluences ${h.maxInfluences}, maxProbe ${maxProbe.toFixed(4)}m`);
}
