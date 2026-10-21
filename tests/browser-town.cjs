// Chromium interaction regression for the expanded town, using real DOM and save load.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {resolve}=require('node:path');
const server=spawn('python3',['-m','http.server','5173','--bind','127.0.0.1'],{cwd:resolve(__dirname,'..'),stdio:'ignore'});
let browser;
(async()=>{
  const errors=[];
  try{
    await new Promise(ok=>setTimeout(ok,1100));
    browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const context=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{
      if(!localStorage.getItem('oakrest-v1'))localStorage.setItem('oakrest-v1',JSON.stringify({
        xp:{melee:0,magic:0,ranged:0,vitality:0},coins:120,lootVersion:1,
        gear:{melee:'sword',magic:'frost',ranged:'bow'},
        armour:{melee:'traveller',magic:'traveller',ranged:'traveller'},
        inventory:{weapons:{melee:[],magic:[],ranged:[]},armour:[],materials:{}}
      }));
    });
    await page.goto('http://127.0.0.1:5173/?qa=1',{waitUntil:'domcontentloaded',timeout:20000});
    await page.waitForFunction(()=>!!window.oakrestQA,{timeout:20000});
    await page.locator('#begin').click();
    // Real-rendered city evidence: capture entrance, square and Warden Hall at
    // the iPad landscape reference viewport; no special renderer or mock UI.
    const fs=require('node:fs'),path=require('node:path');fs.mkdirSync(path.resolve(__dirname,'../qa'),{recursive:true});
    for(const [label,x,z,lookX,lookZ] of [['southgate',0,-26,0,-13],['heartwood',0,25,0,39],['well-courtyard',14,31,18,36],['wardens-hall',-19,71,-30,76]]){
      await page.evaluate(({x,z,lookX,lookZ})=>{oakrestQA.teleport(x,z,0);oakrestQA.aim(lookX,2.6,lookZ);oakrestQA.step(.6);},{x,z,lookX,lookZ});
      await page.screenshot({path:path.resolve(__dirname,'../qa/oakrest-city-'+label+'.png')});
    }
    const city=await page.evaluate(()=>oakrestQA.state().city);
    assert.equal(city.landmark.name,'Heartwood Oak');
    assert.ok(city.districts.length>=5);
    const mobs=await page.evaluate(()=>oakrestQA.state().enemies);
    assert.ok(mobs.filter(x=>x.type!=='dummy').every(x=>x.z<=-55),'hostile spawns must not border town');
    async function walkTo(x,z){
      await page.evaluate(({x,z})=>{oakrestQA.teleport(x,z);oakrestQA.step(.1);},{x,z});
      assert.ok(await page.locator('#town-interact').isVisible(),'service prompt should appear at '+x+','+z);
    }
    await walkTo(-29.6,14);
    await page.evaluate(()=>{oakrestQA.aim(-33,2,14);oakrestQA.step(.5);});
    await page.screenshot({path:path.resolve(__dirname,'../qa/oakrest-city-bank-interior.png')});
    await page.locator('#town-interact-button').click();
    assert.match(await page.locator('#town-title').textContent(),/Bank/);
    assert.ok(await page.locator('.town-vault .town-item-tile').count()>=0);
    await page.getByRole('button',{name:'Select Gold Coins in backpack, quantity 120'}).click();
    await page.getByRole('button',{name:'STORE ALL',exact:true}).click();
    assert.equal(await page.evaluate(()=>oakrestQA.state().data.bank.coins),120);
    assert.equal(await page.evaluate(()=>oakrestQA.state().data.coins),0);
    await page.getByRole('button',{name:'Select Gold Coins in bank, quantity 120'}).click();
    await page.getByRole('button',{name:'TAKE ALL',exact:true}).click();
    await page.locator('#town-close').click();
    await walkTo(29.6,14);
    await page.evaluate(()=>{oakrestQA.aim(33,2,14);oakrestQA.step(.5);});
    await page.screenshot({path:path.resolve(__dirname,'../qa/oakrest-city-store-interior.png')});
    await page.locator('#town-interact-button').click();
    assert.match(await page.locator('#town-title').textContent(),/General Store/);
    assert.ok((await page.locator('.town-shop-view .town-item-tile').count())>=7);
    await page.getByRole('button',{name:'Select Iron Longsword',exact:true}).click();
    await page.getByRole('button',{name:'BUY',exact:true}).click();
    assert.ok(await page.evaluate(()=>oakrestQA.state().data.inventory.weapons.melee.includes('sword')));
    await page.locator('#town-close').click();
    await walkTo(-29.6,46);
    await page.locator('#town-interact-button').click();
    await page.getByRole('button',{name:'LEARN WOODCUTTING'}).click();
    assert.equal(await page.evaluate(()=>oakrestQA.state().data.professions.woodcuttingLearned),true);
    await page.locator('#town-close').click();
    await walkTo(-18,60.5);
    await page.getByRole('button',{name:'CUT WOOD'}).click();
    assert.equal(await page.evaluate(()=>oakrestQA.state().data.inventory.materials['softwood-logs']),1);
    await page.evaluate(()=>oakrestQA.save());
    const snapshot=await page.evaluate(()=>oakrestQA.state().data);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.oakrestQA,{timeout:20000});
    assert.deepEqual(await page.evaluate(()=>oakrestQA.state().data),snapshot,'town progress, stock and logs survive reload');
    assert.deepEqual(errors,[],'no unhandled page errors');
    console.log('PASS: Peaceful gate, bank, general store, Woodcutting lesson, harvest, persistence in Chromium.');
    await context.close();
  }catch(error){console.error(error.stack);process.exitCode=1;}
  finally{await browser?.close();server.kill();}
})();
