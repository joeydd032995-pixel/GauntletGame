import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const REV='672074b73ba276876a19e8816ecdc5241817ab47';
const REPO='KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0';
const ROOT=`https://raw.githubusercontent.com/${REPO}/${REV}/addons/kaykit_character_pack_adventures/Characters/gltf`;
const assets=[
  {file:'Knight.glb',role:'Vanguard',expectedBytes:3_659_532},
  {file:'Barbarian.glb',role:'Dread Warden',expectedBytes:3_613_268}
];
const outDir=path.resolve('public/assets/authored/kaykit-adventurers');
await mkdir(outDir,{recursive:true});
const provenance={source:'KayKit Adventurers 1.0',repository:REPO,revision:REV,license:'CC0 1.0',purpose:'Authored visible character baseline for Gauntlet OSRS art reset',files:{}};
for(const asset of assets){
  const url=`${ROOT}/${asset.file}`;
  const response=await fetch(url,{redirect:'follow'});
  if(!response.ok)throw new Error(`Authored character fetch failed ${response.status}: ${url}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length!==asset.expectedBytes)throw new Error(`Authored character size mismatch: ${asset.file} ${bytes.length} != ${asset.expectedBytes}`);
  if(bytes.subarray(0,4).toString('ascii')!=='glTF')throw new Error(`Invalid GLB magic: ${asset.file}`);
  const sha256=createHash('sha256').update(bytes).digest('hex');
  await writeFile(path.join(outDir,asset.file),bytes);
  provenance.files[asset.file]={role:asset.role,url,bytes:bytes.length,sha256};
}
await writeFile(path.join(outDir,'provenance.json'),JSON.stringify(provenance,null,2));
console.log(`Authored CC0 characters ready: ${Object.entries(provenance.files).map(([k,v])=>`${k} ${v.bytes}B ${v.sha256.slice(0,12)}`).join(', ')}`);
