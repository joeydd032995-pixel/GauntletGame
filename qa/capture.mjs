import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec=promisify(execFile);
await fs.rm('artifacts',{recursive:true,force:true});
await fs.mkdir('artifacts/frames',{recursive:true});
await fs.mkdir('artifacts/video',{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1920,height:1080},recordVideo:{dir:'artifacts/video',size:{width:1920,height:1080}}});
const page=await context.newPage();page.setDefaultTimeout(60000);
const errors=[];page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`);});
const started=Date.now(),marks=[];const mark=name=>marks.push([name,Math.max(.1,(Date.now()-started)/1000)]);let fatal=null,metrics=null,boot=null;
try{
  const navStart=Date.now();
  await page.goto('http://127.0.0.1:4173',{waitUntil:'domcontentloaded',timeout:20000});
  const domMs=Date.now()-navStart;
  await page.waitForFunction(()=>!!document.querySelector('canvas')&&!!window.__GAUNTLET_CAPTURE__,null,{timeout:60000});
  const canvasMs=Date.now()-navStart;
  await page.waitForFunction(()=>window.__GAUNTLET_METRICS__?.renderer?.calls>0,null,{timeout:60000});
  const firstRenderedMs=Date.now()-navStart;
  await page.waitForFunction(()=>{const s=window.__GAUNTLET_AUTHORED_CHARACTERS__;return s?.ready===true||!!s?.error||!!s?.hero?.error||!!s?.enemy?.error;},null,{timeout:90000});
  const authoredReadyMs=Date.now()-navStart;
  const authored=await page.evaluate(()=>JSON.parse(JSON.stringify(window.__GAUNTLET_AUTHORED_CHARACTERS__||null)));
  if(!authored?.ready||authored.error||!authored.hero?.installed||!authored.enemy?.installed)throw new Error(`authored character presentation rejected before visual capture: ${JSON.stringify(authored)}`);
  await page.waitForFunction(()=>{const s=window.__GAUNTLET_HYBRID_ENVIRONMENT__;return s?.ready===true||!!s?.error;},null,{timeout:60000});
  const environmentReadyMs=Date.now()-navStart;
  const hybridEnvironment=await page.evaluate(()=>JSON.parse(JSON.stringify(window.__GAUNTLET_HYBRID_ENVIRONMENT__||null)));
  if(!hybridEnvironment?.ready||hybridEnvironment.error)throw new Error(`hybrid environment rejected before visual capture: ${JSON.stringify(hybridEnvironment)}`);
  boot=await page.evaluate(({domMs,canvasMs,firstRenderedMs,authoredReadyMs,environmentReadyMs,authored,hybridEnvironment})=>({domMs,canvasMs,firstRenderedMs,authoredReadyMs,environmentReadyMs,authored,hybridEnvironment,mocap:window.__GAUNTLET_MOCAP__||null,metrics:window.__GAUNTLET_METRICS__||null}),{domMs,canvasMs,firstRenderedMs,authoredReadyMs,environmentReadyMs,authored,hybridEnvironment});
  await page.waitForTimeout(900);mark('01-idle-1080p.png');
  await page.mouse.click(960,540);await page.keyboard.down('w');await page.waitForTimeout(650);await page.keyboard.down('Shift');await page.waitForTimeout(650);mark('02-locomotion-1080p.png');await page.keyboard.up('Shift');await page.keyboard.up('w');
  await page.keyboard.press('1');await page.waitForTimeout(140);mark('03-melee-impact-1080p.png');await page.waitForTimeout(480);
  await page.keyboard.press('2');await page.waitForTimeout(110);mark('04-rift-vfx-1080p.png');await page.waitForTimeout(650);
  await page.keyboard.press('Space');await page.waitForTimeout(140);mark('05-evade-1080p.png');await page.waitForTimeout(2200);metrics=await page.evaluate(()=>({runtime:window.__GAUNTLET_METRICS__||null,authored:JSON.parse(JSON.stringify(window.__GAUNTLET_AUTHORED_CHARACTERS__||null)),hybridEnvironment:window.__GAUNTLET_HYBRID_ENVIRONMENT__||null}));
}catch(e){fatal=e;errors.push(`capture: ${e.stack||e.message}`);}finally{await context.close().catch(()=>{});await browser.close().catch(()=>{});}

async function findFfmpeg(){try{await exec('ffmpeg',['-version'],{timeout:3000});return'ffmpeg';}catch{}const root=path.join(os.homedir(),'.cache','ms-playwright');try{for(const dir of await fs.readdir(root)){if(!dir.startsWith('ffmpeg-'))continue;for(const name of['ffmpeg-linux','ffmpeg']){const candidate=path.join(root,dir,name);try{await fs.access(candidate);return candidate;}catch{}}}}catch{}throw new Error('Playwright FFmpeg binary not found');}
async function validFrame(file){try{const s=await fs.stat(file);return s.isFile()&&s.size>4096;}catch{return false;}}
const videoFiles=(await fs.readdir('artifacts/video')).filter(f=>f.endsWith('.webm'));let extracted=0;
if(videoFiles.length){const video=path.join('artifacts/video',videoFiles[0]);try{const ffmpeg=await findFfmpeg();for(let i=0;i<marks.length;i++){const[name,time]=marks[i],output=path.join('artifacts/frames',name),isTail=i===marks.length-1,seek=isTail?['-sseof','-0.35']:['-ss',time.toFixed(3)];try{await exec(ffmpeg,['-loglevel','error','-y',...seek,'-i',video,'-frames:v','1',output],{timeout:30000});if(await validFrame(output))extracted++;else errors.push(`frame ${name}: ffmpeg returned without a non-empty output file`);}catch(e){errors.push(`frame ${name}: ${e.stderr||e.message}`);}}if(extracted!==marks.length){errors.push(`capture: extracted ${extracted}/${marks.length} required evidence frames`);fatal=fatal||new Error('Incomplete rendered evidence set');}}catch(e){errors.push(`capture: ${e.message}`);fatal=fatal||e;}}else{errors.push('capture: no WebM video produced');fatal=fatal||new Error('No WebM video produced');}
await fs.writeFile('artifacts/capture-marks.json',JSON.stringify({marks:Object.fromEntries(marks),extractedFrames:extracted,requiredFrames:marks.length,lastFrameSource:'video-tail'},null,2));
await fs.writeFile('artifacts/boot-metrics.json',JSON.stringify(boot||{status:'boot-unavailable'},null,2));
await fs.writeFile('artifacts/render-metrics.json',JSON.stringify(metrics||{status:'metrics-unavailable'},null,2));
await fs.writeFile('artifacts/browser-errors.txt',errors.length?errors.join('\n'):'No pageerror, console.error, or evidence-extraction errors detected.\n');
if(fatal||errors.some(e=>e.startsWith('pageerror:')||e.startsWith('console:')))throw new Error(`Visual QA rejected runtime:\n${errors.join('\n')}`);
