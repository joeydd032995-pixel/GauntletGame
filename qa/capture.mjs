import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec=promisify(execFile);
await fs.rm('artifacts',{recursive:true,force:true});
await fs.mkdir('artifacts/frames',{recursive:true});
await fs.mkdir('artifacts/video',{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1920,height:1080},recordVideo:{dir:'artifacts/video',size:{width:1920,height:1080}}});
const page=await context.newPage();
page.setDefaultTimeout(30000);
const errors=[];
page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`);});
const started=Date.now();
const marks=[];
const mark=name=>marks.push([name,Math.max(.1,(Date.now()-started)/1000)]);
let fatal=null;
try{
  await page.goto('http://127.0.0.1:4173',{waitUntil:'networkidle',timeout:30000});
  await page.waitForSelector('canvas',{state:'visible'});
  await page.waitForTimeout(3500);mark('01-idle-1080p.png');
  await page.mouse.click(960,540);
  await page.keyboard.down('w');await page.waitForTimeout(700);await page.keyboard.down('Shift');await page.waitForTimeout(700);mark('02-locomotion-1080p.png');await page.keyboard.up('Shift');await page.keyboard.up('w');
  await page.keyboard.press('1');await page.waitForTimeout(145);mark('03-melee-impact-1080p.png');await page.waitForTimeout(500);
  await page.keyboard.press('2');await page.waitForTimeout(115);mark('04-rift-vfx-1080p.png');await page.waitForTimeout(700);
  await page.keyboard.press('Space');await page.waitForTimeout(145);mark('05-evade-1080p.png');await page.waitForTimeout(700);
}catch(e){fatal=e;errors.push(`capture: ${e.stack||e.message}`);}
finally{
  await context.close().catch(()=>{});
  await browser.close().catch(()=>{});
}

const videoFiles=(await fs.readdir('artifacts/video')).filter(f=>f.endsWith('.webm'));
if(videoFiles.length){
  const video=path.join('artifacts/video',videoFiles[0]);
  for(const [name,time] of marks){
    try{await exec('ffmpeg',['-loglevel','error','-y','-ss',time.toFixed(3),'-i',video,'-frames:v','1',path.join('artifacts/frames',name)],{timeout:30000});}
    catch(e){errors.push(`ffmpeg ${name}: ${e.stderr||e.message}`);fatal=fatal||e;}
  }
}else{errors.push('capture: no WebM video produced');fatal=fatal||new Error('No WebM video produced');}

await fs.writeFile('artifacts/capture-marks.json',JSON.stringify(Object.fromEntries(marks),null,2));
await fs.writeFile('artifacts/browser-errors.txt',errors.length?errors.join('\n'):'No pageerror, console.error, or evidence-extraction errors detected.\n');
if(fatal||errors.some(e=>e.startsWith('pageerror:')||e.startsWith('console:')))throw new Error(`Visual QA rejected runtime:\n${errors.join('\n')}`);
