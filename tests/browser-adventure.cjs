// Real browser integration, isolated new character. Accelerated time and QA positioning
// exercise transactions; this is NOT a natural-duration or physical iPad playtest.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {resolve}=require('node:path');
const {mkdirSync}=require('node:fs');
const remote=process.env.OAKREST_CLASSIC_URL;
const server=remote?null:spawn('python3',['-m','http.server','5194','--bind','127.0.0.1'],{cwd:resolve(__dirname,'..'),stdio:'ignore'});
let browser;
(async()=>{
 try{
  if(server)await new Promise(r=>setTimeout(r,800));
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1366,height:1024},hasTouch:true});
  const page=await context.newPage(),errors=[];page.setDefaultNavigationTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto((remote||'http://127.0.0.1:5194/classic.html')+'?qa=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.oakrestClassicQA);
  await page.locator('#classic-creator-name').fill('First Adventure');
  await page.locator('#classic-creator-form button[type=submit]').click();
  await page.waitForFunction(()=>window.oakrestClassicQA&&document.getElementById('classic-creator').hidden);
  assert.equal(await page.evaluate(()=>oakrestClassicQA.saveStatus().enabled),true,'new Classic characters automatically save with existing backup protections');
  const act=async(kind,id,choice)=>{
   const result=await page.evaluate(async({kind,id,choice})=>{
    const {findClassicInteractable}=await import('./src/classic-interactions.js');const t=findClassicInteractable(id);
    if(t)oakrestClassicQA.teleport(t.x,t.z-1.6);
    return oakrestClassicQA.adventureAction(kind,id,choice);
   },{kind,id,choice});assert.equal(result?.ok,true,JSON.stringify({kind,id,result,state:await page.evaluate(()=>oakrestClassicQA.adventureState())}));return result;
  };
  const step=async seconds=>page.evaluate(seconds=>oakrestClassicQA.advance(seconds),seconds);
  await page.evaluate(()=>{oakrestClassicQA.teleport(5,46);oakrestClassicQA.interactNow();});
  await page.getByRole('button',{name:'Accept quest',exact:true}).click();
  for(const id of ['service:bank','service:store','service:forester']){
   await page.evaluate(async id=>{const {findClassicInteractable}=await import('./src/classic-interactions.js');const t=findClassicInteractable(id);oakrestClassicQA.teleport(t.x,t.z-1.5);oakrestClassicQA.selectTarget(id);},id);
  }
  await act('finish','citizen:guard');await act('accept','adventure:rowan');
  for(const style of ['melee','magic','ranged']){
   await page.evaluate(style=>{oakrestClassicQA.teleport(-1,71);oakrestClassicQA.switchStyle(style);},style);await step(2);
   await page.evaluate(()=>oakrestClassicQA.lockMonster('practice'));await step(5);
  }
  await act('finish','adventure:rowan');
  await act('accept','adventure:smith');
  for(const [id,material] of [['adventure:copper','copper-ore'],['adventure:tin','tin-ore'],['adventure:softwood','softwood-logs']]){
   await act('gather',id);await step(id.endsWith('softwood')?30:5);
   if(id.endsWith('softwood'))for(let attempt=0;attempt<4&&!await page.evaluate(()=>oakrestClassicQA.persistentSnapshot().inventory.materials['softwood-logs']>0);attempt++)await step(30);
   assert.ok(await page.evaluate(material=>oakrestClassicQA.adventureState().flags.includes('gather:'+material),material),'gather objective registered: '+material);
   await act('cancel');
  }
  // Make supplies through the actual Classic inventory, no world fletching table.
  if(!await page.locator('#classic-item-window').isVisible())await page.locator('#classic-inventory-toggle').click();
  await page.locator('.classic-bag-tools > summary').click();
  await page.getByRole('button',{name:'MAKE FROM BAG'}).click();
  const arrows=page.locator('.craft-option').filter({hasText:'Fletch 30 field ammunition'});
  await arrows.getByRole('button',{name:'MAKE',exact:true}).click();
  await page.keyboard.press('Escape');
  await act('finish','adventure:smith');
  assert.equal(await page.evaluate(()=>oakrestClassicQA.saveNow()),true);
  const before=await page.evaluate(()=>oakrestClassicQA.persistentSnapshot());
  // The existing save sanitizer omits exhausted stacks (0 logs after fletching).
  before.inventory.materials=Object.fromEntries(Object.entries(before.inventory.materials).filter(([,amount])=>amount>0));
  mkdirSync('qa/first-adventure',{recursive:true});await page.screenshot({path:'qa/first-adventure/before-reload.png'});
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.oakrestClassicQA);
  assert.equal(await page.evaluate(()=>oakrestClassicQA.adventureState().index),3);
  assert.deepEqual(await page.evaluate(()=>oakrestClassicQA.persistentSnapshot().inventory),before.inventory);
  assert.equal(await page.evaluate(()=>oakrestClassicQA.saveStatus().enabled),true,'adventure save preference survives reload');
  await page.locator('#adventure-journal').click();
  assert.equal(await page.locator('.classic-quest-entry').count(),8);
  assert.equal(await page.locator('#classic-quests-window').isVisible(),true);
  assert.equal(await page.locator('#classic-quest-book').getByText('The Cart That Never Came').count()>0,true);
  assert.match(await page.locator('.oakrest-quest-progress').textContent(),/3\s*\/\s*8 complete/);
  assert.equal(await page.locator('.oakrest-quest-row.status-completed').count(),3);
  assert.equal(await page.locator('.oakrest-quest-row.status-available').count(),1);
  await page.locator('.oakrest-quest-row[data-quest-id="road"]').click();
  const popup=page.locator('#classic-quest-popup');
  assert.equal(await popup.isVisible(),true,'quest details open in a separate modal');
  assert.equal(await popup.evaluate(e=>e.open),true,'native modal dialog is active');
  assert.equal(await page.locator('#classic-quests-window').isVisible(),true,'quest tab stays visible behind the modal');
  assert.equal(await page.locator('#classic-quest-book .oakrest-quest-row').count(),8,'sidebar keeps every quest row');
  assert.equal(await page.locator('#classic-quest-book .oakrest-quest-page').count(),0,'quest detail must NOT replace the sidebar list');
  assert.equal(await popup.locator('.oakrest-quest-title').textContent(),'The Cart That Never Came');
  assert.match(await popup.locator('.oakrest-quest-state').textContent(),/Not started/);
  assert.equal(await popup.locator('.oakrest-quest-track').isDisabled(),true,'tracked quest remains tracked');
  assert.equal(await page.locator('#classic-quest-popup-close').count(),0,'do not add duplicate close buttons');
  await popup.getByRole('button',{name:'Close quest details'}).click();
  assert.equal(await popup.isVisible(),false,'X closes the dialog, not the sidebar');
  await page.waitForFunction(()=>document.activeElement?.dataset?.questId==='road');
  assert.equal(await page.locator('.oakrest-quest-row').count(),8,'quest rows remain after close');
  await page.locator('.oakrest-quest-row[data-quest-id="provisions"]').click();
  assert.match(await popup.locator('.oakrest-quest-state').textContent(),/Completed/);
  assert.match(await popup.locator('.oakrest-quest-reward').textContent(),/25 coins · Claimed/);
  await page.screenshot({path:'qa/first-adventure/quest-journal.png'});
  await page.keyboard.press('Escape');
  assert.equal(await popup.isVisible(),false,'Escape closes quest detail dialog');
  assert.equal(await page.locator('.oakrest-quest-row').count(),8);
  await page.locator('.oakrest-quest-row[data-quest-id="road"]').click();
  await popup.getByRole('button',{name:'Back to quests'}).click();
  assert.equal(await popup.isVisible(),false,'Back closes popup and preserves list');
  await page.screenshot({path:'qa/first-adventure/quest-list.png'});
  await page.locator('#classic-inventory-toggle').click();
  assert.equal(await page.locator('#classic-item-window').isVisible(),true,'BAG replaces QUESTS without empty sidebar');
  await page.locator('#classic-skills-toggle').click();
  assert.equal(await page.locator('.classic-skill-card').count(),11,'all active gathering and making skills are available from LEVELS');
  await page.locator('.classic-skill-card').filter({hasText:'Fletching'}).click();
  assert.ok(await page.locator('.classic-skill-unlock').count()>=2,'tapping a skill opens real level unlocks');
  assert.match(await page.locator('.skill-progress-heading').textContent(),/Level 1/);
  await page.locator('#classic-skills-close').click();
  mkdirSync('qa/first-adventure',{recursive:true});
  await page.screenshot({path:'qa/first-adventure/village.png'});
  await page.evaluate(()=>{oakrestClassicQA.teleport(23,148);oakrestClassicQA.selectTarget('adventure:scout');});
  await page.screenshot({path:'qa/first-adventure/outpost.png'});
  await page.locator('#classic-dialogue-close').click();
  await page.evaluate(()=>oakrestClassicQA.teleport(0,311));
  await page.screenshot({path:'qa/first-adventure/hollow.png'});
  for(const size of [{width:1366,height:1024},{width:1180,height:820},{width:1180,height:600}]){
   await page.setViewportSize(size);await page.locator('#adventure-journal').click();
   const layout=await page.evaluate(()=>{
    const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};};
    return {quests:box(document.getElementById('classic-quests-window')),journal:box(document.getElementById('adventure-journal')),menu:box(document.querySelector('.classic-item-buttons')),dock:box(document.querySelector('.classic-combat-dock'))};
   });
   assert.ok(layout.quests.y>=0&&layout.quests.bottom<=size.height,JSON.stringify(layout));
   await page.locator('.oakrest-quest-row[data-quest-id="road"]').click();
   const popupBounds=await page.locator('#classic-quest-popup').boundingBox();
   assert.ok(popupBounds&&popupBounds.x>=0&&popupBounds.y>=0&&popupBounds.x+popupBounds.width<=size.width&&popupBounds.y+popupBounds.height<=size.height,JSON.stringify({size,popupBounds}));
   await page.locator('#classic-quest-popup').getByRole('button',{name:'Close quest details'}).click();
   assert.ok(layout.menu.bottom<=layout.dock.y,JSON.stringify(layout));
   await page.locator('#classic-inventory-toggle').click();
  }
  assert.deepEqual(errors,[]);console.log('PASS: new Classic creator, saving, three combat styles, real crafting, quest journal, reload, wilderness/dungeon rendering, three touch-sized viewports.');
 }finally{await browser?.close();server?.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
