// Fast release gate: genuine Chromium rendering, UI, and local-save roundtrip.
// The exhaustive QA suite remains a separate, bounded diagnostic.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {resolve}=require('node:path');
const root=resolve(__dirname,'..');
const server=spawn('python3',['-m','http.server','5173','--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});
let browser;
(async()=>{
  const errors=[];
  try {
    await new Promise(resolve=>setTimeout(resolve,1100));
    browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const context=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true});
    const page=await context.newPage();
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:5173/?qa=1',{waitUntil:'domcontentloaded',timeout:20000});
    await page.waitForFunction(()=>!!window.oakrestQA,{timeout:20000});
    await page.locator('#begin').click({timeout:15000});
    assert.equal(await page.locator('#game canvas').count(),1,'3D canvas must render');
    const before=await page.evaluate(()=>oakrestQA.state());
    await page.keyboard.down('w');
    await page.waitForTimeout(400);
    await page.keyboard.up('w');
    const after=await page.evaluate(()=>oakrestQA.state());
    assert.ok(after.hero.z<before.hero.z,'player movement should update');
    await page.locator('#loadout-button').click({timeout:10000});
    await page.locator('#progression-inventory').click({timeout:10000});
    assert.ok(await page.locator('#progression-content').getByText('Iron Longsword').isVisible(),'inventory must open');
    await page.evaluate(()=>oakrestQA.save());
    const saved=await page.evaluate(()=>localStorage.getItem('oakrest-v1'));
    assert.ok(saved&&JSON.parse(saved).xp,'public/default save key should persist');
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.oakrestQA,{timeout:20000});
    assert.equal(await page.evaluate(()=>localStorage.getItem('oakrest-v1')),saved,'save survives reload');
    assert.deepEqual(errors,[],'no JavaScript page errors');
    await context.close();
    console.log('PASS: Chromium rendered 3D game, movement, inventory and save/reload without runtime exceptions.');
  }catch(error){console.error(error.stack);process.exitCode=1;}
  finally {await browser?.close();server.kill();}
})();
