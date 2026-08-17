import * as THREE from 'three';
import { makeBarkMaterial, makeStoneMaterial } from './materials.js';
import { createLeafCanopyGeometry, createLeafMaterial, createBranchedTrunkGeometry } from './foliage.js';

function hash2(x,z,seed=1337){let h=(x*374761393+z*668265263+seed*982451653)|0;h=(h^(h>>>13))*1274126177;return ((h^(h>>>16))>>>0)/4294967295;}

export class WorldStreamer {
  constructor({scene,camera,heightFn,chunkSize=28,radius=3}){
    this.scene=scene;this.camera=camera;this.heightFn=heightFn;this.chunkSize=chunkSize;this.radius=Math.min(radius,2);
    this.chunks=new Map();this.pool=[];this.lastCX=Infinity;this.lastCZ=Infinity;
    this.trunkMat=makeBarkMaterial();this.leafMat=createLeafMaterial();this.rockMat=makeStoneMaterial();
    this.treeTrunkGeo=createBranchedTrunkGeometry();this.treeCrownGeo=createLeafCanopyGeometry({cards:42,seed:37});this.rockGeo=new THREE.DodecahedronGeometry(.68,1);
  }
  update(focus){const cx=Math.floor(focus.x/this.chunkSize),cz=Math.floor(focus.z/this.chunkSize);if(cx===this.lastCX&&cz===this.lastCZ){this.#updateLOD(focus);return;}this.lastCX=cx;this.lastCZ=cz;const needed=new Set();for(let z=-this.radius;z<=this.radius;z++)for(let x=-this.radius;x<=this.radius;x++){const k=`${cx+x}:${cz+z}`;needed.add(k);if(!this.chunks.has(k))this.#load(cx+x,cz+z,k);}for(const [k,c] of this.chunks)if(!needed.has(k)){this.scene.remove(c.group);this.chunks.delete(k);this.pool.push(c);}this.#updateLOD(focus);}
  #load(cx,cz,key){const chunk=this.pool.pop()||this.#createChunk();chunk.cx=cx;chunk.cz=cz;chunk.group.visible=true;chunk.group.position.set(cx*this.chunkSize,0,cz*this.chunkSize);let treeIndex=0,rockIndex=0;
    for(let i=0;i<30;i++){const rx=hash2(cx*91+i,cz*73+i*7),rz=hash2(cx*53+i*11,cz*97+i*3),kind=hash2(cx*19+i*5,cz*23+i*13);const lx=(rx-.5)*this.chunkSize,lz=(rz-.5)*this.chunkSize,wx=chunk.group.position.x+lx,wz=chunk.group.position.z+lz;if(Math.hypot(wx,wz)<18.5)continue;const y=this.heightFn(wx,wz);
      if(kind>.38&&treeIndex<chunk.treeCount){const s=.7+hash2(i,cx+cz)*.52,yaw=hash2(i,cz)*Math.PI*2,q=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,yaw,0));chunk.trunks.setMatrixAt(treeIndex,new THREE.Matrix4().compose(new THREE.Vector3(lx,y+2.3*s,lz),q,new THREE.Vector3(s,s,s)));const crownScale=new THREE.Vector3(s*(1.18+hash2(i,17)*.24),s*(1.1+hash2(i,29)*.18),s*(1.18+hash2(i,31)*.24));chunk.crowns.setMatrixAt(treeIndex,new THREE.Matrix4().compose(new THREE.Vector3(lx,y+4.6*s,lz),q,crownScale));treeIndex++;}
      else if(rockIndex<chunk.rockCount){const s=.45+hash2(i*2,cx-cz)*1.05;chunk.rocks.setMatrixAt(rockIndex,new THREE.Matrix4().compose(new THREE.Vector3(lx,y+.3*s,lz),new THREE.Quaternion().setFromEuler(new THREE.Euler(hash2(i,1)*.8,hash2(i,2)*6.28,hash2(i,3)*.8)),new THREE.Vector3(s*1.35,s*.72,s)));rockIndex++;}}
    chunk.trunks.count=treeIndex;chunk.crowns.count=treeIndex;chunk.rocks.count=rockIndex;chunk.trunks.instanceMatrix.needsUpdate=chunk.crowns.instanceMatrix.needsUpdate=chunk.rocks.instanceMatrix.needsUpdate=true;this.scene.add(chunk.group);this.chunks.set(key,chunk);}
  #createChunk(){const group=new THREE.Group(),treeCount=20,rockCount=14,trunks=new THREE.InstancedMesh(this.treeTrunkGeo,this.trunkMat,treeCount),crowns=new THREE.InstancedMesh(this.treeCrownGeo,this.leafMat,treeCount),rocks=new THREE.InstancedMesh(this.rockGeo,this.rockMat,rockCount);trunks.castShadow=true;crowns.castShadow=true;crowns.receiveShadow=true;rocks.castShadow=rocks.receiveShadow=true;group.add(trunks,crowns,rocks);return{group,trunks,crowns,rocks,treeCount,rockCount,cx:0,cz:0};}
  #updateLOD(focus){for(const c of this.chunks.values()){const dist=Math.hypot(focus.x-c.cx*this.chunkSize,focus.z-c.cz*this.chunkSize),near=dist<this.chunkSize*1.35,mid=dist<this.chunkSize*2.55;c.trunks.castShadow=near;c.crowns.castShadow=near;c.rocks.castShadow=near;c.crowns.visible=mid;c.trunks.visible=true;c.rocks.visible=true;const fade=THREE.MathUtils.clamp(1-(dist-this.chunkSize*1.95)/(this.chunkSize*1.1),.62,1);c.group.scale.setScalar(fade<.68?.96:1);}}
}
