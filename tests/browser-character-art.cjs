/** Built-site visual integrity check; physical iPad Safari sign-off is separate. */
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),engine=process.env.OAKREST_BROWSER||'chromium';
const base='http://127.0.0.1:5185/oakrest-dev/';
const mount=path.join(root,'qa','character-art-host');
let server,browser;const errors=[];
(async()=>{try{
 fs.mkdirSync(mount,{recursive:true});
 fs.rmSync(path.join(mount,'oakrest-dev'),{recursive:true,force:true});
 fs.cpSync(path.join(root,'dist'),path.join(mount,'oakrest-dev'),{recursive:true});
 server=spawn('python3',['-m','http.server','5185','--bind','127.0.0.1'],{cwd:mount,stdio:'ignore'});
 await new Promise(resolve=>setTimeout(resolve,700));
 browser=await ({chromium,webkit}[engine]).launch({headless:true,...(engine==='chromium'?{args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}: {})});
 const context=await browser.newContext({viewport:{width:1366,height:1024},hasTouch:true,isMobile:true,deviceScaleFactor:1});
 const page=await context.newPage();page.setDefaultTimeout(25000);
 page.on('pageerror',e=>errors.push(e.message));
 const {defaultSave}=await import('../src/rules.js'),baseline=defaultSave();
 await context.addInitScript(data=>{
  localStorage.setItem('oakrest-dev-v1',JSON.stringify(data));
  localStorage.setItem('oakrest-v1','public-save-sentinel');
 },baseline);
 await page.goto(base+'?qa=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.oakrestQA?.characterArt);
 await page.locator('#begin').click();
 await page.waitForFunction(()=>{
  const a=window.oakrestQA?.characterArt?.();
  return a?.hero?.status==='ready'&&a?.bandits?.[0]?.status==='ready';
 },null,{timeout:90000});
 const first=await page.evaluate(()=>oakrestQA.characterArt());
 assert.equal(first.hero.model,'knight');
 assert.equal(first.bandits[0].model,'skeleton');
 await page.screenshot({path:path.join(root,'qa',engine+'-kaykit-characters.png')});
 const saveBefore=await page.evaluate(()=>structuredClone(oakrestQA.state().data));
 for(const style of ['ranged','magic','melee']){
  await page.evaluate(style=>{oakrestQA.step(1);oakrestQA.style(style);oakrestQA.step(.6);},style);
  assert.equal((await page.evaluate(()=>oakrestQA.characterArt().hero.model)),'knight','style swap cannot replace character identity');
 }
 // User-visible opt-out must restore original rig without touching saves.
 await page.locator('#character-art-toggle').evaluate(el=>el.click());
 await page.waitForFunction(()=>oakrestQA.characterArt().hero.status==='original');
 assert.equal(await page.evaluate(()=>oakrestQA.characterArt().bandits[0].status),'original');
 await page.screenshot({path:path.join(root,'qa',engine+'-oakrest-original-characters.png')});
 await page.locator('#character-art-toggle').evaluate(el=>el.click());
 await page.waitForFunction(()=>oakrestQA.characterArt().hero.status==='ready',null,{timeout:90000});
 assert.deepEqual(await page.evaluate(()=>oakrestQA.state().data),saveBefore,'art and style toggles preserve character save');
 assert.equal(await page.evaluate(()=>localStorage.getItem('oakrest-v1')),'public-save-sentinel');
 assert.deepEqual(errors,[],'no script exceptions');
 console.log('PASS',engine,'KayKit live hero/skeletal bandit, animations, style stability, opt-out/fallback and untouched saves');
}finally{await browser?.close();server?.kill()}})().catch(e=>{console.error('FAILED KayKit character art:',e.stack,errors);process.exitCode=1});
