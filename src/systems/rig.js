import * as THREE from 'three';

const bone=(name,x=0,y=0,z=0)=>{const b=new THREE.Bone();b.name=name;b.position.set(x,y,z);return b;};
function limbBetween(parent,child,radius,material){const v=child.position.clone(),len=v.length(),mesh=new THREE.Mesh(new THREE.CapsuleGeometry(radius,Math.max(.05,len-radius*2),8,14),material);mesh.position.copy(v).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.clone().normalize());mesh.castShadow=true;parent.add(mesh);return mesh;}
function armorPlate(w,h,d,mat){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d,2,2,2),mat);m.castShadow=true;return m;}

export function createHeroRig(){
  const group=new THREE.Group();group.name='HeroRig';
  const armor=new THREE.MeshPhysicalMaterial({color:0x587783,metalness:.82,roughness:.2,clearcoat:.22,clearcoatRoughness:.28,envMapIntensity:.7});
  const darkArmor=new THREE.MeshPhysicalMaterial({color:0x17262e,metalness:.7,roughness:.28,clearcoat:.12,clearcoatRoughness:.4});
  const trim=new THREE.MeshPhysicalMaterial({color:0xd0ad66,metalness:.94,roughness:.16,clearcoat:.32,clearcoatRoughness:.2});
  const cloth=new THREE.MeshPhysicalMaterial({color:0x143a49,roughness:.78,sheen:1,sheenColor:new THREE.Color(0x1f6070),sheenRoughness:.65});
  const skin=new THREE.MeshPhysicalMaterial({color:0xc98d70,roughness:.52,clearcoat:.05});
  const hips=bone('Hips',0,1.02,0),spine=bone('Spine',0,.5,0),chest=bone('Chest',0,.48,0),neck=bone('Neck',0,.32,0),head=bone('Head',0,.25,0);hips.add(spine);spine.add(chest);chest.add(neck);neck.add(head);group.add(hips);
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.4,.6,10,18),darkArmor);torso.position.y=.16;torso.scale.z=.78;torso.castShadow=true;spine.add(torso);
  const breast=armorPlate(.82,.54,.28,armor);breast.position.set(0,.2,.13);breast.rotation.x=-.08;chest.add(breast);
  const waist=new THREE.Mesh(new THREE.CylinderGeometry(.33,.38,.34,14),trim);waist.position.y=-.08;waist.castShadow=true;hips.add(waist);
  const headMesh=new THREE.Mesh(new THREE.SphereGeometry(.27,24,18),skin);headMesh.position.y=.15;headMesh.castShadow=true;head.add(headMesh);
  const hood=new THREE.Mesh(new THREE.ConeGeometry(.35,.42,18),cloth);hood.position.set(0,.24,-.01);hood.rotation.x=-.12;hood.castShadow=true;head.add(hood);
  const mantle=new THREE.Mesh(new THREE.TorusGeometry(.44,.08,12,30,Math.PI*1.5),trim);mantle.rotation.x=Math.PI/2;mantle.rotation.z=-.78;mantle.position.y=.34;chest.add(mantle);
  const cape=new THREE.Mesh(new THREE.PlaneGeometry(.72,1.18,5,7),cloth);cape.position.set(0,.05,-.35);cape.rotation.x=.08;cape.castShadow=true;chest.add(cape);
  for(const s of [-1,1]){
    const upper=bone(s<0?'LeftUpperArm':'RightUpperArm',.43*s,.27,0),lower=bone(s<0?'LeftLowerArm':'RightLowerArm',.42*s,-.02,0),hand=bone(s<0?'LeftHand':'RightHand',.31*s,-.02,0);chest.add(upper);upper.add(lower);lower.add(hand);
    limbBetween(chest,upper,.13,darkArmor);limbBetween(upper,lower,.115,armor);limbBetween(lower,hand,.095,trim);const pauldron=new THREE.Mesh(new THREE.SphereGeometry(.22,16,10),trim);pauldron.scale.set(1.45,.6,1.05);pauldron.position.set(.1*s,.02,0);upper.add(pauldron);
    const thigh=bone(s<0?'LeftUpLeg':'RightUpLeg',.21*s,-.02,0),shin=bone(s<0?'LeftLeg':'RightLeg',.025*s,-.62,0),foot=bone(s<0?'LeftFoot':'RightFoot',0,-.57,.08);hips.add(thigh);thigh.add(shin);shin.add(foot);limbBetween(hips,thigh,.175,cloth);limbBetween(thigh,shin,.15,armor);limbBetween(shin,foot,.13,darkArmor);const boot=armorPlate(.25,.15,.43,darkArmor);boot.position.set(0,-.04,.14);foot.add(boot);
  }
  const weaponRoot=bone('WeaponRoot',.03,-.02,0);group.getObjectByName('RightHand').add(weaponRoot);const bladeMat=new THREE.MeshPhysicalMaterial({color:0xcff5ff,metalness:.98,roughness:.07,clearcoat:.5,emissive:0x164a61,emissiveIntensity:2.2});const blade=new THREE.Mesh(new THREE.BoxGeometry(.075,1.6,.13,1,4,1),bladeMat);blade.position.y=.79;blade.castShadow=true;weaponRoot.add(blade);const guard=armorPlate(.62,.065,.13,trim);weaponRoot.add(guard);const pommel=new THREE.Mesh(new THREE.OctahedronGeometry(.12,0),trim);pommel.position.y=-.2;weaponRoot.add(pommel);weaponRoot.rotation.z=-.28;
  return{group,bones:{hips,spine,chest,head,leftFoot:group.getObjectByName('LeftFoot'),rightFoot:group.getObjectByName('RightFoot'),rightArm:group.getObjectByName('RightUpperArm')},weaponRoot};
}

export function createEnemyRig(){
  const group=new THREE.Group();group.name='EnemyRig';const dark=new THREE.MeshPhysicalMaterial({color:0x201b24,metalness:.75,roughness:.27,clearcoat:.15});const red=new THREE.MeshPhysicalMaterial({color:0x842d27,emissive:0x430d09,emissiveIntensity:2.1,metalness:.48,roughness:.32,clearcoat:.18});
  const hips=bone('EnemyHips',0,1.08,0),spine=bone('EnemySpine',0,.62,0),head=bone('EnemyHead',0,.57,0);hips.add(spine);spine.add(head);group.add(hips);const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.56,.92,10,18),dark);torso.position.y=.24;torso.castShadow=true;spine.add(torso);const chestPlate=armorPlate(1.05,.58,.34,red);chestPlate.position.set(0,.26,.18);spine.add(chestPlate);const helm=new THREE.Mesh(new THREE.IcosahedronGeometry(.42,2),red);helm.position.y=.16;helm.castShadow=true;head.add(helm);
  for(const s of [-1,1]){const horn=new THREE.Mesh(new THREE.ConeGeometry(.105,.72,10),red);horn.position.set(.28*s,.45,0);horn.rotation.z=.58*s;head.add(horn);const thigh=bone(s<0?'EnemyLeftUpLeg':'EnemyRightUpLeg',.25*s,-.02,0),shin=bone(s<0?'EnemyLeftLeg':'EnemyRightLeg',0,-.66,0),foot=bone(s<0?'EnemyLeftFoot':'EnemyRightFoot',0,-.58,.08);hips.add(thigh);thigh.add(shin);shin.add(foot);limbBetween(hips,thigh,.21,dark);limbBetween(thigh,shin,.18,red);}
  const armL=bone('EnemyArmL',-.58,.34,0),armR=bone('EnemyArmR',.58,.34,0);spine.add(armL,armR);limbBetween(spine,armL,.18,dark);limbBetween(spine,armR,.18,dark);const mace=new THREE.Mesh(new THREE.CylinderGeometry(.055,.065,1.36,10),dark);mace.position.y=-.62;mace.rotation.z=.15;armR.add(mace);const maceHead=new THREE.Mesh(new THREE.DodecahedronGeometry(.3,1),red);maceHead.position.y=-1.25;armR.add(maceHead);return{group,bones:{hips,spine,armR,head}};
}

export function createProceduralClips(rig){
  const q=e=>{const o=[];for(const [x,y,z] of e){const a=new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z));o.push(a.x,a.y,a.z,a.w);}return o;};const b=rig.group;
  const hips=rig.bones.hips,spine=rig.bones.spine,ra=b.getObjectByName('RightUpperArm'),la=b.getObjectByName('LeftUpperArm'),lt=b.getObjectByName('LeftUpLeg'),rt=b.getObjectByName('RightUpLeg'),ls=b.getObjectByName('LeftLeg'),rs=b.getObjectByName('RightLeg');
  const idle=new THREE.AnimationClip('idle',1.8,[new THREE.QuaternionKeyframeTrack(`${spine.name}.quaternion`,[0,.9,1.8],q([[0,0,0],[.03,0,.016],[0,0,0]]))]);
  const locomotion=(name,duration,stride,rootStep)=>{const t=[0,duration*.25,duration*.5,duration*.75,duration],tracks=[new THREE.VectorKeyframeTrack(`${hips.name}.position`,t,[0,1.02,0,0,1.05,rootStep*.25,0,1.02,rootStep*.5,0,1.05,rootStep*.75,0,1.02,rootStep])];if(lt)tracks.push(new THREE.QuaternionKeyframeTrack(`${lt.name}.quaternion`,t,q([[stride,0,0],[0,0,0],[-stride,0,0],[0,0,0],[stride,0,0]])));if(rt)tracks.push(new THREE.QuaternionKeyframeTrack(`${rt.name}.quaternion`,t,q([[-stride,0,0],[0,0,0],[stride,0,0],[0,0,0],[-stride,0,0]])));if(ls)tracks.push(new THREE.QuaternionKeyframeTrack(`${ls.name}.quaternion`,t,q([[0,0,0],[stride*.55,0,0],[stride*.2,0,0],[0,0,0],[0,0,0]])));if(rs)tracks.push(new THREE.QuaternionKeyframeTrack(`${rs.name}.quaternion`,t,q([[stride*.2,0,0],[0,0,0],[0,0,0],[stride*.55,0,0],[stride*.2,0,0]])));if(ra)tracks.push(new THREE.QuaternionKeyframeTrack(`${ra.name}.quaternion`,t,q([[-stride*.55,0,-.1],[0,0,-.1],[stride*.55,0,-.1],[0,0,-.1],[-stride*.55,0,-.1]])));if(la)tracks.push(new THREE.QuaternionKeyframeTrack(`${la.name}.quaternion`,t,q([[stride*.55,0,.1],[0,0,.1],[-stride*.55,0,.1],[0,0,.1],[stride*.55,0,.1]])));return new THREE.AnimationClip(name,duration,tracks);};
  const walk=locomotion('walk',.76,.42,.08),run=locomotion('run',.52,.67,.18);
  const attackTracks=[];if(ra)attackTracks.push(new THREE.QuaternionKeyframeTrack(`${ra.name}.quaternion`,[0,.11,.23,.38,.62],q([[0,0,-.2],[-.76,.2,-.95],[1.02,-.22,.62],[.16,0,-.08],[0,0,-.2]])));attackTracks.push(new THREE.VectorKeyframeTrack(`${hips.name}.position`,[0,.18,.34,.62],[0,1.02,0,0,1.0,-.04,0,1.02,-.72,0,1.02,0]));const attack=new THREE.AnimationClip('attack',.62,attackTracks);
  const dodge=new THREE.AnimationClip('dodge',.5,[new THREE.VectorKeyframeTrack(`${hips.name}.position`,[0,.12,.3,.5],[0,1.02,0,0,.9,.18,0,.88,-1.8,0,1.02,-2.35]),new THREE.QuaternionKeyframeTrack(`${spine.name}.quaternion`,[0,.16,.34,.5],q([[0,0,0],[-.35,0,.08],[-.15,0,-.05],[0,0,0]]))]);
  const hit=new THREE.AnimationClip('hit',.38,[new THREE.QuaternionKeyframeTrack(`${spine.name}.quaternion`,[0,.08,.2,.38],q([[0,0,0],[-.24,.06,.09],[-.1,0,0],[0,0,0]]))]);
  const death=new THREE.AnimationClip('death',1.2,[new THREE.QuaternionKeyframeTrack(`${spine.name}.quaternion`,[0,.3,.7,1.2],q([[0,0,0],[-.32,.1,.12],[-1.0,.15,.18],[-1.3,.18,.14]]))]);return{idle,walk,run,attack,dodge,hit,death};
}
