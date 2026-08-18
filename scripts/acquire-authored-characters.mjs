import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const OUT_ROOT=path.resolve('public/assets/authored');
const PROFILE_PATH=path.join(OUT_ROOT,'character-source.json');
const QUATERNIUS_MANIFEST=process.env.GAUNTLET_QUATERNIUS_MANIFEST?.trim();

const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const assertGlb=(bytes,label)=>{if(bytes.length<1024)throw new Error(`${label} is suspiciously small (${bytes.length} bytes)`);if(bytes.subarray(0,4).toString('ascii')!=='glTF')throw new Error(`${label} is not a valid GLB`);};
const exists=async file=>{try{await access(file);return true;}catch{return false;}};

async function installExternalGlb(sourcePath,destDir,destName){const absolute=path.resolve(sourcePath);if(!(await exists(absolute)))throw new Error(`Missing external authored asset: ${absolute}`);const bytes=await readFile(absolute);assertGlb(bytes,absolute);await mkdir(destDir,{recursive:true});const dest=path.join(destDir,destName);await copyFile(absolute,dest);return{bytes:bytes.length,sha256:sha256(bytes),sourcePath:absolute,dest};}
async function fetchPinned({repo,revision,sourcePath,destDir,destName,expectedBytes,role}){const url=`https://raw.githubusercontent.com/${repo}/${revision}/${sourcePath}`,response=await fetch(url,{redirect:'follow'});if(!response.ok)throw new Error(`Pinned authored asset fetch failed ${response.status}: ${url}`);const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length!==expectedBytes)throw new Error(`Pinned authored asset size mismatch ${destName}: ${bytes.length} != ${expectedBytes}`);assertGlb(bytes,destName);await mkdir(destDir,{recursive:true});await writeFile(path.join(destDir,destName),bytes);return{role,url,repository:repo,revision,sourcePath,bytes:bytes.length,sha256:sha256(bytes)};}

async function installQuaternius(manifestPath){
  const raw=JSON.parse(await readFile(path.resolve(manifestPath),'utf8'));for(const role of ['hero','enemy'])if(!raw?.actors?.[role]?.model)throw new Error(`Quaternius manifest missing actors.${role}.model`);
  const outDir=path.join(OUT_ROOT,'quaternius');await mkdir(outDir,{recursive:true});const provenance={source:'Quaternius Universal Base Characters + Modular Character Outfits - Fantasy + Universal Animation Library',license:'CC0 1.0',purpose:'Production authored character tier for Gauntlet OSRS art reset',manifest:path.resolve(manifestPath),files:{}};const actors={};
  for(const role of ['hero','enemy']){const spec=raw.actors[role],modelName=`${role}.glb`,modelMeta=await installExternalGlb(spec.model,outDir,modelName);provenance.files[modelName]=modelMeta;const animationUrls=[];for(let i=0;i<(spec.animations||[]).length;i++){const name=`${role}-anim-${String(i+1).padStart(2,'0')}.glb`,meta=await installExternalGlb(spec.animations[i],outDir,name);provenance.files[name]=meta;animationUrls.push(`/assets/authored/quaternius/${name}`);}actors[role]={url:`/assets/authored/quaternius/${modelName}`,label:spec.label||`${role==='hero'?'Vanguard':'Dread Warden'} / Quaternius CC0`,height:Number(spec.height)||(role==='hero'?2.48:2.72),bulk:Number(spec.bulk)||(role==='hero'?1.02:1.06),animationUrls};}
  const profile={schemaVersion:1,target:'high-end OSRS/07Scape',tier:'production-quaternius',provider:'Quaternius',visualAcceptanceEligible:true,actors};await writeFile(path.join(outDir,'provenance.json'),JSON.stringify(provenance,null,2));await writeFile(PROFILE_PATH,JSON.stringify(profile,null,2));console.log(`Production Quaternius character tier installed from ${path.resolve(manifestPath)}.`);
}

async function installPinnedQuaterniusBase(){
  const BODY_REPO='rom-orlovich/prompt-fighter',BODY_REV='20095a9e8af3a32406508cfbdd3e93130de2c143';
  const UAL_REPO='Seyamalam/blood-league-kickoff',UAL_REV='aa02a4e6d8337a0604d2da131bcbbeb1f01badf0';
  const outDir=path.join(OUT_ROOT,'quaternius-base');await mkdir(outDir,{recursive:true});
  const specs=[
    {repo:BODY_REPO,revision:BODY_REV,sourcePath:'public/assets/characters/Male.glb',destName:'VanguardBase.glb',expectedBytes:1_255_252,role:'Vanguard base body'},
    {repo:BODY_REPO,revision:BODY_REV,sourcePath:'public/assets/characters/Female.glb',destName:'WardenBase.glb',expectedBytes:1_478_192,role:'Dread Warden base body'},
    {repo:UAL_REPO,revision:UAL_REV,sourcePath:'public/assets/vendor/quaternius/universal-animation-library.glb',destName:'UAL1.glb',expectedBytes:2_714_756,role:'Universal Animation Library'},
    {repo:BODY_REPO,revision:BODY_REV,sourcePath:'public/assets/characters/Anims.glb',destName:'UAL-Combat-Extension.glb',expectedBytes:2_893_712,role:'Universal Animation Library compatible combat extension'}
  ];
  const provenance={source:'Quaternius CC0 redistributed/optimized public copies',officialSources:['https://quaternius.com/packs/universalbasecharacters.html','https://quaternius.com/packs/universalanimationlibrary.html','https://quaternius.com/packs/universalanimationlibrary2.html'],license:'CC0 1.0',purpose:'Intermediate high-topology authored body + animation tier. Not final visual acceptance: fantasy outfit composition still required.',files:{}};
  for(const spec of specs){const meta=await fetchPinned({...spec,destDir:outDir,destName:spec.destName});provenance.files[spec.destName]=meta;}
  await writeFile(path.join(outDir,'provenance.json'),JSON.stringify(provenance,null,2));
  const animationUrls=['/assets/authored/quaternius-base/UAL1.glb','/assets/authored/quaternius-base/UAL-Combat-Extension.glb'];
  const profile={schemaVersion:1,target:'high-end OSRS/07Scape',tier:'quaternius-base-intermediate',provider:'Quaternius CC0 (pinned redistributed copies)',visualAcceptanceEligible:false,visualBlocker:'Universal Base Character bodies and authored animation are active, but final Vanguard/Warden fantasy outfit composition is not installed.',actors:{hero:{url:'/assets/authored/quaternius-base/VanguardBase.glb',label:'Vanguard / Quaternius Universal Base Character intermediate',height:2.48,bulk:1.02,animationUrls},enemy:{url:'/assets/authored/quaternius-base/WardenBase.glb',label:'Dread Warden / Quaternius Universal Base Character intermediate',height:2.72,bulk:1.08,animationUrls}}};
  await writeFile(PROFILE_PATH,JSON.stringify(profile,null,2));console.log('Pinned Quaternius base + authored animation tier ready. Final visual acceptance remains blocked until fantasy outfit composition is installed.');
}

await mkdir(OUT_ROOT,{recursive:true});if(QUATERNIUS_MANIFEST)await installQuaternius(QUATERNIUS_MANIFEST);else await installPinnedQuaterniusBase();
