// Actual desktop/touch buttons; accelerated simulation, not physical iPad QA.
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const {spawn}=require('node:child_process'),{mkdirSync,writeFileSync}=require('node:fs');
const server=spawn('python3',['-m','http.server','5288','--bind','127.0.0.1'],{stdio:'ignore'});
let browser;
(async()=>{try{
 await new Promise(r=>setTimeout(r,800));
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const {defaultSave}=await import('../src/rules.js');mkdirSync('qa/abilities',{recursive:true});const results=[];
 for(const touch of [false,true]){
  const save=defaultSave();for(const style of ['melee','magic','ranged','vitality'])save.xp[style]=100000;
  save.inventory.materials={'field-arrows':1000,'frost-scroll':1000,'ember-scroll':1000};
  for(const style of ['melee','magic','ranged'])for(const family of Object.keys(save.slots[style]))save.slots[style][family]=['w0','w1','w2','w3'];
  const ctx=await browser.newContext({viewport:touch?{width:1194,height:834}:{width:1366,height:1024},hasTouch:touch});
  await ctx.addInitScript(save=>{
   localStorage.setItem('oakrest-v1',JSON.stringify(save));
   let seed=149;Math.random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
   let qa;Object.defineProperty(window,'oakrestClassicQA',{configurable:true,get:()=>qa,set:v=>{qa=v;v?.pauseAutomaticLoop?.();}});
  },save);
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5288/classic.html?qa=1',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.oakrestClassicQA);
  const press=selector=>touch?page.locator(selector).tap():page.locator(selector).click();
  const advance=seconds=>page.evaluate(t=>oakrestClassicQA.advance(t),seconds);
  const state=()=>page.evaluate(()=>oakrestClassicQA.combatState());
  const presentation=()=>page.evaluate(()=>oakrestClassicQA.combatPresentation());
  const label=touch?'touch':'desktop';
  for(const [style,name,effect] of [['melee','Heavy Slash','heavy-slash'],['ranged','Piercing Arrow','piercing-arrow'],['magic','Ice Shard','ice-shard']]){
   await page.keyboard.press('Escape');await advance(7);
   await press('[data-style='+style+']');await advance(.2);
   await page.evaluate(style=>{const q=oakrestClassicQA;q.teleport(-1,style==='melee'?71.3:66);q.lockMonster('practice');q.advance(.2);},style);
   await press('[data-ability="0"]');
   const s=await page.evaluate(()=>{const q=oakrestClassicQA;for(let i=0;i<120&&q.combatState().action?.type!=='ability';i++)q.advance(1/60);return q.combatState();});
   assert.equal(s.action?.name,name);assert.equal(s.action.effect,effect);
   await advance((s.action.until-s.time)*.5);assert.equal((await presentation()).ability.phase,'prepare');
   await page.screenshot({path:`qa/abilities/${label}-${effect}-prepare.png`});
   const before=await state();await advance(before.action.until-before.time+1/60);
   const after=await state();assert.equal(after.lastRelease.name,name);assert.equal((await presentation()).ability.phase,'release');
   assert.ok(await page.locator('.classic-damage.ability').filter({hasText:name}).count());
   if(style!=='melee')assert.ok((await presentation()).projectiles.effects.includes(effect));
   await page.screenshot({path:`qa/abilities/${label}-${effect}-release.png`});
   results.push({viewport:label,name,cooldownEnd:after.abilities[0].cooldownEnd,presentation:await presentation()});
   await press('[data-style='+(style==='magic'?'ranged':'magic')+']');await advance(.02);
   assert.equal((await presentation()).ability.visible,false);
  }
  assert.deepEqual(errors,[]);await ctx.close();
 }
 writeFileSync('qa/abilities/results.json',JSON.stringify(results,null,2));
 console.log('PASS: three signature abilities via desktop/touch buttons, named windup/release, real projectiles, visible feedback and style cancellation.');
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
