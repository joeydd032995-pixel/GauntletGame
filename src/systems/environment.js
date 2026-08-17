import * as THREE from 'three';
import { makeStoneMaterial, makeCrystalMaterial, makeFoliageMaterial } from './materials.js';

export function buildRuinArena({scene,physics,heightFn,rng}){
  const root=new THREE.Group();root.name='RuinArena';scene.add(root);const stone=makeStoneMaterial();
  const rubbleGeo=new THREE.DodecahedronGeometry(1,1),columnGeo=new THREE.CylinderGeometry(.48,.64,1,14,4),slabGeo=new THREE.BoxGeometry(1,1,1,3,1,3);
  for(let i=0;i<18;i++){
    const a=i/18*Math.PI*2,r=10.8+(i%3)*.65,x=Math.cos(a)*r,z=Math.sin(a)*r,y=heightFn(x,z),g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=-a+(rng()-.5)*.35;
    if(i%4===0){const h=2.8+rng()*1.6,col=new THREE.Mesh(columnGeo,stone);col.scale.set(.86,h,.86);col.position.y=h*.5;col.rotation.z=(rng()-.5)*.08;col.castShadow=col.receiveShadow=true;g.add(col);const cap=new THREE.Mesh(new THREE.DodecahedronGeometry(.68,1),stone);cap.scale.set(1.1,.38,1.1);cap.position.y=h+.18;cap.rotation.set(rng()*.2,rng()*6.28,rng()*.15);cap.castShadow=true;g.add(cap);physics.addBox(new THREE.Vector3(x,y+h*.5,z),new THREE.Vector3(.55,h*.5,.55));}
    else{const pieces=2+(i%2);let top=.15;for(let j=0;j<pieces;j++){const rock=new THREE.Mesh(rubbleGeo,stone);const sy=.7+rng()*1.15,sx=.58+rng()*.5,sz=.5+rng()*.45;rock.scale.set(sx,sy,sz);rock.position.set((rng()-.5)*.24,top+sy*.72,(rng()-.5)*.2);rock.rotation.set((rng()-.5)*.18,rng()*6.28,(rng()-.5)*.16);rock.castShadow=rock.receiveShadow=true;g.add(rock);top+=sy*1.12;}physics.addBox(new THREE.Vector3(x,y+top*.45,z),new THREE.Vector3(.7,top*.45,.65));}
    root.add(g);
  }
  for(let i=0;i<16;i++){const a=i/16*Math.PI*2,r=7.55+(i%2)*.35,x=Math.cos(a)*r,z=Math.sin(a)*r,y=heightFn(x,z),slab=new THREE.Mesh(slabGeo,stone);slab.scale.set(1.55,.12,.78);slab.position.set(x,y+.025,z);slab.rotation.set((rng()-.5)*.025,-a+(rng()-.5)*.12,(rng()-.5)*.02);slab.castShadow=false;slab.receiveShadow=true;root.add(slab);}
  const archMat=stone;for(const a of [0,Math.PI]){const r=11.4,x=Math.cos(a)*r,z=Math.sin(a)*r,y=heightFn(x,z),gate=new THREE.Group();gate.position.set(x,y,z);gate.rotation.y=-a;for(const s of [-1,1]){const p=new THREE.Mesh(new THREE.CylinderGeometry(.38,.52,3.5,14,4),archMat);p.position.set(s*1.22,1.75,0);p.rotation.z=s*.025;p.castShadow=p.receiveShadow=true;gate.add(p);}const arch=new THREE.Mesh(new THREE.TorusGeometry(1.22,.32,12,36,Math.PI),archMat);arch.position.y=3.45;arch.rotation.z=Math.PI;arch.rotation.y=Math.PI/2;arch.castShadow=true;gate.add(arch);root.add(gate);}
  const rune=new THREE.Mesh(new THREE.RingGeometry(2.4,2.48,96),new THREE.MeshBasicMaterial({color:0x52cce8,transparent:true,opacity:.2,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));rune.rotation.x=-Math.PI/2;rune.position.set(0,heightFn(0,0)+.035,0);root.add(rune);
  if(!scene.getObjectByName('GroundDetail'))buildGroundDetail({scene,heightFn,rng});
  return root;
}

export function buildGroundDetail({scene,heightFn,rng}){
  const root=new THREE.Group();root.name='GroundDetail';scene.add(root);
  const grassMat=makeFoliageMaterial();grassMat.side=THREE.DoubleSide;const bladeGeo=new THREE.PlaneGeometry(.13,.5,1,3);bladeGeo.translate(0,.25,0);
  const grass=new THREE.InstancedMesh(bladeGeo,grassMat,520);grass.frustumCulled=true;grass.castShadow=false;grass.receiveShadow=true;
  let gi=0;for(let i=0;i<700&&gi<520;i++){const a=rng()*Math.PI*2,r=4.4+Math.sqrt(rng())*13.5,x=Math.cos(a)*r,z=Math.sin(a)*r;if(Math.abs(r-7.7)<.65)continue;const y=heightFn(x,z),s=.55+rng()*.75,q=new THREE.Quaternion().setFromEuler(new THREE.Euler((rng()-.5)*.12,rng()*Math.PI*2,(rng()-.5)*.12)),m=new THREE.Matrix4().compose(new THREE.Vector3(x,y+.015,z),q,new THREE.Vector3(s,s,s));grass.setMatrixAt(gi++,m);}grass.count=gi;grass.instanceMatrix.needsUpdate=true;root.add(grass);
  const pebbleGeo=new THREE.DodecahedronGeometry(.12,1),pebbles=new THREE.InstancedMesh(pebbleGeo,makeStoneMaterial(),180);let pi=0;for(let i=0;i<240&&pi<180;i++){const a=rng()*Math.PI*2,r=4+rng()*13.5,x=Math.cos(a)*r,z=Math.sin(a)*r;if(Math.abs(r-7.7)<.5)continue;const y=heightFn(x,z),s=.45+rng()*1.35,m=new THREE.Matrix4().compose(new THREE.Vector3(x,y+.05*s,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rng(),rng()*6.28,rng())),new THREE.Vector3(s*1.2,s*.6,s));pebbles.setMatrixAt(pi++,m);}pebbles.count=pi;pebbles.instanceMatrix.needsUpdate=true;pebbles.castShadow=false;pebbles.receiveShadow=true;root.add(pebbles);
  return root;
}

export function buildCrystalField({scene,heightFn,rng}){
  const root=new THREE.Group();root.name='CrystalField';scene.add(root);const material=makeCrystalMaterial(),geo=new THREE.OctahedronGeometry(.28,2);
  for(let i=0;i<12;i++){const a=rng()*Math.PI*2,r=17+rng()*30,x=Math.cos(a)*r,z=Math.sin(a)*r,s=.75+rng()*.65,c=new THREE.Mesh(geo,material);c.scale.set(s*.62,s*(2.4+rng()*1.9),s*.62);c.position.set(x,heightFn(x,z)+.48*s,z);c.rotation.set((rng()-.5)*.14,rng()*6.28,(rng()-.5)*.22);c.castShadow=true;root.add(c);if(i<4){const l=new THREE.PointLight(0x4acff2,.72,7,2);l.position.copy(c.position).add(new THREE.Vector3(0,.8,0));root.add(l);}}
  return root;
}
