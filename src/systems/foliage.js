import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const PALETTES={
  oak:{leaf:[0xa4b85e,0x708b43,0x405f31],bark:[0x815d40,0x4a3327]},
  ash:{leaf:[0x91ad69,0x5e824f,0x34583e],bark:[0x887760,0x51483c]},
  pine:{leaf:[0x789550,0x4c6f3a,0x2b4d31],bark:[0x76523a,0x422f25]}
};

function seeded(seed=17){let s=seed||17;return()=>((s=(s*48271)%2147483647)/2147483647);}
function colorCss(hex,a=1){const c=new THREE.Color(hex);return`rgba(${Math.round(c.r*255)},${Math.round(c.g*255)},${Math.round(c.b*255)},${a})`;}

function leafTexture({light,mid,dark,shape='oval'}={}){
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.clearRect(0,0,128,128);
  const g=x.createRadialGradient(48,31,3,63,61,61);g.addColorStop(0,colorCss(light));g.addColorStop(.48,colorCss(mid));g.addColorStop(.88,colorCss(dark));g.addColorStop(1,colorCss(dark,0));x.fillStyle=g;x.beginPath();
  if(shape==='round'){x.moveTo(64,5);x.bezierCurveTo(111,7,127,42,108,78);x.bezierCurveTo(95,111,48,127,19,92);x.bezierCurveTo(-5,61,12,14,64,5);}
  else{x.moveTo(64,4);x.bezierCurveTo(110,18,121,56,64,122);x.bezierCurveTo(8,57,18,18,64,4);}
  x.closePath();x.fill();x.strokeStyle=colorCss(light,.52);x.lineWidth=2;x.beginPath();x.moveTo(64,15);x.lineTo(64,110);x.stroke();
  for(let i=0;i<6;i++){const y=29+i*12;x.strokeStyle=colorCss(light,.22);x.lineWidth=1;x.beginPath();x.moveTo(64,y);x.lineTo(42-i*.55,y+10);x.moveTo(64,y);x.lineTo(86+i*.55,y+10);x.stroke();}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;t.generateMipmaps=true;return t;
}

function makeLeafMaterial(palette,{shape='oval',alphaTest=.29}={}){
  return new THREE.MeshStandardMaterial({map:leafTexture({light:palette[0],mid:palette[1],dark:palette[2],shape}),alphaTest,transparent:false,side:THREE.DoubleSide,roughness:.9,metalness:0,color:0xffffff,vertexColors:true,envMapIntensity:.14,emissive:palette[2],emissiveIntensity:.13});
}
function makeFarLeafMaterial(palette){return new THREE.MeshStandardMaterial({color:palette[1],roughness:.94,metalness:0,vertexColors:true,flatShading:true,envMapIntensity:.1,emissive:palette[2],emissiveIntensity:.08});}
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
  const merged=mergeGeometries(parts,false);for(const p of parts)p.dispose();if(!merged)throw new Error('Tree trunk geometry merge failed');merged.computeVertexNormals();return merged;
}

function cardGeometry(w,h,position,rotation,shade){
  const plane=new THREE.PlaneGeometry(w,h,1,1);plane.translate(0,h*.13,0);plane.applyMatrix4(new THREE.Matrix4().compose(position,new THREE.Quaternion().setFromEuler(rotation),new THREE.Vector3(1,1,1)));const c=[];for(let v=0;v<plane.attributes.position.count;v++)c.push(.86*shade,.98*shade,.8*shade);plane.setAttribute('color',new THREE.Float32BufferAttribute(c,3));return plane;
}
export function createLeafCanopyGeometry({cards=60,seed=17,shape='broad'}={}){
  const rand=seeded(seed),parts=[];for(let i=0;i<cards;i++){const a=rand()*Math.PI*2,y=(rand()-.43)*(shape==='narrow'?2.5:1.9),r=Math.max(.08,Math.sqrt(rand())*((shape==='narrow'?.88:1.18)-Math.abs(y)*(shape==='narrow'?.1:.18))),x=Math.cos(a)*r,z=Math.sin(a)*r,w=(shape==='narrow'?.42:.56)+rand()*(shape==='narrow'?.36:.46),h=(shape==='narrow'?.58:.64)+rand()*(shape==='narrow'?.43:.5),rot=new THREE.Euler((rand()-.5)*.42,a+(rand()-.5)*.72,(rand()-.5)*.24);parts.push(cardGeometry(w,h,new THREE.Vector3(x,y,z),rot,.86+rand()*.14));}
  const merged=mergeGeometries(parts,false);for(const p of parts)p.dispose();if(!merged)throw new Error('Leaf-card canopy geometry merge failed');merged.computeVertexNormals();return merged;
}
function createClusteredCrown({seed=1,shape='broad',clusters=7,cardsPerCluster=12}={}){
  const rand=seeded(seed),parts=[];for(let c=0;c<clusters;c++){const a=c/Math.max(1,clusters-1)*Math.PI*2+(rand()-.5)*.7,ring=shape==='narrow'?.5:.78,top=c>=clusters-2,center=top?new THREE.Vector3((rand()-.5)*.42,shape==='narrow'?1.02+.28*(c%2):.66+.3*(c%2),(rand()-.5)*.42):new THREE.Vector3(Math.cos(a)*ring,(c%3)*.28-.26,Math.sin(a)*ring);const cluster=createLeafCanopyGeometry({cards:cardsPerCluster,seed:seed+c*97,shape});cluster.scale(shape==='narrow'?.72:.76,shape==='narrow'?.85:.72,shape==='narrow'?.72:.76);cluster.translate(center.x,center.y,center.z);parts.push(cluster);}const merged=mergeGeometries(parts,false);for(const p of parts)p.dispose();if(!merged)throw new Error('Clustered crown geometry merge failed');merged.computeVertexNormals();return merged;
}
function createCrownHull({seed=1,shape='broad'}={}){
  const rand=seeded(seed),parts=[],count=shape==='narrow'?7:8;for(let i=0;i<count;i++){const g=new THREE.DodecahedronGeometry(1,1),top=i>=count-2,a=i/count*Math.PI*2+(rand()-.5)*.5,ring=shape==='narrow'?.42:.67,y=top?(shape==='narrow'?.86:.55)+(i%2)*.35:(i%3)*.22-.18;g.scale(shape==='narrow'?.63:.78,shape==='narrow'?.88:.66,shape==='narrow'?.63:.78);g.translate(top?(rand()-.5)*.25:Math.cos(a)*ring,y,top?(rand()-.5)*.25:Math.sin(a)*ring);const colors=[],shade=.88+rand()*.12;for(let v=0;v<g.attributes.position.count;v++)colors.push(.7*shade,.9*shade,.58*shade);g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));parts.push(g);}const merged=mergeGeometries(parts,false);for(const p of parts)p.dispose();if(!merged)throw new Error('Far crown hull geometry merge failed');merged.computeVertexNormals();return merged;
}

function prepareConiferPiece(g,shade=.9){
  if(g.attributes.uv)g.deleteAttribute('uv');
  if(!g.attributes.normal)g.computeVertexNormals();
  const colors=[];for(let v=0;v<g.attributes.position.count;v++)colors.push(.62*shade,.84*shade,.52*shade);g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return g;
}
function createConiferCrown({layers=8,segments=10,far=false}={}){
  const parts=[],whorls=far?4:6;
  for(let i=0;i<layers;i++){
    const t=i/Math.max(1,layers-1),radius=(1.26-t*.79)*(far?.9:1)*(1+(i%2?-.035:.055)),height=.36+(1-t)*.16,skirt=prepareConiferPiece(new THREE.ConeGeometry(radius,height,segments,1,true),.8+t*.13);skirt.translate(0,.72+i*.48,0);parts.push(skirt);
    if(!far&&i<layers-1){
      for(let b=0;b<whorls;b++){
        const a=b/whorls*Math.PI*2+(i%2)*.37,reach=radius*(.7+(b%2)*.12),spray=prepareConiferPiece(new THREE.ConeGeometry(.12+(1-t)*.055,reach,6,1,true),.78+t*.12);
        spray.rotateZ(Math.PI*.47);spray.rotateY(a);spray.translate(Math.cos(a)*radius*.48,.69+i*.48-.02,Math.sin(a)*radius*.48);parts.push(spray);
      }
    }
  }
  const tip=prepareConiferPiece(new THREE.ConeGeometry(.31,.78,segments,1,true),.94);tip.translate(0,.72+layers*.48,0);parts.push(tip);
  const merged=mergeGeometries(parts,false);for(const p of parts)p.dispose();if(!merged)throw new Error('Conifer crown geometry merge failed');merged.computeVertexNormals();return merged;
}

export function createTreeSpeciesLibrary(){
  return[
    {id:'frontier-oak',trunk:createBranchedTrunkGeometry({height:5.0,baseRadius:.44,topRadius:.16,branchScale:1.08,style:'oak'}),nearCrown:createClusteredCrown({seed:31,shape:'broad',clusters:10,cardsPerCluster:16}),farCrown:createCrownHull({seed:31,shape:'broad'}),trunkMaterial:makeBarkMaterial(PALETTES.oak.bark),nearMaterial:makeLeafMaterial(PALETTES.oak.leaf,{shape:'round'}),farMaterial:makeFarLeafMaterial(PALETTES.oak.leaf),crownY:4.15,baseScale:[.9,1.13]},
    {id:'silver-ash',trunk:createBranchedTrunkGeometry({height:5.65,baseRadius:.32,topRadius:.11,branchScale:.94,style:'ash'}),nearCrown:createClusteredCrown({seed:71,shape:'narrow',clusters:9,cardsPerCluster:15}),farCrown:createCrownHull({seed:71,shape:'narrow'}),trunkMaterial:makeBarkMaterial(PALETTES.ash.bark),nearMaterial:makeLeafMaterial(PALETTES.ash.leaf,{shape:'oval'}),farMaterial:makeFarLeafMaterial(PALETTES.ash.leaf),crownY:4.72,baseScale:[.84,1.1]},
    {id:'ashen-pine',trunk:createBranchedTrunkGeometry({height:6.2,baseRadius:.33,topRadius:.09,branchScale:.35,style:'ash'}),nearCrown:createConiferCrown({layers:9,segments:12}),farCrown:createConiferCrown({layers:6,segments:8,far:true}),trunkMaterial:makeBarkMaterial(PALETTES.pine.bark),nearMaterial:makeFarLeafMaterial(PALETTES.pine.leaf),farMaterial:makeFarLeafMaterial([0x607c45,0x3b5933,0x263e2b]),crownY:1.28,baseScale:[.9,1.14]}
  ];
}

export function createGrassClumpGeometry({blades=10,height=.5,width=.055}={}){const parts=[];for(let b=0;b<blades;b++){const rows=4,verts=[],idx=[],angle=b/blades*Math.PI*2+.19*(b%3),h=height*(.78+(b%4)*.09),w=width*(.78+(b%3)*.16);for(let r=0;r<=rows;r++){const t=r/rows,bend=t*t*(.08+(b%2)*.035),bladeW=w*(1-t*.9);for(const side of[-1,1]){const lx=side*bladeW,lz=bend,x=lx*Math.cos(angle)+lz*Math.sin(angle),z=-lx*Math.sin(angle)+lz*Math.cos(angle);verts.push(x,t*h,z);}}for(let r=0;r<rows;r++){const a=r*2,b0=a+1,c=a+2,d=a+3;idx.push(a,c,b0,b0,c,d);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(idx);g.computeVertexNormals();parts.push(g);}const merged=mergeGeometries(parts,false);for(const p of parts)p.dispose();if(!merged)throw new Error('Grass clump geometry merge failed');return merged;}
export function createFernGeometry(){
  const parts=[],fronds=8;for(let f=0;f<fronds;f++){const a=f/fronds*Math.PI*2+(f%2)*.16;for(let j=0;j<5;j++){const t=(j+1)/6,y=.05+t*.24,r=.07+t*.23,w=.11*(1-t*.45),h=.22*(1-t*.28);for(const side of[-1,1]){const p=new THREE.PlaneGeometry(w,h,1,1);p.translate(0,h*.45,0);p.rotateX(-.64+t*.22);p.rotateZ(side*(.48-.14*t));p.rotateY(a);p.translate(Math.cos(a)*r,y,Math.sin(a)*r);parts.push(p);}}const tip=new THREE.PlaneGeometry(.11,.3,1,1);tip.translate(0,.13,0);tip.rotateX(-.45);tip.rotateY(a);tip.translate(Math.cos(a)*.34,.28,Math.sin(a)*.34);parts.push(tip);}const merged=mergeGeometries(parts,false);for(const p of parts)p.dispose();if(!merged)throw new Error('Fern geometry merge failed');merged.computeVertexNormals();return merged;
}
export function createBroadleafGroundGeometry(){const parts=[];for(let i=0;i<8;i++){const a=i/8*Math.PI*2,g=new THREE.PlaneGeometry(.27,.5,1,2);g.translate(0,.23,0);g.rotateX(-.47+(i%2)*.08);g.rotateY(a);g.translate(Math.cos(a)*.09,.02,Math.sin(a)*.09);parts.push(g);}const merged=mergeGeometries(parts,false);for(const p of parts)p.dispose();if(!merged)throw new Error('Broadleaf ground geometry merge failed');merged.computeVertexNormals();return merged;}
export function createFlowerGeometry(){const stem=new THREE.CylinderGeometry(.013,.017,.3,5);stem.translate(0,.15,0);const parts=[stem];for(let i=0;i<6;i++){const a=i/6*Math.PI*2,p=new THREE.CircleGeometry(.065,7);p.rotateX(-Math.PI/2);p.translate(Math.cos(a)*.055,.31,Math.sin(a)*.055);parts.push(p);}const merged=mergeGeometries(parts,false);for(const p of parts)p.dispose();if(!merged)throw new Error('Flower geometry merge failed');merged.computeVertexNormals();return merged;}
