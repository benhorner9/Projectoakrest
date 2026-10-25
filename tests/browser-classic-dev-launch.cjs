// Player entry route acceptance for the *actual* /oakrest-dev/ link:
// ensures old 3D homepage offers a visible Classic button and a fresh
// iPad-like browser can create an adventurer, tap game controls and move.
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path');
const {chromium,webkit}=require('playwright');
const engine=process.env.OAKREST_BROWSER||'chromium';
const root=path.resolve(__dirname,'..'),stage=path.join(root,'qa','classic-launch-host');
let server,browser;
const url='http://127.0.0.1:5278/';
(async()=>{
 try{
  fs.mkdirSync(stage,{recursive:true});
  for(const game of ['oakrest-dev','oakrest']){
   const target=path.join(stage,game);
   fs.rmSync(target,{recursive:true,force:true});
   fs.cpSync(path.join(root,'dist'),target,{recursive:true});
  }
  server=spawn('python3',['-m','http.server','5278','--bind','127.0.0.1'],{cwd:stage,stdio:'ignore'});
  await new Promise(resolve=>setTimeout(resolve,950));
  browser=await ({chromium,webkit}[engine]).launch({
   headless:true,...(engine==='chromium'?{args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{})
  });
  const context=await browser.newContext({
   viewport:{width:1194,height:834},hasTouch:true,isMobile:true,deviceScaleFactor:1
  });
  const page=await context.newPage(),errors=[],failedRequests=[],consoleErrors=[],httpErrors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',msg=>{if(msg.type()==='error')consoleErrors.push(msg.text());});
  page.on('response',res=>{if(res.status()>=400)httpErrors.push([res.status(),res.url()]);});
  page.on('requestfailed',req=>failedRequests.push(req.url()+': '+req.failure()?.errorText));
  await page.goto(url+'oakrest/',{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('#oakrest-classic-launch').isVisible(),false,
   'public production must not advertise an unshipped Classic game');
  await page.goto(url+'oakrest-dev/',{waitUntil:'domcontentloaded'});
  const launcher=page.locator('#oakrest-classic-launch');
  assert.equal(await launcher.isVisible(),true,'dev homepage must link to playable Classic');
  assert.equal(await launcher.getAttribute('href'),'./classic.html');
  const hit=await launcher.boundingBox();
  assert.ok(hit?.height>=44,'Classic launch button is easy to tap on iPad');
  await launcher.tap();
  await page.waitForURL(/\/oakrest-dev\/classic\.html/);
  await page.waitForFunction(()=>!!window.oakrestClassicQA,{timeout:30000}).catch(async err=>{
   const state=await page.evaluate(()=>({
    url:location.href,title:document.title,stage:document.readyState,
    supportsWebGL:!!document.createElement('canvas').getContext('webgl'),
    supportsWebGL2:!!document.createElement('canvas').getContext('webgl2'),
    supportsRandomUUID:!!crypto.randomUUID,
    domError:document.getElementById('classic-error')?.textContent,
    fatalHidden:document.getElementById('classic-error')?.hidden,
    scriptTags:[...document.scripts].map(s=>s.src||s.type),
    loadedCanvas:!!document.querySelector('#classic-game canvas')
   })).catch(e=>({probeError:String(e)}));
   throw Error('Classic launch did not initialize: '+JSON.stringify({state,errors,consoleErrors,httpErrors,failedRequests})+' | '+err.message);
  });
  assert.equal(await page.locator('#classic-error').isVisible(),false,
   'WebGL renderer successfully initialized');
  const creator=page.locator('#classic-creator');
  assert.equal(await creator.isVisible(),true,'fresh player sees character creator');
  await page.locator('#classic-creator-name').fill('Ipad Tester');
  await page.locator('.classic-creator-submit').tap();
  await page.waitForFunction(()=>document.getElementById('classic-creator').hidden,{timeout:30000});
  await page.waitForFunction(()=>window.oakrestClassicQA?.characterCreatorState().appearance?.name==='Ipad Tester',
   {timeout:30000});
  assert.equal(await page.locator('#classic-name').textContent(),'Ipad Tester');
  assert.equal(await page.locator('#classic-game canvas').isVisible(),true);
  assert.equal(await page.locator('#oakrest-chat').isVisible(),true);
  assert.equal(await page.locator('#oakrest-action-deck').isVisible(),true);
  assert.equal(await page.locator('#classic-item-window').isVisible(),true);
  await page.locator('[data-style=magic]').tap();
  assert.equal(await page.evaluate(()=>oakrestClassicQA.state().style),'magic');
  assert.equal(await page.locator('#oakrest-action-deck').getAttribute('data-combat-style'),'magic');
  // Test a genuine directional joystick pointer transaction with app's
  // movement integrator; no synthetic teleport or privileged in-game action.
  await page.evaluate(()=>{
   oakrestClassicQA.pauseAutomaticLoop();
   const joystick=document.getElementById('classic-joystick');
   const r=joystick.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
   joystick.dispatchEvent(new PointerEvent('pointerdown',{
    bubbles:true,cancelable:true,pointerId:17,pointerType:'touch',clientX:x,clientY:y,isPrimary:true
   }));
   joystick.dispatchEvent(new PointerEvent('pointermove',{
    bubbles:true,cancelable:true,pointerId:17,pointerType:'touch',clientX:x,clientY:y-37,isPrimary:true
   }));
  });
  const before=await page.evaluate(()=>oakrestClassicQA.state());
  await page.evaluate(()=>oakrestClassicQA.advance(.35));
  const after=await page.evaluate(()=>oakrestClassicQA.state());
  assert.ok(Math.abs(after.z-before.z)+Math.abs(after.x-before.x)>.02,
   'new player can move using on-screen touch joystick');
  await page.evaluate(()=>{
   const joystick=document.getElementById('classic-joystick'),r=joystick.getBoundingClientRect();
   joystick.dispatchEvent(new PointerEvent('pointerup',{
    bubbles:true,pointerId:17,pointerType:'touch',clientX:r.x+r.width/2,clientY:r.y+r.height/2
   }));
  });
  assert.deepEqual(errors,[],'fresh player must not encounter JS exceptions');
  const critical=failedRequests.filter(v=>/\.js|\.css|\.html/.test(v));
  assert.deepEqual(critical,[],'necessary game assets must load');
  console.log('PASS '+engine+': dev homepage -> Classic -> create -> iPad touch style, chat, inventory, movement. Public entry unchanged.');
 }finally{await browser?.close();server?.kill();}
})().catch(err=>{console.error(engine,err);process.exitCode=1;});
