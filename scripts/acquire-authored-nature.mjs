import { mkdtemp, mkdir, rm, writeFile, readdir, stat, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const exec=promisify(execFile);
const ARCHIVE_URL='https://opengameart.org/sites/default/files/stylized_nature_megakitstandard.zip';
const OFFICIAL_URL='https://quaternius.com/packs/stylizednaturemegakit.html';
const MIRROR_PAGE='https://opengameart.org/content/stylized-nature-megakit';
const outDir=path.resolve('public/assets/authored/quaternius-nature');
const temp=await mkdtemp(path.join(tmpdir(),'gauntlet-nature-'));

async function walk(root,predicate,results=[]){for(const entry of await readdir(root,{withFileTypes:true})){const full=path.join(root,entry.name);if(entry.isDirectory())await walk(full,predicate,results);else if(predicate(full))results.push(full);}return results;}
async function directories(root,results=[]){for(const entry of await readdir(root,{withFileTypes:true})){if(!entry.isDirectory())continue;const full=path.join(root,entry.name);results.push(full);await directories(full,results);}return results;}
function relUnix(root,file){return path.relative(root,file).split(path.sep).join('/');}
function unique(items){return [...new Set(items)];}
function classify(files){
  const lower=f=>path.basename(f).toLowerCase(),trees=files.filter(f=>/tree/.test(lower(f))),pines=trees.filter(f=>/(pine|spruce|fir|conifer)/.test(lower(f))),broad=trees.filter(f=>!/(pine|spruce|fir|conifer)/.test(lower(f))),bushes=files.filter(f=>/(bush|shrub)/.test(lower(f))),grass=files.filter(f=>/grass/.test(lower(f))),flowers=files.filter(f=>/(flower|daisy|tulip|rose|lavender|plant)/.test(lower(f))),mushrooms=files.filter(f=>/(mushroom|fung)/.test(lower(f)));
  return{trees,pines,broad,bushes,grass,flowers,mushrooms};
}
function takeSpread(items,count){if(!items.length)return[];const out=[];for(let i=0;i<count;i++)out.push(items[Math.min(items.length-1,Math.floor(i*items.length/count))]);return unique(out);}

try{
  const response=await fetch(ARCHIVE_URL,{redirect:'follow',headers:{'user-agent':'GauntletGame/0.4 CC0 asset acquisition'}});if(!response.ok)throw new Error(`Stylized Nature MegaKit fetch failed ${response.status}: ${ARCHIVE_URL}`);
  const bytes=Buffer.from(await response.arrayBuffer()),magic=bytes.subarray(0,4).toString('hex');if(bytes.length<80_000_000||magic!=='504b0304')throw new Error(`Invalid or suspicious nature archive (${bytes.length} bytes, magic=${magic})`);
  const sha256=createHash('sha256').update(bytes).digest('hex'),zipPath=path.join(temp,'nature.zip'),extractDir=path.join(temp,'extract');await writeFile(zipPath,bytes);await mkdir(extractDir,{recursive:true});await exec('unzip',['-q',zipPath,'-d',extractDir],{maxBuffer:1024*1024*16});
  const dirs=[extractDir,...await directories(extractDir)],candidates=[];for(const dir of dirs){const gltfs=await walk(dir,f=>/\.gltf$/i.test(f));if(gltfs.length)candidates.push({dir,gltfs});}candidates.sort((a,b)=>b.gltfs.length-a.gltfs.length);const best=candidates.find(c=>/(^|[\\/])gltf([\\/]|$)/i.test(c.dir))||candidates[0];if(!best||best.gltfs.length<25)throw new Error(`Could not locate substantial glTF tier in nature archive; best=${best?.gltfs.length||0}`);
  await rm(outDir,{recursive:true,force:true});await mkdir(outDir,{recursive:true});await cp(best.dir,outDir,{recursive:true});
  const installed=await walk(outDir,f=>/\.gltf$/i.test(f)),groups=classify(installed),treePool=groups.broad.length?groups.broad:groups.trees,pinePool=groups.pines.length?groups.pines:groups.trees.slice().reverse(),plantPool=unique([...groups.bushes,...groups.grass,...groups.flowers,...groups.mushrooms]);
  if(treePool.length<3||pinePool.length<2||plantPool.length<4)throw new Error(`Nature archive category coverage insufficient: broad=${treePool.length}, pine=${pinePool.length}, plants=${plantPool.length}, total=${installed.length}`);
  const selected={broadleaf:takeSpread(treePool,4),conifer:takeSpread(pinePool,3),plants:takeSpread(plantPool,8)};for(const key of Object.keys(selected))selected[key]=selected[key].map(f=>`/assets/authored/quaternius-nature/${relUnix(outDir,f)}`);
  const fileStats={};for(const f of installed){const s=await stat(f);fileStats[relUnix(outDir,f)]={bytes:s.size};}
  const manifest={source:'Quaternius Stylized Nature MegaKit Standard',officialUrl:OFFICIAL_URL,mirrorPage:MIRROR_PAGE,archiveUrl:ARCHIVE_URL,archiveSha256:sha256,archiveBytes:bytes.length,license:'CC0 1.0 Universal',tier:'standard-free-authored-nature',eligibleForFinalVisualReview:true,gltfRoot:relUnix(extractDir,best.dir),gltfCount:installed.length,selected,files:fileStats,note:'Free Standard tier published by Quaternius; authored near/mid-field vegetation replaces procedural hero foliage. Background procedural foliage remains only as scalable LOD support.'};
  await writeFile(path.join(outDir,'nature-manifest.json'),JSON.stringify(manifest,null,2));
  console.log(`Authored CC0 nature ready: ${installed.length} glTF models, archive ${bytes.length}B sha256=${sha256}, selected broadleaf=${selected.broadleaf.length} conifer=${selected.conifer.length} plants=${selected.plants.length}`);
}finally{await rm(temp,{recursive:true,force:true}).catch(()=>{});}
