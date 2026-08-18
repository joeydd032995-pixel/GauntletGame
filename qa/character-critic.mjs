import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const root='artifacts/character-reference',W=2560,H=1440;
const report=JSON.parse(await fs.readFile(path.join(root,'capture-report.json'),'utf8')),fail=[];
if(report.target!=='high-end OSRS/07Scape')fail.push(`wrong visual target=${report.target||'missing'}`);
if(report.mocap?.status!=='ready')fail.push(`legacy gameplay mocap status=${report.mocap?.status||'missing'}`);for(const name of ['walk','run'])if(!report.mocap?.installed?.includes(name))fail.push(`legacy gameplay mocap ${name} not installed`);
if(report.shots?.length!==15)fail.push(`expected 15 evidence shots, got ${report.shots?.length||0}`);if(!report.turntables?.includes('hero')||!report.turntables?.includes('enemy'))fail.push('hero/enemy 360 turntable sequence missing');

const authored=report.authored||{};
if(!authored.ready)fail.push('authored presentation never reached ready state');if(authored.error)fail.push(`authored presentation error: ${authored.error}`);
function auditAuthored(label,a,required,minUnique){
  if(!a){fail.push(`${label} authored telemetry missing`);return;}
  if(!a.installed)fail.push(`${label} authored model not installed`);if(a.error)fail.push(`${label} authored load error=${a.error}`);
  if((a.visibleProceduralMeshes??999)>0)fail.push(`${label} visible procedural character meshes=${a.visibleProceduralMeshes}`);
  if((a.skinnedMeshes||0)<1)fail.push(`${label} has no skinned authored mesh`);if((a.triangles||0)<1500)fail.push(`${label} authored triangles ${a.triangles||0}<1500`);
  if((a.meshes||0)<1)fail.push(`${label} authored mesh count missing`);if((a.materials||0)<2)fail.push(`${label} authored material separation ${a.materials||0}<2`);
  if((a.clips?.length||0)<20)fail.push(`${label} authored animation library ${a.clips?.length||0}<20 clips`);
  for(const state of required)if(!a.clipMap?.[state])fail.push(`${label} lacks authored clip mapping for ${state}`);
  const unique=new Set(required.map(s=>a.clipMap?.[s]).filter(Boolean));if(unique.size<minUnique)fail.push(`${label} authored motion diversity ${unique.size}<${minUnique} distinct required clips`);
}
auditAuthored('Vanguard',authored.hero,['idle','walk','run','sprint','attack','rift','guard','parry','dodge','hit','death'],8);
auditAuthored('Warden',authored.enemy,['enemyIdle','enemyWalk','enemyRun','enemyAttack','enemyHeavy','enemyHit','enemyStagger','enemyDeath'],6);

const hashes=new Set();for(const shot of report.shots||[]){const file=path.join(root,`${shot.name}.png`),data=await fs.readFile(file);if(data.length<120000)fail.push(`${shot.name} suspiciously low-information QHD PNG (${data.length} bytes)`);if(data.subarray(1,4).toString()!=='PNG')fail.push(`${shot.name} not PNG`);const w=data.readUInt32BE(16),h=data.readUInt32BE(20);if(w!==W||h!==H)fail.push(`${shot.name} resolution ${w}x${h}, expected ${W}x${H}`);const hash=crypto.createHash('sha256').update(data).digest('hex');if(hashes.has(hash))fail.push(`${shot.name} duplicates another evidence frame`);hashes.add(hash);}
const videoDir=path.join(root,'video'),videos=(await fs.readdir(videoDir)).filter(f=>f.endsWith('.webm'));if(!videos.length)fail.push('motion WebM missing');else{const sizes=await Promise.all(videos.map(async f=>(await fs.stat(path.join(videoDir,f))).size));if(Math.max(...sizes)<1500000)fail.push(`motion WebM too small (${Math.max(...sizes)} bytes)`);}
const telemetry=(report.shots||[]).map(s=>s.metrics?.quality?.heroAnimation?.footIK).filter(Boolean);if(!telemetry.length)fail.push('legacy motion foot-contact telemetry missing');else{const last=telemetry.at(-1),maxAvg=Math.max(...telemetry.map(t=>t.averageSlide||0)),maxPeak=Math.max(...telemetry.map(t=>t.peakSlide||0));if((last.contactSamples||0)<20)fail.push(`legacy foot contact samples ${last.contactSamples||0}<20`);if(maxAvg>.35)fail.push(`legacy average planted-foot slide ${maxAvg.toFixed(3)}>0.350 m/s`);if(maxPeak>1.75)fail.push(`legacy peak planted-foot slide ${maxPeak.toFixed(3)}>1.750 m/s`);}
const result={status:fail.length?'REJECTED':'STRUCTURAL_PASS_VISUAL_REVIEW_REQUIRED',generatedAt:new Date().toISOString(),target:report.target,authored,mocap:report.mocap,evidenceFrames:hashes.size,turntables:report.turntables,failures:fail,note:'Structural success never constitutes visual approval. QHD frames and motion must still receive harsh OSRS/07Scape visual review.'};await fs.writeFile(path.join(root,'critic-report.json'),JSON.stringify(result,null,2));
if(fail.length){console.error(`Authored OSRS character critic REJECTED:\n- ${fail.join('\n- ')}`);process.exit(1);}console.log('Authored character structural gate satisfied; visual approval remains intentionally withheld pending QHD/motion review.');
