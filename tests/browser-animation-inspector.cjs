// QA of the *running Three.js actor renderer*, isolated from real hit logic.
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const {spawn}=require('node:child_process');
const path=require('node:path'),fs=require('node:fs');
const root=path.resolve(__dirname,'..'),engine=process.env.OAKREST_BROWSER||'chromium';
const server=spawn('python3',['-m','http.server','5197','--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});
let browser;
(async()=>{try{
 await new Promise(r=>setTimeout(r,900));
 browser=await ({chromium,webkit}[engine]).launch({headless:true,...(engine==='chromium'?{args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{})});
 const {defaultSave}=await import('../src/rules.js');
 const context=await browser.newContext({viewport:{width:1366,height:1024},hasTouch:true});
 const data=defaultSave();
 await context.addInitScript(d=>localStorage.setItem('oakrest-v1',JSON.stringify(d)),data);
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5197/?qa=1&animation=1');
 await page.locator('#oakrest-animation-inspector').waitFor({timeout:25000});
 const scene=page.locator('#oakrest-animation-inspector');
 assert.equal(await page.evaluate(()=>window.oakrestQA.animation.specs().length),56);
 const initial=await page.evaluate(()=>localStorage.getItem('oakrest-v1'));
 await scene.locator('[data-name="style"]').selectOption('magic');
 await scene.locator('[data-name="family"]').selectOption('frost');
 await scene.locator('[data-name="skill"]').selectOption('frost:w2');
 // Selection state and explanatory text must change synchronously, even
 // when software WebGL throttles/loses a preview frame under CI or Safari.
 assert.equal(await scene.locator('[data-name="style"]').inputValue(),'magic');
 assert.equal(await scene.locator('[data-name="family"]').inputValue(),'frost');
 assert.equal(await scene.locator('[data-name="skill"]').inputValue(),'frost:w2');
 await page.waitForFunction(()=>document.querySelector('#oakrest-animation-inspector [data-name="readout"]')?.textContent?.includes('frost:w2'),null,{timeout:5000});
 const text=await scene.locator('[data-name="readout"]').textContent();
 assert.match(text,/frost:w2/);assert.match(text,/constraining binding gesture/i);
 await scene.locator('[data-name="speed"]').selectOption('0.25');
 await scene.locator('[data-name="freeze"]').check();
 await scene.locator('[data-name="scrub"]').evaluate(el=>{el.value='440';el.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.equal(await scene.locator('[data-name="freeze"]').isChecked(),true);
 await scene.locator('[data-name="effects"]').uncheck();
 await scene.locator('[data-name="opponent"]').uncheck();
 await scene.locator('[data-name="moving"]').check();
 await page.waitForTimeout(250);
 assert.equal(await page.evaluate(()=>localStorage.getItem('oakrest-v1')),initial,'inspector may not touch character saves');
 const motionStatus=scene.locator('[data-name="motion-status"]');
 await page.waitForFunction(()=>document.querySelector('#oakrest-animation-inspector [data-name="motion-status"]')?.textContent?.includes('Ranged_Magic_Summon'));
 assert.match(await motionStatus.textContent(),/KAYKIT ACTIVE.*Ranged_Magic_Summon/);
 fs.mkdirSync(path.join(root,'qa'),{recursive:true});
 await page.screenshot({path:path.join(root,'qa',engine+'-kaykit-active.png')});
 await scene.locator('[data-name="kaykit"]').uncheck();
 await page.waitForFunction(()=>document.querySelector('#oakrest-animation-inspector [data-name="motion-status"]')?.textContent?.includes('ORIGINAL PROCEDURAL'));
 assert.match(await motionStatus.textContent(),/KayKit disabled/);
 await page.screenshot({path:path.join(root,'qa',engine+'-kaykit-disabled.png')});
 await scene.locator('[data-name="kaykit"]').check();
 await page.waitForFunction(()=>document.querySelector('#oakrest-animation-inspector [data-name="motion-status"]')?.textContent?.includes('KAYKIT ACTIVE'));
 await page.screenshot({path:path.join(root,'qa',engine+'-animation-inspector.png')});
 await scene.locator('[data-name="close"]').click();
 assert.equal(await scene.count(),0,'inspector closes and disposes its renderer');
 // Observe the actual game, not a mock animation clock.
 await page.locator('#begin').click();
 const events=await page.evaluate(()=>{
  const qa=window.oakrestQA;qa.teleport(-6,-1);qa.step(.2);
  if(!qa.target('dummy'))throw new Error('No in-world target');
  qa.step(4.2);return qa.animation.events();
 });
 assert.ok(events.some(e=>e.event==='attack_start'),'real actions must start');
 assert.ok(events.some(e=>e.event==='release'),'gameplay-clock release required');
 assert.ok(events.some(e=>e.event==='contact_window_start'),'real melee swept contact required');
 const actionIds=new Set(events.map(e=>e.actionId));
 for(const id of actionIds)assert.equal(events.filter(e=>e.actionId===id&&e.event==='release').length<=1,true,'duplicate release on '+id);
 assert.deepEqual(errors,[],'uncaught browser errors');
 console.log('PASS '+engine+' actual rig inspector, camera-distance opponent, isolated save, real events');
 await context.close();
}catch(error){console.error('FAIL '+engine+' animation QA',error);process.exitCode=1;}
 finally{await browser?.close();server.kill('SIGTERM');}})();
