// Real Chromium pointer events via CDP. Browser emulation is not iPad hardware.
const assert=require('node:assert/strict'),{chromium}=require('playwright'),{spawn}=require('node:child_process');
const server=spawn('python3',['-m','http.server','5250','--bind','127.0.0.1'],{stdio:'ignore'});let browser;
(async()=>{try{
 await new Promise(r=>setTimeout(r,900));browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1194,height:834},hasTouch:true});
 const {defaultSave}=await import('../src/rules.js');await context.addInitScript(s=>localStorage.setItem('oakrest-v1',JSON.stringify(s)),defaultSave());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5250/classic.html?qa=1');await page.waitForFunction(()=>window.oakrestClassicQA);
 await page.evaluate(()=>oakrestClassicQA.pauseAutomaticLoop());
 for(const size of [{width:1194,height:834},{width:1180,height:600},{width:820,height:630}]){
  await page.setViewportSize(size);
  const small=await page.evaluate(()=>[...document.querySelectorAll('.classic-item-buttons button,#classic-styles button')].filter(b=>b.getBoundingClientRect().height<44).map(b=>b.id));
  assert.deepEqual(small,[],'primary touch targets must be 44 CSS px tall');
 }
 await page.setViewportSize({width:1194,height:834});
 assert.equal(await page.locator('#classic-joystick').isVisible(),false);
 const before=await page.evaluate(()=>oakrestClassicQA.state());
 const point=await page.evaluate(()=>{const p=oakrestClassicQA.state();const q=oakrestClassicQA.projectWorld(p.x+3,p.z),b=document.querySelector('#classic-game canvas').getBoundingClientRect();return {x:b.x+(q.x+1)*b.width/2,y:b.y+(q.y+1)*b.height/2};});
 await page.touchscreen.tap(point.x,point.y);
 await page.locator('[data-style=magic]').tap();
 await page.evaluate(()=>oakrestClassicQA.advance(1));
 const after=await page.evaluate(()=>oakrestClassicQA.state());
 assert.equal(after.style,'magic');assert.ok(Math.hypot(after.x-before.x,after.z-before.z)>.1,'tap travel continues while changing style');
 // Keyboard activation of a focused menu must not fire Enter's attack shortcut.
 await page.keyboard.press('Escape');
 await page.locator('#classic-inventory-toggle').focus();await page.keyboard.press('Enter');
 assert.equal(await page.evaluate(()=>oakrestClassicQA.windowState()),'inventory');
 assert.equal(await page.evaluate(()=>oakrestClassicQA.combatState().targetId),null);
 assert.ok(await page.locator('.field-style').count()===3);assert.deepEqual(errors,[]);
 console.log('PASS: 44px primary controls, ground-tap travel with style switch, keyboard menu activation. Emulated Chromium only.');
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
