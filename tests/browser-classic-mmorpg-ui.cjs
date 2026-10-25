// Approved Oakrest MMORPG reference: game above chat, map + Bag at right,
// 4 weapon-family abilities and 4 usable utility slots. Chromium emulates touch,
// but does not replace physical iPad Safari acceptance.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {resolve}=require('node:path');
const {mkdirSync}=require('node:fs');
const server=spawn('python3',['-m','http.server','5257','--bind','127.0.0.1'],{cwd:resolve(__dirname,'..'),stdio:'ignore'});
let browser;
(async()=>{try{
 await new Promise(r=>setTimeout(r,950));
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1194,height:834},hasTouch:true,isMobile:false});
 const {defaultSave}=await import('../src/rules.js');
 const fixture=defaultSave();
 fixture.inventory.materials={...fixture.inventory.materials,ration:3,'woodland-tonic':2};
 const raw=JSON.stringify(fixture);
 await context.addInitScript(raw=>localStorage.setItem('oakrest-v1',raw),raw);
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5257/classic.html?qa=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.oakrestClassicQA,{timeout:30000});
 await page.evaluate(()=>oakrestClassicQA.pauseAutomaticLoop());
 assert.equal(await page.locator('#classic-item-window').isVisible(),true,'bag open by default');
 assert.equal(await page.locator('.oakrest-chat-line').count()>=2,true);
 assert.equal(await page.locator('#classic-styles button').count(),3);
 assert.equal(await page.locator('#classic-ability-buttons [data-ability]').count(),4);
 assert.equal(await page.locator('#oakrest-action-deck .classic-attack-row button').count(),8);
 assert.equal(await page.locator('#oakrest-food-slot').getAttribute('data-hotbar-slot'),'5');
 assert.equal(await page.locator('#oakrest-potion-slot').getAttribute('data-hotbar-slot'),'6');
 assert.equal(await page.locator('#classic-dodge').getAttribute('data-hotbar-slot'),'7');
 assert.equal(await page.locator('#classic-attack').getAttribute('data-hotbar-slot'),'8');
 const slots=await page.evaluate(()=>oakrestClassicQA.hotbarState().slots);
 assert.deepEqual(slots,['ability0','ability1','ability2','ability3','eat','drink','dodge','attack']);
 for(const size of [{width:1366,height:1024},{width:1194,height:834},{width:1024,height:768},{width:1180,height:600},{width:820,height:630}]){
  await page.setViewportSize(size);await page.waitForTimeout(100);
  const l=await page.evaluate(()=>{
   const bounds=q=>{const r=document.querySelector(q).getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
   return {world:bounds('#classic-game'),chat:bounds('#oakrest-chat'),side:bounds('#classic-sidebar'),
    map:bounds('.classic-sidebar-map'),nav:bounds('.classic-item-buttons'),
    actions:bounds('#oakrest-action-deck'),dock:bounds('.classic-combat-dock'),
    canvas:bounds('#classic-game canvas'),
    styles:[...document.querySelectorAll('#classic-styles button')].map(e=>e.getBoundingClientRect().height),
    menu:[...document.querySelectorAll('.classic-item-buttons button')].map(e=>e.getBoundingClientRect().height)};
  });
  const overlap=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
  assert.ok(l.world.width>size.width*.54&&l.world.height>size.height*.57,JSON.stringify({size,l}));
  assert.equal(overlap(l.world,l.side),0,'world separate from right panel');
  assert.equal(overlap(l.world,l.chat),0,'chat does not float over world');
  assert.equal(overlap(l.chat,l.side),0,'chat remains left');
  assert.equal(overlap(l.actions,l.map),0,'action bar stays below map');
  assert.equal(overlap(l.nav,l.map),0,'tabs below map');
  assert.ok(l.styles.every(h=>h>=33),'styles reachable at landscape sizes');
  assert.ok(l.menu.every(h=>h>=44),'tab targets accessible on iPad');
  assert.ok(Math.abs(l.canvas.width-l.world.width)<=4);
 }
 await page.setViewportSize({width:1194,height:834});
 mkdirSync('qa/mmorpg-ui',{recursive:true});
 await page.screenshot({path:'qa/mmorpg-ui/bag-chat-melee.png'});
 const initial=await page.locator('#oakrest-action-deck').getAttribute('data-combat-style');
 assert.equal(initial,'melee');
 await page.locator('[data-style=magic]').click();
 await page.evaluate(()=>oakrestClassicQA.advance(.4));
 assert.equal(await page.evaluate(()=>oakrestClassicQA.state().style),'magic');
 assert.equal(await page.locator('#oakrest-action-deck').getAttribute('data-combat-style'),'magic');
 await page.locator('[data-style=ranged]').click();
 await page.evaluate(()=>oakrestClassicQA.advance(.4));
 assert.equal(await page.evaluate(()=>oakrestClassicQA.state().style),'ranged');
 assert.equal(await page.locator('#oakrest-action-deck').getAttribute('data-combat-style'),'ranged');
 await page.screenshot({path:'qa/mmorpg-ui/ranged-loadout.png'});
 // Chat is functional in single-player without impersonating multiplayer.
 await page.locator('#classic-game canvas').click({position:{x:90,y:75}});
 await page.keyboard.press('Enter');
 assert.equal(await page.evaluate(()=>document.activeElement?.id),'oakrest-chat-input');
 await page.locator('#oakrest-chat-input').fill('Testing Oakrest chat!');
 await page.locator('#oakrest-chat-input').press('Enter');
 assert.ok((await page.evaluate(()=>oakrestClassicQA.chatState().entries)).some(e=>e.text==='Testing Oakrest chat!'&&e.channel==='Local'));
 await page.getByRole('button',{name:'Public',exact:true}).click();
 assert.equal(await page.locator('#oakrest-chat-input').isDisabled(),true,'no fake public chat sends');
 await page.getByRole('button',{name:'All',exact:true}).click();
 assert.equal(await page.locator('#oakrest-chat-input').isEnabled(),true);
 assert.ok(await page.locator('#oakrest-chat-log').getByText('Testing Oakrest chat!').isVisible());
 await page.locator('#classic-social-toggle').click();
 assert.equal(await page.locator('#classic-social-window').isVisible(),true);
 await page.locator('#classic-social-close').click();
 await page.locator('#classic-settings-toggle').click();
 assert.equal(await page.locator('#classic-settings-window').isVisible(),true);
 await page.locator('#classic-settings-close').click();
 await page.locator('#classic-inventory-toggle').click();
 assert.equal(await page.locator('#classic-item-window').isVisible(),true);
 assert.equal(await page.locator('#classic-item-content .classic-item-cell').count(),28);
 await page.locator('#classic-skills-toggle').click();
 assert.equal(await page.locator('#classic-skills-window').isVisible(),true);
 await page.screenshot({path:'qa/mmorpg-ui/skills-and-chat.png'});
 await page.locator('#classic-skills-close').click();
 assert.deepEqual(errors,[],'no browser errors when switching styles/chat/menus');
 assert.equal(await page.evaluate(()=>localStorage.getItem('oakrest-v1')),raw,'presentation/chat do not silently mutate saves');
 console.log('PASS: approved Oakrest MMORPG shell, chat log, 8-slot style bar, iPad proportions and non-network channels');
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
