import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const boot=JSON.parse(await fs.readFile('artifacts/boot-metrics.json','utf8'));
const env=boot?.hybridEnvironment||null,ground=boot?.groundDetail||null,terrain=boot?.terrainMaterial||null,streaming=boot?.streamingEnvironment||null;
const failures=[];
if(!env)failures.push('hybrid environment telemetry missing');
else{
  if(env.target!=='high-end OSRS/07Scape')failures.push(`wrong target=${env.target||'missing'}`);
  if(!env.ready)failures.push('hybrid environment never reached ready state');
  if(env.error)failures.push(`hybrid environment load error=${env.error}`);
  const assetKeys=Object.keys(env.assets||{});if(assetKeys.length<6)failures.push(`authored environment source variety ${assetKeys.length}<6`);
  for(const required of['pillar','crates','barrel','brokenWall','doorway','stairs'])if(!env.assets?.[required])failures.push(`missing authored environment source=${required}`);
  if((env.instances||0)<12)failures.push(`authored environment instances ${env.instances||0}<12`);if((env.landmarks||0)<3)failures.push(`authored environment landmarks ${env.landmarks||0}<3`);if((env.suppressedProcedural||0)<2)failures.push(`procedural-overlap suppression ${env.suppressedProcedural||0}<2`);if((env.triangles||0)<1000)failures.push(`authored environment triangle contribution ${env.triangles||0}<1000`);if(!env.texture?.authoredAtlas)failures.push('authored dungeon texture atlas not active');
}
if(!streaming)failures.push('streamed tree telemetry missing');
else{
  if(streaming.target!=='high-end OSRS/07Scape')failures.push(`streaming target=${streaming.target||'missing'}`);
  const expected=['frontier-oak','silver-ash','ashen-pine'];for(const species of expected)if(!streaming.species?.includes(species))failures.push(`missing tree species=${species}`);
  if((streaming.species?.length||0)<3)failures.push(`tree species variety ${streaming.species?.length||0}<3`);if((streaming.activeChunks||0)<9)failures.push(`active streamed chunks ${streaming.activeChunks||0}<9`);if((streaming.trees||0)<80)failures.push(`streamed tree population ${streaming.trees||0}<80`);if((streaming.nearTreeChunks||0)<1)failures.push('no near-detail tree chunks active');if((streaming.farTreeChunks||0)<1)failures.push('no far-LOD tree chunks active');if(streaming.lod!=='near-card / far-hull')failures.push(`unexpected tree LOD strategy=${streaming.lod||'missing'}`);
}
if(!ground)failures.push('ground-detail telemetry missing');
else{
  if(ground.target!=='high-end OSRS/07Scape')failures.push(`ground target=${ground.target||'missing'}`);if(!ground.ready)failures.push('ground detail not ready');if(ground.placement!=='clustered-authored-density')failures.push(`ground placement=${ground.placement||'missing'}`);if(ground.combatLaneClear!==true)failures.push('combat lane is not protected from undergrowth');if((ground.clusters||0)<8)failures.push(`undergrowth clusters ${ground.clusters||0}<8`);
  const c=ground.counts||{};if((c.grass||0)<350)failures.push(`grass density ${c.grass||0}<350`);if((c.fern||0)<80)failures.push(`fern density ${c.fern||0}<80`);if((c.broadleaf||0)<70)failures.push(`broadleaf density ${c.broadleaf||0}<70`);if((c.flowers||0)<50)failures.push(`flower density ${c.flowers||0}<50`);if((ground.totalPlants||0)<650)failures.push(`total near-field plants ${ground.totalPlants||0}<650`);
}
if(!terrain)failures.push('terrain-material telemetry missing');
else{
  if(terrain.target!=='high-end OSRS/07Scape')failures.push(`terrain target=${terrain.target||'missing'}`);if(!terrain.ready)failures.push('terrain material not ready');for(const layer of['grass','dirt','worn-path','rock','moss'])if(!terrain.layers?.includes(layer))failures.push(`terrain layer missing=${layer}`);if((terrain.textureSize||0)<256)failures.push(`terrain detail texture ${terrain.textureSize||0}<256`);if((terrain.detailRepeat||0)<24)failures.push(`terrain micro repeat ${terrain.detailRepeat||0}<24`);if((terrain.microHeightMeters||0)<.02)failures.push(`terrain micro height ${terrain.microHeightMeters||0}<0.02m`);if((terrain.normalStrength||0)<.6)failures.push(`terrain normal strength ${terrain.normalStrength||0}<0.6`);
}
const expectedFrames=['01-idle-1080p.png','02-locomotion-1080p.png','03-melee-impact-1080p.png','04-rift-vfx-1080p.png','05-evade-1080p.png'],hashes=new Set(),frameEvidence=[];
for(const name of expectedFrames){const file=path.join('artifacts','frames',name);try{const data=await fs.readFile(file),hash=crypto.createHash('sha256').update(data).digest('hex');if(data.length<180000)failures.push(`${name} suspiciously low-detail frame=${data.length}B`);if(hashes.has(hash))failures.push(`${name} duplicates another visual evidence frame`);hashes.add(hash);frameEvidence.push({name,bytes:data.length,sha256:hash});}catch{failures.push(`missing rendered frame=${name}`);}}
const result={status:failures.length?'REJECTED':'STRUCTURAL_PASS_VISUAL_REVIEW_REQUIRED',generatedAt:new Date().toISOString(),target:'high-end OSRS/07Scape',environment:env,streamingTrees:streaming,groundDetail:ground,terrainMaterial:terrain,frameEvidence,failures,note:'This critic proves the upgraded environment exists in rendered evidence and rejects missing variety, density, layering, LODs, or duplicate/low-information frames. It never grants art approval. The harsh visual critic must still compare the screenshots against the refined OSRS/07Scape target and reject weak silhouettes, repetition, muddy materials, flat terrain, cluttered combat readability, or generic realism.'};
await fs.writeFile('artifacts/environment-critic.json',JSON.stringify(result,null,2));
if(failures.length){console.error(`Environment Gauntlet critic REJECTED:\n- ${failures.join('\n- ')}`);process.exit(1);}console.log(`Environment structural/evidence gate satisfied: ${streaming.species.length} tree species, ${ground.totalPlants} near-field plants, ${terrain.layers.length} terrain layers, ${frameEvidence.length} rendered frames. Visual approval remains withheld.`);
