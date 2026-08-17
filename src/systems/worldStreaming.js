import * as THREE from 'three';

function hash2(x,z,seed=1337){let h=(x*374761393+z*668265263+seed*982451653)|0;h=(h^(h>>>13))*1274126177;return ((h^(h>>>16))>>>0)/4294967295;}

export class WorldStreamer {
  constructor({ scene, camera, heightFn, chunkSize=28, radius=3 }) {
    this.scene=scene;this.camera=camera;this.heightFn=heightFn;this.chunkSize=chunkSize;this.radius=radius;
    this.chunks=new Map();this.pool=[];this.lastCX=Infinity;this.lastCZ=Infinity;
    this.trunkMat=new THREE.MeshStandardMaterial({color:0x3a2b22,roughness:.94});
    this.leafMat=new THREE.MeshStandardMaterial({color:0x29483a,roughness:.86});
    this.rockMat=new THREE.MeshStandardMaterial({color:0x626a69,roughness:.86,metalness:.04});
    this.treeTrunkGeo=new THREE.CylinderGeometry(.18,.4,4.2,7);
    this.treeCrownGeo=new THREE.ConeGeometry(1.7,3.6,8);
    this.rockGeo=new THREE.DodecahedronGeometry(.7,0);
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
    for(let i=0;i<38;i++){
      const rx=hash2(cx*91+i,cz*73+i*7),rz=hash2(cx*53+i*11,cz*97+i*3),kind=hash2(cx*19+i*5,cz*23+i*13);
      const lx=(rx-.5)*this.chunkSize,lz=(rz-.5)*this.chunkSize,wx=chunk.group.position.x+lx,wz=chunk.group.position.z+lz,y=this.heightFn(wx,wz);
      if(kind>.38&&treeIndex<chunk.treeCount){const s=.75+hash2(i,cx+cz)*.75;const trunk=chunk.trunks;const crown=chunk.crowns;const m=new THREE.Matrix4().compose(new THREE.Vector3(lx,y+2.1*s,lz),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,hash2(i,cz)*Math.PI*2,0)),new THREE.Vector3(s,s,s));trunk.setMatrixAt(treeIndex,m);const cm=new THREE.Matrix4().compose(new THREE.Vector3(lx,y+4.2*s,lz),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,hash2(i,cx)*Math.PI*2,0)),new THREE.Vector3(s,s,s));crown.setMatrixAt(treeIndex,cm);treeIndex++;}
      else if(rockIndex<chunk.rockCount){const s=.5+hash2(i*2,cx-cz)*1.3;const rm=new THREE.Matrix4().compose(new THREE.Vector3(lx,y+.35*s,lz),new THREE.Quaternion().setFromEuler(new THREE.Euler(hash2(i,1),hash2(i,2)*6.28,hash2(i,3))),new THREE.Vector3(s*1.4,s*.8,s));chunk.rocks.setMatrixAt(rockIndex,rm);rockIndex++;}
    }
    chunk.trunks.count=treeIndex;chunk.crowns.count=treeIndex;chunk.rocks.count=rockIndex;chunk.trunks.instanceMatrix.needsUpdate=chunk.crowns.instanceMatrix.needsUpdate=chunk.rocks.instanceMatrix.needsUpdate=true;
    this.scene.add(chunk.group);this.chunks.set(key,chunk);
  }

  #createChunk(){
    const group=new THREE.Group(),treeCount=28,rockCount=18;
    const trunks=new THREE.InstancedMesh(this.treeTrunkGeo,this.trunkMat,treeCount),crowns=new THREE.InstancedMesh(this.treeCrownGeo,this.leafMat,treeCount),rocks=new THREE.InstancedMesh(this.rockGeo,this.rockMat,rockCount);
    trunks.castShadow=true;crowns.castShadow=true;rocks.castShadow=rocks.receiveShadow=true;group.add(trunks,crowns,rocks);return{group,trunks,crowns,rocks,treeCount,rockCount,cx:0,cz:0};
  }

  #updateLOD(focus){
    for(const c of this.chunks.values()){
      const centerX=c.cx*this.chunkSize,centerZ=c.cz*this.chunkSize,dist=Math.hypot(focus.x-centerX,focus.z-centerZ);
      const near=dist<this.chunkSize*1.75,mid=dist<this.chunkSize*3.2;
      c.trunks.castShadow=near;c.crowns.castShadow=near;c.rocks.castShadow=near;
      c.crowns.visible=mid;c.trunks.visible=true;c.rocks.visible=true;
      const fade=THREE.MathUtils.clamp(1-(dist-this.chunkSize*2.6)/(this.chunkSize*1.5),.35,1);c.group.scale.setScalar(fade<.55?.92:1);
    }
  }
}
