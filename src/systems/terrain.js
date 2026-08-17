import * as THREE from 'three';

function makeNoiseTexture(size=256, seed=17){
  const data=new Uint8Array(size*size*4); let s=seed;
  for(let i=0;i<size*size;i++){ s=(s*1664525+1013904223)>>>0; const n=(s>>>24); const j=i*4; data[j]=n; data[j+1]=n; data[j+2]=n; data[j+3]=255; }
  const t=new THREE.DataTexture(data,size,size,THREE.RGBAFormat); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.needsUpdate=true; return t;
}

export function createLayeredTerrain({ size=180, segments=160, heightFn }) {
  const geo=new THREE.PlaneGeometry(size,size,segments,segments); geo.rotateX(-Math.PI/2);
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++) p.setY(i,heightFn(p.getX(i),p.getZ(i)));
  geo.computeVertexNormals();

  const noise=makeNoiseTexture(); noise.repeat.set(8,8);
  const material=new THREE.ShaderMaterial({
    uniforms:{
      uNoise:{value:noise}, uScale:{value:1}, uSnowLine:{value:4.4}, uRockStart:{value:.58},
      uGrass:{value:new THREE.Color(0x4a5d43)}, uDirt:{value:new THREE.Color(0x5d4634)}, uRock:{value:new THREE.Color(0x707776)}, uMoss:{value:new THREE.Color(0x31483a)},
      uLightDir:{value:new THREE.Vector3(-.4,.8,.2).normalize()}, uSun:{value:new THREE.Color(0xffd7a6)}, uAmbient:{value:new THREE.Color(0x27414a)}
    },
    vertexShader:`
      varying vec3 vWorld; varying vec3 vNormal;
      void main(){ vec4 w=modelMatrix*vec4(position,1.0); vWorld=w.xyz; vNormal=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }
    `,
    fragmentShader:`
      uniform sampler2D uNoise; uniform float uSnowLine; uniform float uRockStart; uniform vec3 uGrass,uDirt,uRock,uMoss,uLightDir,uSun,uAmbient;
      varying vec3 vWorld; varying vec3 vNormal;
      float triNoise(vec3 p){ vec2 xz=p.xz*.065; float a=texture2D(uNoise,xz).r; float b=texture2D(uNoise,p.xz*.37).r; return a*.68+b*.32; }
      void main(){
        vec3 n=normalize(vNormal); float slope=1.0-clamp(n.y,0.0,1.0); float h=vWorld.y; float no=triNoise(vWorld);
        float rock=smoothstep(uRockStart-.08,uRockStart+.18,slope+no*.12);
        float dirt=smoothstep(.38,.67,no)*(1.0-rock);
        float moss=smoothstep(.15,.48,1.0-slope)*smoothstep(.38,.76,no)*(1.0-rock)*.45;
        vec3 base=mix(uGrass,uDirt,dirt); base=mix(base,uMoss,moss); base=mix(base,uRock,rock);
        float macro=texture2D(uNoise,vWorld.xz*.012).r; base*=mix(.78,1.16,macro);
        float ndl=max(dot(n,uLightDir),0.0); vec3 lit=base*(uAmbient+uSun*(ndl*.9+.12));
        float rim=pow(1.0-max(dot(n,normalize(cameraPosition-vWorld)),0.0),3.0); lit+=vec3(.05,.08,.09)*rim;
        gl_FragColor=vec4(lit,1.0);
      }
    `
  });
  const mesh=new THREE.Mesh(geo,material); mesh.receiveShadow=true; return {mesh,material};
}
