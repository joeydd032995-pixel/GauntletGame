import * as THREE from 'three';

function production(mesh,lod=0){mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.productionShell=true;mesh.userData.lodLevel=lod;return mesh;}
function plate(points,depth=.035){const s=new THREE.Shape();s.moveTo(...points[0]);for(let i=1;i<points.length;i++)s.lineTo(...points[i]);s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth,steps:1,bevelEnabled:true,bevelSegments:2,bevelSize:.01,bevelThickness:.01});g.translate(0,0,-depth*.5);g.computeVertexNormals();return g;}
function tuneMaterial(m,{color,roughness,metalness,emissive,emissiveIntensity,envMapIntensity}={}){if(!m)return;if(color!=null)m.color?.set(color);if(roughness!=null)m.roughness=roughness;if(metalness!=null)m.metalness=metalness;if(emissive!=null){m.emissive?.set(emissive);m.emissiveIntensity=emissiveIntensity??.18;}if(envMapIntensity!=null)m.envMapIntensity=envMapIntensity;m.needsUpdate=true;}
function cloakPanel({top=.28,bottom=.18,height=1.08,point=.14,bend=.13,rows=10,cols=4}={}){
  const pos=[],uv=[],idx=[];
  for(let r=0;r<=rows;r++){
    const t=r/rows,half=THREE.MathUtils.lerp(top*.5,bottom*.5,t),y=-height*t;
    for(let c=0;c<=cols;c++){
      const nx=c/cols*2-1,x=nx*half,hem=t===1?point*(1-Math.abs(nx)):.0,z=-bend*Math.pow(t,1.55)-Math.abs(nx)*.018;
      pos.push(x,y-hem,z);uv.push(c/cols,1-t);
    }
  }
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const a=r*(cols+1)+c,b=a+1,d=(r+1)*(cols+1)+c,e=d+1;idx.push(a,b,d,b,e,d);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();g.computeBoundingSphere();return g;
}
function replaceCape(cape,material){
  if(!cape)return null;for(const c of cape.children)c.visible=false;
  const tailored=new THREE.Group();tailored.name='TailoredVanguardCloak';tailored.userData.productionShell=true;cape.add(tailored);
  const specs=[[-.25,.25,.12,.98,.1,-.045],[-.125,.27,.17,1.07,.13,-.018],[0,.29,.2,1.13,.17,0],[.125,.27,.17,1.07,.13,.018],[.25,.25,.12,.98,.1,.045]];
  for(const[x,top,bottom,height,point,rz]of specs){const p=production(new THREE.Mesh(cloakPanel({top,bottom,height,point,bend:.12+Math.abs(x)*.08}),material),Math.abs(x)>.2?1:0);p.name='VanguardCloakPanel';p.position.set(x,.02,-.035-Math.abs(x)*.025);p.rotation.z=rz;tailored.add(p);}
  return tailored;
}
export function elevateHeroPresentation(rig,shell){
  const M=shell.materials;
  tuneMaterial(M.steel,{roughness:.3,metalness:.74,envMapIntensity:.92,emissive:0x0a1a20,emissiveIntensity:.1});
  tuneMaterial(M.dark,{roughness:.41,metalness:.4,envMapIntensity:.78,emissive:0x0a2730,emissiveIntensity:.22});
  tuneMaterial(M.trim,{roughness:.24,metalness:.9,envMapIntensity:1,emissive:0x34210a,emissiveIntensity:.16});
  tuneMaterial(M.cloth,{roughness:.76,metalness:0,envMapIntensity:.3,emissive:0x0c4654,emissiveIntensity:.52});
  tuneMaterial(M.accent,{roughness:.34,metalness:.5,envMapIntensity:.68,emissive:0x0b3742,emissiveIntensity:.18});
  const chest=rig.bones.chest;
  const mantle=production(new THREE.Mesh(plate([[-.34,-.12],[-.42,.04],[-.28,.2],[0,.28],[.28,.2],[.42,.04],[.34,-.12],[0,-.2]],.055),M.steel),1);mantle.name='VanguardRearMantle';mantle.position.set(0,.2,-.31);mantle.rotation.y=Math.PI;chest.add(mantle);
  const sigil=production(new THREE.Mesh(plate([[0,-.18],[.12,-.02],[.06,.17],[0,.24],[-.06,.17],[-.12,-.02]],.025),M.trim),1);sigil.name='VanguardRearSigil';sigil.position.set(0,.22,-.37);sigil.rotation.y=Math.PI;chest.add(sigil);
  const tailoredCloak=replaceCape(shell.cape,M.cloth);
  const weapon=rig.weaponRoot;if(weapon?.children?.length){const blade=weapon.children.find(o=>o.isMesh&&o.material===M.accent)||weapon.children.find(o=>o.isMesh);if(blade){const bladeMat=M.steel.clone();bladeMat.name='VanguardBladeSteel';tuneMaterial(bladeMat,{color:0xd7eef0,roughness:.25,metalness:.88,envMapIntensity:1.05,emissive:0x073643,emissiveIntensity:.22});blade.material=bladeMat;blade.scale.set(.68,.84,.62);blade.name='VanguardRefinedBlade';}}
  return{rearMantle:true,rearSigil:true,tailoredCloak:!!tailoredCloak,refinedBlade:true,materialHierarchy:'hero-v3'};
}
export function elevateEnemyPresentation(rig,shell){
  const M=shell.materials;
  tuneMaterial(M.steel,{color:0xe0dce4,roughness:.34,metalness:.72,envMapIntensity:.86,emissive:0x100d12,emissiveIntensity:.08});
  tuneMaterial(M.dark,{color:0xc0aebe,roughness:.5,metalness:.3,envMapIntensity:.54,emissive:0x160e18,emissiveIntensity:.12});
  tuneMaterial(M.trim,{color:0xc2a6a1,roughness:.31,metalness:.76,envMapIntensity:.76});
  tuneMaterial(M.cloth,{color:0xa88ea5,roughness:.88,metalness:0,envMapIntensity:.18,emissive:0x1b101d,emissiveIntensity:.12});
  tuneMaterial(M.accent,{color:0x8c514b,roughness:.42,metalness:.5,envMapIntensity:.66,emissive:0x2b0b09,emissiveIntensity:.12});
  const spine=rig.bones.spine,hips=rig.bones.hips;
  const inset=production(new THREE.Mesh(plate([[-.37,-.27],[-.43,.06],[-.27,.35],[0,.43],[.27,.35],[.43,.06],[.37,-.27],[0,-.36]],.05),M.steel),1);inset.name='WardenChestInset';inset.position.set(0,.24,.41);spine.add(inset);
  const rune=production(new THREE.Mesh(plate([[0,-.14],[.08,-.01],[.04,.13],[0,.2],[-.04,.13],[-.08,-.01]],.025),M.accent),1);rune.name='WardenChestRune';rune.position.set(0,.28,.472);spine.add(rune);
  const collar=production(new THREE.Mesh(new THREE.TorusGeometry(.43,.055,12,32,Math.PI*1.55),M.steel),1);collar.name='WardenSteelCollar';collar.position.set(0,.48,.02);collar.rotation.set(Math.PI/2,0,-.86);spine.add(collar);
  const belt=production(new THREE.Mesh(new THREE.CylinderGeometry(.42,.46,.13,24,1,false),M.steel),1);belt.name='WardenSteelBelt';belt.position.set(0,-.22,0);hips.add(belt);
  return{chestInset:true,chestRune:true,steelCollar:true,steelBelt:true,materialHierarchy:'warden-v3'};
}
