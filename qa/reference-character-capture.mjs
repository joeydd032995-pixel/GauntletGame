import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const out='artifacts/character-reference';
await fs.rm(out,{recursive:true,force:true});await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1});
const page=await context.newPage();page.setDefaultTimeout(60000);
const errors=[];page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`);});
await page.goto('http://127.0.0.1:4173',{waitUntil:'networkidle'});await page.waitForSelector('canvas',{state:'visible'});await page.waitForFunction(()=>!!window.__GAUNTLET_CAPTURE__);await page.waitForTimeout(1800);

const shots=[
  ['hero-idle-front',{subject:'hero',action:'idle',view:'front',distance:4.6,height:1.12,fov:38,neutral:true},650],
  ['hero-idle-three-quarter',{subject:'hero',action:'idle',view:'threeQuarter',distance:4.8,height:1.12,fov:39,neutral:true},500],
  ['hero-idle-side',{subject:'hero',action:'idle',view:'side',distance:4.8,height:1.12,fov:39,neutral:true},500],
  ['hero-idle-rear',{subject:'hero',action:'idle',view:'rear',distance:4.8,height:1.12,fov:39,neutral:true},500],
  ['hero-walk-rear',{subject:'hero',action:'walk',view:'rear',distance:5.4,height:1.3,fov:44},520],
  ['hero-run-rear',{subject:'hero',action:'run',view:'rear',distance:5.6,height:1.34,fov:45},420],
  ['hero-sprint-rear',{subject:'hero',action:'sprint',view:'rear',distance:5.8,height:1.38,fov:46},330],
  ['hero-sever-strike',{subject:'hero',action:'attack',view:'threeQuarter',distance:5.0,height:1.22,fov:41},300],
  ['hero-rift-performance',{subject:'hero',action:'rift',view:'threeQuarter',distance:5.2,height:1.22,fov:42},650],
  ['hero-guard',{subject:'hero',action:'guard',view:'threeQuarter',distance:4.9,height:1.18,fov:40},190],
  ['hero-parry',{subject:'hero',action:'parry',view:'threeQuarter',distance:4.9,height:1.18,fov:40},180],
  ['hero-evade',{subject:'hero',action:'dodge',view:'side',distance:5.4,height:1.24,fov:43},310],
  ['warden-idle-three-quarter',{subject:'enemy',action:'enemyIdle',view:'threeQuarter',distance:5.3,height:1.25,fov:41,neutral:true},600],
  ['warden-attack',{subject:'enemy',action:'enemyAttack',view:'threeQuarter',distance:5.5,height:1.25,fov:42},520],
  ['warden-heavy',{subject:'enemy',action:'enemyHeavy',view:'threeQuarter',distance:5.5,height:1.25,fov:42},710]
];
const report=[];
for(const [name,opts,delay] of shots){
  const setup=await page.evaluate(o=>window.__GAUNTLET_CAPTURE__.enter(o),opts);await page.waitForTimeout(delay);
  const metrics=await page.evaluate(()=>({capture:window.__GAUNTLET_CAPTURE__.snapshot(),quality:window.__GAUNTLET_CAPTURE__.quality(),runtime:window.__GAUNTLET_METRICS__||null}));
  const file=path.join(out,`${name}.png`);await page.screenshot({path:file,type:'png'});const stat=await fs.stat(file);report.push({name,file,width:1920,height:1080,bytes:stat.size,setup,metrics});
}
await page.evaluate(()=>window.__GAUNTLET_CAPTURE__.exit());
await fs.writeFile(path.join(out,'capture-report.json'),JSON.stringify({generatedAt:new Date().toISOString(),shots:report,errors},null,2));
await fs.writeFile(path.join(out,'browser-errors.txt'),errors.length?errors.join('\n'):'No pageerror/console.error detected.\n');
await browser.close();
if(errors.length)throw new Error(`Character reference capture rejected:\n${errors.join('\n')}`);
console.log(`Character reference capture: PASS (${report.length} frames)`);
