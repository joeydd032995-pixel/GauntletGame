import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const SOURCE='/assets/makehuman/base.obj';
const v3=new THREE.Vector3();

function gatherGeometry(root){
  const parts=[];
  root.traverse(o=>{if(o.isMesh&&o.geometry?.attributes?.position){const g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);parts.push(g.index?g.toNonIndexed():g);}});
  if(!parts.length)throw new Error('MakeHuman OBJ contained no renderable geometry');
  const merged=mergeGeometries(parts,false);for(const g of parts)g.dispose();
  if(!merged)throw new Error('MakeHuman geometry merge failed');
  merged.computeBoundingBox();return merged;
}
function normalizeHumanGeometry(geometry,{height=2.58,armDrop=.68,bulk=1}={}){
  geometry.computeBoundingBox();const box=geometry.boundingBox,size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),scale=height/Math.max(.001,size.y),p=geometry.attributes.position;
  for(let i=0;i<p.count;i++){
    let x=(p.getX(i)-center.x)*scale*bulk,y=(p.getY(i)-box.min.y)*scale+.025,z=(p.getZ(i)-center.z)*scale*bulk;
    const s=Math.sign(x)||1,pivotX=.39*s,pivotY=2.03;
    if(Math.abs(x)>.42&&y>1.43){const dx=x-pivotX,dy=y-pivotY,a=-s*armDrop,c=Math.cos(a),sn=Math.sin(a);x=pivotX+dx*c-dy*sn;y=pivotY+dx*sn+dy*c;}
    p.setXYZ(i,x,y,z);
  }
  p.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}
function weightsFor(x,y,b){
  const side=x<0?'left':'right',absX=Math.abs(x);let a=b.hips,bb=b.spine,t=.12;
  if(absX>.33&&y>.78){
    if(y>1.78){a=b[`${side}UpperArm`];bb=b[`${side}LowerArm`];t=THREE.MathUtils.clamp((2.18-y)/.5,.05,.55);}
    else if(y>1.27){a=b[`${side}LowerArm`];bb=b[`${side}Hand`];t=THREE.MathUtils.clamp((1.72-y)/.55,.08,.62);}
    else{a=b[`${side}Hand`];bb=b[`${side}LowerArm`];t=.08;}
  }else if(y<1.08){
    if(y>.67){a=b[`${side}Thigh`];bb=b.hips;t=THREE.MathUtils.clamp((y-.67)/.44,.08,.3);}
    else if(y>.16){a=b[`${side}Shin`];bb=b[`${side}Thigh`];t=THREE.MathUtils.clamp((y-.16)/.51,.08,.32);}
    else{a=b[`${side}Foot`];bb=b[`${side}Shin`];t=.08;}
  }else if(y<1.45){a=b.hips;bb=b.spine;t=THREE.MathUtils.clamp((y-1.08)/.37,.08,.7);}
  else if(y<1.9){a=b.spine;bb=b.chest||b.spine;t=THREE.MathUtils.clamp((y-1.45)/.45,.08,.75);}
  else if(y<2.15){a=b.chest||b.spine;bb=b.neck||b.head;t=THREE.MathUtils.clamp((y-1.9)/.25,.05,.58);}
  else{a=b.head;bb=b.neck||b.chest||b.spine;t=.08;}
  return[a,bb,t];
}
function skinGeometry(geometry,rig){
  const bones=[rig.bones.hips,rig.bones.spine,rig.bones.chest,rig.bones.neck,rig.bones.head,rig.bones.leftUpperArm,rig.bones.leftLowerArm,rig.bones.leftHand,rig.bones.rightUpperArm,rig.bones.rightLowerArm,rig.bones.rightHand,rig.bones.leftThigh,rig.bones.leftShin,rig.bones.leftFoot,rig.bones.rightThigh,rig.bones.rightShin,rig.bones.rightFoot].filter(Boolean);
  const boneIndex=new Map(bones.map((bone,i)=>[bone,i])),pos=geometry.attributes.position,count=pos.count,indices=new Uint16Array(count*4),weights=new Float32Array(count*4);
  for(let i=0;i<count;i++){v3.fromBufferAttribute(pos,i);const[a,bb,t]=weightsFor(v3.x,v3.y,rig.bones);indices[i*4]=boneIndex.get(a)??0;indices[i*4+1]=boneIndex.get(bb)??indices[i*4];weights[i*4]=1-t;weights[i*4+1]=t;}
  geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));return bones;
}
function bodyMaterial(enemy=false){return new THREE.MeshPhysicalMaterial({color:enemy?0x3b3038:0x273f47,roughness:.82,metalness:.03,envMapIntensity:.28,normalScale:new THREE.Vector2(.28,.28)});}
export async function installAnatomicalUnderlayer(rig,{enemy=false,hideFallback=true}={}){
  const status={source:'MakeHuman hm08 CC0',ready:false,installed:false,error:null,vertices:0,triangles:0};
  try{
    const response=await fetch(SOURCE,{cache:'force-cache'});if(!response.ok)throw new Error(`HTTP ${response.status}`);const text=await response.text();if(!text.includes('explicitly released as CC0'))throw new Error('CC0 provenance marker missing');
    const root=new OBJLoader().parse(text);root.updateMatrixWorld(true);const geometry=normalizeHumanGeometry(gatherGeometry(root),{height:enemy?2.77:2.58,armDrop:enemy?.62:.68,bulk:enemy?1.12:.98});const bones=skinGeometry(geometry,rig),mesh=new THREE.SkinnedMesh(geometry,bodyMaterial(enemy));
    mesh.name=enemy?'WardenCC0AnatomicalUnderlayer':'VanguardCC0AnatomicalUnderlayer';mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=true;mesh.userData.productionShell=true;mesh.userData.anatomicalUnderlayer=true;rig.group.add(mesh);rig.group.updateMatrixWorld(true);mesh.bind(new THREE.Skeleton(bones));mesh.normalizeSkinWeights();
    if(hideFallback)rig.group.traverse(o=>{if(o.isSkinnedMesh&&o!==mesh&&o.name?.includes('Undersuit'))o.visible=false;});
    status.ready=status.installed=true;status.vertices=geometry.attributes.position.count;status.triangles=Math.floor(geometry.attributes.position.count/3);status.mesh=mesh;return status;
  }catch(error){status.ready=true;status.error=String(error?.message||error);console.warn('Anatomical underlayer unavailable; retaining procedural fallback',error);return status;}
}
