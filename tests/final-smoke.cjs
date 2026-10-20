// Focused verification of the last terrain-aim and portrait header corrections.
const {chromium}=require('playwright');const {spawn}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),report={checks:[],errors:[]};
(async()=>{let browser;const server=spawn('python3',['-u','-m','http.server','5232'],{cwd:root});try{
 await new Promise(resolve=>server.stdout.once('data',resolve));
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const touch of [false,true]){
  const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1440,height:900},hasTouch:touch,deviceScaleFactor:1});
  await context.addInitScript(d=>{if(!localStorage.getItem('oakrest-v1'))localStorage.setItem('oakrest-v1',JSON.stringify(d));},(await import('../src/rules.js')).defaultSave());
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto('http://127.0.0.1:5232/?qa=1');await page.waitForFunction(()=>window.oakrestQA);await page.locator('#begin').click();await page.keyboard.press('Escape');
  if(!touch){const shot=await page.evaluate(()=>{oakrestQA.style('ranged');oakrestQA.step(1);const e=oakrestQA.state().enemies.find(e=>e.type==='mossling');oakrestQA.teleport(e.x,e.z+8);oakrestQA.basic();oakrestQA.step(1);return {before:e.hp,after:oakrestQA.state().enemies.find(e=>e.type==='mossling').hp};});assert.ok(shot.after<shot.before,JSON.stringify(shot));report.checks.push({name:'desktop ranged shot connects over sloping terrain',status:'pass',detail:shot});}
  else{
   const bounds=await page.locator('#help-button').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=390&&bounds.width>=40);
   await page.locator('#help-button').click();assert.ok(await page.locator('#quality').isVisible());await page.locator('#close-controls').click();
   await page.waitForTimeout(1000);await page.screenshot({path:root+'/qa/phone-portrait.png'});
   await page.locator('#loadout-button').click();await page.locator('#progression-equipment').click();await page.screenshot({path:root+'/qa/phone-portrait-menu.png'});
   report.checks.push({name:'portrait settings button fully visible and functional',status:'pass',detail:bounds});
  }
  await context.close();
 }
 assert.deepEqual(report.errors,[]);console.log(JSON.stringify(report));
}catch(e){report.failure=e.stack;throw e;}finally{await browser?.close();server.kill();fs.writeFileSync(root+'/qa/final-smoke-report.json',JSON.stringify(report,null,2));}})().catch(e=>{console.error(e);process.exitCode=1;});
