import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export function createRenderingPipeline(renderer, scene, camera) {
  scene.background=new THREE.Color(0x10242b);
  if(scene.fog){scene.fog.color.set(0x12262b);if('density' in scene.fog)scene.fog.density=.0052;}
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
  let sceneBudgetApplied=false;
  function applySceneBudget(){
    if(sceneBudgetApplied)return;sceneBudgetApplied=true;let pointLights=0;
    scene.traverse(o=>{
      if(o.isPointLight){pointLights++;if(pointLights>5)o.visible=false;}
      const mats=Array.isArray(o.material)?o.material:o.material?[o.material]:[];
      for(const m of mats){if('transmission' in m&&m.transmission>0){m.transmission=0;m.opacity=1;m.transparent=false;m.needsUpdate=true;}}
    });
  }
  return {
    composer,bloom,
    update(dt,{combat=0,darkness=.5}={}){
      applySceneBudget();
      exposure.target=THREE.MathUtils.clamp(1.05+darkness*.2-combat*.035,1.0,1.22);
      exposure.value=THREE.MathUtils.damp(exposure.value,exposure.target,2.4,dt);
      renderer.toneMappingExposure=exposure.value;
      bloom.strength=THREE.MathUtils.damp(bloom.strength,.44+combat*.15,5,dt);
    },
    resize(w,h){composer.setSize(w,h);smaa.setSize(w*renderer.getPixelRatio(),h*renderer.getPixelRatio());}
  };
}

function addDuskSky(scene){
  const material=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,toneMapped:true,vertexShader:`varying vec3 vDir;void main(){vDir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`varying vec3 vDir;void main(){float h=clamp(vDir.y*.5+.5,0.,1.);vec3 horizon=vec3(.115,.225,.245);vec3 mid=vec3(.045,.105,.145);vec3 zenith=vec3(.012,.035,.065);vec3 c=mix(horizon,mid,smoothstep(.35,.62,h));c=mix(c,zenith,smoothstep(.58,1.,h));float glow=pow(max(0.,dot(normalize(vDir),normalize(vec3(-.55,.18,.5)))),18.);c+=vec3(.24,.12,.055)*glow*.55;gl_FragColor=vec4(c,1.);}`});
  const sky=new THREE.Mesh(new THREE.SphereGeometry(250,24,12),material);sky.renderOrder=-1000;scene.add(sky);return sky;
}

export function configureHeroLightRig(scene){
  const sky=addDuskSky(scene);
  const hemi=new THREE.HemisphereLight(0xa4d2df,0x30251b,1.5);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xffe4bb,5.8);sun.position.set(-28,38,18);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-42;sun.shadow.camera.right=42;sun.shadow.camera.top=42;sun.shadow.camera.bottom=-42;sun.shadow.camera.near=.5;sun.shadow.camera.far=105;sun.shadow.bias=-.00018;sun.shadow.normalBias=.035;scene.add(sun);
  const rim=new THREE.DirectionalLight(0x82c9ff,2.15);rim.position.set(22,16,-30);scene.add(rim);
  const fill=new THREE.PointLight(0x62a9bd,1.05,28,2);fill.position.set(0,7,5);scene.add(fill);
  return{sky,hemi,sun,rim,fill};
}

export function createContactShadow(scene){
  const tex=document.createElement('canvas');tex.width=tex.height=128;const c=tex.getContext('2d');const g=c.createRadialGradient(64,64,4,64,64,60);g.addColorStop(0,'rgba(0,0,0,.72)');g.addColorStop(.45,'rgba(0,0,0,.38)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,128,128);
  const map=new THREE.CanvasTexture(tex);const mat=new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,opacity:.65,toneMapped:false});const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2.3,2.3),mat);mesh.rotation.x=-Math.PI/2;mesh.renderOrder=2;scene.add(mesh);return{mesh,update(position,heightFn,scale=1){mesh.position.set(position.x,heightFn(position.x,position.z)+.025,position.z);mesh.scale.setScalar(scale);}};
}
