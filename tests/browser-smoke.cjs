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
    assert.ok(await page.locator('#progression-content').getByRole('button',{name:'Examine Iron Longsword',exact:true}).isVisible(),'inventory must open');
     assert.equal(await page.locator('#progression-panel').getAttribute('aria-modal'),'true','character panel opens as one modal menu');
     await page.locator('#progression-quests').click();
     assert.match(await page.locator('#progression-content').textContent(),/Quest Journal/);
     await page.locator('#progression-map').click();
     assert.ok(await page.locator('.oak-region-map').isVisible(),'world guide opens without additional navigation');
     await page.locator('#progression-settings').click();
     assert.ok(await page.locator('#camera-zoom').isVisible(),'camera settings live in the character menu');
     await page.locator('#progression-inventory').click();
     assert.ok(await page.locator('#camera-zoom').isHidden(),'settings remain intact but are hidden on other tabs');
     const currentStyle=await page.evaluate(()=>oakrestQA.state().style);
     await page.keyboard.press('Tab');
     assert.equal(await page.evaluate(()=>oakrestQA.state().style),currentStyle,'menu keyboard focus must not swap combat style');
     await page.locator('#close-progression').click();
     assert.ok(await page.locator('#progression-panel').isHidden(),'closing the menu returns to the world');
     await page.locator('#loadout-button').click();
     assert.ok(await page.locator('#progression-inventory').isVisible(),'menu can be reopened after close');
    await page.evaluate(()=>oakrestQA.save());
    const saved=await page.evaluate(()=>localStorage.getItem('oakrest-v1'));
    assert.ok(saved&&JSON.parse(saved).xp,'public/default save key should persist');
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.oakrestQA,{timeout:20000});
    assert.equal(await page.evaluate(()=>localStorage.getItem('oakrest-v1')),saved,'save survives reload');
    await page.locator('#begin').click();
    await page.locator('#loadout-button').click();await page.locator('#progression-settings').click();
    await page.locator('#drop-editor-open').click();
    assert.ok(await page.locator('#drop-editor').isVisible(),'editor opens only in development context');
    await page.locator('#drop-editor-monster').selectOption('bandit');
    await page.locator('#drop-editor-rows .drop-editor-percentage input').first().fill('0');
    await page.locator('#drop-editor-rows .drop-editor-percentage input').first().press('Tab');
    await page.locator('#drop-editor-save').click();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('oakrest-drop-tables-v1')).bandit[0].chancePercent),0);
    await page.locator('#drop-editor-close').click();
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.oakrestQA,{timeout:20000});
    await page.locator('#begin').click();
    await page.locator('#loadout-button').click();await page.locator('#progression-settings').click();
    await page.locator('#drop-editor-open').click();
    await page.locator('#drop-editor-monster').selectOption('bandit');
    assert.equal(await page.locator('#drop-editor-rows .drop-editor-percentage input').first().inputValue(),'0','drop odds must persist in same dev browser');
    await page.locator('#drop-editor-close').click();
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
    assert.ok(await freshPage.locator('#intro').isHidden(),'successful character creation must immediately start the game');
    assert.ok(await freshPage.locator('#game canvas').count()===1);
    assert.equal(await freshPage.evaluate(()=>oakrestQA.state().area),'tutorial');
    assert.equal(await freshPage.locator('#area').textContent(),'The First Steps');
    // Training attacks must actually connect with the dummy, not just change a tab.
    await freshPage.evaluate(()=>{oakrestQA.teleport(0,-4.7);oakrestQA.basic();oakrestQA.step(.35);});
    assert.deepEqual(await freshPage.evaluate(()=>oakrestQA.state().data.onboarding.tutorial.hitStyles),['melee']);
    for(const next of ['magic','ranged']){
      await freshPage.evaluate(next=>{oakrestQA.step(1);oakrestQA.style(next);oakrestQA.step(1);oakrestQA.basic();oakrestQA.step(1.2);},next);
    }
    assert.equal(await freshPage.evaluate(()=>oakrestQA.state().data.onboarding.tutorial.hitStyles.length),3);
    await freshPage.locator('#opening-action').click();
    assert.equal(await freshPage.evaluate(()=>oakrestQA.state().data.onboarding.tutorial.skillsRead),true);
    await freshPage.locator('#opening-action').click();
    assert.equal(await freshPage.evaluate(()=>oakrestQA.state().data.onboarding.teleportScrolls),1);
    await freshPage.locator('#opening-action').click();
    assert.equal(await freshPage.evaluate(()=>oakrestQA.state().area),'realm');
    assert.equal(await freshPage.evaluate(()=>oakrestQA.state().data.onboarding.teleportScrolls),0);
    await freshPage.evaluate(()=>oakrestQA.teleport(0,-9));
    await freshPage.locator('#opening-interact-button').click();
    assert.equal(await freshPage.evaluate(()=>oakrestQA.state().area),'world');
    assert.deepEqual(await freshPage.evaluate(()=>oakrestQA.state().data.onboarding.activatedPortals),['oakrest']);
    await freshPage.reload({waitUntil:'domcontentloaded'});
    await freshPage.waitForFunction(()=>!!window.oakrestQA,{timeout:20000});
    assert.equal(await freshPage.locator('#character-name-label').textContent(),'Forest Walker');
    assert.equal(await freshPage.evaluate(()=>oakrestQA.state().area),'world','completed onboarding persists across reload');
    assert.deepEqual(freshErrors,[],'new character opens without JavaScript errors');
    await freshContext.close();
    console.log('PASS: Legacy saves, newly-created empty-inventory characters, 3D preview and reload tested in Chromium.');
  }catch(error){console.error(error.stack);process.exitCode=1;}
  finally {await browser?.close();server.kill();}
})();
