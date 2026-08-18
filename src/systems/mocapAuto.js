import { AnimationGraph } from './animation.js';
import { MocapRetargetLibrary, CMU_MOCAP_SET } from './mocapRetarget.js';

const originalUpdate=AnimationGraph.prototype.update;
function replaceGraphClip(graph,name,clip){
  const old=graph.actions.get(name);if(old){old.stop();const oldClip=old.getClip();graph.actions.delete(name);try{graph.mixer.uncacheClip(oldClip);}catch{}}
  graph.motionMatcher.samples=graph.motionMatcher.samples.filter(s=>s.name!==name);
  graph.addClip(name,clip);
}
async function install(graph){
  const library=new MocapRetargetLibrary(graph.root,{fps:60});
  window.__GAUNTLET_MOCAP__={status:'loading',installed:[],report:library.report};
  try{
    const clips=await library.loadSet(CMU_MOCAP_SET),installed=[];
    for(const name of ['walk','run']){
      const clip=clips[name];if(!clip)continue;
      const record=library.report.loaded.find(r=>r.name===name);
      if(!record||record.tracks<10||clip.duration<.35||clip.duration>8)continue;
      replaceGraphClip(graph,name,clip);installed.push(name);
    }
    window.__GAUNTLET_MOCAP__={status:installed.length===2?'ready':'partial',installed,report:library.report};
  }catch(error){window.__GAUNTLET_MOCAP__={status:'rejected',installed:[],error:error.message,report:library.report};}
}

if(!AnimationGraph.prototype.__gauntletMocapPatched){
  AnimationGraph.prototype.__gauntletMocapPatched=true;
  AnimationGraph.prototype.update=function(...args){
    if(this.root?.name==='HeroRig'&&!this.__gauntletMocapStarted){this.__gauntletMocapStarted=true;install(this);}
    return originalUpdate.apply(this,args);
  };
}
