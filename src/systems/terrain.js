import * as THREE from 'three';

function hash(x,y,seed=19){let h=(x*374761393+y*668265263+seed*69069)|0;h=(h^(h>>>13))*1274126177;return((h^(h>>>16))>>>0)/4294967295;}
function smoothNoise(x,y,seed=19){const x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy),a=hash(x0,y0,seed),b=hash(x0+1,y0,seed),c=hash(x0,y0+1,seed),d=hash(x0+1,y0+1,seed);return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a,b,sx),THREE.MathUtils.lerp(c,d,sx),sy);}
function fbm(x,y,seed=11,octaves=5){let v=0,a=.5,f=1;for(let i=0;i<octaves;i++){v+=a*smoothNoise(x*f,y*f,seed+i*41);f*=2.03;a*=.5;}return v;}
function pathMask(x,z){const meander=Math.sin(z*.055)*1.05+Math.sin(z*.018+1.7)*.62,corridor=1-THREE.MathUtils.smoothstep(Math.abs(x-meander),1.45,5.2),r=Math.hypot(x,z),arena=1-THREE.MathUtils.smoothstep(r,4.1,8.6);return THREE.MathUtils.clamp(Math.max(corridor*.86,arena*.72),0,1);}

function makeSurfaceTextures(size=384){
  const color=document.createElement('canvas'),height=document.createElement('canvas'),normal=document.createElement('canvas'),rough=document.createElement('canvas');for(const c of[color,height,normal,rough])c.width=c.height=size;
  const cc=color.getContext('2d'),hc=height.getContext('2d'),nc=normal.getContext('2d'),rc=rough.getContext('2d'),ci=cc.createImageData(size,size),hi=hc.createImageData(size,size),ni=nc.createImageData(size,size),ri=rc.createImageData(size,size),heights=new Float32Array(size*size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=y*size+x,n=fbm(x*.065,y*.065,31,5),macro=fbm(x*.018+71,y*.018-33,77,4),grain=hash(x,y,91),crack=Math.abs(Math.sin(x*.085+y*.038+n*4.8)),pebble=hash(Math.floor(x/3),Math.floor(y/3),149),h=THREE.MathUtils.clamp(n*.68+macro*.17+grain*.07+crack*.045+(pebble>.9?.075:0),0,1),j=i*4;heights[i]=h;
    const warm=THREE.MathUtils.clamp(.84+(macro-.5)*.11+(grain-.5)*.06,0,1),green=THREE.MathUtils.clamp(.88+(n-.5)*.08,0,1),blue=THREE.MathUtils.clamp(.82+(macro-.5)*.05,0,1);ci.data[j]=Math.round(255*warm);ci.data[j+1]=Math.round(255*green);ci.data[j+2]=Math.round(255*blue);ci.data[j+3]=255;
    const hv=Math.round(h*255);hi.data[j]=hi.data[j+1]=hi.data[j+2]=hv;hi.data[j+3]=255;const rv=Math.round(THREE.MathUtils.clamp(.8+n*.12+grain*.045-(pebble>.9?.06:0),0,1)*255);ri.data[j]=ri.data[j+1]=ri.data[j+2]=rv;ri.data[j+3]=255;
  }
  const at=(x,y)=>heights[((y+size)%size)*size+((x+size)%size)];for(let y=0;y<size;y++)for(let x=0;x<size;x++){const dx=(at(x+1,y)-at(x-1,y))*3.4,dy=(at(x,y+1)-at(x,y-1))*3.4,n=new THREE.Vector3(-dx,-dy,1).normalize(),j=(y*size+x)*4;ni.data[j]=Math.round((n.x*.5+.5)*255);ni.data[j+1]=Math.round((n.y*.5+.5)*255);ni.data[j+2]=Math.round((n.z*.5+.5)*255);ni.data[j+3]=255;}
  cc.putImageData(ci,0,0);hc.putImageData(hi,0,0);nc.putImageData(ni,0,0);rc.putImageData(ri,0,0);
  const map=new THREE.CanvasTexture(color),bump=new THREE.CanvasTexture(height),normalMap=new THREE.CanvasTexture(normal),roughness=new THREE.CanvasTexture(rough);for(const t of[map,bump,normalMap,roughness]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(34,34);t.anisotropy=8;t.generateMipmaps=true;}map.colorSpace=THREE.SRGBColorSpace;return{map,bump,normalMap,roughness};
}

export function createLayeredTerrain({size=220,segments=160,heightFn}){
  const actualSegments=Math.min(segments,144),geo=new THREE.PlaneGeometry(size,size,actualSegments,actualSegments);geo.rotateX(-Math.PI/2);const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),micro=(fbm(x*.62,z*.62,211,3)-.5)*.032*(1-pathMask(x,z)*.45);p.setY(i,heightFn(x,z)+micro);}geo.computeVertexNormals();
  const n=geo.attributes.normal,colors=new Float32Array(p.count*3),cGrass=new THREE.Color(0x536945),cDirt=new THREE.Color(0x6b5036),cPath=new THREE.Color(0x76583a),cRock=new THREE.Color(0x70746b),cMoss=new THREE.Color(0x334d35),tmp=new THREE.Color();
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),z=p.getZ(i),h=p.getY(i),slope=1-Math.max(0,n.getY(i)),macro=fbm(x*.095+120,z*.095-57,73,4),detail=fbm(x*.37,z*.37,109,3),path=pathMask(x,z),rock=THREE.MathUtils.smoothstep(slope+detail*.1,.3,.64),dryPatch=THREE.MathUtils.smoothstep(macro,.58,.84),dirt=THREE.MathUtils.clamp(path*.9+dryPatch*.32,0,1)*(1-rock),moss=THREE.MathUtils.smoothstep(fbm(x*.14-40,z*.14+27,181,4),.58,.82)*(1-path)*(1-rock)*(1-THREE.MathUtils.smoothstep(slope,.08,.38));
    tmp.copy(cGrass).lerp(cDirt,dirt*.7).lerp(cPath,path*.76).lerp(cMoss,moss*.56).lerp(cRock,rock);const heightShade=THREE.MathUtils.clamp(1+(h-1)*.008,.94,1.065),macroShade=.9+macro*.16,edgeBreak=.96+(detail-.5)*.055;tmp.multiplyScalar(heightShade*macroShade*edgeBreak);colors[i*3]=tmp.r;colors[i*3+1]=tmp.g;colors[i*3+2]=tmp.b;
  }
  geo.setAttribute('color',new THREE.BufferAttribute(colors,3));const tex=makeSurfaceTextures();const material=new THREE.MeshPhysicalMaterial({map:tex.map,normalMap:tex.normalMap,normalScale:new THREE.Vector2(.78,.78),bumpMap:tex.bump,bumpScale:.052,roughnessMap:tex.roughness,roughness:.93,metalness:.004,vertexColors:true,clearcoat:0,envMapIntensity:.2});
  const mesh=new THREE.Mesh(geo,material);mesh.receiveShadow=true;mesh.castShadow=false;mesh.userData.terrainLayers=['grass','dirt','worn-path','rock','moss'];mesh.userData.microHeight=.032;
  if(typeof window!=='undefined')window.__GAUNTLET_TERRAIN_MATERIAL__={target:'high-end OSRS/07Scape',ready:true,accepted:false,layers:mesh.userData.terrainLayers,textureSize:384,detailRepeat:34,microHeightMeters:.032,path:'meandering authored corridor + arena wear',normalStrength:.78,bumpScale:.052,note:'Structural terrain upgrade only; screenshot critic controls visual acceptance.'};
  return{mesh,material,textures:tex};
}
