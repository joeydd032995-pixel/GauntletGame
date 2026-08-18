import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const out='artifacts/character-reference',BOOT_W=1920,BOOT_H=1080,TURN_W=1280,TURN_H=720,W=2560,H=1440;
const STAGE_MS=20_000,SHOT_MS=25_000,CLOSE_MS=15_000;
const started=Date.now();
const log=(message)=>console.log(`[character-capture +${((Date.now()-started)/1000).toFixed(1)}s] ${message}`);
function timeout(ms,label){return new Promise((_,reject)=>setTimeout(()=>reject(new Error(`Character capture timeout after ${ms}ms: ${label}`)),ms));}
async function bounded(label,work,ms=STAGE_MS){log(`START ${label}`);try{const value=await Promise.race([Promise.resolve().then(work),timeout(ms,label)]);log(`DONE ${label}`);return value;}catch(error){console.error(`[character-capture] FAIL ${label}: ${error?.stack||error}`);throw error;}}

await fs.rm(out,{recursive:true,force:true});await fs.mkdir(path.join(out,'video'),{recursive:true});
let browser,context,page,cdp;const errors=[];let captureError=null;
try{
  browser=await bounded('launch Chromium',()=>chromium.launch({headless:true}));
  context=await bounded('create recording context',()=>browser.newContext({viewport:{width:BOOT_W,height:BOOT_H},deviceScaleFactor:1,recordVideo:{dir:path.join(out,'video'),size:{width:1920,height:1080}}}));
  page=await bounded('create page',()=>context.newPage());page.setDefaultTimeout(60000);
  cdp=await bounded('create CDP capture session',()=>context.newCDPSession(page));
  page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`);});
  const navStart=Date.now();
  await bounded('navigate preview',()=>page.goto('http://127.0.0.1:4173',{waitUntil:'domcontentloaded',timeout:20000}),25_000);const domMs=Date.now()-navStart;
  await bounded('wait capture API',()=>page.waitForFunction(()=>!!document.querySelector('canvas')&&!!window.__GAUNTLET_CAPTURE__,null,{timeout:60000}),65_000);const canvasMs=Date.now()-navStart;
  await bounded('wait first render',()=>page.waitForFunction(()=>window.__GAUNTLET_METRICS__?.renderer?.calls>0,null,{timeout:60000}),65_000);const firstRenderedMs=Date.now()-navStart;
  await bounded('wait authored character terminal state',()=>page.waitForFunction(()=>{const s=window.__GAUNTLET_AUTHORED_CHARACTERS__;return s?.ready===true||!!s?.error||!!s?.hero?.error||!!s?.enemy?.error;},null,{timeout:90000}),95_000);const authoredReadyMs=Date.now()-navStart;
  const authored=await bounded('read authored telemetry',()=>page.evaluate(()=>JSON.parse(JSON.stringify(window.__GAUNTLET_AUTHORED_CHARACTERS__))));
  if(!authored?.ready||authored.error||authored.hero?.error||authored.enemy?.error||!authored.hero?.installed||!authored.enemy?.installed)throw new Error(`Authored character presentation rejected before capture: ${JSON.stringify(authored)}`);
  await bounded('wait mocap state',()=>page.waitForFunction(()=>window.__GAUNTLET_MOCAP__&&['ready','partial','rejected'].includes(window.__GAUNTLET_MOCAP__.status),null,{timeout:30000}),35_000);
  const mocap=await bounded('read mocap telemetry',()=>page.evaluate(()=>window.__GAUNTLET_MOCAP__));if(mocap.status!=='ready')throw new Error(`Mocap retarget rejected before capture: ${JSON.stringify(mocap)}`);
  await bounded('hide HUD',()=>page.evaluate(()=>{const hud=document.querySelector('#hud');if(hud)hud.style.visibility='hidden';document.documentElement.style.background='#111';document.body.style.background='#111';}));
  await bounded('set turntable viewport',()=>page.setViewportSize({width:TURN_W,height:TURN_H}));
  await bounded('wait turntable canvas',()=>page.waitForFunction(({w,h})=>{const c=document.querySelector('canvas');return !!c&&c.width>=w&&c.height>=h;},{w:TURN_W,h:TURN_H},{timeout:30000}),35_000);await page.waitForTimeout(250);

  async function turntable(subject,action,distance,height,fov){
    const duration=6;
    await bounded(`${subject} timed turntable enter`,()=>page.evaluate(o=>window.__GAUNTLET_CAPTURE__.enter(o),{subject,action,view:'front',distance,height,fov,neutral:true,turntableSeconds:duration}),30_000);
    await page.waitForTimeout((duration+4)*1000);
    const snapshot=await bounded(`${subject} timed turntable verify`,()=>page.evaluate(()=>window.__GAUNTLET_CAPTURE__.snapshot()),30_000);
    if(!snapshot?.turntable?.completed)throw new Error(`${subject} timed turntable did not complete: ${JSON.stringify(snapshot?.turntable||null)}`);
    if(Math.abs((snapshot.angleDegrees||0)-360)>2)throw new Error(`${subject} timed turntable ended at ${snapshot.angleDegrees}deg instead of 360deg`);
  }
  await turntable('hero','idle',4.8,1.12,39);await turntable('enemy','enemyIdle',5.25,1.22,41);

  await bounded('set QHD viewport',()=>page.setViewportSize({width:W,height:H}));
  await bounded('wait QHD canvas',()=>page.waitForFunction(({w,h})=>{const c=document.querySelector('canvas');return !!c&&c.width>=w&&c.height>=h;},{w:W,h:H},{timeout:30000}),35_000);await page.waitForTimeout(750);const qhdReadyMs=Date.now()-navStart;
  const boot={bootResolution:[BOOT_W,BOOT_H],turntableResolution:[TURN_W,TURN_H],turntableSeconds:6,stillResolution:[W,H],stillCapture:'CDP Page.captureScreenshot',domMs,canvasMs,firstRenderedMs,authoredReadyMs,qhdReadyMs,mocapTotalMs:mocap.totalMs??null,authored};

  async function captureQhd(file){
    const result=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false,optimizeForSpeed:true});
    const bytes=Buffer.from(result.data,'base64');if(bytes.length<120000)throw new Error(`CDP QHD screenshot suspiciously small (${bytes.length} bytes)`);await fs.writeFile(file,bytes);
  }

  const shots=[
    ['hero-idle-front',{subject:'hero',action:'idle',view:'front',distance:4.6,height:1.12,fov:38,neutral:true},650],['hero-idle-three-quarter',{subject:'hero',action:'idle',view:'threeQuarter',distance:4.8,height:1.12,fov:39,neutral:true},500],['hero-idle-side',{subject:'hero',action:'idle',view:'side',distance:4.8,height:1.12,fov:39,neutral:true},500],['hero-idle-rear',{subject:'hero',action:'idle',view:'rear',distance:4.8,height:1.12,fov:39,neutral:true},500],['hero-walk-rear',{subject:'hero',action:'walk',view:'rear',distance:5.4,height:1.3,fov:44},850],['hero-run-rear',{subject:'hero',action:'run',view:'rear',distance:5.6,height:1.34,fov:45},650],['hero-sprint-rear',{subject:'hero',action:'sprint',view:'rear',distance:5.8,height:1.38,fov:46},520],['hero-sever-strike',{subject:'hero',action:'attack',view:'threeQuarter',distance:5.0,height:1.22,fov:41},300],['hero-rift-performance',{subject:'hero',action:'rift',view:'threeQuarter',distance:5.2,height:1.22,fov:42},650],['hero-guard',{subject:'hero',action:'guard',view:'threeQuarter',distance:4.9,height:1.18,fov:40},190],['hero-parry',{subject:'hero',action:'parry',view:'threeQuarter',distance:4.9,height:1.18,fov:40},180],['hero-evade',{subject:'hero',action:'dodge',view:'side',distance:5.4,height:1.24,fov:43},310],['warden-idle-three-quarter',{subject:'enemy',action:'enemyIdle',view:'threeQuarter',distance:5.3,height:1.25,fov:41,neutral:true},600],['warden-attack',{subject:'enemy',action:'enemyAttack',view:'threeQuarter',distance:5.5,height:1.25,fov:42},520],['warden-heavy',{subject:'enemy',action:'enemyHeavy',view:'threeQuarter',distance:5.5,height:1.25,fov:42},710]
  ];
  const report=[];
  for(const[name,opts,delay]of shots){
    const setup=await bounded(`${name}: enter`,()=>page.evaluate(o=>window.__GAUNTLET_CAPTURE__.enter(o),opts));await page.waitForTimeout(delay);
    const metrics=await bounded(`${name}: telemetry`,()=>page.evaluate(()=>({capture:window.__GAUNTLET_CAPTURE__.snapshot(),quality:window.__GAUNTLET_CAPTURE__.quality(),runtime:window.__GAUNTLET_METRICS__||null,mocap:window.__GAUNTLET_MOCAP__,authored:JSON.parse(JSON.stringify(window.__GAUNTLET_AUTHORED_CHARACTERS__))})));
    const file=path.join(out,`${name}.png`);await bounded(`${name}: QHD CDP screenshot`,()=>captureQhd(file),SHOT_MS+2_000);const stat=await fs.stat(file);report.push({name,file,width:W,height:H,bytes:stat.size,setup,metrics});
  }
  await bounded('exit capture mode',()=>page.evaluate(()=>window.__GAUNTLET_CAPTURE__.exit()));
  const finalAuthored=await bounded('read final authored telemetry',()=>page.evaluate(()=>JSON.parse(JSON.stringify(window.__GAUNTLET_AUTHORED_CHARACTERS__))));
  await fs.writeFile(path.join(out,'capture-report.json'),JSON.stringify({generatedAt:new Date().toISOString(),target:'high-end OSRS/07Scape',boot,mocap,authored:finalAuthored,stillResolution:[W,H],motionResolution:[1920,1080],turntables:['hero','enemy'],shots:report,errors},null,2));
  await fs.writeFile(path.join(out,'browser-errors.txt'),errors.length?errors.join('\n'):'No pageerror/console.error detected.\n');
  log(`CAPTURE COMPLETE ${report.length} QHD frames`);
}catch(error){captureError=error;try{await fs.writeFile(path.join(out,'capture-failure.txt'),`${error?.stack||error}\n`);}catch{};
}finally{
  if(cdp)try{await bounded('detach CDP session',()=>cdp.detach(),CLOSE_MS);}catch(error){errors.push(`cleanup cdp: ${error.message}`);}
  if(page)try{await bounded('close page',()=>page.close({runBeforeUnload:false}),CLOSE_MS);}catch(error){errors.push(`cleanup page: ${error.message}`);}
  if(context)try{await bounded('finalize video context',()=>context.close(),CLOSE_MS);}catch(error){errors.push(`cleanup context: ${error.message}`);}
  if(browser)try{await bounded('close browser',()=>browser.close(),CLOSE_MS);}catch(error){errors.push(`cleanup browser: ${error.message}`);}
}
const videos=(await fs.readdir(path.join(out,'video')).catch(()=>[])).filter(f=>f.endsWith('.webm'));
if(captureError)throw captureError;
if(!videos.length)throw new Error('Character motion evidence rejected: no 1080p WebM produced');
if(errors.length)throw new Error(`Character reference capture rejected:\n${errors.join('\n')}`);
console.log(`Authored character reference capture: PASS (15 QHD frames, ${videos.length} motion video; runtime-timed turntables + CDP QHD still phase)`);
