import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const REV='b0ca9bd96a8072ab36a3a5464f00ed1e06a16d07';
const REPO='KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0';
const ROOT=`https://raw.githubusercontent.com/${REPO}/${REV}/addons/kaykit_dungeon_remastered/Assets/obj`;
const assets=[
  {file:'pillar_decorated.obj',role:'authored ruin pillar'},
  {file:'crates_stacked.obj',role:'authored supply cluster'},
  {file:'barrel_large_decorated.obj',role:'authored decorated barrel'},
  {file:'wall_broken.obj',role:'authored broken ruin wall'},
  {file:'wall_arched.obj',role:'authored arched landmark wall'},
  {file:'stairs_wide.obj',role:'authored broad stone stairs'}
];
const outDir=path.resolve('public/assets/authored/kaykit-dungeon');
await mkdir(outDir,{recursive:true});
const provenance={source:'KayKit Dungeon Remastered',repository:REPO,revision:REV,license:'CC0 1.0',purpose:'Authored hero environment modules for Gauntlet refined-OSRS hybrid dressing',files:{}};
for(const asset of assets){
  const url=`${ROOT}/${asset.file}`;
  const response=await fetch(url,{redirect:'follow'});
  if(!response.ok)throw new Error(`Authored environment fetch failed ${response.status}: ${url}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  const text=bytes.toString('utf8');
  if(bytes.length<1000||!/^v\s/m.test(text)||!/^f\s/m.test(text))throw new Error(`Invalid or suspicious OBJ: ${asset.file} (${bytes.length} bytes)`);
  const sha256=createHash('sha256').update(bytes).digest('hex');
  await writeFile(path.join(outDir,asset.file),bytes);
  provenance.files[asset.file]={role:asset.role,url,bytes:bytes.length,sha256};
}
await writeFile(path.join(outDir,'provenance.json'),JSON.stringify(provenance,null,2));
console.log(`Authored CC0 environment ready: ${Object.entries(provenance.files).map(([k,v])=>`${k} ${v.bytes}B ${v.sha256.slice(0,12)}`).join(', ')}`);
