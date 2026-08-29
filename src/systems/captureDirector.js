import * as THREE from 'three';

const ACTION_SPEED={idle:0,walk:2.3,run:5.2,sprint:8.2};
const VIEW_ANGLES={front:0,threeQuarter:Math.PI*.25,side:Math.PI*.5,rear:Math.PI};

export class CharacterCaptureDirector{
  constructor({camera,hero,enemy,heroAnim,enemyAnim,heightFn}){
    this.camera=camera;this.hero=hero;this.enemy=enemy;this.heroAnim=heroAnim;this.enemyAnim=enemyAnim;this.heightFn=heightFn;
    this.active=false;this.subject='hero';this.action='idle';this.angle=0;this.distance=5.2;this.height=1.25;this.fov=42;this.neutral=false;this.sequenceId=0;
    this.tmp=new THREE.Vector3();this.look=new THREE.Vector3();
  }
  enter({subject='hero',action='idle',view='front',angle=null,distance=5.2,height=1.25,fov=42,neutral=false}={}){
    this.active=true;this.subject=subject;this.action=action;this.angle=angle??VIEW_ANGLES[view]??0;this.distance=distance;this.height=height;this.fov=fov;this.neutral=neutral;this.sequenceId++;
    this.#trigger();return this.snapshot();
  }
  exit(){this.active=false;this.camera.fov=54;this.camera.updateProjectionMatrix();}
  setAngle(degrees){this.angle=THREE.MathUtils.degToRad(degrees);return this.snapshot();}
  setAction(action){this.action=action;this.sequenceId++;this.#trigger();return this.snapshot();}
  setSubject(subject){this.subject=subject;this.sequenceId++;this.#trigger();return this.snapshot();}
  update(dt){
    if(!this.active)return false;
    const subject=this.subject==='enemy'?this.enemy:this.hero,anim=this.subject==='enemy'?this.enemyAnim:this.heroAnim;
    const speed=this.subject==='hero'?(ACTION_SPEED[this.action]??0):(this.action==='enemyWalk'?2.8:0);
    anim.setLocomotion({speed,angularSpeed:0,grounded:true,combat:this.action!=='idle'&&this.action!=='walk',direction:0,dt});
    const center=subject.getWorldPosition(this.look);center.y=this.heightFn(center.x,center.z)+1.25;
    const horizontal=Math.cos(.12)*this.distance;
    this.camera.position.set(center.x+Math.sin(this.angle)*horizontal,center.y+this.height,center.z+Math.cos(this.angle)*horizontal);
    this.camera.fov=this.fov;this.camera.updateProjectionMatrix();this.camera.lookAt(center);return true;
  }
  snapshot(){const anim=this.subject==='enemy'?this.enemyAnim:this.heroAnim;return{active:this.active,subject:this.subject,action:this.action,angleDegrees:+THREE.MathUtils.radToDeg(this.angle).toFixed(1),distance:this.distance,height:this.height,fov:this.fov,neutral:this.neutral,sequenceId:this.sequenceId,animation:anim.getTelemetry()};}
  #trigger(){const anim=this.subject==='enemy'?this.enemyAnim:this.heroAnim,a=this.action;if(a==='idle'||a==='walk'||a==='run'||a==='sprint'||a==='enemyIdle'||a==='enemyWalk')return;anim.trigger(a,{fade:.025,loop:false});}
}

export const matchedCapturePresets={
  portrait:{view:'front',distance:4.6,height:1.15,fov:38},
  gameplayRear:{view:'rear',distance:5.8,height:1.35,fov:46},
  combatThreeQuarter:{view:'threeQuarter',distance:5.4,height:1.2,fov:42},
  silhouetteSide:{view:'side',distance:5.0,height:1.15,fov:40}
};
