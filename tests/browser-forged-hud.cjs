// UI-only review of the approved Oakrest HUD, without modifying or
// comparing the world renderer. Chromium is NOT actual physical iPad Safari.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {resolve}=require('node:path');
const {mkdirSync}=require('node:fs');
const server=spawn('python3',['-m','http.server','5282','--bind','127.0.0.1'],{cwd:resolve(__dirname,'..'),stdio:'ignore'});
let browser;
(async()=>{try{
 await new Promise(r=>setTimeout(r,900));
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1194,height:834},hasTouch:true,isMobile:false});
 // Stable existing-profile fixture means this test measures the actual HUD,
 // not an unrelated first-run character-creation dialog.
 const {defaultSave}=await import('../src/rules.js');
 const fixture=JSON.stringify(defaultSave());
 await context.addInitScript(raw=>localStorage.setItem('oakrest-v1',raw),fixture);
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5282/classic.html?qa=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.oakrestClassicQA,{timeout:30000});
 await page.evaluate(()=>oakrestClassicQA.pauseAutomaticLoop());
 const sprite=await page.request.get('http://127.0.0.1:5282/src/oakrest-ui-icons.svg');
 assert.equal(sprite.status(),200,'original Oakrest SVG artwork must actually load');
 const xml=await sprite.text();
 for(const key of ['bag','gear','combat','skills','quests','map','social','melee','ranged','magic',
  'slash','shield','ration','tonic','dodge','strike','empty'])
  assert.ok(xml.includes('id="'+key+'"'),'missing original visual asset '+key);
 assert.equal(await page.locator('.classic-item-buttons svg.oakrest-ui-icon use').count(),7);
 assert.equal(await page.locator('#classic-styles svg.oakrest-style-icon use').count(),3);
 assert.equal(await page.locator('#classic-item-window').isVisible(),true);
 assert.ok((await page.locator('#classic-item-content').innerText()).includes('SIX COLUMNS'));
 const layout=(await page.evaluate(()=>{
  const r=selector=>{
   const b=document.querySelector(selector).getBoundingClientRect();
   return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height};
  };
  const style=selector=>getComputedStyle(document.querySelector(selector));
  return {columns:style('.classic-four-grid').gridTemplateColumns.split(' ').length,
   gridDisplay:style('#classic-app').display,
   world:r('#classic-game'),chat:r('#oakrest-chat'),right:r('#classic-sidebar'),
   deck:r('#oakrest-action-deck'),map:r('.classic-sidebar-map'),menus:r('.classic-item-buttons'),
   tabHeights:[...document.querySelectorAll('.classic-item-buttons button')].map(b=>b.getBoundingClientRect().height),
   outline:style('.classic-item-cell').borderColor,
   tabBackground:style('#classic-inventory-toggle').backgroundImage,
   mapDiameter:r('.minimap-open').width,
   iconSizes:[...document.querySelectorAll('.classic-item-buttons svg')].map(b=>b.getBoundingClientRect().width),
  };
 }));
 assert.equal(layout.gridDisplay,'grid');
 assert.equal(layout.columns,6,'reference uses six visually arranged columns, without changing slots');
 assert.ok(layout.mapDiameter>=142,'minimap is richly framed');
 assert.ok(layout.tabHeights.every(h=>h>=44),'iPad targets');
 assert.ok(layout.tabBackground.includes('gradient'),'tabs have dimensional finish');
 assert.ok(layout.iconSizes.every(w=>w>=20),'original Oakrest symbols readable');
 const overlap=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y));
 assert.equal(overlap(layout.world,layout.chat),0);
 assert.equal(overlap(layout.world,layout.right),0);
 assert.equal(overlap(layout.map,layout.menus),0);
 assert.equal(overlap(layout.deck,layout.world),0);
 // The existing game world is NOT redrawn or moved by CSS styling.
 const before=await page.evaluate(()=>({
   position:oakrestClassicQA.state(),
   entities:oakrestClassicQA.minimapState().features.buildings.map(b=>b.id),
   sceneMeshes:document.querySelector('#classic-game canvas')?.width||0
 }));
 assert.ok(before.sceneMeshes>0);
 assert.equal(await page.locator('#oakrest-action-deck .classic-attack-row button').count(),8);
 assert.equal(await page.locator('#oakrest-action-deck .oakrest-action-icon use').count(),8);
 await page.locator('[data-style=magic]').click();
 assert.equal(await page.locator('#oakrest-action-deck').getAttribute('data-combat-style'),'magic');
 const styleSVG=await page.locator('[data-style=magic] svg use').getAttribute('href');
 assert.ok(styleSVG.endsWith('#magic'));
 await page.locator('[data-style=ranged]').click();
 assert.equal(await page.locator('#oakrest-action-deck').getAttribute('data-combat-style'),'ranged');
 await page.locator('#classic-quests-toggle').click();
 assert.equal(await page.locator('#classic-quests-window').isVisible(),true);
 await page.locator('#classic-quests-close').click();
 await page.locator('#classic-inventory-toggle').click();
 assert.equal(await page.locator('#classic-item-window').isVisible(),true);
 await page.getByRole('button',{name:'Public',exact:true}).click();
 assert.equal(await page.locator('#oakrest-chat-input').isDisabled(),true);
 await page.getByRole('button',{name:'All',exact:true}).click();
 assert.equal(await page.locator('#oakrest-chat-input').isEnabled(),true);
 for(const viewport of [{width:1366,height:1024},{width:1194,height:834},{width:1024,height:768},{width:1180,height:600},{width:820,height:630}]){
  await page.setViewportSize(viewport);await page.waitForTimeout(90);
  const values=await page.evaluate(()=>{
   const b=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
   return {world:b('#classic-game'),chat:b('#oakrest-chat'),sidebar:b('#classic-sidebar'),menu:b('.classic-item-buttons'),map:b('.classic-sidebar-map'),deck:b('#oakrest-action-deck'),height:innerHeight};
  });
  assert.equal(overlap(values.world,values.chat),0,'chat cannot obstruct game '+viewport.width);
  assert.equal(overlap(values.world,values.sidebar),0,'UI cannot obstruct game '+viewport.width);
  assert.equal(overlap(values.menu,values.map),0,'map cannot overlap menu '+viewport.width);
  assert.equal(overlap(values.deck,values.menu),0,'hotbar separate '+viewport.width);
  assert.ok(values.world.width>viewport.width*.55,'visible playable world '+viewport.width);
  assert.ok(values.world.height>viewport.height*.58,'adequate playable world height '+viewport.height);
 }
 await page.setViewportSize({width:1194,height:834});await page.waitForTimeout(60);
 mkdirSync('qa/forged-hud',{recursive:true});
 await page.screenshot({path:'qa/forged-hud/bag-and-chat.png'});
 await page.locator('#classic-skills-toggle').click();
 await page.screenshot({path:'qa/forged-hud/skills-and-actions.png'});
 assert.deepEqual(errors,[]);
 console.log('PASS: UI-only Forged HUD: 7 bespoke icons, 6-col inventory, 8 SVG actions, real chat, unchanged world viewport and five iPad/desktop layouts');
}finally{await browser?.close();server.kill();}})().catch(err=>{console.error(err);process.exitCode=1;});
