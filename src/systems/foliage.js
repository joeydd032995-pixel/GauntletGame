import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const PALETTES={
  oak:{leaf:[0xa6b965,0x748b49,0x405c33],bark:[0x805d42,0x493328]},
  ash:{leaf:[0x91aa6d,0x607e52,0x365943],bark:[0x8b7862,0x51483d]},
  pine:{leaf:[0x7d9554,0x4d6d3c,0x2c4b32],bark:[0x755139,0x412e24]}
};

function seeded(seed=17){let s=seed||17;return()=>((s=(s*48271)%2147483647)/2147483647);}
function colorCss(hex,a=1){const c=new THREE.Color(hex);return`rgba(${Math.round(c.r*255)},${Math.round(c.g*255)},${Math.round(c.b*255)},${a})`;}
function normalizePart(g){let out=g;if(out.index){out=g.toNonIndexed();g.dispose();}if(out.attributes.uv)out.deleteAttribute('uv');if(out.attributes.tangent)out.deleteAttribute('tangent');if(!out.attributes.normal)out.computeVertexNormals();return out;}
function tintGeometry(g,hex,shade=1){const c=new THREE.Color(hex).multiplyScalar(shade),colors=[];for(let i=0;i<g.attributes.position.count;i++)colors.push(c.r,c.g,c.b);g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return g;}
function mergeParts(parts,label){const normalized=parts.map(normalizePart),merged=mergeGeometries(normalized,false);for(const p of normalized)p.dispose();if(!merged)throw new Error(`${label} geometry merge failed`);merged.computeVertexNormals();return merged;}

function makeBarkMaterial(palette){
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle=colorCss(palette[0]);x.fillRect(0,0,128,128);
  for(let i=0;i<34;i++){const px=(i*43)%128,w=2+(i%4),y=(i*23)%128;x.fillStyle=colorCss(i%3?palette[1]:palette[0],.48);x.fillRect(px,y,w,18+(i%7)*5);}
  for(let i=0;i<22;i++){x.strokeStyle=colorCss(palette[1],.28);x.lineWidth=1+(i%2);x.beginPath();x.moveTo((i*31)%128,0);x.lineTo(((i*31)+10)%128,128);x.stroke();}
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(2.5,6.2);map.anisotropy=6;
  return new THREE.MeshStandardMaterial({map,color:0xffffff,roughness:.96,metalness:0,envMapIntensity:.09});
}
function makeCanopyMaterial(palette,{far=false}={}){return new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,flatShading:true,roughness:.93,metalness:0,side:THREE.DoubleSide,envMapIntensity:far?.07:.11,emissive:palette[2],emissiveIntensity:far?.07:.11});}

function addBranch(parts,{length=.9,r0=.11,r1=.045,position=[0,2,0],rotation=[0,0,.7],radial=7}){
  const g=new THREE.CylinderGeometry(r1,r0,length,radial,1,false);g.translate(0,length*.5,0);g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...position),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(1,1,1)));parts.push(g);
}
export function createBranchedTrunkGeometry({height=4.8,baseRadius=.4,topRadius=.16,branchScale=1,style='oak'}={}){
  const parts=[],main=new THREE.CylinderGeometry(topRadius,baseRadius,height,style==='ash'?10:11,5,false);main.translate(0,height*.5,0);parts.push(main);
  const defs=style==='ash'?[[2.1,.35,.78],[2.62,-.55,-.74],[3.05,.92,.6],[3.48,-.96,-.57],[3.9,.3,.64],[4.28,-.2,-.52]]:[[1.9,.18,.9],[2.32,-.76,-.82],[2.72,1.08,.72],[3.1,-1.31,-.65],[3.46,.58,.62],[3.82,-.4,-.56],[4.14,1.5,.46]];
  for(let i=0;i<defs.length;i++){const[y,ry,rz]=defs[i],a=i/defs.length*Math.PI*2,reach=(.9+(i%3)*.15)*branchScale;addBranch(parts,{length:reach,r0:.12*branchScale,r1:.043*branchScale,position:[Math.cos(a)*.07,y,Math.sin(a)*.07],rotation:[0,ry+a,rz],radial:7});}
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2,root=new THREE.CylinderGeometry(.035,.13,.72,6,1,false);root.translate(0,.36,0);root.rotateZ(1.18);root.rotateY(a);root.translate(Math.cos(a)*.14,.04,Math.sin(a)*.14);parts.push(root);}
  return mergeParts(parts,'Tree trunk');
}

function makeLobe({position,scale,color,detail=1,twist=0}){const g=new THREE.IcosahedronGeometry(1,detail);g.scale(scale.x,scale.y,scale.z);g.rotateY(twist);g.translate(position.x,position.y,position.z);return tintGeometry(g,color,.93);}
function createLobedCrown({seed=1,shape='broad',far=false,palette=PALETTES.oak.leaf}={}){
  const rand=seeded(seed),parts=[],count=shape==='broad'?(far?8:17):(far?7:15);
  for(let i=0;i<count;i++){
    let x,y,z,sx,sy,sz;
    if(shape==='broad'){
      const tier=i<7?0:i<13?1:2,slots=tier===0?7:tier===1?6:4,a=(i+(tier===1?.42:.08))/slots*Math.PI*2+(rand()-.5)*.28,ring=tier===0?1.02:tier===1?.67:.3;
      x=Math.cos(a)*ring+(rand()-.5)*.18;z=Math.sin(a)*ring+(rand()-.5)*.18;y=-.12+tier*.52+(rand()-.5)*.18;sx=.66+rand()*.26+(tier===0?.08:0);sy=.48+rand()*.18;sz=.64+rand()*.25;
    }else{
      const tier=Math.min(3,Math.floor(i/4)),slots=4,a=(i%4)/slots*Math.PI*2+tier*.48+(rand()-.5)*.25,ring=.55-tier*.07;
      x=Math.cos(a)*ring+(rand()-.5)*.14;z=Math.sin(a)*ring+(rand()-.5)*.14;y=-.25+tier*.58+(rand()-.5)*.15;sx=.48+rand()*.18;sy=.57+rand()*.23;sz=.46+rand()*.18;
    }
    const color=palette[Math.min(palette.length-1,Math.floor(rand()*palette.length))],detail=far?0:1;parts.push(makeLobe({position:new THREE.Vector3(x,y,z),scale:new THREE.Vector3(sx,sy,sz),color,detail,twist:rand()*Math.PI}));
  }
  return mergeParts(parts,`${shape} canopy`);
}

function coniferFan(reach,width,drop,color){
  const positions=[0,0,0,reach*.28,.025,width,reach*.68,-drop*.35,width*.5,reach,-drop,0,reach*.68,-drop*.35,-width*.5,reach*.28,.025,-width],indices=[0,1,2,0,2,3,0,3,4,0,4,5];
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return tintGeometry(g,color,.94);
}
function createConiferCrown({layers=9,far=false,palette=PALETTES.pine.leaf}={}){
  const parts=[],whorls=far?4:7;
  for(let layer=0;layer<layers;layer++){
    const t=layer/Math.max(1,layers-1),reach=(1.42-t*.86)*(far?.9:1),width=.22+(1-t)*.18,drop=.08+(1-t)*.14,y=.55+layer*.47;
    for(let b=0;b<whorls;b++){const a=b/whorls*Math.PI*2+(layer%2)*.41,g=coniferFan(reach*(.88+(b%2)*.11),width,drop,palette[(layer+b)%palette.length]);g.rotateY(a);g.translate(Math.cos(a)*.06,y,Math.sin(a)*.06);parts.push(g);}
  }
  for(let b=0;b<5;b++){const a=b/5*Math.PI*2,g=coniferFan(.48,.13,.1,palette[0]);g.rotateY(a);g.rotateZ(-.38);g.translate(0,.55+layers*.47,0);parts.push(g);}
  return mergeParts(parts,'Conifer crown');
}

export function createTreeSpeciesLibrary(){
  return[
    {id:'frontier-oak',trunk:createBranchedTrunkGeometry({height:5.1,baseRadius:.46,topRadius:.16,branchScale:1.13,style:'oak'}),nearCrown:createLobedCrown({seed:31,shape:'broad',palette:PALETTES.oak.leaf}),farCrown:createLobedCrown({seed:31,shape:'broad',far:true,palette:PALETTES.oak.leaf}),trunkMaterial:makeBarkMaterial(PALETTES.oak.bark),nearMaterial:makeCanopyMaterial(PALETTES.oak.leaf),farMaterial:makeCanopyMaterial(PALETTES.oak.leaf,{far:true}),crownY:4.12,baseScale:[.9,1.14]},
    {id:'silver-ash',trunk:createBranchedTrunkGeometry({height:5.8,baseRadius:.32,topRadius:.1,branchScale:.98,style:'ash'}),nearCrown:createLobedCrown({seed:71,shape:'narrow',palette:PALETTES.ash.leaf}),farCrown:createLobedCrown({seed:71,shape:'narrow',far:true,palette:PALETTES.ash.leaf}),trunkMaterial:makeBarkMaterial(PALETTES.ash.bark),nearMaterial:makeCanopyMaterial(PALETTES.ash.leaf),farMaterial:makeCanopyMaterial(PALETTES.ash.leaf,{far:true}),crownY:4.35,baseScale:[.84,1.1]},
    {id:'ashen-pine',trunk:createBranchedTrunkGeometry({height:6.35,baseRadius:.34,topRadius:.085,branchScale:.28,style:'ash'}),nearCrown:createConiferCrown({layers:10,palette:PALETTES.pine.leaf}),farCrown:createConiferCrown({layers:7,far:true,palette:PALETTES.pine.leaf}),trunkMaterial:makeBarkMaterial(PALETTES.pine.bark),nearMaterial:makeCanopyMaterial(PALETTES.pine.leaf),farMaterial:makeCanopyMaterial(PALETTES.pine.leaf,{far:true}),crownY:.9,baseScale:[.9,1.14]}
  ];
}

function leafBlade(width,height,{bend=.08}={}){
  const positions=[0,0,0,-width*.48,height*.38,0,0,height,bend,width*.48,height*.38,0],indices=[0,1,2,0,2,3];const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function placeBlade(g,{angle=0,pitch=-.45,roll=0,x=0,y=0,z=0}){g.rotateX(pitch);g.rotateZ(roll);g.rotateY(angle);g.translate(x,y,z);return g;}
export function createGrassClumpGeometry({blades=12,height=.5,width=.055}={}){
  const parts=[];for(let b=0;b<blades;b++){const a=b/blades*Math.PI*2+.17*(b%3),h=height*(.76+(b%5)*.075),w=width*(.74+(b%3)*.16),g=leafBlade(w,h,{bend:.025+(b%2)*.025});placeBlade(g,{angle:a,pitch:-.05+(b%2)*.09,roll:(b%2?1:-1)*.04});parts.push(g);}return mergeParts(parts,'Grass clump');
}
export function createFernGeometry(){
  const parts=[],fronds=9;for(let f=0;f<fronds;f++){const a=f/fronds*Math.PI*2+(f%2)*.12;for(let j=0;j<5;j++){const t=(j+1)/6,r=.07+t*.3,y=.04+t*.11,w=.095*(1-t*.35),h=.2*(1-t*.18);for(const side of[-1,1]){const g=leafBlade(w,h,{bend:.025});placeBlade(g,{angle:a+side*(.35-.12*t),pitch:-.72+t*.24,roll:side*.22,x:Math.cos(a)*r,y,z:Math.sin(a)*r});parts.push(g);}}const tip=leafBlade(.11,.32,{bend:.04});placeBlade(tip,{angle:a,pitch:-.53,x:Math.cos(a)*.38,y:.19,z:Math.sin(a)*.38});parts.push(tip);}return mergeParts(parts,'Fern');
}
export function createBroadleafGroundGeometry(){
  const parts=[];for(let i=0;i<9;i++){const a=i/9*Math.PI*2,g=leafBlade(.28+(i%3)*.035,.52+(i%2)*.08,{bend:.055});placeBlade(g,{angle:a,pitch:-.5+(i%2)*.09,roll:(i%2?1:-1)*.07,x:Math.cos(a)*.08,y:.01,z:Math.sin(a)*.08});parts.push(g);}return mergeParts(parts,'Broadleaf ground');
}
export function createShrubGeometry(){
  const parts=[];for(let tier=0;tier<4;tier++){const count=7-tier;for(let i=0;i<count;i++){const a=i/count*Math.PI*2+tier*.47,r=.2-tier*.03,g=leafBlade(.25-tier*.025,.42-tier*.03,{bend:.045});placeBlade(g,{angle:a,pitch:-.36+tier*.055,roll:(i%2?1:-1)*(.1+tier*.015),x:Math.cos(a)*r,y:.08+tier*.13,z:Math.sin(a)*r});parts.push(g);}}return mergeParts(parts,'Shrub');
}
export function createMossPatchGeometry(){
  const parts=[],centers=[[0,0,0],[.18,0,.05],[-.16,0,.08],[.08,0,-.16],[-.1,0,-.14],[.03,0,.18]];for(let i=0;i<centers.length;i++){const [x,,z]=centers[i],g=new THREE.SphereGeometry(1,7,4,0,Math.PI*2,0,Math.PI*.5);g.scale(.22+(i%3)*.035,.045+(i%2)*.018,.18+(i%2)*.035);g.translate(x,.004,z);parts.push(g);}return mergeParts(parts,'Moss cushion');
}
export function createFlowerGeometry(){
  const parts=[new THREE.CylinderGeometry(.013,.018,.31,5)];parts[0].translate(0,.155,0);for(let i=0;i<6;i++){const a=i/6*Math.PI*2,p=new THREE.CircleGeometry(.064,7);p.rotateX(-Math.PI/2);p.translate(Math.cos(a)*.057,.32,Math.sin(a)*.057);parts.push(p);}return mergeParts(parts,'Flower');
}
