import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const manifest=JSON.parse(await fs.readFile('qa/reference-manifest.json','utf8'));
const out='artifacts/blind-test';await fs.rm(out,{recursive:true,force:true});await fs.mkdir(out,{recursive:true});
const gauntletRoot='artifacts/character-reference';
const missing=[];const trials=[];
async function exists(p){try{const s=await fs.stat(p);return s.isFile()&&s.size>4096;}catch{return false;}}
for(const trial of manifest.trials){
  const g=path.join(gauntletRoot,trial.gauntlet);if(!await exists(g))missing.push(g);
  for(const baseline of ['wow','osrs']){
    const ref=path.join(manifest.baselines[baseline].captureRoot,trial[baseline]);if(!await exists(ref))missing.push(ref);
    const flip=crypto.randomInt(0,2)===1;
    trials.push({id:`${trial.id}-${baseline}`,baseline,axes:trial.axes,left:flip?ref:g,right:flip?g:ref,answer:flip?'right':'left'});
  }
}
const session={generatedAt:new Date().toISOString(),referenceDate:manifest.referenceDate,matchRules:manifest.matchRules,mandatoryAxes:manifest.mandatoryAxes,trials:trials.map(({answer,...t})=>t)};
await fs.writeFile(path.join(out,'session.json'),JSON.stringify(session,null,2));
await fs.writeFile(path.join(out,'answer-key.json'),JSON.stringify(Object.fromEntries(trials.map(t=>[t.id,t.answer])),null,2));
const rows=trials.map(t=>`<section><h2>${t.id}</h2><div class="pair"><figure><img src="../../${t.left}"><figcaption>A</figcaption></figure><figure><img src="../../${t.right}"><figcaption>B</figcaption></figure></div><p>Axes: ${t.axes.join(' · ')}</p></section>`).join('\n');
await fs.writeFile(path.join(out,'index.html'),`<!doctype html><meta charset="utf-8"><title>Gauntlet Blind Character Test</title><style>body{font:16px system-ui;background:#111;color:#eee;margin:24px}section{margin:0 0 48px;padding:20px;background:#181818;border:1px solid #333}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}img{width:100%;height:auto;display:block;background:#000}figcaption{text-align:center;font-size:24px;font-weight:700;padding:8px}p{color:#bbb}</style><h1>Gauntlet Blind Character Test</h1><p>Score A/B independently before opening answer-key.json. A Gauntlet pass requires wins on every mandatory axis and ≥4.0 average.</p>${rows}`);
if(missing.length){await fs.writeFile(path.join(out,'REJECTED.txt'),`REFERENCE SET INCOMPLETE\n\nMissing:\n${missing.join('\n')}\n`);console.error(`Blind comparison REJECTED: ${missing.length} required captures missing.`);process.exit(1);}console.log(`Blind comparison package ready: ${trials.length} randomized trials.`);
