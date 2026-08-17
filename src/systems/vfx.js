import * as THREE from 'three';

export class CombatVFX {
  constructor(scene, camera) {
    this.scene = scene; this.camera = camera; this.fx = []; this.impulse = 0; this.hitStop = 0;
    this.sparkGeo = new THREE.IcosahedronGeometry(.045, 0);
    this.sparkMat = new THREE.MeshBasicMaterial({ color:0xffd89b, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false });
  }
  slash({ origin, direction, color=0x8de9ff, length=2.4 }) {
    const g=new THREE.Group();
    const mat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.95,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false});
    const arc=new THREE.Mesh(new THREE.RingGeometry(.7,length,48,1,-1.15,2.3),mat); arc.rotation.x=Math.PI/2; g.add(arc);
    g.position.copy(origin); g.lookAt(origin.clone().add(direction)); this.scene.add(g);
    this.fx.push({o:g,life:.22,max:.22,kind:'fadeScale'}); this.cameraImpulse(.16); this.hitStop=.035;
  }
  impact(position,{color=0xffcf7c,count=14,scale=1}={}){
    for(let i=0;i<count;i++){const m=new THREE.Mesh(this.sparkGeo,this.sparkMat.clone());m.material.color.setHex(color);m.position.copy(position);this.scene.add(m);const v=new THREE.Vector3((Math.random()-.5)*5,Math.random()*4+1,(Math.random()-.5)*5).multiplyScalar(scale);this.fx.push({o:m,v,life:.35+Math.random()*.18,max:.5,kind:'particle'});}
    const ring=new THREE.Mesh(new THREE.RingGeometry(.12,.2,32),new THREE.MeshBasicMaterial({color,transparent:true,opacity:1,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}));ring.position.copy(position);ring.lookAt(this.camera.position);this.scene.add(ring);this.fx.push({o:ring,life:.28,max:.28,kind:'ring'});this.cameraImpulse(.23);this.hitStop=Math.max(this.hitStop,.045);
  }
  groundBurst(position,{color=0x5edcff,radius=3.2}={}){
    const mat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false});
    const ring=new THREE.Mesh(new THREE.RingGeometry(.3,.42,64),mat);ring.rotation.x=-Math.PI/2;ring.position.copy(position).add(new THREE.Vector3(0,.04,0));this.scene.add(ring);this.fx.push({o:ring,life:.62,max:.62,kind:'burst',radius});this.cameraImpulse(.28);
  }
  cameraImpulse(amount){this.impulse=Math.max(this.impulse,amount);}
  update(dt){
    const scaled=this.hitStop>0?0:dt; this.hitStop=Math.max(0,this.hitStop-dt); this.impulse=THREE.MathUtils.damp(this.impulse,0,12,dt);
    for(let i=this.fx.length-1;i>=0;i--){const f=this.fx[i];f.life-=dt;const t=Math.max(0,f.life/f.max);if(f.kind==='particle'){f.v.y-=12*dt;f.o.position.addScaledVector(f.v,dt);f.o.scale.setScalar(t*.8+.2);f.o.material.opacity=t;}else if(f.kind==='ring'){f.o.scale.setScalar(1+(1-t)*6);f.o.material.opacity=t;}else if(f.kind==='burst'){const s=1+(1-t)*f.radius*2;f.o.scale.setScalar(s);f.o.material.opacity=t*.8;}else{f.o.scale.setScalar(1+(1-t)*.9);f.o.traverse(x=>{if(x.material)x.material.opacity=t;});}if(f.life<=0){this.scene.remove(f.o);f.o.traverse?.(x=>{x.material?.dispose?.();});this.fx.splice(i,1);}}
    return scaled;
  }
}
