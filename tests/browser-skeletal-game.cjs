// Production physics and saves remain authoritative with skinned model opt-in.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'qa','skeletal-game');
const server=spawn('python3',['-m','http.server','5295','--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});
let browser;
(async()=>{try{
 fs.mkdirSync(out,{recursive:true});await new Promise(r=>setTimeout(r,1100));
 const {defaultSave}=await import('../src/rules.js');
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1180,height:820},hasTouch:true});
 await context.addInitScript(data=>localStorage.setItem('oakrest-v1',JSON.stringify(data)),defaultSave());
 const page=await context.newPage(),errors=[],missing=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)missing.push(r.url()+': '+r.status());});
 await page.goto('http://127.0.0.1:5295/?qa=1&skeletal=1',{waitUntil:'domcontentloaded',timeout:25000});
 await page.waitForFunction(()=>!!window.oakrestQA,{timeout:25000});
 await page.locator('#begin').click({timeout:15000});
 const original=await page.evaluate(()=>({
  visual:oakrestQA.animation.visual(),state:oakrestQA.state(),save:localStorage.getItem('oakrest-v1')
 }));
 assert.equal(original.visual.skeletal,true,'opt-in live game must activate skinned hero');
 assert.equal(original.visual.skeletalBones,26,'game candidate must use real bones');
 await page.evaluate(()=>{oakrestQA.step(.2);oakrestQA.basic();oakrestQA.step(.10);});
 const moving=await page.evaluate(()=>({
  state:oakrestQA.state(),visual:oakrestQA.animation.visual(),events:oakrestQA.animation.events()
 }));
 assert.match(moving.visual.skeletalState,/Ability\/|Ready|Idle|Walk|Run/);
 assert.deepEqual(moving.state.hero,original.state.hero,'attacking in place does not move collision root');
 await page.screenshot({path:path.join(out,'skeletal-real-game.png')});
 await page.evaluate(()=>oakrestQA.save());
 assert.ok(await page.evaluate(()=>localStorage.getItem('oakrest-v1')),'save remains accessible');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.oakrestQA);
 assert.equal(await page.evaluate(()=>oakrestQA.animation.visual().skeletal),true,'playtest flag survives URL reload only');
 assert.deepEqual(errors,[],'no page exceptions');assert.deepEqual(missing,[],'no missing requests');
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({
  visual:moving.visual,initialHero:original.state.hero,afterHero:moving.state.hero,
  eventCount:moving.events.length,physicalIPad:false,errors,missing
 },null,2));
 console.log('SKELETAL GAME PASS: opt-in model, real gameplay authority, 26 bones, attacks, save and reload');
 await context.close();
}catch(e){console.error(e.stack||e);process.exitCode=1;}finally{await browser?.close();server.kill();}})();
