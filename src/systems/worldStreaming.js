import * as THREE from 'three';
import { makeBarkMaterial, makeFoliageMaterial, makeStoneMaterial } from './materials.js';

function hash2(x,z,seed=1337){let h=(x*374761393+z*668265263+seed*982451653)|0;h=(h^(h>>>13))*1274126177;return ((h^(h>>>16))>>>0)/4294967295;}

export class WorldStreamer {
  constructor({ scene, camera, heightFn, chunkSize=28, radius=3 }) {
    this.scene=scene;this.camera=camera;this.heightFn=heightFn;this.chunkSize=chunkSize;this.radius=Math.min(radius,2);
    this.chunks=new Map();this.pool=[];this.lastCX=Infinity;this.lastCZ=Infinity;
    this.trunkMat=makeBarkMaterial();this.leafMat=makeFoliageMaterial();this.rockMat=makeStoneMaterial();
    this.treeTrunkGeo=new THREE.CylinderGeometry(.16,.38,4.6,10);
    this.treeCrownGeo=new THREE.IcosahedronGeometry(1.35,2);
    this.rockGeo=new THREE.DodecahedronGeometry(.68,1);
  }

  update(focus) {
    const cx=Math.floor(focus.x/this.chunkSize),cz=Math.floor(focus.z/this.chunkSize);
    if(cx===this.lastCX&&cz===this.lastCZ){this.#updateLOD(focus);return;}
    this.lastCX=cx;this.lastCZ=cz;
    const needed=new Set();
    for(let z=-this.radius;z<=this.radius;z++)for(let x=-this.radius;x<=this.radius;x++){const k=`${cx+x}:${cz+z}`;needed.add(k);if(!this.chunks.has(k))this.#load(cx+x,cz+z,k);}
    for(const [k,c] of this.chunks)if(!needed.has(k)){this.scene.remove(c.group);this.chunks.delete(k);this.pool.push(c);}
    this.#updateLOD(focus);
  }

  #load(cx,cz,key){
    const chunk=this.pool.pop()||this.#createChunk();chunk.cx=cx;chunk.cz=cz;chunk.group.visible=true;chunk.group.position.set(cx*this.chunkSize,0,cz*this.chunkSize);
    let treeIndex=0,rockIndex=0;
    for(let i=0;i<30;i++){
      const rx=hash2(cx*91+i,cz*73+i*7),rz=hash2(cx*53+i*11,cz*97+i*3),kind=hash2(cx*19+i*5,cz*23+i*13);
      const lx=(rx-.5)*this.chunkSize,lz=(rz-.5)*this.chunkSize,wx=chunk.group.position.x+lx,wz=chunk.group.position.z+lz;
      if(Math.hypot(wx,wz)<18.5)continue;
      const y=this.heightFn(wx,wz);
      if(kind>.38&&treeIndex<chunk.treeCount){const s=.72+hash2(i,cx+cz)*.58,yaw=hash2(i,cz)*Math.PI*2;const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,yaw,0));const m=new THREE.Matrix4().compose(new THREE.Vector3(lx,y+2.3*s,lz),q,new THREE.Vector3(s,s,s));chunk.trunks.setMatrixAt(treeIndex,m);const crownScale=new THREE.Vector3(s*(.9+hash2(i,17)*.15),s*(1.45+hash2(i,29)*.35),s*(.9+hash2(i,31)*.15));const cm=new THREE.Matrix4().compose(new THREE.Vector3(lx,y+4.6*s,lz),q,crownScale);chunk.crowns.setMatrixAt(treeIndex,cm);treeIndex++;}
      else if(rockIndex<chunk.rockCount){const s=.45+hash2(i*2,cx-cz)*1.05;const rm=new THREE.Matrix4().compose(new THREE.Vector3(lx,y+.3*s,lz),new THREE.Quaternion().setFromEuler(new THREE.Euler(hash2(i,1)*.8,hash2(i,2)*6.28,hash2(i,3)*.8)),new THREE.Vector3(s*1.35,s*.72,s));chunk.rocks.setMatrixAt(rockIndex,rm);rockIndex++;}
    }
    chunk.trunks.count=treeIndex;chunk.crowns.count=treeIndex;chunk.rocks.count=rockIndex;chunk.trunks.instanceMatrix.needsUpdate=chunk.crowns.instanceMatrix.needsUpdate=chunk.rocks.instanceMatrix.needsUpdate=true;
    this.scene.add(chunk.group);this.chunks.set(key,chunk);
  }

  #createChunk(){
    const group=new THREE.Group(),treeCount=22,rockCount=14;
    const trunks=new THREE.InstancedMesh(this.treeTrunkGeo,this.trunkMat,treeCount),crowns=new THREE.InstancedMesh(this.treeCrownGeo,this.leafMat,treeCount),rocks=new THREE.InstancedMesh(this.rockGeo,this.rockMat,rockCount);
    trunks.castShadow=true;crowns.castShadow=true;rocks.castShadow=rocks.receiveShadow=true;group.add(trunks,crowns,rocks);return{group,trunks,crowns,rocks,treeCount,rockCount,cx:0,cz:0};
  }

  #updateLOD(focus){
    for(const c of this.chunks.values()){
      const centerX=c.cx*this.chunkSize,centerZ=c.cz*this.chunkSize,dist=Math.hypot(focus.x-centerX,focus.z-centerZ);
      const near=dist<this.chunkSize*1.45,mid=dist<this.chunkSize*2.65;
      c.trunks.castShadow=near;c.crowns.castShadow=near;c.rocks.castShadow=near;
      c.crowns.visible=mid;c.trunks.visible=true;c.rocks.visible=true;
      const fade=THREE.MathUtils.clamp(1-(dist-this.chunkSize*2.0)/(this.chunkSize*1.15),.55,1);c.group.scale.setScalar(fade<.65?.95:1);
    }
  }
}
