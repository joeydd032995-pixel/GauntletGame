import * as THREE from 'three';

function bone(name,x=0,y=0,z=0){const b=new THREE.Bone();b.name=name;b.position.set(x,y,z);return b;}
function limbBetween(parent,child,radius,material){
  const v=child.position.clone(); const len=v.length();
  const mesh=new THREE.Mesh(new THREE.CapsuleGeometry(radius,Math.max(.05,len-radius*2),6,10),material);
  mesh.position.copy(v).multiplyScalar(.5); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.clone().normalize()); mesh.castShadow=true; parent.add(mesh); return mesh;
}

export function createHeroRig(){
  const group=new THREE.Group(); group.name='HeroRig';
  const armor=new THREE.MeshStandardMaterial({color:0x526b75,metalness:.78,roughness:.28});
  const trim=new THREE.MeshStandardMaterial({color:0xc7a35e,metalness:.88,roughness:.2});
  const cloth=new THREE.MeshStandardMaterial({color:0x153945,roughness:.8});
  const skin=new THREE.MeshStandardMaterial({color:0xc88f70,roughness:.7});
  const hips=bone('Hips',0,1.02,0), spine=bone('Spine',0,.52,0), chest=bone('Chest',0,.48,0), neck=bone('Neck',0,.34,0), head=bone('Head',0,.26,0);
  hips.add(spine);spine.add(chest);chest.add(neck);neck.add(head);group.add(hips);
  const headMesh=new THREE.Mesh(new THREE.SphereGeometry(.28,20,14),skin);headMesh.position.y=.16;headMesh.castShadow=true;head.add(headMesh);
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.42,.62,8,14),armor);torso.position.y=.15;torso.castShadow=true;spine.add(torso);
  const mantle=new THREE.Mesh(new THREE.TorusGeometry(.43,.09,10,24,Math.PI*1.35),trim);mantle.rotation.x=Math.PI/2;mantle.rotation.z=-.65;mantle.position.y=.35;chest.add(mantle);
  for(const s of [-1,1]){
    const upper=bone(s<0?'LeftUpperArm':'RightUpperArm',.43*s,.3,0),lower=bone(s<0?'LeftLowerArm':'RightLowerArm',.42*s,-.02,0),hand=bone(s<0?'LeftHand':'RightHand',.33*s,-.02,0);
    chest.add(upper);upper.add(lower);lower.add(hand);limbBetween(chest,upper,.13,armor);limbBetween(upper,lower,.115,armor);limbBetween(lower,hand,.1,trim);
    const thigh=bone(s<0?'LeftUpLeg':'RightUpLeg',.22*s,-.02,0),shin=bone(s<0?'LeftLeg':'RightLeg',.03*s,-.63,0),foot=bone(s<0?'LeftFoot':'RightFoot',0,-.58,.08);
    hips.add(thigh);thigh.add(shin);shin.add(foot);limbBetween(hips,thigh,.18,cloth);limbBetween(thigh,shin,.16,armor);limbBetween(shin,foot,.14,armor);
    const boot=new THREE.Mesh(new THREE.BoxGeometry(.26,.16,.45),armor);boot.position.set(0,-.05,.14);boot.castShadow=true;foot.add(boot);
  }
  const weaponRoot=bone('WeaponRoot',.05,-.05,0);group.getObjectByName('RightHand').add(weaponRoot);
  const blade=new THREE.Mesh(new THREE.BoxGeometry(.09,1.55,.15),new THREE.MeshStandardMaterial({color:0xc9f1ff,metalness:.95,roughness:.1,emissive:0x16495e,emissiveIntensity:1.8}));blade.position.y=.76;blade.castShadow=true;weaponRoot.add(blade);
  const guard=new THREE.Mesh(new THREE.BoxGeometry(.58,.07,.12),trim);weaponRoot.add(guard);weaponRoot.rotation.z=-.3;
  return {group,bones:{hips,spine,chest,head,leftFoot:group.getObjectByName('LeftFoot'),rightFoot:group.getObjectByName('RightFoot'),rightArm:group.getObjectByName('RightUpperArm')},weaponRoot};
}

export function createEnemyRig(){
  const group=new THREE.Group();group.name='EnemyRig';
  const dark=new THREE.MeshStandardMaterial({color:0x211b23,metalness:.68,roughness:.34});
  const red=new THREE.MeshStandardMaterial({color:0x752723,emissive:0x3b0e0b,emissiveIntensity:1.7,metalness:.42,roughness:.42});
  const hips=bone('EnemyHips',0,1.08,0),spine=bone('EnemySpine',0,.62,0),head=bone('EnemyHead',0,.58,0);hips.add(spine);spine.add(head);group.add(hips);
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.58,.9,8,14),dark);torso.position.y=.25;torso.castShadow=true;spine.add(torso);
  const helm=new THREE.Mesh(new THREE.IcosahedronGeometry(.42,1),red);helm.position.y=.15;helm.castShadow=true;head.add(helm);
  for(const s of [-1,1]){const horn=new THREE.Mesh(new THREE.ConeGeometry(.11,.7,8),red);horn.position.set(.26*s,.45,0);horn.rotation.z=.55*s;head.add(horn);}
  const armL=bone('EnemyArmL',-.58,.35,0),armR=bone('EnemyArmR',.58,.35,0);spine.add(armL,armR);limbBetween(spine,armL,.18,dark);limbBetween(spine,armR,.18,dark);
  const mace=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,1.3,8),dark);mace.position.y=-.6;mace.rotation.z=.15;armR.add(mace);const maceHead=new THREE.Mesh(new THREE.DodecahedronGeometry(.28,0),red);maceHead.position.y=-1.22;armR.add(maceHead);
  return {group,bones:{hips,spine,armR,head}};
}

export function createProceduralClips(rig){
  const tracks=[];
  const hips=rig.bones.hips, spine=rig.bones.spine, arm=rig.bones.rightArm;
  const q=(e)=>{const o=[];for(const [x,y,z] of e){const a=new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z));o.push(a.x,a.y,a.z,a.w);}return o;};
  const idle=new THREE.AnimationClip('idle',1.6,[new THREE.QuaternionKeyframeTrack(`${spine.name}.quaternion`,[0,.8,1.6],q([[0,0,0],[.035,0,.018],[0,0,0]]))]);
  const walk=new THREE.AnimationClip('walk',.78,[new THREE.VectorKeyframeTrack(`${hips.name}.position`,[0,.195,.39,.585,.78],[0,1.02,0, 0,1.05,.03, 0,1.02,0, 0,1.05,-.03, 0,1.02,0])]);
  const run=new THREE.AnimationClip('run',.54,[new THREE.VectorKeyframeTrack(`${hips.name}.position`,[0,.135,.27,.405,.54],[0,1.02,0, 0,1.08,.08, 0,1.02,0, 0,1.08,-.08, 0,1.02,0])]);
  const attackTracks=[];if(arm)attackTracks.push(new THREE.QuaternionKeyframeTrack(`${arm.name}.quaternion`,[0,.12,.25,.4,.62],q([[0,0,-.2],[-.7,.2,-.9],[.95,-.2,.55],[.2,0,-.1],[0,0,-.2]])));
  attackTracks.push(new THREE.VectorKeyframeTrack(`${hips.name}.position`,[0,.2,.36,.62],[0,1.02,0,0,1.02,-.05,0,1.02,-.58,0,1.02,0]));
  const attack=new THREE.AnimationClip('attack',.62,attackTracks);
  const dodge=new THREE.AnimationClip('dodge',.48,[new THREE.VectorKeyframeTrack(`${hips.name}.position`,[0,.12,.3,.48],[0,1.02,0,0,.9,.15,0,.9,-1.6,0,1.02,-2.2])]);
  return {idle,walk,run,attack,dodge};
}
