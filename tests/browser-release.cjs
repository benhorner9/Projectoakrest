// Release flow runs against the built subdirectory or an explicitly supplied dev URL.
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),engine=process.env.OAKREST_BROWSER||'chromium';
const base=process.env.OAKREST_TEST_URL||'http://127.0.0.1:5181/oakrest-dev/';
if(!/\/oakrest-dev\/$/.test(base))throw Error('Release QA is restricted to the development path');
let server,browser;const mount=path.join(root,'qa','host'),errors=[];
(async()=>{try{
 fs.mkdirSync(mount,{recursive:true});
 if(!process.env.OAKREST_TEST_URL){
  fs.rmSync(path.join(mount,'oakrest-dev'),{force:true,recursive:true});fs.cpSync(path.join(root,'dist'),path.join(mount,'oakrest-dev'),{recursive:true});
  server=spawn('python3',['-m','http.server','5181','--bind','127.0.0.1'],{cwd:mount,stdio:'ignore'});await new Promise(r=>setTimeout(r,700));
 }
 browser=await ({chromium,webkit}[engine]).launch({headless:true,...(engine==='chromium'?{args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}: {})});
 const ctx=await browser.newContext({viewport:{width:1366,height:1024},hasTouch:true,isMobile:true,deviceScaleFactor:1});
 const page=await ctx.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 const {defaultSave,LOADOUTS}=await import('../src/rules.js');const d=defaultSave();d.coins=500;d.inventory.slotted=['recruit-helm'];
 const [lockedId]=Object.entries(LOADOUTS.melee).find(([,w])=>w.requiredLevel>1);d.inventory.weapons.melee.push(lockedId);
 await ctx.addInitScript(d=>{if(!localStorage.getItem('oakrest-dev-v1'))localStorage.setItem('oakrest-dev-v1',JSON.stringify(d));localStorage.setItem('oakrest-v1','public-save-sentinel');},d);
 await page.goto(base+'?qa=1',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.oakrestQA,null,{timeout:20000});await page.locator('#begin').click();
 async function state(){return page.evaluate(()=>oakrestQA.state().data)}
 async function openInventory(){await page.locator('#loadout-button').click();await page.locator('#progression-equipment').click();await page.screenshot({path:path.join(root,'qa',engine+'-menu.png')});await page.locator('#progression-inventory').click()}
 async function closeBook(){if(await page.locator('#skill-detail').isVisible())await page.locator('#skill-detail-back').click();await page.locator('#close-progression').click()}
 async function examine(name){await page.getByRole('button',{name:'Examine '+name,exact:true}).click()}
 async function action(name){await page.locator('#skill-detail').getByRole('button',{name,exact:true}).click()}
 async function town(x){await page.evaluate(x=>{oakrestQA.teleport(x<0?-29.6:29.6,14);oakrestQA.step(.1)},x);await page.locator('#town-interact-button').click()}
 await openInventory();
 const bounds=await page.locator('.oak-inventory-grid').evaluate(e=>{const r=e.getBoundingClientRect(),p=e.parentElement.getBoundingClientRect();return {cols:getComputedStyle(e).gridTemplateColumns.split(' ').length,cells:e.children.length,bottom:r.bottom,parentBottom:p.bottom}});
 assert.equal(bounds.cols,4);assert.equal(bounds.cells,28);assert.ok(bounds.bottom<=bounds.parentBottom,'all 28 positions visible on 13-inch landscape');
 await page.screenshot({path:path.join(root,'qa',engine+'-inventory.png')});
 await examine(LOADOUTS.melee[lockedId].title);assert.ok(await page.locator('.oak-examine-action').isDisabled());await page.locator('#skill-detail-back').click();
 await examine('Recruit Helm');await action('EQUIP');assert.equal((await state()).equipment.melee.helm,'recruit-helm');await action('UNEQUIP');assert.equal((await state()).equipment.melee.helm,null);await page.locator('#skill-detail-back').click();
 await examine('Iron Longsword');await action('UNEQUIP');assert.equal((await state()).gear.melee,'none');await closeBook();
 await town(-30);await page.getByRole('button',{name:'Select Iron Longsword in backpack',exact:true}).click();await page.getByRole('button',{name:'STORE',exact:true}).click();assert.deepEqual((await state()).bank.weapons.melee,['sword']);await page.locator('#town-close').click();
 await town(30);
 for(const name of ['Recruit Melee Set','Scout Ranged Set','Apprentice Magic Set']){
  await page.getByRole('button',{name:'Select '+name,exact:true}).click();await page.getByRole('button',{name:'BUY SET',exact:true}).click();assert.ok(await page.getByRole('button',{name:'OWNED',exact:true}).isDisabled());
 }
 // Melee owns its banked weapon and helm: six missing. Other styles own weapon: seven missing each.
 assert.equal((await state()).coins,500-Math.ceil(110*6/8)-2*Math.ceil(110*7/8));
 await page.locator('#town-close').click();await town(-30);await page.getByRole('button',{name:'Select Iron Longsword in bank',exact:true}).click();await page.getByRole('button',{name:'TAKE',exact:true}).click();await page.locator('#town-close').click();
 await openInventory();await examine('Iron Longsword');await action('EQUIP');await page.locator('#skill-detail-back').click();
 await examine('Recruit Mail');await action('EQUIP');await action('UNEQUIP');assert.equal((await state()).armour.melee,'none');await action('EQUIP');await page.locator('#skill-detail-back').click();
 await page.locator('#progression-equipment').click();assert.equal(await page.locator('.oak-gear-slot').count(),9);await page.screenshot({path:path.join(root,'qa',engine+'-equipment.png')});
 if(engine==='chromium'){
  const scroller=page.locator('#progression-content'),r=await scroller.boundingBox(),cdp=await ctx.newCDPSession(page);
  const x=r.x+r.width*.7,start=r.y+r.height*.85,end=r.y+r.height*.2;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:start,id:1}]});
  for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:start+(end-start)*i/8,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.ok(await scroller.evaluate(e=>e.scrollTop>0),'touch drag scrolls equipment list');
  assert.ok(!(await page.locator('#skill-detail').isVisible()),'scrolling does not activate Examine');
 }
 await closeBook();
 for(const style of ['ranged','magic','melee']){await page.evaluate(style=>{oakrestQA.step(2);oakrestQA.style(style);oakrestQA.step(1)},style);assert.equal(await page.evaluate(()=>oakrestQA.state().style),style)}
 const snapshot=await state();await page.evaluate(()=>oakrestQA.save());await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.oakrestQA);assert.deepEqual(await state(),snapshot);assert.equal(await page.evaluate(()=>localStorage.getItem('oakrest-v1')),'public-save-sentinel');await page.locator('#begin').click();
 // Movement continues after menus, and real melee attacks still resolve.
 await page.evaluate(()=>{oakrestQA.teleport(0,11);oakrestQA.step(1)});await page.keyboard.down('w');await page.evaluate(()=>oakrestQA.step(.4));await page.keyboard.up('w');assert.ok(await page.evaluate(()=>oakrestQA.state().hero.z<11));
 const combat=await page.evaluate(()=>{const e=oakrestQA.state().enemies.find(e=>e.type==='dummy');oakrestQA.teleport(e.x,e.z+2);for(let tries=0;tries<18&&oakrestQA.state().enemies.find(m=>m.type==='dummy').hp>=e.hp;tries++){oakrestQA.basic();oakrestQA.step(1.3);}return {before:e.hp,after:oakrestQA.state().enemies.find(m=>m.type==='dummy').hp}});assert.ok(combat.after<combat.before,'combat damages target after equipment/menu flow');
 await page.setViewportSize({width:1024,height:1366});await openInventory();await page.screenshot({path:path.join(root,'qa',engine+'-portrait.png')});
 const panel=await page.locator('#progression-panel').boundingBox();assert.ok(panel.x>=0&&panel.y>=0&&panel.x+panel.width<=1024&&panel.y+panel.height<=1366);
 assert.deepEqual(errors,[]);console.log('PASS release flow:',engine,base,'28 visible cells; 9 slots; restrictions; equip/unequip; bank; 3 partial sets; reload; isolated public save; movement; combat; landscape/portrait');
}finally{await browser?.close();server?.kill()}})().catch(e=>{console.error(e.stack,errors);process.exitCode=1});
