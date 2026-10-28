// Desktop and Chromium touch emulation. QA advances time/travel; this is not
// physical iPad Safari, natural-duration balance, or an independent review.
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const {spawn}=require('node:child_process'),{mkdirSync,writeFileSync}=require('node:fs');
const server=spawn('python3',['-m','http.server','5287','--bind','127.0.0.1'],{stdio:'ignore'});
let browser;
(async()=>{try{
 await new Promise(r=>setTimeout(r,900));
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const {defaultSave}=await import('../src/rules.js'),evidence=[];
 mkdirSync('qa/combat-engagement',{recursive:true});
 for(const touch of [false,true]){
  const label=touch?'touch':'desktop',save=defaultSave();
  for(const style of ['melee','ranged','magic','vitality'])save.xp[style]=100000;
  save.inventory.materials={'field-arrows':1000,'frost-scroll':1000,'ember-scroll':1000};
  const context=await browser.newContext({viewport:touch?{width:1194,height:834}:{width:1366,height:1024},hasTouch:touch});
  await context.addInitScript(save=>{
   localStorage.setItem('oakrest-v1',JSON.stringify(save));
   let seed=147;Math.random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
   let qa;Object.defineProperty(window,'oakrestClassicQA',{configurable:true,get:()=>qa,set:v=>{qa=v;v?.pauseAutomaticLoop?.();}});
  },save);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5287/classic.html?qa=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.oakrestClassicQA);
  const press=async selector=>touch?page.locator(selector).tap():page.locator(selector).click();
  const state=()=>page.evaluate(()=>oakrestClassicQA.combatState());
  const view=()=>page.evaluate(()=>oakrestClassicQA.combatPresentation());
  const advance=seconds=>page.evaluate(s=>oakrestClassicQA.advance(s),seconds);
  async function prepare(style){
   await page.keyboard.press('Escape');await advance(2.4);
   await press('[data-style='+style+']');await advance(.6);
   return page.evaluate(style=>{
    const q=oakrestClassicQA;q.teleport(-1,style==='melee'?71.3:66);
    if(!q.lockMonster('practice'))throw Error('No practice target');
    for(let i=0;i<120&&!q.combatState().action;i++)q.advance(1/60);
    q.step(0);return q.combatState();
   },style);
  }
  for(const style of ['melee','ranged','magic']){
   let s=await prepare(style);assert.ok(s.action,style+' windup');
   assert.equal((await view()).heroPose,'prepare');
   await advance((s.action.until-s.time)*.55);
   assert.equal((await view()).heroPose,'windup');
   await page.screenshot({path:`qa/combat-engagement/${label}-${style}-windup.png`});
   s=await state();await advance(s.action.until-s.time+1/60);
   assert.equal((await view()).heroPose,'strike');
   if(style!=='melee')assert.ok((await view()).projectiles.visible>0,'released projectile is actually rendered');
   await page.screenshot({path:`qa/combat-engagement/${label}-${style}-release.png`});
   const released=(await state()).lastRelease.time;
   await page.keyboard.press('Escape');await advance(.55);
   assert.equal((await view()).heroPose,'idle');
   assert.equal((await view()).projectiles.visible,0);
   assert.equal((await state()).lastRelease.time,released,'retreat cannot issue another attack');
  }
  // Queue an ability during a real windup, then cancel it with actual input.
  let s=await prepare('melee');const deadline=s.attackUntil;
  await press('[data-ability="0"]');
  if(touch)await press('#classic-dodge');else await page.keyboard.press('7');
  await advance(.3);s=await state();
  assert.equal(s.targetId,'practice');assert.equal(s.action,null);
  assert.equal(s.attackUntil,deadline);assert.equal(s.abilities[0].cooldownEnd,0);
  // Explicit keyboard retreat cancels targeting; the tap policy is also
  // covered against actual world coordinates below in the touch viewport.
  await page.keyboard.press('Escape');assert.equal((await state()).targetId,null);
  if(touch){
   await prepare('melee');
   const box=await page.locator('#classic-game canvas').boundingBox();
   const point=await page.evaluate(()=>oakrestClassicQA.projectWorld(-8,66));
   await page.touchscreen.tap(box.x+(point.x+1)*box.width/2,box.y+(point.y+1)*box.height/2);
   assert.equal((await state()).targetId,null,'distant ground touch cancels attacks immediately');
   await advance(.4);assert.equal((await state()).targetId,null);
  }
  await page.evaluate(()=>{const q=oakrestClassicQA;q.teleport(10,89);q.switchStyle('melee');q.advance(2.4);q.lockMonster('moss-b');});
  const death=await page.evaluate(()=>{
   const q=oakrestClassicQA;
   for(let i=0;i<800&&!q.combatState().monsters.find(m=>m.id==='moss-b').dead;i++)q.advance(.05);
   return {enemy:q.combatState().monsters.find(m=>m.id==='moss-b'),actor:q.combatPresentation().actors.find(a=>a.id==='moss-b')};
  });
  assert.equal(death.enemy.dead,true);assert.equal(death.actor.visible,true);
  assert.ok(death.actor.opacity>0&&death.actor.opacity<=1,'defeated monster settles before disappearing');
  await page.screenshot({path:`qa/combat-engagement/${label}-death.png`});
  await advance(.75);assert.equal((await view()).actors.find(a=>a.id==='moss-b').visible,false);
  const soak=await page.evaluate(async()=>{
   const q=oakrestClassicQA,cycle=()=>{
    for(let i=0;i<30;i++){
     const style=['melee','ranged','magic'][i%3];q.teleport(-1,style==='melee'?71.3:66);
     q.switchStyle(style);q.lockMonster('practice');q.advance(3);
    }
   };
   cycle();const warm=q.renderStats();cycle();const after=q.renderStats();
   const {classicSpriteCacheStats}=await import('./src/classic-sprites.js');
   return {warm,after,cache:classicSpriteCacheStats(),pool:q.combatPresentation().projectiles};
  });
  assert.ok(soak.after.geometries<=soak.warm.geometries+2,JSON.stringify(soak));
  assert.ok(soak.cache.textures<=256,JSON.stringify(soak));
  assert.ok(soak.pool.allocated<=32);assert.ok(soak.after.calls<230);
  const frames=await page.evaluate(async()=>{
   oakrestClassicQA.pauseAutomaticLoop(false);const samples=[];let previous;
   await new Promise(resolve=>{function frame(t){if(previous!==undefined)samples.push(t-previous);previous=t;
    if(samples.length<60)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
   oakrestClassicQA.pauseAutomaticLoop();samples.sort((a,b)=>a-b);
   return {frames:samples.length,p50Ms:samples[30],p95Ms:samples[57],heapBytes:performance.memory?.usedJSHeapSize||null};
  });
  assert.deepEqual(errors,[]);evidence.push({viewport:label,scope:'Chromium software renderer; not physical iPad',soak,frames});
  await context.close();
 }
 writeFileSync('qa/combat-engagement/results.json',JSON.stringify(evidence,null,2));
 console.log('PASS: desktop/touch three-style attack phases, directional projectiles, cancellation, death, 180-second accelerated combat soak and bounded caches.',JSON.stringify(evidence));
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
