import * as THREE from 'three';
import { AnimationGraph } from './animation.js';
import { MocapRetargetLibrary, CMU_RUNTIME_SET } from './mocapRetarget.js';

const originalUpdate=AnimationGraph.prototype.update;
const MOCAP_BONES=new Set(['Hips','LeftUpLeg','LeftLeg','LeftFoot','RightUpLeg','RightLeg','RightFoot']);
function boneOf(track){return track.name.split('.')[0];}
function tileTrack(track,sourceDuration,targetDuration,fps=60){
  const size=track.getValueSize(),times=[],values=[],buffer=new Float32Array(size),interp=track.createInterpolant(buffer),step=1/fps;
  for(let t=0;t<targetDuration-1e-5;t+=step){const local=sourceDuration>0?t%sourceDuration:0;times.push(t);interp.evaluate(local);for(let i=0;i<size;i++)values.push(buffer[i]);}
  times.push(targetDuration);interp.evaluate(sourceDuration>0?targetDuration%sourceDuration:0);for(let i=0;i<size;i++)values.push(buffer[i]);
  const C=track.constructor,next=new C(track.name,times,values);next.setInterpolation(track.getInterpolation());return next;
}
function hybridize(authored,mocap,name){
  const tracks=mocap.tracks.filter(t=>MOCAP_BONES.has(boneOf(t))).map(t=>t.clone());
  for(const track of authored.tracks){if(MOCAP_BONES.has(boneOf(track)))continue;tracks.push(tileTrack(track,authored.duration,mocap.duration,60));}
  const clip=new THREE.AnimationClip(name,mocap.duration,tracks);clip.optimize();clip.userData={source:'cmu-lower+gauntlet-authored-upper',mocapBones:[...MOCAP_BONES]};return clip;
}
function replaceGraphClip(graph,name,mocap){
  const old=graph.actions.get(name),authored=old?.getClip();const clip=authored?hybridize(authored,mocap,name):mocap;
  if(old){old.stop();graph.actions.delete(name);try{graph.mixer.uncacheClip(authored);}catch{}}
  graph.motionMatcher.samples=graph.motionMatcher.samples.filter(s=>s.name!==name);graph.addClip(name,clip);return clip;
}
async function install(graph){
  const library=new MocapRetargetLibrary(graph.root,{fps:60}),started=performance.now();window.__GAUNTLET_MOCAP__={status:'loading',installed:[],startedAt:Date.now(),report:library.report};
  const results=await Promise.allSettled(CMU_RUNTIME_SET.map(def=>library.load(def.url,def).then(clip=>({name:def.name,clip}))));const installed=[],errors=[],hybrids=[];
  for(const result of results){if(result.status==='rejected'){errors.push(result.reason?.message||String(result.reason));continue;}const{name,clip}=result.value,record=library.report.loaded.find(r=>r.name===name);if(!record||record.tracks<10||clip.duration<.35||clip.duration>4){errors.push(`${name} validation rejected duration=${clip.duration}, tracks=${record?.tracks||0}`);continue;}const finalClip=replaceGraphClip(graph,name,clip);installed.push(name);hybrids.push({name,duration:+finalClip.duration.toFixed(3),tracks:finalClip.tracks.length,source:finalClip.userData?.source||'mocap'});}
  window.__GAUNTLET_MOCAP__={status:installed.length===2?'ready':installed.length?'partial':'rejected',installed,hybrids,totalMs:+(performance.now()-started).toFixed(1),errors,report:library.report};
}
if(!AnimationGraph.prototype.__gauntletMocapPatched){AnimationGraph.prototype.__gauntletMocapPatched=true;AnimationGraph.prototype.update=function(...args){if(this.root?.name==='HeroRig'&&!this.__gauntletMocapStarted){this.__gauntletMocapStarted=true;install(this).catch(error=>{window.__GAUNTLET_MOCAP__={status:'rejected',installed:[],error:error.message};});}return originalUpdate.apply(this,args);};}
