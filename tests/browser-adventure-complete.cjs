// Full browser-integrated quest/dungeon transaction regression, NOT a natural
// duration, balance, input-navigation or physical iPad playtest. A new character
// earns all resources and kills through the real mounted Classic simulation.
// QA teleport skips travel and QA advance accelerates time. The automatic loop
// is paused so all game time is driven by the same real runtime via advance.
// A seeded varying RNG keeps renderer UUIDs unique while reproducing scenarios;
// no kills, XP or quests are injected. This is not statistical balance evidence.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {resolve}=require('node:path');
const {mkdirSync,writeFileSync}=require('node:fs');
const server=spawn('python3',['-m','http.server','5244','--bind','127.0.0.1'],{cwd:resolve(__dirname,'..'),stdio:'ignore'});
let browser,page;
const evidence={scope:'New-character browser integration with deterministic RNG, accelerated time and QA teleport; no physical iPad or natural-duration claim',rooms:[]};
(async()=>{
 try{
  await new Promise(r=>setTimeout(r,800));
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1366,height:1024},hasTouch:true});
  await context.addInitScript(()=>{
   let seed=20261025;
   Math.random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
   // Pause at hook installation, before the first scheduled render can flood
   // a software GPU during a navigation. The game still owns RAF and steps.
   let qa;
   Object.defineProperty(window,'oakrestClassicQA',{configurable:true,
    get:()=>qa,set:value=>{qa=value;value?.pauseAutomaticLoop?.();}});
  });
  page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(60000);
  await page.goto('http://127.0.0.1:5244/classic.html?qa=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.oakrestClassicQA,null,{polling:100});
  await page.evaluate(()=>oakrestClassicQA.pauseAutomaticLoop());
  console.log('Complete adventure: creator loaded, automatic loop paused');
  await page.locator('#classic-creator-name').fill('Hollow Journey');
  await page.locator('#classic-creator-form button[type=submit]').click();
  await page.waitForFunction(()=>window.oakrestClassicQA&&document.getElementById('classic-creator').hidden,null,{polling:100});
  await page.evaluate(()=>oakrestClassicQA.pauseAutomaticLoop());
  console.log('Complete adventure: fresh character created');
  assert.equal(await page.evaluate(()=>oakrestClassicQA.saveStatus().enabled),true);
  const advance=seconds=>page.evaluate(seconds=>oakrestClassicQA.advance(seconds),seconds);
  const snapshot=()=>page.evaluate(()=>oakrestClassicQA.persistentSnapshot());
  const act=async(kind,id,choice,expect=true)=>{
   console.log('Complete adventure: action',kind,id||choice||'');
   const result=await page.evaluate(async({kind,id,choice})=>{
    const {findClassicInteractable}=await import('./src/classic-interactions.js');
    const t=id?findClassicInteractable(id):null;
    if(t)oakrestClassicQA.teleport(t.x,t.z-1.6);
    return oakrestClassicQA.adventureAction(kind,id,choice);
   },{kind,id,choice});
   assert.equal(result?.ok,expect,JSON.stringify({kind,id,choice,result}));return result;
  };
  const checkpoint=async label=>{
   console.log('Complete adventure: saving checkpoint:',label);
   assert.equal(await page.evaluate(()=>oakrestClassicQA.saveNow()),true);
   const before=await snapshot();
   console.log('Complete adventure: reloading checkpoint:',label);
   // Commit guarantees a new document. Wait for the game's explicit ready
   // hook rather than DOMContentLoaded, which can lag WebGL teardown in CI.
   await page.reload({waitUntil:'commit'});
   console.log('Complete adventure: new document committed:',label);
   await page.waitForFunction(()=>window.oakrestClassicQA,null,{polling:100});
   await page.evaluate(()=>oakrestClassicQA.pauseAutomaticLoop());
   const after=await snapshot();
   assert.deepEqual(after.adventure,before.adventure,label+' adventure reload');
   assert.deepEqual(after.xp,before.xp,label+' XP reload');
   assert.deepEqual(after.bank,before.bank,label+' bank reload');
   assert.equal(after.coins,before.coins,label+' wallet reload');
   assert.deepEqual(after.gear,before.gear,label+' three-style weapon loadout reload');
   assert.deepEqual(after.slots,before.slots,label+' four-ability loadouts reload');
   assert.deepEqual(after.armour,before.armour,label+' armour preset reload');
   assert.deepEqual(after.equipment,before.equipment,label+' nine-slot equipment reload');
   assert.deepEqual(after.professions,before.professions,label+' Woodcutting training reload');   assert.deepEqual(after.bank,before.bank,label+' bank reload');
   // Canonical validation omits exhausted stacks and rebuilds slot-order keys.
   for(const [id,count] of Object.entries(before.inventory.materials))
    assert.equal(after.inventory.materials[id]||0,count,label+' material '+id);
   assert.deepEqual(after.inventory.weapons,before.inventory.weapons,label+' ownership reload');
   await advance(0); // Render the new document after its loop was paused.
   console.log('Complete adventure: checkpoint passed:',label);
   return after;
  };
  const gather=async(id,seconds=8)=>{await act('gather',id);await advance(seconds);await act('cancel');};
  const ensureLog=async()=>{
   for(let attempt=0;attempt<8;attempt++){
    if((await snapshot()).inventory.materials['softwood-logs']>0)return;
    await advance(65);await gather('adventure:softwood');
   }
   assert.ok((await snapshot()).inventory.materials['softwood-logs']>0,'bounded real Woodcutting attempts earned timber');
  };
  const craftSeal=async()=>{
   for(const id of ['adventure:copper','adventure:tin'])await gather(id);
   await act('craft','adventure:forge','bar');await advance(4);
   await gather('adventure:reed');await gather('adventure:reed');
   await act('craft',null,'seal');
  };
  await act('accept','citizen:guard','welcome');
  for(const id of ['service:bank','service:store','service:forester']){
   assert.equal(await page.evaluate(async id=>{
    const {findClassicInteractable}=await import('./src/classic-interactions.js');
    const t=findClassicInteractable(id);oakrestClassicQA.teleport(t.x,t.z-1.5);
    return oakrestClassicQA.selectTarget(id);
   },id),true);
  }
  await act('finish','citizen:guard','welcome');
  await act('accept','adventure:rowan','training');
  for(const style of ['melee','magic','ranged']){
   await page.evaluate(style=>{oakrestClassicQA.teleport(-1,71);oakrestClassicQA.switchStyle(style);},style);
   await advance(2);
   assert.equal(await page.evaluate(()=>oakrestClassicQA.lockMonster('practice')),true);
   await advance(5);
  }
  await act('finish','adventure:rowan','training');
  await act('accept','adventure:smith','provisions');
  for(const id of ['adventure:copper','adventure:tin','adventure:softwood'])await gather(id);
  await ensureLog();
  await act('craft',null,'arrows');
  await act('finish','adventure:smith','provisions');
  await checkpoint('first three quests');
  await act('accept','citizen:guard','road');
  await act('inspect','adventure:cart');await act('inspect','adventure:tracks');
  await act('finish','citizen:guard','road');
  await act('accept','service:forester','roots');await act('inspect','adventure:stump');
  await craftSeal();await act('calm','adventure:stump');
  assert.equal(await page.evaluate(()=>oakrestClassicQA.combatState().monsters.find(m=>m.id==='guardian').dead),true);
  await act('finish','service:forester','roots');
  await act('accept','adventure:scout','outpost');
  await act('inspect','adventure:journal');await act('inspect','adventure:memorial');
  await act('answer','adventure:scout','treasure',false);
  await act('answer','adventure:scout','protect');await act('finish','adventure:scout','outpost');
  await act('accept','citizen:guard','seal');
  await act('prepare','citizen:guard',undefined,false);
  await craftSeal();await act('prepare','citizen:guard');
  await act('inspect','adventure:entrance');await act('finish','citizen:guard','seal');
  await act('accept','citizen:guard','hollow');
  // Earn a full expedition's ammunition and food using real gather/craft calls.
  for(let batch=0;batch<40;batch++){
   await ensureLog();
   await act('craft',null,'arrows');
   if((batch+1)%10===0)console.log('Complete adventure: earned',batch+1,'ammunition batches');
  }
  for(let batch=0;batch<40;batch++){
   await gather('adventure:reed');await gather('adventure:reed');
   await act('craft',null,'rations');
  }
  // One spare seal is legitimately gathered for the repeat-run boundary check.
  await craftSeal();
  await checkpoint('prepared expedition');
  await act('enter','adventure:entrance');
  await act('ward','adventure:ward-0',undefined,false);
  assert.equal(await page.evaluate(()=>{oakrestClassicQA.teleport(0,310);return oakrestClassicQA.lockMonster('hollow-keeper');}),false,'unopened room cannot be attacked');
  await page.evaluate(()=>oakrestClassicQA.switchStyle('ranged'));await advance(1);
  let lastEat=-Infinity;
  for(let room=0;room<4;room++){
   const center=[229,256,282,313][room];
   await page.evaluate(z=>oakrestClassicQA.teleport(7,z),center);
   let cleared=false,seconds=0;
   for(let attempt=0;attempt<550;attempt++){
    const state=await page.evaluate(()=>oakrestClassicQA.combatState());
    assert.ok(state.hp>0,'character survived room '+room);
    const living=state.monsters.filter(m=>m.room===room&&!m.dead);
    if(!living.length){cleared=true;break;}
    if(state.hp<75&&state.time-lastEat>=8){await act('eat');lastEat=state.time;}
    if(!state.targetId)assert.equal(await page.evaluate(id=>oakrestClassicQA.lockMonster(id),living[0].id),true,'acquire room '+room);
    await advance(4.1);seconds+=4.1;
   }
   assert.equal(cleared,true,'room '+room+' cleared using actual attack/projectile/damage events');
   evidence.rooms.push({room,simulatedSeconds:seconds});
   console.log('Complete adventure: room',room,'cleared in',seconds,'accelerated simulation seconds');
   if(room<3)await act('ward','adventure:ward-'+room);
   if(room===1){
    const saved=await checkpoint('two restored chambers');
    await act('enter','adventure:entrance');
    assert.equal(await page.evaluate(()=>oakrestClassicQA.combatState().monsters.filter(m=>m.room<=1).every(m=>m.dead)),true,'cleared chamber monsters stay dead after reload');
    assert.equal(await page.evaluate(()=>oakrestClassicQA.persistentSnapshot().inventory.materials['ward-seal']),saved.inventory.materials['ward-seal'],'resuming does not charge another seal');
    await page.evaluate(()=>oakrestClassicQA.switchStyle('ranged'));await advance(1);
    lastEat=-Infinity;
   }
  }
  await act('heart','adventure:heart');
  const reward=await snapshot();
  await act('heart','adventure:heart',undefined,false);
  assert.deepEqual((await snapshot()).inventory.materials,reward.inventory.materials,'heart cannot pay twice');
  await act('leave','adventure:exit-3');await act('finish','citizen:guard','hollow');
  const completed=await checkpoint('all eight quests and dungeon');
  assert.equal(completed.adventure.index,8);
  assert.equal(Object.values(completed.adventure.quests).filter(q=>q.status==='completed').length,8);
  assert.equal(completed.adventure.clears,1);assert.equal(completed.inventory.materials['warden-heart'],1);
  await page.locator('#adventure-journal').click();
  assert.equal(await page.locator('.classic-quest-entry').count(),8);
  mkdirSync('qa/adventure-complete',{recursive:true});
  await page.screenshot({path:'qa/adventure-complete/completed-journal.png'});
  await act('enter','adventure:entrance');
  const repeat=await snapshot();
  assert.deepEqual(repeat.adventure.run.kills,[]);assert.deepEqual(repeat.adventure.run.wards,[]);
  assert.equal(repeat.adventure.run.complete,false);assert.equal(repeat.adventure.clears,1);
  assert.equal(repeat.inventory.materials['warden-heart'],1);
  assert.equal(repeat.inventory.materials['ward-seal']||0,(completed.inventory.materials['ward-seal']||0)-1);
  await act('heart','adventure:heart',undefined,false);
  assert.equal((await snapshot()).inventory.materials['warden-heart'],1,'new uncleared expedition cannot claim a reward');
  assert.deepEqual(errors,[],'no browser runtime exceptions');
  evidence.questsCompleted=8;evidence.clears=1;evidence.repeatedRewardRejected=true;evidence.browserErrors=errors;
  writeFileSync('qa/adventure-complete/result.json',JSON.stringify(evidence,null,2));
  console.log('PASS: eight quests, earned supplies, four actual combat rooms, halfway save/reload, final reward and repeat-run protections. Accelerated Chromium integration only.');
 }catch(error){
  mkdirSync('qa/adventure-complete',{recursive:true});
  if(page){await page.screenshot({path:'qa/adventure-complete/failure.png'}).catch(()=>{});evidence.failureState=await page.evaluate(()=>({state:window.oakrestClassicQA?.state(),combat:window.oakrestClassicQA?.combatState(),adventure:window.oakrestClassicQA?.adventureState()})).catch(()=>null);}
  evidence.error=String(error.stack||error);writeFileSync('qa/adventure-complete/result.json',JSON.stringify(evidence,null,2));throw error;
 }finally{await browser?.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
