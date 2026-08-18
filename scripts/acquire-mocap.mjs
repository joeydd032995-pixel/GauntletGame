import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const root='public/mocap/cmu';await fs.mkdir(root,{recursive:true});
const sources=[
  {file:'17_08.bvh',url:'https://raw.githubusercontent.com/una-dinosauria/cmu-mocap/master/data/017/17_08.bvh',purpose:'heavy-set walk source'},
  {file:'16_35.bvh',url:'https://raw.githubusercontent.com/una-dinosauria/cmu-mocap/master/data/016/16_35.bvh',purpose:'run/jog source'},
  {file:'16_57.bvh',url:'https://raw.githubusercontent.com/una-dinosauria/cmu-mocap/master/data/016/16_57.bvh',purpose:'run/jog sudden-stop source'},
  {file:'02_07.bvh',url:'https://raw.githubusercontent.com/una-dinosauria/cmu-mocap/master/data/002/02_07.bvh',purpose:'swordplay body-dynamics reference'}
];
const records=[];
for(const src of sources){
  const file=path.join(root,src.file);let data=null;
  try{const current=await fs.readFile(file);if(current.length>10000)data=current;}catch{}
  if(!data){const r=await fetch(src.url,{headers:{'user-agent':'GauntletGame-mocap-acquisition'}});if(!r.ok)throw new Error(`${src.file}: HTTP ${r.status}`);data=Buffer.from(await r.arrayBuffer());if(data.length<10000)throw new Error(`${src.file}: suspiciously small payload ${data.length}`);await fs.writeFile(file,data);}
  records.push({...src,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')});
}
const provenance={generatedAt:new Date().toISOString(),dataset:'Carnegie Mellon University Graphics Lab Motion Capture Database',officialDatabase:'http://mocap.cs.cmu.edu/',conversionRepository:'https://github.com/una-dinosauria/cmu-mocap',usageNote:'CMU states its motion-capture database is free for all uses, including commercial products. Source motion is retargeted/edited in Gauntlet; raw files are not part of the shipped repository.',records};
await fs.writeFile(path.join(root,'provenance.json'),JSON.stringify(provenance,null,2));
console.log(`CMU mocap ready: ${records.map(r=>`${r.file} (${r.bytes} bytes)`).join(', ')}`);
