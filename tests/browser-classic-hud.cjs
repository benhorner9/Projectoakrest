const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {resolve}=require('node:path');
const server=spawn('python3',['-m','http.server','5189','--bind','127.0.0.1'],
 {cwd:resolve(__dirname,'..'),stdio:'ignore'});
let browser;
(async()=>{
 try{
  await new Promise(r=>setTimeout(r,1100));
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1194,height:834},hasTouch:true,isMobile:false});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const raw=JSON.stringify({xp:{melee:1000,magic:500,ranged:300,vitality:600},coins:400,
   gear:{melee:'sword',magic:'frost',ranged:'bow'}});
  await page.addInitScript(raw=>localStorage.setItem('oakrest-v1',raw),raw);
  await page.goto('http://127.0.0.1:5189/classic.html?qa=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.oakrestClassicQA,{timeout:30000});
  assert.equal(await page.locator('#classic-minimap-canvas').isVisible(),true);
  assert.equal(await page.locator('#classic-settings-window').isVisible(),false);
  assert.equal(await page.locator('#classic-item-window').isVisible(),true,'Bag starts open in the new right-side MMORPG dock');
  assert.equal(await page.locator('#classic-map-window').isVisible(),false);
  assert.equal(await page.locator('#classic-interact-button').isVisible(),false,
   'interaction action is hidden when nobody is in reach');
  const map=await page.evaluate(()=>oakrestClassicQA.minimapState());
  assert.equal(map.features.buildings.length,16);
  assert.ok(map.features.services.some(x=>x.id==='bank'&&x.x===-30&&x.z===14));
  assert.deepEqual(map.position,{x:0,z:39});
  const projected=await page.evaluate(()=>{
   const qa=oakrestClassicQA;
   return {here:qa.projectWorld(0,39),north:qa.projectWorld(0,45),south:qa.projectWorld(0,33)};
  });
  assert.ok(projected.north.y<projected.here.y,'geographic north projects UP in game');
  assert.ok(projected.south.y>projected.here.y,'geographic south projects DOWN in game');
  await page.keyboard.down('w');
  await page.evaluate(()=>{for(let i=0;i<8;i++)oakrestClassicQA.step(.05);});
  await page.keyboard.up('w');
  const movedNorth=await page.evaluate(()=>oakrestClassicQA.state());
  assert.ok(movedNorth.z>39,'W/up moves geographically north, matching map N');
  const newMap=await page.evaluate(()=>oakrestClassicQA.minimapState());
  assert.ok(newMap.position.z>39,'minimap tracks geographic north');
  // Regression: left on WASD and the joystick share camera basis with map.
  const beforeLeft=await page.evaluate(()=>oakrestClassicQA.state());
  await page.keyboard.down('a');
  await page.evaluate(()=>{for(let i=0;i<8;i++)oakrestClassicQA.step(.05);});
  await page.keyboard.up('a');
  const afterLeft=await page.evaluate(()=>oakrestClassicQA.state());
  const leftMap=await page.evaluate(async ({from,to})=>{
   const {worldToMinimap}=await import('./src/classic-minimap.js');
   return worldToMinimap(to,from);
  },{from:beforeLeft,to:afterLeft});
  assert.ok(leftMap.x<80,'pressing left MUST move the minimap position left');
  const beforeRight=afterLeft;
  await page.keyboard.down('d');
  await page.evaluate(()=>{for(let i=0;i<8;i++)oakrestClassicQA.step(.05);});
  await page.keyboard.up('d');
  const afterRight=await page.evaluate(()=>oakrestClassicQA.state());
  const rightMap=await page.evaluate(async ({from,to})=>{
   const {worldToMinimap}=await import('./src/classic-minimap.js');
   return worldToMinimap(to,from);
  },{from:beforeRight,to:afterRight});
  assert.ok(rightMap.x>80,'pressing right MUST move the minimap position right');
  assert.ok(Math.abs(leftMap.y-80)<1,'left movement must not reverse or jump vertically');
  assert.ok(Math.abs(rightMap.y-80)<1,'right movement must not reverse or jump vertically');
  // Three device sizes: none of the permanent HUD pieces overlap each other.
  for(const size of [{width:1194,height:834},{width:1024,height:768},{width:1180,height:600}]){
   await page.setViewportSize(size);
   const layout=await page.evaluate(()=>{
    const bounds=id=>{
     const r=document.querySelector(id).getBoundingClientRect();
     return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
    };
    return {player:bounds('.classic-panel'),map:bounds('.classic-minimap-frame'),
     menu:bounds('.classic-item-buttons'),combat:bounds('.classic-combat-dock'),
     game:bounds('#classic-game'),screen:{width:innerWidth,height:innerHeight}};
   });
   const overlap=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.x,b.x))*
    Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y));
   for(const [a,b] of [['player','map'],['menu','map'],['menu','combat'],['player','combat']])
    assert.equal(overlap(layout[a],layout[b]),0,JSON.stringify({size,overlap:[a,b],layout}));
   for(const name of ['player','map','menu','combat']){
    const r=layout[name];
    assert.ok(r.x>=-1&&r.right<=size.width+1&&r.y>=-1&&r.bottom<=size.height+1,
     JSON.stringify({size,clipped:name,r}));
   }
  }
  await page.setViewportSize({width:1194,height:834});
  await page.locator('#classic-minimap-expand').click();
  assert.equal(await page.locator('#classic-map-window').isVisible(),true);
  assert.equal(await page.evaluate(()=>oakrestClassicQA.windowState()),'map');
  await page.locator('#classic-inventory-toggle').click();
  assert.equal(await page.locator('#classic-map-window').isVisible(),false);
  assert.equal(await page.locator('#classic-item-window').isVisible(),true);
  assert.equal(await page.locator('#classic-item-content .classic-item-cell').count(),28);
  await page.locator('#classic-equipment-toggle').click();
  assert.equal(await page.locator('.classic-paper-slot').count(),9);
  assert.equal(await page.evaluate(()=>oakrestClassicQA.windowState()),'equipment');
  await page.locator('#classic-settings-toggle').click();
  assert.equal(await page.locator('#classic-item-window').isVisible(),false);
  assert.equal(await page.locator('#classic-settings-window').isVisible(),true);
  assert.equal(await page.locator('#classic-enable-save').isVisible(),true);
  await page.locator('#classic-settings-close').click();
  assert.equal(await page.locator('#classic-settings-window').isVisible(),false);
  await page.evaluate(()=>oakrestClassicQA.teleport(-30,14));
  assert.equal(await page.locator('#classic-interact-button').isVisible(),true);
  await page.locator('#classic-interact-button').click();
  assert.equal(await page.locator('#classic-item-title').textContent(),'Oakrest Bank');
  assert.equal(await page.locator('#classic-map-window').isVisible(),false);
  await page.locator('#classic-item-close').click();
  await page.locator('#classic-map-toggle').click();
  await page.locator('#classic-map-zoom-in').click();
  assert.ok(await page.evaluate(()=>oakrestClassicQA.minimapState().zoom)>3.45);
  await page.locator('#classic-map-close').click();
  assert.deepEqual(errors,[],'no browser errors on HUD, minimap or game windows');
  assert.equal(await page.evaluate(()=>localStorage.getItem('oakrest-v1')),raw,'HUD has no save writes');
  console.log('Classic HUD regression passed: canonical minimap, device bounds, single windows, contextual actions and safe saves.');
  await context.close();
 }catch(e){console.error(e);process.exitCode=1;}
 finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);server.kill();process.exitCode=1;});
