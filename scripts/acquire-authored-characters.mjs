import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const OUT_ROOT=path.resolve('public/assets/authored');
const PROFILE_PATH=path.join(OUT_ROOT,'character-source.json');
const QUATERNIUS_MANIFEST=process.env.GAUNTLET_QUATERNIUS_MANIFEST?.trim();

const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const assertGlb=(bytes,label)=>{if(bytes.length<1024)throw new Error(`${label} is suspiciously small (${bytes.length} bytes)`);if(bytes.subarray(0,4).toString('ascii')!=='glTF')throw new Error(`${label} is not a valid GLB`);};
const exists=async file=>{try{await access(file);return true;}catch{return false;}};

async function installExternalGlb(sourcePath,destDir,destName){
  const absolute=path.resolve(sourcePath);if(!(await exists(absolute)))throw new Error(`Missing external authored asset: ${absolute}`);
  const bytes=await readFile(absolute);assertGlb(bytes,absolute);await mkdir(destDir,{recursive:true});const dest=path.join(destDir,destName);await copyFile(absolute,dest);
  return{bytes:bytes.length,sha256:sha256(bytes),sourcePath:absolute,dest};
}

async function installQuaternius(manifestPath){
  const raw=JSON.parse(await readFile(path.resolve(manifestPath),'utf8'));
  for(const role of ['hero','enemy'])if(!raw?.actors?.[role]?.model)throw new Error(`Quaternius manifest missing actors.${role}.model`);
  const outDir=path.join(OUT_ROOT,'quaternius');await mkdir(outDir,{recursive:true});
  const provenance={source:'Quaternius Universal Base Characters + Modular Character Outfits - Fantasy + Universal Animation Library',license:'CC0 1.0',purpose:'Production authored character tier for Gauntlet OSRS art reset',manifest:path.resolve(manifestPath),files:{}};
  const actors={};
  for(const role of ['hero','enemy']){
    const spec=raw.actors[role],modelName=`${role}.glb`,modelMeta=await installExternalGlb(spec.model,outDir,modelName);provenance.files[modelName]=modelMeta;
    const animationUrls=[];for(let i=0;i<(spec.animations||[]).length;i++){const name=`${role}-anim-${String(i+1).padStart(2,'0')}.glb`,meta=await installExternalGlb(spec.animations[i],outDir,name);provenance.files[name]=meta;animationUrls.push(`/assets/authored/quaternius/${name}`);}
    actors[role]={url:`/assets/authored/quaternius/${modelName}`,label:spec.label||`${role==='hero'?'Vanguard':'Dread Warden'} / Quaternius CC0`,height:Number(spec.height)||(role==='hero'?2.48:2.72),bulk:Number(spec.bulk)||(role==='hero'?1.02:1.06),animationUrls};
  }
  const profile={schemaVersion:1,target:'high-end OSRS/07Scape',tier:'production-quaternius',provider:'Quaternius',visualAcceptanceEligible:true,actors};
  await writeFile(path.join(outDir,'provenance.json'),JSON.stringify(provenance,null,2));await writeFile(PROFILE_PATH,JSON.stringify(profile,null,2));
  console.log(`Production Quaternius character tier installed from ${path.resolve(manifestPath)}.`);return;
}

async function installKayKitScaffold(){
  const REV='672074b73ba276876a19e8816ecdc5241817ab47';
  const REPO='KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0';
  const ROOT=`https://raw.githubusercontent.com/${REPO}/${REV}/addons/kaykit_character_pack_adventures/Characters/gltf`;
  const assets=[{file:'Knight.glb',role:'Vanguard',expectedBytes:3_659_532},{file:'Barbarian.glb',role:'Dread Warden',expectedBytes:3_613_268}];
  const outDir=path.join(OUT_ROOT,'kaykit-adventurers');await mkdir(outDir,{recursive:true});
  const provenance={source:'KayKit Adventurers 1.0',repository:REPO,revision:REV,license:'CC0 1.0',purpose:'Temporary authored scaffold only; visually rejected for final OSRS acceptance',files:{}};
  for(const asset of assets){const url=`${ROOT}/${asset.file}`,response=await fetch(url,{redirect:'follow'});if(!response.ok)throw new Error(`Authored character fetch failed ${response.status}: ${url}`);const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length!==asset.expectedBytes)throw new Error(`Authored character size mismatch: ${asset.file} ${bytes.length} != ${asset.expectedBytes}`);assertGlb(bytes,asset.file);const digest=sha256(bytes);await writeFile(path.join(outDir,asset.file),bytes);provenance.files[asset.file]={role:asset.role,url,bytes:bytes.length,sha256:digest};}
  await writeFile(path.join(outDir,'provenance.json'),JSON.stringify(provenance,null,2));
  const profile={schemaVersion:1,target:'high-end OSRS/07Scape',tier:'scaffold-kaykit',provider:'KayKit',visualAcceptanceEligible:false,actors:{hero:{url:'/assets/authored/kaykit-adventurers/Knight.glb',label:'Vanguard / KayKit Knight CC0 scaffold',height:2.48,bulk:1.02,animationUrls:[]},enemy:{url:'/assets/authored/kaykit-adventurers/Barbarian.glb',label:'Dread Warden / KayKit Barbarian CC0 scaffold',height:2.72,bulk:1.08,animationUrls:[]}}};
  await writeFile(PROFILE_PATH,JSON.stringify(profile,null,2));console.log(`Authored scaffold ready: ${Object.entries(provenance.files).map(([k,v])=>`${k} ${v.bytes}B ${v.sha256.slice(0,12)}`).join(', ')}. Visual acceptance remains blocked until the Quaternius production tier is installed.`);
}

await mkdir(OUT_ROOT,{recursive:true});
if(QUATERNIUS_MANIFEST)await installQuaternius(QUATERNIUS_MANIFEST);else await installKayKitScaffold();
