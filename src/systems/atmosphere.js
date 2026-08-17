import * as THREE from 'three';

export function createVolumetricAtmosphere({ scene, camera, layers = 18, radius = 95, height = 28 } = {}) {
  const group = new THREE.Group();
  const geo = new THREE.PlaneGeometry(radius * 2, radius * 2, 1, 1);
  const mats = [];
  for (let i = 0; i < layers; i++) {
    const depth = i / Math.max(1, layers - 1);
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: true, blending: THREE.NormalBlending,
      uniforms: {
        uTime: { value: 0 }, uDepth: { value: depth }, uDensity: { value: 0.028 + depth * 0.018 },
        uFogColor: { value: new THREE.Color().setHSL(0.53, 0.23, 0.12 + depth * 0.035) },
        uCamera: { value: camera.position }
      },
      vertexShader: `varying vec3 vWorld; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vWorld=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `
        varying vec3 vWorld; uniform float uTime,uDepth,uDensity; uniform vec3 uFogColor,uCamera;
        float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
        float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+1.0),f.x),f.y); }
        void main(){
          float dist=distance(vWorld.xz,uCamera.xz); float radial=smoothstep(110.0,8.0,dist);
          float n=noise(vWorld.xz*.035+vec2(uTime*.007,-uTime*.004)+uDepth*11.0);
          float density=uDensity*(.45+n*.75)*radial;
          density*=smoothstep(0.0,.15,uDepth)*smoothstep(1.0,.62,uDepth);
          gl_FragColor=vec4(uFogColor,density);
        }`
    });
    const plane = new THREE.Mesh(geo, mat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -1 + depth * height;
    group.add(plane); mats.push(mat);
  }
  scene.add(group);
  return {
    group,
    update(dt, time) {
      group.position.x = camera.position.x;
      group.position.z = camera.position.z;
      for (const m of mats) m.uniforms.uTime.value = time;
    }
  };
}
