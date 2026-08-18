import fs from 'node:fs/promises';

const boot=JSON.parse(await fs.readFile('artifacts/boot-metrics.json','utf8'));
const env=boot?.hybridEnvironment||null;
const failures=[];
if(!env)failures.push('hybrid environment telemetry missing');
else{
  if(env.target!=='high-end OSRS/07Scape')failures.push(`wrong target=${env.target||'missing'}`);
  if(!env.ready)failures.push('hybrid environment never reached ready state');
  if(env.error)failures.push(`hybrid environment load error=${env.error}`);
  const assetKeys=Object.keys(env.assets||{});
  if(assetKeys.length<6)failures.push(`authored environment source variety ${assetKeys.length}<6`);
  for(const required of ['pillar','crates','barrel','brokenWall','doorway','stairs'])if(!env.assets?.[required])failures.push(`missing authored environment source=${required}`);
  if((env.instances||0)<12)failures.push(`authored environment instances ${env.instances||0}<12`);
  if((env.landmarks||0)<3)failures.push(`authored environment landmarks ${env.landmarks||0}<3`);
  if((env.suppressedProcedural||0)<2)failures.push(`procedural-overlap suppression ${env.suppressedProcedural||0}<2`);
  if((env.triangles||0)<1000)failures.push(`authored environment triangle contribution ${env.triangles||0}<1000`);
  if(!env.texture?.authoredAtlas)failures.push('authored dungeon texture atlas not active');
}
const result={status:failures.length?'REJECTED':'STRUCTURAL_PASS_VISUAL_REVIEW_REQUIRED',generatedAt:new Date().toISOString(),target:'high-end OSRS/07Scape',environment:env,failures,note:'Structural authored-environment success is necessary but never visual approval. Harsh screenshot review must still reject repetition, weak hierarchy, floating props, thin density, or prototype presentation.'};
await fs.writeFile('artifacts/environment-critic.json',JSON.stringify(result,null,2));
if(failures.length){console.error(`Hybrid environment critic REJECTED:\n- ${failures.join('\n- ')}`);process.exit(1);}
console.log(`Hybrid environment structural gate satisfied: ${env.landmarks} landmarks, ${env.instances} authored instances, ${env.suppressedProcedural} procedural conflicts suppressed. Visual approval remains withheld.`);
