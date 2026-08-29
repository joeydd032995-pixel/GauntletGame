import fs from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class FileReader {
    constructor(){ this.result=null; this.onloadend=null; this.onerror=null; }
    async readAsArrayBuffer(blob){ try{ this.result=await blob.arrayBuffer(); this.onloadend?.({target:this}); }catch(error){ this.onerror?.(error); } }
    async readAsDataURL(blob){ try{ const b=Buffer.from(await blob.arrayBuffer()); this.result=`data:${blob.type||'application/octet-stream'};base64,${b.toString('base64')}`; this.onloadend?.({target:this}); }catch(error){ this.onerror?.(error); } }
  };
}

const OUT=path.resolve('public/assets/races');
await fs.mkdir(OUT,{recursive:true});
const exporter=new GLTFExporter();
const ART='premium refined OSRS/07Scape';
const GENERATOR_VERSION='3.0.0-reference-locked';
const deg=THREE.MathUtils.degToRad;

const REQUIRED_PARTS=['pelvis','torso','chest_band','abdomen','head','crest','shoulder_L','shoulder_R','arm_L','arm_R','upper_arm_L','upper_arm_R','forearm_L','forearm_R','hand_L','hand_R','hip_L','hip_R','thigh_L','thigh_R','shin_L','shin_R','foot_L','foot_R','belt'];
const LODS={
  hero:{radial:24,sphere:2,segments:4,detail:1,scale:1},
  mid:{radial:16,sphere:1,segments:3,detail:.76,scale:1},
  far:{radial:7,sphere:1,segments:1,detail:.42,scale:1}
};
const ART_REFS={
  cairnborn:{elementId:'579defc6-18d2-4dd7-83ff-6d23a51f31fe',masterJob:'81ed43a2-896e-4835-88e2-49e14b297e66',aPoseJob:'c34f5065-d202-4c95-a32a-c5355328bf05',turnaroundJob:'8c5e983c-f451-4d13-9d1a-01ae08424ebd',detailJob:'966d2221-dc75-482e-8f3d-7e2ff674d52b',turnaroundResolution:'4k'},
  brinesworn:{elementId:'d504b1e4-275d-4ccc-a07f-ab61bcc6848d',masterJob:'e9b3226e-ded7-48db-9add-30b7e10060ec',aPoseJob:'c32b1ea8-c18b-4a47-8016-136c7e29b9e7',turnaroundJob:'47d68649-e037-4392-8a1e-6b71fa6440ab',detailJob:'2cfcc5e9-8ebc-4558-ad9c-44aa08825d18',turnaroundResolution:'4k'},
  myceliad:{elementId:'d9b6f30a-fa51-47c4-b22c-70ed66c07081',masterJob:'c8b693ab-1830-456a-8f76-9ef7ef2d07be',aPoseJob:'1bd2383e-083e-49fd-bee8-431c70e32251',turnaroundJob:'c30853e3-0fbb-4136-9eb9-fddfc58a164e',detailJob:'ee720d7d-3638-44f5-8591-74ae899e77ba',turnaroundResolution:'4k'},
  veylkin:{elementId:'57e790db-f7c4-4a5b-a0b1-ed66a1915314',masterJob:'96ec6eb5-34ae-436d-bdad-55d9f845879c',aPoseJob:'8c56d46e-13e0-4720-b0b7-e72b3ca93be8',turnaroundJob:'5c7ba582-8a5e-4a63-aa16-927ff878b35c',detailJob:'1517623a-20c7-4880-b7df-107bcf52d6bc',turnaroundResolution:'4k'},
  echoed:{elementId:'09146293-fa83-4aef-b6e1-a3e1ee7dd6db',masterJob:'adf92ea2-686b-4923-bcd7-cc32488d4917',aPoseJob:'91e42011-0230-4c39-81a8-0d4b751d60f5',turnaroundJob:'562e70ce-0f84-40f4-8807-ff9cd5f8cdb8',detailJob:'dc9a7977-63ce-445b-a55a-c98ca5e3e4cc',turnaroundResolution:'4k'}
};

function mat(name,color,{metalness=0,roughness=.86,emissive=0,emissiveIntensity=0}={}){return new THREE.MeshStandardMaterial({name,color,metalness,roughness,flatShading:true,emissive,emissiveIntensity});}
function shadow(o,name){o.name=name;o.castShadow=true;o.receiveShadow=true;return o;}
function mesh(g,m,name){return shadow(new THREE.Mesh(g,m),name);}
function ico(name,scale,material,detail=1){const o=mesh(new THREE.IcosahedronGeometry(1,detail),material,name);o.scale.set(...scale);return o;}
function cyl(name,rTop,rBottom,length,material,radial=10,heightSegments=1){return mesh(new THREE.CylinderGeometry(rTop,rBottom,length,radial,heightSegments,false),material,name);}
function ovalCyl(name,rTop,rBottom,length,depthScale,material,radial=10,heightSegments=1){
  const o=cyl(name,rTop,rBottom,length,material,radial,heightSegments);o.scale.z=depthScale;return o;
}
function cone(name,radius,length,material,radial=8){return mesh(new THREE.ConeGeometry(radius,length,radial,1,false),material,name);}
function box(name,size,material,segments=1){return mesh(new THREE.BoxGeometry(size[0],size[1],size[2],segments,segments,segments),material,name);}
function plate(name,w,h,d,material,radial=8){const o=mesh(new THREE.CylinderGeometry(.5,.46,d,radial,1,false),material,name);o.rotation.x=Math.PI/2;o.scale.set(w,h,1);return o;}
function wedge(name,w,h,d,material){const g=new THREE.BufferGeometry();const x=w/2,y=h/2,z=d/2;g.setAttribute('position',new THREE.Float32BufferAttribute([-x,-y,-z,x,-y,-z,x,-y,z,-x,-y,z,-x,y,0,x,y,0],3));g.setIndex([0,1,2,0,2,3,0,4,5,0,5,1,3,2,5,3,5,4,0,3,4,1,5,2]);g.computeVertexNormals();return mesh(g,material,name);}
function fin(name,side,material,thickness=.025,span=.12,height=.09){const g=new THREE.BufferGeometry();const s=side;g.setAttribute('position',new THREE.Float32BufferAttribute([0,height,-thickness,span*s,0,-thickness,0,-height,-thickness,0,height,thickness,span*s,0,thickness,0,-height,thickness],3));g.setIndex([0,1,2,3,5,4,0,3,4,0,4,1,1,4,5,1,5,2,2,5,3,2,3,0]);g.computeVertexNormals();return mesh(g,material,name);}
function membrane(name,side,material,scale=1){const s=side;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([0,.18,0,.36*s,.09,.015,.33*s,-.12,.03,.08*s,-.18,.015,0,.18,.035,.36*s,.09,.05,.33*s,-.12,.065,.08*s,-.18,.05],3));g.setIndex([0,1,2,0,2,3,4,6,5,4,7,6,0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0]);g.computeVertexNormals();const o=mesh(g,material,name);o.scale.setScalar(scale);return o;}
function add(parent,obj,pos=[0,0,0],rot=[0,0,0]){obj.position.set(...pos);obj.rotation.set(...rot);parent.add(obj);return obj;}
function group(parent,name,pos=[0,0,0]){const g=new THREE.Group();g.name=name;g.position.set(...pos);parent.add(g);return g;}

function createMaterials(key){
  if(key==='cairnborn')return{skin:mat('basalt',0x59635f,{roughness:.98}),cloth:mat('bastion_cloth',0x33423f,{roughness:.93}),leather:mat('earth_leather',0x4a3727,{roughness:.9}),primary:mat('slate_plate',0x788078,{roughness:.96}),secondary:mat('granite_edge',0x4a5552,{roughness:.94}),metal:mat('bronze_inlay',0x9a793e,{metalness:.48,roughness:.48}),accent:mat('ancestral_rune',0x62d5ca,{roughness:.32,emissive:0x1d7772,emissiveIntensity:.68}),tertiary:mat('lichen',0x65724d,{roughness:1})};
  if(key==='brinesworn')return{skin:mat('brinesworn_skin',0x75a39f,{roughness:.78}),cloth:mat('tide_cloth',0x29494e,{roughness:.9}),leather:mat('weathered_leather',0x5b4530,{roughness:.91}),primary:mat('salt_steel',0x7d8d8c,{metalness:.38,roughness:.55}),secondary:mat('shell_mineral',0xa7a78e,{roughness:.82}),metal:mat('navigation_brass',0x90764c,{metalness:.42,roughness:.5}),accent:mat('sea_glass',0x8bd5ce,{roughness:.25,emissive:0x235b59,emissiveIntensity:.38}),tertiary:mat('coral',0xb36e64,{roughness:.86})};
  if(key==='myceliad')return{skin:mat('fungal_skin',0xa99b78,{roughness:.98}),cloth:mat('root_fiber',0x596047,{roughness:.97}),leather:mat('bark',0x49392b,{roughness:.98}),primary:mat('cap',0x8d4d45,{roughness:.94}),secondary:mat('cap_gills',0xc6b68e,{roughness:.99}),metal:mat('mineral_nodule',0x7e775f,{roughness:.9}),accent:mat('spore_glow',0x8ec6b1,{roughness:.38,emissive:0x285447,emissiveIntensity:.48}),tertiary:mat('moss_growth',0x65734d,{roughness:1})};
  if(key==='veylkin')return{skin:mat('veylkin_skin',0xc5b7a8,{roughness:.88}),cloth:mat('veilcloth',0x44434f,{roughness:.94}),leather:mat('bark_leather',0x4d4030,{roughness:.93}),primary:mat('moth_mantle',0x80738d,{roughness:.96}),secondary:mat('vestigial_membrane',0x9a8da3,{roughness:.9}),metal:mat('moon_metal',0x889b90,{metalness:.36,roughness:.48}),accent:mat('luminous_eye',0xc1e4d3,{roughness:.2,emissive:0x456f5f,emissiveIntensity:.72}),tertiary:mat('crest_powder',0x716779,{roughness:.98})};
  return{skin:mat('echoed_skin',0xb8a99f,{roughness:.85}),cloth:mat('neutral_cloth',0x4b5057,{roughness:.91}),leather:mat('mixed_leather',0x493c2f,{roughness:.9}),primary:mat('bastion_fragment',0x8e8067,{metalness:.34,roughness:.55}),secondary:mat('verdant_fiber',0x5b7158,{roughness:.96}),metal:mat('impossible_relic',0x9b83aa,{metalness:.2,roughness:.42}),accent:mat('spectral_relic',0x7ba6c1,{roughness:.28,emissive:0x284b64,emissiveIntensity:.65}),tertiary:mat('lost_civilization_cloth',0x665b6e,{roughness:.9})};
}

function makeRig(def,lod,M){
  const q=LODS[lod],scale=def.height/1.82;
  const root=new THREE.Group();root.name=def.label;root.userData={gauntletRaceProxy:true,lod};
  // Stable root-space landmarks keep the rigid-part contract animation-safe while
  // restoring a deliberate humanoid vertical stack: feet ~0, pelvis ~0.93,
  // abdomen ~1.08, torso ~1.30, head ~1.9 (all scaled by race height).
  const pelvis=group(root,'pelvis',[0,.93*scale,0]);
  const abdomen=group(root,'abdomen',[0,1.08*scale,0]);
  const torso=group(root,'torso',[0,1.30*scale,0]);
  const chestBand=group(torso,'chest_band',[0,.08*scale,0]);
  const belt=group(pelvis,'belt',[0,.02*scale,0]);
  add(pelvis,ovalCyl('pelvis_mass',def.hip*.98,def.hip*.82,.28*scale,.72,M.leather,q.radial,q.segments));
  add(abdomen,ovalCyl('abdomen_mass',def.waist*1.05,def.hip*.72,.30*scale,.76,M.cloth,q.radial,q.segments));
  add(torso,ovalCyl('torso_mass',def.shoulder*.95,def.waist*1.02,.50*scale,.70,M.cloth,q.radial,q.segments));
  if(lod!=='far'){
    add(torso,plate('upper_chest_faceting',def.shoulder*1.28,.20,.045,M.primary,Math.max(8,Math.floor(q.radial/2))),[0,.11,-.29]);
    add(abdomen,plate('abdomen_guard',def.waist*1.50,.16,.035,M.leather,Math.max(7,Math.floor(q.radial/2))),[0,-.01,-.235]);
  }
  add(chestBand,plate('chest_band_plate',def.shoulder*1.45,.24,.055,M.primary,Math.max(7,q.radial/2)),[0,.02,-.285]);
  for(let i=0;i<Math.ceil(3*q.detail);i++)add(belt,box(`belt_segment_${i}`,[.13,.075,.07],i%2?M.metal:M.leather,1),[(i-1)*.13,0,-.19]);
  const neck=group(torso,'neck',[0,.31*scale,0]);add(neck,cyl('neck_mesh',.075,.068,.13*scale,M.skin,q.radial,1),[0,.065*scale,0]);
  const head=group(neck,'head',[0,.13*scale,0]);add(head,ico('head_mass',[.15*def.headScale,.14*def.headScale,.19*def.headScale],M.skin,q.sphere),[0,.15*scale,0]);
  if(lod!=='far'){
    add(head,wedge('jaw_plane',.22*def.headScale,.11*def.headScale,.13*def.headScale,M.skin),[0,.07*scale,-.105]);
    add(head,plate('face_plane',.19*def.headScale,.12*def.headScale,.022,M.skin,Math.max(7,Math.floor(q.radial/2))),[0,.16*scale,-.188]);
  }
  const crest=group(head,'crest',[0,.30*scale,0]);
  const upperLen=.345*scale,foreLen=.305*scale;
  for(const[side,sgn]of[['L',-1],['R',1]]){
    const shoulder=group(torso,`shoulder_${side}`,[sgn*def.shoulder*.92,.17*scale,0]);add(shoulder,ico(`shoulder_${side}_mass`,[.12*def.bulk,.105,.12],M.primary,q.sphere));
    const arm=group(shoulder,`arm_${side}`,[sgn*.02,-.03,0]);const upper=group(arm,`upper_arm_${side}`,[0,0,0]);upper.rotation.z=deg(sgn*28);add(upper,cyl(`upper_arm_${side}_mesh`,.085*def.bulk,.073*def.bulk,upperLen,M.cloth,q.radial,q.segments),[0,-upperLen/2,0]);
    const fore=group(upper,`forearm_${side}`,[0,-upperLen,0]);
    if(lod!=='far')add(fore,ico(`elbow_${side}_joint`,[.082*def.bulk,.075,.075],M.secondary,q.sphere),[0,.005,0]);
    add(fore,cyl(`forearm_${side}_mesh`,.074*def.bulk,.058*def.bulk,foreLen,M.skin,q.radial,q.segments),[0,-foreLen/2,0]);
    if(lod!=='far')add(fore,plate(`forearm_${side}_guard`,.14*def.bulk,.18,.032,M.primary,Math.max(7,Math.floor(q.radial/2))),[0,-foreLen*.48,-.067]);
    const hand=group(fore,`hand_${side}`,[0,-foreLen,0]);add(hand,ico(`hand_${side}_mesh`,[.068*def.bulk,.082,.058],M.skin,q.sphere),[0,-.035*scale,0]);
  }
  const thighLen=.405*scale,shinLen=.385*scale;
  for(const[side,sgn]of[['L',-1],['R',1]]){
    const hip=group(pelvis,`hip_${side}`,[sgn*def.hip*.54,-.04*scale,0]);add(hip,ico(`hip_${side}_guard`,[.11*def.bulk,.10,.105],M.primary,q.sphere));
    const thigh=group(hip,`thigh_${side}`,[0,-.01,0]);add(thigh,cyl(`thigh_${side}_mesh`,.105*def.bulk,.086*def.bulk,thighLen,M.cloth,q.radial,q.segments),[0,-thighLen/2,0]);
    const shin=group(thigh,`shin_${side}`,[0,-thighLen,0]);
    if(lod!=='far')add(shin,ico(`knee_${side}_joint`,[.095*def.bulk,.083,.086],M.secondary,q.sphere),[0,.005,0]);
    add(shin,cyl(`shin_${side}_mesh`,.088*def.bulk,.067*def.bulk,shinLen,M.leather,q.radial,q.segments),[0,-shinLen/2,0]);
    if(lod!=='far')add(shin,plate(`shin_${side}_guard`,.15*def.bulk,.20,.036,M.primary,Math.max(7,Math.floor(q.radial/2))),[0,-shinLen*.48,-.072]);
    const foot=group(shin,`foot_${side}`,[0,-shinLen,0]);
    if(lod!=='far')add(foot,ico(`ankle_${side}_guard`,[.085*def.bulk,.065,.09],M.secondary,q.sphere),[0,-.005,.015]);
    add(foot,wedge(`foot_${side}_mesh`,.18*def.bulk,.105*scale,.285*scale,M.leather),[0,-.045*scale,.075*scale]);
  }
  return{root,pelvis,abdomen,torso,chestBand,belt,head,crest,scale,q,M};
}

function decorateCairnborn(c,lod){const{torso,head,crest,M,q}=c;add(torso,plate('ancestral_chest_plate',.76,.43,.10,M.primary,10),[0,.02,-.32]);add(torso,plate('lower_slate_plate',.58,.28,.085,M.secondary,8),[0,-.17,-.29]);add(head,plate('carved_faceplate',.31,.28,.085,M.primary,8),[0,.15,-.205]);add(head,box('brow_inlay',[.29,.052,.035],M.metal,1),[0,.21,-.225]);for(const x of[-.105,0,.105])add(torso,box(`rune_channel_${x}`,[.024,.30,.028],M.accent,1),[x,.015,-.37]);for(const[side,sgn]of[['L',-1],['R',1]])add(torso,plate(`layered_pauldron_${side}`,.34,.22,.075,M.primary,10),[sgn*.455,.17,-.03],[0,deg(sgn*8),deg(sgn*7)]);if(lod!=='far'){for(let i=0;i<4;i++)add(torso,plate(`slate_scale_${i}`,.19,.13,.035,i%2?M.secondary:M.primary,7),[(i-1.5)*.16,-.07+(i%2)*.08,-.355]);add(crest,cone('replacement_stone_crystal',.065,.20,M.tertiary,8),[-.12,.06,.02],[0,0,deg(-15)]);}if(lod==='hero')for(let i=0;i<8;i++){const a=i/8*Math.PI*2;add(torso,box(`carved_edge_${i}`,[.035,.12,.035],i%2?M.metal:M.secondary,1),[Math.sin(a)*.31,.02+Math.cos(a)*.17,-.355]);}}
function decorateBrinesworn(c,lod){const{torso,head,crest,M,q}=c;for(const[side,sgn]of[['L',-1],['R',1]]){add(head,fin(`fin_ear_${side}`,sgn,M.tertiary,lod==='hero'?.028:.022,lod==='hero'?.115:.095,lod==='hero'?.085:.072),[sgn*.145,.15,-.005],[0,deg(-sgn*7),deg(sgn*5)]);add(torso,ico(`shell_pauldron_${side}`,[.18,.11,.15],M.secondary,q.sphere),[sgn*.42,.17,0]);if(lod!=='far')for(let i=0;i<3;i++)add(torso,plate(`mineral_ridge_${side}_${i}`,.13,.065,.035,M.primary,7),[sgn*(.23+i*.045),.12-i*.12,-.30],[0,0,deg(sgn*(12+i*4))]);}add(torso,box('harness_L',[.07,.62,.052],M.leather,1),[-.14,0,-.35],[0,0,deg(-17)]);add(torso,box('harness_R',[.07,.62,.052],M.leather,1),[.14,0,-.35],[0,0,deg(17)]);add(head,ico('sea_glass_eye_L',[.035,.045,.025],M.accent,q.sphere),[-.055,.17,-.175]);add(head,ico('sea_glass_eye_R',[.035,.045,.025],M.accent,q.sphere),[.055,.17,-.175]);add(crest,plate('navigation_circlet',.29,.08,.03,M.metal,8),[0,-.09,-.10]);if(lod==='hero')for(let i=0;i<6;i++)add(torso,ico(`salt_nodule_${i}`,[.035,.025,.026],i%2?M.secondary:M.accent,1),[-.22+i*.09,-.18+(i%2)*.08,-.34]);}
function decorateMyceliad(c,lod){const{torso,head,crest,M,q}=c;add(crest,cyl('crown_stem',.105,.125,.16,M.skin,Math.max(8,q.radial/2),1),[0,-.055,0]);add(crest,ico('mushroom_crown',[.38,.115,.33],M.primary,q.sphere),[0,.035,0]);add(crest,ico('mushroom_gills',[.31,.055,.265],M.secondary,q.sphere),[0,-.025,0]);add(torso,ico('grown_chest_plate',[.36,.27,.25],M.leather,q.sphere),[0,.01,-.04]);for(const[side,sgn]of[['L',-1],['R',1]])add(torso,ico(`shelf_fungus_${side}`,[lod==='hero'?.155:.135,.052,.12],M.secondary,q.sphere),[sgn*.365,.16,.02],[0,0,deg(sgn*10)]);if(lod!=='far'){for(let i=0;i<5;i++){const s=i%2?-1:1;add(torso,cone(`root_spur_${i}`,.045,.20,M.leather,7),[s*(.20+i*.025),-.18+i*.08,.05],[0,0,deg(s*35)]);}for(let i=0;i<4;i++)add(torso,ico(`spore_node_${i}`,[.03,.03,.03],M.accent,1),[-.16+i*.11,.05+(i%2)*.09,-.31]);}if(lod==='hero')for(let i=0;i<8;i++){const a=i/8*Math.PI*2;add(crest,plate(`gill_lamella_${i}`,.11,.035,.018,M.secondary,6),[Math.cos(a)*.22,.01,Math.sin(a)*.16],[0,a,0]);}}
function decorateVeylkin(c,lod){const{torso,head,crest,M,q}=c;for(const[side,sgn]of[['L',-1],['R',1]]){add(head,ico(`luminous_eye_${side}`,[.036,.045,.025],M.accent,q.sphere),[sgn*.055,.17,-.175]);const stalk=group(crest,`sensory_crest_${side}`,[sgn*.055,-.035,0]);stalk.rotation.z=deg(-sgn*18);add(stalk,cyl(`sensory_crest_${side}_mesh`,.011,.020,.22,M.tertiary,Math.max(6,q.radial/2),1),[0,.11,0]);add(stalk,wedge(`crest_vane_${side}`,.065,.13,.045,M.primary),[sgn*.012,.205,0],[0,0,deg(sgn*8)]);add(stalk,ico(`crest_tip_${side}`,[.022,.030,.022],M.accent,q.sphere),[0,.235,0]);add(torso,membrane(`moth_mantle_${side}`,sgn,M.primary,lod==='hero'?1.12:.92),[sgn*.05,.17,.01]);add(torso,membrane(`vestigial_membrane_${side}`,sgn,M.secondary,lod==='hero'?.82:.62),[sgn*.03,.03,.16],[0,0,deg(sgn*8)]);add(torso,ico(`mantle_anchor_${side}`,[.14,.09,.13],M.primary,q.sphere),[sgn*.39,.19,0]);}add(torso,plate('moon_chest_clasp',.20,.12,.045,M.metal,8),[0,.16,-.34]);if(lod==='hero')for(let i=0;i<6;i++)add(torso,plate(`powder_mark_${i}`,.06,.035,.012,M.tertiary,6),[-.15+i*.06,-.12+(i%2)*.09,-.355]);}
function decorateEchoed(c,lod){const{torso,head,crest,M,q}=c;add(torso,plate('bastion_shoulder_fragment',.28,.24,.09,M.primary,8),[-.32,.16,-.06],[0,0,deg(-8)]);add(torso,ico('verdant_shoulder_growth',[.19,.11,.15],M.secondary,q.sphere),[.34,.17,.02]);add(head,ico('asymmetrical_iris',[.038,.032,.021],M.accent,q.sphere),[.05,.17,-.18]);for(let i=0;i<3;i++)add(torso,cone(`impossible_relic_${i}`,.028,.105+i*.018,M.metal,7),[-.14+i*.14,.02+i*.07,-.335],[deg(8*i),0,deg(-12+12*i)]);add(crest,plate('lost_civilization_diadem',.27,.09,.035,M.tertiary,8),[0,-.05,-.10]);if(lod!=='far')for(let i=0;i<4;i++)add(torso,box(`timeline_displacement_${i}`,[.014,.14-.012*i,.022],M.accent,1),[-.12+i*.08,-.07+i*.055,.205],[deg(2*i),deg(-4+3*i),deg(-3+2*i)]);if(lod==='hero'){const echoMat=M.accent.clone();echoMat.name='second_possibility_echo';echoMat.transparent=true;echoMat.opacity=.22;echoMat.depthWrite=false;add(torso,ico('duplicate_silhouette_shard',[.27,.24,.08],echoMat,2),[.045,.02,.18],[0,deg(8),deg(4)]);for(let i=0;i<6;i++)add(torso,plate(`fracture_token_${i}`,.07,.05,.018,i%2?M.metal:M.accent,6),[-.18+i*.07,.20-(i%3)*.12,-.36]);}}

const defs=[
  {key:'cairnborn',label:'Cairnborn',faction:'Bastion Compact',elementId:'579defc6-18d2-4dd7-83ff-6d23a51f31fe',height:1.94,shoulder:.49,waist:.28,hip:.34,headScale:1.05,bulk:1.10,decorate:decorateCairnborn,silhouetteNotes:'Broad memorial-stone frame, layered slate armor, carved faceplate and ancestral rune channels.'},
  {key:'brinesworn',label:'Brinesworn',faction:'Bastion Compact',elementId:'d504b1e4-275d-4ccc-a07f-ab61bcc6848d',height:1.87,shoulder:.41,waist:.245,hip:.28,headScale:.98,bulk:.94,decorate:decorateBrinesworn,silhouetteNotes:'Tall coastal humanoid, narrow waist, mineral ridges, fin ears and shell-shoulder navigation gear.'},
  {key:'myceliad',label:'Myceliad',faction:'Verdant Oath',elementId:'d9b6f30a-fa51-47c4-b22c-70ed66c07081',height:1.79,shoulder:.42,waist:.29,hip:.31,headScale:.90,bulk:1.02,decorate:decorateMyceliad,silhouetteNotes:'Root-limbed fungal humanoid with broad mushroom crown, readable gills and asymmetric grown armor.'},
  {key:'veylkin',label:'Veylkin',faction:'Verdant Oath',elementId:'57e790db-f7c4-4a5b-a0b1-ed66a1915314',height:1.91,shoulder:.39,waist:.235,hip:.27,headScale:1.00,bulk:.90,decorate:decorateVeylkin,silhouetteNotes:'Tall narrow nocturnal frame with sensory crests, moth mantle and restrained vestigial membranes.'},
  {key:'echoed',label:'Echoed',faction:'Neutral / Chosen',elementId:'09146293-fa83-4aef-b6e1-a3e1ee7dd6db',height:1.83,shoulder:.43,waist:.26,hip:.29,headScale:.98,bulk:.98,decorate:decorateEchoed,silhouetteNotes:'Deliberately asymmetric timeline-displaced humanoid with mismatched faction forms and spectral relic shards.'}
];
function measure(root){let triangles=0,meshes=0;const materials=new Set();root.traverse(o=>{if(!o.isMesh)return;meshes++;const g=o.geometry;triangles+=Math.floor((g?.index?.count??g?.attributes?.position?.count??0)/3);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m?.name)materials.add(m.name);});return{triangles,meshes,materials:[...materials].sort()};}
function validateParts(root,def,lod){const missing=REQUIRED_PARTS.filter(n=>!root.getObjectByName(n));if(missing.length)throw new Error(`${def.key}/${lod} missing pivots: ${missing.join(', ')}`);}
async function exportGlb(root,filename){root.updateMatrixWorld(true);const result=await exporter.parseAsync(root,{binary:true,onlyVisible:true,trs:true});await fs.writeFile(path.join(OUT,filename),Buffer.from(result));}
const manifest={schemaVersion:2,target:ART,source:'Higgsfield locked Character Elements',rigType:'articulated-rigid-part',productionMesh:false,defaultRace:'cairnborn',generatorVersion:GENERATOR_VERSION,lodDistances:{heroMax:11,midMax:24},races:[]};
for(const def of defs){const referenceLock={...ART_REFS[def.key]};if(referenceLock.elementId!==def.elementId)throw new Error(`Reference Element ID drift for ${def.key}`);const record={key:def.key,label:def.label,faction:def.faction,elementId:def.elementId,height:def.height,productionMesh:false,rigType:'articulated-rigid-part',generatorVersion:GENERATOR_VERSION,silhouetteNotes:def.silhouetteNotes,referenceLock,parts:[...REQUIRED_PARTS],triangles:{},meshes:{},materials:[]};for(const lod of['hero','mid','far']){const M=createMaterials(def.key);const c=makeRig(def,lod,M);def.decorate(c,lod);const model=c.root;model.userData={...model.userData,race:def.label,faction:def.faction,elementId:def.elementId,target:ART,rigType:'articulated-rigid-part',productionMesh:false,lod,referenceLock};validateParts(model,def,lod);const stats=measure(model);if(lod==='hero'&&stats.triangles<5500)throw new Error(`${def.key} hero below 5500 triangles: ${stats.triangles}`);if(lod==='mid'&&stats.triangles<2500)throw new Error(`${def.key} mid below 2500 triangles: ${stats.triangles}`);if(lod==='far'&&stats.triangles>2200)throw new Error(`${def.key} far above 2200 triangles: ${stats.triangles}`);const suffix=lod==='hero'?'':`_${lod}`;const filename=`gauntlet_${def.key}${suffix}_v1.glb`;await exportGlb(model,filename);record.triangles[lod]=stats.triangles;record.meshes[lod]=stats.meshes;if(lod==='hero')record.materials=stats.materials;record[`${lod}Url`]=`/assets/races/${filename}`;}record.url=record.heroUrl;manifest.races.push(record);}
if(manifest.races.length!==5)throw new Error(`Expected five races, got ${manifest.races.length}`);const expectedIds=new Map(defs.map(d=>[d.key,d.elementId]));for(const r of manifest.races){if(expectedIds.get(r.key)!==r.elementId)throw new Error(`Element ID drift for ${r.key}`);if(r.url!==r.heroUrl)throw new Error(`Legacy URL drift for ${r.key}`);}
await fs.writeFile(path.join(OUT,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
await fs.writeFile(path.join(OUT,'README.md'),`# Gauntlet Race Assets\n\nGenerated deterministically with \`npm run assets:races\`.\n\n- Art target: ${ART}\n- Generator: ${GENERATOR_VERSION}\n- Source lock: Higgsfield Element + canonical A-pose + 4K turnaround + 4K detail board per race\n- Rig type: articulated rigid-part (not a skinned production mesh)\n- LODs: hero, mid, far for all five races\n- Stable contract: race keys, Higgsfield Element IDs, canonical named pivots, manifest URLs\n\nFuture skinned replacements must preserve race identity, Element IDs, scale, and canonical pivot/bone mapping.\n`);
console.log('Generated production-tier race LODs:');for(const r of manifest.races)console.log(`${r.label}: hero ${r.triangles.hero} | mid ${r.triangles.mid} | far ${r.triangles.far}`);console.log(`Output -> ${OUT}`);
