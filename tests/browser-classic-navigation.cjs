// Actual Chromium/CDP inputs; this is not physical iPad Safari evidence.
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const {spawn}=require('node:child_process'),{mkdirSync}=require('node:fs');
const server=spawn('python3',['-m','http.server','5262','--bind','127.0.0.1'],{stdio:'ignore'});
let browser;
(async()=>{try{
 await new Promise(resolve=>setTimeout(resolve,900));
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1366,height:1024},hasTouch:true});
 const {defaultSave}=await import('../src/rules.js');
 await context.addInitScript(save=>localStorage.setItem('oakrest-v1',JSON.stringify(save)),defaultSave());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5262/classic.html?qa=1');await page.waitForFunction(()=>window.oakrestClassicQA);
 await page.evaluate(()=>oakrestClassicQA.pauseAutomaticLoop());
 const initial=await page.evaluate(()=>({player:oakrestClassicQA.state(),camera:oakrestClassicQA.cameraState()}));
 const box=await page.locator('#classic-game canvas').boundingBox(),cdp=await context.newCDPSession(page);
 const a={id:1,x:box.x+box.width*.35,y:box.y+box.height*.35};
 const b={id:2,x:box.x+box.width*.6,y:a.y};
 const moved={...b,x:b.x+45,y:b.y-35};
 const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
 await touch('touchStart',[a]);await touch('touchStart',[a,b]);await touch('touchMove',[a,moved]);
 await touch('touchEnd',[a]);await touch('touchEnd',[]);
 await page.evaluate(()=>oakrestClassicQA.step(0));
 const changed=await page.evaluate(()=>({player:oakrestClassicQA.state(),camera:oakrestClassicQA.cameraState(),nav:oakrestClassicQA.navigationState()}));
 assert.notEqual(changed.camera.yaw,initial.camera.yaw);assert.ok(changed.camera.pitch>initial.camera.pitch);
 assert.ok(changed.camera.zoom>initial.camera.zoom);assert.equal(changed.nav.goal,null,'camera gesture must not create a destination');
 assert.equal(changed.player.x,initial.player.x);assert.equal(changed.player.z,initial.player.z);
 // Inventory interactions must remain isolated from world movement.
 if(!await page.locator('#classic-item-content').isVisible())await page.locator('#classic-inventory-toggle').click();
 const beforePanel=await page.evaluate(()=>oakrestClassicQA.navigationState());
 await page.locator('#classic-item-content').tap({position:{x:25,y:25}});
 assert.deepEqual(await page.evaluate(()=>oakrestClassicQA.navigationState()),beforePanel,'inventory tap must not move the world');
 await page.keyboard.press('Escape');
 // Walk the formerly corner-clipping route with the real game loop.
 const result=await page.evaluate(()=>{
  oakrestClassicQA.teleport(33.51467255316675,80.66817809361964);
  oakrestClassicQA.moveTo(19.108386799693108,10.675558201037347);
  oakrestClassicQA.advance(35);
  return {player:oakrestClassicQA.state(),nav:oakrestClassicQA.navigationState()};
 });
 assert.ok(Math.hypot(result.player.x-19.108386799693108,result.player.z-10.675558201037347)<.02,JSON.stringify(result));
 assert.equal(result.nav.status,'arrived');
 await page.evaluate(()=>{oakrestClassicQA.teleport(0,39);oakrestClassicQA.selectTarget('service:bank');});
 await page.keyboard.down('s');await page.evaluate(()=>oakrestClassicQA.advance(.2));await page.keyboard.up('s');
 assert.equal((await page.evaluate(()=>oakrestClassicQA.navigationState())).pending,null);
 assert.equal((await page.evaluate(()=>oakrestClassicQA.state())).selected,null);
 // A new finger after a completed camera gesture still issues an ordinary tap.
 await page.evaluate(()=>{oakrestClassicQA.teleport(0,39);oakrestClassicQA.resetCamera();});
 const point=await page.evaluate(()=>oakrestClassicQA.projectWorld(0,43));
 await page.touchscreen.tap(box.x+(point.x+1)*box.width/2,box.y+(point.y+1)*box.height/2);
 assert.ok((await page.evaluate(()=>oakrestClassicQA.navigationState())).goal,'fresh single touch remains usable');
 assert.deepEqual(errors,[]);
 mkdirSync('qa/block1',{recursive:true});await page.screenshot({path:'qa/block1/navigation-touch.png'});
 console.log('PASS: exact collision-safe navigation, cancellation, two-finger orbit/pinch, single-tap recovery, UI isolation. Chromium touch emulation only.');
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
