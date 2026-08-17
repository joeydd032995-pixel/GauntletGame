import * as THREE from 'three';

export class ThirdPersonCameraRig {
  constructor(camera,{heightFn}={}){
    this.camera=camera;this.heightFn=heightFn;this.yaw=0;this.pitch=.23;this.distance=5.9;this.shoulder=1.22;this.position=new THREE.Vector3();this.look=new THREE.Vector3();this.desired=new THREE.Vector3();this.targetLook=new THREE.Vector3();this.tmp=new THREE.Vector3();this.tmp2=new THREE.Vector3();this.shake=0;this.combatBlend=0;this.initialized=false;
  }
  orbit(dx,dy){this.yaw-=dx*.0042;this.pitch=THREE.MathUtils.clamp(this.pitch-dy*.0035,-.02,.58);}
  impulse(v){this.shake=Math.max(this.shake,v);}
  update(dt,{player,target=null,combat=false,impulse=0}){
    this.combatBlend=THREE.MathUtils.damp(this.combatBlend,combat?1:0,5,dt);this.shake=Math.max(this.shake,impulse);this.shake=THREE.MathUtils.damp(this.shake,0,13,dt);
    const playerFocus=this.tmp.copy(player).add(new THREE.Vector3(0,1.42,0));
    if(target&&combat){const targetFocus=this.tmp2.copy(target).add(new THREE.Vector3(0,1.35,0));this.targetLook.copy(playerFocus).lerp(targetFocus,.43);const d=player.distanceTo(target);this.distance=THREE.MathUtils.damp(this.distance,THREE.MathUtils.clamp(5.75+d*.075,5.75,6.65),3.4,dt);}else{this.targetLook.copy(playerFocus);this.distance=THREE.MathUtils.damp(this.distance,5.8,3,dt);}
    const cp=Math.cos(this.pitch),sp=Math.sin(this.pitch),back=new THREE.Vector3(Math.sin(this.yaw)*cp,0,Math.cos(this.yaw)*cp),right=new THREE.Vector3(Math.cos(this.yaw),0,-Math.sin(this.yaw));
    this.desired.copy(playerFocus).addScaledVector(back,this.distance).addScaledVector(right,this.shoulder*(.55+.45*this.combatBlend));this.desired.y+=1.2+sp*this.distance;
    if(this.heightFn){const ground=this.heightFn(this.desired.x,this.desired.z);this.desired.y=Math.max(this.desired.y,ground+.68);this.#terrainOcclusion(playerFocus,this.desired);}
    if(this.shake>.001)this.desired.add(new THREE.Vector3((Math.random()-.5)*this.shake,(Math.random()-.5)*this.shake*.65,(Math.random()-.5)*this.shake));
    if(!this.initialized){this.position.copy(this.desired);this.look.copy(this.targetLook);this.initialized=true;}else{const posLambda=combat?13:10,lookLambda=combat?15:11;this.position.lerp(this.desired,1-Math.exp(-dt*posLambda));this.look.lerp(this.targetLook,1-Math.exp(-dt*lookLambda));}
    this.camera.position.copy(this.position);this.camera.lookAt(this.look);
  }
  #terrainOcclusion(focus,candidate){const delta=this.tmp2.copy(candidate).sub(focus),len=delta.length();if(len<.2)return;const dir=delta.clone().normalize();let allowed=len;for(let d=.6;d<len;d+=.35){const p=this.tmp.copy(focus).addScaledVector(dir,d),g=this.heightFn(p.x,p.z)+.32;if(p.y<g){allowed=Math.max(.75,d-.45);break;}}if(allowed<len)candidate.copy(focus).addScaledVector(dir,allowed);}
}
