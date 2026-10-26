// Browser regression for RuneScape-like attack-on-click, walk-to-flee controls.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {resolve}=require('node:path');
const server=spawn('python3',['-m','http.server','5219','--bind','127.0.0.1'],{cwd:resolve(__dirname,'..'),stdio:'ignore'});
let browser;
(async()=>{
 try{
  await new Promise(r=>setTimeout(r,850));
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1180,height:700},hasTouch:true});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5219/classic.html?qa=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.oakrestClassicQA);
  await page.locator('#classic-creator-name').fill('Combat Freedom');
  // Creation reloads the document. A hidden overlay alone can be observed
  // before module startup completes in the new page. Wait for that exact profile.
  await Promise.all([
   page.waitForNavigation({waitUntil:'domcontentloaded'}),
   page.locator('#classic-creator-form button[type=submit]').click()
  ]);
  await page.waitForFunction(()=>window.oakrestClassicQA?.characterCreatorState().appearance?.name==='Combat Freedom');
  assert.equal(await page.locator('#classic-creator').isHidden(),true);
  await page.evaluate(()=>oakrestClassicQA.pauseAutomaticLoop());
  // Fresh adventurers earn their visible training kit before combat.
  await page.evaluate(async()=>{
   const {findClassicInteractable}=await import('./src/classic-interactions.js');
   const act=(kind,id)=>{const t=findClassicInteractable(id);oakrestClassicQA.teleport(t.x,t.z-1.6);return oakrestClassicQA.adventureAction(kind,id);};
   if(!act('accept','citizen:guard').ok)throw Error('Cannot begin welcome');
   for(const id of ['service:bank','service:store','service:forester']){const t=findClassicInteractable(id);oakrestClassicQA.teleport(t.x,t.z-1);oakrestClassicQA.selectTarget(id);}
   if(!act('finish','citizen:guard').ok)throw Error('Cannot finish welcome');
   if(!act('accept','adventure:rowan').ok)throw Error('Cannot receive training equipment');
  });
  const state=()=>page.evaluate(()=>oakrestClassicQA.combatState());
  const step=seconds=>page.evaluate(seconds=>oakrestClassicQA.advance(seconds),seconds);
  await page.evaluate(()=>oakrestClassicQA.teleport(-1,71.3));
  assert.equal(await page.evaluate(()=>oakrestClassicQA.lockMonster('practice')),true);
  await step(.08);
  assert.equal((await state()).targetId,'practice');
  for(let i=0;i<30&&!(await state()).action;i++)await step(.02);
  assert.ok((await state()).action,'selected target starts its windup by the next 600ms combat beat');
  await page.keyboard.down('a');
  await step(.08);
  assert.equal((await state()).targetId,null,'WASD disengages automatically');
  assert.equal((await state()).action,null,'walking cancels pending attack windup');
  await page.keyboard.up('a');
  await step(2);
  assert.equal((await state()).targetId,null,'stopping movement does not resume attack');
  assert.equal(await page.locator('#classic-attack').innerText().then(t=>t.includes('STOP')),false);
  // A deliberate click to attack again should work, but clicking ground cancels
  // both target and the auto-approach order before the next movement frame.
  await page.evaluate(()=>oakrestClassicQA.teleport(-1,66));
  assert.equal(await page.evaluate(()=>oakrestClassicQA.lockMonster('practice')),true);
  const before=await page.evaluate(()=>oakrestClassicQA.state());
  await step(1.2);
  const after=await page.evaluate(()=>({
   player:oakrestClassicQA.state(),
   nav:oakrestClassicQA.navigationState(),
   target:oakrestClassicQA.combatState().targetId,
   feedback:oakrestClassicQA.state().status
  }));
  assert.ok(Math.hypot(after.player.x+1,after.player.z-73)<Math.hypot(before.x+1,before.z-73),
   'a selected distant enemy is approached: '+JSON.stringify({before,after}));
  await page.evaluate(()=>oakrestClassicQA.moveTo(-13,65));
  assert.equal((await state()).targetId,null,'a ground destination cancels the attack immediately');
  await step(.3);
  assert.equal((await state()).targetId,null,'auto-pursuit cannot steal back the movement');
  // On touch devices moving the joystick is also a movement order.
  await page.evaluate(()=>oakrestClassicQA.teleport(-1,71.3));
  await page.evaluate(()=>oakrestClassicQA.lockMonster('practice'));
  const joy=await page.locator('#classic-joystick').boundingBox();
  assert.ok(joy,'touch joystick is available in iPad-style viewport');
  await page.touchscreen.tap(joy.x+joy.width*.75,joy.y+joy.height*.5);
  await step(.08);
  assert.equal((await state()).targetId,null,'touch joystick cancels target without a STOP button');
  assert.deepEqual(errors,[],'no browser exceptions');
  console.log('PASS: click-to-attack approach, WASD escape, ground-click escape, touch escape and no sticky re-engagement.');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
