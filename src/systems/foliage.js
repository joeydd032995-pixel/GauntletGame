import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function leafTexture(){
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.clearRect(0,0,128,128);
  const g=x.createRadialGradient(54,42,5,64,64,58);g.addColorStop(0,'rgba(132,181,105,1)');g.addColorStop(.45,'rgba(76,132,76,1)');g.addColorStop(.88,'rgba(37,83,49,1)');g.addColorStop(1,'rgba(20,52,31,0)');
  x.fillStyle=g;x.beginPath();x.moveTo(64,6);x.bezierCurveTo(109,22,119,59,64,119);x.bezierCurveTo(9,59,19,22,64,6);x.fill();
  x.strokeStyle='rgba(186,214,148,.55)';x.lineWidth=2;x.beginPath();x.moveTo(64,17);x.lineTo(64,108);x.stroke();
  for(let i=0;i<7;i++){const y=30+i*10;x.strokeStyle='rgba(171,207,139,.25)';x.lineWidth=1;x.beginPath();x.moveTo(64,y);x.lineTo(42-i*.7,y+11);x.moveTo(64,y);x.lineTo(86+i*.7,y+11);x.stroke();}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}

export function createLeafMaterial(){
  return new THREE.MeshPhysicalMaterial({map:leafTexture(),transparent:false,alphaTest:.36,side:THREE.DoubleSide,roughness:.74,metalness:0,envMapIntensity:.24,color:0xc4ddb0,vertexColors:true});
}

export function createLeafCanopyGeometry({cards=46,seed=17}={}){
  let s=seed;const rand=()=>((s=(s*48271)%2147483647)/2147483647);const parts=[];
  for(let i=0;i<cards;i++){
    const a=rand()*Math.PI*2,y=(rand()-.38)*2.0,r=Math.sqrt(rand())*(1.05-Math.abs(y)*.17),x=Math.cos(a)*r,z=Math.sin(a)*r;
    const w=.62+rand()*.52,h=.68+rand()*.62,plane=new THREE.PlaneGeometry(w,h,1,1);plane.translate(0,h*.16,0);
    const q=new THREE.Quaternion().setFromEuler(new THREE.Euler((rand()-.5)*.55,a+(rand()-.5)*.75,(rand()-.5)*.35));const scale=.75+rand()*.5;plane.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),q,new THREE.Vector3(scale,scale,scale)));
    const colors=[];const shade=.72+rand()*.28;for(let v=0;v<plane.attributes.position.count;v++)colors.push(.62*shade,.88*shade,.57*shade);plane.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));parts.push(plane);
  }
  const merged=mergeGeometries(parts,false);for(const p of parts)p.dispose();merged.computeVertexNormals();return merged;
}

export function createBranchedTrunkGeometry(){
  const parts=[],main=new THREE.CylinderGeometry(.18,.4,4.6,10);parts.push(main);
  const branches=[[-.7,2.3,.1,-.7,.38],[.75,2.65,.15,.72,-.5],[-.5,3.2,-.12,-.48,-.7],[.42,3.5,.2,.45,.72]];
  for(const [x,y,z,rz,ry] of branches){const g=new THREE.CylinderGeometry(.065,.12,1.55,8);g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x*.42,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,ry,rz)),new THREE.Vector3(1,1,1)));parts.push(g);}
  const merged=mergeGeometries(parts,false);for(const p of parts)p.dispose();merged.computeVertexNormals();return merged;
}
