import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const REV='a8bc2d54ff0ac92e78ff71431b1023eda42bf482';
const ROOT=`https://raw.githubusercontent.com/makehumancommunity/makehuman/${REV}/makehuman/data`;
const assets=[
  {name:'base.obj',url:`${ROOT}/3dobjs/base.obj`,minBytes:1_000_000,verify:text=>text.includes('explicitly released as CC0')&&text.includes('basemesh hm08')},
  {name:'default_weights.mhw',url:`${ROOT}/rigs/default_weights.mhw`,minBytes:500_000,verify:text=>text.includes('"license": "CC0"')&&text.includes('"weights"')}
];
const outDir=path.resolve('public/assets/makehuman');
await mkdir(outDir,{recursive:true});
const provenance={source:'MakeHuman Community',repository:'makehumancommunity/makehuman',revision:REV,license:'CC0',files:{}};
for(const asset of assets){
  const response=await fetch(asset.url,{redirect:'follow'});
  if(!response.ok)throw new Error(`Character asset fetch failed ${response.status}: ${asset.url}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  const text=bytes.toString('utf8');
  if(bytes.length<asset.minBytes||!asset.verify(text))throw new Error(`Character asset validation failed: ${asset.name} (${bytes.length} bytes)`);
  await writeFile(path.join(outDir,asset.name),bytes);
  provenance.files[asset.name]={url:asset.url,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
}
await writeFile(path.join(outDir,'provenance.json'),JSON.stringify(provenance,null,2));
console.log(`MakeHuman CC0 character source acquired at ${REV}: ${Object.entries(provenance.files).map(([k,v])=>`${k} ${v.bytes}B ${v.sha256.slice(0,12)}`).join(', ')}`);
