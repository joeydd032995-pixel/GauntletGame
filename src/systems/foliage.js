import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const PALETTES={
  oak:{leaf:[0x7f9855,0x5b783f,0x355238],bark:[0x79573f,0x443027]},
  ash:{leaf:[0x78925d,0x557649,0x345541],bark:[0x82715e,0x4b4339]},
  pine:{leaf:[0x70894b,0x48683a,0x29482f],bark:[0x704d37,0x3e2c23]}
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
  return new THREE.MeshStandardMaterial({map,color:0xffffff,roughness:.96,metalness:0,envMapIntensity:.08});
}
function makeCanopyMaterial(palette,{far=false}={}){return new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,flatShading:true,roughness:.94,metalness:0,side:THREE.DoubleSide,envMapIntensity:far?.06:.09,emissive:palette[2],emissiveIntensity:far?.08:.13});}

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

function makeLobe({position,scale,color,detail=1,twist=0,shade=1}){const g=new THREE.IcosahedronGeometry(1,detail);g.scale(scale.x,scale.y,scale.z);g.rotateY(twist);g.translate(position.x,position.y,position.z);return tintGeometry(g,color,shade);}
function createLobedCrown({seed=1,shape='broad',far=false,palette=PALETTES.oak.leaf}={}){
  const rand=seeded(seed),parts=[],count=shape==='broad'?(far?10:27):(far?9:23);
  for(let i=0;i<count;i++){
    let x,y,z,sx,sy,sz,tier;
    if(shape==='broad'){
      tier=i<10?0:i<19?1:2;const slots=tier===0?10:tier===1?9:8,a=(i+(tier===1?.42:.08))/slots*Math.PI*2+(rand()-.5)*.25,ring=tier===0?1.0:tier===1?.66:.3;
      x=Math.cos(a)*ring+(rand()-.5)*.15;z=Math.sin(a)*ring+(rand()-.5)*.15;y=-.13+tier*.46+(rand()-.5)*.14;sx=.5+rand()*.2+(tier===0?.05:0);sy=.36+rand()*.14;sz=.48+rand()*.2;
    }else{
      tier=Math.min(4,Math.floor(i/5));const slots=5,a=(i%5)/slots*Math.PI*2+tier*.43+(rand()-.5)*.22,ring=.5-tier*.055;
      x=Math.cos(a)*ring+(rand()-.5)*.11;z=Math.sin(a)*ring+(rand()-.5)*.11;y=-.34+tier*.43+(rand()-.5)*.12;sx=.37+rand()*.14;sy=.46+rand()*.18;sz=.36+rand()*.14;
    }
    const color=palette[(i+tier)%palette.length],detail=far?0:1,shade=.9+tier*.035+rand()*.06;parts.push(makeLobe({position:new THREE.Vector3(x,y,z),scale:new THREE.Vector3(sx,sy,sz),color,detail,twist:rand()*Math.PI,shade}));
  }
  return mergeParts(parts,`${shape} canopy`);
}

function createConiferCrown({layers=10,far=false,palette=PALETTES.pine.leaf}={}){
  const parts=[],whorls=far?4:6;
  for(let layer=0;layer<layers;layer++){
    const t=layer/Math.max(1,layers-1),reach=(1.35-t*.82)*(far?.88:1),width=.31+(1-t)*.16,y=.55+layer*.43;
    for(let b=0;b<whorls;b++){
      const a=b/whorls*Math.PI*2+(layer%2)*.43,r=reach*.38,scale=new THREE.Vector3(reach*.58,.13+(1-t)*.08,width*(.78+(b%2)*.1)),position=new THREE.Vector3(Math.cos(a)*r,y-(b%2)*.025,Math.sin(a)*r),color=palette[(layer+b)%palette.length];parts.push(makeLobe({position,scale,color,detail:0,twist:-a,shade:.88+t*.09}));
    }
    if(!far&&layer%2===0)parts.push(makeLobe({position:new THREE.Vector3(0,y+.02,0),scale:new THREE.Vector3(.34+(1-t)*.12,.16,.34+(1-t)*.12),color:palette[1],detail:0,twist:layer*.3,shade:.92}));
  }
  parts.push(makeLobe({position:new THREE.Vector3(0,.55+layers*.43+.17,0),scale:new THREE.Vector3(.22,.42,.22),color:palette[0],detail:0,shade:.98}));
  return mergeParts(parts,'Conifer crown');
}

export function createTreeSpeciesLibrary(){
  return[
    {id:'frontier-oak',trunk:createBranchedTrunkGeometry({height:5.1,baseRadius:.46,topRadius:.16,branchScale:1.13,style:'oak'}),nearCrown:createLobedCrown({seed:31,shape:'broad',palette:PALETTES.oak.leaf}),farCrown:createLobedCrown({seed:31,shape:'broad',far:true,palette:PALETTES.oak.leaf}),trunkMaterial:makeBarkMaterial(PALETTES.oak.bark),nearMaterial:makeCanopyMaterial(PALETTES.oak.leaf),farMaterial:makeCanopyMaterial(PALETTES.oak.leaf,{far:true}),crownY:4.12,baseScale:[.9,1.14]},
    {id:'silver-ash',trunk:createBranchedTrunkGeometry({height:5.8,baseRadius:.32,topRadius:.1,branchScale:.98,style:'ash'}),nearCrown:createLobedCrown({seed:71,shape:'narrow',palette:PALETTES.ash.leaf}),farCrown:createLobedCrown({seed:71,shape:'narrow',far:true,palette:PALETTES.ash.leaf}),trunkMaterial:makeBarkMaterial(PALETTES.ash.bark),nearMaterial:makeCanopyMaterial(PALETTES.ash.leaf),farMaterial:makeCanopyMaterial(PALETTES.ash.leaf,{far:true}),crownY:4.35,baseScale:[.84,1.1]},
    {id:'ashen-pine',trunk:createBranchedTrunkGeometry({height:6.35,baseRadius:.34,topRadius:.085,branchScale:.25,style:'ash'}),nearCrown:createConiferCrown({layers:11,palette:PALETTES.pine.leaf}),farCrown:createConiferCrown({layers:7,far:true,palette:PALETTES.pine.leaf}),trunkMaterial:makeBarkMaterial(PALETTES.pine.bark),nearMaterial:makeCanopyMaterial(PALETTES.pine.leaf),farMaterial:makeCanopyMaterial(PALETTES.pine.leaf,{far:true}),crownY:.82,baseScale:[.9,1.14]}
  ];
}

function leafBlade(width,height,{bend=.08}={}){
  const boundary=[[0,0,0],[-width*.34,height*.22,bend*.08],[-width*.53,height*.48,bend*.3],[-width*.3,height*.76,bend*.66],[0,height,bend],[width*.3,height*.76,bend*.66],[width*.53,height*.48,bend*.3],[width*.34,height*.22,bend*.08]],center=[0,height*.49,bend*.34],positions=[...center];for(const p of boundary)positions.push(...p);const indices=[];for(let i=0;i<boundary.length;i++)indices.push(0,1+i,1+((i+1)%boundary.length));const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function placeBlade(g,{angle=0,pitch=-.45,roll=0,x=0,y=0,z=0}){g.rotateX(pitch);g.rotateZ(roll);g.rotateY(angle);g.translate(x,y,z);return g;}
export function createGrassClumpGeometry({blades=15,height=.43,width=.034}={}){
  const parts=[];for(let b=0;b<blades;b++){const a=b/blades*Math.PI*2+.15*(b%3),h=height*(.72+(b%6)*.065),w=width*(.72+(b%3)*.15),g=leafBlade(w,h,{bend:.035+(b%2)*.025});placeBlade(g,{angle:a,pitch:-.08+(b%2)*.1,roll:(b%2?1:-1)*.045});parts.push(g);}return mergeParts(parts,'Grass clump');
}
export function createFernGeometry(){
  const parts=[],fronds=9;for(let f=0;f<fronds;f++){const a=f/fronds*Math.PI*2+(f%2)*.12;for(let j=0;j<6;j++){const t=(j+1)/7,r=.06+t*.32,y=.035+t*.095,w=.08*(1-t*.3),h=.17*(1-t*.14);for(const side of[-1,1]){const g=leafBlade(w,h,{bend:.032});placeBlade(g,{angle:a+side*(.39-.12*t),pitch:-.76+t*.26,roll:side*.24,x:Math.cos(a)*r,y,z:Math.sin(a)*r});parts.push(g);}}const tip=leafBlade(.095,.31,{bend:.045});placeBlade(tip,{angle:a,pitch:-.54,x:Math.cos(a)*.4,y:.17,z:Math.sin(a)*.4});parts.push(tip);}return mergeParts(parts,'Fern');
}
export function createBroadleafGroundGeometry(){
  const parts=[];for(let i=0;i<10;i++){const a=i/10*Math.PI*2,g=leafBlade(.3+(i%3)*.035,.48+(i%2)*.07,{bend:.065});placeBlade(g,{angle:a,pitch:-.53+(i%2)*.08,roll:(i%2?1:-1)*.075,x:Math.cos(a)*.075,y:.008,z:Math.sin(a)*.075});parts.push(g);}return mergeParts(parts,'Broadleaf ground');
}
export function createShrubGeometry(){
  const parts=[];for(let tier=0;tier<4;tier++){const count=8-tier;for(let i=0;i<count;i++){const a=i/count*Math.PI*2+tier*.43,r=.2-tier*.028,g=leafBlade(.31-tier*.025,.34-tier*.018,{bend:.055});placeBlade(g,{angle:a,pitch:-.5+tier*.05,roll:(i%2?1:-1)*(.11+tier*.012),x:Math.cos(a)*r,y:.07+tier*.125,z:Math.sin(a)*r});parts.push(g);}}return mergeParts(parts,'Shrub');
}
export function createMossPatchGeometry(){
  const parts=[],centers=[[0,0,0],[.16,0,.04],[-.15,0,.07],[.07,0,-.14],[-.09,0,-.13],[.02,0,.16],[.19,0,-.09]];for(let i=0;i<centers.length;i++){const [x,,z]=centers[i],g=new THREE.SphereGeometry(1,8,4,0,Math.PI*2,0,Math.PI*.5);g.scale(.18+(i%3)*.03,.052+(i%2)*.018,.15+(i%2)*.03);g.translate(x,.004,z);parts.push(g);}return mergeParts(parts,'Moss cushion');
}
export function createFlowerGeometry(){
  const parts=[new THREE.CylinderGeometry(.012,.017,.3,5)];parts[0].translate(0,.15,0);for(let i=0;i<6;i++){const a=i/6*Math.PI*2,p=new THREE.CircleGeometry(.061,8);p.rotateX(-Math.PI/2);p.translate(Math.cos(a)*.055,.31,Math.sin(a)*.055);parts.push(p);}return mergeParts(parts,'Flower');
}
