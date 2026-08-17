import { chromium } from 'playwright';
import fs from 'node:fs/promises';

await fs.mkdir('artifacts/frames',{recursive:true});
await fs.mkdir('artifacts/video',{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1920,height:1080},recordVideo:{dir:'artifacts/video',size:{width:1920,height:1080}}});
const page=await context.newPage();
page.setDefaultTimeout(45000);
const errors=[];
page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`);});

async function shot(name){
  const started=Date.now();
  await page.screenshot({path:`artifacts/frames/${name}`,timeout:45000,animations:'allow'});
  return Date.now()-started;
}

let fatal=null;
const timings=[];
try{
  await page.goto('http://127.0.0.1:4173',{waitUntil:'networkidle',timeout:45000});
  await page.waitForSelector('canvas',{state:'visible'});
  await page.waitForTimeout(4200);
  timings.push(['idleScreenshotMs',await shot('01-idle-1080p.png')]);
  await page.mouse.click(960,540);
  await page.keyboard.down('w');await page.waitForTimeout(750);await page.keyboard.down('Shift');await page.waitForTimeout(750);await page.keyboard.up('Shift');await page.keyboard.up('w');
  timings.push(['locomotionScreenshotMs',await shot('02-locomotion-1080p.png')]);
  await page.keyboard.press('1');await page.waitForTimeout(150);timings.push(['meleeScreenshotMs',await shot('03-melee-impact-1080p.png')]);await page.waitForTimeout(520);
  await page.keyboard.press('2');await page.waitForTimeout(120);timings.push(['riftScreenshotMs',await shot('04-rift-vfx-1080p.png')]);await page.waitForTimeout(760);
  await page.keyboard.press('Space');await page.waitForTimeout(150);timings.push(['evadeScreenshotMs',await shot('05-evade-1080p.png')]);await page.waitForTimeout(700);
}catch(e){fatal=e;errors.push(`capture: ${e.stack||e.message}`);}
finally{
  await fs.writeFile('artifacts/capture-timings.json',JSON.stringify(Object.fromEntries(timings),null,2));
  await fs.writeFile('artifacts/browser-errors.txt',errors.length?errors.join('\n'):'No pageerror, console.error, or capture errors detected.\n');
  await context.close().catch(()=>{});
  await browser.close().catch(()=>{});
}
if(fatal||errors.some(e=>e.startsWith('pageerror:')||e.startsWith('console:')))throw new Error(`Visual QA rejected runtime:\n${errors.join('\n')}`);
