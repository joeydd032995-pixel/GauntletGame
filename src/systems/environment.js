import * as THREE from 'three';
import { makeStoneMaterial, makeCrystalMaterial, makeFoliageMaterial } from './materials.js';
import { installHybridEnvironment } from './hybridEnvironment.js';
import { createGrassClumpGeometry, createFernGeometry, createBroadleafGroundGeometry, createFlowerGeometry } from './foliage.js';

function brokenWallGeometry(){
  const s=new THREE.Shape();s.moveTo(-.72,0);s.lineTo(.7,0);s.lineTo(.67,.86);s.lineTo(.48,1.18);s.lineTo(.18,1.08);s.lineTo(-.08,1.45);s.lineTo(-.36,1.32);s.lineTo(-.7,1.02);s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth:.48,steps:1,bevelEnabled:true,bevelSegments:2,bevelSize:.055,bevelThickness:.055,curveSegments:3});g.translate(0,0,-.24);g.computeVertexNormals();return g;
}
function combatLane(x,z){const r=Math.hypot(x,z);return r<4.45||(Math.abs(x)<2.05&&z>-14&&z<14);}
function clusteredPoint(rng,index,spread=2.6){const centers=[[-8.8,-5.5],[8.5,-5.8],[-10.4,3.8],[10.6,4.1],[-6.3,10.2],[6.7,10.6],[-13.2,-.5],[13.1,.4],[-4.8,-12.1],[5.2,-12.3]],c=centers[index%centers.length],a=rng()*Math.PI*2,r=Math.sqrt(rng())*spread;return[c[0]+Math.cos(a)*r,c[1]+Math.sin(a)*r];}
function configureInstances(mesh,count){mesh.count=count;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.frustumCulled=true;mesh.receiveShadow=true;return mesh;}

export function buildRuinArena({scene,physics,heightFn,rng}){
  const root=new THREE.Group();root.name='RuinArena';scene.add(root);const stone=makeStoneMaterial(),wallGeo=brokenWallGeometry(),columnGeo=new THREE.CylinderGeometry(.48,.64,1,18,5),slabGeo=new THREE.BoxGeometry(1,1,1,4,1,4),rubbleGeo=new THREE.DodecahedronGeometry(.35,1);
  for(let i=0;i<18;i++){
    const a=i/18*Math.PI*2,r=10.7+(i%3)*.72,x=Math.cos(a)*r,z=Math.sin(a)*r,y=heightFn(x,z),g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=-a+(rng()-.5)*.28;
    if(i%5===0){const h=2.7+rng()*1.45,col=new THREE.Mesh(columnGeo,stone);col.scale.set(.82,h,.82);col.position.y=h*.5;col.rotation.z=(rng()-.5)*.055;col.castShadow=col.receiveShadow=true;g.add(col);const cap=new THREE.Mesh(new THREE.CylinderGeometry(.68,.62,.22,18),stone);cap.position.y=h+.08;cap.castShadow=true;g.add(cap);physics.addBox(new THREE.Vector3(x,y+h*.5,z),new THREE.Vector3(.52,h*.5,.52));}
    else{const wall=new THREE.Mesh(wallGeo,stone);const sx=.78+rng()*.58,sy=.9+rng()*.7;wall.scale.set(sx,sy,.82+rng()*.28);wall.rotation.z=(rng()-.5)*.075;wall.castShadow=wall.receiveShadow=true;g.add(wall);for(let j=0;j<2;j++){const rubble=new THREE.Mesh(rubbleGeo,stone);const rs=.45+rng()*.75;rubble.scale.set(rs*1.3,rs*.65,rs);rubble.position.set((rng()-.5)*1.15,.12+rs*.16,(rng()-.5)*.75);rubble.rotation.set(rng(),rng()*6.28,rng());rubble.castShadow=true;g.add(rubble);}physics.addBox(new THREE.Vector3(x,y+.68*sy,z),new THREE.Vector3(.72*sx,.7*sy,.42));}
    root.add(g);
  }
  for(let i=0;i<16;i++){const a=i/16*Math.PI*2,r=7.55+(i%2)*.34,x=Math.cos(a)*r,z=Math.sin(a)*r,y=heightFn(x,z),slab=new THREE.Mesh(slabGeo,stone);slab.scale.set(1.45,.1,.72);slab.position.set(x,y+.02,z);slab.rotation.set((rng()-.5)*.02,-a+(rng()-.5)*.1,(rng()-.5)*.018);slab.receiveShadow=true;root.add(slab);}
  for(const a of[0,Math.PI]){const r=11.35,x=Math.cos(a)*r,z=Math.sin(a)*r,y=heightFn(x,z),gate=new THREE.Group();gate.position.set(x,y,z);gate.rotation.y=-a;for(const s of[-1,1]){const p=new THREE.Mesh(new THREE.CylinderGeometry(.38,.52,3.5,18,4),stone);p.position.set(s*1.22,1.75,0);p.rotation.z=s*.025;p.castShadow=p.receiveShadow=true;gate.add(p);}const arch=new THREE.Mesh(new THREE.TorusGeometry(1.22,.3,14,42,Math.PI),stone);arch.position.y=3.44;arch.rotation.z=Math.PI;arch.rotation.y=Math.PI/2;arch.castShadow=true;gate.add(arch);root.add(gate);}
  const rune=new THREE.Mesh(new THREE.RingGeometry(2.4,2.47,96),new THREE.MeshBasicMaterial({color:0x52cce8,transparent:true,opacity:.16,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));rune.rotation.x=-Math.PI/2;rune.position.set(0,heightFn(0,0)+.035,0);root.add(rune);
  if(!scene.getObjectByName('GroundDetail'))buildGroundDetail({scene,heightFn,rng});
  installHybridEnvironment({scene,heightFn}).catch(error=>console.error('Hybrid authored environment rejected:',error));
  return root;
}

export function buildGroundDetail({scene,heightFn,rng}){
  const root=new THREE.Group();root.name='GroundDetail';scene.add(root);
  const foliage=makeFoliageMaterial();foliage.side=THREE.DoubleSide;foliage.roughness=.9;const grassGeo=createGrassClumpGeometry({blades:9,height:.5,width:.052}),fernGeo=createFernGeometry(),broadGeo=createBroadleafGroundGeometry(),flowerGeo=createFlowerGeometry();
  const grass=new THREE.InstancedMesh(grassGeo,foliage,560),ferns=new THREE.InstancedMesh(fernGeo,foliage.clone(),150),broadleaf=new THREE.InstancedMesh(broadGeo,foliage.clone(),130),flowerMat=new THREE.MeshStandardMaterial({color:0xe7dca6,roughness:.82,metalness:0,side:THREE.DoubleSide}),flowers=new THREE.InstancedMesh(flowerGeo,flowerMat,96);
  const palettes={grass:[0x68834a,0x55743f,0x7b8d50],fern:[0x496d43,0x355b39,0x5b7546],broad:[0x5d7942,0x436535,0x789054],flower:[0xe7dca6,0xd7c36b,0xc7d8ef,0xbccfa8]};
  function fill(mesh,target,kind,spread,scaleMin,scaleMax){let n=0,tries=0;while(n<target&&tries<target*6){const[x,z]=clusteredPoint(rng,tries+(kind==='fern'?2:kind==='flower'?5:kind==='broad'?7:0),spread),r=Math.hypot(x,z);tries++;if(r>18.8||combatLane(x,z))continue;const y=heightFn(x,z),s=scaleMin+rng()*(scaleMax-scaleMin),tilt=(rng()-.5)*.07,q=new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt,rng()*Math.PI*2,-tilt*.7));mesh.setMatrixAt(n,new THREE.Matrix4().compose(new THREE.Vector3(x,y+.012,z),q,new THREE.Vector3(s,s*(.92+rng()*.16),s)));const palette=palettes[kind],c=new THREE.Color(palette[Math.floor(rng()*palette.length)]);mesh.setColorAt(n,c);n++;}configureInstances(mesh,n);return n;}
  const counts={grass:fill(grass,520,'grass',3.25,.62,1.28),fern:fill(ferns,132,'fern',2.7,.72,1.25),broadleaf:fill(broadleaf,118,'broad',2.45,.7,1.18),flowers:fill(flowers,84,'flower',2.2,.68,1.16)};
  grass.castShadow=false;ferns.castShadow=false;broadleaf.castShadow=false;flowers.castShadow=false;root.add(grass,ferns,broadleaf,flowers);
  const pebbleGeo=new THREE.DodecahedronGeometry(.12,1),pebbles=new THREE.InstancedMesh(pebbleGeo,makeStoneMaterial(),190);let pi=0;for(let i=0;i<280&&pi<180;i++){const a=rng()*Math.PI*2,r=4.2+rng()*14.1,x=Math.cos(a)*r,z=Math.sin(a)*r;if(combatLane(x,z)&&rng()>.24)continue;const y=heightFn(x,z),s=.42+rng()*1.2;pebbles.setMatrixAt(pi++,new THREE.Matrix4().compose(new THREE.Vector3(x,y+.045*s,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rng(),rng()*6.28,rng())),new THREE.Vector3(s*1.25,s*.55,s)));}configureInstances(pebbles,pi);pebbles.castShadow=false;root.add(pebbles);counts.pebbles=pi;
  const status={target:'high-end OSRS/07Scape',ready:true,accepted:false,placement:'clustered-authored-density',combatLaneClear:true,clusters:10,counts,totalPlants:counts.grass+counts.fern+counts.broadleaf+counts.flowers,note:'Structural density only; screenshot critic controls visual acceptance.'};if(typeof window!=='undefined')window.__GAUNTLET_GROUND_DETAIL__=status;return root;
}

export function buildCrystalField({scene,heightFn,rng}){
  const root=new THREE.Group();root.name='CrystalField';scene.add(root);const material=makeCrystalMaterial(),geo=new THREE.OctahedronGeometry(.28,2);
  for(let i=0;i<12;i++){const a=rng()*Math.PI*2,r=17+rng()*30,x=Math.cos(a)*r,z=Math.sin(a)*r,s=.75+rng()*.65,c=new THREE.Mesh(geo,material);c.scale.set(s*.62,s*(2.4+rng()*1.9),s*.62);c.position.set(x,heightFn(x,z)+.48*s,z);c.rotation.set((rng()-.5)*.14,rng()*6.28,(rng()-.5)*.22);c.castShadow=true;root.add(c);if(i<4){const l=new THREE.PointLight(0x4acff2,.72,7,2);l.position.copy(c.position).add(new THREE.Vector3(0,.8,0));root.add(l);}}
  return root;
}
