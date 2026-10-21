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
    const bankView=await page.evaluate(()=>oakrestQA.state());
    assert.equal(bankView.town.inside,'bank','bank must recognise player entering');
    assert.ok(bankView.town.interiorCameraBlend>.5,'indoor camera must rise for clearer visibility');
    assert.ok(bankView.cameraPosition.y-bankView.hero.y>4.5,'camera too low to see the bank counters');
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
    // Actual drag gestures across the visible RuneScape-style slot grids.
    async function drag(from,to){
      await from.scrollIntoViewIfNeeded();await to.scrollIntoViewIfNeeded();
      const a=await from.boundingBox(),b=await to.boundingBox();
      assert.ok(a&&b,'both drag slots must be visible');
      const ax=a.x+a.width/2,ay=a.y+a.height/2,bx=b.x+b.width/2,by=b.y+b.height/2;
      const hit=await page.evaluate(({bx,by})=>document.elementFromPoint(bx,by)?.closest('[data-scope]')?.dataset.scope||null,{bx,by});
      assert.ok(hit,'drop target must not be obscured by the fixed bank header');
      await page.mouse.move(ax,ay);await page.mouse.down();
      await page.mouse.move(bx,by,{steps:7});await page.mouse.up();
    }
    await drag(page.getByRole('button',{name:'Select Gold Coins in backpack, quantity 120'}),
      page.locator('.town-vault .town-item-empty').nth(6));
    assert.equal(await page.evaluate(()=>oakrestQA.state().data.bank.coins),120,'drag deposit must store coins');
    assert.equal(await page.evaluate(()=>oakrestQA.state().data.coins),0);
    await drag(page.getByRole('button',{name:'Select Gold Coins in bank, quantity 120'}),
      page.locator('.town-backpack .town-item-empty').nth(5));
    assert.equal(await page.evaluate(()=>oakrestQA.state().data.coins),120,'drag withdraw must restore coins');
    assert.equal(await page.evaluate(()=>oakrestQA.state().data.bank.coins),0);
    assert.ok(await page.evaluate(()=>oakrestQA.state().data.inventorySlots.some(id=>id==='currency.coins')),
      'dragged item has a persistent inventory location');
    await page.locator('#town-close').click();
    await walkTo(29.6,14);
    await page.evaluate(()=>{oakrestQA.aim(33,2,14);oakrestQA.step(.5);});
    const storeView=await page.evaluate(()=>oakrestQA.state());
    assert.equal(storeView.town.inside,'store','shop interior not detected');
    assert.ok(storeView.cameraPosition.y-storeView.hero.y>4.0,'shop walls still restrict camera');
    await page.screenshot({path:path.resolve(__dirname,'../qa/oakrest-city-store-interior.png')});
    await page.locator('#town-interact-button').click();
    assert.match(await page.locator('#town-title').textContent(),/General Store/);
    assert.ok((await page.locator('.town-shop-view .town-item-tile').count())>=7);
    await page.getByRole('button',{name:'Select Iron Longsword',exact:true}).click();
    await page.getByRole('button',{name:'BUY',exact:true}).click();
    assert.ok(await page.evaluate(()=>oakrestQA.state().data.inventory.weapons.melee.includes('sword')));
    await page.locator('#town-close').click();
    // The Trade House is a future auction venue, but already enterable and staffed.
    await page.evaluate(()=>{oakrestQA.teleport(3.5,64.5);oakrestQA.aim(15,3.0,64.5);oakrestQA.step(.7);});
    await page.screenshot({path:path.resolve(__dirname,'../qa/oakrest-city-trade-house-exterior.png')});
    await walkTo(14.9,64.5);
    await page.evaluate(()=>{oakrestQA.aim(19,2.4,64.5);oakrestQA.step(.65);});
    const tradeView=await page.evaluate(()=>oakrestQA.state());
    assert.equal(tradeView.town.inside,'trade-house','trade hall should be fully enterable');
    assert.ok(tradeView.town.interiorCameraBlend>.5,'trade hall requires unobstructed interior camera');
    await page.screenshot({path:path.resolve(__dirname,'../qa/oakrest-city-trade-house-interior.png')});
    await page.locator('#town-interact-button').click();
    assert.match(await page.locator('#town-title').textContent(),/Trade House/);
    assert.match(await page.locator('#town-content').textContent(),/auction house is not open yet/i);
    assert.equal(await page.locator('#town-content .town-buy-button').count(),0,'future auction house must not process transactions');
    await page.locator('#town-close').click();
        await walkTo(-29.6,46);
    await page.locator('#town-interact-button').click();
    await page.getByRole('button',{name:'LEARN WOODCUTTING'}).click();
    assert.equal(await page.evaluate(()=>oakrestQA.state().data.professions.woodcuttingLearned),true);
    await page.locator('#town-close').click();
    await walkTo(-18,60.5);
    await page.getByRole('button',{name:'CUT WOOD'}).click();
    assert.equal(await page.evaluate(()=>oakrestQA.state().data.inventory.materials['softwood-logs']),1);
    // Four-column inventory must let its user swap positions on iPad-size UI.
    await page.locator('#loadout-button').click();
    await page.locator('#progression-inventory').click();
    assert.ok(await page.locator('.oak-inventory-grid .oak-inventory-item').count()>0);
    const inventoryFrom=page.locator('.oak-inventory-grid .oak-inventory-item').first();
    const inventoryTo=page.locator('.oak-inventory-grid .oak-inventory-empty').last();
    await drag(inventoryFrom,inventoryTo);
    assert.ok(await page.evaluate(()=>oakrestQA.state().data.inventorySlots.some((id,i)=>i>15&&!!id)),
      'inventory drag reorders a slot beyond the initial occupied positions');
    await page.locator('#close-progression').click();
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
