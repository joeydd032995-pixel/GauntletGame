import { AnimationGraph } from './animation.js';
import { installAuthoredActor } from './authoredCharacterRuntime.js';

const previousUpdate=AnimationGraph.prototype.update;
const actors=new WeakMap();
const status={target:'high-end OSRS/07Scape',ready:false,accepted:false,error:null,hero:null,enemy:null};
if(typeof window!=='undefined')window.__GAUNTLET_AUTHORED_CHARACTERS__=status;

function refresh(){
  const entries=[status.hero,status.enemy];
  status.ready=entries.every(Boolean)&&entries.every(s=>s.ready);
  const errors=entries.filter(Boolean).map(s=>s.error).filter(Boolean);status.error=errors.length?errors.join(' | '):null;
}
function roleFor(graph){const name=graph?.root?.name||'';if(name==='HeroRig')return'hero';if(name==='EnemyRig')return'enemy';return null;}
function ensure(graph){
  if(actors.has(graph))return actors.get(graph);const role=roleFor(graph);if(!role)return null;
  const actor=installAuthoredActor(graph.root,role);actors.set(graph,actor);status[role]=actor.status;actor.load.then(refresh);refresh();return actor;
}
AnimationGraph.prototype.update=function authoredPresentationUpdate(dt,...args){
  const actor=ensure(this),result=previousUpdate.call(this,dt,...args);if(actor)actor.update(dt,this.state,this.speed);refresh();return result;
};
