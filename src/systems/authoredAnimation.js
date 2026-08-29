import * as THREE from 'three';

function qSeries(values){const out=[];for(const [x,y,z] of values){const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z,'XYZ'));out.push(q.x,q.y,q.z,q.w);}return out;}
function qTrack(node,times,values){return node?new THREE.QuaternionKeyframeTrack(`${node.name}.quaternion`,times,qSeries(values)):null;}
function vTrack(node,times,values){return node?new THREE.VectorKeyframeTrack(`${node.name}.position`,times,values.flat()):null;}
function clip(name,duration,tracks){return new THREE.AnimationClip(name,duration,tracks.filter(Boolean));}
function n(root,name){return root.getObjectByName(name);}

function locomotion(root,name,{duration,stride,lift,lean,bob,arm,rootStep=0}){
  const hips=n(root,'Hips'),spine=n(root,'Spine'),chest=n(root,'Chest');
  const lt=n(root,'LeftUpLeg'),rt=n(root,'RightUpLeg'),ls=n(root,'LeftLeg'),rs=n(root,'RightLeg');
  const la=n(root,'LeftUpperArm'),ra=n(root,'RightUpperArm'),cape=n(root,'ProductionCapeRoot')||n(root,'CapeRoot');
  const t=[0,duration*.125,duration*.25,duration*.375,duration*.5,duration*.625,duration*.75,duration*.875,duration];
  const phase=[stride,stride*.55,0,-stride*.55,-stride,-stride*.55,0,stride*.55,stride];
  const opp=phase.map(v=>-v);
  const kneeA=[.05,.18,.42,.2,.04,.08,.24,.12,.05],kneeB=[.04,.08,.24,.12,.05,.18,.42,.2,.04];
  const tracks=[
    vTrack(hips,t,t.map((_,i)=>[0,1.02+(i%2?bob:0),rootStep*i/(t.length-1)])),
    qTrack(spine,t,t.map((_,i)=>[lean+(i%2?-.012:.008),0,(i%4<2?1:-1)*.018])),
    qTrack(chest,t,t.map((_,i)=>[-lean*.3,(i%4<2?1:-1)*.025,(i%2?-.012:.012)])),
    qTrack(lt,t,phase.map(v=>[v,0,0])),qTrack(rt,t,opp.map(v=>[v,0,0])),
    qTrack(ls,t,kneeA.map(v=>[v*lift,0,0])),qTrack(rs,t,kneeB.map(v=>[v*lift,0,0])),
    qTrack(la,t,opp.map(v=>[v*arm,0,.08])),qTrack(ra,t,phase.map(v=>[v*arm,0,-.1])),
    qTrack(cape,t,t.map((_,i)=>[.08+Math.abs(Math.sin(i/(t.length-1)*Math.PI*2))*.09,0,(i%2?1:-1)*.025]))
  ];
  return clip(name,duration,tracks);
}

export function createHeroAuthoredAnimationSet(rig){
  const root=rig.group,hips=n(root,'Hips'),spine=n(root,'Spine'),chest=n(root,'Chest'),head=n(root,'Head');
  const la=n(root,'LeftUpperArm'),ra=n(root,'RightUpperArm'),ll=n(root,'LeftLowerArm'),rl=n(root,'RightLowerArm');
  const lt=n(root,'LeftUpLeg'),rt=n(root,'RightUpLeg'),cape=n(root,'ProductionCapeRoot')||n(root,'CapeRoot');
  const idleT=[0,.42,.86,1.3,1.74,2.2];
  const idle=clip('idle',2.2,[
    vTrack(hips,idleT,idleT.map((_,i)=>[0,1.02+(i===2||i===3?.018:0),0])),
    qTrack(spine,idleT,[[.015,0,0],[.027,.012,.008],[.04,0,.014],[.026,-.012,.006],[.015,0,0],[.015,0,0]]),
    qTrack(chest,idleT,[[0,0,0],[-.012,.018,-.008],[-.02,0,-.012],[-.01,-.018,.008],[0,0,0],[0,0,0]]),
    qTrack(head,idleT,[[0,0,0],[.01,.025,0],[.018,.05,0],[.005,-.018,0],[0,0,0],[0,0,0]]),
    qTrack(ra,idleT,[[-.08,0,-.12],[-.07,.01,-.115],[-.06,0,-.11],[-.07,-.01,-.115],[-.08,0,-.12],[-.08,0,-.12]]),
    qTrack(cape,idleT,[[.05,0,0],[.07,.005,.008],[.09,0,.012],[.07,-.005,.006],[.05,0,0],[.05,0,0]])
  ]);
  const walk=locomotion(root,'walk',{duration:.82,stride:.46,lift:1.0,lean:.025,bob:.018,arm:.78});
  const run=locomotion(root,'run',{duration:.56,stride:.72,lift:1.22,lean:.095,bob:.028,arm:.82});
  const sprint=locomotion(root,'sprint',{duration:.44,stride:.88,lift:1.36,lean:.18,bob:.034,arm:.68});
  const attackT=[0,.08,.15,.24,.31,.43,.58,.74];
  const attack=clip('attack',.74,[
    vTrack(hips,attackT,[[0,1.02,0],[0,1.0,.02],[0,.97,-.03],[0,.99,-.34],[0,1.02,-.72],[0,1.03,-.86],[0,1.02,-.55],[0,1.02,0]]),
    qTrack(spine,attackT,[[0,0,0],[-.08,-.08,.04],[-.18,-.2,.08],[.12,.17,-.06],[.3,.24,-.11],[.16,.08,-.05],[.04,-.02,0],[0,0,0]]),
    qTrack(chest,attackT,[[0,0,0],[-.04,-.14,.02],[-.1,-.28,.05],[.18,.22,-.05],[.34,.34,-.09],[.2,.14,-.04],[.05,0,0],[0,0,0]]),
    qTrack(ra,attackT,[[-.08,0,-.16],[-.55,.15,-.72],[-1.02,.28,-1.05],[-.3,-.08,-.7],[1.08,-.32,.5],[.62,-.18,.24],[.18,-.04,-.02],[-.08,0,-.16]]),
    qTrack(rl,attackT,[[.08,0,0],[.34,0,-.1],[.56,0,-.18],[.22,0,-.08],[-.18,0,.06],[-.08,0,.02],[.02,0,0],[.08,0,0]]),
    qTrack(la,attackT,[[.08,0,.12],[.22,-.08,.28],[.35,-.14,.4],[.12,.05,.2],[-.22,.1,-.16],[-.1,.04,-.04],[.02,0,.06],[.08,0,.12]]),
    qTrack(lt,attackT,[[0,0,0],[-.12,0,.02],[-.24,0,.04],[-.16,0,.02],[.12,0,-.03],[.08,0,-.02],[.02,0,0],[0,0,0]]),
    qTrack(rt,attackT,[[0,0,0],[.08,0,-.02],[.16,0,-.04],[.1,0,-.02],[-.08,0,.02],[-.04,0,.01],[0,0,0],[0,0,0]]),
    qTrack(cape,attackT,[[.06,0,0],[.12,.02,.02],[.22,.06,.08],[.3,-.08,.12],[.18,-.12,-.1],[.12,-.04,-.05],[.08,0,0],[.06,0,0]])
  ]);
  const riftT=[0,.12,.28,.48,.67,.9,1.08];
  const rift=clip('rift',1.08,[
    vTrack(hips,riftT,[[0,1.02,0],[0,.98,0],[0,.92,-.04],[0,1.0,-.08],[0,1.06,-.1],[0,1.02,-.05],[0,1.02,0]]),
    qTrack(spine,riftT,[[0,0,0],[-.08,0,0],[-.22,0,0],[-.05,0,0],[.2,0,0],[.06,0,0],[0,0,0]]),
    qTrack(la,riftT,[[.08,0,.1],[.35,-.25,.32],[.68,-.42,.55],[.22,-.1,.75],[-.42,.2,.82],[-.08,.04,.3],[.08,0,.1]]),
    qTrack(ra,riftT,[[-.08,0,-.12],[-.25,.18,-.3],[-.5,.34,-.48],[-.08,.08,-.72],[.5,-.22,-.75],[.12,-.04,-.28],[-.08,0,-.12]]),
    qTrack(cape,riftT,[[.06,0,0],[.1,0,0],[.16,0,0],[.28,.02,.02],[.36,0,0],[.16,0,0],[.06,0,0]])
  ]);
  const guardT=[0,.09,.18,.36,.58];
  const guard=clip('guard',.58,[qTrack(spine,guardT,[[0,0,0],[-.06,.06,0],[-.11,.1,.02],[-.08,.07,.01],[0,0,0]]),qTrack(ra,guardT,[[-.08,0,-.12],[-.4,-.2,-.55],[-.58,-.34,-.82],[-.5,-.28,-.75],[-.08,0,-.12]]),qTrack(la,guardT,[[.08,0,.1],[.26,.18,.35],[.42,.3,.58],[.34,.22,.48],[.08,0,.1]])]);
  const parryT=[0,.07,.15,.26,.42];
  const parry=clip('parry',.42,[qTrack(spine,parryT,[[-.08,.08,0],[-.14,.2,.03],[.12,-.18,-.04],[.24,-.3,-.08],[0,0,0]]),qTrack(ra,parryT,[[-.55,-.3,-.78],[-.82,-.38,-1.0],[.3,.22,-.35],[.62,.28,.1],[-.08,0,-.12]]),vTrack(hips,parryT,[[0,1.02,0],[0,.99,.02],[0,1.03,-.16],[0,1.04,-.28],[0,1.02,0]])]);
  const dodgeT=[0,.08,.18,.31,.46,.62];
  const dodge=clip('dodge',.62,[vTrack(hips,dodgeT,[[0,1.02,0],[0,.9,.05],[0,.82,-.52],[0,.88,-1.42],[0,.98,-2.06],[0,1.02,-2.38]]),qTrack(spine,dodgeT,[[0,0,0],[-.3,.08,.08],[-.56,.14,.12],[-.34,-.08,-.08],[-.12,0,-.02],[0,0,0]]),qTrack(cape,dodgeT,[[.06,0,0],[.24,.04,.04],[.44,.1,.08],[.36,-.07,-.06],[.16,-.02,-.02],[.06,0,0]])]);
  const hit=clip('hit',.44,[qTrack(spine,[0,.07,.17,.29,.44],[[0,0,0],[-.34,.1,.12],[-.22,-.06,-.07],[-.08,0,0],[0,0,0]]),qTrack(head,[0,.07,.17,.29,.44],[[0,0,0],[-.12,.08,.06],[.05,-.05,-.03],[.02,0,0],[0,0,0]])]);
  const death=clip('death',1.55,[vTrack(hips,[0,.3,.72,1.15,1.55],[[0,1.02,0],[0,.9,-.08],[0,.48,-.2],[0,.2,-.32],[0,.16,-.34]]),qTrack(spine,[0,.3,.72,1.15,1.55],[[0,0,0],[-.3,.1,.14],[-.82,.16,.2],[-1.22,.18,.22],[-1.3,.16,.2]])]);
  const turnLeft=clip('turnLeft',.42,[qTrack(hips,[0,.21,.42],[[0,0,0],[0,.32,0],[0,.62,0]]),qTrack(spine,[0,.21,.42],[[0,0,0],[0,-.18,0],[0,0,0]])]);
  const turnRight=clip('turnRight',.42,[qTrack(hips,[0,.21,.42],[[0,0,0],[0,-.32,0],[0,-.62,0]]),qTrack(spine,[0,.21,.42],[[0,0,0],[0,.18,0],[0,0,0]])]);
  return{idle,walk,run,sprint,attack,rift,guard,parry,dodge,hit,death,turnLeft,turnRight};
}

export function createWardenAuthoredAnimationSet(rig){
  const root=rig.group,hips=n(root,'EnemyHips'),spine=n(root,'EnemySpine'),head=n(root,'EnemyHead'),arm=n(root,'EnemyArmR'),armL=n(root,'EnemyArmL'),lt=n(root,'LeftUpLeg'),rt=n(root,'RightUpLeg');
  const idle=clip('enemyIdle',2.0,[qTrack(spine,[0,.5,1,1.5,2],[[0,0,0],[.04,.02,.025],[.065,0,.03],[.04,-.02,.02],[0,0,0]]),qTrack(head,[0,.5,1,1.5,2],[[0,0,0],[.015,.03,0],[.02,0,0],[.01,-.025,0],[0,0,0]])]);
  const walk=clip('enemyWalk',.76,[vTrack(hips,[0,.19,.38,.57,.76],[[0,1.12,0],[0,1.15,.04],[0,1.12,.08],[0,1.15,.12],[0,1.12,.16]]),qTrack(lt,[0,.19,.38,.57,.76],[[.48,0,0],[0,0,0],[-.48,0,0],[0,0,0],[.48,0,0]]),qTrack(rt,[0,.19,.38,.57,.76],[[-.48,0,0],[0,0,0],[.48,0,0],[0,0,0],[-.48,0,0]])]);
  const attackT=[0,.12,.27,.42,.54,.72,.94];
  const attack=clip('enemyAttack',.94,[vTrack(hips,attackT,[[0,1.12,0],[0,1.08,.02],[0,1.02,-.05],[0,1.09,-.34],[0,1.13,-.63],[0,1.12,-.35],[0,1.12,0]]),qTrack(spine,attackT,[[0,0,0],[-.08,-.05,.02],[-.2,-.13,.06],[.14,.12,-.05],[.32,.2,-.1],[.14,.04,-.03],[0,0,0]]),qTrack(arm,attackT,[[0,0,-.2],[-.45,.14,-.7],[-.9,.3,-1.06],[-.18,-.08,-.55],[1.05,-.3,.62],[.35,-.08,.06],[0,0,-.2]]),qTrack(armL,attackT,[[0,0,.18],[.18,-.08,.3],[.34,-.14,.46],[.12,.04,.18],[-.2,.08,-.12],[-.08,.02,.04],[0,0,.18]])]);
  const heavy=clip('enemyHeavy',1.22,[qTrack(spine,[0,.18,.42,.68,.86,1.22],[[0,0,0],[-.12,0,.03],[-.32,-.12,.09],[.28,.22,-.12],[.18,.06,-.04],[0,0,0]]),qTrack(arm,[0,.18,.42,.68,.86,1.22],[[0,0,-.2],[-.6,.2,-.88],[-1.18,.4,-1.25],[1.2,-.32,.7],[.44,-.1,.08],[0,0,-.2]]),vTrack(hips,[0,.42,.68,1.22],[[0,1.12,0],[0,1.0,-.04],[0,1.12,-.82],[0,1.12,0]])]);
  const hit=clip('enemyHit',.48,[qTrack(spine,[0,.08,.2,.34,.48],[[0,0,0],[-.36,.12,.08],[-.24,-.06,-.05],[-.08,0,0],[0,0,0]])]);
  const stagger=clip('enemyStagger',.72,[qTrack(spine,[0,.12,.3,.5,.72],[[0,0,0],[-.46,.18,.12],[-.3,-.12,-.08],[-.12,.04,.02],[0,0,0]]),vTrack(hips,[0,.12,.3,.5,.72],[[0,1.12,0],[0,1.05,.18],[0,1.08,.42],[0,1.11,.24],[0,1.12,0]])]);
  const death=clip('enemyDeath',1.7,[vTrack(hips,[0,.36,.8,1.24,1.7],[[0,1.12,0],[0,.96,-.06],[0,.54,-.2],[0,.24,-.3],[0,.18,-.34]]),qTrack(spine,[0,.36,.8,1.24,1.7],[[0,0,0],[-.38,.12,.14],[-.96,.2,.24],[-1.3,.22,.25],[-1.38,.2,.22]])]);
  return{enemyIdle:idle,enemyWalk:walk,enemyAttack:attack,enemyHeavy:heavy,enemyHit:hit,enemyStagger:stagger,enemyDeath:death};
}
