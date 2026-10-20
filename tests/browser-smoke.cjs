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
    // Regression coverage for an existing prototype save, retained without migration.
    await page.addInitScript(()=>{
      if(!localStorage.getItem('oakrest-v1'))localStorage.setItem('oakrest-v1',JSON.stringify({
        xp:{melee:0,magic:0,ranged:0,vitality:0},lootVersion:1,
        gear:{melee:'sword',magic:'frost',ranged:'bow'},
        armour:{melee:'traveller',magic:'traveller',ranged:'traveller'},
        inventory:{weapons:{melee:['sword'],magic:['frost'],ranged:['bow']},armour:['traveller'],materials:{}}
      }));
    });
    await page.goto('http://127.0.0.1:5173/?qa=1',{waitUntil:'domcontentloaded',timeout:20000});
    await page.waitForFunction(()=>!!window.oakrestQA,{timeout:20000});
    await page.locator('#begin').click({timeout:15000});
    assert.equal(await page.locator('#game canvas').count(),1,'3D canvas must render');
    const before=await page.evaluate(()=>oakrestQA.state());
    // Run the real movement simulation deterministically: software-rendered CI
    // can be too slow to produce a requestAnimationFrame within 400ms.
    await page.keyboard.down('w');
    await page.evaluate(()=>oakrestQA.step(.4));
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
    // Separate empty browser: a newly-created character must not inherit starter gear.
    const freshContext=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true});
    const freshPage=await freshContext.newPage();
    const freshErrors=[];freshPage.on('pageerror',e=>freshErrors.push(e.message));
    await freshPage.goto('http://127.0.0.1:5173/?qa=1',{waitUntil:'domcontentloaded',timeout:20000});
    await freshPage.waitForFunction(()=>!!window.oakrestQA,{timeout:20000});
    assert.ok(await freshPage.locator('#character-creator').isVisible(),'new accounts see character creator');
    await freshPage.locator('#creator-name').fill('Forest Walker');
    await freshPage.locator('#creator-form select[name="sex"]').selectOption('female');
    await freshPage.locator('#creator-form select[name="hairstyle"]').selectOption('ponytail');
    await freshPage.locator('#creator-confirm').click({timeout:15000});
    assert.ok(await freshPage.locator('#character-creator').isHidden(),'creator closes after saved creation');
    const name=await freshPage.locator('#character-name-label').textContent();
    assert.equal(name,'Forest Walker');
    const fresh=await freshPage.evaluate(()=>{
      const id=localStorage.getItem('oakrest-active-character');
      return {id,characters:JSON.parse(localStorage.getItem('oakrest-characters-v1')),save:JSON.parse(localStorage.getItem('oakrest-character-save-'+id)),legacy:localStorage.getItem('oakrest-v1')};
    });
    assert.equal(fresh.characters.length,1);
    assert.equal(fresh.legacy,null,'fresh creation must not modify the original save key');
    assert.equal(fresh.save.inventory.weapons.melee.length,0,'fresh characters start without weapons');
    assert.equal(fresh.save.inventory.armour.length,0,'fresh characters start without armour');
    await freshPage.locator('#begin').click();
    assert.ok(await freshPage.locator('#game canvas').count()===1);
    await freshPage.reload({waitUntil:'domcontentloaded'});
    await freshPage.waitForFunction(()=>!!window.oakrestQA,{timeout:20000});
    assert.equal(await freshPage.locator('#character-name-label').textContent(),'Forest Walker');
    assert.deepEqual(freshErrors,[],'new character opens without JavaScript errors');
    await freshContext.close();
    console.log('PASS: Legacy saves, newly-created empty-inventory characters, 3D preview and reload tested in Chromium.');
  }catch(error){console.error(error.stack);process.exitCode=1;}
  finally {await browser?.close();server.kill();}
})();
