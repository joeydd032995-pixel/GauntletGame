import * as THREE from 'three';

function production(mesh,lod=0){mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.productionShell=true;mesh.userData.lodLevel=lod;return mesh;}
function plate(points,depth=.035){const s=new THREE.Shape();s.moveTo(...points[0]);for(let i=1;i<points.length;i++)s.lineTo(...points[i]);s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth,steps:1,bevelEnabled:true,bevelSegments:2,bevelSize:.01,bevelThickness:.01});g.translate(0,0,-depth*.5);g.computeVertexNormals();return g;}
function tuneMaterial(m,{roughness,metalness,emissive,emissiveIntensity,envMapIntensity}={}){if(!m)return;if(roughness!=null)m.roughness=roughness;if(metalness!=null)m.metalness=metalness;if(emissive!=null){m.emissive?.set(emissive);m.emissiveIntensity=emissiveIntensity??.18;}if(envMapIntensity!=null)m.envMapIntensity=envMapIntensity;m.needsUpdate=true;}
export function elevateHeroPresentation(rig,shell){
  const M=shell.materials;tuneMaterial(M.steel,{roughness:.3,metalness:.74,envMapIntensity:.92,emissive:0x061217,emissiveIntensity:.08});tuneMaterial(M.dark,{roughness:.42,metalness:.42,envMapIntensity:.76,emissive:0x0b1c23,emissiveIntensity:.16});tuneMaterial(M.trim,{roughness:.24,metalness:.9,envMapIntensity:1.0,emissive:0x281b08,emissiveIntensity:.12});tuneMaterial(M.cloth,{roughness:.78,metalness:0,envMapIntensity:.28,emissive:0x0b3440,emissiveIntensity:.34});tuneMaterial(M.accent,{roughness:.32,metalness:.55,envMapIntensity:.72,emissive:0x124b5b,emissiveIntensity:.32});
  const chest=rig.bones.chest;
  const mantle=production(new THREE.Mesh(plate([[-.34,-.12],[-.42,.04],[-.28,.2],[0,.28],[.28,.2],[.42,.04],[.34,-.12],[0,-.2]],.055),M.steel),1);mantle.name='VanguardRearMantle';mantle.position.set(0,.2,-.31);mantle.rotation.y=Math.PI;chest.add(mantle);
  const sigil=production(new THREE.Mesh(plate([[0,-.18],[.12,-.02],[.06,.17],[0,.24],[-.06,.17],[-.12,-.02]],.025),M.trim),1);sigil.name='VanguardRearSigil';sigil.position.set(0,.22,-.37);sigil.rotation.y=Math.PI;chest.add(sigil);
  const cape=shell.cape;if(cape){cape.children.filter(o=>o.isMesh&&o.geometry?.type==='PlaneGeometry').forEach((strip,i)=>{strip.material=M.cloth;strip.position.z-=.025*Math.abs(i-2);});}
  return{rearMantle:true,rearSigil:true,materialHierarchy:'hero-v2'};
}
export function elevateEnemyPresentation(rig,shell){
  const M=shell.materials;tuneMaterial(M.steel,{roughness:.38,metalness:.68,envMapIntensity:.72,emissive:0x0b090d,emissiveIntensity:.08});tuneMaterial(M.dark,{roughness:.5,metalness:.28,envMapIntensity:.5,emissive:0x120d15,emissiveIntensity:.12});tuneMaterial(M.trim,{roughness:.31,metalness:.76,envMapIntensity:.7});tuneMaterial(M.cloth,{roughness:.88,metalness:0,envMapIntensity:.18,emissive:0x140c16,emissiveIntensity:.12});tuneMaterial(M.accent,{roughness:.39,metalness:.5,envMapIntensity:.64,emissive:0x32100d,emissiveIntensity:.18});
  const spine=rig.bones.spine;
  const inset=production(new THREE.Mesh(plate([[-.25,-.22],[-.32,.06],[-.18,.29],[0,.35],[.18,.29],[.32,.06],[.25,-.22],[0,-.3]],.045),M.steel),1);inset.name='WardenChestInset';inset.position.set(0,.25,.405);spine.add(inset);
  const rune=production(new THREE.Mesh(plate([[0,-.16],[.09,-.01],[.045,.15],[0,.22],[-.045,.15],[-.09,-.01]],.025),M.accent),1);rune.name='WardenChestRune';rune.position.set(0,.28,.455);spine.add(rune);
  return{chestInset:true,chestRune:true,materialHierarchy:'warden-v2'};
}
