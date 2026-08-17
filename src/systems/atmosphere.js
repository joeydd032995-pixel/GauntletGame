import * as THREE from 'three';

export function createVolumetricAtmosphere({scene,camera,layers=12,radius=110,height=26}={}){
  const actualLayers=Math.min(layers,10),group=new THREE.Group(),mats=[],geo=new THREE.PlaneGeometry(radius*2,radius*2);
  for(let i=0;i<actualLayers;i++){
    const depth=i/Math.max(1,actualLayers-1),mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,blending:THREE.NormalBlending,side:THREE.DoubleSide,uniforms:{uTime:{value:0},uDepth:{value:depth},uDensity:{value:.010+depth*.008},uFogColor:{value:new THREE.Color().setHSL(.53,.22,.12+depth*.032)},uCamera:{value:camera.position}},vertexShader:`varying vec3 vWorld;void main(){vec4 w=modelMatrix*vec4(position,1.0);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,fragmentShader:`varying vec3 vWorld;uniform float uTime,uDepth,uDensity;uniform vec3 uFogColor,uCamera;float h(vec2 p){p=fract(p*vec2(127.1,311.7));p+=dot(p,p+19.19);return fract(p.x*p.y);}float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<3;i++){v+=a*n(p);p=p*2.03+17.7;a*=.5;}return v;}void main(){float dist=distance(vWorld.xz,uCamera.xz);float radial=1.-smoothstep(42.,112.,dist);float f=fbm(vWorld.xz*.026+vec2(uTime*.0035,-uTime*.0018)+uDepth*23.);float pockets=smoothstep(.32,.76,f);float lower=1.-smoothstep(.55,1.,uDepth);float density=uDensity*(.22+pockets*.66)*radial*(.35+lower*.65);gl_FragColor=vec4(uFogColor,density);}`});
    const plane=new THREE.Mesh(geo,mat);plane.rotation.x=-Math.PI/2;plane.position.y=-1+depth*height;group.add(plane);mats.push(mat);
  }
  scene.add(group);
  const shaftGroup=new THREE.Group();scene.add(shaftGroup);
  return{group,shaftGroup,update(dt,time){group.position.x=camera.position.x;group.position.z=camera.position.z;for(const m of mats)m.uniforms.uTime.value=time;}};
}
