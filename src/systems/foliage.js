import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const PALETTES={
  oak:{leaf:[0x9aaf58,0x67813d,0x3d5a2f],bark:[0x815d40,0x4a3327]},
  ash:{leaf:[0x86a563,0x567b4b,0x31543b],bark:[0x887760,0x51483c]},
  pine:{leaf:[0x718d4b,0x486a37,0x29492e],bark:[0x76523a,0x422f25]}
};

function seeded(seed=17){let s=seed||17;return()=>((s=(s*48271)%2147483647)/2147483647);}
function colorCss(hex,a=1){const c=new THREE.Color(hex);return`rgba(${Math.round(c.r*255)},${Math.round(c.g*255)},${Math.round(c.b*255)},${a})`;}

function leafTexture({light,mid,dark,shape='oval'}={}){
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.clearRect(0,0,128,128);
  const g=x.createRadialGradient(50,35,3,63,61,60);g.addColorStop(0,colorCss(light));g.addColorStop(.52,colorCss(mid));g.addColorStop(.9,colorCss(dark));g.addColorStop(1,colorCss(dark,0));x.fillStyle=g;x.beginPath();
  if(shape==='round'){x.moveTo(64,5);x.bezierCurveTo(111,7,127,42,108,78);x.bezierCurveTo(95,111,48,127,19,92);x.bezierCurveTo(-5,61,12,14,64,5);}
  else{x.moveTo(64,4);x.bezierCurveTo(110,18,121,56,64,122);x.bezierCurveTo(8,57,18,18,64,4);}
  x.closePath();x.fill();x.strokeStyle=colorCss(light,.58);x.lineWidth=2;x.beginPath();x.moveTo(64,15);x.lineTo(64,110);x.stroke();
  for(let i=0;i<6;i++){const y=29+i*12;x.strokeStyle=colorCss(light,.25);x.lineWidth=1;x.beginPath();x.moveTo(64,y);x.lineTo(42-i*.55,y+10);x.moveTo(64,y);x.lineTo(86+i*.55,y+10);x.stroke();}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;t.generateMipmaps=true;return t;
}

function makeLeafMaterial(palette,{shape='oval',alphaTest=.32}={}){
  return new THREE.MeshStandardMaterial({map:leafTexture({light:palette[0],mid:palette[1],dark:palette[2],shape}),alphaTest,transparent:false,side:THREE.DoubleSide,roughness:.88,metalness:0,color:0xffffff,vertexColors:true,envMapIntensity:.16,emissive:palette[2],emissiveIntensity:.2});
}
function makeFarLeafMaterial(palette){return new THREE.MeshStandardMaterial({color:palette[1],roughness:.92,metalness:0,vertexColors:true,flatShading:true,envMapIntensity:.12,emissive:palette[2],emissiveIntensity:.12});}
function makeBarkMaterial(palette){
  const c=document.createElement('canvas');c.width=c.height=96;const x=c.getContext('2d');x.fillStyle=colorCss(palette[0]);x.fillRect(0,0,96,96);
  for(let i=0;i<26;i++){const px=(i*37)%96,w=2+(i%4),y=(i*19)%96;x.fillStyle=colorCss(i%3?palette[1]:palette[0],.55);x.fillRect(px,y,w,14+(i%6)*5);}
  for(let i=0;i<18;i++){x.strokeStyle=colorCss(palette[1],.35);x.beginPath();x.moveTo((i*29)%96,0);x.lineTo(((i*29)+9)%96,96);x.stroke();}
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(2.4,5.8);map.anisotropy=4;return new THREE.MeshStandardMaterial({map,color:0xffffff,roughness:.95,metalness:0,envMapIntensity:.1});
}

function addBranch(parts,{length=.9,r0=.11,r1=.045,position=[0,2,0],rotation=[0,0,.7],radial=7}){
  const g=new THREE.CylinderGeometry(r1,r0,length,radial,1,false);g.translate(0,length*.5,0);g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...position),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(1,1,1)));parts.push(g);
}
export function createBranchedTrunkGeometry({height=4.8,baseRadius=.4,topRadius=.16,branchScale=1,style='oak'}={}){
  const parts=[],main=new THREE.CylinderGeometry(topRadius,baseRadius,height,style==='ash'?10:11,4,false);main.translate(0,height*.5,0);parts.push(main);
  const defs=style==='ash'?[[2.15,.35,.8],[2.65,-.55,-.76],[3.08,.92,.62],[3.5,-.96,-.58],[3.92,.3,.66],[4.25,-.2,-.54]]:[[1.95,.18,.92],[2.35,-.76,-.84],[2.75,1.08,.75],[3.12,-1.31,-.68],[3.48,.58,.64],[3.82,-.4,-.58],[4.12,1.5,.48]];
  for(let i=0;i<defs.length;i++){const[y,ry,rz]=defs[i],a=i/defs.length*Math.PI*2,reach=(.88+(i%3)*.14)*branchScale;addBranch(parts,{length:reach,r0:.115*branchScale,r1:.042*branchScale,position:[Math.cos(a)*.07,y,Math.sin(a)*.07],rotation:[0,ry+a,rz],radial:7});}
  const merged=mergeGeometries(parts,false);for(const p of parts)p.dispose();merged.computeVertexNormals();return merged;
}

function cardGeometry(w,h,position,rotation,shade){
  const plane=new THREE.PlaneGeometry(w,h,1,1);plane.translate(0,h*.13,0);plane.applyMatrix4(new THREE.Matrix4().compose(position,new THREE.Quaternion().setFromEuler(rotation),new THREE.Vector3(1,1,1)));const c=[];for(let v=0;v<plane.attributes.position.count;v++)c.push(.86*shade,.98*shade,.8*shade);plane.setAttribute('color',new THREE.Float32BufferAttribute(c,3));return plane;
}
export function createLeafCanopyGeometry({cards=60,seed=17,shape='broad'}={}){
  const rand=seeded(seed),parts=[];for(let i=0;i<cards;i++){const a=rand()*Math.PI*2,y=(rand()-.43)*(shape==='narrow'?2.5:1.9),r=Math.sqrt(rand())*((shape==='narrow'?.88:1.18)-Math.abs(y)*(shape==='narrow'?.1:.18)),x=Math.cos(a)*r,z=Math.sin(a)*r,w=(shape==='narrow'?.42:.56)+rand()*(shape==='narrow'?.36:.46),h=(shape==='narrow'?.58:.64)+rand()*(shape==='narrow'?.43:.5),rot=new THREE.Euler((rand()-.5)*.42,a+(rand()-.5)*.72,(rand()-.5)*.24);parts.push(cardGeometry(w,h,new THREE.Vector3(x,y,z),rot,.86+rand()*.14));}
  const merged=mergeGeometries(parts,false);for(const p of parts)p.dispose();merged.computeVertexNormals();return merged;
}
function createClusteredCrown({seed=1,shape='broad',clusters=7,cardsPerCluster=12}={}){
  const rand=seeded(seed),parts=[];for(let c=0;c<clusters;c++){const a=c/Math.max(1,clusters-1)*Math.PI*2+(rand()-.5)*.7,ring=shape==='narrow'?.5:.78,top=c>=clusters-2,center=top?new THREE.Vector3((rand()-.5)*.42,shape==='narrow'?1.02+.28*(c%2):.66+.3*(c%2),(rand()-.5)*.42):new THREE.Vector3(Math.cos(a)*ring,(c%3)*.28-.26,Math.sin(a)*ring);const cluster=createLeafCanopyGeometry({cards:cardsPerCluster,seed:seed+c*97,shape});cluster.scale(shape==='narrow'?.72:.76,shape==='narrow'?.85:.72,shape==='narrow'?.72:.76);cluster.translate(center.x,center.y,center.z);parts.push(cluster);}const merged=mergeGeometries(parts,false);for(const p of parts)p.dispose();merged.computeVertexNormals();return merged;
}
function createCrownHull({seed=1,shape='broad'}={}){
  const rand=seeded(seed),parts=[],count=shape==='narrow'?6:7;for(let i=0;i<count;i++){const g=new THREE.DodecahedronGeometry(1,1),top=i>=count-2,a=i/count*Math.PI*2+(rand()-.5)*.5,ring=shape==='narrow'?.42:.67,y=top?(shape==='narrow'?.86:.55)+(i%2)*.35:(i%3)*.22-.18;g.scale(shape==='narrow'?.63:.78,shape==='narrow'?.88:.66,shape==='narrow'?.63:.78);g.translate(top?(rand()-.5)*.25:Math.cos(a)*ring,y,top?(rand()-.5)*.25:Math.sin(a)*ring);const colors=[],shade=.88+rand()*.12;for(let v=0;v<g.attributes.position.count;v++)colors.push(.7*shade,.9*shade,.58*shade);g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));parts.push(g);}const merged=mergeGeometries(parts,false);for(const p of parts)p.dispose();merged.computeVertexNormals();return merged;
}
function createConiferCrown({layers=8,segments=10,far=false}={}){
  const parts=[];for(let i=0;i<layers;i++){const t=i/Math.max(1,layers-1),radius=(1.35-t*.86)*(far?.88:1)*(1+(i%2?-.04:.05)),height=.42+(1-t)*.16,g=new THREE.ConeGeometry(radius,height,segments,1,true);g.translate(0,.7+i*.49,0);const colors=[],shade=.82+t*.12;for(let v=0;v<g.attributes.position.count;v++)colors.push(.62*shade,.84*shade,.52*shade);g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));parts.push(g);}const tip=new THREE.ConeGeometry(.38,.8,segments,1,true);tip.translate(0,.7+layers*.49,0);parts.push(tip);const merged=mergeGeometries(parts,false);for(const p of parts)p.dispose();merged.computeVertexNormals();return merged;
}

export function createTreeSpeciesLibrary(){
  return[
    {id:'frontier-oak',trunk:createBranchedTrunkGeometry({height:5.0,baseRadius:.44,topRadius:.16,branchScale:1.08,style:'oak'}),nearCrown:createClusteredCrown({seed:31,shape:'broad',clusters:8,cardsPerCluster:13}),farCrown:createCrownHull({seed:31,shape:'broad'}),trunkMaterial:makeBarkMaterial(PALETTES.oak.bark),nearMaterial:makeLeafMaterial(PALETTES.oak.leaf,{shape:'round'}),farMaterial:makeFarLeafMaterial(PALETTES.oak.leaf),crownY:4.15,baseScale:[.9,1.13]},
    {id:'silver-ash',trunk:createBranchedTrunkGeometry({height:5.65,baseRadius:.32,topRadius:.11,branchScale:.94,style:'ash'}),nearCrown:createClusteredCrown({seed:71,shape:'narrow',clusters:7,cardsPerCluster:12}),farCrown:createCrownHull({seed:71,shape:'narrow'}),trunkMaterial:makeBarkMaterial(PALETTES.ash.bark),nearMaterial:makeLeafMaterial(PALETTES.ash.leaf,{shape:'oval'}),farMaterial:makeFarLeafMaterial(PALETTES.ash.leaf),crownY:4.72,baseScale:[.84,1.1]},
    {id:'ashen-pine',trunk:createBranchedTrunkGeometry({height:6.2,baseRadius:.33,topRadius:.09,branchScale:.35,style:'ash'}),nearCrown:createConiferCrown({layers:9,segments:12}),farCrown:createConiferCrown({layers:6,segments:8,far:true}),trunkMaterial:makeBarkMaterial(PALETTES.pine.bark),nearMaterial:makeFarLeafMaterial(PALETTES.pine.leaf),farMaterial:makeFarLeafMaterial([0x607c45,0x3b5933,0x263e2b]),crownY:1.28,baseScale:[.9,1.14]}
  ];
}

export function createGrassClumpGeometry({blades=10,height=.5,width=.055}={}){const parts=[];for(let b=0;b<blades;b++){const rows=4,verts=[],idx=[],angle=b/blades*Math.PI*2+.19*(b%3),h=height*(.78+(b%4)*.09),w=width*(.78+(b%3)*.16);for(let r=0;r<=rows;r++){const t=r/rows,bend=t*t*(.08+(b%2)*.035),bladeW=w*(1-t*.9);for(const side of[-1,1]){const lx=side*bladeW,lz=bend,x=lx*Math.cos(angle)+lz*Math.sin(angle),z=-lx*Math.sin(angle)+lz*Math.cos(angle);verts.push(x,t*h,z);}}for(let r=0;r<rows;r++){const a=r*2,b0=a+1,c=a+2,d=a+3;idx.push(a,c,b0,b0,c,d);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(idx);g.computeVertexNormals();parts.push(g);}const merged=mergeGeometries(parts,false);for(const p of parts)p.dispose();return merged;}
export function createFernGeometry(){const parts=[];for(let i=0;i<9;i++){const angle=i/9*Math.PI*2,h=.22+(i%3)*.04,g=new THREE.PlaneGeometry(.18,.65,1,4);g.translate(0,.3,0);g.rotateX(-.7);g.rotateY(angle);g.translate(0,h*.14,0);parts.push(g);}const merged=mergeGeometries(parts,false);for(const p of parts)p.dispose();merged.computeVertexNormals();return merged;}
export function createBroadleafGroundGeometry(){const parts=[];for(let i=0;i<7;i++){const a=i/7*Math.PI*2,g=new THREE.PlaneGeometry(.26,.48,1,2);g.translate(0,.22,0);g.rotateX(-.47);g.rotateY(a);g.translate(Math.cos(a)*.08,.02,Math.sin(a)*.08);parts.push(g);}const merged=mergeGeometries(parts,false);for(const p of parts)p.dispose();merged.computeVertexNormals();return merged;}
export function createFlowerGeometry(){const stem=new THREE.CylinderGeometry(.013,.017,.3,5);stem.translate(0,.15,0);const parts=[stem];for(let i=0;i<6;i++){const a=i/6*Math.PI*2,p=new THREE.CircleGeometry(.065,7);p.rotateX(-Math.PI/2);p.translate(Math.cos(a)*.055,.31,Math.sin(a)*.055);parts.push(p);}const merged=mergeGeometries(parts,false);for(const p of parts)p.dispose();merged.computeVertexNormals();return merged;}
