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
  renderer.toneMappingExposure=1.08;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));

  const composer=new EffectComposer(renderer);
  const renderPass=new RenderPass(scene,camera);
  const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.58,.62,.8);
  bloom.threshold=.72;bloom.strength=.52;bloom.radius=.58;
  const smaa=new SMAAPass(innerWidth*renderer.getPixelRatio(),innerHeight*renderer.getPixelRatio());
  const output=new OutputPass();
  composer.addPass(renderPass);composer.addPass(bloom);composer.addPass(smaa);composer.addPass(output);

  const exposure={target:1.08,value:1.08};
  return {
    composer,bloom,
    update(dt,{combat=0,darkness=.5}={}){
      exposure.target=THREE.MathUtils.clamp(1.0+darkness*.18-combat*.04,.96,1.18);
      exposure.value=THREE.MathUtils.damp(exposure.value,exposure.target,2.4,dt);
      renderer.toneMappingExposure=exposure.value;
      bloom.strength=THREE.MathUtils.damp(bloom.strength,.5+combat*.18,5,dt);
    },
    resize(w,h){composer.setSize(w,h);smaa.setSize(w*renderer.getPixelRatio(),h*renderer.getPixelRatio());}
  };
}

export function configureHeroLightRig(scene){
  const hemi=new THREE.HemisphereLight(0x86b7ce,0x201711,1.15);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xffdfb1,5.6);sun.position.set(-28,38,18);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);sun.shadow.camera.left=-48;sun.shadow.camera.right=48;sun.shadow.camera.top=48;sun.shadow.camera.bottom=-48;sun.shadow.camera.near=.5;sun.shadow.camera.far=120;sun.shadow.bias=-.00018;sun.shadow.normalBias=.028;scene.add(sun);
  const rim=new THREE.DirectionalLight(0x72baff,1.9);rim.position.set(22,16,-30);scene.add(rim);
  const fill=new THREE.PointLight(0x4d8ca3,.8,28,2);fill.position.set(0,7,5);scene.add(fill);
  return{hemi,sun,rim,fill};
}

export function createContactShadow(scene){
  const tex=document.createElement('canvas');tex.width=tex.height=128;const c=tex.getContext('2d');const g=c.createRadialGradient(64,64,4,64,64,60);g.addColorStop(0,'rgba(0,0,0,.78)');g.addColorStop(.45,'rgba(0,0,0,.42)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,128,128);
  const map=new THREE.CanvasTexture(tex);const mat=new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,opacity:.7,toneMapped:false});const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2.3,2.3),mat);mesh.rotation.x=-Math.PI/2;mesh.renderOrder=2;scene.add(mesh);return{mesh,update(position,heightFn,scale=1){mesh.position.set(position.x,heightFn(position.x,position.z)+.025,position.z);mesh.scale.setScalar(scale);}};
}
