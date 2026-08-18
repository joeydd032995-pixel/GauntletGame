import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const out='artifacts/character-reference',WIDTH=2560,HEIGHT=1440;
await fs.rm(out,{recursive:true,force:true});await fs.mkdir(path.join(out,'video'),{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:WIDTH,height:HEIGHT},deviceScaleFactor:1,recordVideo:{dir:path.join(out,'video'),size:{width:1920,height:1080}}});
const page=await context.newPage();page.setDefaultTimeout(60000);
const errors=[];page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`);});
const navStart=Date.now();await page.goto('http://127.0.0.1:4173',{waitUntil:'domcontentloaded',timeout:20000});const domMs=Date.now()-navStart;
await page.waitForSelector('canvas',{state:'attached',timeout:20000});const canvasMs=Date.now()-navStart;
await page.waitForFunction(()=>window.__GAUNTLET_CAPTURE__&&window.__GAUNTLET_METRICS__?.renderer?.calls>0,{timeout:60000});const firstRenderedMs=Date.now()-navStart;
await page.waitForFunction(()=>window.__GAUNTLET_MOCAP__&&['ready','partial','rejected'].includes(window.__GAUNTLET_MOCAP__.status),{timeout:30000});
const mocap=await page.evaluate(()=>window.__GAUNTLET_MOCAP__);if(mocap.status!=='ready')throw new Error(`Mocap retarget rejected before capture: ${JSON.stringify(mocap)}`);
const boot={domMs,canvasMs,firstRenderedMs,mocapTotalMs:mocap.totalMs??null};
await page.evaluate(()=>{const hud=document.querySelector('#hud');if(hud)hud.style.visibility='hidden';});await page.waitForTimeout(650);

async function turntable(subject,action,distance,height,fov){await page.evaluate(o=>window.__GAUNTLET_CAPTURE__.enter(o),{subject,action,view:'front',distance,height,fov,neutral:true});for(let deg=0;deg<=360;deg+=15){await page.evaluate(d=>window.__GAUNTLET_CAPTURE__.setAngle(d),deg);await page.waitForTimeout(70);}}
await turntable('hero','idle',4.8,1.12,39);await turntable('enemy','enemyIdle',5.25,1.22,41);
const shots=[
  ['hero-idle-front',{subject:'hero',action:'idle',view:'front',distance:4.6,height:1.12,fov:38,neutral:true},650],
  ['hero-idle-three-quarter',{subject:'hero',action:'idle',view:'threeQuarter',distance:4.8,height:1.12,fov:39,neutral:true},500],
  ['hero-idle-side',{subject:'hero',action:'idle',view:'side',distance:4.8,height:1.12,fov:39,neutral:true},500],
  ['hero-idle-rear',{subject:'hero',action:'idle',view:'rear',distance:4.8,height:1.12,fov:39,neutral:true},500],
  ['hero-walk-rear',{subject:'hero',action:'walk',view:'rear',distance:5.4,height:1.3,fov:44},850],
  ['hero-run-rear',{subject:'hero',action:'run',view:'rear',distance:5.6,height:1.34,fov:45},650],
  ['hero-sprint-rear',{subject:'hero',action:'sprint',view:'rear',distance:5.8,height:1.38,fov:46},520],
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
for(const [name,opts,delay] of shots){const setup=await page.evaluate(o=>window.__GAUNTLET_CAPTURE__.enter(o),opts);await page.waitForTimeout(delay);const metrics=await page.evaluate(()=>({capture:window.__GAUNTLET_CAPTURE__.snapshot(),quality:window.__GAUNTLET_CAPTURE__.quality(),runtime:window.__GAUNTLET_METRICS__||null,mocap:window.__GAUNTLET_MOCAP__}));const file=path.join(out,`${name}.png`);await page.screenshot({path:file,type:'png'});const stat=await fs.stat(file);report.push({name,file,width:WIDTH,height:HEIGHT,bytes:stat.size,setup,metrics});}
await page.evaluate(()=>window.__GAUNTLET_CAPTURE__.exit());
await fs.writeFile(path.join(out,'capture-report.json'),JSON.stringify({generatedAt:new Date().toISOString(),boot,mocap,stillResolution:[WIDTH,HEIGHT],motionResolution:[1920,1080],turntables:['hero','enemy'],shots:report,errors},null,2));
await fs.writeFile(path.join(out,'browser-errors.txt'),errors.length?errors.join('\n'):'No pageerror/console.error detected.\n');
await page.close();await context.close();await browser.close();
const videos=(await fs.readdir(path.join(out,'video'))).filter(f=>f.endsWith('.webm'));if(!videos.length)throw new Error('Character motion evidence rejected: no 1080p WebM produced');if(errors.length)throw new Error(`Character reference capture rejected:\n${errors.join('\n')}`);console.log(`Character reference capture: PASS (${report.length} QHD frames, turntables, ${videos.length} motion video; first render ${firstRenderedMs}ms)`);
