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
 const save=defaultSave();save.coins=600;save.xp.melee=5000;save.inventory.weapons.melee.push('greatsword');save.inventory.slotted.push('recruit-shield','wayfarer-amulet');
 save.inventory.materials={ration:8,'woodland-tonic':4,'softwood-logs':20,'moss-fibre':10,reed:6};
 const id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',other='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
 await context.addInitScript(({save,id,other,prefix})=>{
  // Repeatable varying rolls, including UUID generation; a constant random
  // value breaks Three.js identities. The gameplay still resolves every hit.
  let seed=149;Math.random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
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
 // The permanent sidebar does not toggle closed. Re-selecting the item's
 // internal sub-tab refreshes that panel without hiding the entire menu.
 const open=mode=>page.evaluate(mode=>{
  if(oakrestClassicQA.windowState()===mode)
   document.querySelector('#classic-item-window [data-item-tab="'+mode+'"]')?.click();
  else oakrestClassicQA.openWindow(mode);
 },mode);
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
 assert.deepEqual(await page.evaluate(()=>oakrestClassicQA.hotbarState().slots),
  ['ability0','ability1','ability2','ability3','eat','drink','dodge','attack'],
  'dragging a bag item cannot replace combat skills');
 // The bar re-renders frequently during idle/combat ticks. Rewriting external
 // SVG <use> references, image srcs or every button ID on each update makes
 // the actual iPad Safari toolbar visibly flash. Only changed bindings may
 // replace these paint-sensitive attributes.
 const idleBar=await page.evaluate(()=>{
  const deck=document.getElementById('oakrest-action-deck');
  const buttons=[...deck.querySelectorAll('[data-hotbar-slot]')];
  const view=()=>buttons.map(button=>({
   id:button.id,slot:button.dataset.hotbarSlot,
   href:button.querySelector('svg.oakrest-action-icon use')?.getAttribute('href'),
   src:button.querySelector('img.classic-quick-item')?.getAttribute('src')||null
  }));
  const before=view(),observer=new MutationObserver(()=>{});
  observer.observe(deck,{attributes:true,subtree:true,attributeFilter:['id','href','src']});
  for(let i=0;i<10;i++)oakrestClassicQA.advance(.23);
  const mutated=observer.takeRecords().map(record=>({attribute:record.attributeName,target:record.target.tagName}));
  observer.disconnect();return {before,after:view(),mutated};
 });
 assert.equal(idleBar.before.length,8);
 assert.deepEqual(idleBar.after,idleBar.before,'quick slots retain their icon and button identity through idle ticks');
 assert.deepEqual(idleBar.mutated,[],'stable Safari quick bar must not reload icons or re-ID buttons every tick');
 assert.equal(await page.locator('#oakrest-hotbar-edit').count(),0,'no quick-item ARRANGE editor');
 assert.equal(await page.locator('.classic-quick-choice').count(),0,'inventory cannot assign gear to combat bar');
 assert.equal(await page.locator('[data-hotbar-slot="5"]').getAttribute('data-binding'),'eat');
 assert.equal(await page.locator('[data-hotbar-slot="8"]').getAttribute('data-binding'),'attack');
 // The GEAR overview displays draggable owned gear and the paper doll together.
 await open('equipment');
 // Drag from the equipment inventory list into the corresponding paperdoll.
 await drag(bag('slot.recruit-shield'),page.locator('[data-equipment-slot="offhand"]'));
 assert.equal((await snapshot()).equipment.melee.offhand,'recruit-shield');
 await drag(bag('weapon.melee.greatsword'),page.locator('[data-equipment-slot="weapon"]'));
 assert.equal((await snapshot()).gear.melee,'greatsword');assert.equal((await snapshot()).equipment.melee.offhand,null);
 assert.ok((await snapshot()).inventory.slotted.includes('recruit-shield'));
 assert.match(await page.locator('.classic-equipment-bonuses').textContent(),/1\.8 s/);
 assert.equal(await page.locator('.classic-paper-slot').count(),9);
 // The Gear tab is a one-screen overview at the main iPad landscape size.
 // Slots, all seven live bonuses and the owned-gear tray remain in view
 // without requiring any vertical swipe, and inspecting a slot is reversible.
 await page.setViewportSize({width:1194,height:834});
 const gearView=await page.evaluate(()=>{
  const content=document.getElementById('classic-item-content');
  const rect=content.getBoundingClientRect();
  const within=el=>{
   const r=el.getBoundingClientRect();
   return r.width>0&&r.height>0&&r.top>=rect.top-2&&r.bottom<=rect.bottom+2&&
    r.left>=rect.left-2&&r.right<=rect.right+2;
  };
  const slots=[...content.querySelectorAll('.classic-paper-slot')];
  const stats=[...content.querySelectorAll('.classic-gear-stats .classic-item-fact')];
  const tray=content.querySelector('.classic-gear-owned');
  return {view:content.dataset.view,slots:slots.length,stats:stats.length,
   allVisible:slots.every(within)&&stats.every(within)&&within(tray),
   overflow:content.scrollHeight-content.clientHeight,
   panel:!!content.querySelector('.classic-gear-panel')};
 });
 assert.equal(gearView.view,'equipment');
 assert.equal(gearView.panel,true);
 assert.equal(gearView.slots,9,'the entire nine-slot paper doll is visible');
 assert.equal(gearView.stats,7,'all seven gear bonuses are visible');
 assert.equal(gearView.allVisible,true,'no equipment slot, stat or owned-gear tray is off-screen');
 assert.ok(gearView.overflow<=2,'the Gear overview never requires vertical scrolling: '+JSON.stringify(gearView));
 await page.locator('[data-equipment-slot="weapon"]').tap();
 assert.equal(await page.locator('.classic-gear-detail').isVisible(),true,'equipped item opens an overlay rather than extending the Gear page');
 await page.locator('.classic-gear-detail-close').tap();
 assert.equal(await page.locator('.classic-gear-detail').count(),0);
 assert.equal(await page.locator('.classic-paper-slot').count(),9);
 await page.setViewportSize({width:1366,height:1024});
 // Shared amulet can be assigned separately to all three combat styles
 // without ever reappearing as a spare backpack item or duplicating the save.
 await page.locator('.classic-gear-choices [data-canonical="slot.wayfarer-amulet"]').tap();
 assert.equal(await page.locator('.classic-gear-detail').isVisible(),true);
 await page.locator('.classic-gear-detail .classic-item-action').filter({hasText:'EQUIP'}).tap();
 assert.equal((await snapshot()).equipment.melee.amulet,'wayfarer-amulet');
 await open('inventory');
 assert.equal(await bag('slot.wayfarer-amulet').count(),0,'equipped amulet is no longer in the backpack');
 await open('equipment');
 for(const styleName of ['magic','ranged']){
  await page.locator('#classic-styles [data-style="'+styleName+'"]').tap();
  await page.locator('.classic-gear-choices [data-canonical="slot.wayfarer-amulet"]').tap();
  await page.locator('.classic-gear-detail .classic-item-action').filter({hasText:'EQUIP'}).tap();
  assert.equal((await snapshot()).equipment[styleName].amulet,'wayfarer-amulet');
  await page.locator('.classic-gear-detail-close').tap();
 }
 assert.equal((await snapshot()).inventory.slotted.filter(x=>x==='wayfarer-amulet').length,1,
  'one owned amulet serves three gear loadouts');
 await open('inventory');
 assert.equal(await bag('slot.wayfarer-amulet').count(),0);
 await open('equipment');
 await page.locator('#classic-styles [data-style="ranged"]').tap();
 assert.match(await page.locator('.classic-item-style-list .selected').textContent(),/RANGED/);
 await open('abilities');
 assert.equal(await page.locator('.oakrest-combat-book').getAttribute('data-combat-style'),'ranged');
 assert.equal(await page.locator('.oakrest-combat-slot').count(),4,'four saved style-specific ability slots');
 assert.equal(await page.locator('.oakrest-spell-tile').count(),6,'weapon attacks and shared skills form the book grid');
 assert.ok(await page.locator('.oakrest-spell-tile.locked').count()>0,'locked abilities remain visible');
 await page.locator('.oakrest-spell-tile.locked').first().tap();
 assert.equal(await page.locator('.oakrest-spell-info-locked').count(),1,'locked abilities show a level requirement');
 await page.locator('.oakrest-combat-slot[data-slot="2"]').tap();
 await page.locator('.oakrest-spell-tile[data-ability-id="w0"]').tap();
 assert.equal(await page.locator('.oakrest-combat-slot[data-slot="2"]').getAttribute('aria-pressed'),'true');
 assert.ok((await page.locator('.oakrest-combat-slot[data-slot="2"]').textContent()).includes('Piercing Arrow'));
 assert.equal((await snapshot()).slots.ranged.bow[1],'w0','spellbook icon equips the selected slot');
 await page.locator('.oakrest-combat-clear').tap();
 assert.equal((await snapshot()).slots.ranged.bow[1],null,'clear removes a selected ability via authorised itemAction');
 await page.locator('#classic-styles [data-style="magic"]').tap();
 assert.equal(await page.locator('.oakrest-combat-book').getAttribute('data-combat-style'),'magic','active style switches book immediately');
 assert.match(await page.locator('#classic-item-content').textContent(),/Magic spellbook.*Frostwood/s);
 assert.ok(await page.locator('.oakrest-spell-tile[data-ability-name="Ice Shard"]').count(),'magic shows frost spells, not arrows');
 assert.equal(await page.locator('.oakrest-spell-tile[data-ability-name="Piercing Arrow"]').count(),0);
 await page.locator('#classic-styles [data-style="melee"]').tap();
 assert.equal(await page.locator('.oakrest-combat-book').getAttribute('data-combat-style'),'melee');
 assert.ok(await page.locator('.oakrest-spell-tile[data-ability-name="Heavy Slash"]').count());
 await page.locator('#classic-styles [data-style="magic"]').tap();
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
 // Tapping an item reveals a compact action menu without scrolling.
 await open('inventory');await bag('material.reed').tap();
 assert.equal(await page.locator('.oakrest-item-context-menu').isVisible(),true);
 assert.equal(await page.locator('.classic-bag-tools').count(),0,'old scroll-down bag tools removed');
 await page.getByRole('button',{name:'CRAFT…',exact:true}).tap();
 assert.equal(await page.locator('.oakrest-craft-popup').isVisible(),true);
 await page.getByLabel('Choose crafting recipe').selectOption('rations');
 await page.getByLabel('Craft quantity').fill('1');
 await page.getByRole('button',{name:'START CRAFTING'}).tap();
 assert.equal((await snapshot()).inventory.materials.ration,8,'crafting gives no instant output');
 await page.evaluate(()=>oakrestClassicQA.advance(3.3));
 assert.ok((await snapshot()).inventory.materials.ration>8,'one completed cycle grants rations');
 await page.getByRole('button',{name:'CLOSE',exact:true}).tap();
 // Stop after the first of two queued crafting cycles: one reward and one
 // increment of XP, without consuming unfinished ingredients.
 await open('inventory');await bag('material.reed').tap();
 await page.getByRole('button',{name:'CRAFT…',exact:true}).tap();
 await page.getByLabel('Choose crafting recipe').selectOption('rations');
 await page.getByLabel('Craft quantity').fill('2');
 const beforePartial=await snapshot(),beforeCooking=beforePartial.adventure.skills.cooking||0;
 await page.getByRole('button',{name:'START CRAFTING'}).tap();
 await page.evaluate(()=>oakrestClassicQA.advance(3.3));
 const midCraft=await snapshot();
 assert.equal(midCraft.inventory.materials.ration,beforePartial.inventory.materials.ration+3,'one completed craft cycle yields exactly one ration batch');
 assert.equal(midCraft.adventure.skills.cooking,beforeCooking+12,'XP awarded on the first finished cycle');
 await page.getByRole('button',{name:'STOP CRAFTING'}).tap();
 await page.evaluate(()=>oakrestClassicQA.advance(5));
 const stopped=await snapshot();
 assert.equal(stopped.inventory.materials.ration,midCraft.inventory.materials.ration,'cancelling does not grant second batch');
 assert.equal(stopped.adventure.skills.cooking,midCraft.adventure.skills.cooking,'cancelling does not grant unfinished XP');
 await page.getByRole('button',{name:'CLOSE',exact:true}).tap();
 // Real damage, quick-slot healing, then the inventory Use button share one cooldown.
 await page.evaluate(()=>{
  const e=oakrestClassicQA.combatState().monsters.find(m=>m.id==='bandit-a');
  oakrestClassicQA.teleport(e.x,e.z-1);
  // Wait for actual damage, bounded to 120 accelerated seconds. Forty
  // seconds could end before enough random hits for the food-use assertion.
  for(let n=0;n<240&&oakrestClassicQA.combatState().hp>oakrestClassicQA.combatState().maxHp-40;n++)oakrestClassicQA.advance(.5);
  oakrestClassicQA.teleport(0,39);
 });
 const hurt=await page.evaluate(()=>oakrestClassicQA.combatState());assert.ok(hurt.hp>0&&hurt.hp<=hurt.maxHp-40,'real damage setup: '+JSON.stringify({hp:hurt.hp,maxHp:hurt.maxHp,bandit:hurt.monsters.find(m=>m.id==='bandit-a')}));
 const food=(await snapshot()).inventory.materials.ration;
 await page.locator('[data-hotbar-slot="5"]').tap();
 assert.equal((await snapshot()).inventory.materials.ration,food-1);
 assert.ok((await page.evaluate(()=>oakrestClassicQA.combatState())).hp>hurt.hp);
 assert.equal(await page.locator('[data-hotbar-slot="5"]').isDisabled(),true);
 await open('inventory');await bag('material.ration').tap();
 assert.equal(await page.locator('.oakrest-item-context-menu').isVisible(),true);
 await page.getByRole('button',{name:'CANCEL',exact:true}).tap();
 await page.evaluate(()=>oakrestClassicQA.advance(8));
 await bag('material.ration').tap();
 await page.getByRole('button',{name:'EAT',exact:true}).tap();
 assert.equal((await snapshot()).inventory.materials.ration,food-2);
 await open('skills');assert.ok(await page.locator('.classic-skill-card').count()>=10);
 await page.locator('.classic-skill-card[data-skill-id="woodcutting"]').tap();
 assert.equal(await page.locator('#classic-skill-popup').evaluate(el=>el.open),true);
 assert.match(await page.locator('#classic-skill-popup .classic-skill-detail').textContent(),/XP to level/);
 await page.locator('#classic-skill-popup-close').tap();
 await page.locator('#classic-quests-toggle').tap();
 assert.equal(await page.locator('.oakrest-quest-row').count(),8,'quest book must show eight story entries');
 assert.match(await page.locator('.oakrest-quest-group[data-quest-section="available"] .oakrest-quest-group-heading').textContent(),/AVAILABLE/);
 assert.ok(await page.locator('.oakrest-quest-row.status-available').count()>0,'an unstarted quest is available');
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
  // After expanding the right sidebar, all 28 normal bag cells may fit
  // without scrolling. Force temporary QA-only overflow so this regression
  // continues exercising native touch-scroll and item drag disambiguation.
  await page.evaluate(()=>{
   const host=document.getElementById('classic-item-content');
   const spacer=document.createElement('div');
   spacer.id='qa-bag-overflow';spacer.style.height='420px';
   spacer.style.pointerEvents='none';spacer.setAttribute('aria-hidden','true');
   host.append(spacer);
  });
  assert.equal(await page.locator('#classic-item-content').evaluate(e=>e.scrollHeight>e.clientHeight+60),true);
  await bag('material.ration').scrollIntoViewIfNeeded(); // Wait for the resized viewport's stable layout before native input.
  const before=JSON.stringify((await snapshot()).inventorySlots),tile=await bag('material.ration').boundingBox();
  const cdp=await context.newCDPSession(page),x=tile.x+tile.width/2,y=tile.y+tile.height/2;
  assert.equal(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.closest('[data-canonical]')?.dataset.canonical,{x,y}),'material.ration');
  await page.evaluate(()=>{window.touchTrace=[];for(const name of ['pointerdown','pointermove','pointerup','pointercancel'])document.addEventListener(name,e=>touchTrace.push([name,e.timeStamp,e.clientY,e.target.className]));});
  // Supply the actual gesture timestamps: software-GPU/CDP acknowledgement
  // latency must not turn a 40 ms swipe into a deliberate 260 ms hold.
  const stamp=Date.now()/1000;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',timestamp:stamp,touchPoints:[{x,y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',timestamp:stamp+.02,touchPoints:[{x,y:y-20}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',timestamp:stamp+.04,touchPoints:[{x,y:y-40}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',timestamp:stamp+.05,touchPoints:[]});await cdp.detach();
  await page.waitForFunction(()=>document.getElementById('classic-item-content').scrollTop>0).catch(async error=>{
   console.error('Touch-scroll diagnostic',await page.evaluate(()=>({events:touchTrace,scroll:document.getElementById('classic-item-content').scrollTop})));throw error;
  });
  assert.equal(JSON.stringify((await snapshot()).inventorySlots),before,'scrolling does not rearrange items');
  // Empty cells must also scroll instead of swallowing the user's touch.
  const empty=page.locator('#classic-item-content .classic-item-cell.empty').first();await empty.scrollIntoViewIfNeeded();
  const rect=await empty.boundingBox(),start=await page.locator('#classic-item-content').evaluate(e=>e.scrollTop);
  const native=await context.newCDPSession(page),t=Date.now()/1000,ex=rect.x+rect.width/2,ey=rect.y+rect.height/2;
  await native.send('Input.dispatchTouchEvent',{type:'touchStart',timestamp:t,touchPoints:[{x:ex,y:ey}]});
  await native.send('Input.dispatchTouchEvent',{type:'touchMove',timestamp:t+.04,touchPoints:[{x:ex,y:ey-35}]});
  await native.send('Input.dispatchTouchEvent',{type:'touchEnd',timestamp:t+.05,touchPoints:[]});await native.detach();
  await page.waitForFunction(start=>document.getElementById('classic-item-content').scrollTop>start,start);
  assert.equal(JSON.stringify((await snapshot()).inventorySlots),before);
  await page.evaluate(()=>document.getElementById('qa-bag-overflow')?.remove());

 }
 await open('equipment');await page.evaluate(()=>oakrestClassicQA.advance(.02));await page.screenshot({path:'qa/classic-block3-equipment.png'});
 // Equipping an owned weapon from BAG selects its inherent style automatically.
 await page.locator('#classic-styles [data-style="ranged"]').tap();
 await open('inventory');await bag('weapon.melee.sword').tap();
 assert.equal(await page.locator('.classic-quick-choice').count(),0);
 await page.getByRole('button',{name:'EQUIP',exact:true}).tap();
 await page.evaluate(()=>oakrestClassicQA.advance(1));
 assert.equal((await snapshot()).gear.melee,'sword','weapon occupies its correct equipment slot');
 assert.equal(await page.evaluate(()=>oakrestClassicQA.state().style),'melee','equipping a sword switches from ranged to melee');
 assert.equal(await page.locator('#oakrest-action-deck').getAttribute('data-combat-style'),'melee');
 assert.equal(await page.locator('[data-hotbar-slot="1"]').getAttribute('data-binding'),'ability0');
 // A second character's legacy item/map bindings must migrate to the fixed skill bar.
 await page.evaluate(({other,prefix})=>localStorage.setItem(prefix+'active-character',other),{other,prefix});
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.oakrestClassicQA);
 assert.deepEqual((await snapshot()).quickSlots,['ability0','ability1','ability2','ability3','eat','drink','dodge','attack']);
 assert.deepEqual(errors,[]);console.log('PASS: fixed skill bar, touch/mouse drag, nine equipment slots, 2H loadouts, style panels, quantity banking, drops, crafting, skills, quests, map and separate character reload.');
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
