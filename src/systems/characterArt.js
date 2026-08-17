import * as THREE from 'three';
import { makeArmorMaterial, makeClothMaterial, physicalSurface } from './materials.js';

function shadow(mesh){mesh.castShadow=true;mesh.receiveShadow=true;return mesh;}
function lathe(points,segments=32){return new THREE.LatheGeometry(points.map(([x,y])=>new THREE.Vector2(x,y)),segments);}

export function applyHeroArtPass(rig){
  const steel=makeArmorMaterial('steel'),dark=makeArmorMaterial('dark'),gold=makeArmorMaterial('gold'),cloth=makeClothMaterial();
  const helmMat=physicalSurface('hero-helm',{base:0x91abb2,secondary:0x344d58,seed:257,frequency:.06,roughness:.27,roughVariation:.1,normalStrength:1.2,repeat:2.8,normalScale:.3,metalness:.8,clearcoat:.14,envMapIntensity:.7});
  const head=rig.bones.head,chest=rig.bones.chest,hips=rig.bones.hips;
  for(const c of head.children)if(c.isMesh)c.visible=false;
  const helm=new THREE.Group();helm.name='VanguardHelm';
  const shell=shadow(new THREE.Mesh(lathe([[.08,-.27],[.22,-.25],[.29,-.14],[.31,.06],[.28,.25],[.19,.35],[.06,.39]],36),helmMat));shell.position.y=.16;helm.add(shell);
  const visor=shadow(new THREE.Mesh(new THREE.BoxGeometry(.54,.12,.08,4,2,1),dark));visor.position.set(0,.16,.255);visor.rotation.x=-.08;helm.add(visor);
  for(const s of [-1,1]){const cheek=shadow(new THREE.Mesh(new THREE.BoxGeometry(.12,.27,.11,2,3,1),gold));cheek.position.set(.225*s,-.015,.205);cheek.rotation.z=-s*.16;helm.add(cheek);}
  const crest=shadow(new THREE.Mesh(new THREE.ConeGeometry(.055,.62,10),gold));crest.position.set(0,.55,-.02);crest.rotation.z=-.08;helm.add(crest);head.add(helm);

  const abdominal=new THREE.Group();abdominal.name='HeroAbdominalArmor';abdominal.position.set(0,-.26,0);chest.add(abdominal);
  const core=shadow(new THREE.Mesh(new THREE.CylinderGeometry(.33,.4,.56,18,3),dark));core.scale.z=.82;abdominal.add(core);
  for(const z of [-.28,.28]){const plate=shadow(new THREE.Mesh(new THREE.BoxGeometry(.68,.42,.09,5,4,1),steel));plate.position.set(0,-.02,z);plate.rotation.x=z>0?-.08:.08;abdominal.add(plate);}
  const belt=shadow(new THREE.Mesh(new THREE.TorusGeometry(.39,.045,10,28),gold));belt.rotation.x=Math.PI/2;belt.position.y=-.28;abdominal.add(belt);
  const tabard=shadow(new THREE.Mesh(new THREE.PlaneGeometry(.42,.82,5,8),cloth));tabard.position.set(0,-.68,.25);tabard.rotation.x=-.04;hips.add(tabard);
  const tabardBack=shadow(new THREE.Mesh(new THREE.PlaneGeometry(.4,.74,5,8),cloth));tabardBack.position.set(0,-.62,-.25);tabardBack.rotation.y=Math.PI;hips.add(tabardBack);

  for(const side of ['Left','Right']){
    const hand=rig.group.getObjectByName(`${side}Hand`),shin=rig.group.getObjectByName(`${side}Leg`),foot=rig.group.getObjectByName(`${side}Foot`);if(hand){const gauntlet=shadow(new THREE.Mesh(new THREE.DodecahedronGeometry(.13,2),gold));gauntlet.scale.set(.8,1.15,.72);gauntlet.position.set(0,-.02,.015);hand.add(gauntlet);}if(shin){const greave=shadow(new THREE.Mesh(new THREE.CylinderGeometry(.12,.15,.5,14,2),steel));greave.position.set(0,-.27,.02);greave.scale.z=.86;shin.add(greave);}if(foot){const sabaton=shadow(new THREE.Mesh(new THREE.BoxGeometry(.24,.15,.4,3,2,5),dark));sabaton.position.set(0,-.05,.17);sabaton.rotation.x=-.04;foot.add(sabaton);}}
  return helm;
}

export function applyEnemyArtPass(rig){
  const iron=physicalSurface('warden-iron',{base:0x544d59,secondary:0x17131b,seed:271,frequency:.07,roughness:.33,roughVariation:.12,normalStrength:1.6,repeat:2.8,normalScale:.42,metalness:.68,clearcoat:.08}),red=physicalSurface('warden-rune',{base:0xa54b3f,secondary:0x421416,seed:281,frequency:.06,roughness:.37,roughVariation:.12,normalStrength:1.3,repeat:3,normalScale:.34,metalness:.42,emissive:0x2a0807,emissiveIntensity:.65}),cloth=physicalSurface('warden-cloth',{base:0x382d3c,secondary:0x140f19,seed:293,frequency:.18,roughness:.86,roughVariation:.08,normalStrength:1.5,repeat:4,normalScale:.4});
  const head=rig.bones.head,spine=rig.bones.spine,hips=rig.bones.hips;
  for(const c of head.children)if(c.isMesh)c.visible=false;
  const helm=new THREE.Group();helm.name='WardenHelm';
  const shell=shadow(new THREE.Mesh(lathe([[.12,-.34],[.33,-.27],[.4,-.08],[.38,.22],[.28,.39],[.08,.48]],28),iron));shell.position.y=.14;helm.add(shell);
  const face=shadow(new THREE.Mesh(new THREE.BoxGeometry(.58,.32,.12,4,4,1),red));face.position.set(0,.02,.34);face.rotation.x=-.08;helm.add(face);
  for(const s of [-1,1]){const horn=shadow(new THREE.Mesh(new THREE.ConeGeometry(.1,.92,12),red));horn.position.set(.25*s,.52,-.02);horn.rotation.z=.55*s;helm.add(horn);}
  const crown=shadow(new THREE.Mesh(new THREE.ConeGeometry(.08,.82,8),iron));crown.position.set(0,.78,-.08);helm.add(crown);head.add(helm);

  const cuirass=shadow(new THREE.Mesh(new THREE.CylinderGeometry(.48,.58,.86,18,3),iron));cuirass.position.set(0,.12,0);cuirass.scale.z=.8;spine.add(cuirass);
  const breast=shadow(new THREE.Mesh(new THREE.BoxGeometry(1.0,.55,.14,5,4,1),red));breast.position.set(0,.22,.42);spine.add(breast);
  const skirt=shadow(new THREE.Mesh(new THREE.CylinderGeometry(.5,.64,.7,16,2,true),cloth));skirt.position.set(0,-.42,0);hips.add(skirt);
  const waist=shadow(new THREE.Mesh(new THREE.TorusGeometry(.52,.065,10,28),red));waist.rotation.x=Math.PI/2;waist.position.y=-.14;hips.add(waist);
  for(const side of ['Left','Right']){const shin=rig.group.getObjectByName(`${side}Leg`),foot=rig.group.getObjectByName(`${side}Foot`);if(shin){const greave=shadow(new THREE.Mesh(new THREE.CylinderGeometry(.17,.2,.58,14,2),red));greave.position.set(0,-.3,.025);shin.add(greave);}if(foot){const boot=shadow(new THREE.Mesh(new THREE.BoxGeometry(.32,.2,.5,3,2,5),iron));boot.position.set(0,-.06,.2);foot.add(boot);}}
  return helm;
}
