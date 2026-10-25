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
 const joy=await page.locator('#classic-joystick').boundingBox(),style=await page.locator('[data-style=magic]').boundingBox();
 const client=await context.newCDPSession(page),touch=(type,points)=>client.send('Input.dispatchTouchEvent',{type,touchPoints:points});
 const first={id:1,x:joy.x+joy.width/2,y:joy.y+10};
 const second={id:2,x:style.x+style.width/2,y:style.y+style.height/2};
 await touch('touchStart',[first]);await page.evaluate(()=>oakrestClassicQA.advance(.2));
 const before=await page.evaluate(()=>oakrestClassicQA.state());
 await touch('touchStart',[first,second]);await touch('touchEnd',[second]);
 await page.evaluate(()=>oakrestClassicQA.advance(.5));
 const after=await page.evaluate(()=>oakrestClassicQA.state());
 assert.equal(after.style,'magic');assert.ok(after.z>before.z,'joystick continues while second finger changes style');
 await touch('touchEnd',[]);const stopped=await page.evaluate(()=>oakrestClassicQA.state());
 await page.evaluate(()=>oakrestClassicQA.advance(.5));assert.equal((await page.evaluate(()=>oakrestClassicQA.state())).z,stopped.z);
 // Keyboard activation of a focused menu must not fire Enter's attack shortcut.
 await page.locator('#classic-inventory-toggle').focus();await page.keyboard.press('Enter');
 assert.equal(await page.evaluate(()=>oakrestClassicQA.windowState()),'inventory');
 assert.equal(await page.evaluate(()=>oakrestClassicQA.combatState().targetId),null);
 assert.ok(await page.locator('.field-style').count()===3);assert.deepEqual(errors,[]);
 console.log('PASS: 44px primary controls, simultaneous joystick/style touch, release stops movement, keyboard menu activation. Emulated Chromium only.');
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
