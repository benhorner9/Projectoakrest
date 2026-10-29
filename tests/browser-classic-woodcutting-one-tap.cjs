// Actual Classic browser UX, touch-sized Chromium; not physical iPad Safari.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {resolve}=require('node:path');
const server=spawn('python3',['-m','http.server','5283','--bind','127.0.0.1'],{cwd:resolve(__dirname,'..'),stdio:'ignore'});
let browser;
(async()=>{try{
 const {freshCharacterSave}=await import('../src/rules.js');
 const save=freshCharacterSave();
 save.professions.woodcuttingLearned=true;
 if(!save.inventory.weapons.melee.includes('bronze-axe'))save.inventory.weapons.melee.push('bronze-axe');
 await new Promise(r=>setTimeout(r,900));
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const ctx=await browser.newContext({viewport:{width:1194,height:834},hasTouch:true,deviceScaleFactor:1});
 await ctx.addInitScript(data=>localStorage.setItem('oakrest-v1',JSON.stringify(data)),save);
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5283/classic.html?qa=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.oakrestClassicQA);
 await page.evaluate(()=>oakrestClassicQA.pauseAutomaticLoop());
 await page.evaluate(()=>{oakrestClassicQA.teleport(-18,57.4);oakrestClassicQA.selectTarget('grove:pine-west');oakrestClassicQA.advance(.15);});
 const start=await page.evaluate(()=>({work:oakrestClassicQA.adventureState().work,window:oakrestClassicQA.windowState()}));
 assert.equal(start.work?.skill,'woodcutting','selecting a tree immediately begins chopping');
 assert.notEqual(start.window,'dialogue','no extra Chop confirmation panel');
 const stop=page.locator('#adventure-work');
 assert.equal(await stop.isVisible(),true);
 assert.equal(await stop.textContent(),'Chopping wood · tap to stop');
 assert.doesNotMatch(await stop.textContent(),/\d+(?:\.\d+)?s/,'no next-log countdown');
 await page.evaluate(()=>oakrestClassicQA.advance(20));
 const awarded=await page.evaluate(()=>oakrestClassicQA.persistentSnapshot());
 assert.ok(awarded.professions.woodcuttingXp>0,'real gameplay awards XP');
 assert.ok((awarded.inventory.materials['softwood-logs']||0)>0,'log acquired without another button');
 // Return to the verified reachable tree after its bounded 15–60s regrowth.
 // This tests cancellation rather than accidentally timing another tree's path.
 await page.evaluate(()=>{oakrestClassicQA.teleport(-18,57.4);oakrestClassicQA.advance(80);oakrestClassicQA.selectTarget('grove:pine-west');oakrestClassicQA.advance(.15);});
 const restarting=await page.evaluate(()=>({work:oakrestClassicQA.adventureState().work,status:oakrestClassicQA.state().status}));
 assert.equal(restarting.work?.skill,'woodcutting','regrown tree must restart without another prompt: '+JSON.stringify(restarting));
 assert.equal(await stop.isVisible(),true);
 await stop.tap({force:true});
 assert.equal((await page.evaluate(()=>oakrestClassicQA.adventureState().work)),null,'tap to stop cancels work');
 assert.deepEqual(errors,[]);
 console.log('PASS: one-tap tree selection starts Classic Woodcutting, no countdown, real XP/logs, manual stop (touch Chromium).');
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
