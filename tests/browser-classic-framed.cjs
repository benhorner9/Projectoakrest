// The Classic UI must reserve actual space for RPG information, not place
// opaque panels on top of the Three.js world. Exercise iPad-like viewports.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {resolve}=require('node:path');
const server=spawn('python3',['-m','http.server','5234','--bind','127.0.0.1'],{cwd:resolve(__dirname,'..'),stdio:'ignore'});
let browser;
(async()=>{
 try{
  await new Promise(r=>setTimeout(r,900));
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1194,height:834},hasTouch:true,isMobile:false});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5234/classic.html?qa=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.oakrestClassicQA);
  await page.locator('#classic-creator-name').fill('Framed Tester');
  await page.locator('#classic-creator-form button[type=submit]').click();
  await page.waitForFunction(()=>document.getElementById('classic-creator').hidden);
  // The WebGL canvas and reparented shell are real application elements.
  // Wait for their readiness before measuring instead of racing initialization.
  const shellSelectors=['#classic-game canvas','#classic-sidebar','.classic-item-buttons',
   '.classic-minimap-frame','.classic-action-footer','.classic-combat-dock','#classic-joystick','#classic-app'];
  await page.waitForFunction(selectors=>selectors.every(selector=>document.querySelector(selector)),shellSelectors,{timeout:20000});
  for(const size of [{width:1194,height:834},{width:1180,height:600},{width:1024,height:768},{width:820,height:630}]){
   await page.setViewportSize(size);
   await page.waitForTimeout(80);
   const view=await page.evaluate(()=>{
    const assertNode=(node,selector)=>{if(!node)throw Error('Missing live Classic shell element: '+selector);};
    const box=selector=>{
     const element=document.querySelector(selector);
     assertNode(element,selector);
     const r=element.getBoundingClientRect();
     return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};
    };
    const world=box('#classic-game'),canvas=box('#classic-game canvas');
    return {world,canvas,side:box('#classic-sidebar'),nav:box('.classic-item-buttons'),
     map:box('.classic-minimap-frame'),footer:box('.classic-action-footer'),
     dock:box('.classic-combat-dock'),joystick:box('#classic-joystick'),
     rendererSize:{w:document.querySelector('#classic-game canvas').width,h:document.querySelector('#classic-game canvas').height},
     app:box('#classic-app')};
   });
   const intersects=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.x,b.x))*
    Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y));
   assert.ok(view.world.w>=210&&view.world.h>150,JSON.stringify({size,view}));
   assert.equal(intersects(view.world,view.side),0,'world must never be behind the sidebar');
   assert.equal(intersects(view.world,view.footer),0,'combat buttons must not cover the world');
   assert.equal(intersects(view.nav,view.map),0,'menu buttons must sit below the minimap');
   assert.equal(intersects(view.dock,view.world),0,'combat dock must not cover world');
   assert.ok(intersects(view.dock,view.side)>100,'eight-slot combat dock is intentionally within the right sidebar');
   assert.ok(Math.abs(view.canvas.w-view.world.w)<=4&&Math.abs(view.canvas.h-view.world.h)<=4,
    'canvas fills world content rectangle (minus ornamental frame border): '+JSON.stringify({size,view}));
   assert.ok(view.rendererSize.w>0&&view.rendererSize.h>0,'WebGL framebuffer is valid');
   assert.equal(view.joystick.x>=view.world.x&&view.joystick.right<=view.world.right,true,'only joystick floats inside viewport');
  }
  await page.setViewportSize({width:1180,height:600});
  if(!await page.locator('#classic-item-window').isVisible())await page.locator('#classic-inventory-toggle').click();
  assert.equal(await page.locator('#classic-item-window').isVisible(),true);
  const itemInside=await page.evaluate(()=>{
   const a=document.querySelector('#classic-item-window').getBoundingClientRect();
   const b=document.querySelector('#classic-sidebar-body').getBoundingClientRect();
   return a.left>=b.left-1&&a.right<=b.right+1&&a.top>=b.top-1&&a.bottom<=b.bottom+1;
  });
  assert.equal(itemInside,true,'inventory fills sidebar, not world');
  await page.locator('#classic-skills-toggle').click();
  assert.equal(await page.locator('#classic-skills-window').isVisible(),true);
  assert.equal(await page.locator('#classic-item-window').isVisible(),false);
  assert.equal(await page.locator('.classic-skill-card').count(),11,'gathering includes the active Foraging skill');
  await page.locator('#classic-quests-toggle').click();
  assert.equal(await page.locator('#classic-quests-window').isVisible(),true);
  assert.equal(await page.locator('#classic-skills-window').isVisible(),false);
  await page.locator('#classic-quests-close').click();
  // A separate model window should never obstruct click-to-walk.
  await page.evaluate(()=>oakrestClassicQA.teleport(0,39));
  await page.keyboard.down('w');
  await page.evaluate(()=>oakrestClassicQA.advance(.5));
  await page.keyboard.up('w');
  assert.ok((await page.evaluate(()=>oakrestClassicQA.state())).z>39,'movement remains responsive');
  assert.deepEqual(errors,[],'no browser runtime exceptions');
  console.log('PASS: integrated Oakrest world viewport, world-relative WebGL sizing, fixed controls and in-frame RPG books at 4 sizes.');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
