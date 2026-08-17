import './styles.css';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const app = document.querySelector('#app');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x071015);
scene.fog = new THREE.FogExp2(0x0b171b, 0.022);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.08, 420);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.42, 0.55, 0.8));
composer.addPass(new OutputPass());

function canvasTexture(base, vein, seed = 3) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d'); x.fillStyle = base; x.fillRect(0, 0, 256, 256);
  let s = seed;
  for (let i = 0; i < 1500; i++) {
    s = (s * 16807) % 2147483647;
    const px = s % 256; s = (s * 16807) % 2147483647; const py = s % 256;
    const a = 0.03 + ((s % 20) / 500);
    x.fillStyle = `rgba(${vein[0]},${vein[1]},${vein[2]},${a})`;
    x.fillRect(px, py, 1 + (s % 3), 1 + ((s >> 2) % 3));
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}

const groundMap = canvasTexture('#26322a', [148, 178, 132], 11); groundMap.repeat.set(18, 18);
const rockMap = canvasTexture('#32393a', [176, 183, 176], 29); rockMap.repeat.set(2, 3);
const barkMap = canvasTexture('#382b24', [150, 111, 78], 47); barkMap.repeat.set(2, 5);

const hemi = new THREE.HemisphereLight(0x7ca9c1, 0x241b15, 1.45); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe1b2, 5.2); sun.position.set(-24, 35, 12); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -42; sun.shadow.camera.right = 42; sun.shadow.camera.top = 42; sun.shadow.camera.bottom = -42; sun.shadow.bias = -0.00025; scene.add(sun);
const moon = new THREE.DirectionalLight(0x79bfff, 1.8); moon.position.set(20, 13, -26); scene.add(moon);

const terrainGeo = new THREE.PlaneGeometry(170, 170, 90, 90); terrainGeo.rotateX(-Math.PI / 2);
const p = terrainGeo.attributes.position;
for (let i = 0; i < p.count; i++) {
  const x = p.getX(i), z = p.getZ(i);
  const y = Math.sin(x * .075) * 1.6 + Math.cos(z * .058) * 1.1 + Math.sin((x + z) * .13) * .45 - Math.exp(-(x*x + z*z)/420) * 1.2;
  p.setY(i, y);
}
terrainGeo.computeVertexNormals();
const terrain = new THREE.Mesh(terrainGeo, new THREE.MeshStandardMaterial({ map: groundMap, roughness: .96, metalness: .02, color: 0x7d8f75 }));
terrain.receiveShadow = true; scene.add(terrain);

function terrainY(x, z) { return Math.sin(x*.075)*1.6 + Math.cos(z*.058)*1.1 + Math.sin((x+z)*.13)*.45 - Math.exp(-(x*x+z*z)/420)*1.2; }

const rockMat = new THREE.MeshStandardMaterial({ map: rockMap, color: 0x8b9794, roughness: .87, metalness: .08 });
const barkMat = new THREE.MeshStandardMaterial({ map: barkMap, color: 0x6b5142, roughness: .94 });
const leafMat = new THREE.MeshStandardMaterial({ color: 0x314b3c, roughness: .8, side: THREE.DoubleSide });

const rng = (() => { let s = 712367; return () => ((s = (s * 48271) % 2147483647) / 2147483647); })();
for (let i = 0; i < 115; i++) {
  const a = rng()*Math.PI*2, r = 14 + rng()*65, x = Math.cos(a)*r, z = Math.sin(a)*r;
  if (rng() < .56) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.28,.52,4.5+rng()*4,8), barkMat); trunk.castShadow = true; trunk.position.y = 2.2; g.add(trunk);
    for(let j=0;j<3;j++){ const crown=new THREE.Mesh(new THREE.ConeGeometry(1.8+rng(),3.2+rng()*2,9),leafMat); crown.position.y=4.2+j*1.35; crown.rotation.y=rng()*6.28; crown.castShadow=true; g.add(crown); }
    g.position.set(x,terrainY(x,z),z); g.rotation.z=(rng()-.5)*.08; scene.add(g);
  } else {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(.6+rng()*1.5,1), rockMat); rock.scale.set(1+rng(),.7+rng(),1+rng()); rock.position.set(x,terrainY(x,z)+.35,z); rock.rotation.set(rng(),rng()*6.2,rng()); rock.castShadow=rock.receiveShadow=true; scene.add(rock);
  }
}

// Ruined arena stones
for(let i=0;i<18;i++){const a=i/18*Math.PI*2;const x=Math.cos(a)*10,z=Math.sin(a)*10;const m=new THREE.Mesh(new THREE.BoxGeometry(1.5,2.5+rng()*2,1.25),rockMat);m.position.set(x,terrainY(x,z)+1.1,z);m.rotation.set((rng()-.5)*.2,-a+(rng()-.5)*.4,(rng()-.5)*.14);m.castShadow=m.receiveShadow=true;scene.add(m);}

const crystalMat = new THREE.MeshStandardMaterial({ color:0x56d8ff, emissive:0x159bd5, emissiveIntensity:3.5, roughness:.18, metalness:.22 });
for(let i=0;i<12;i++){const a=rng()*6.28,r=12+rng()*28,x=Math.cos(a)*r,z=Math.sin(a)*r;const c=new THREE.Mesh(new THREE.OctahedronGeometry(.18+rng()*.34,0),crystalMat);c.scale.y=2.5+rng()*4;c.position.set(x,terrainY(x,z)+.6,z);c.rotation.z=(rng()-.5)*.35;c.castShadow=true;scene.add(c);const l=new THREE.PointLight(0x4fdcff,.7,5,2);l.position.copy(c.position);scene.add(l);}

function makeHero() {
  const g = new THREE.Group();
  const armor = new THREE.MeshStandardMaterial({ color:0x58727a, metalness:.72, roughness:.29 });
  const trim = new THREE.MeshStandardMaterial({ color:0xc9a45d, metalness:.83, roughness:.22 });
  const cloth = new THREE.MeshStandardMaterial({ color:0x183c48, roughness:.82 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.52,.95,7,14),armor); body.position.y=1.45; body.castShadow=true; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.37,18,14),new THREE.MeshStandardMaterial({color:0xc99273,roughness:.72})); head.position.y=2.52; head.castShadow=true; g.add(head);
  const hood = new THREE.Mesh(new THREE.ConeGeometry(.46,.7,16),cloth); hood.position.set(0,2.74,.05); hood.rotation.x=-.18; hood.castShadow=true; g.add(hood);
  for(const s of [-1,1]){const sh=new THREE.Mesh(new THREE.SphereGeometry(.34,14,10),trim);sh.scale.set(1.35,.6,1);sh.position.set(.57*s,2.05,0);sh.castShadow=true;g.add(sh);const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.16,.68,5,10),armor);leg.position.set(.23*s,.56,0);leg.castShadow=true;g.add(leg);}
  const sword = new THREE.Group(); const blade=new THREE.Mesh(new THREE.BoxGeometry(.09,1.7,.16),new THREE.MeshStandardMaterial({color:0xbdefff,metalness:.9,roughness:.12,emissive:0x183f4f,emissiveIntensity:1.6})); blade.position.y=.85; sword.add(blade); const guard=new THREE.Mesh(new THREE.BoxGeometry(.72,.08,.12),trim); sword.add(guard); sword.position.set(.74,1.35,.12); sword.rotation.z=-.5; g.add(sword); g.userData.sword=sword;
  return g;
}
const hero = makeHero(); hero.position.set(0,terrainY(0,4),4); scene.add(hero);

function makeEnemy(){const g=new THREE.Group();const dark=new THREE.MeshStandardMaterial({color:0x241d25,metalness:.65,roughness:.35});const red=new THREE.MeshStandardMaterial({color:0x6b2422,emissive:0x38100c,emissiveIntensity:1.6,metalness:.35,roughness:.5});const b=new THREE.Mesh(new THREE.CapsuleGeometry(.7,1.4,7,14),dark);b.position.y=1.65;b.castShadow=true;g.add(b);const h=new THREE.Mesh(new THREE.IcosahedronGeometry(.48,1),red);h.position.y=2.85;h.castShadow=true;g.add(h);for(const s of [-1,1]){const horn=new THREE.Mesh(new THREE.ConeGeometry(.14,.9,8),red);horn.position.set(.34*s,3.2,0);horn.rotation.z=.5*s;g.add(horn);}return g;}
const enemy=makeEnemy();enemy.position.set(0,terrainY(0,-5),-5);scene.add(enemy);

const dustCount=800;const dustGeo=new THREE.BufferGeometry();const dustPos=new Float32Array(dustCount*3);for(let i=0;i<dustCount;i++){dustPos[i*3]=(rng()-.5)*100;dustPos[i*3+1]=rng()*16;dustPos[i*3+2]=(rng()-.5)*100;}dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPos,3));const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:0xb8e4d8,size:.035,transparent:true,opacity:.42,depthWrite:false,blending:THREE.AdditiveBlending}));scene.add(dust);

const keys = new Set(); let yaw=0, pitch=.3, dragging=false, lastX=0,lastY=0, stamina=100, hp=100, enemyHp=100, attackT=0, evadeT=0, riftT=0, guardT=0, time=0;
addEventListener('keydown',e=>{keys.add(e.code); if(e.code==='Digit1')attackT=Math.max(attackT,.34); if(e.code==='Digit2'&&riftT<=0){riftT=4; castRift();} if(e.code==='Digit3'&&guardT<=0)guardT=3; if(e.code==='Space'&&evadeT<=0){evadeT=1.1; stamina=Math.max(0,stamina-22);}});addEventListener('keyup',e=>keys.delete(e.code));
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());renderer.domElement.addEventListener('pointerdown',e=>{if(e.button===2){dragging=true;lastX=e.clientX;lastY=e.clientY;}});addEventListener('pointerup',()=>dragging=false);addEventListener('pointermove',e=>{if(!dragging)return;yaw-=(e.clientX-lastX)*.005;pitch=THREE.MathUtils.clamp(pitch-(e.clientY-lastY)*.004,-.05,.65);lastX=e.clientX;lastY=e.clientY;});

const fx=[];function flash(position,color=0x79eaff,scale=1){const mat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:1,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false});const m=new THREE.Mesh(new THREE.RingGeometry(.2,.32,32),mat);m.position.copy(position);m.rotation.x=-Math.PI/2;m.scale.setScalar(scale);scene.add(m);fx.push({m,life:.45,max:.45,grow:5});}
function castRift(){flash(hero.position.clone().add(new THREE.Vector3(0,.08,0)),0x5edcff,2.2);const d=hero.position.distanceTo(enemy.position);if(d<8){enemyHp=Math.max(0,enemyHp-28);flash(enemy.position.clone().add(new THREE.Vector3(0,1.4,0)),0xb6f5ff,1.2);}}

const tmp=new THREE.Vector3(), forward=new THREE.Vector3(), right=new THREE.Vector3();
function update(dt){time+=dt;riftT=Math.max(0,riftT-dt);guardT=Math.max(0,guardT-dt);evadeT=Math.max(0,evadeT-dt);attackT=Math.max(0,attackT-dt);dust.rotation.y+=dt*.006;
  const move=new THREE.Vector3();forward.set(Math.sin(yaw),0,-Math.cos(yaw));right.set(Math.cos(yaw),0,Math.sin(yaw));if(keys.has('KeyW'))move.add(forward);if(keys.has('KeyS'))move.sub(forward);if(keys.has('KeyD'))move.add(right);if(keys.has('KeyA'))move.sub(right);
  const sprint=keys.has('ShiftLeft')&&stamina>2;let speed=sprint?8.2:4.8;if(evadeT>.72)speed=13.5;if(move.lengthSq()>0){move.normalize();hero.position.addScaledVector(move,speed*dt);const targetYaw=Math.atan2(move.x,move.z);hero.rotation.y=THREE.MathUtils.lerp(hero.rotation.y,targetYaw,1-Math.exp(-dt*12));if(sprint)stamina=Math.max(0,stamina-dt*18);else stamina=Math.min(100,stamina+dt*10);}else stamina=Math.min(100,stamina+dt*13);
  hero.position.y=THREE.MathUtils.lerp(hero.position.y,terrainY(hero.position.x,hero.position.z),1-Math.exp(-dt*18));
  const bob=move.lengthSq()>0?Math.sin(time*(sprint?12:8))*.045:Math.sin(time*2)*.012;hero.children[0].position.y=1.45+bob;hero.userData.sword.rotation.z=-.5 + (attackT>0?Math.sin((.34-attackT)/.34*Math.PI)*1.9:0);
  if(attackT>0.16&&attackT<0.20&&hero.position.distanceTo(enemy.position)<3.2){enemyHp=Math.max(0,enemyHp-14);flash(enemy.position.clone().add(new THREE.Vector3(0,1.4,0)),0xffcf7c,.7);}
  if(enemyHp>0){enemy.lookAt(hero.position.x,enemy.position.y,hero.position.z);const d=enemy.position.distanceTo(hero.position);if(d>3.1&&d<12){tmp.subVectors(hero.position,enemy.position).setY(0).normalize();enemy.position.addScaledVector(tmp,dt*1.5);enemy.position.y=terrainY(enemy.position.x,enemy.position.z);}enemy.position.y+=Math.sin(time*2.6)*.025;}
  for(let i=fx.length-1;i>=0;i--){const f=fx[i];f.life-=dt;f.m.scale.addScalar(dt*f.grow);f.m.material.opacity=Math.max(0,f.life/f.max);if(f.life<=0){scene.remove(f.m);f.m.geometry.dispose();f.m.material.dispose();fx.splice(i,1);}}
  const camTarget=hero.position.clone().add(new THREE.Vector3(0,1.55,0));const dist=7.2;const cp=Math.cos(pitch);const desired=camTarget.clone().add(new THREE.Vector3(Math.sin(yaw)*cp*dist,Math.sin(pitch)*dist+2.1,Math.cos(yaw)*cp*dist));camera.position.lerp(desired,1-Math.exp(-dt*7));camera.lookAt(camTarget);
  document.querySelector('#stamina').style.width=`${stamina}%`;document.querySelector('#hp').style.width=`${hp}%`;document.querySelector('#enemyHp').style.width=`${enemyHp}%`;document.querySelector('#targetCard').classList.toggle('hidden',hero.position.distanceTo(enemy.position)>15||enemyHp<=0);document.querySelector('#status').textContent=guardT>0?'GUARDING':sprint?'SPRINT':'READY';document.querySelector('#cd1').textContent=attackT>0?attackT.toFixed(1):'';document.querySelector('#cd2').textContent=riftT>0?riftT.toFixed(1):'';document.querySelector('#cd3').textContent=guardT>0?guardT.toFixed(1):'';document.querySelector('#cd4').textContent=evadeT>0?evadeT.toFixed(1):'';
}

const clock=new THREE.Clock();function frame(){requestAnimationFrame(frame);update(Math.min(clock.getDelta(),.05));composer.render();}frame();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);});
