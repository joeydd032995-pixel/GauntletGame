import * as THREE from 'three';

function boneMap(root){const bones=[];root.traverse(o=>{if(o.isBone)bones.push(o);});return{bones,index:new Map(bones.map((b,i)=>[b.name,i]))};}
function localBonePosition(root,bone){const p=bone.getWorldPosition(new THREE.Vector3());return root.worldToLocal(p);}
function addTube(data,root,index,aName,bName,r0,r1,{sides=14,rings=5,depthScale=1}={}){
  const a=root.getObjectByName(aName),b=root.getObjectByName(bName);if(!a||!b)return;
  const pa=localBonePosition(root,a),pb=localBonePosition(root,b),dir=pb.clone().sub(pa),len=dir.length();if(len<1e-4)return;dir.normalize();
  const ref=Math.abs(dir.y)<.88?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0),side=new THREE.Vector3().crossVectors(dir,ref).normalize(),up=new THREE.Vector3().crossVectors(side,dir).normalize(),base=data.positions.length/3,ia=index.get(aName),ib=index.get(bName);
  for(let j=0;j<=rings;j++){
    const t=j/rings,center=pa.clone().lerp(pb,t),radius=THREE.MathUtils.lerp(r0,r1,t)*(1+Math.sin(t*Math.PI)*.08);
    for(let i=0;i<sides;i++){
      const u=i/sides,ang=u*Math.PI*2,offset=side.clone().multiplyScalar(Math.cos(ang)*radius).add(up.clone().multiplyScalar(Math.sin(ang)*radius*depthScale)),p=center.clone().add(offset);
      data.positions.push(p.x,p.y,p.z);data.uvs.push(u,t);data.skinIndices.push(ia,ib,0,0);data.skinWeights.push(1-t,t,0,0);
    }
  }
  for(let j=0;j<rings;j++)for(let i=0;i<sides;i++){const n=(i+1)%sides,a0=base+j*sides+i,b0=base+j*sides+n,c0=base+(j+1)*sides+n,d0=base+(j+1)*sides+i;data.indices.push(a0,b0,d0,b0,c0,d0);}
}
function geometryFor(root,index,enemy=false){
  const d={positions:[],uvs:[],skinIndices:[],skinWeights:[],indices:[]};
  if(enemy){
    addTube(d,root,index,'EnemyHips','EnemySpine',.42,.48,{sides:18,rings:6,depthScale:.78});addTube(d,root,index,'EnemySpine','EnemyHead',.32,.18,{sides:16,rings:5,depthScale:.85});
    addTube(d,root,index,'LeftUpLeg','LeftLeg',.205,.165,{sides:14,rings:5,depthScale:.9});addTube(d,root,index,'LeftLeg','LeftFoot',.16,.125,{sides:14,rings:5,depthScale:.88});addTube(d,root,index,'RightUpLeg','RightLeg',.205,.165,{sides:14,rings:5,depthScale:.9});addTube(d,root,index,'RightLeg','RightFoot',.16,.125,{sides:14,rings:5,depthScale:.88});
  }else{
    addTube(d,root,index,'Hips','Spine',.29,.34,{sides:18,rings:6,depthScale:.78});addTube(d,root,index,'Spine','Chest',.34,.39,{sides:18,rings:6,depthScale:.76});addTube(d,root,index,'Chest','Neck',.27,.12,{sides:16,rings:5,depthScale:.8});addTube(d,root,index,'Neck','Head',.12,.17,{sides:14,rings:4,depthScale:.9});
    for(const side of ['Left','Right']){addTube(d,root,index,`${side}UpperArm`,`${side}LowerArm`,.145,.12,{sides:14,rings:5,depthScale:.92});addTube(d,root,index,`${side}LowerArm`,`${side}Hand`,.115,.095,{sides:14,rings:5,depthScale:.9});addTube(d,root,index,`${side}UpLeg`,`${side}Leg`,.18,.145,{sides:16,rings:6,depthScale:.88});addTube(d,root,index,`${side}Leg`,`${side}Foot`,.14,.105,{sides:14,rings:5,depthScale:.86});}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(d.positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(d.uvs,2));g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(d.skinIndices,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(d.skinWeights,4));g.setIndex(d.indices);g.computeVertexNormals();g.computeBoundingSphere();return g;
}

export function addSkinnedUndersuit(rig,sourceMaterial,{enemy=false}={}){
  rig.group.updateMatrixWorld(true);const {bones,index}=boneMap(rig.group),skeleton=new THREE.Skeleton(bones);skeleton.calculateInverses();
  const material=sourceMaterial.clone();material.name=enemy?'Warden Skinned Underlayer':'Vanguard Skinned Underlayer';material.metalness=0;material.roughness=.82;material.clearcoat=0;material.color.multiplyScalar(enemy?.56:.62);
  const mesh=new THREE.SkinnedMesh(geometryFor(rig.group,index,enemy),material);mesh.name=enemy?'WardenSkinnedUnderlayer':'VanguardSkinnedUnderlayer';mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.productionShell=true;mesh.userData.lodLevel=0;rig.group.add(mesh);rig.group.updateMatrixWorld(true);mesh.bind(skeleton);return mesh;
}
