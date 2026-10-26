// Block 3 actual DOM/input and character persistence. Desktop touch emulation, not physical iPad Safari.
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const {spawn}=require('node:child_process');
const {resolve}=require('node:path');
const fs=require('node:fs');
const url=process.env.OAKREST_CLASSIC_URL||'http://127.0.0.1:5266/classic.html';
const prefix=new URL(url).pathname.split('/').includes('oakrest-dev')?'oakrest-dev-':'oakrest-';
assert.ok(['127.0.0.1','localhost'].includes(new URL(url).hostname)||url==='https://playcellbound.com/oakrest-dev/classic.html','isolated QA may target localhost or the development Classic route only');
const server=spawn('python3',['-m','http.server','5266','--bind','127.0.0.1'],{cwd:resolve(__dirname,'..'),stdio:'ignore'});
let browser;
(async()=>{try{
 await new Promise(r=>setTimeout(r,800));
 const engine=process.env.BROWSER==='webkit'?webkit:chromium;
 browser=await engine.launch({headless:true,...(engine===chromium?{args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{})});
 const context=await browser.newContext({viewport:{width:1366,height:1024},hasTouch:true});
 const {defaultSave}=await import('../src/rules.js');
 const save=defaultSave();save.coins=600;save.xp.melee=5000;save.inventory.weapons.melee.push('greatsword');save.inventory.slotted.push('recruit-shield');
 save.inventory.materials={ration:8,'woodland-tonic':4,'softwood-logs':20,'moss-fibre':10,reed:6};
 const id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',other='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
 await context.addInitScript(({save,id,other,prefix})=>{
  if(!localStorage.getItem(prefix+'characters-v1')){
   localStorage.setItem(prefix+'characters-v1',JSON.stringify([{id,name:'Bag Tester'},{id:other,name:'Other Adventurer'}]));
   localStorage.setItem(prefix+'active-character',id);
   localStorage.setItem(prefix+'character-save-'+id,JSON.stringify(save));
   localStorage.setItem(prefix+'character-save-'+other,JSON.stringify({...save,quickSlots:['map',null,null,null,null,null,null,null]}));
  }
  let qa;Object.defineProperty(window,'oakrestClassicQA',{configurable:true,get:()=>qa,set:v=>{qa=v;v?.pauseAutomaticLoop?.();}});
 },{save,id,other,prefix});
 const page=await context.newPage(),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+'?qa=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.oakrestClassicQA);
 await page.evaluate(()=>oakrestClassicQA.enableSaving());
 const snapshot=()=>page.evaluate(()=>oakrestClassicQA.persistentSnapshot());
 const open=mode=>page.evaluate(mode=>{if(oakrestClassicQA.windowState()===mode)oakrestClassicQA.openWindow(mode);oakrestClassicQA.openWindow(mode);},mode);
 const bag=id=>page.locator('#classic-item-content [data-scope="bag"][data-canonical="'+id+'"]');
 async function drag(source,dest,touch=false){
  await source.scrollIntoViewIfNeeded();const a=await source.boundingBox();
  await dest.scrollIntoViewIfNeeded();const b=await dest.boundingBox();
  assert.ok(a&&b,'both drag targets exist');
  const x=a.x+a.width/2,y=a.y+a.height/2,dx=b.x+b.width/2,dy=b.y+b.height/2;
  if(touch&&engine===chromium){
   const cdp=await context.newCDPSession(page);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   await page.waitForTimeout(300);
   for(let i=1;i<=6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(dx-x)*i/6,y:y+(dy-y)*i/6}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
  }else {await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(dx,dy,{steps:8});await page.mouse.up();}
 }
 await open('inventory');
 const playerBefore=await page.evaluate(()=>oakrestClassicQA.state());
 const rationIndex=await bag('material.ration').getAttribute('data-slot-index');
 await drag(bag('material.ration'),page.locator('#classic-item-content [data-scope="bag"][data-slot-index="0"]'),true);
 assert.equal((await snapshot()).inventorySlots[0],'material.ration','held touch or mouse drag reorders the bag');
 assert.equal((await snapshot()).inventory.materials.ration,8);
 assert.equal((await page.evaluate(()=>oakrestClassicQA.state())).x,playerBefore.x,'UI drag must not move the world character');
 assert.notEqual(rationIndex,'0');
 await drag(bag('material.ration'),page.locator('[data-hotbar-slot="1"]'));
 assert.equal((await snapshot()).quickSlots[0],'material.ration','any of eight slots can hold food');
 await page.locator('#oakrest-hotbar-edit').tap();
 assert.equal(await page.locator('#oakrest-hotbar-editor select').count(),8);
 await page.locator('#oakrest-hotbar-select-8').selectOption('equipment');
 await page.locator('#oakrest-hotbar-select-2').selectOption('');
 await page.locator('#oakrest-hotbar-edit').tap();
 assert.equal((await snapshot()).quickSlots[7],'equipment');assert.equal((await snapshot()).quickSlots[1],null);
 await page.locator('[data-hotbar-slot="8"]').tap();assert.equal(await page.evaluate(()=>oakrestClassicQA.windowState()),'equipment');
 // Drag from the equipment inventory list into the corresponding paperdoll.
 await drag(bag('slot.recruit-shield'),page.locator('[data-equipment-slot="offhand"]'));
 assert.equal((await snapshot()).equipment.melee.offhand,'recruit-shield');
 await drag(bag('weapon.melee.greatsword'),page.locator('[data-equipment-slot="weapon"]'));
 assert.equal((await snapshot()).gear.melee,'greatsword');assert.equal((await snapshot()).equipment.melee.offhand,null);
 assert.ok((await snapshot()).inventory.slotted.includes('recruit-shield'));
 assert.match(await page.locator('.classic-equipment-bonuses').textContent(),/1\.8 s/);
 assert.equal(await page.locator('.classic-paper-slot').count(),9);
 await page.locator('#classic-styles [data-style="ranged"]').tap();
 assert.match(await page.locator('.classic-item-style-list .selected').textContent(),/RANGED/);
 await open('abilities');assert.equal(await page.locator('.classic-ability-select').count(),4);
 await page.locator('#classic-styles [data-style="magic"]').tap();
 assert.match(await page.locator('#classic-item-content').textContent(),/MAGIC.*Frostwood/);
 // Custom amounts and cross-grid dragging use the same banker transaction.
 await page.evaluate(()=>oakrestClassicQA.teleport(-30,14));await open('bank');
 await bag('material.softwood-logs').tap();
 await page.getByLabel('Bank transfer quantity',{exact:true}).fill('7');
 await page.getByRole('button',{name:'DEPOSIT QUANTITY',exact:true}).tap();
 assert.equal((await snapshot()).bank.materials['softwood-logs'],7);assert.equal((await snapshot()).inventory.materials['softwood-logs'],13);
 await open('bank');
 // Both compact columns fit at the upper scroll position.
 await drag(bag('material.softwood-logs'),page.locator('#classic-item-content [data-scope="vault"][data-slot-index="1"]'));
 assert.equal((await snapshot()).bank.materials['softwood-logs'],20);assert.equal((await snapshot()).inventory.materials['softwood-logs'],undefined);
 await page.locator('#classic-item-content [data-scope="vault"][data-canonical="material.softwood-logs"]').tap();
 await page.getByRole('button',{name:'WITHDRAW ALL',exact:true}).tap();assert.equal((await snapshot()).inventory.materials['softwood-logs'],20);
 await open('inventory');await bag('material.softwood-logs').tap();
 await page.getByLabel('Drop quantity',{exact:true}).fill('3');await page.getByRole('button',{name:'DROP',exact:true}).tap();
 let d=await snapshot();assert.equal(d.inventory.materials['softwood-logs'],17);const drop=d.groundLoot.find(d=>d.playerDrop);
 assert.ok(drop);await page.evaluate(id=>oakrestClassicQA.pickupDrop(id),drop.id);
 assert.equal((await snapshot()).inventory.materials['softwood-logs'],20);
 // Item-on-item crafting remains connected after several item transactions.
 await open('inventory');await bag('material.reed').tap();
 // Use the existing maker for a one-material recipe; item-on-item recipes remain in existing adventure suites.
 await page.locator('.classic-bag-tools summary').tap();await page.getByRole('button',{name:'MAKE FROM BAG',exact:true}).tap();
 const rationRecipe=page.locator('.craft-option').filter({hasText:'Bundle 3 field rations'});
 await rationRecipe.getByRole('button',{name:'MAKE',exact:true}).tap();
 assert.ok((await snapshot()).inventory.materials.ration>8);
 // Real damage, quick-slot healing, then the inventory Use button share one cooldown.
 await page.evaluate(()=>{
  const e=oakrestClassicQA.combatState().monsters.find(m=>m.id==='bandit-a');
  oakrestClassicQA.teleport(e.x,e.z-1);
  for(let n=0;n<80&&oakrestClassicQA.combatState().hp>oakrestClassicQA.combatState().maxHp-40;n++)oakrestClassicQA.advance(.5);
  oakrestClassicQA.teleport(0,39);
 });
 const hurt=await page.evaluate(()=>oakrestClassicQA.combatState());assert.ok(hurt.hp>0&&hurt.hp<=hurt.maxHp-40);
 const food=(await snapshot()).inventory.materials.ration;
 await page.locator('[data-hotbar-slot="1"]').tap();
 assert.equal((await snapshot()).inventory.materials.ration,food-1);
 assert.ok((await page.evaluate(()=>oakrestClassicQA.combatState())).hp>hurt.hp);
 assert.equal(await page.locator('[data-hotbar-slot="1"]').isDisabled(),true);
 await open('inventory');await bag('material.ration').tap();
 assert.equal(await page.locator('[data-consumable="eat"]').isDisabled(),true);
 await page.evaluate(()=>oakrestClassicQA.advance(8));
 assert.equal(await page.locator('[data-consumable="eat"]').isDisabled(),false);
 await page.locator('[data-consumable="eat"]').tap();
 assert.equal((await snapshot()).inventory.materials.ration,food-2);
 await open('skills');assert.ok(await page.locator('.classic-skill-card').count()>=10);assert.match(await page.locator('.classic-skill-detail').textContent(),/XP to level/);
 await page.locator('#classic-quests-toggle').tap();
 assert.match(await page.locator('#classic-quest-book').textContent(),/Available/);
 await open('map');assert.equal(await page.locator('#classic-map-window').isVisible(),true);
 await open('inventory');
 assert.equal(await page.evaluate(()=>oakrestClassicQA.saveNow()),true);
 const saved=await snapshot();await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.oakrestClassicQA);
 const loaded=await snapshot();assert.deepEqual(loaded.quickSlots,saved.quickSlots);assert.deepEqual(loaded.inventory,saved.inventory);assert.deepEqual(loaded.bank,saved.bank);assert.deepEqual(loaded.equipment,saved.equipment);assert.deepEqual(loaded.gear,saved.gear);
 await page.evaluate(()=>oakrestClassicQA.advance(.02));
 assert.equal(await page.locator('.classic-four-grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),4);
 fs.mkdirSync('qa',{recursive:true});await page.screenshot({path:'qa/classic-block3-'+(process.env.BROWSER||'chromium')+'.png'});
 await page.setViewportSize({width:1194,height:834});await open('inventory');
 if(engine===chromium){
  await bag('material.ration').scrollIntoViewIfNeeded(); // Wait for the resized viewport's stable layout before native input.
  const before=JSON.stringify((await snapshot()).inventorySlots),tile=await bag('material.ration').boundingBox();
  const cdp=await context.newCDPSession(page),x=tile.x+tile.width/2,y=tile.y+tile.height/2;
  assert.equal(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.closest('[data-canonical]')?.dataset.canonical,{x,y}),'material.ration');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-20}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-40}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
  await page.waitForFunction(()=>document.getElementById('classic-item-content').scrollTop>0); // CDP delivery finishes asynchronously.
  assert.equal(JSON.stringify((await snapshot()).inventorySlots),before,'scrolling does not rearrange items');
 }
 await open('equipment');await page.evaluate(()=>oakrestClassicQA.advance(.02));await page.screenshot({path:'qa/classic-block3-equipment.png'});
 // A second named character must not inherit the first character's eight bindings.
 await page.evaluate(({other,prefix})=>localStorage.setItem(prefix+'active-character',other),{other,prefix});
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.oakrestClassicQA);
 assert.equal((await snapshot()).quickSlots[0],'map');assert.equal((await snapshot()).quickSlots[7],null);
 assert.deepEqual(errors,[]);console.log('PASS: eight saved bindings, touch/mouse drag, nine equipment slots, 2H loadouts, style panels, quantity banking, drops, crafting, skills, quests, map and separate character reload.');
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
