// Classic impact presentation regression. Emulated Chromium is not physical Safari.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {resolve}=require('node:path');
const {mkdirSync}=require('node:fs');
const server=spawn('python3',['-m','http.server','5276','--bind','127.0.0.1'],
 {cwd:resolve(__dirname,'..'),stdio:'ignore'});
let browser;
(async()=>{try{
 await new Promise(r=>setTimeout(r,850));
 browser=await chromium.launch({headless:true,args:[
  '--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'
 ]});
 const context=await browser.newContext({viewport:{width:1366,height:1024},hasTouch:true});
 const {defaultSave}=await import('../src/rules.js');
 await context.addInitScript(save=>{
  localStorage.setItem('oakrest-v1',JSON.stringify(save));
  let qa;
  Object.defineProperty(window,'oakrestClassicQA',{configurable:true,
   get:()=>qa,set:value=>{qa=value;value?.pauseAutomaticLoop?.();}});
 },defaultSave());
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:5276/classic.html?qa=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.oakrestClassicQA);
 const result=await page.evaluate(()=>{
  const qa=oakrestClassicQA;
  qa.teleport(-1,71.3);
  if(!qa.lockMonster('practice'))throw Error('Unable to attack practice dummy');
  qa.advance(.45);
  const during={effects:qa.impactState(),state:qa.combatState()};
  qa.advance(.45);
  const after={effects:qa.impactState(),state:qa.combatState()};
  return {during,after};
 });
 assert.ok(result.during.effects.active>0,'a real hit produces contact effects');
 assert.equal(result.after.effects.active,0,'impact effects expire without persistent particles');
 assert.equal(result.after.state.targetId,'practice','presentation does not break fighting');
 assert.deepEqual(errors,[],'renderer causes no page exceptions');
 mkdirSync('qa/classic-combat',{recursive:true});
 await page.screenshot({path:'qa/classic-combat/contact-effects.png'});
 console.log('PASS: Classic combat hit cues are visible, bounded, expire and preserve auto combat.');
}finally{await browser?.close();server.kill();}})().catch(e=>{
 console.error(e);process.exitCode=1;
});
