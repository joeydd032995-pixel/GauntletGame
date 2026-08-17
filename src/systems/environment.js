import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeStoneMaterial, makeCrystalMaterial, makeFoliageMaterial } from './materials.js';

function brokenWallGeometry(){
  const s=new THREE.Shape();s.moveTo(-.72,0);s.lineTo(.7,0);s.lineTo(.67,.86);s.lineTo(.48,1.18);s.lineTo(.18,1.08);s.lineTo(-.08,1.45);s.lineTo(-.36,1.32);s.lineTo(-.7,1.02);s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth:.48,steps:1,bevelEnabled:true,bevelSegments:2,bevelSize:.055,bevelThickness:.055,curveSegments:3});g.translate(0,0,-.24);g.computeVertexNormals();return g;
}
function grassClumpGeometry(){
  const parts=[];
  for(let b=0;b<6;b++){
    const rows=5,verts=[],idx=[],angle=b/6*Math.PI*2+.27*(b%2),h=.42+(b%3)*.08,w=.055+(b%2)*.018;
    for(let r=0;r<=rows;r++){const t=r/rows,width=w*(1-t*.88),bend=t*t*.11;for(const side of [-1,1]){const lx=side*width,ly=t*h,lz=bend;const x=lx*Math.cos(angle)+lz*Math.sin(angle),z=-lx*Math.sin(angle)+lz*Math.cos(angle);verts.push(x,ly,z);}}
    for(let r=0;r<rows;r++){const a=r*2,b0=a+1,c=a+2,d=a+3;idx.push(a,c,b0,b0,c,d);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(idx);g.computeVertexNormals();parts.push(g);
  }
  const merged=mergeGeometries(parts,false);for(const p of parts)p.dispose();return merged;
}

export function buildRuinArena({scene,physics,heightFn,rng}){
  const root=new THREE.Group();root.name='RuinArena';scene.add(root);const stone=makeStoneMaterial(),wallGeo=brokenWallGeometry(),columnGeo=new THREE.CylinderGeometry(.48,.64,1,18,5),slabGeo=new THREE.BoxGeometry(1,1,1,4,1,4),rubbleGeo=new THREE.DodecahedronGeometry(.35,1);
  for(let i=0;i<18;i++){
    const a=i/18*Math.PI*2,r=10.7+(i%3)*.72,x=Math.cos(a)*r,z=Math.sin(a)*r,y=heightFn(x,z),g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=-a+(rng()-.5)*.28;
    if(i%5===0){const h=2.7+rng()*1.45,col=new THREE.Mesh(columnGeo,stone);col.scale.set(.82,h,.82);col.position.y=h*.5;col.rotation.z=(rng()-.5)*.055;col.castShadow=col.receiveShadow=true;g.add(col);const cap=new THREE.Mesh(new THREE.CylinderGeometry(.68,.62,.22,18),stone);cap.position.y=h+.08;cap.castShadow=true;g.add(cap);physics.addBox(new THREE.Vector3(x,y+h*.5,z),new THREE.Vector3(.52,h*.5,.52));}
    else{const wall=new THREE.Mesh(wallGeo,stone);const sx=.78+rng()*.58,sy=.9+rng()*.7;wall.scale.set(sx,sy,.82+rng()*.28);wall.rotation.z=(rng()-.5)*.075;wall.castShadow=wall.receiveShadow=true;g.add(wall);for(let j=0;j<2;j++){const rubble=new THREE.Mesh(rubbleGeo,stone);const rs=.45+rng()*.75;rubble.scale.set(rs*1.3,rs*.65,rs);rubble.position.set((rng()-.5)*1.15,.12+rs*.16,(rng()-.5)*.75);rubble.rotation.set(rng(),rng()*6.28,rng());rubble.castShadow=true;g.add(rubble);}physics.addBox(new THREE.Vector3(x,y+.68*sy,z),new THREE.Vector3(.72*sx,.7*sy,.42));}
    root.add(g);
  }
  for(let i=0;i<16;i++){const a=i/16*Math.PI*2,r=7.55+(i%2)*.34,x=Math.cos(a)*r,z=Math.sin(a)*r,y=heightFn(x,z),slab=new THREE.Mesh(slabGeo,stone);slab.scale.set(1.45,.1,.72);slab.position.set(x,y+.02,z);slab.rotation.set((rng()-.5)*.02,-a+(rng()-.5)*.1,(rng()-.5)*.018);slab.receiveShadow=true;root.add(slab);}
  for(const a of [0,Math.PI]){const r=11.35,x=Math.cos(a)*r,z=Math.sin(a)*r,y=heightFn(x,z),gate=new THREE.Group();gate.position.set(x,y,z);gate.rotation.y=-a;for(const s of [-1,1]){const p=new THREE.Mesh(new THREE.CylinderGeometry(.38,.52,3.5,18,4),stone);p.position.set(s*1.22,1.75,0);p.rotation.z=s*.025;p.castShadow=p.receiveShadow=true;gate.add(p);}const arch=new THREE.Mesh(new THREE.TorusGeometry(1.22,.3,14,42,Math.PI),stone);arch.position.y=3.44;arch.rotation.z=Math.PI;arch.rotation.y=Math.PI/2;arch.castShadow=true;gate.add(arch);root.add(gate);}
  const rune=new THREE.Mesh(new THREE.RingGeometry(2.4,2.47,96),new THREE.MeshBasicMaterial({color:0x52cce8,transparent:true,opacity:.16,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));rune.rotation.x=-Math.PI/2;rune.position.set(0,heightFn(0,0)+.035,0);root.add(rune);
  if(!scene.getObjectByName('GroundDetail'))buildGroundDetail({scene,heightFn,rng});
  return root;
}

export function buildGroundDetail({scene,heightFn,rng}){
  const root=new THREE.Group();root.name='GroundDetail';scene.add(root);const grassMat=makeFoliageMaterial();grassMat.side=THREE.DoubleSide;const clumpGeo=grassClumpGeometry(),grass=new THREE.InstancedMesh(clumpGeo,grassMat,360);grass.frustumCulled=true;grass.castShadow=false;grass.receiveShadow=true;
  let gi=0;for(let i=0;i<520&&gi<360;i++){const a=rng()*Math.PI*2,r=4.6+Math.sqrt(rng())*13.1,x=Math.cos(a)*r,z=Math.sin(a)*r;if(Math.abs(r-7.7)<.72)continue;const y=heightFn(x,z),s=.55+rng()*.82,q=new THREE.Quaternion().setFromEuler(new THREE.Euler((rng()-.5)*.08,rng()*Math.PI*2,(rng()-.5)*.08)),m=new THREE.Matrix4().compose(new THREE.Vector3(x,y+.012,z),q,new THREE.Vector3(s,s,s));grass.setMatrixAt(gi++,m);}grass.count=gi;grass.instanceMatrix.needsUpdate=true;root.add(grass);
  const pebbleGeo=new THREE.DodecahedronGeometry(.12,1),pebbles=new THREE.InstancedMesh(pebbleGeo,makeStoneMaterial(),150);let pi=0;for(let i=0;i<210&&pi<150;i++){const a=rng()*Math.PI*2,r=4+rng()*13.3,x=Math.cos(a)*r,z=Math.sin(a)*r;if(Math.abs(r-7.7)<.5)continue;const y=heightFn(x,z),s=.45+rng()*1.25,m=new THREE.Matrix4().compose(new THREE.Vector3(x,y+.05*s,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rng(),rng()*6.28,rng())),new THREE.Vector3(s*1.2,s*.6,s));pebbles.setMatrixAt(pi++,m);}pebbles.count=pi;pebbles.instanceMatrix.needsUpdate=true;pebbles.receiveShadow=true;root.add(pebbles);return root;
}

export function buildCrystalField({scene,heightFn,rng}){
  const root=new THREE.Group();root.name='CrystalField';scene.add(root);const material=makeCrystalMaterial(),geo=new THREE.OctahedronGeometry(.28,2);
  for(let i=0;i<12;i++){const a=rng()*Math.PI*2,r=17+rng()*30,x=Math.cos(a)*r,z=Math.sin(a)*r,s=.75+rng()*.65,c=new THREE.Mesh(geo,material);c.scale.set(s*.62,s*(2.4+rng()*1.9),s*.62);c.position.set(x,heightFn(x,z)+.48*s,z);c.rotation.set((rng()-.5)*.14,rng()*6.28,(rng()-.5)*.22);c.castShadow=true;root.add(c);if(i<4){const l=new THREE.PointLight(0x4acff2,.72,7,2);l.position.copy(c.position).add(new THREE.Vector3(0,.8,0));root.add(l);}}
  return root;
}
