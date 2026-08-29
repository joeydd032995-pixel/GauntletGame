import * as THREE from 'three';
import { physicalSurface } from './materials.js';

function shadow(mesh, lod=0){
  mesh.castShadow=true; mesh.receiveShadow=true;
  mesh.userData.productionShell=true; mesh.userData.lodLevel=lod;
  return mesh;
}
function mark(group){ group.userData.productionShell=true; return group; }
function hideLegacy(node){
  for(const c of node.children){
    if(c.isMesh && !c.userData.productionShell) c.visible=false;
    if(!c.isBone) hideLegacy(c);
  }
}
function loftGeometry(levels, radial=24){
  const positions=[], indices=[];
  for(let j=0;j<levels.length;j++){
    const l=levels[j];
    for(let i=0;i<radial;i++){
      const a=i/radial*Math.PI*2, ca=Math.cos(a), sa=Math.sin(a);
      const front=(l.front||0)*Math.max(0,sa);
      positions.push(ca*l.w,l.y,sa*l.d+front);
    }
  }
  for(let j=0;j<levels.length-1;j++) for(let i=0;i<radial;i++){
    const n=(i+1)%radial,a=j*radial+i,b=j*radial+n,c=(j+1)*radial+n,d=(j+1)*radial+i;
    indices.push(a,b,d,b,c,d);
  }
  const bottom=positions.length/3; positions.push(0,levels[0].y,0);
  const top=positions.length/3; positions.push(0,levels.at(-1).y,0);
  for(let i=0;i<radial;i++){
    const n=(i+1)%radial;
    indices.push(bottom,n,i);
    const o=(levels.length-1)*radial; indices.push(top,o+i,o+n);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setIndex(indices); g.computeVertexNormals(); g.computeBoundingSphere();
  return g;
}
function extrudedPlate(points,depth=.1,bevel=.025){
  const s=new THREE.Shape(); s.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length;i++)s.lineTo(points[i][0],points[i][1]); s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:6});
  g.translate(0,0,-depth*.5); g.computeVertexNormals(); return g;
}
function taperedLimb({top=.18,bottom=.13,length=.5,depth=.14,segments=18}){
  return loftGeometry([
    {y:length*.5,w:top,d:depth},{y:length*.12,w:top*.96,d:depth*.98},
    {y:-length*.35,w:bottom*1.03,d:depth*.9},{y:-length*.5,w:bottom,d:depth*.85}
  ],segments);
}
function curvedCloth(width,height,segments=10){
  const g=new THREE.PlaneGeometry(width,height,Math.max(2,Math.floor(segments*.55)),segments);
  const p=g.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),t=1-(y/height+.5);
    p.setZ(i,-.035-Math.pow(t,1.4)*.12+Math.abs(x/width)*.025);
  }
  p.needsUpdate=true; g.computeVertexNormals(); return g;
}
function materialSet(prefix,palette){
  const steel=physicalSurface(`${prefix}-steel`,{base:palette.steel,secondary:palette.steelDark,seed:401,frequency:.055,roughness:.25,roughVariation:.11,normalStrength:1.6,repeat:3.1,normalScale:.42,metalness:.86,clearcoat:.13,clearcoatRoughness:.31,envMapIntensity:.78});
  const dark=physicalSurface(`${prefix}-dark`,{base:palette.dark,secondary:palette.dark2,seed:409,frequency:.07,roughness:.34,roughVariation:.12,normalStrength:1.8,repeat:3.3,normalScale:.46,metalness:.64,clearcoat:.06,envMapIntensity:.62});
  const trim=physicalSurface(`${prefix}-trim`,{base:palette.trim,secondary:palette.trimDark,seed:419,frequency:.05,roughness:.2,roughVariation:.08,normalStrength:1.1,repeat:2.7,normalScale:.3,metalness:.93,clearcoat:.18,clearcoatRoughness:.24,envMapIntensity:.86});
  const cloth=physicalSurface(`${prefix}-cloth`,{base:palette.cloth,secondary:palette.clothDark,seed:431,frequency:.19,roughness:.88,roughVariation:.07,normalStrength:1.7,repeat:5.3,normalScale:.45,side:THREE.DoubleSide});
  const accent=physicalSurface(`${prefix}-accent`,{base:palette.accent,secondary:palette.accentDark,seed:439,frequency:.06,roughness:.27,roughVariation:.1,normalStrength:1.4,repeat:2.8,normalScale:.35,metalness:.62,emissive:palette.emissive,emissiveIntensity:.48,clearcoat:.09});
  return{steel,dark,trim,cloth,accent};
}
function addPlate(parent,points,depth,material,position,rotation=[0,0,0],lod=0){
  const m=shadow(new THREE.Mesh(extrudedPlate(points,depth,Math.min(depth*.23,.03)),material),lod);
  m.position.set(...position); m.rotation.set(...rotation); parent.add(m); return m;
}
function addLimbShell(bone,opts,mat,pos=[0,-.24,0],rot=[0,0,0],lod=0){
  if(!bone)return null; const m=shadow(new THREE.Mesh(taperedLimb(opts),mat),lod);m.position.set(...pos);m.rotation.set(...rot);bone.add(m);return m;
}
function makeCape(parent,material,trim){
  const root=mark(new THREE.Group());root.name='ProductionCapeRoot';root.position.set(0,.22,-.4);parent.add(root);
  for(let i=-2;i<=2;i++){
    const w=i===0?.22:.2,strip=shadow(new THREE.Mesh(curvedCloth(w,1.1,12),material),i===0?0:1);
    strip.position.set(i*.19,-.55,-Math.abs(i)*.012);strip.rotation.z=-i*.018;strip.rotation.x=.05+Math.abs(i)*.012;root.add(strip);
    const hem=shadow(new THREE.Mesh(extrudedPlate([[-w*.48,-.025],[w*.48,-.025],[w*.43,.025],[-w*.43,.025]],.024,.006),trim),1);hem.position.set(i*.19,-1.095,-.12);root.add(hem);
  }
  return root;
}
function heroPalette(){return{steel:0xaec3c7,steelDark:0x455e67,dark:0x283d47,dark2:0x111d24,trim:0xd3ae62,trimDark:0x725330,cloth:0x1d6878,clothDark:0x0a3342,accent:0x73d6e9,accentDark:0x1b6678,emissive:0x0c566c};}
function enemyPalette(){return{steel:0x625969,steelDark:0x211d29,dark:0x29232e,dark2:0x100d15,trim:0xa95045,trimDark:0x48191a,cloth:0x392d40,clothDark:0x15101c,accent:0xdc6650,accentDark:0x681d1b,emissive:0x4a0e09};}

export function buildHeroProductionShell(rig){
  hideLegacy(rig.group); const M=materialSet('vanguard-production',heroPalette());
  const chest=rig.bones.chest,hips=rig.bones.hips,head=rig.bones.head;
  const shell=mark(new THREE.Group());shell.name='VanguardProductionShell';rig.group.add(shell);
  const cuirass=shadow(new THREE.Mesh(loftGeometry([
    {y:-.34,w:.36,d:.25},{y:-.16,w:.42,d:.28,front:.03},{y:.08,w:.48,d:.3,front:.05},{y:.3,w:.5,d:.28,front:.045},{y:.42,w:.39,d:.23}
  ],30),M.dark));cuirass.position.y=.12;chest.add(cuirass);
  addPlate(chest,[[-.38,-.27],[-.46,.08],[-.32,.32],[0,.39],[.32,.32],[.46,.08],[.38,-.27],[0,-.36]],.115,M.steel,[0,.2,.285],[-.03,0,0]);
  addPlate(chest,[[-.31,-.18],[-.38,.12],[-.23,.3],[0,.34],[.23,.3],[.38,.12],[.31,-.18]],.07,M.dark,[0,.21,-.265],[0,Math.PI,0],1);
  addPlate(chest,[[-.16,-.05],[-.2,.18],[0,.29],[.2,.18],[.16,-.05]],.035,M.trim,[0,.25,.352],[0,0,0],1);
  const collar=shadow(new THREE.Mesh(new THREE.TorusGeometry(.39,.045,12,42,Math.PI*1.62),M.trim),1);collar.position.set(0,.42,.01);collar.rotation.set(Math.PI/2,0,-.97);chest.add(collar);
  const waist=shadow(new THREE.Mesh(loftGeometry([{y:-.18,w:.34,d:.23},{y:.03,w:.4,d:.25},{y:.18,w:.37,d:.23}],24),M.trim));waist.position.y=-.1;hips.add(waist);
  const tabard=shadow(new THREE.Mesh(curvedCloth(.5,.92,12),M.cloth),0);tabard.position.set(0,-.62,.28);tabard.rotation.x=-.035;hips.add(tabard);

  const helm=mark(new THREE.Group());helm.name='VanguardProductionHelm';head.add(helm);
  const helmShell=shadow(new THREE.Mesh(loftGeometry([
    {y:-.26,w:.25,d:.23},{y:-.04,w:.31,d:.29,front:.025},{y:.2,w:.3,d:.285},{y:.38,w:.22,d:.23},{y:.47,w:.09,d:.12}
  ],30),M.steel));helmShell.position.y=.12;helm.add(helmShell);
  addPlate(helm,[[-.27,-.13],[-.31,.09],[-.2,.2],[0,.16],[.2,.2],[.31,.09],[.27,-.13],[.12,-.22],[-.12,-.22]],.065,M.dark,[0,.13,.292],[-.04,0,0]);
  for(const s of [-1,1]) addPlate(helm,[[0,-.15],[.11,-.09],[.14,.13],[.04,.22],[-.06,.12]],.045,M.trim,[.22*s,-.02,.27],[0,0,-s*.12],1);
  const crest=shadow(new THREE.Mesh(extrudedPlate([[0,-.31],[.07,-.12],[.055,.31],[-.055,.31],[-.07,-.12]],.045,.012),M.trim),1);crest.position.set(0,.65,-.03);crest.rotation.x=.04;helm.add(crest);

  for(const [side,s] of [['Left',-1],['Right',1]]){
    const upper=rig.group.getObjectByName(`${side}UpperArm`),lower=rig.group.getObjectByName(`${side}LowerArm`),hand=rig.group.getObjectByName(`${side}Hand`),thigh=rig.group.getObjectByName(`${side}UpLeg`),shin=rig.group.getObjectByName(`${side}Leg`),foot=rig.group.getObjectByName(`${side}Foot`);
    if(upper){
      const pauldron=shadow(new THREE.Mesh(loftGeometry([{y:-.11,w:.24,d:.19},{y:.02,w:.31,d:.25},{y:.16,w:.26,d:.21}],22),M.trim));pauldron.position.set(.02*s,.02,0);pauldron.rotation.z=-s*.08;upper.add(pauldron);
      addPlate(upper,[[-.12,-.15],[-.17,.03],[-.09,.19],[.09,.19],[.17,.03],[.12,-.15]],.055,M.steel,[.02*s,-.22,.13],[0,0,s*.03],1);
    }
    addLimbShell(lower,{top:.13,bottom:.105,length:.48,depth:.12},M.steel,[0,-.22,0]);
    if(hand){const g=shadow(new THREE.Mesh(loftGeometry([{y:-.13,w:.12,d:.105},{y:.03,w:.145,d:.13},{y:.15,w:.12,d:.11}],18),M.trim));g.position.y=-.02;hand.add(g);}
    addLimbShell(thigh,{top:.18,bottom:.155,length:.52,depth:.16},M.cloth,[0,-.28,0],[],1);
    addLimbShell(shin,{top:.155,bottom:.12,length:.54,depth:.145},M.steel,[0,-.29,.01]);
    if(foot){const sab=shadow(new THREE.Mesh(loftGeometry([{y:-.09,w:.13,d:.22},{y:.02,w:.145,d:.29,front:.05},{y:.12,w:.14,d:.23}],20),M.dark));sab.position.set(0,-.03,.16);sab.rotation.x=-.08;foot.add(sab);}
  }
  const cape=makeCape(chest,M.cloth,M.trim);
  const wr=rig.weaponRoot;if(wr){
    hideLegacy(wr);const blade=shadow(new THREE.Mesh(extrudedPlate([[-.045,0],[-.095,.18],[-.07,1.27],[0,1.58],[.07,1.27],[.095,.18],[.045,0]],.075,.012),M.accent));blade.position.set(0,0,.02);wr.add(blade);
    const guard=shadow(new THREE.Mesh(extrudedPlate([[-.32,-.035],[-.1,.055],[0,.095],[.1,.055],[.32,-.035],[.1,-.075],[-.1,-.075]],.1,.012),M.trim));guard.position.y=.03;wr.add(guard);
  }
  return{root:shell,cape,materials:M,quality:{continuousTorso:true,profiledHelmet:true,layeredArmor:true,materialZones:5,lodLevels:2}};
}

export function buildEnemyProductionShell(rig){
  hideLegacy(rig.group); const M=materialSet('warden-production',enemyPalette());
  const spine=rig.bones.spine,hips=rig.bones.hips,head=rig.bones.head;
  const shell=mark(new THREE.Group());shell.name='WardenProductionShell';rig.group.add(shell);
  const torso=shadow(new THREE.Mesh(loftGeometry([{y:-.42,w:.48,d:.31},{y:-.16,w:.57,d:.36,front:.04},{y:.12,w:.62,d:.39,front:.07},{y:.4,w:.59,d:.36},{y:.55,w:.43,d:.29}],30),M.dark));torso.position.y=.17;spine.add(torso);
  addPlate(spine,[[-.5,-.33],[-.58,.04],[-.43,.36],[0,.47],[.43,.36],[.58,.04],[.5,-.33],[0,-.43]],.15,M.accent,[0,.25,.38],[-.04,0,0]);
  const helm=mark(new THREE.Group());helm.name='WardenProductionHelm';head.add(helm);
  const hs=shadow(new THREE.Mesh(loftGeometry([{y:-.32,w:.31,d:.29},{y:-.04,w:.39,d:.36,front:.035},{y:.26,w:.37,d:.34},{y:.48,w:.25,d:.27},{y:.57,w:.08,d:.12}],28),M.steel));hs.position.y=.13;helm.add(hs);
  addPlate(helm,[[-.33,-.19],[-.4,.08],[-.25,.24],[0,.17],[.25,.24],[.4,.08],[.33,-.19],[.12,-.28],[-.12,-.28]],.09,M.accent,[0,.1,.36],[-.04,0,0]);
  for(const s of [-1,1]){const horn=shadow(new THREE.Mesh(new THREE.ConeGeometry(.105,.95,18,3),M.accent),1);horn.position.set(.28*s,.62,-.02);horn.rotation.z=.58*s;helm.add(horn);}
  const skirt=shadow(new THREE.Mesh(new THREE.CylinderGeometry(.48,.66,.74,24,3,true),M.cloth));skirt.position.set(0,-.44,0);hips.add(skirt);
  for(const [side,s] of [['Left',-1],['Right',1]]){
    const thigh=rig.group.getObjectByName(`${side}UpLeg`),shin=rig.group.getObjectByName(`${side}Leg`),foot=rig.group.getObjectByName(`${side}Foot`);
    addLimbShell(thigh,{top:.22,bottom:.18,length:.56,depth:.2},M.dark,[0,-.29,0],[],1);
    addLimbShell(shin,{top:.19,bottom:.15,length:.58,depth:.17},M.accent,[0,-.31,.01]);
    if(foot){const boot=shadow(new THREE.Mesh(loftGeometry([{y:-.11,w:.16,d:.25},{y:.02,w:.18,d:.33,front:.06},{y:.14,w:.17,d:.26}],20),M.steel));boot.position.set(0,-.04,.18);boot.rotation.x=-.07;foot.add(boot);}
    const shoulder=shadow(new THREE.Mesh(loftGeometry([{y:-.12,w:.27,d:.21},{y:.03,w:.36,d:.29},{y:.18,w:.29,d:.23}],22),M.accent));shoulder.position.set(.43*s,.34,0);shoulder.rotation.z=-s*.12;spine.add(shoulder);
  }
  return{root:shell,materials:M,quality:{continuousTorso:true,profiledHelmet:true,layeredArmor:true,materialZones:5,lodLevels:2}};
}

export function updateProductionCharacterLOD(root,camera){
  const d=camera.position.distanceTo(root.getWorldPosition(new THREE.Vector3()));
  root.traverse(o=>{if(!o.isMesh||o.userData.lodLevel==null)return;o.visible=o.userData.lodLevel===0||d<18;});
}
