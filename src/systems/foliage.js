import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const PALETTES={
  oak:{leaf:[0x829a48,0x536f35,0x314a2b],bark:[0x735039,0x493326]},
  ash:{leaf:[0x6f8f53,0x466b42,0x294a37],bark:[0x7a6a55,0x4c4438]},
  pine:{leaf:[0x5b7840,0x38572f,0x223d2a],bark:[0x694934,0x3e2d24]}
};

function seeded(seed=17){let s=seed||17;return()=>((s=(s*48271)%2147483647)/2147483647);}
function colorCss(hex,a=1){const c=new THREE.Color(hex);return`rgba(${Math.round(c.r*255)},${Math.round(c.g*255)},${Math.round(c.b*255)},${a})`;}

function leafTexture({light,mid,dark,shape='oval'}={}){
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.clearRect(0,0,128,128);
  const g=x.createRadialGradient(50,36,4,64,64,61);g.addColorStop(0,colorCss(light));g.addColorStop(.48,colorCss(mid));g.addColorStop(.88,colorCss(dark));g.addColorStop(1,colorCss(dark,0));x.fillStyle=g;
  x.beginPath();
  if(shape==='round'){x.moveTo(64,7);x.bezierCurveTo(112,9,126,49,104,86);x.bezierCurveTo(87,116,41,124,19,88);x.bezierCurveTo(-2,52,19,13,64,7);}
  else{x.moveTo(64,5);x.bezierCurveTo(109,20,118,58,64,120);x.bezierCurveTo(10,58,19,20,64,5);}
  x.closePath();x.fill();
  x.strokeStyle=colorCss(light,.48);x.lineWidth=2;x.beginPath();x.moveTo(64,15);x.lineTo(64,109);x.stroke();
  for(let i=0;i<6;i++){const y=29+i*12;x.strokeStyle=colorCss(light,.2);x.lineWidth=1;x.beginPath();x.moveTo(64,y);x.lineTo(43-i*.6,y+10);x.moveTo(64,y);x.lineTo(85+i*.6,y+10);x.stroke();}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;t.generateMipmaps=true;return t;
}

function makeLeafMaterial(palette,{shape='oval',alphaTest=.4}={}){
  return new THREE.MeshStandardMaterial({map:leafTexture({light:palette[0],mid:palette[1],dark:palette[2],shape}),alphaTest,transparent:false,side:THREE.DoubleSide,roughness:.86,metalness:0,color:0xffffff,vertexColors:true,envMapIntensity:.18});
}
function makeFarLeafMaterial(palette){return new THREE.MeshStandardMaterial({color:palette[1],roughness:.9,metalness:0,vertexColors:true,flatShading:true,envMapIntensity:.14});}
function makeBarkMaterial(palette){
  const c=document.createElement('canvas');c.width=c.height=96;const x=c.getContext('2d');x.fillStyle=colorCss(palette[0]);x.fillRect(0,0,96,96);for(let i=0;i<26;i++){const px=(i*37)%96,w=2+(i%4),y=(i*19)%96;x.fillStyle=colorCss(i%3?palette[1]:palette[0],.55);x.fillRect(px,y,w,14+(i%6)*5);}for(let i=0;i<18;i++){x.strokeStyle=colorCss(palette[1],.35);x.beginPath();x.moveTo((i*29)%96,0);x.lineTo(((i*29)+9)%96,96);x.stroke();}
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(2.4,5.8);map.anisotropy=4;return new THREE.MeshStandardMaterial({map,color:0xffffff,roughness:.94,metalness:0,envMapIntensity:.12});
}

function addBranch(parts,{length=.9,r0=.11,r1=.045,position=[0,2,0],rotation=[0,0,.7],radial=7}){
  const g=new THREE.CylinderGeometry(r1,r0,length,radial,1,false);g.translate(0,length*.5,0);g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...position),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(1,1,1)));parts.push(g);
}
export function createBranchedTrunkGeometry({height=4.8,baseRadius=.4,topRadius=.16,branchScale=1,style='oak'}={}){
  const parts=[],main=new THREE.CylinderGeometry(topRadius,baseRadius,height,style==='ash'?9:10,3,false);main.translate(0,height*.5,0);parts.push(main);
  const defs=style==='ash'?
    [[-.05,2.2,0,0,.35,.78],[.08,2.75,.02,0,-.5,-.74],[-.04,3.25,.02,0,.82,.56],[.03,3.65,-.02,0,-.82,-.52],[0,4.0,0,0,.25,.7]]:
    [[0,2.05,.02,0,.18,.86],[0,2.45,-.02,0,-.74,-.78],[0,2.85,.03,0,1.1,.7],[0,3.25,-.02,0,-1.35,-.62],[0,3.55,.02,0,.52,.58],[0,3.85,0,0,-.34,-.54]];
  for(let i=0;i<defs.length;i++){const[x,y,z,rx,ry,rz]=defs[i],a=i/defs.length*Math.PI*2,reach=(.82+(i%3)*.13)*branchScale;addBranch(parts,{length:reach,r0:.11*branchScale,r1:.04*branchScale,position:[x+Math.cos(a)*.07,y,z+Math.sin(a)*.07],rotation:[rx,ry+a,rz],radial:7});}
  const merged=mergeGeometries(parts,false);for(const p of parts)p.dispose();merged.computeVertexNormals();return merged;
}

function cardGeometry(w,h,position,rotation,shade){
  const plane=new THREE.PlaneGeometry(w,h,1,1);plane.translate(0,h*.13,0);plane.applyMatrix4(new THREE.Matrix4().compose(position,new THREE.Quaternion().setFromEuler(rotation),new THREE.Vector3(1,1,1)));const c=[];for(let v=0;v<plane.attributes.position.count;v++)c.push(.66*shade,.9*shade,.6*shade);plane.setAttribute('color',new THREE.Float32BufferAttribute(c,3));return plane;
}
export function createLeafCanopyGeometry({cards=48,seed=17,shape='broad'}={}){
  const rand=seeded(seed),parts=[];for(let i=0;i<cards;i++){const a=rand()*Math.PI*2,y=(rand()-.42)*(shape==='narrow'?2.7:2.1),r=Math.sqrt(rand())*((shape==='narrow'?0.88:1.2)-Math.abs(y)*(shape==='narrow'?.09:.17)),x=Math.cos(a)*r,z=Math.sin(a)*r,w=(shape==='narrow'?.46:.6)+rand()*(shape==='narrow'?.38:.5),h=(shape==='narrow'?.62:.7)+rand()*(shape==='narrow'?.48:.58),rot=new THREE.Euler((rand()-.5)*.48,a+(rand()-.5)*.68,(rand()-.5)*.28);parts.push(cardGeometry(w,h,new THREE.Vector3(x,y,z),rot,.74+rand()*.26));}
  const merged=mergeGeometries(parts,false);for(const p of parts)p.dispose();merged.computeVertexNormals();return merged;
}
function createClusteredCrown({seed=1,shape='broad',clusters=5,cardsPerCluster=12}={}){
  const rand=seeded(seed),parts=[];for(let c=0;c<clusters;c++){const a=c/clusters*Math.PI*2+(rand()-.5)*.5,ring=shape==='narrow'?.5:.72,center=new THREE.Vector3(Math.cos(a)*ring,(c%2)*.42-.12,Math.sin(a)*ring);if(c===clusters-1)center.set(0,shape==='narrow'?1.12:.72,0);const cluster=createLeafCanopyGeometry({cards:cardsPerCluster,seed:seed+c*97,shape});cluster.scale(shape==='narrow'?.78:.82,shape==='narrow'?.92:.78,shape==='narrow'?.78:.82);cluster.translate(center.x,center.y,center.z);parts.push(cluster);}const merged=mergeGeometries(parts,false);for(const p of parts)p.dispose();merged.computeVertexNormals();return merged;
}
function createCrownHull({seed=1,shape='broad'}={}){const rand=seeded(seed),parts=[],count=shape==='narrow'?4:5;for(let i=0;i<count;i++){const g=new THREE.IcosahedronGeometry(1,1),a=i/count*Math.PI*2,ring=shape==='narrow'?.38:.62,y=i===count-1?(shape==='narrow'?1.0:.62):(i%2)*.32-.12;g.scale(shape==='narrow'?.72:.9,shape==='narrow'?1.18:.76,shape==='narrow'?.72:.9);g.translate(i===count-1?0:Math.cos(a)*ring,y,i===count-1?0:Math.sin(a)*ring);const colors=[];const shade=.74+rand()*.22;for(let v=0;v<g.attributes.position.count;v++)colors.push(.55*shade,.78*shade,.46*shade);g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));parts.push(g);}const merged=mergeGeometries(parts,false);for(const p of parts)p.dispose();merged.computeVertexNormals();return merged;}
function createConiferCrown({layers=5,segments=9,far=false}={}){const parts=[];for(let i=0;i<layers;i++){const t=i/Math.max(1,layers-1),radius=(1.28-t*.78)*(far?.88:1),height=.95+(1-t)*.35,g=new THREE.ConeGeometry(radius,height,segments,1,false);g.translate(0,i*.72,0);const colors=[];const shade=.68+t*.18;for(let v=0;v<g.attributes.position.count;v++)colors.push(.48*shade,.72*shade,.42*shade);g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));parts.push(g);}const merged=mergeGeometries(parts,false);for(const p of parts)p.dispose();merged.computeVertexNormals();return merged;}

export function createTreeSpeciesLibrary(){
  return[
    {id:'frontier-oak',trunk:createBranchedTrunkGeometry({height:4.8,baseRadius:.43,topRadius:.17,branchScale:1.08,style:'oak'}),nearCrown:createClusteredCrown({seed:31,shape:'broad',clusters:6,cardsPerCluster:11}),farCrown:createCrownHull({seed:31,shape:'broad'}),trunkMaterial:makeBarkMaterial(PALETTES.oak.bark),nearMaterial:makeLeafMaterial(PALETTES.oak.leaf,{shape:'round',alphaTest:.38}),farMaterial:makeFarLeafMaterial(PALETTES.oak.leaf),crownY:4.25,baseScale:[.88,1.08]},
    {id:'silver-ash',trunk:createBranchedTrunkGeometry({height:5.45,baseRadius:.31,topRadius:.12,branchScale:.9,style:'ash'}),nearCrown:createClusteredCrown({seed:71,shape:'narrow',clusters:5,cardsPerCluster:10}),farCrown:createCrownHull({seed:71,shape:'narrow'}),trunkMaterial:makeBarkMaterial(PALETTES.ash.bark),nearMaterial:makeLeafMaterial(PALETTES.ash.leaf,{shape:'oval',alphaTest:.4}),farMaterial:makeFarLeafMaterial(PALETTES.ash.leaf),crownY:4.7,baseScale:[.82,1.08]},
    {id:'ashen-pine',trunk:createBranchedTrunkGeometry({height:5.7,baseRadius:.34,topRadius:.1,branchScale:.45,style:'ash'}),nearCrown:createConiferCrown({layers:6,segments:10}),farCrown:createConiferCrown({layers:4,segments:7,far:true}),trunkMaterial:makeBarkMaterial(PALETTES.pine.bark),nearMaterial:makeFarLeafMaterial(PALETTES.pine.leaf),farMaterial:makeFarLeafMaterial([0x506a3b,0x304a2d,0x203728]),crownY:3.15,baseScale:[.9,1.14]}
  ];
}

export function createGrassClumpGeometry({blades=8,height=.48,width=.055}={}){const parts=[];for(let b=0;b<blades;b++){const rows=4,verts=[],idx=[],angle=b/blades*Math.PI*2+.19*(b%3),h=height*(.78+(b%4)*.09),w=width*(.78+(b%3)*.16);for(let r=0;r<=rows;r++){const t=r/rows,bend=t*t*(.08+(b%2)*.035),bladeW=w*(1-t*.9);for(const side of[-1,1]){const lx=side*bladeW,lz=bend,x=lx*Math.cos(angle)+lz*Math.sin(angle),z=-lx*Math.sin(angle)+lz*Math.cos(angle);verts.push(x,t*h,z);}}for(let r=0;r<rows;r++){const a=r*2,b0=a+1,c=a+2,d=a+3;idx.push(a,c,b0,b0,c,d);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(idx);g.computeVertexNormals();parts.push(g);}const merged=mergeGeometries(parts,false);for(const p of parts)p.dispose();return merged;}
export function createFernGeometry(){const parts=[];for(let i=0;i<7;i++){const angle=i/7*Math.PI*2,h=.22+(i%3)*.04,g=new THREE.PlaneGeometry(.16,.58,1,4);g.translate(0,.27,0);g.rotateX(-.78);g.rotateY(angle);g.translate(0,h*.15,0);parts.push(g);}const merged=mergeGeometries(parts,false);for(const p of parts)p.dispose();merged.computeVertexNormals();return merged;}
export function createBroadleafGroundGeometry(){const parts=[];for(let i=0;i<5;i++){const a=i/5*Math.PI*2,g=new THREE.PlaneGeometry(.24,.42,1,2);g.translate(0,.2,0);g.rotateX(-.5);g.rotateY(a);g.translate(Math.cos(a)*.08,.02,Math.sin(a)*.08);parts.push(g);}const merged=mergeGeometries(parts,false);for(const p of parts)p.dispose();merged.computeVertexNormals();return merged;}
export function createFlowerGeometry(){const stem=new THREE.CylinderGeometry(.012,.016,.28,5);stem.translate(0,.14,0);const parts=[stem];for(let i=0;i<5;i++){const a=i/5*Math.PI*2,p=new THREE.CircleGeometry(.06,6,0,Math.PI*2);p.rotateX(-Math.PI/2);p.translate(Math.cos(a)*.05,.29,Math.sin(a)*.05);parts.push(p);}const merged=mergeGeometries(parts,false);for(const p of parts)p.dispose();merged.computeVertexNormals();return merged;}
