import * as THREE from 'three';

function hash(x,y,seed=19){let h=(x*374761393+y*668265263+seed*69069)|0;h=(h^(h>>>13))*1274126177;return((h^(h>>>16))>>>0)/4294967295;}
function fbm(x,y){let v=0,a=.5,f=1;for(let i=0;i<5;i++){v+=a*hash(Math.floor(x*f),Math.floor(y*f),i*37+11);f*=2.03;a*=.5;}return v;}

function makeSurfaceTextures(size=256){
  const color=document.createElement('canvas'),height=document.createElement('canvas'),normal=document.createElement('canvas'),rough=document.createElement('canvas');for(const c of [color,height,normal,rough])c.width=c.height=size;
  const cc=color.getContext('2d'),hc=height.getContext('2d'),nc=normal.getContext('2d'),rc=rough.getContext('2d'),ci=cc.createImageData(size,size),hi=hc.createImageData(size,size),ni=nc.createImageData(size,size),ri=rc.createImageData(size,size),heights=new Float32Array(size*size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=y*size+x,n=fbm(x*.09,y*.09),m=fbm(x*.018+71,y*.018-33),grain=hash(x,y,91),h=THREE.MathUtils.clamp(n*.82+m*.1+grain*.08,0,1),j=i*4;heights[i]=h;const neutral=Math.round(THREE.MathUtils.clamp(184+(n-.5)*34+(m-.5)*16+(grain-.5)*9,146,218));ci.data[j]=neutral;ci.data[j+1]=neutral+2;ci.data[j+2]=neutral-4;ci.data[j+3]=255;const hv=Math.round(h*255);hi.data[j]=hi.data[j+1]=hi.data[j+2]=hv;hi.data[j+3]=255;const rv=Math.round(THREE.MathUtils.clamp(.74+n*.14+grain*.05,0,1)*255);ri.data[j]=ri.data[j+1]=ri.data[j+2]=rv;ri.data[j+3]=255;}
  const at=(x,y)=>heights[((y+size)%size)*size+((x+size)%size)];for(let y=0;y<size;y++)for(let x=0;x<size;x++){const dx=(at(x+1,y)-at(x-1,y))*2.7,dy=(at(x,y+1)-at(x,y-1))*2.7,n=new THREE.Vector3(-dx,-dy,1).normalize(),j=(y*size+x)*4;ni.data[j]=Math.round((n.x*.5+.5)*255);ni.data[j+1]=Math.round((n.y*.5+.5)*255);ni.data[j+2]=Math.round((n.z*.5+.5)*255);ni.data[j+3]=255;}
  cc.putImageData(ci,0,0);hc.putImageData(hi,0,0);nc.putImageData(ni,0,0);rc.putImageData(ri,0,0);
  const map=new THREE.CanvasTexture(color),bump=new THREE.CanvasTexture(height),normalMap=new THREE.CanvasTexture(normal),roughness=new THREE.CanvasTexture(rough);for(const t of [map,bump,normalMap,roughness]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(24,24);t.anisotropy=8;}map.colorSpace=THREE.SRGBColorSpace;return{map,bump,normalMap,roughness};
}

export function createLayeredTerrain({size=220,segments=160,heightFn}){
  const actualSegments=Math.min(segments,144),geo=new THREE.PlaneGeometry(size,size,actualSegments,actualSegments);geo.rotateX(-Math.PI/2);const p=geo.attributes.position;
  for(let i=0;i<p.count;i++)p.setY(i,heightFn(p.getX(i),p.getZ(i)));geo.computeVertexNormals();
  const n=geo.attributes.normal,colors=new Float32Array(p.count*3),cGrass=new THREE.Color(0x536a49),cDirt=new THREE.Color(0x674b35),cRock=new THREE.Color(0x747a75),cMoss=new THREE.Color(0x34523b),tmp=new THREE.Color();
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),h=p.getY(i),slope=1-Math.max(0,n.getY(i)),macro=fbm(x*.11+120,z*.11-57),detail=fbm(x*.43,z*.43);const rock=THREE.MathUtils.smoothstep(slope+detail*.09,.38,.72),dirt=THREE.MathUtils.smoothstep(macro,.45,.7)*(1-rock),moss=THREE.MathUtils.smoothstep(1-slope,.55,.92)*THREE.MathUtils.smoothstep(macro,.52,.77)*(1-rock);tmp.copy(cGrass).lerp(cDirt,dirt).lerp(cMoss,moss*.62).lerp(cRock,rock);const heightShade=THREE.MathUtils.clamp(1+(h-1)*.01,.94,1.08);tmp.multiplyScalar(heightShade*(.9+macro*.16));colors[i*3]=tmp.r;colors[i*3+1]=tmp.g;colors[i*3+2]=tmp.b;}
  geo.setAttribute('color',new THREE.BufferAttribute(colors,3));const tex=makeSurfaceTextures();
  const material=new THREE.MeshPhysicalMaterial({map:tex.map,normalMap:tex.normalMap,normalScale:new THREE.Vector2(.62,.62),bumpMap:tex.bump,bumpScale:.035,roughnessMap:tex.roughness,roughness:.92,metalness:.008,vertexColors:true,clearcoat:.02,clearcoatRoughness:.8,envMapIntensity:.28});
  const mesh=new THREE.Mesh(geo,material);mesh.receiveShadow=true;mesh.castShadow=false;return{mesh,material,textures:tex};
}
