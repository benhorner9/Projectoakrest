// Chromium touch-screen regression for equipment paper doll and item examination.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {resolve}=require('node:path');
const server=spawn('python3',['-m','http.server','5173','--bind','127.0.0.1'],{cwd:resolve(__dirname,'..'),stdio:'ignore'});
let browser;
(async()=>{
 const errors=[];
 try{
  await new Promise(done=>setTimeout(done,1000));
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1024,height:768},hasTouch:true});
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   localStorage.setItem('oakrest-v1',JSON.stringify({
    lootVersion:1,xp:{melee:0,ranged:0,magic:0,vitality:0},coins:120,
    gear:{melee:'sword',ranged:'bow',magic:'frost'},
    armour:{melee:'traveller',ranged:'traveller',magic:'traveller'},
    inventory:{weapons:{melee:['sword'],magic:['frost'],ranged:['bow']},armour:['traveller'],slotted:['recruit-helm'],materials:{'moss-fibre':3}},
    equipment:{melee:{helm:null},magic:{},ranged:{}}
   }));
  });
  await page.goto('http://127.0.0.1:5173/?equipment-qa=1',{waitUntil:'domcontentloaded',timeout:20000});
  await page.waitForFunction(()=>!!window.oakrestQA,{timeout:20000});
  await page.locator('#begin').click();
  await page.locator('#gear-button').click();
  assert.equal(await page.locator('.oak-gear-slot').count(),9,'all nine equipment slots display');
  await page.locator('#progression-inventory').click();
  assert.ok((await page.locator('.oak-inventory-grid > *').count())>=28,'inventory keeps its 28-cell base');
  await page.locator('[aria-label="Examine Recruit Helm"]').click();
  assert.match(await page.locator('#skill-detail-body').textContent(),/Incoming damage/);
  await page.locator('.oak-examine-action').click();
  assert.equal(await page.evaluate(()=>window.oakrestQA.state().data.equipment.melee.helm),'recruit-helm');
  await page.locator('#skill-detail-back').click();
  await page.locator('#progression-equipment').click();
  assert.ok(await page.locator('.oak-gear-helm .oak-item-icon').isVisible(),'equipped helm has an icon');
  await page.evaluate(()=>window.oakrestQA.save());
  const equipped=await page.evaluate(()=>window.oakrestQA.state().data.equipment);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.oakrestQA,{timeout:20000});
  assert.deepEqual(await page.evaluate(()=>window.oakrestQA.state().data.equipment),equipped,'equipped slots persist');
  assert.deepEqual(errors,[],'no page errors');
  console.log('PASS: Nine-slot equipment, 28-cell grid, Examine, Equip and persistence in Chromium touch viewport.');
 }catch(error){console.error(error.stack);process.exitCode=1;}
 finally{await browser?.close();server.kill();}
})();
