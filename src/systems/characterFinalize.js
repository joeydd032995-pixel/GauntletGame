import * as THREE from 'three';

function finite(v){return Number.isFinite(v);}
function hasBadTransform(o){return![o.position.x,o.position.y,o.position.z,o.rotation.x,o.rotation.y,o.rotation.z,o.scale.x,o.scale.y,o.scale.z].every(finite);}
function hasBadVertices(g){const p=g?.attributes?.position;if(!p)return false;for(let i=0;i<p.count;i++)if(!finite(p.getX(i))||!finite(p.getY(i))||!finite(p.getZ(i)))return true;return false;}
function repairCurvedPlane(mesh){
  const g=mesh.geometry,p=g.attributes.position,w=g.parameters?.width,h=g.parameters?.height;if(!finite(w)||!finite(h)||w<=0||h<=0)throw new Error(`Cannot repair cloth plane ${mesh.parent?.name||'unknown'}: missing dimensions`);
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),t=THREE.MathUtils.clamp(1-(y/h+.5),0,1),z=-.035-Math.pow(t,1.4)*.12+Math.abs(x/w)*.025;p.setXYZ(i,x,y,z);}
  p.needsUpdate=true;g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
}
export function finalizeGeneratedCharacter(root){
  const report={repairedTransforms:[],repairedCloth:[]};
  root.traverse(o=>{
    if(hasBadTransform(o)){
      const parent=o.parent?.name||'';
      if(!(o.isMesh&&(parent==='LeftUpLeg'||parent==='RightUpLeg')))throw new Error(`Unexpected non-finite character transform on ${o.name||o.type}@${parent}`);
      o.position.set(finite(o.position.x)?o.position.x:0,finite(o.position.y)?o.position.y:0,finite(o.position.z)?o.position.z:0);o.rotation.set(finite(o.rotation.x)?o.rotation.x:0,finite(o.rotation.y)?o.rotation.y:0,finite(o.rotation.z)?o.rotation.z:0);o.scale.set(finite(o.scale.x)?o.scale.x:1,finite(o.scale.y)?o.scale.y:1,finite(o.scale.z)?o.scale.z:1);o.updateMatrix();report.repairedTransforms.push(`${o.name||'thigh-shell'}@${parent}`);
    }
    if(o.isMesh&&hasBadVertices(o.geometry)){
      const parent=o.parent?.name||'';
      if(!(o.geometry?.type==='PlaneGeometry'&&(parent==='ProductionCapeRoot'||parent==='Hips')))throw new Error(`Unexpected non-finite character geometry on ${o.name||'mesh'}@${parent}:${o.geometry?.type}`);
      repairCurvedPlane(o);report.repairedCloth.push(`${o.name||'cloth'}@${parent}`);
    }
  });
  root.updateMatrixWorld(true);root.userData.generationFinalization=report;return report;
}
