// End-to-end Oakrest Rebirth iPad layout and ground presentation.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {resolve}=require('node:path');
const {mkdirSync}=require('node:fs');
const server=spawn('python3',['-m','http.server','5255','--bind','127.0.0.1'],{cwd:resolve(__dirname,'..'),stdio:'ignore'});
let browser;
(async()=>{
 try{
  await new Promise(r=>setTimeout(r,900));
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1194,height:834},hasTouch:true});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5255/classic.html?qa=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.oakrestClassicQA);
  await page.locator('#classic-creator-name').fill('Oakrest Rebirth QA');
  await page.locator('#classic-creator-form button[type=submit]').click();
  await page.waitForFunction(()=>document.getElementById('classic-creator').hidden);
  await page.evaluate(()=>oakrestClassicQA.teleport(0,39));
  for(const size of [{width:1366,height:1024},{width:1194,height:834},{width:1024,height:768},{width:1180,height:600},{width:820,height:630}]){
   await page.setViewportSize(size);
   await page.waitForTimeout(80);
   const l=await page.evaluate(()=>{
    const box=selector=>{
     const r=document.querySelector(selector).getBoundingClientRect();
     return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};
    };
    return {world:box('#classic-game'),side:box('#classic-sidebar'),
     footer:box('.classic-action-footer'),map:box('.classic-sidebar-map'),
     nav:box('.classic-item-buttons'),dock:box('.classic-combat-dock'),
     quick:box('.field-shortcuts'),buttons:[...document.querySelectorAll('.classic-item-buttons button')].map(b=>b.getBoundingClientRect().height),
     canvas:box('#classic-game canvas'),
     css:getComputedStyle(document.querySelector('#classic-app')).gridTemplateColumns};
   });
   const overlap=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*
    Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
   assert.ok(l.world.width>=size.width*.54,'world priority: '+JSON.stringify({size,l}));
   assert.ok(l.world.height>size.height*.59,'world height priority: '+JSON.stringify({size,l}));
   assert.equal(overlap(l.world,l.side),0,'sidebar never covers world');
   assert.equal(overlap(l.world,l.footer),0,'action footer never covers the world');
   assert.equal(overlap(l.map,l.nav),0,'minimap stays above navigation');
   assert.equal(overlap(l.dock,l.world),0,'attack buttons stay clear of world');
   assert.ok(overlap(l.dock,l.side)>100,'eight-slot bar belongs inside right-hand sidebar');
   assert.ok(l.buttons.every(h=>h>=40),'touch menu target size '+JSON.stringify({size,l}));
   assert.ok(Math.abs(l.canvas.width-l.world.width)<=4,'renderer tracks the usable viewport minus the 3px frame border');
  }
  await page.setViewportSize({width:1194,height:834});
  mkdirSync('qa/rebirth',{recursive:true});
  await page.screenshot({path:'qa/rebirth/town-world-first.png'});
  await page.locator('#classic-inventory-toggle').click();
  assert.equal(await page.locator('.field-shortcuts button').count(),3);
  await page.locator('.field-shortcuts button').filter({hasText:'Quests'}).click();
  assert.equal(await page.locator('#classic-quests-window').isVisible(),true);
  await page.locator('#classic-quests-close').click();
  await page.locator('#classic-inventory-toggle').click();
  assert.equal(await page.locator('#classic-item-window').isVisible(),true);
  await page.locator('#classic-skills-toggle').click();
  assert.equal(await page.locator('#classic-skills-window').isVisible(),true);
  assert.equal(await page.locator('#classic-item-window').isVisible(),false);
  await page.locator('.classic-skill-card').filter({hasText:'Woodcutting'}).click();
  assert.ok(await page.locator('.classic-skill-unlock').count()>3);
  await page.screenshot({path:'qa/rebirth/skills-in-sidebar.png'});
  await page.locator('#classic-skills-close').click();
  const surface=await page.evaluate(async()=>{
   const THREE=await import('three');
   const {createClassicTerrain}=await import('./src/classic-terrain-view.js');
   const group=new THREE.Group(),result=createClassicTerrain(group);
   const instanced=group.children.filter(c=>c.isInstancedMesh);
   const meshes=group.children.map(c=>c.geometry?.type);
   return {stones:result.stones,instanced:instanced.length,meshes,
    groundVertices:result.ground.attributes.position.count};
  });
  assert.equal(surface.stones,0,'no square paving stones remain in the town');
  assert.equal(surface.instanced,0,'no grid of square floor-tile instances');
  assert.ok(surface.groundVertices>1500,'retains varied lightweight terrain');
  const stateBefore=await page.evaluate(()=>oakrestClassicQA.state());
  await page.keyboard.down('w');
  await page.evaluate(()=>oakrestClassicQA.advance(.5));
  await page.keyboard.up('w');
  const stateAfter=await page.evaluate(()=>oakrestClassicQA.state());
  assert.ok(stateAfter.z>stateBefore.z,'camera-relative movement stays functional');
  assert.deepEqual(errors,[]);
  console.log('Oakrest Rebirth: no square town slabs, 5 device layouts, compact navigation, all panels and movement PASSED');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
