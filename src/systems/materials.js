import * as THREE from 'three';

const cache=new Map();
function rand2(x,y,seed){let h=(x*374761393+y*668265263+seed*1442695041)|0;h=(h^(h>>>13))*1274126177;return((h^(h>>>16))>>>0)/4294967295;}
function smoothNoise(x,y,seed){const x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);const a=rand2(x0,y0,seed),b=rand2(x0+1,y0,seed),c=rand2(x0,y0+1,seed),d=rand2(x0+1,y0+1,seed);return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a,b,sx),THREE.MathUtils.lerp(c,d,sx),sy);}
function fbm(x,y,seed){let v=0,a=.55,f=1;for(let i=0;i<4;i++){v+=a*smoothNoise(x*f,y*f,seed+i*31);f*=2.07;a*=.47;}return v;}

function makeMaps(key,{base=0x808080,secondary=0x505050,seed=1,size=128,frequency=.08,roughness=.75,roughVariation=.18,normalStrength=2.5,repeat=3}){
  if(cache.has(key))return cache.get(key);
  const baseC=new THREE.Color(base),secondC=new THREE.Color(secondary),heights=new Float32Array(size*size);
  const color=document.createElement('canvas'),normal=document.createElement('canvas'),rough=document.createElement('canvas');for(const c of [color,normal,rough])c.width=c.height=size;
  const cc=color.getContext('2d'),nc=normal.getContext('2d'),rc=rough.getContext('2d'),ci=cc.createImageData(size,size),ni=nc.createImageData(size,size),ri=rc.createImageData(size,size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=y*size+x,n=fbm(x*frequency,y*frequency,seed),grain=rand2(x,y,seed+91),vein=Math.sin((x*.09+y*.035)+n*5)*.5+.5,h=THREE.MathUtils.clamp(n*.76+grain*.12+vein*.12,0,1);heights[i]=h;const mix=THREE.MathUtils.smoothstep(h,.28,.82),c=baseC.clone().lerp(secondC,mix*.55);const lum=.88+grain*.12;const j=i*4;ci.data[j]=Math.round(THREE.MathUtils.clamp(c.r*lum,0,1)*255);ci.data[j+1]=Math.round(THREE.MathUtils.clamp(c.g*lum,0,1)*255);ci.data[j+2]=Math.round(THREE.MathUtils.clamp(c.b*lum,0,1)*255);ci.data[j+3]=255;const rv=THREE.MathUtils.clamp(roughness+(h-.5)*roughVariation+(grain-.5)*.06,0,1);ri.data[j]=ri.data[j+1]=ri.data[j+2]=Math.round(rv*255);ri.data[j+3]=255;}
  const at=(x,y)=>heights[((y+size)%size)*size+((x+size)%size)];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const dx=(at(x+1,y)-at(x-1,y))*normalStrength,dy=(at(x,y+1)-at(x,y-1))*normalStrength,norm=new THREE.Vector3(-dx,-dy,1).normalize(),j=(y*size+x)*4;ni.data[j]=Math.round((norm.x*.5+.5)*255);ni.data[j+1]=Math.round((norm.y*.5+.5)*255);ni.data[j+2]=Math.round((norm.z*.5+.5)*255);ni.data[j+3]=255;}
  cc.putImageData(ci,0,0);nc.putImageData(ni,0,0);rc.putImageData(ri,0,0);
  const map=new THREE.CanvasTexture(color),normalMap=new THREE.CanvasTexture(normal),roughnessMap=new THREE.CanvasTexture(rough);map.colorSpace=THREE.SRGBColorSpace;
  for(const t of [map,normalMap,roughnessMap]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat,repeat);t.anisotropy=4;}
  const result={map,normalMap,roughnessMap};cache.set(key,result);return result;
}

export function physicalSurface(key,opts={}){
  const maps=makeMaps(key,opts);return new THREE.MeshPhysicalMaterial({map:maps.map,normalMap:maps.normalMap,roughnessMap:maps.roughnessMap,normalScale:new THREE.Vector2(opts.normalScale??.75,opts.normalScale??.75),color:opts.tint??0xffffff,metalness:opts.metalness??0,roughness:opts.roughness??.75,clearcoat:opts.clearcoat??0,clearcoatRoughness:opts.clearcoatRoughness??.5,envMapIntensity:opts.envMapIntensity??.45,side:opts.side??THREE.FrontSide,emissive:opts.emissive??0x000000,emissiveIntensity:opts.emissiveIntensity??0});
}

export const makeStoneMaterial=()=>physicalSurface('stone',{base:0x9a9e97,secondary:0x515d5b,seed:29,frequency:.07,roughness:.82,roughVariation:.18,normalStrength:3.2,repeat:2.2,normalScale:.8,metalness:.025,clearcoat:.025});
export const makeBarkMaterial=()=>physicalSurface('bark',{base:0x744d36,secondary:0x302018,seed:47,frequency:.12,roughness:.9,roughVariation:.08,normalStrength:4.1,repeat:2.8,normalScale:1.0});
export const makeFoliageMaterial=()=>physicalSurface('foliage-v2',{base:0x6a9a6e,secondary:0x285a3a,seed:73,frequency:.11,roughness:.74,roughVariation:.11,normalStrength:2.2,repeat:2.2,normalScale:.5,side:THREE.DoubleSide,emissive:0x07150a,emissiveIntensity:.08});
export const makeArmorMaterial=(variant='steel')=>variant==='gold'?physicalSurface('armor-gold',{base:0xc8a867,secondary:0x75603e,seed:101,frequency:.06,roughness:.24,roughVariation:.12,normalStrength:1.2,repeat:3,normalScale:.32,metalness:.9,clearcoat:.18,clearcoatRoughness:.28,envMapIntensity:.72}):physicalSurface(`armor-${variant}`,{base:variant==='dark'?0x526d76:0x87a9b1,secondary:variant==='dark'?0x1c333d:0x405d68,seed:variant==='dark'?113:107,frequency:.055,roughness:.31,roughVariation:.12,normalStrength:1.4,repeat:3.2,normalScale:.36,metalness:.74,clearcoat:.12,clearcoatRoughness:.35,envMapIntensity:.66});
export const makeClothMaterial=()=>physicalSurface('cloth',{base:0x26657a,secondary:0x0e3343,seed:131,frequency:.2,roughness:.82,roughVariation:.08,normalStrength:1.8,repeat:5,normalScale:.42,side:THREE.DoubleSide,metalness:0});
export const makeCrystalMaterial=()=>physicalSurface('crystal',{base:0x9befff,secondary:0x31a9d2,seed:151,frequency:.05,roughness:.14,roughVariation:.1,normalStrength:1.2,repeat:1.5,normalScale:.24,metalness:.24,clearcoat:.42,clearcoatRoughness:.12,emissive:0x0f6d91,emissiveIntensity:1.8});
