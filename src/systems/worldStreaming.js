import * as THREE from 'three';
import { makeStoneMaterial } from './materials.js';
import { createTreeSpeciesLibrary } from './foliage.js';

function hash2(x,z,seed=1337){let h=(x*374761393+z*668265263+seed*982451653)|0;h=(h^(h>>>13))*1274126177;return((h^(h>>>16))>>>0)/4294967295;}
export class WorldStreamer{
  constructor({scene,camera,heightFn,chunkSize=28,radius=3}){
    this.scene=scene;this.camera=camera;this.heightFn=heightFn;this.chunkSize=chunkSize;this.radius=Math.min(radius,2);this.unloadRadius=this.radius+1;this.chunks=new Map();this.pool=[];this.lastCX=Infinity;this.lastCZ=Infinity;this.lastFocus=new THREE.Vector3();this.predicted=new THREE.Vector3();this.lastTime=performance.now();this.velocity=new THREE.Vector3();
    this.species=createTreeSpeciesLibrary();this.rockMat=makeStoneMaterial();this.rockGeo=new THREE.DodecahedronGeometry(.58,1);this.telemetry={target:'high-end OSRS/07Scape',species:this.species.map(s=>s.id),activeChunks:0,trees:0,rocks:0,nearTreeChunks:0,farTreeChunks:0,lod:'near-authored-crown / far-simplified-crown',densityProfile:'grove-clustered-medium',placement:'deterministic dominant-species groves'};this.#publishTelemetry();
  }
  update(focus){
    const now=performance.now(),dt=Math.min(.25,Math.max(.001,(now-this.lastTime)/1000));this.lastTime=now;
    if(this.lastFocus.lengthSq()>0){const instantaneous=this.predicted.copy(focus).sub(this.lastFocus).multiplyScalar(1/dt);this.velocity.lerp(instantaneous,1-Math.exp(-dt*7));}
    this.lastFocus.copy(focus);this.predicted.copy(focus).addScaledVector(this.velocity,.72);
    const cx=Math.floor(this.predicted.x/this.chunkSize),cz=Math.floor(this.predicted.z/this.chunkSize),focusCX=Math.floor(focus.x/this.chunkSize),focusCZ=Math.floor(focus.z/this.chunkSize),changed=cx!==this.lastCX||cz!==this.lastCZ;this.lastCX=cx;this.lastCZ=cz;
    if(changed){for(let z=-this.radius;z<=this.radius;z++)for(let x=-this.radius;x<=this.radius;x++){const k=`${cx+x}:${cz+z}`;if(!this.chunks.has(k))this.#load(cx+x,cz+z,k);}for(const[k,c]of this.chunks){if(Math.max(Math.abs(c.cx-focusCX),Math.abs(c.cz-focusCZ))>this.unloadRadius){this.scene.remove(c.group);this.chunks.delete(k);this.pool.push(c);}}}
    this.#updateLOD(focus);this.#publishTelemetry();
  }
  #load(cx,cz,key){
    const chunk=this.pool.pop()||this.#createChunk();chunk.cx=cx;chunk.cz=cz;chunk.group.visible=true;chunk.group.position.set(cx*this.chunkSize,0,cz*this.chunkSize);chunk.speciesCounts.fill(0);let rockIndex=0;
    const groveRoll=hash2(cx,cz,311),dominant=groveRoll<.43?0:groveRoll<.72?1:2;
    for(let i=0;i<22;i++){
      const rx=hash2(cx*91+i,cz*73+i*7),rz=hash2(cx*53+i*11,cz*97+i*3),kind=hash2(cx*19+i*5,cz*23+i*13),lx=(rx-.5)*this.chunkSize,lz=(rz-.5)*this.chunkSize,wx=chunk.group.position.x+lx,wz=chunk.group.position.z+lz;if(Math.hypot(wx,wz)<16.2)continue;const y=this.heightFn(wx,wz);
      if(kind>.3){
        const intrusion=hash2(cx*31+i*17,cz*41-i*9,207),speciesIndex=intrusion<.72?dominant:(dominant+1+(intrusion>.88?1:0))%3,kit=this.species[speciesIndex],slot=chunk.speciesCounts[speciesIndex];if(slot>=chunk.treeCapacity)continue;
        const spread=hash2(i*13,cx+cz,41),s=THREE.MathUtils.lerp(kit.baseScale[0],kit.baseScale[1],spread),yaw=hash2(i,cz,53)*Math.PI*2,lean=(hash2(i,cx,79)-.5)*.04,q=new THREE.Quaternion().setFromEuler(new THREE.Euler(lean,yaw,-lean*.65)),crownYaw=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,yaw+hash2(i,cz,83)*.72,0));
        const trunkScale=new THREE.Vector3(s*(.88+hash2(i,7)*.2),s*(.94+hash2(i,13)*.14),s*(.88+hash2(i,11)*.2)),crownScale=new THREE.Vector3(s*(.86+hash2(i,17)*.3),s*(.9+hash2(i,23)*.21),s*(.86+hash2(i,29)*.3));
        chunk.trees[speciesIndex].trunks.setMatrixAt(slot,new THREE.Matrix4().compose(new THREE.Vector3(lx,y,lz),q,trunkScale));const cp=new THREE.Vector3(lx,y+kit.crownY*s,lz);chunk.trees[speciesIndex].nearCrowns.setMatrixAt(slot,new THREE.Matrix4().compose(cp,crownYaw,crownScale));chunk.trees[speciesIndex].farCrowns.setMatrixAt(slot,new THREE.Matrix4().compose(cp,crownYaw,crownScale));chunk.speciesCounts[speciesIndex]++;
      }else if(rockIndex<chunk.rockCount){const s=.4+hash2(i*2,cx-cz)*.9;chunk.rocks.setMatrixAt(rockIndex++,new THREE.Matrix4().compose(new THREE.Vector3(lx,y+.24*s,lz),new THREE.Quaternion().setFromEuler(new THREE.Euler(hash2(i,1)*.8,hash2(i,2)*6.28,hash2(i,3)*.8)),new THREE.Vector3(s*1.35,s*.68,s)));}
    }
    for(let s=0;s<this.species.length;s++){const n=chunk.speciesCounts[s],tree=chunk.trees[s];tree.trunks.count=tree.nearCrowns.count=tree.farCrowns.count=n;tree.trunks.instanceMatrix.needsUpdate=tree.nearCrowns.instanceMatrix.needsUpdate=tree.farCrowns.instanceMatrix.needsUpdate=true;}
    chunk.rocks.count=rockIndex;chunk.rocks.instanceMatrix.needsUpdate=true;this.scene.add(chunk.group);this.chunks.set(key,chunk);
  }
  #createChunk(){
    const group=new THREE.Group(),treeCapacity=11,rockCount=11,trees=this.species.map(kit=>{const trunks=new THREE.InstancedMesh(kit.trunk,kit.trunkMaterial,treeCapacity),nearCrowns=new THREE.InstancedMesh(kit.nearCrown,kit.nearMaterial,treeCapacity),farCrowns=new THREE.InstancedMesh(kit.farCrown,kit.farMaterial,treeCapacity);trunks.castShadow=true;trunks.receiveShadow=true;nearCrowns.castShadow=true;nearCrowns.receiveShadow=true;farCrowns.castShadow=false;farCrowns.receiveShadow=true;farCrowns.visible=false;group.add(trunks,nearCrowns,farCrowns);return{trunks,nearCrowns,farCrowns};}),rocks=new THREE.InstancedMesh(this.rockGeo,this.rockMat,rockCount);rocks.castShadow=rocks.receiveShadow=true;group.add(rocks);return{group,trees,rocks,speciesCounts:new Array(this.species.length).fill(0),treeCapacity,rockCount,cx:0,cz:0,lod:'near'};
  }
  #updateLOD(focus){
    for(const c of this.chunks.values()){
      const dist=Math.hypot(focus.x-c.cx*this.chunkSize,focus.z-c.cz*this.chunkSize),near=dist<this.chunkSize*2.05,mid=dist<this.chunkSize*3.75;c.lod=near?'near':'far';
      for(const tree of c.trees){tree.trunks.visible=mid;tree.trunks.castShadow=dist<this.chunkSize*1.45;tree.nearCrowns.visible=near;tree.nearCrowns.castShadow=dist<this.chunkSize*1.45;tree.farCrowns.visible=!near&&mid;}
      c.rocks.castShadow=dist<this.chunkSize*1.35;c.rocks.visible=mid;
    }
  }
  #publishTelemetry(){let trees=0,rocks=0,nearTreeChunks=0,farTreeChunks=0;for(const c of this.chunks.values()){trees+=c.speciesCounts.reduce((a,b)=>a+b,0);rocks+=c.rocks.count||0;if(c.lod==='near')nearTreeChunks++;else farTreeChunks++;}Object.assign(this.telemetry,{activeChunks:this.chunks.size,trees,rocks,nearTreeChunks,farTreeChunks});if(typeof window!=='undefined')window.__GAUNTLET_STREAMING_ENVIRONMENT__={...this.telemetry};}
}
