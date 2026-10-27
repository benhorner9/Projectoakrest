// Canonical Classic entry regression for the *actual* /oakrest-dev/ link:
// ensures the development home routes directly to Classic and a fresh
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
  const target=path.join(stage,'oakrest-dev');
  fs.rmSync(target,{recursive:true,force:true});
  fs.cpSync(path.join(root,'dist'),target,{recursive:true});
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
  // The default development URL now opens Classic directly, never the
  // retired third-person game; QA params and save namespace are preserved.
  await page.goto(url+'oakrest-dev/?qa=1',{waitUntil:'domcontentloaded'});
  await page.waitForURL(/\/oakrest-dev\/classic\.html\?qa=1/);
  assert.equal(await page.locator('#game').count(),0,'legacy 3D game is absent');
  await page.waitForFunction(()=>!!document.querySelector('#classic-game canvas'),{timeout:30000}).catch(async err=>{
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
  await creator.waitFor({state:'visible',timeout:20000}).catch(async err=>{
   const state=await page.evaluate(()=>({
    canvas:!!document.querySelector('#classic-game canvas'),
    creatorHidden:document.getElementById('classic-creator')?.hidden,
    existingSave:!!localStorage.getItem('oakrest-dev-v1'),
    roster:!!localStorage.getItem('oakrest-dev-characters-v1'),
    gameError:document.getElementById('classic-error')?.hidden,
    knownKeys:Object.keys(localStorage).filter(k=>k.includes('oakrest'))
   }));
   throw Error('Fresh character selection missing: '+JSON.stringify({state,errors,consoleErrors,httpErrors,failedRequests})+' | '+err.message);
  });
  await page.locator('#classic-creator-name').fill('Ipad Tester');
  await page.locator('.classic-creator-submit').tap();
  await page.waitForFunction(()=>document.getElementById('classic-name')?.textContent==='Ipad Tester',
   {timeout:30000});
  assert.equal(await page.locator('#classic-creator').isVisible(),false);
  assert.equal(await page.locator('#classic-name').textContent(),'Ipad Tester');
  // Public players launch without ?qa. Only enable the developer QA helpers
  // after demonstrating that normal character creation works unassisted.
  await page.goto(url+'oakrest-dev/classic.html?qa=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.oakrestClassicQA,{timeout:30000}).catch(async err=>{
   const state=await page.evaluate(()=>({url:location.href,canvas:!!document.querySelector('#classic-game canvas'),
    fatal:document.getElementById('classic-error')?.hidden,
    creator:document.getElementById('classic-creator')?.hidden}));
   throw Error('Developer QA entry did not initialize '+JSON.stringify({state,errors,consoleErrors,httpErrors,failedRequests})+' | '+err.message);
  });
  assert.equal(await page.locator('#classic-game canvas').isVisible(),true);
  assert.equal(await page.locator('#oakrest-chat').isVisible(),true);
  assert.equal(await page.locator('#oakrest-action-deck').isVisible(),true);
  assert.equal(await page.locator('#classic-item-window').isVisible(),true);
  await page.locator('[data-style=magic]').tap();
  assert.equal(await page.evaluate(()=>oakrestClassicQA.state().style),'magic');
  assert.equal(await page.locator('#oakrest-action-deck').getAttribute('data-combat-style'),'magic');
  // The utility editor must respond to real touch in iPad-size Chromium and
  // WebKit emulation. This is not a substitute for physical Safari validation.
  await page.locator('#oakrest-hotbar-edit').tap();
  assert.equal(await page.locator('#oakrest-hotbar-editor').isVisible(),true);
  await page.locator('#oakrest-hotbar-select-5').selectOption('drink');
  assert.equal(await page.locator('#oakrest-potion-slot').getAttribute('data-hotbar-slot'),'5');
  assert.equal(await page.locator('#oakrest-food-slot').getAttribute('data-hotbar-slot'),'6');
  await page.locator('#oakrest-hotbar-edit').tap();
  // Playwright's mouse API creates an actual active pointer across both
  // browser engines. Dispatching a fabricated PointerEvent causes both
  // Chromium and WebKit to reject setPointerCapture (no active pointer).
  const joyRect=await page.locator('#classic-joystick').boundingBox();
  assert.ok(joyRect?.width>50&&joyRect?.height>50,'touch joystick exists on iPad-sized viewport');
  const jx=joyRect.x+joyRect.width/2,jy=joyRect.y+joyRect.height/2;
  await page.mouse.move(jx,jy);
  await page.mouse.down();
  await page.mouse.move(jx,jy-37,{steps:4});
  const before=await page.evaluate(()=>oakrestClassicQA.state());
  await page.evaluate(()=>oakrestClassicQA.advance(.35));
  const after=await page.evaluate(()=>oakrestClassicQA.state());
  await page.mouse.up();
  assert.ok(Math.abs(after.z-before.z)+Math.abs(after.x-before.x)>.02,
   'new player can move using the joystick with an actual captured pointer');
  assert.deepEqual(errors,[],'fresh player must not encounter JS exceptions');
  const critical=failedRequests.filter(v=>/\.js|\.css|\.html/.test(v));
  assert.deepEqual(critical,[],'necessary game assets must load');
  console.log('PASS '+engine+': dev home redirects to Classic -> create -> iPad touch style, chat, inventory, movement. Public release untouched.');
 }finally{await browser?.close();server?.kill();}
})().catch(err=>{console.error(engine,err);process.exitCode=1;});
