import * as THREE from 'three';

function ensureUVs(g){
  if(g.attributes?.uv)return false;const p=g.attributes?.position;if(!p)return false;
  g.computeBoundingBox();const box=g.boundingBox,size=new THREE.Vector3();box.getSize(size);const uv=new Float32Array(p.count*2),vertical=size.y>=Math.max(size.x,size.z)*.65;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);let u,v;if(vertical){u=Math.atan2(z,x)/(Math.PI*2)+.5;v=size.y>1e-6?(y-box.min.y)/size.y:0;}else{u=size.x>1e-6?(x-box.min.x)/size.x:0;v=size.z>1e-6?(z-box.min.z)/size.z:0;}uv[i*2]=u;uv[i*2+1]=v;}
  g.setAttribute('uv',new THREE.BufferAttribute(uv,2));return true;
}

export function sanitizeProductionShell(root){
  const report={meshes:0,triangles:0,materials:new Set(),missingNormals:[],missingUVs:[],generatedUVs:0,nonFiniteTransforms:[],tinyMeshes:[],productionMeshes:0};
  root.traverse(o=>{if(!o.isObject3D)return;const vals=[o.position.x,o.position.y,o.position.z,o.rotation.x,o.rotation.y,o.rotation.z,o.scale.x,o.scale.y,o.scale.z];if(vals.some(v=>!Number.isFinite(v))){report.nonFiniteTransforms.push(o.name||o.type);if(!Number.isFinite(o.rotation.x))o.rotation.x=0;if(!Number.isFinite(o.rotation.y))o.rotation.y=0;if(!Number.isFinite(o.rotation.z))o.rotation.z=0;if(!Number.isFinite(o.position.x))o.position.x=0;if(!Number.isFinite(o.position.y))o.position.y=0;if(!Number.isFinite(o.position.z))o.position.z=0;if(!Number.isFinite(o.scale.x))o.scale.x=1;if(!Number.isFinite(o.scale.y))o.scale.y=1;if(!Number.isFinite(o.scale.z))o.scale.z=1;o.updateMatrix();}});
  root.updateMatrixWorld(true);
  root.traverse(o=>{
    if(!o.isMesh)return;report.meshes++;if(o.userData.productionShell)report.productionMeshes++;
    const g=o.geometry;if(g){
      if(!g.attributes?.normal)report.missingNormals.push(o.name||'unnamed');if(ensureUVs(g))report.generatedUVs++;if(!g.attributes?.uv)report.missingUVs.push(o.name||'unnamed');
      const n=g.index?g.index.count/3:(g.attributes?.position?.count||0)/3;report.triangles+=n;
      const pos=g.attributes?.position;let finite=true;if(pos){for(let i=0;i<pos.count;i++){if(!Number.isFinite(pos.getX(i))||!Number.isFinite(pos.getY(i))||!Number.isFinite(pos.getZ(i))){finite=false;break;}}}
      if(!finite){report.tinyMeshes.push(`${o.name||'unnamed'}:non-finite-geometry`);}else{g.computeBoundingBox();const s=new THREE.Vector3();g.boundingBox?.getSize(s);if(s.lengthSq()<1e-7)report.tinyMeshes.push(o.name||'unnamed');}
    }
    const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats)if(m)report.materials.add(m.uuid);
  });
  report.materials=report.materials.size;report.triangles=Math.round(report.triangles);
  report.valid=report.productionMeshes>=12&&report.triangles>=2500&&report.materials>=4&&report.missingNormals.length===0&&report.missingUVs.length===0&&report.tinyMeshes.length===0;
  report.warnings=[];if(report.nonFiniteTransforms.length)report.warnings.push(`Sanitized ${report.nonFiniteTransforms.length} non-finite transforms`);if(report.productionMeshes<12)report.warnings.push('Insufficient production shell mesh layering');if(report.triangles<2500)report.warnings.push(`Character shell triangle count too low: ${report.triangles}`);if(report.materials<4)report.warnings.push(`Character material zoning too low: ${report.materials}`);if(report.missingNormals.length)report.warnings.push(`${report.missingNormals.length} meshes lack normals`);if(report.missingUVs.length)report.warnings.push(`${report.missingUVs.length} meshes lack UVs`);if(report.tinyMeshes.length)report.warnings.push(`${report.tinyMeshes.length} degenerate/non-finite meshes`);
  root.userData.characterQuality=report;return report;
}

export function assertProductionCharacter(root,label='character'){const report=sanitizeProductionShell(root);if(!report.valid)throw new Error(`${label} production character rejected: ${report.warnings.join('; ')}`);return report;}
