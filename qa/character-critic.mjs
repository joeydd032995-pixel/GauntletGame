import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const root='artifacts/character-reference';
const report=JSON.parse(await fs.readFile(path.join(root,'capture-report.json'),'utf8'));
const fail=[];
if(report.mocap?.status!=='ready')fail.push(`mocap status=${report.mocap?.status||'missing'}`);
for(const name of ['walk','run'])if(!report.mocap?.installed?.includes(name))fail.push(`mocap ${name} not installed`);
if(report.shots?.length!==15)fail.push(`expected 15 evidence shots, got ${report.shots?.length||0}`);
const firstQuality=report.shots?.[0]?.metrics?.quality||{},hero=firstQuality.hero?.audit,enemy=firstQuality.enemy?.audit;
function audit(label,a,minTriangles,minMeshes){
  if(!a){fail.push(`${label} audit missing`);return;}
  if(!a.valid)fail.push(`${label} base audit invalid`);
  if(a.triangles<minTriangles)fail.push(`${label} triangles ${a.triangles}<${minTriangles}`);
  if(a.productionMeshes<minMeshes)fail.push(`${label} production meshes ${a.productionMeshes}<${minMeshes}`);
  if(a.materials<4)fail.push(`${label} material zones ${a.materials}<4`);
  if(a.missingNormals?.length)fail.push(`${label} missing normals=${a.missingNormals.length}`);
  if(a.tinyMeshes?.length)fail.push(`${label} degenerate meshes=${a.tinyMeshes.length}`);
}
audit('Vanguard',hero,3500,20);audit('Warden',enemy,3000,18);
const hashes=new Set();
for(const shot of report.shots||[]){
  const file=path.join(root,`${shot.name}.png`),data=await fs.readFile(file);
  if(data.length<80000)fail.push(`${shot.name} suspiciously low-detail PNG (${data.length} bytes)`);
  if(data.subarray(1,4).toString()!=='PNG')fail.push(`${shot.name} not PNG`);
  const w=data.readUInt32BE(16),h=data.readUInt32BE(20);if(w!==1920||h!==1080)fail.push(`${shot.name} resolution ${w}x${h}`);
  const hash=crypto.createHash('sha256').update(data).digest('hex');if(hashes.has(hash))fail.push(`${shot.name} duplicates another evidence frame`);hashes.add(hash);
}
const videoDir=path.join(root,'video'),videos=(await fs.readdir(videoDir)).filter(f=>f.endsWith('.webm'));
if(!videos.length)fail.push('motion WebM missing');else{const sizes=await Promise.all(videos.map(async f=>(await fs.stat(path.join(videoDir,f))).size));if(Math.max(...sizes)<1000000)fail.push(`motion WebM too small (${Math.max(...sizes)} bytes)`);}
const telemetry=(report.shots||[]).map(s=>s.metrics?.quality?.heroAnimation?.footIK).filter(Boolean);
if(!telemetry.length)fail.push('foot-contact telemetry missing');else{
  const last=telemetry.at(-1),maxAvg=Math.max(...telemetry.map(t=>t.averageSlide||0)),maxPeak=Math.max(...telemetry.map(t=>t.peakSlide||0));
  if((last.contactSamples||0)<20)fail.push(`foot contact samples ${last.contactSamples||0}<20`);
  if(maxAvg>.35)fail.push(`average planted-foot slide ${maxAvg.toFixed(3)}>0.350 m/s`);
  if(maxPeak>1.75)fail.push(`peak planted-foot slide ${maxPeak.toFixed(3)}>1.750 m/s`);
}
const result={status:fail.length?'REJECTED':'PASS',generatedAt:new Date().toISOString(),heroAudit:hero,enemyAudit:enemy,mocap:report.mocap,evidenceFrames:hashes.size,failures:fail};
await fs.writeFile(path.join(root,'critic-report.json'),JSON.stringify(result,null,2));
if(fail.length){console.error(`Character critic REJECTED:\n- ${fail.join('\n- ')}`);process.exit(1);}
console.log('Character critic PASS: asset density, evidence uniqueness, motion video, mocap and planted-foot thresholds satisfied.');
