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
  await page.locator('#classic-creator-form button[type=submit]').click();
  await page.waitForFunction(()=>document.getElementById('classic-creator').hidden);
  const state=()=>page.evaluate(()=>oakrestClassicQA.combatState());
  const step=seconds=>page.evaluate(seconds=>oakrestClassicQA.advance(seconds),seconds);
  await page.evaluate(()=>oakrestClassicQA.teleport(-1,71.3));
  assert.equal(await page.evaluate(()=>oakrestClassicQA.lockMonster('practice')),true);
  await step(.08);
  assert.equal((await state()).targetId,'practice');
  assert.ok((await state()).action,'selected target immediately starts ordinary attack windup');
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
  const before=await page.evaluate(()=>oakrestClassicQA.state().z);
  await step(.32);
  assert.ok(await page.evaluate(z=>oakrestClassicQA.state().z>z),before,'a selected distant enemy is approached');
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
