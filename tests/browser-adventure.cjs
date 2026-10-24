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
  await act('craft','adventure:fletch','arrows');await step(4);await act('finish','adventure:smith');
  assert.equal(await page.evaluate(()=>oakrestClassicQA.saveNow()),true);
  const before=await page.evaluate(()=>oakrestClassicQA.persistentSnapshot());
  // The existing save sanitizer omits exhausted stacks (0 logs after fletching).
  before.inventory.materials=Object.fromEntries(Object.entries(before.inventory.materials).filter(([,amount])=>amount>0));
  mkdirSync('qa/first-adventure',{recursive:true});await page.screenshot({path:'qa/first-adventure/before-reload.png'});
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.oakrestClassicQA);
  assert.equal(await page.evaluate(()=>oakrestClassicQA.adventureState().index),3);
  assert.deepEqual(await page.evaluate(()=>oakrestClassicQA.persistentSnapshot().inventory),before.inventory);
  assert.equal(await page.evaluate(()=>oakrestClassicQA.saveStatus().enabled),true,'adventure save preference survives reload');
  await page.locator('#adventure-journal').click();assert.equal(await page.locator('#adventure-content details').count(),8);
  await page.locator('#classic-dialogue-close').click();
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
    return {dialog:box(document.getElementById('classic-dialogue')),journal:box(document.getElementById('adventure-journal')),menu:box(document.querySelector('.classic-item-buttons')),dock:box(document.querySelector('.classic-combat-dock'))};
   });
   assert.ok(layout.dialog.y>=0&&layout.dialog.bottom<=size.height,JSON.stringify(layout));
   assert.ok(layout.menu.bottom<=layout.dock.y,JSON.stringify(layout));
   await page.locator('#classic-dialogue-close').click();
  }
  assert.deepEqual(errors,[]);console.log('PASS: new Classic creator, saving, three combat styles, real crafting, quest journal, reload, wilderness/dungeon rendering, three touch-sized viewports.');
 }finally{await browser?.close();server?.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
