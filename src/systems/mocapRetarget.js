import * as THREE from 'three';
import { BVHLoader } from 'three/addons/loaders/BVHLoader.js';

const SOURCE_TO_TARGET={
  Hips:'Hips',Spine:'Spine',Spine1:'Chest',Neck1:'Neck',Head:'Head',
  LeftArm:'LeftUpperArm',LeftForeArm:'LeftLowerArm',LeftHand:'LeftHand',
  RightArm:'RightUpperArm',RightForeArm:'RightLowerArm',RightHand:'RightHand',
  LeftUpLeg:'LeftUpLeg',LeftLeg:'LeftLeg',LeftFoot:'LeftFoot',
  RightUpLeg:'RightUpLeg',RightLeg:'RightLeg',RightFoot:'RightFoot'
};

function parseTrackName(name){
  let m=name.match(/\.bones\[([^\]]+)\]\.(position|quaternion)$/);if(m)return{bone:m[1],property:m[2]};
  m=name.match(/^([^\.]+)\.(position|quaternion)$/);if(m)return{bone:m[1],property:m[2]};
  return null;
}
function estimateTargetLeg(root){
  const hip=root.getObjectByName('Hips'),foot=root.getObjectByName('LeftFoot');if(!hip||!foot)return 1;
  root.updateMatrixWorld(true);const a=hip.getWorldPosition(new THREE.Vector3()),b=foot.getWorldPosition(new THREE.Vector3());return Math.max(.4,a.distanceTo(b));
}
function estimateSourceLeg(skeleton){
  const byName=Object.fromEntries(skeleton.bones.map(b=>[b.name,b])),hip=byName.Hips,foot=byName.LeftFoot;if(!hip||!foot)return 10;
  hip.updateMatrixWorld(true);return Math.max(.01,hip.getWorldPosition(new THREE.Vector3()).distanceTo(foot.getWorldPosition(new THREE.Vector3())));
}
function resampleTrack(track,name,duration,fps=60){
  const size=track.getValueSize(),times=[],values=[],out=new Float32Array(size),interp=track.createInterpolant(out),step=1/fps;
  for(let t=0;t<duration-1e-5;t+=step){times.push(t);interp.evaluate(t);for(let i=0;i<size;i++)values.push(out[i]);}
  times.push(duration);interp.evaluate(duration);for(let i=0;i<size;i++)values.push(out[i]);
  const C=track.constructor;const next=new C(name,times,values);next.setInterpolation(track.getInterpolation());return next;
}
function normalizeRootTrack(track,targetRestY,scale){
  const values=Array.from(track.values),x0=values[0],y0=values[1],z0=values[2];
  for(let i=0;i<values.length;i+=3){values[i]=(values[i]-x0)*scale;values[i+1]=targetRestY+(values[i+1]-y0)*scale;values[i+2]=(values[i+2]-z0)*scale;}
  return new THREE.VectorKeyframeTrack(track.name,track.times,values);
}
function trimClip(clip,startSeconds=0,endSeconds=null){
  const end=endSeconds==null?clip.duration:Math.min(endSeconds,clip.duration);if(startSeconds<=0&&end>=clip.duration)return clip;
  const tracks=[];for(const tr of clip.tracks){const size=tr.getValueSize(),times=[],values=[];for(let i=0;i<tr.times.length;i++){const t=tr.times[i];if(t<startSeconds||t>end)continue;times.push(t-startSeconds);for(let j=0;j<size;j++)values.push(tr.values[i*size+j]);}if(times.length>=2)tracks.push(new tr.constructor(tr.name,times,values));}
  return new THREE.AnimationClip(clip.name,Math.max(.001,end-startSeconds),tracks);
}

export class MocapRetargetLibrary{
  constructor(targetRig,{fps=60}={}){this.target=targetRig.group||targetRig;this.fps=fps;this.loader=new BVHLoader();this.loader.animateBonePositions=true;this.loader.animateBoneRotations=true;this.report={loaded:[],rejected:[]};}
  async load(url,{name='mocap',trimStart=0,trimEnd=null,rootScale=null,rootMotion=true,boneMap=SOURCE_TO_TARGET}={}){
    const result=await this.loader.loadAsync(url),sourceClip=trimClip(result.clip,trimStart,trimEnd),scale=rootScale??estimateTargetLeg(this.target)/estimateSourceLeg(result.skeleton),targetHip=this.target.getObjectByName('Hips'),tracks=[];
    for(const track of sourceClip.tracks){const parsed=parseTrackName(track.name);if(!parsed)continue;const targetName=boneMap[parsed.bone];if(!targetName||!this.target.getObjectByName(targetName))continue;
      const mappedName=`${targetName}.${parsed.property}`;let mapped=resampleTrack(track,mappedName,sourceClip.duration,this.fps);
      if(parsed.bone==='Hips'&&parsed.property==='position'){
        if(!rootMotion)continue;mapped=normalizeRootTrack(mapped,targetHip?.position.y??1.02,scale);
      }else if(parsed.property==='position')continue;
      tracks.push(mapped);
    }
    const clip=new THREE.AnimationClip(name,sourceClip.duration,tracks);clip.optimize();
    const required=['Hips','LeftUpLeg','RightUpLeg','LeftLeg','RightLeg'];const animated=new Set(tracks.map(t=>t.name.split('.')[0])),missing=required.filter(n=>!animated.has(n));
    const record={url,name,duration:+clip.duration.toFixed(3),tracks:tracks.length,scale:+scale.toFixed(5),missing};
    if(tracks.length<8||missing.length){this.report.rejected.push(record);throw new Error(`Mocap ${name} rejected: tracks=${tracks.length}, missing=${missing.join(',')}`);}this.report.loaded.push(record);return clip;
  }
  async loadSet(definitions){const clips={};for(const d of definitions){try{clips[d.name]=await this.load(d.url,d);}catch(e){this.report.rejected.push({name:d.name,url:d.url,error:e.message});}}return clips;}
}

export const CMU_MOCAP_SET=[
  {name:'walk',url:'/mocap/cmu/17_08.bvh',trimStart:.05,rootMotion:true},
  {name:'run',url:'/mocap/cmu/16_35.bvh',trimStart:.05,rootMotion:true},
  {name:'stopRun',url:'/mocap/cmu/16_57.bvh',trimStart:.05,rootMotion:true},
  {name:'swordReference',url:'/mocap/cmu/02_07.bvh',trimStart:.05,rootMotion:true}
];
