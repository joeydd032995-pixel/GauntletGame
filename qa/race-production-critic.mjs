import fs from 'node:fs/promises';
import path from 'node:path';

const SPEC_PATH=path.resolve('qa/race-acceptance-spec.json');
const MANIFEST_PATH=path.resolve('public/assets/races/manifest.json');
const ACCEPTANCE_PATH=path.resolve('artifacts/race-reference-acceptance.json');
const OUT_PATH=path.resolve('artifacts/race-production-critic.json');

const spec=JSON.parse(await fs.readFile(SPEC_PATH,'utf8'));
const manifest=JSON.parse(await fs.readFile(MANIFEST_PATH,'utf8'));
const failures=[];
const races=['cairnborn','brinesworn','myceliad','veylkin','echoed'];
const requiredViews=new Set(spec.viewsRequired);

function fail(race,code,message){failures.push({race,code,message});}
function finiteScore(value){return Number.isFinite(Number(value))?Number(value):null;}

let acceptance=null;
try{acceptance=JSON.parse(await fs.readFile(ACCEPTANCE_PATH,'utf8'));}
catch{fail('release','MISSING_REFERENCE_ACCEPTANCE',`Missing ${path.relative(process.cwd(),ACCEPTANCE_PATH)}. Structural/rig QA can never substitute for reference-fidelity acceptance.`);}

if(manifest.source?.toLowerCase().includes('procedural')||manifest.generatorVersion?.includes('proxy'))fail('release','PROCEDURAL_SOURCE','Procedural/proxy source is forbidden for production race acceptance.');
if(manifest.productionMesh!==true||manifest.skinnedMesh!==true||manifest.rigType!=='skinned-humanoid'||manifest.skinning!=='weighted-skeletal')fail('release','TECH_CONTRACT','Top-level manifest does not declare the required production skinned-mesh contract.');

for(const race of races){
  const entry=manifest.races?.find(r=>r.key===race);
  if(!entry){fail(race,'MISSING_RACE','Race missing from manifest.');continue;}
  if(entry.productionMesh!==true||entry.skinnedMesh!==true||entry.rigType!=='skinned-humanoid'||entry.skinning!=='weighted-skeletal')fail(race,'INVALID_RIG_CONTRACT','Race is not a production skinned humanoid.');
  if(!entry.referenceLock?.elementId||!entry.referenceLock?.aPoseJob||!entry.referenceLock?.turnaroundJob||!entry.referenceLock?.detailJob||entry.referenceLock?.turnaroundResolution!=='4k')fail(race,'REFERENCE_PROVENANCE','Locked Element/A-pose/4K turnaround/detail provenance is incomplete.');
  if(!entry.source3d?.provider||!entry.source3d?.jobId||!entry.source3d?.method)fail(race,'MISSING_3D_SOURCE_JOB','No real 3D reconstruction/authored-model source job is recorded. Procedural geometry is not acceptable.');
  if(entry.source3d?.method==='procedural'||entry.source3d?.method==='proxy')fail(race,'PROCEDURAL_3D_SOURCE','Procedural/proxy 3D source is explicitly forbidden.');
  const tr=spec.technicalRequirements;
  const hero=Number(entry.triangles?.hero||0),mid=Number(entry.triangles?.mid||0),far=Number(entry.triangles?.far||0);
  if(hero<tr.heroTriangleRange[0]||hero>tr.heroTriangleRange[1])fail(race,'HERO_TRI_BUDGET',`Hero triangles ${hero} outside ${tr.heroTriangleRange.join('-')}.`);
  if(mid<tr.midTriangleRange[0]||mid>tr.midTriangleRange[1])fail(race,'MID_TRI_BUDGET',`Mid triangles ${mid} outside ${tr.midTriangleRange.join('-')}.`);
  if(far<tr.farTriangleRange[0]||far>tr.farTriangleRange[1])fail(race,'FAR_TRI_BUDGET',`Far triangles ${far} outside ${tr.farTriangleRange.join('-')}.`);
  if(Number(entry.bones?.hero||0)<tr.minimumBones)fail(race,'BONE_COUNT',`Hero skeleton below ${tr.minimumBones} bones.`);

  const review=acceptance?.races?.[race];
  if(!review){fail(race,'MISSING_REVIEW','No harsh reference-fidelity review exists.');continue;}
  if(review.status!=='accepted')fail(race,'REVIEW_NOT_ACCEPTED',`Review status is ${review.status||'unset'}, expected accepted.`);
  const views=new Set(review.views||[]);for(const view of requiredViews)if(!views.has(view))fail(race,'MISSING_VIEW',`Required ${view} comparison is absent.`);
  const overall=finiteScore(review.overall);if(overall===null||overall<spec.minimumOverallScore)fail(race,'OVERALL_SCORE',`Overall ${overall??'missing'} < ${spec.minimumOverallScore}.`);
  const critical=Array.isArray(review.criticalMisses)?review.criticalMisses:[];if(critical.length>spec.criticalMissesAllowed)fail(race,'CRITICAL_MISS',`${critical.length} critical miss(es): ${critical.join('; ')}`);
  for(const [category,rule] of Object.entries(spec.categories)){
    const score=finiteScore(review.categories?.[category]);
    const minimum=Math.max(spec.minimumCategoryScore,Number(rule.minimum||0));
    if(score===null||score<minimum)fail(race,'CATEGORY_SCORE',`${category} ${score??'missing'} < ${minimum}.`);
  }
  if(review.referenceElementId!==entry.elementId)fail(race,'ELEMENT_REVIEW_DRIFT','Review Element ID does not match manifest Element ID.');
  if(review.turnaroundJob!==entry.referenceLock?.turnaroundJob)fail(race,'TURNAROUND_REVIEW_DRIFT','Review turnaround job does not match locked 4K turnaround.');
}

const report={schemaVersion:1,policy:spec.policy,minimumOverallScore:spec.minimumOverallScore,minimumCategoryScore:spec.minimumCategoryScore,criticalMissesAllowed:spec.criticalMissesAllowed,passed:failures.length===0,failures};
await fs.mkdir(path.dirname(OUT_PATH),{recursive:true});
await fs.writeFile(OUT_PATH,JSON.stringify(report,null,2)+'\n');
if(failures.length){
  console.error(`RACE PRODUCTION ACCEPTANCE: REJECTED (${failures.length} failure(s))`);
  for(const f of failures)console.error(`[${f.race}] ${f.code}: ${f.message}`);
  process.exit(1);
}
console.log('RACE PRODUCTION ACCEPTANCE: ACCEPTED — all five races clear the zero-critical-miss gate.');
