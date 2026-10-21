// End-to-end iPad-sized skills and in-world backpack regression.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {resolve}=require('node:path');
const server=spawn('python3',['-m','http.server','5183','--bind','127.0.0.1'],{cwd:resolve(__dirname,'..'),stdio:'ignore'});
let browser;
(async()=>{
 const errors=[];
 try{
  await new Promise(done=>setTimeout(done,950));
  const {defaultSave}=await import('../src/rules.js');
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1180,height:820},hasTouch:true,deviceScaleFactor:1});
  await context.addInitScript(data=>localStorage.setItem('oakrest-v1',JSON.stringify(data)),defaultSave());
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5183/?qa=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.oakrestQA,{timeout:20000});
  await page.locator('#begin').click();

  await page.locator('#loadout-button').click();
  await page.locator('#progression-levels-tab').click();
  const wood=page.locator('button.level-card.level-woodcutting');
  assert.equal(await wood.count(),1,'Woodcutting card must be a real button');
  assert.equal(await wood.locator('.level-xp-track .level-xp-fill').count(),1,'Woodcutting uses the combat skill XP bar');
  assert.match(await wood.textContent(),/Level 1/);
  await wood.click();
  assert.match(await page.locator('#skill-detail-title').textContent(),/Woodcutting · Level 1/);
  assert.equal(await page.locator('#skill-detail-body .milestone').count(),14);
  assert.match(await page.locator('#skill-detail-body').textContent(),/Softwood Tree/);
  assert.match(await page.locator('#skill-detail-body').textContent(),/Bronze Axe/);
  assert.match(await page.locator('#skill-detail-body').textContent(),/Elderwood Tree/);
  assert.match(await page.locator('#skill-detail-body').textContent(),/Pryrite Axe/);
  assert.match(await page.locator('#skill-detail-body').textContent(),/LV 85/);
  await page.locator('#skill-detail-back').click();
  await page.locator('#close-progression').click();

  const toggle=page.locator('#side-inventory-toggle');
  assert.equal(await toggle.isVisible(),true);
  assert.equal(await page.locator('#side-inventory').isVisible(),false);
  await toggle.click();
  assert.equal(await toggle.getAttribute('aria-expanded'),'true');
  assert.equal(await page.locator('#side-inventory').isVisible(),true);
  const grid=page.locator('#side-inventory-body .oak-inventory-grid');
  assert.equal(await grid.getAttribute('data-columns'),'4');
  assert.equal(await grid.locator('.oak-drag-slot').count(),28);
  const size=await page.locator('#side-inventory').boundingBox();
  assert.ok(size.x>=0&&size.y>=0&&size.x+size.width<=1180&&size.y+size.height<=820,'quick inventory stays on screen');

  // The sidebar is not modal: no backdrop blocks gameplay while it is open.
  assert.equal(await page.locator('#menu-backdrop').isVisible(),false);
  await page.evaluate(()=>{oakrestQA.learnWoodcutting();oakrestQA.teleport(-18,60.5);});
  const started=await page.evaluate(()=>oakrestQA.woodcut('pine-west'));
  assert.equal(started,true);
  await page.evaluate(()=>oakrestQA.step(36));
  const current=await page.evaluate(()=>oakrestQA.state());
  assert.ok(current.data.professions.woodcuttingXp>0,'chopping earns XP with quick inventory open');
  assert.ok(current.data.inventory.materials['softwood-logs']>=1,'logs enter quick inventory');
  assert.equal(current.quickInventory.open,true);
  assert.equal(await page.locator('#side-inventory-body [data-canonical="material.softwood-logs"]').count(),1,'sidebar updates with earned logs');
  await page.locator('#side-inventory-body [data-canonical="material.softwood-logs"]').click();
  assert.equal(await page.locator('#progression-panel').isVisible(),true,'quick item opens the full Examine view');
  assert.match(await page.locator('#skill-detail-body').textContent(),/Softwood Logs/);
  await page.locator('#skill-detail-back').click();
  await page.locator('#close-progression').click();
  assert.equal(await page.locator('#side-inventory').isVisible(),true,'quick inventory remains open after examining item');

  await page.locator('#loadout-button').click();
  await page.locator('#progression-levels-tab').click();
  const updated=page.locator('.level-card.level-woodcutting');
  assert.match(await updated.textContent(),/Level [1-9][0-9]*/);
  const width=await updated.locator('.level-xp-fill').evaluate(el=>Number.parseFloat(el.style.width));
  assert.ok(width>0,'Woodcutting card XP bar advances from log acquisition');
  await updated.click();
  assert.match(await page.locator('#skill-detail-body .detail-xp').textContent(),/XP needed/);
  await page.locator('#skill-detail-back').click();
  await page.locator('#close-progression').click();
  assert.equal(await page.locator('#side-inventory').isVisible(),true);
  await page.evaluate(()=>oakrestQA.save());
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.oakrestQA);
  await page.locator('#begin').click();
  assert.equal(await page.locator('#side-inventory').isVisible(),true,'quick backpack preference persists after reload');
  assert.deepEqual(errors,[]);
  console.log('PASS: Woodcutting XP bar, 14 unlocks, interactive non-modal iPad backpack, live logs, Examine and persistence');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
