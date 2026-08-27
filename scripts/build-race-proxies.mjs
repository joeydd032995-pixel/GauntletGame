import fs from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class FileReader {
    constructor(){ this.result=null; this.onloadend=null; this.onerror=null; }
    async readAsArrayBuffer(blob){ try{ this.result=await blob.arrayBuffer(); this.onloadend?.({target:this}); }catch(error){ this.onerror?.(error); } }
    async readAsDataURL(blob){ try{ const b=Buffer.from(await blob.arrayBuffer()); this.result=\`data:\${blob.type||'application/octet-stream'};base64,\${b.toString('base64')}\`; this.onloadend?.({target:this}); }catch(error){ this.onerror?.(error); } }
  };
}

const OUT=path.resolve('public/assets/races');
await fs.mkdir(OUT,{recursive:true});
const exporter=new GLTFExporter();
const ART='premium refined OSRS/07Scape';
const deg=THREE.MathUtils.degToRad;

function mat(name,color,{metalness=0,roughness=.86,emissive=0,emissiveIntensity=0}={}){
  return new THREE.MeshStandardMaterial({name,color,metalness,roughness,flatShading:true,emissive,emissiveIntensity});
}
function shadow(mesh,name){mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;return mesh;}
function mesh(geometry,material,name){return shadow(new THREE.Mesh(geometry,material),name);}
function sphere(name,scale,material,segments=1){
  const g=new THREE.IcosahedronGeometry(1,segments),m=mesh(g,material,name);m.scale.set(...scale);return m;
}
function box(name,size,material){return mesh(new THREE.BoxGeometry(...size),material,name);}
function cyl(name,radius,length,material,radial=8){return mesh(new THREE.CylinderGeometry(radius,radius,length,radial,1,false),material,name);}
function cone(name,radius,length,material,radial=7){return mesh(new THREE.ConeGeometry(radius,length,radial,1,false),material,name);}
function fin(name,side,material){
  const x=.16*side;
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,x,.08,0,x,-.08,0],3));
  g.setIndex([0,1,2]);g.computeVertexNormals();
  return mesh(g,material,name);
}
function membrane(name,side,material){
  const g=new THREE.BufferGeometry();
  const s=side;
  g.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,.34*s,.12,.02,.28*s,-.13,.04,.08*s,-.08,.02],3));
  g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();
  return mesh(g,material,name);
}
function makeHumanoid({name,height=1.82,shoulder=.42,hip=.29,skin,cloth,leather,headScale=1,bulk=1}){
  const root=new THREE.Group();root.name=name;root.userData.gauntletRaceProxy=true;
  const scale=height/1.82;
  const pelvis=new THREE.Group();pelvis.name='pelvis';pelvis.position.y=.91*scale;root.add(pelvis);
  const pelvisMesh=sphere('pelvis_mesh',[hip*bulk,.19,.18],leather,1);pelvis.add(pelvisMesh);

  const torso=new THREE.Group();torso.name='torso';torso.position.y=1.27*scale;root.add(torso);
  const torsoMesh=sphere('torso_mesh',[shoulder*bulk,.22,.35*bulk],cloth,1);torso.add(torsoMesh);

  const neck=new THREE.Group();neck.name='neck';neck.position.y=.30*scale;torso.add(neck);
  const neckMesh=cyl('neck_mesh',.065*bulk,.12*scale,skin,8);neckMesh.position.y=.06*scale;neck.add(neckMesh);

  const head=new THREE.Group();head.name='head';head.position.y=.18*scale;neck.add(head);
  const headMesh=sphere('head_mesh',[.145*headScale,.135*headScale,.18*headScale],skin,1);headMesh.position.y=.14*scale;head.add(headMesh);

  const upperLen=.37*scale, foreLen=.34*scale;
  for(const [side,sgn] of [['L',-1],['R',1]]){
    const upper=new THREE.Group();upper.name=\`upper_arm_\${side}\`;upper.position.set(sgn*shoulder*.96*bulk,.16*scale,0);upper.rotation.z=deg(sgn*35);torso.add(upper);
    const um=cyl(\`upper_arm_\${side}_mesh\`,.075*bulk,upperLen,cloth,8);um.position.y=-upperLen/2;upper.add(um);
    const fore=new THREE.Group();fore.name=\`forearm_\${side}\`;fore.position.y=-upperLen;upper.add(fore);
    const fm=cyl(\`forearm_\${side}_mesh\`,.064*bulk,foreLen,skin,8);fm.position.y=-foreLen/2;fore.add(fm);
    const hand=new THREE.Group();hand.name=\`hand_\${side}\`;hand.position.y=-foreLen;fore.add(hand);
    const hm=sphere(\`hand_\${side}_mesh\`,[.06*bulk,.085*scale,.052*bulk],skin,1);hm.position.y=-.035*scale;hand.add(hm);
  }

  const thighLen=.42*scale, shinLen=.41*scale;
  for(const [side,sgn] of [['L',-1],['R',1]]){
    const thigh=new THREE.Group();thigh.name=\`thigh_\${side}\`;thigh.position.set(sgn*hip*.52*bulk,-.04*scale,0);pelvis.add(thigh);
    const tm=cyl(\`thigh_\${side}_mesh\`,.095*bulk,thighLen,cloth,8);tm.position.y=-thighLen/2;thigh.add(tm);
    const shin=new THREE.Group();shin.name=\`shin_\${side}\`;shin.position.y=-thighLen;thigh.add(shin);
    const sm=cyl(\`shin_\${side}_mesh\`,.078*bulk,shinLen,leather,8);sm.position.y=-shinLen/2;shin.add(sm);
    const foot=new THREE.Group();foot.name=\`foot_\${side}\`;foot.position.y=-shinLen;shin.add(foot);
    const fm=box(\`foot_\${side}_mesh\`,[.15*bulk,.09*scale,.27*scale],leather);fm.position.set(0,-.035*scale,.06*scale);foot.add(fm);
  }
  return {root,torso,pelvis,head,scale};
}
function addCairnborn(){
  const M={skin:mat('basalt',0x606a65,{roughness:.96}),cloth:mat('bastion_cloth',0x394845),leather:mat('leather',0x4d3928),
    slate:mat('slate',0x7b8177,{roughness:.98}),bronze:mat('bronze_inlay',0x9b7a3f,{metalness:.6,roughness:.42}),
    rune:mat('rune',0x58c7c0,{roughness:.35,emissive:0x1d7772,emissiveIntensity:.7}),moss:mat('lichen',0x66724e,{roughness:1})};
  const c=makeHumanoid({name:'Cairnborn',height:1.94,shoulder:.49,hip:.34,skin:M.skin,cloth:M.cloth,leather:M.leather,headScale:1.05,bulk:1.08});
  const chest=box('ancestral_chest_plate',[.72,.33,.18],M.slate);chest.position.set(0,.02,-.08);c.torso.add(chest);
  const face=box('faceplate',[.24,.21,.13],M.slate);face.position.set(0,.14,-.13);c.head.add(face);
  const brow=box('brow_inlay',[.27,.045,.025],M.bronze);brow.position.set(0,.20,-.205);c.head.add(brow);
  for(const x of [-.08,.08]){const r=box(\`rune_\${x<0?'L':'R'}\`,[.018,.22,.022],M.rune);r.position.set(x,.01,-.18);c.torso.add(r);}
  for(const [side,sgn] of [['L',-1],['R',1]]){const s=sphere(\`shoulder_plate_\${side}\`,[.19,.12,.15],M.slate,1);s.position.set(sgn*.45,.16,0);c.torso.add(s);}
  const crystal=cone('lichen_crystal',.05,.15,M.moss,6);crystal.position.set(-.2,.3,.08);c.torso.add(crystal);
  return c.root;
}
function addBrinesworn(){
  const M={skin:mat('brinesworn_skin',0x79a7a4,{roughness:.76}),cloth:mat('tide_cloth',0x2f4e52),leather:mat('weathered_leather',0x5b4632),
    metal:mat('salt_steel',0x7e8c8f,{metalness:.52,roughness:.5}),pearl:mat('pearl',0xd8d0b4,{roughness:.35}),coral:mat('coral',0xb06f67)};
  const c=makeHumanoid({name:'Brinesworn',height:1.87,shoulder:.41,hip:.28,skin:M.skin,cloth:M.cloth,leather:M.leather,headScale:.98});
  for(const [side,sgn] of [['L',-1],['R',1]]){const f=fin(\`ear_fin_\${side}\`,sgn,M.coral);f.position.set(sgn*.14,.14,0);f.rotation.x=deg(90);c.head.add(f);
    const p=sphere(\`naval_pauldron_\${side}\`,[.15,.09,.12],M.metal,1);p.position.set(sgn*.4,.16,0);c.torso.add(p);}
  const h1=box('harness_L',[.07,.58,.05],M.leather);h1.position.set(-.13,0,-.21);h1.rotation.z=deg(-16);c.torso.add(h1);
  const h2=box('harness_R',[.07,.58,.05],M.leather);h2.position.set(.13,0,-.21);h2.rotation.z=deg(16);c.torso.add(h2);
  const pearl=sphere('tide_pearl',[.04,.04,.04],M.pearl,1);pearl.position.set(-.09,.20,-.16);c.head.add(pearl);
  return c.root;
}
function addMyceliad(){
  const M={skin:mat('fungal_skin',0xa99d7b,{roughness:.98}),cloth:mat('root_fiber',0x5c6247,{roughness:.96}),leather:mat('bark',0x493a2c,{roughness:.95}),
    cap:mat('cap',0x8e4e46,{roughness:.94}),gills:mat('cap_gills',0xc4b28e,{roughness:.98}),spore:mat('spore',0x88b7a4,{roughness:.4,emissive:0x264f45,emissiveIntensity:.45})};
  const c=makeHumanoid({name:'Myceliad',height:1.79,shoulder:.42,hip:.31,skin:M.skin,cloth:M.cloth,leather:M.leather,headScale:.9});
  const cap=sphere('mushroom_crown',[.35,.11,.30],M.cap,2);cap.position.set(0,.34,0);c.head.add(cap);
  const g=sphere('mushroom_gills',[.25,.055,.22],M.gills,1);g.position.set(0,.27,0);c.head.add(g);
  for(const [side,sgn] of [['L',-1],['R',1]]){const shelf=sphere(\`shelf_\${side}\`,[.19,.055,.14],M.gills,1);shelf.position.set(sgn*.40,.17,0);c.torso.add(shelf);}
  const chest=sphere('grown_chest_plate',[.35,.27,.23],M.leather,1);chest.position.set(0,.01,-.02);c.torso.add(chest);
  for(const [i,x] of [[0,-.16],[1,.16]]){const sp=sphere(\`spore_\${i}\`,[.025,.025,.025],M.spore,1);sp.position.set(x,.08,-.24);c.torso.add(sp);}
  return c.root;
}
function addVeylkin(){
  const M={skin:mat('veylkin_skin',0xc6b9aa,{roughness:.88}),cloth:mat('veilcloth',0x484653,{roughness:.93}),leather:mat('bark_leather',0x514433),
    moon:mat('moon_metal',0x8b9c91,{metalness:.42,roughness:.45}),mantle:mat('moth_mantle',0x81758e,{roughness:.96}),
    eye:mat('luminous_eye',0xbbd9c8,{roughness:.25,emissive:0x42685b,emissiveIntensity:.7}),mem:mat('vestigial_membrane',0x9a8ea3,{roughness:.94})};
  const c=makeHumanoid({name:'Veylkin',height:1.91,shoulder:.39,hip:.27,skin:M.skin,cloth:M.cloth,leather:M.leather,headScale:1.0});
  for(const [side,sgn] of [['L',-1],['R',1]]){const e=sphere(\`eye_\${side}\`,[.035,.045,.024],M.eye,1);e.position.set(sgn*.055,.15,-.13);c.head.add(e);
    const crest=new THREE.Group();crest.name=\`sensory_crest_\${side}\`;crest.position.set(sgn*.06,.28,0);crest.rotation.z=deg(-sgn*28);c.head.add(crest);
    const stalk=cyl(\`sensory_crest_\${side}_mesh\`,.012,.30,M.mantle,6);stalk.position.y=.15;crest.add(stalk);
    const w=membrane(\`mantle_\${side}\`,sgn,M.mantle);w.position.set(sgn*.08,.16,.02);c.torso.add(w);
    const back=membrane(\`vestigial_membrane_\${side}\`,sgn,M.mem);back.scale.set(.55,1.15,1);back.position.set(sgn*.05,.07,.16);c.torso.add(back);}
  return c.root;
}
function addEchoed(){
  const M={skin:mat('echoed_skin',0xb9aaa0,{roughness:.84}),cloth:mat('neutral_cloth',0x4e5258),leather:mat('mixed_leather',0x4a3d30),
    bastion:mat('bastion_plate',0x8e8067,{metalness:.48,roughness:.5}),verdant:mat('verdant_fiber',0x5c7159,{roughness:.96}),
    spectral:mat('spectral_relic',0x789fba,{roughness:.3,emissive:0x274860,emissiveIntensity:.65}),relic:mat('impossible_relic',0x9b83aa,{metalness:.22,roughness:.4})};
  const c=makeHumanoid({name:'Echoed',height:1.83,shoulder:.43,hip:.29,skin:M.skin,cloth:M.cloth,leather:M.leather,headScale:.98});
  const bp=box('bastion_shoulder',[.22,.18,.18],M.bastion);bp.position.set(-.32,.16,0);c.torso.add(bp);
  const vp=sphere('verdant_shoulder',[.17,.09,.13],M.verdant,1);vp.position.set(.32,.16,0);c.torso.add(vp);
  for(const [i,[x,y]] of [[0,[-.14,.06]],[1,[.12,.21]]]){const r=cone(\`relic_\${i}\`,.035,.13,M.relic,6);r.position.set(x,y,-.22);c.torso.add(r);}
  const iris=sphere('asymmetrical_iris',[.035,.028,.018],M.spectral,1);iris.position.set(.045,.15,-.14);c.head.add(iris);
  for(const [i,[x,y]] of [[0,[-.04,.14]],[1,[.11,-.04]]]){const e=box(\`timeline_echo_\${i}\`,[.015,.19,.02],M.spectral);e.position.set(x,y,.22);c.torso.add(e);}
  return c.root;
}
const defs=[
  {key:'cairnborn',label:'Cairnborn',faction:'Bastion Compact',elementId:'579defc6-18d2-4dd7-83ff-6d23a51f31fe',height:1.94,build:addCairnborn},
  {key:'brinesworn',label:'Brinesworn',faction:'Bastion Compact',elementId:'d504b1e4-275d-4ccc-a07f-ab61bcc6848d',height:1.87,build:addBrinesworn},
  {key:'myceliad',label:'Myceliad',faction:'Verdant Oath',elementId:'d9b6f30a-fa51-47c4-b22c-70ed66c07081',height:1.79,build:addMyceliad},
  {key:'veylkin',label:'Veylkin',faction:'Verdant Oath',elementId:'57e790db-f7c4-4a5b-a0b1-ed66a1915314',height:1.91,build:addVeylkin},
  {key:'echoed',label:'Echoed',faction:'Neutral / Chosen',elementId:'09146293-fa83-4aef-b6e1-a3e1ee7dd6db',height:1.83,build:addEchoed}
];
const manifest={schemaVersion:1,target:ART,source:'Higgsfield locked Character Elements',rigType:'articulated-rigid-part',productionMesh:false,defaultRace:'cairnborn',races:[]};
for(const def of defs){
  const model=def.build();
  model.userData={...model.userData,race:def.label,faction:def.faction,elementId:def.elementId,target:ART};
  model.updateMatrixWorld(true);
  const result=await exporter.parseAsync(model,{binary:true,onlyVisible:true,trs:true});
  const filename=\`gauntlet_\${def.key}_v1.glb\`;
  await fs.writeFile(path.join(OUT,filename),Buffer.from(result));
  manifest.races.push({key:def.key,label:def.label,faction:def.faction,elementId:def.elementId,height:def.height,url:\`/assets/races/\${filename}\`});
}
await fs.writeFile(path.join(OUT,'manifest.json'),JSON.stringify(manifest,null,2));
console.log(\`Generated \${defs.length} locked race GLBs -> \${OUT}\`);
