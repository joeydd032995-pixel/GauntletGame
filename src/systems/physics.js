import * as THREE from 'three';

const EPS=1e-5;
export class PhysicsWorld{
  constructor({terrainHeight,terrainNormal,gravity=-30}={}){this.terrainHeight=terrainHeight;this.terrainNormal=terrainNormal;this.gravity=gravity;this.staticSpheres=[];this.staticBoxes=[];}
  addSphere(center,radius){this.staticSpheres.push({center:center.clone(),radius});}
  addBox(center,halfExtents){this.staticBoxes.push({center:center.clone(),halfExtents:halfExtents.clone()});}
  createCharacter(position,{radius=.42,height=1.75,stepHeight=.42,slopeLimit=.7,maxFallSpeed=32,acceleration=34,braking=42,airControl=.28}={}){return{position:position.clone(),previousPosition:position.clone(),velocity:new THREE.Vector3(),desiredVelocity:new THREE.Vector3(),radius,height,stepHeight,slopeLimit,maxFallSpeed,acceleration,braking,airControl,grounded:false,wasGrounded:false,groundNormal:new THREE.Vector3(0,1,0),groundDistance:Infinity};}
  stepCharacter(body,dt){body.previousPosition.copy(body.position);body.wasGrounded=body.grounded;const horizontal=new THREE.Vector2(body.velocity.x,body.velocity.z),desired=new THREE.Vector2(body.desiredVelocity.x,body.desiredVelocity.z),hasInput=desired.lengthSq()>.001;
    const accel=body.grounded?(hasInput?body.acceleration:body.braking):body.acceleration*body.airControl;const maxDelta=accel*dt;const delta=desired.clone().sub(horizontal);if(delta.length()>maxDelta)delta.setLength(maxDelta);horizontal.add(delta);body.velocity.x=horizontal.x;body.velocity.z=horizontal.y;
    if(!body.grounded)body.velocity.y=Math.max(-body.maxFallSpeed,body.velocity.y+this.gravity*dt);else if(body.velocity.y<0)body.velocity.y=-.6;
    const displacement=body.velocity.clone().multiplyScalar(dt),substeps=Math.max(1,Math.ceil(Math.max(Math.abs(displacement.x),Math.abs(displacement.y),Math.abs(displacement.z))/(body.radius*.35)));const step=displacement.multiplyScalar(1/substeps);
    for(let i=0;i<substeps;i++){const before=body.position.clone();body.position.add(step);this.#solveStatics(body,before);this.#solveTerrain(body);}
    if(body.grounded){const into=body.velocity.dot(body.groundNormal);if(into<0)body.velocity.addScaledVector(body.groundNormal,-into);}
    return body.position.clone().sub(body.previousPosition);
  }
  #solveTerrain(body){if(!this.terrainHeight)return;const ground=this.terrainHeight(body.position.x,body.position.z),distance=body.position.y-ground;body.groundDistance=distance;const snap=body.wasGrounded?body.stepHeight:.09;if(distance<=snap&&body.velocity.y<=1.2){body.position.y=ground;body.grounded=true;if(this.terrainNormal)this.terrainNormal(body.position.x,body.position.z,body.groundNormal);else body.groundNormal.set(0,1,0);if(body.groundNormal.y<body.slopeLimit){const lateral=new THREE.Vector3(body.groundNormal.x,0,body.groundNormal.z);if(lateral.lengthSq()>EPS){lateral.normalize();body.velocity.addScaledVector(lateral,Math.abs(this.gravity)*.18);}}}else body.grounded=false;}
  #solveStatics(body,before){for(let iteration=0;iteration<3;iteration++){let resolved=false;for(const s of this.staticSpheres){const d=new THREE.Vector3(body.position.x-s.center.x,0,body.position.z-s.center.z),min=body.radius+s.radius,len=d.length();if(len<min&&len>EPS){const n=d.multiplyScalar(1/len),push=min-len+.001;body.position.addScaledVector(n,push);const vn=body.velocity.x*n.x+body.velocity.z*n.z;if(vn<0){body.velocity.x-=vn*n.x;body.velocity.z-=vn*n.z;}resolved=true;}}
      for(const b of this.staticBoxes){const minX=b.center.x-b.halfExtents.x-body.radius,maxX=b.center.x+b.halfExtents.x+body.radius,minZ=b.center.z-b.halfExtents.z-body.radius,maxZ=b.center.z+b.halfExtents.z+body.radius;if(body.position.x>minX&&body.position.x<maxX&&body.position.z>minZ&&body.position.z<maxZ){const top=b.center.y+b.halfExtents.y,canStep=body.wasGrounded&&top-body.position.y<=body.stepHeight&&top>=body.position.y-.05;if(canStep){body.position.y=top+.005;body.grounded=true;continue;}const px=Math.min(body.position.x-minX,maxX-body.position.x),pz=Math.min(body.position.z-minZ,maxZ-body.position.z);if(px<pz){const sign=body.position.x<b.center.x?-1:1;body.position.x=sign<0?minX:maxX;if(body.velocity.x*sign<0)body.velocity.x=0;}else{const sign=body.position.z<b.center.z?-1:1;body.position.z=sign<0?minZ:maxZ;if(body.velocity.z*sign<0)body.velocity.z=0;}resolved=true;}}
      if(!resolved)break;}
  }
}
export function terrainNormalFromHeight(heightFn,x,z,out=new THREE.Vector3(),sample=.16){const l=heightFn(x-sample,z),r=heightFn(x+sample,z),d=heightFn(x,z-sample),u=heightFn(x,z+sample);return out.set(l-r,sample*2,d-u).normalize();}
