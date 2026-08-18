import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const root='public/mocap/cmu';await fs.rm(root,{recursive:true,force:true});await fs.mkdir(root,{recursive:true});
const sources=[
  {source:'17_08.bvh',runtime:'walk_runtime.bvh',url:'https://raw.githubusercontent.com/una-dinosauria/cmu-mocap/master/data/017/17_08.bvh',purpose:'heavy-set walk source',maxFrames:300},
  {source:'16_35.bvh',runtime:'run_runtime.bvh',url:'https://raw.githubusercontent.com/una-dinosauria/cmu-mocap/master/data/016/16_35.bvh',purpose:'run/jog source',maxFrames:180},
  {source:'16_57.bvh',runtime:'stop_reference.bvh',url:'https://raw.githubusercontent.com/una-dinosauria/cmu-mocap/master/data/016/16_57.bvh',purpose:'run/jog sudden-stop authoring reference',maxFrames:240},
  {source:'02_07.bvh',runtime:'sword_reference.bvh',url:'https://raw.githubusercontent.com/una-dinosauria/cmu-mocap/master/data/002/02_07.bvh',purpose:'swordplay body-dynamics authoring reference',maxFrames:300}
];
function trimBVH(text,maxFrames){
  const marker='MOTION';const motionAt=text.indexOf(marker);if(motionAt<0)throw new Error('BVH missing MOTION section');
  const header=text.slice(0,motionAt),motion=text.slice(motionAt).replace(/\r/g,'').split('\n');
  const framesIndex=motion.findIndex(l=>/^Frames:\s*/.test(l)),timeIndex=motion.findIndex(l=>/^Frame Time:\s*/.test(l));if(framesIndex<0||timeIndex<0)throw new Error('BVH missing frame metadata');
  const declared=Number(motion[framesIndex].split(':')[1].trim()),rows=motion.slice(timeIndex+1).filter(l=>l.trim().length),count=Math.min(maxFrames,declared,rows.length);
  motion[framesIndex]=`Frames: ${count}`;return `${header}${motion.slice(0,timeIndex+1).join('\n')}\n${rows.slice(0,count).join('\n')}\n`;
}
const records=[];
for(const src of sources){
  const r=await fetch(src.url,{headers:{'user-agent':'GauntletGame-mocap-acquisition'}});if(!r.ok)throw new Error(`${src.source}: HTTP ${r.status}`);
  const original=Buffer.from(await r.arrayBuffer());if(original.length<10000)throw new Error(`${src.source}: suspiciously small payload ${original.length}`);
  const runtime=Buffer.from(trimBVH(original.toString('utf8'),src.maxFrames),'utf8');await fs.writeFile(path.join(root,src.runtime),runtime);
  records.push({...src,sourceBytes:original.length,runtimeBytes:runtime.length,sourceSha256:crypto.createHash('sha256').update(original).digest('hex'),runtimeSha256:crypto.createHash('sha256').update(runtime).digest('hex')});
}
const provenance={generatedAt:new Date().toISOString(),dataset:'Carnegie Mellon University Graphics Lab Motion Capture Database',officialDatabase:'http://mocap.cs.cmu.edu/',conversionRepository:'https://github.com/una-dinosauria/cmu-mocap',usageNote:'CMU states its motion-capture database is free for all uses, including commercial products. Gauntlet downloads source motion during CI, writes bounded runtime/reference derivatives, retargets them in Three.js, and does not ship the full raw source files.',records};
await fs.writeFile(path.join(root,'provenance.json'),JSON.stringify(provenance,null,2));
console.log(`CMU mocap preprocessed: ${records.map(r=>`${r.runtime} ${r.runtimeBytes}B/${r.sourceBytes}B`).join(', ')}`);
