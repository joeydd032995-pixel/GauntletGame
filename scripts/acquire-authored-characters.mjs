import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const OUT_ROOT=path.resolve('public/assets/authored');
const PROFILE_PATH=path.join(OUT_ROOT,'character-source.json');
const QUATERNIUS_MANIFEST=process.env.GAUNTLET_QUATERNIUS_MANIFEST?.trim();

const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const exists=async file=>{try{await access(file);return true;}catch{return false;}};
const assertGlb=(bytes,label)=>{if(bytes.length<1024)throw new Error(`${label} is suspiciously small (${bytes.length} bytes)`);if(bytes.subarray(0,4).toString('ascii')!=='glTF')throw new Error(`${label} is not a valid GLB`);};

async function fetchBytes({repo,revision,sourcePath,expectedBytes,label}){
  const url=encodeURI(`https://raw.githubusercontent.com/${repo}/${revision}/${sourcePath}`);
  const response=await fetch(url,{redirect:'follow'});
  if(!response.ok)throw new Error(`Pinned authored asset fetch failed ${response.status}: ${url}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(expectedBytes&&bytes.length!==expectedBytes)throw new Error(`Pinned authored asset size mismatch ${label}: ${bytes.length} != ${expectedBytes}`);
  return{url,bytes};
}

function pruneGlbAnimations(sourceBytes,keepNames,label){
  assertGlb(sourceBytes,label);
  if(sourceBytes.readUInt32LE(4)!==2)throw new Error(`${label} must be GLB v2`);
  const chunks=[];let offset=12,jsonIndex=-1;
  while(offset+8<=sourceBytes.length){
    const length=sourceBytes.readUInt32LE(offset),type=sourceBytes.readUInt32LE(offset+4),data=sourceBytes.subarray(offset+8,offset+8+length);
    if(data.length!==length)throw new Error(`${label} has truncated GLB chunk`);
    if(type===0x4e4f534a)jsonIndex=chunks.length;
    chunks.push({type,data});offset+=8+length;
  }
  if(jsonIndex<0)throw new Error(`${label} has no JSON chunk`);
  const json=JSON.parse(chunks[jsonIndex].data.toString('utf8').replace(/\u0000+$/g,'').trim());
  const sourceAnimations=json.animations||[],keep=new Set(keepNames),retained=sourceAnimations.filter(a=>keep.has(a.name)),found=new Set(retained.map(a=>a.name));
  const missing=keepNames.filter(name=>!found.has(name));if(missing.length)throw new Error(`${label} missing required animations: ${missing.join(', ')}`);
  json.animations=retained;
  let jsonBytes=Buffer.from(JSON.stringify(json),'utf8');const pad=(4-jsonBytes.length%4)%4;if(pad)jsonBytes=Buffer.concat([jsonBytes,Buffer.alloc(pad,0x20)]);
  chunks[jsonIndex]={type:0x4e4f534a,data:jsonBytes};
  const total=12+chunks.reduce((sum,c)=>sum+8+c.data.length,0),out=Buffer.alloc(total);out.write('glTF',0,'ascii');out.writeUInt32LE(2,4);out.writeUInt32LE(total,8);offset=12;
  for(const chunk of chunks){out.writeUInt32LE(chunk.data.length,offset);out.writeUInt32LE(chunk.type,offset+4);chunk.data.copy(out,offset+8);offset+=8+chunk.data.length;}
  return{bytes:out,retainedAnimations:retained.map(a=>a.name),sourceAnimationCount:sourceAnimations.length};
}

function stylizeExternalGltf(sourceBytes,label){
  const json=JSON.parse(sourceBytes.toString('utf8'));
  for(const material of json.materials||[]){
    delete material.normalTexture;delete material.occlusionTexture;delete material.emissiveTexture;
    const pbr=material.pbrMetallicRoughness||(material.pbrMetallicRoughness={});
    delete pbr.baseColorTexture;delete pbr.metallicRoughnessTexture;
    pbr.baseColorFactor=[1,1,1,1];pbr.metallicFactor=0;pbr.roughnessFactor=.82;
  }
  delete json.textures;delete json.images;delete json.samplers;
  const output=Buffer.from(JSON.stringify(json,null,2),'utf8');
  if(!json.skins?.length)throw new Error(`${label} is not a skinned outfit`);
  if((json.meshes?.length||0)<4)throw new Error(`${label} has insufficient clothing mesh separation`);
  return{bytes:output,materials:(json.materials||[]).map(m=>m.name||'unnamed'),meshes:(json.meshes||[]).map(m=>m.name||'unnamed')};
}

async function installExternalGlb(sourcePath,destDir,destName){
  const absolute=path.resolve(sourcePath);if(!(await exists(absolute)))throw new Error(`Missing external authored asset: ${absolute}`);
  const bytes=await readFile(absolute);assertGlb(bytes,absolute);await mkdir(destDir,{recursive:true});const dest=path.join(destDir,destName);await copyFile(absolute,dest);
  return{bytes:bytes.length,sha256:sha256(bytes),sourcePath:absolute,dest};
}

async function fetchPinnedGlb({repo,revision,sourcePath,destDir,destName,expectedBytes,role,keepAnimations}){
  const fetched=await fetchBytes({repo,revision,sourcePath,expectedBytes,label:destName});assertGlb(fetched.bytes,destName);
  const pruned=keepAnimations?pruneGlbAnimations(fetched.bytes,keepAnimations,destName):null,output=pruned?.bytes||fetched.bytes;
  await mkdir(destDir,{recursive:true});await writeFile(path.join(destDir,destName),output);
  return{role,url:fetched.url,repository:repo,revision,sourcePath,sourceBytes:fetched.bytes.length,bytes:output.length,sourceSha256:sha256(fetched.bytes),sha256:sha256(output),...(pruned?{sourceAnimationCount:pruned.sourceAnimationCount,retainedAnimations:pruned.retainedAnimations}:null)};
}

async function fetchPinnedOutfit({repo,revision,basePath,name,expectedGltfBytes,expectedBinBytes,destDir,provenance}){
  const gltfSource=`${basePath}/${name}.gltf`,binSource=`${basePath}/${name}.bin`;
  const gltf=await fetchBytes({repo,revision,sourcePath:gltfSource,expectedBytes:expectedGltfBytes,label:`${name}.gltf`});
  const bin=await fetchBytes({repo,revision,sourcePath:binSource,expectedBytes:expectedBinBytes,label:`${name}.bin`});
  const stylized=stylizeExternalGltf(gltf.bytes,`${name}.gltf`);
  await mkdir(destDir,{recursive:true});await writeFile(path.join(destDir,`${name}.gltf`),stylized.bytes);await writeFile(path.join(destDir,`${name}.bin`),bin.bytes);
  provenance.files[`${name}.gltf`]={role:`${name} rigged fantasy outfit`,url:gltf.url,repository:repo,revision,sourcePath:gltfSource,sourceBytes:gltf.bytes.length,bytes:stylized.bytes.length,sourceSha256:sha256(gltf.bytes),sha256:sha256(stylized.bytes),materials:stylized.materials,meshes:stylized.meshes,stylization:'textureless authored geometry; material slots retained and recolored at runtime for restrained OSRS readability'};
  provenance.files[`${name}.bin`]={role:`${name} skinned mesh binary`,url:bin.url,repository:repo,revision,sourcePath:binSource,bytes:bin.bytes.length,sha256:sha256(bin.bytes)};
}

async function installQuaternius(manifestPath){
  const raw=JSON.parse(await readFile(path.resolve(manifestPath),'utf8'));
  for(const role of ['hero','enemy'])if(!raw?.actors?.[role]?.model)throw new Error(`Quaternius manifest missing actors.${role}.model`);
  const outDir=path.join(OUT_ROOT,'quaternius');await mkdir(outDir,{recursive:true});
  const provenance={source:'Quaternius Universal Base Characters + Modular Character Outfits - Fantasy + Universal Animation Library',license:'CC0 1.0',purpose:'Production authored character tier for Gauntlet OSRS art reset',manifest:path.resolve(manifestPath),files:{}};const actors={};
  for(const role of ['hero','enemy']){
    const spec=raw.actors[role],modelName=`${role}.glb`,modelMeta=await installExternalGlb(spec.model,outDir,modelName);provenance.files[modelName]=modelMeta;const animationUrls=[];
    for(let i=0;i<(spec.animations||[]).length;i++){const name=`${role}-anim-${String(i+1).padStart(2,'0')}.glb`,meta=await installExternalGlb(spec.animations[i],outDir,name);provenance.files[name]=meta;animationUrls.push(`/assets/authored/quaternius/${name}`);}
    actors[role]={url:`/assets/authored/quaternius/${modelName}`,label:spec.label||`${role==='hero'?'Vanguard':'Dread Warden'} / Quaternius CC0`,height:Number(spec.height)||(role==='hero'?2.48:2.72),bulk:Number(spec.bulk)||(role==='hero'?1.02:1.06),animationUrls,clothingComplete:true,silhouetteClass:spec.silhouetteClass||role,palette:spec.palette||null,equipment:spec.equipment||[]};
  }
  const profile={schemaVersion:2,target:'high-end OSRS/07Scape',tier:'production-quaternius',provider:'Quaternius',visualAcceptanceEligible:true,clothingComplete:true,actors};
  await writeFile(path.join(outDir,'provenance.json'),JSON.stringify(provenance,null,2));await writeFile(PROFILE_PATH,JSON.stringify(profile,null,2));
  console.log(`Production Quaternius character tier installed from ${path.resolve(manifestPath)}.`);
}

async function installPinnedQuaterniusDressed(){
  const OUTFIT_REPO='Xeiliex/Tactics-Bell-Web-',OUTFIT_REV='1a5796fead53662795b05424cc3be17de0c4aeff',OUTFIT_BASE='Assets/modular-character-outfits-fantasy/Exports/glTF (Godot-Unreal)/Outfits';
  const UAL_REPO='Seyamalam/blood-league-kickoff',UAL_REV='aa02a4e6d8337a0604d2da131bcbbeb1f01badf0',BODY_REPO='rom-orlovich/prompt-fighter',BODY_REV='20095a9e8af3a32406508cfbdd3e93130de2c143';
  const GEAR_REPO='jp-beltran/game',GEAR_REV='6bf2dfa7abb2ac43a18eb63b922a86c621f01f9c',GEAR_BASE='public/Knight Character Animated by Quaternius/OBJ';
  const ualCore=['Idle_Loop','Walk_Loop','Jog_Fwd_Loop','Sprint_Loop','Punch_Cross','Spell_Simple_Shoot','Hit_Chest','Death01','Roll','Sword_Attack'];
  const ualCombat=['Idle_Shield_Loop','Melee_Hook','Hit_Knockback','Slide_Start'];
  const outDir=path.join(OUT_ROOT,'quaternius-dressed');await mkdir(outDir,{recursive:true});
  const provenance={source:'Quaternius Modular Character Outfits - Fantasy + Universal Animation Library + Knight equipment, pinned redistributed CC0 copies',officialSources:['https://quaternius.com/packs/modularcharacteroutfitsfantasy.html','https://quaternius.com/packs/universalbasecharacters.html','https://quaternius.com/packs/universalanimationlibrary.html'],license:'CC0 1.0',purpose:'Dressed OSRS-directed character tier. Universal anatomical topology/rig lineage retained; nude base presentation is forbidden. Texture decode is intentionally removed from the CI/default tier.',files:{}};
  await fetchPinnedOutfit({repo:OUTFIT_REPO,revision:OUTFIT_REV,basePath:OUTFIT_BASE,name:'Male_Ranger',expectedGltfBytes:41_447,expectedBinBytes:1_746_884,destDir:outDir,provenance});
  await fetchPinnedOutfit({repo:OUTFIT_REPO,revision:OUTFIT_REV,basePath:OUTFIT_BASE,name:'Female_Ranger',expectedGltfBytes:45_461,expectedBinBytes:1_959_556,destDir:outDir,provenance});
  const glbs=[
    {repo:UAL_REPO,revision:UAL_REV,sourcePath:'public/assets/vendor/quaternius/universal-animation-library.glb',destName:'UAL1.glb',expectedBytes:2_714_756,role:'Gauntlet-pruned Universal Animation Library',keepAnimations:ualCore},
    {repo:BODY_REPO,revision:BODY_REV,sourcePath:'public/assets/characters/Anims.glb',destName:'UAL-Combat-Extension.glb',expectedBytes:2_893_712,role:'Gauntlet-pruned Universal Animation Library combat extension',keepAnimations:ualCombat},
    {repo:GEAR_REPO,revision:GEAR_REV,sourcePath:`${GEAR_BASE}/Sword.glb`,destName:'VanguardSword.glb',expectedBytes:39_668,role:'Vanguard authored sword'},
    {repo:GEAR_REPO,revision:GEAR_REV,sourcePath:`${GEAR_BASE}/Helmet3.glb`,destName:'WardenHelmet.glb',expectedBytes:50_960,role:'Warden authored helmet'},
    {repo:GEAR_REPO,revision:GEAR_REV,sourcePath:`${GEAR_BASE}/ShoulderPads.glb`,destName:'WardenShoulderPads.glb',expectedBytes:8_704,role:'Warden authored paired shoulder armour'},
    {repo:GEAR_REPO,revision:GEAR_REV,sourcePath:`${GEAR_BASE}/Club.glb`,destName:'WardenClub.glb',expectedBytes:36_876,role:'Warden authored heavy weapon'}
  ];
  for(const spec of glbs)provenance.files[spec.destName]=await fetchPinnedGlb({...spec,destDir:outDir});
  await writeFile(path.join(outDir,'provenance.json'),JSON.stringify(provenance,null,2));
  const animationUrls=['/assets/authored/quaternius-dressed/UAL1.glb','/assets/authored/quaternius-dressed/UAL-Combat-Extension.glb'];
  const profile={schemaVersion:2,target:'high-end OSRS/07Scape',tier:'quaternius-dressed-intermediate',provider:'Quaternius CC0 (pinned redistributed copies)',visualAcceptanceEligible:false,clothingComplete:true,visualBlocker:'Near-nude presentation eliminated with rigged fantasy clothing and equipment. Harsh OSRS visual review must still approve silhouette, fit, animation deformation, role readability and equipment anchoring before production eligibility.',actors:{
    hero:{url:'/assets/authored/quaternius-dressed/Male_Ranger.gltf',label:'Vanguard / Quaternius Ranger dressed body',height:2.48,bulk:1.04,animationUrls,clothingComplete:true,silhouetteClass:'hooded-ranger-vanguard',hiddenMeshes:[],palette:'weathered-forest-bronze',equipment:[{name:'Vanguard sword',url:'/assets/authored/quaternius-dressed/VanguardSword.glb',bone:'hand_r',targetLongest:.92}]},
    enemy:{url:'/assets/authored/quaternius-dressed/Female_Ranger.gltf',label:'Dread Warden / Quaternius Ranger armored variant',height:2.72,bulk:1.18,animationUrls,clothingComplete:true,silhouetteClass:'helmeted-heavy-warden',hiddenMeshes:['Female_Ranger_Head_Hood'],palette:'charcoal-oxblood-iron',equipment:[{name:'Warden helmet',url:'/assets/authored/quaternius-dressed/WardenHelmet.glb',bone:'Head',targetLongest:.46,position:[0,.035,0]},{name:'Warden shoulder armour',url:'/assets/authored/quaternius-dressed/WardenShoulderPads.glb',bone:'spine_03',targetLongest:.86,position:[0,.04,0]},{name:'Warden club',url:'/assets/authored/quaternius-dressed/WardenClub.glb',bone:'hand_r',targetLongest:.98}]}
  }};
  await writeFile(PROFILE_PATH,JSON.stringify(profile,null,2));
  console.log(`Pinned Quaternius dressed tier ready: two textureless rigged fantasy outfits, four authored equipment pieces and ${ualCore.length+ualCombat.length} Gauntlet-relevant authored animations. Warden shoulder mass is now explicit; nude/base-body presentation remains forbidden.`);
}

await mkdir(OUT_ROOT,{recursive:true});
if(QUATERNIUS_MANIFEST)await installQuaternius(QUATERNIUS_MANIFEST);else await installPinnedQuaterniusDressed();
