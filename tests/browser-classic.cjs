// Standalone classic presentation smoke: uses a synthetic browser save; must never change it.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {resolve}=require('node:path');
const server=spawn('python3',['-m','http.server','5181','--bind','127.0.0.1'],{cwd:resolve(__dirname,'..'),stdio:'ignore'});
let browser;
(async()=>{
 const errors=[];
 try{
  await new Promise(r=>setTimeout(r,1100));
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1180,height:820},hasTouch:true});
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
   localStorage.setItem('oakrest-v1',JSON.stringify({
    xp:{melee:2345,magic:875,ranged:190,vitality:1450},coins:317,defeated:6,
    gear:{melee:'sword',magic:'frost',ranged:'bow'},
    armour:{melee:'traveller',magic:'traveller',ranged:'traveller'},
    inventory:{weapons:{melee:['sword'],magic:['frost'],ranged:['bow']},armour:['traveller'],materials:{}},
    equipment:{melee:{helm:'recruit-helm'},magic:{},ranged:{}}
   }));
  });
  await page.goto('http://127.0.0.1:5181/classic.html?qa=1',{waitUntil:'domcontentloaded',timeout:20000});
  await page.waitForFunction(()=>!!window.oakrestClassicQA,{timeout:30000});
  assert.equal(await page.locator('#classic-game canvas').count(),1,'classic scene renders WebGL');
  const initial=await page.evaluate(()=>({state:oakrestClassicQA.state(),raw:localStorage.getItem('oakrest-v1')}));
  assert.equal(initial.state.npcCount,6,'all four canonical attendants plus ambient villagers');
  assert.ok(initial.state.combatLevel>1);
  await page.locator('[data-style="magic"]').click();
  assert.equal(await page.evaluate(()=>oakrestClassicQA.state().style),'magic');
  assert.match(await page.locator('#classic-weapon').textContent(),/Frostwood Staff/);
  await page.locator('[data-style="ranged"]').click();
  assert.equal(await page.evaluate(()=>oakrestClassicQA.state().style),'ranged');
  await page.keyboard.down('w');
  await page.evaluate(()=>{for(let i=0;i<6;i++)oakrestClassicQA.step(.05);});
  await page.keyboard.up('w');
  const moved=await page.evaluate(()=>oakrestClassicQA.state());
  assert.ok(moved.z<initial.state.z,'W moves character toward northern road');
  await page.evaluate(()=>oakrestClassicQA.teleport(-30,14));
  const inside=await page.evaluate(()=>oakrestClassicQA.state());
  assert.equal(inside.interior,'bank','interior comes from canonical building layout');
  assert.equal(inside.roofHidden,true,'bank roof hides indoors');
  assert.equal(await page.evaluate(()=>oakrestClassicQA.selectTarget('service:bank')),true);
  assert.match(await page.locator('#classic-dialogue-name').textContent(),/Bank/);
  assert.match(await page.locator('#classic-dialogue-text').textContent(),/Coins in bank/);
  await page.evaluate(()=>oakrestClassicQA.teleport(30,14));
  assert.equal(await page.evaluate(()=>oakrestClassicQA.selectTarget('service:store')),true);
  assert.match(await page.locator('#classic-dialogue-text').textContent(),/General Store|coins/);
  await page.evaluate(()=>oakrestClassicQA.teleport(-16,59));
  await page.locator('#classic-interact-button').click();
  assert.match(await page.locator('#classic-dialogue-text').textContent(),/Woodcutting/);
  await page.evaluate(()=>oakrestClassicQA.teleport(0,39));
  assert.equal(await page.evaluate(()=>oakrestClassicQA.state().interior),null);
  const after=await page.evaluate(()=>localStorage.getItem('oakrest-v1'));
  assert.equal(after,initial.raw,'existing save must never change in visual prototype');
  assert.deepEqual(errors,[],'no uncaught browser exceptions');
  console.log('Classic 2.5D smoke passed: world, movement, equipment preview, interiors and original save.');
  await context.close();
 }catch(error){console.error(error);process.exitCode=1;}
 finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);server.kill();process.exitCode=1;});
