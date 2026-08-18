import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const OUT_ROOT=path.resolve('public/assets/authored');
const PROFILE_PATH=path.join(OUT_ROOT,'character-source.json');
const QUATERNIUS_MANIFEST=process.env.GAUNTLET_QUATERNIUS_MANIFEST?.trim();

const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const assertGlb=(bytes,label)=>{if(bytes.length<1024)throw new Error(`${label} is suspiciously small (${bytes.length} bytes)`);if(bytes.subarray(0,4).toString('ascii')!=='glTF')throw new Error(`${label} is not a valid GLB`);};
const exists=async file=>{try{await access(file);return true;}catch{return false;}};

function pruneGlbAnimations(sourceBytes,keepNames,label){
  assertGlb(sourceBytes,label);if(sourceBytes.readUInt32LE(4)!==2)throw new Error(`${label} must be GLB v2`);
  const chunks=[];let offset=12,jsonIndex=-1;
  while(offset+8<=sourceBytes.length){const length=sourceBytes.readUInt32LE(offset),type=sourceBytes.readUInt32LE(offset+4),data=sourceBytes.subarray(offset+8,offset+8+length);if(data.length!==length)throw new Error(`${label} has truncated GLB chunk`);if(type===0x4e4f534a)jsonIndex=chunks.length;chunks.push({type,data});offset+=8+length;}
  if(jsonIndex<0)throw new Error(`${label} has no JSON chunk`);
  const json=JSON.parse(chunks[jsonIndex].data.toString('utf8').replace(/\u0000+$/g,'').trim());const sourceAnimations=json.animations||[],keep=new Set(keepNames),retained=sourceAnimations.filter(a=>keep.has(a.name));const found=new Set(retained.map(a=>a.name)),missing=keepNames.filter(name=>!found.has(name));if(missing.length)throw new Error(`${label} missing required animations: ${missing.join(', ')}`);json.animations=retained;
  let jsonBytes=Buffer.from(JSON.stringify(json),'utf8');const pad=(4-jsonBytes.length%4)%4;if(pad)jsonBytes=Buffer.concat([jsonBytes,Buffer.alloc(pad,0x20)]);chunks[jsonIndex]={type:0x4e4f534a,data:jsonBytes};
  const total=12+chunks.reduce((sum,c)=>sum+8+c.data.length,0),out=Buffer.alloc(total);out.write('glTF',0,'ascii');out.writeUInt32LE(2,4);out.writeUInt32LE(total,8);offset=12;for(const chunk of chunks){out.writeUInt32LE(chunk.data.length,offset);out.writeUInt32LE(chunk.type,offset+4);chunk.data.copy(out,offset+8);offset+=8+chunk.data.length;}
  return{bytes:out,retainedAnimations:retained.map(a=>a.name),sourceAnimationCount:sourceAnimations.length};
}

async function installExternalGlb(sourcePath,destDir,destName){const absolute=path.resolve(sourcePath);if(!(await exists(absolute)))throw new Error(`Missing external authored asset: ${absolute}`);const bytes=await readFile(absolute);assertGlb(bytes,absolute);await mkdir(destDir,{recursive:true});const dest=path.join(destDir,destName);await copyFile(absolute,dest);return{bytes:bytes.length,sha256:sha256(bytes),sourcePath:absolute,dest};}
async function fetchPinned({repo,revision,sourcePath,destDir,destName,expectedBytes,role,keepAnimations}){const url=`https://raw.githubusercontent.com/${repo}/${revision}/${sourcePath}`,response=await fetch(url,{redirect:'follow'});if(!response.ok)throw new Error(`Pinned authored asset fetch failed ${response.status}: ${url}`);const sourceBytes=Buffer.from(await response.arrayBuffer());if(sourceBytes.length!==expectedBytes)throw new Error(`Pinned authored asset size mismatch ${destName}: ${sourceBytes.length} != ${expectedBytes}`);assertGlb(sourceBytes,destName);const pruned=keepAnimations?pruneGlbAnimations(sourceBytes,keepAnimations,destName):null,output=pruned?.bytes||sourceBytes;await mkdir(destDir,{recursive:true});await writeFile(path.join(destDir,destName),output);return{role,url,repository:repo,revision,sourcePath,sourceBytes:sourceBytes.length,bytes:output.length,sourceSha256:sha256(sourceBytes),sha256:sha256(output),...(pruned?{sourceAnimationCount:pruned.sourceAnimationCount,retainedAnimations:pruned.retainedAnimations}:null)};}

async function installQuaternius(manifestPath){
  const raw=JSON.parse(await readFile(path.resolve(manifestPath),'utf8'));for(const role of ['hero','enemy'])if(!raw?.actors?.[role]?.model)throw new Error(`Quaternius manifest missing actors.${role}.model`);
  const outDir=path.join(OUT_ROOT,'quaternius');await mkdir(outDir,{recursive:true});const provenance={source:'Quaternius Universal Base Characters + Modular Character Outfits - Fantasy + Universal Animation Library',license:'CC0 1.0',purpose:'Production authored character tier for Gauntlet OSRS art reset',manifest:path.resolve(manifestPath),files:{}};const actors={};
  for(const role of ['hero','enemy']){const spec=raw.actors[role],modelName=`${role}.glb`,modelMeta=await installExternalGlb(spec.model,outDir,modelName);provenance.files[modelName]=modelMeta;const animationUrls=[];for(let i=0;i<(spec.animations||[]).length;i++){const name=`${role}-anim-${String(i+1).padStart(2,'0')}.glb`,meta=await installExternalGlb(spec.animations[i],outDir,name);provenance.files[name]=meta;animationUrls.push(`/assets/authored/quaternius/${name}`);}actors[role]={url:`/assets/authored/quaternius/${modelName}`,label:spec.label||`${role==='hero'?'Vanguard':'Dread Warden'} / Quaternius CC0`,height:Number(spec.height)||(role==='hero'?2.48:2.72),bulk:Number(spec.bulk)||(role==='hero'?1.02:1.06),animationUrls};}
  const profile={schemaVersion:1,target:'high-end OSRS/07Scape',tier:'production-quaternius',provider:'Quaternius',visualAcceptanceEligible:true,actors};await writeFile(path.join(outDir,'provenance.json'),JSON.stringify(provenance,null,2));await writeFile(PROFILE_PATH,JSON.stringify(profile,null,2));console.log(`Production Quaternius character tier installed from ${path.resolve(manifestPath)}.`);
}

async function installPinnedQuaterniusBase(){
  const BODY_REPO='rom-orlovich/prompt-fighter',BODY_REV='20095a9e8af3da5d69afca422c433201e12263511d'.replace('53b91b0fa3da5d69afca422c433201e12263511d','20095a9e8af3a32406508cfbdd3e93130de2c143');
  const UAL_REPO='Seyamalam/blood-league-kickoff',UAL_REV='aa02a4e6d8337a0604d2da131bcbbeb1f01badf0';
  const ualCore=['Idle_Loop','Walk_Loop','Jog_Fwd_Loop','Sprint_Loop','Punch_Cross','Spell_Simple_Shoot','Hit_Chest','Death01','Roll','Sword_Attack'];
  const ualCombat=['Idle_Shield_Loop','Melee_Hook','Hit_Knockback','Slide_Start'];
  const outDir=path.join(OUT_ROOT,'quaternius-base');await mkdir(outDir,{recursive:true});
  const specs=[
    {repo:BODY_REPO,revision:BODY_REV,sourcePath:'public/assets/characters/Male.glb',destName:'VanguardBase.glb',expectedBytes:1_255_252,role:'Vanguard base body'},
    {repo:BODY_REPO,revision:BODY_REV,sourcePath:'public/assets/characters/Female.glb',destName:'WardenBase.glb',expectedBytes:1_478_192,role:'Dread Warden base body'},
    {repo:UAL_REPO,revision:UAL_REV,sourcePath:'public/assets/vendor/quaternius/universal-animation-library.glb',destName:'UAL1.glb',expectedBytes:2_714_756,role:'Gauntlet-pruned Universal Animation Library',keepAnimations:ualCore},
    {repo:BODY_REPO,revision:BODY_REV,sourcePath:'public/assets/characters/Anims.glb',destName:'UAL-Combat-Extension.glb',expectedBytes:2_893_712,role:'Gauntlet-pruned Universal Animation Library combat extension',keepAnimations:ualCombat}
  ];
  const provenance={source:'Quaternius CC0 redistributed/optimized public copies',officialSources:['https://quaternius.com/packs/universalbasecharacters.html','https://quaternius.com/packs/universalanimationlibrary.html','https://quaternius.com/packs/universalanimationlibrary2.html'],license:'CC0 1.0',purpose:'Intermediate high-topology authored body + semantically pruned animation tier. Not final visual acceptance: fantasy outfit composition still required.',files:{}};
  for(const spec of specs){const meta=await fetchPinned({...spec,destDir:outDir,destName:spec.destName});provenance.files[spec.destName]=meta;}
  await writeFile(path.join(outDir,'provenance.json'),JSON.stringify(provenance,null,2));
  const animationUrls=['/assets/authored/quaternius-base/UAL1.glb','/assets/authored/quaternius-base/UAL-Combat-Extension.glb'];
  const profile={schemaVersion:1,target:'high-end OSRS/07Scape',tier:'quaternius-base-intermediate',provider:'Quaternius CC0 (pinned redistributed copies)',visualAcceptanceEligible:false,visualBlocker:'Universal Base Character bodies and authored animation are active, but final Vanguard/Warden fantasy outfit composition is not installed.',actors:{hero:{url:'/assets/authored/quaternius-base/VanguardBase.glb',label:'Vanguard / Quaternius Universal Base Character intermediate',height:2.48,bulk:1.02,animationUrls},enemy:{url:'/assets/authored/quaternius-base/WardenBase.glb',label:'Dread Warden / Quaternius Universal Base Character intermediate',height:2.72,bulk:1.08,animationUrls}}};
  await writeFile(PROFILE_PATH,JSON.stringify(profile,null,2));console.log(`Pinned Quaternius base + ${ualCore.length+ualCombat.length} Gauntlet-relevant authored animations ready. Final visual acceptance remains blocked until fantasy outfit composition is installed.`);
}

await mkdir(OUT_ROOT,{recursive:true});if(QUATERNIUS_MANIFEST)await installQuaternius(QUATERNIUS_MANIFEST);else await installPinnedQuaterniusBase();
