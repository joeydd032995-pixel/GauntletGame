import * as THREE from 'three';

function hash(x,y,seed=19){let h=(x*374761393+y*668265263+seed*69069)|0;h=(h^(h>>>13))*1274126177;return((h^(h>>>16))>>>0)/4294967295;}
function fbm(x,y){let v=0,a=.5,f=1;for(let i=0;i<5;i++){v+=a*hash(Math.floor(x*f),Math.floor(y*f),i*37+11);f*=2.03;a*=.5;}return v;}

function makeSurfaceTextures(size=512){
  const color=document.createElement('canvas'),height=document.createElement('canvas'),rough=document.createElement('canvas');color.width=color.height=height.width=height.height=rough.width=rough.height=size;
  const cc=color.getContext('2d'),hc=height.getContext('2d'),rc=rough.getContext('2d'),ci=cc.createImageData(size,size),hi=hc.createImageData(size,size),ri=rc.createImageData(size,size);
  const heights=new Float32Array(size*size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=y*size+x,n=fbm(x*.09,y*.09),m=fbm(x*.018+71,y*.018-33),grain=hash(x,y,91);heights[i]=n;const j=i*4;
    const base=[73,85,67],dirt=[96,72,50],moss=[48,70,52];const mix=Math.max(0,Math.min(1,(n-.42)*2.5)),mm=Math.max(0,Math.min(1,(m-.52)*2));
    for(let c=0;c<3;c++)ci.data[j+c]=Math.round((base[c]*(1-mix)+dirt[c]*mix)*(1-mm*.28)+moss[c]*mm*.28+(grain-.5)*10);ci.data[j+3]=255;
    const hv=Math.round(n*255);hi.data[j]=hi.data[j+1]=hi.data[j+2]=hv;hi.data[j+3]=255;const rv=Math.round((.68+n*.22+grain*.08)*255);ri.data[j]=ri.data[j+1]=ri.data[j+2]=rv;ri.data[j+3]=255;
  }
  cc.putImageData(ci,0,0);hc.putImageData(hi,0,0);rc.putImageData(ri,0,0);
  const map=new THREE.CanvasTexture(color),bump=new THREE.CanvasTexture(height),roughness=new THREE.CanvasTexture(rough);for(const t of [map,bump,roughness]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(26,26);t.anisotropy=8;}map.colorSpace=THREE.SRGBColorSpace;
  return{map,bump,roughness};
}

export function createLayeredTerrain({size=220,segments=220,heightFn}){
  const geo=new THREE.PlaneGeometry(size,size,segments,segments);geo.rotateX(-Math.PI/2);const p=geo.attributes.position;
  for(let i=0;i<p.count;i++)p.setY(i,heightFn(p.getX(i),p.getZ(i)));geo.computeVertexNormals();
  const n=geo.attributes.normal,colors=new Float32Array(p.count*3),cGrass=new THREE.Color(0x6f8065),cDirt=new THREE.Color(0x73573c),cRock=new THREE.Color(0x777d7b),cMoss=new THREE.Color(0x435d49),tmp=new THREE.Color();
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),h=p.getY(i),slope=1-Math.max(0,n.getY(i)),macro=fbm(x*.11+120,z*.11-57),detail=fbm(x*.43,z*.43);const rock=THREE.MathUtils.smoothstep(slope+detail*.09,.38,.72),dirt=THREE.MathUtils.smoothstep(macro,.45,.7)*(1-rock),moss=THREE.MathUtils.smoothstep(1-slope,.55,.92)*THREE.MathUtils.smoothstep(macro,.52,.77)*(1-rock);
    tmp.copy(cGrass).lerp(cDirt,dirt).lerp(cMoss,moss*.55).lerp(cRock,rock);const heightShade=THREE.MathUtils.clamp(1+(h-1)*.012,.9,1.08);tmp.multiplyScalar(heightShade*(.9+macro*.18));colors[i*3]=tmp.r;colors[i*3+1]=tmp.g;colors[i*3+2]=tmp.b;}
  geo.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const tex=makeSurfaceTextures();
  const material=new THREE.MeshPhysicalMaterial({map:tex.map,bumpMap:tex.bump,bumpScale:.095,roughnessMap:tex.roughness,roughness:.92,metalness:.015,vertexColors:true,clearcoat:.06,clearcoatRoughness:.72,envMapIntensity:.38});
  const mesh=new THREE.Mesh(geo,material);mesh.receiveShadow=true;mesh.castShadow=false;return{mesh,material,textures:tex};
}
