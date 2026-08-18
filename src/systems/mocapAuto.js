import { AnimationGraph } from './animation.js';
import { MocapRetargetLibrary, CMU_RUNTIME_SET } from './mocapRetarget.js';

const originalUpdate=AnimationGraph.prototype.update;
function replaceGraphClip(graph,name,clip){const old=graph.actions.get(name);if(old){old.stop();const oldClip=old.getClip();graph.actions.delete(name);try{graph.mixer.uncacheClip(oldClip);}catch{}}graph.motionMatcher.samples=graph.motionMatcher.samples.filter(s=>s.name!==name);graph.addClip(name,clip);}
async function install(graph){
  const library=new MocapRetargetLibrary(graph.root,{fps:60}),started=performance.now();
  window.__GAUNTLET_MOCAP__={status:'loading',installed:[],startedAt:Date.now(),report:library.report};
  const results=await Promise.allSettled(CMU_RUNTIME_SET.map(def=>library.load(def.url,def).then(clip=>({name:def.name,clip}))));
  const installed=[],errors=[];
  for(const result of results){if(result.status==='rejected'){errors.push(result.reason?.message||String(result.reason));continue;}const {name,clip}=result.value,record=library.report.loaded.find(r=>r.name===name);if(!record||record.tracks<10||clip.duration<.35||clip.duration>4){errors.push(`${name} validation rejected duration=${clip.duration}, tracks=${record?.tracks||0}`);continue;}replaceGraphClip(graph,name,clip);installed.push(name);}
  window.__GAUNTLET_MOCAP__={status:installed.length===2?'ready':installed.length?'partial':'rejected',installed,totalMs:+(performance.now()-started).toFixed(1),errors,report:library.report};
}
if(!AnimationGraph.prototype.__gauntletMocapPatched){AnimationGraph.prototype.__gauntletMocapPatched=true;AnimationGraph.prototype.update=function(...args){if(this.root?.name==='HeroRig'&&!this.__gauntletMocapStarted){this.__gauntletMocapStarted=true;install(this).catch(error=>{window.__GAUNTLET_MOCAP__={status:'rejected',installed:[],error:error.message};});}return originalUpdate.apply(this,args);};}
