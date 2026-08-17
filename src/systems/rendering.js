import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export function createRenderingPipeline(renderer, scene, camera) {
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.12;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));

  const composer=new EffectComposer(renderer);
  const renderPass=new RenderPass(scene,camera);
  const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.5,.56,.82);
  bloom.threshold=.76;bloom.strength=.46;bloom.radius=.52;
  const smaa=new SMAAPass(innerWidth*renderer.getPixelRatio(),innerHeight*renderer.getPixelRatio());
  const output=new OutputPass();
  composer.addPass(renderPass);composer.addPass(bloom);composer.addPass(smaa);composer.addPass(output);

  const exposure={target:1.12,value:1.12};
  return {
    composer,bloom,
    update(dt,{combat=0,darkness=.5}={}){
      exposure.target=THREE.MathUtils.clamp(1.05+darkness*.2-combat*.035,1.0,1.22);
      exposure.value=THREE.MathUtils.damp(exposure.value,exposure.target,2.4,dt);
      renderer.toneMappingExposure=exposure.value;
      bloom.strength=THREE.MathUtils.damp(bloom.strength,.44+combat*.15,5,dt);
    },
    resize(w,h){composer.setSize(w,h);smaa.setSize(w*renderer.getPixelRatio(),h*renderer.getPixelRatio());}
  };
}

export function configureHeroLightRig(scene){
  const hemi=new THREE.HemisphereLight(0x9bc9da,0x2c2118,1.45);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xffe4bb,5.8);sun.position.set(-28,38,18);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-42;sun.shadow.camera.right=42;sun.shadow.camera.top=42;sun.shadow.camera.bottom=-42;sun.shadow.camera.near=.5;sun.shadow.camera.far=105;sun.shadow.bias=-.00018;sun.shadow.normalBias=.035;scene.add(sun);
  const rim=new THREE.DirectionalLight(0x82c9ff,2.15);rim.position.set(22,16,-30);scene.add(rim);
  const fill=new THREE.PointLight(0x62a9bd,1.05,28,2);fill.position.set(0,7,5);scene.add(fill);
  return{hemi,sun,rim,fill};
}

export function createContactShadow(scene){
  const tex=document.createElement('canvas');tex.width=tex.height=128;const c=tex.getContext('2d');const g=c.createRadialGradient(64,64,4,64,64,60);g.addColorStop(0,'rgba(0,0,0,.72)');g.addColorStop(.45,'rgba(0,0,0,.38)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,128,128);
  const map=new THREE.CanvasTexture(tex);const mat=new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,opacity:.65,toneMapped:false});const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2.3,2.3),mat);mesh.rotation.x=-Math.PI/2;mesh.renderOrder=2;scene.add(mesh);return{mesh,update(position,heightFn,scale=1){mesh.position.set(position.x,heightFn(position.x,position.z)+.025,position.z);mesh.scale.setScalar(scale);}};
}
