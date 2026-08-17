import * as THREE from 'three';

export class EnemyCombatBrain {
  constructor({ body, rig, animation, vfx, audio, targetBody }) {
    this.body=body;this.rig=rig;this.animation=animation;this.vfx=vfx;this.audio=audio;this.targetBody=targetBody;
    this.state='idle';this.timer=0;this.cooldown=1;this.attackIndex=0;this.telegraph=0;this.hitCommitted=false;this.lastDistance=Infinity;
    this.tmp=new THREE.Vector3();
  }

  update(dt) {
    const enemyPos=this.body.position,targetPos=this.targetBody.position;
    this.tmp.subVectors(targetPos,enemyPos);const d=this.tmp.length();this.lastDistance=d;this.timer=Math.max(0,this.timer-dt);this.cooldown=Math.max(0,this.cooldown-dt);
    if(this.state==='dead'){this.body.desiredVelocity.set(0,0,0);return{damage:0};}

    if(this.state==='windup'){
      this.body.desiredVelocity.set(0,0,0);this.telegraph=1-this.timer/.62;
      if(this.timer<=0){this.state='strike';this.timer=.2;this.hitCommitted=false;this.animation.trigger('enemyAttack',{fade:.035});this.vfx?.groundBurst(enemyPos.clone(),{color:0xff5e42,radius:1.1});this.audio?.playWhoosh(enemyPos.clone().add(new THREE.Vector3(0,1.5,0)),.8);}
      return{damage:0,telegraph:this.telegraph};
    }

    if(this.state==='strike'){
      this.body.desiredVelocity.copy(this.tmp.setY(0).normalize()).multiplyScalar(4.6);
      if(!this.hitCommitted&&this.timer<.12){this.hitCommitted=true;const hit=d<3.2;if(hit){this.vfx?.impact(targetPos.clone().add(new THREE.Vector3(0,1.25,0)),{color:0xff6b55,count:20,scale:1.15});this.audio?.playImpact(targetPos,1);}return{damage:hit?16:0};}
      if(this.timer<=0){this.state='recover';this.timer=.55;this.body.desiredVelocity.set(0,0,0);}
      return{damage:0};
    }

    if(this.state==='recover'){
      this.body.desiredVelocity.set(0,0,0);if(this.timer<=0){this.state='chase';this.cooldown=.7+.45*Math.random();}return{damage:0};
    }

    if(d<3.4&&this.cooldown<=0){this.state='windup';this.timer=.62;this.telegraph=0;this.body.desiredVelocity.set(0,0,0);return{damage:0,telegraph:0};}
    if(d<15){this.state='chase';this.body.desiredVelocity.copy(this.tmp.setY(0).normalize()).multiplyScalar(d>7?3.8:2.7);}
    else{this.state='idle';this.body.desiredVelocity.set(0,0,0);}
    return{damage:0};
  }

  kill(){this.state='dead';this.body.desiredVelocity.set(0,0,0);this.animation.trigger('death',{fade:.08});}
}
