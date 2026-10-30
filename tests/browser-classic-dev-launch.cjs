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
const base=process.env.OAKREST_TEST_URL||'http://127.0.0.1:5278/oakrest-dev/';
(async()=>{
 try{
  const {developmentBase,requireCommit}=await import('../scripts/development-release.mjs');
  developmentBase(base);
  if(process.env.OAKREST_TEST_URL){
   requireCommit(process.env.OAKREST_COMMIT);
   const res=await fetch(base+'build-meta.json?entry='+Date.now(),{redirect:'error',cache:'no-store'});
   assert.equal(res.status,200);
   const meta=await res.json();
   assert.equal(meta.commit,process.env.OAKREST_COMMIT,'normal route must serve the pinned release');
   assert.equal(meta.environment,'development');
  }else{
  fs.mkdirSync(stage,{recursive:true});
  const target=path.join(stage,'oakrest-dev');
  fs.rmSync(target,{recursive:true,force:true});
  fs.cpSync(path.join(root,'dist'),target,{recursive:true});
  server=spawn('python3',['-m','http.server','5278','--bind','127.0.0.1'],{cwd:stage,stdio:'ignore'});
  await new Promise(resolve=>setTimeout(resolve,950));
  }
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
  await page.goto(base+'?entry=normal#village',{waitUntil:'domcontentloaded'});
  await page.waitForURL(/\/oakrest-dev\/classic\.html\?entry=normal#village/);
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
  const identity=await page.evaluate(()=>localStorage.getItem('oakrest-dev-active-character'));
  assert.ok(identity,'fresh character has a persistent identity');
  await page.goto(base+'?qa=1',{waitUntil:'domcontentloaded'});
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
  assert.equal(await page.evaluate(()=>localStorage.getItem('oakrest-dev-active-character')),identity,
   'normal entry keeps the same saved character');
  assert.equal(await page.locator('#classic-name').textContent(),'Ipad Tester');
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
  assert.equal(await page.locator('#classic-joystick').isVisible(),false);
  const before=await page.evaluate(()=>{oakrestClassicQA.pauseAutomaticLoop();return oakrestClassicQA.state();});
  const destination=await page.evaluate(()=>{const p=oakrestClassicQA.state();const q=oakrestClassicQA.projectWorld(p.x+3,p.z),b=document.querySelector('#classic-game canvas').getBoundingClientRect();return {x:b.x+(q.x+1)*b.width/2,y:b.y+(q.y+1)*b.height/2};});
  await page.touchscreen.tap(destination.x,destination.y);
  await page.evaluate(()=>oakrestClassicQA.advance(1));
  const after=await page.evaluate(()=>oakrestClassicQA.state());
  assert.ok(Math.hypot(after.x-before.x,after.z-before.z)>.1,'new player moves by real ground tap');
  // Earn the welcome reward and training kit through the mounted simulation;
  // use QA travel/time helpers, never inject coins, XP, damage or quest flags.
  await page.evaluate(async()=>{
   oakrestClassicQA.pauseAutomaticLoop();
   const {findClassicInteractable}=await import('./src/classic-interactions.js');
   const act=(kind,id)=>{
    const t=findClassicInteractable(id);oakrestClassicQA.teleport(t.x,t.z-1.6);
    const result=oakrestClassicQA.adventureAction(kind,id);
    if(!result?.ok)throw Error(JSON.stringify({kind,id,result}));
   };
   act('accept','citizen:guard');
   for(const id of ['service:bank','service:store','service:forester']){
    const t=findClassicInteractable(id);oakrestClassicQA.teleport(t.x,t.z-1);
    if(!oakrestClassicQA.selectTarget(id))throw Error('Cannot visit '+id);
   }
   act('finish','citizen:guard');act('accept','adventure:rowan');
  });
  for(const style of ['melee','ranged','magic']){
   await page.locator('[data-style='+style+']').tap();
   const hit=await page.evaluate(style=>{
    const qa=oakrestClassicQA;qa.teleport(-1,71.3);
    qa.advance(2);
    if(!qa.lockMonster('practice'))throw Error('Cannot select training dummy');
    const hp=()=>qa.combatState().monsters.find(m=>m.id==='practice').hp;
    const before=hp();
    for(let i=0;i<20&&hp()===before;i++)qa.advance(.6);
    return hp()<before;
   },style);
   assert.equal(hit,true,style+' must land a real hit');
  }
  await page.evaluate(async()=>{
   const {findClassicInteractable}=await import('./src/classic-interactions.js');
   const t=findClassicInteractable('adventure:rowan');oakrestClassicQA.teleport(t.x,t.z-1.6);
   const result=oakrestClassicQA.adventureAction('finish','adventure:rowan');
   if(!result?.ok)throw Error('Three-style training did not complete: '+JSON.stringify(result));
   oakrestClassicQA.teleport(-30,14);
  });
  // Persist a real bank transaction, then reload through the normal entry.
  const coins=await page.evaluate(()=>oakrestClassicQA.itemState().coins);
  assert.ok(coins>=1,'welcome and training earn spendable coins');
  const deposited=await page.evaluate(()=>oakrestClassicQA.itemAction({type:'bank',kind:'coins',direction:'deposit',quantity:1}));
  assert.equal(deposited.ok,true);
  assert.equal(await page.evaluate(()=>oakrestClassicQA.saveNow()),true);
  await page.goto(base+'?qa=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.oakrestClassicQA);
  assert.equal(await page.evaluate(()=>oakrestClassicQA.itemState().coins),coins-1);
  assert.equal(await page.evaluate(()=>oakrestClassicQA.itemState().bankCoins),1);
  assert.equal(await page.evaluate(()=>localStorage.getItem('oakrest-dev-active-character')),identity);
  fs.mkdirSync(path.join(root,'qa'),{recursive:true});
  await page.screenshot({path:path.join(root,'qa','classic-direct-release-'+engine+'.png')});
  assert.deepEqual(errors,[],'fresh player must not encounter JS exceptions');
  const critical=failedRequests.filter(v=>/\.js|\.css|\.html/.test(v));
  assert.deepEqual(critical,[],'necessary game assets must load');
  assert.deepEqual(httpErrors,[],'game assets must return successful HTTP status');
  console.log('PASS '+engine+': '+base+' -> Classic, fresh creator, saved identity, touch style, quick slots, movement and bank/reload persistence.');
 }finally{await browser?.close();server?.kill();}
})().catch(err=>{console.error(engine,err);process.exitCode=1;});
