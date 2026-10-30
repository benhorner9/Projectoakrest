// Real DOM crafting/reward controls in isolated fixture saves. Accelerated QA
// travel/time; desktop and touch emulation, not natural play or iPad hardware.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {resolve}=require('node:path');
const {mkdirSync,writeFileSync}=require('node:fs');
const server=spawn('python3',['-m','http.server','5278','--bind','127.0.0.1'],{cwd:resolve(__dirname,'..'),stdio:'ignore'});
let browser;
(async()=>{try{
 await new Promise(r=>setTimeout(r,700));
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const {defaultSave}=await import('../src/rules.js');
 const {sanitizeAdventure}=await import('../src/adventure-content.js');
 const reports=[];mkdirSync('qa/progression',{recursive:true});
 for(const touch of [false,true]){
  const d=defaultSave();d.xp={melee:1100,magic:1100,ranged:1100,vitality:1100};
  d.inventory.weapons={melee:['sword'],magic:['frost'],ranged:['bow']};
  d.inventory.materials={'softwood-logs':20,reed:40,'boar-hide':10,'moss-fibre':12,'bronze-bar':12,'hollow-shard':10,'warden-heart':1,'bandit-token':5};
  d.bank.materials={'hollow-shard':3};
  d.adventure=sanitizeAdventure({index:8,skills:{cooking:1000,inscription:1000,fletching:1000,blacksmithing:1000},clears:1});
  const id='dddddddd-dddd-4ddd-8ddd-dddddddddddd',other='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  const context=await browser.newContext({viewport:touch?{width:1194,height:834}:{width:1440,height:1000},hasTouch:touch});
  await context.addInitScript(({d,id,other})=>{
   let seed=167;Math.random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
   if(!localStorage.getItem('oakrest-characters-v1')){
    localStorage.setItem('oakrest-characters-v1',JSON.stringify([{id,name:'Supply Tester'},{id:other,name:'Other Character'}]));
    localStorage.setItem('oakrest-active-character',id);localStorage.setItem('oakrest-character-save-'+id,JSON.stringify(d));
    localStorage.setItem('oakrest-character-save-'+other,JSON.stringify({sentinel:'unchanged'}));
   }
   let qa;Object.defineProperty(window,'oakrestClassicQA',{configurable:true,get:()=>qa,set:v=>{qa=v;v?.pauseAutomaticLoop?.();}});
  },{d,id,other});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
  const press=locator=>touch?locator.tap():locator.click();
  const snapshot=()=>page.evaluate(()=>oakrestClassicQA.persistentSnapshot());
  const advance=seconds=>page.evaluate(seconds=>oakrestClassicQA.advance(seconds),seconds);
  const interact=async id=>{
   await page.evaluate(async id=>{
    const {findClassicInteractable}=await import('./src/classic-interactions.js');const t=findClassicInteractable(id);
    oakrestClassicQA.teleport(t.x,t.z-1.5);oakrestClassicQA.selectTarget(id);oakrestClassicQA.advance(0);
   },id);
  };
  try{
   await page.goto('http://127.0.0.1:5278/classic.html?qa=1',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.oakrestClassicQA);await page.evaluate(()=>oakrestClassicQA.enableSaving());await advance(0);
   await press(page.locator('#classic-inventory-toggle'));
   assert.equal(await page.locator('.classic-bag-tools').count(),0,'no scroll-dependent crafting controls');
   assert.equal(await page.getByRole('button',{name:'MAKE FROM BAG'}).count(),0);
   const craftInventory=async(recipe,count,source)=>{
    await press(page.locator('#classic-inventory-toggle'));
    await press(page.locator('[data-scope=bag][data-canonical="material.'+source+'"]'));
    await press(page.getByRole('button',{name:'CRAFT…',exact:true}));
    await page.getByLabel('Choose crafting recipe').selectOption(recipe);
    await page.getByLabel('Craft quantity').fill(String(count));
    assert.ok((await page.locator('.oakrest-craft-timing').textContent()).includes(String(count*3)));
    await press(page.getByRole('button',{name:'START CRAFTING'}));
    await advance(count*3+.6);
    await press(page.getByRole('button',{name:'CLOSE',exact:true}));
   };
   await craftInventory('arrows',5,'softwood-logs');
   await craftInventory('frost',5,'softwood-logs');
   for(const [recipe,source] of [['leather','boar-hide'],['robes','moss-fibre'],['quiver','bronze-bar'],['focus','moss-fibre']])
    await craftInventory(recipe,1,source);
   let state=await snapshot();assert.equal(state.inventory.materials['field-arrows'],150);assert.equal(state.inventory.materials['frost-scroll'],300);
   assert.ok(state.inventory.armour.includes('leather'));assert.ok(state.inventory.slotted.includes('apprentice-orb'));
   await page.screenshot({path:'qa/progression/'+(touch?'touch':'desktop')+'-recipes.png'});
   await interact('adventure:forge');
   for(const title of ['Forge wayfarer amulet','Forge strengthened longsword']){
    await press(page.locator('.adventure-recipe').filter({has:page.locator('strong',{hasText:title})}).getByRole('button',{name:'Craft',exact:true}));
    await advance(4);await interact('adventure:forge');
   }
   state=await snapshot();assert.ok(state.inventory.weapons.melee.includes('forged_sword'));assert.ok(state.inventory.slotted.includes('wayfarer-amulet'));
   await interact('adventure:reed');
   await press(page.getByRole('button',{name:'Gather 5 · stop if you move or take damage',exact:true}));
   const reedBefore=(await snapshot()).inventory.materials.reed;await advance(29);
   assert.equal((await snapshot()).inventory.materials.reed,reedBefore+5);
   await interact('citizen:guard');
   await press(page.locator('[data-bounty="frost"]'));
   assert.equal((await snapshot()).inventory.materials['frost-scroll'],360);
   assert.equal(await page.locator('[data-bounty="frost"]').isDisabled(),true);
   await interact('adventure:entrance');
   assert.match(await page.locator('.adventure-farming').innerText(),/1 Warden heart/);
   assert.match(await page.locator('.adventure-farming').innerText(),/Forged Longsword · Owned/);
   assert.match(await page.locator('.adventure-farming').innerText(),/3 banked/);
   await page.screenshot({path:'qa/progression/'+(touch?'touch':'desktop')+'-hollow.png'});
   assert.equal(await page.evaluate(()=>oakrestClassicQA.saveNow()),true);const saved=await snapshot();
   await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.oakrestClassicQA);
   const loaded=await snapshot();
   for(const key of ['weapons','armour','slotted'])assert.deepEqual(loaded.inventory[key],saved.inventory[key]);
   for(const [id,n] of Object.entries(saved.inventory.materials))assert.equal(loaded.inventory.materials[id]||0,n);
   assert.deepEqual(loaded.bank,saved.bank);assert.deepEqual(loaded.adventure,saved.adventure);assert.deepEqual(loaded.xp,saved.xp);
   assert.equal(await page.evaluate(other=>localStorage.getItem('oakrest-character-save-'+other),other),JSON.stringify({sentinel:'unchanged'}));
   assert.deepEqual(errors,[]);reports.push({touch,batches:true,recipes:8,equipmentRecipes:6,gatheredReeds:5,bounty:'60 frost scrolls',persisted:true,otherCharacterUnchanged:true});
  }catch(e){await page.screenshot({path:'qa/progression/failure.png'}).catch(()=>{});console.error(await page.evaluate(()=>({state:window.oakrestClassicQA?.state(),body:document.getElementById('classic-dialogue')?.innerText})).catch(()=>null));throw e;}
  finally{await context.close();}
 }
 writeFileSync('qa/progression/result.json',JSON.stringify({scope:'Fixture saves with actual desktop/touch DOM actions, accelerated travel/time; no physical iPad verification',reports},null,2));
 console.log('PASS: desktop and touch batch crafting, equipment recipes, timed gathering, token exchange, Hollow goals and independent save persistence');
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
