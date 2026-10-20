// Real rendered integration scenarios with controlled fixtures/repositioning.
// This is not a substitute for a continuous manual iPad playthrough.
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),engine=process.env.OAKREST_BROWSER||'chromium';
const output=path.join(root,'qa');fs.mkdirSync(output,{recursive:true});
const report={engine,environment:'Linux headless software rendering; iPad viewport emulation',scenarios:[],errors:[],performance:[]};
let browser,server;
(async()=>{try{
 server=spawn('python3',['-m','http.server','5183','--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});await new Promise(r=>setTimeout(r,800));
 browser=await ({chromium,webkit}[engine]).launch({headless:true,...(engine==='chromium'?{args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{})});
 const {defaultSave,LOADOUTS,ARMOUR}=await import('../src/rules.js');
 async function scenario(name,fn,beginner=false){
  const context=await browser.newContext({viewport:{width:1366,height:1024},hasTouch:true,deviceScaleFactor:1,recordVideo:{dir:path.join(output,'combat-video'),size:{width:854,height:640}}});
  const d=defaultSave();if(!beginner){for(const key in d.xp)d.xp[key]=10000;for(const st in LOADOUTS)d.inventory.weapons[st]=Object.keys(LOADOUTS[st]);d.inventory.armour=Object.keys(ARMOUR);}
  await context.addInitScript(d=>{if(!localStorage.getItem('oakrest-v1'))localStorage.setItem('oakrest-v1',JSON.stringify(d));},d);
  const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>report.errors.push(name+': '+e.message));
  try{await page.goto('http://127.0.0.1:5183/?qa=1');await page.waitForFunction(()=>window.oakrestQA);await page.locator('#begin').click();await page.evaluate(()=>oakrestQA.step(1));
   const detail=await fn(page);await page.screenshot({path:path.join(output,engine+'-combat-'+name[0]+'.png')});
   report.scenarios.push({name,status:'pass',detail});console.log('PASS',name,JSON.stringify(detail));
  }catch(e){report.scenarios.push({name,status:'fail',error:e.stack});console.error('FAIL',name,e.stack);process.exitCode=1;}
  finally{await context.close();}
 }
 await scenario('A beginner melee',async page=>page.evaluate(()=>{
  const target=()=>oakrestQA.state().enemies.find(e=>e.type==='mossling');
  const initial=oakrestQA.state();for(let i=0;i<6&&!target().dead;i++){const e=target();oakrestQA.teleport(e.x,e.z+2);oakrestQA.step(1);oakrestQA.basic();oakrestQA.step(.5);}
  const after=oakrestQA.state();if(!target().dead||after.data.xp.melee<=initial.data.xp.melee)throw Error('Mossling kill and melee XP missing');
  oakrestQA.dodge();const at=oakrestQA.state().hero;oakrestQA.step(.15);if(oakrestQA.state().hero.z>=at.z)throw Error('Dodge did not move');
  return {xp:after.data.xp,health:after.hp,loot:after.data.groundLoot.length};
 }),true);
 await scenario('B ranged contact and deliberate miss',async page=>{
  const result=await page.evaluate(()=>{
   oakrestQA.style('ranged');oakrestQA.step(1);
   const e=oakrestQA.state().enemies[0];oakrestQA.teleport(e.x,e.z+10);oakrestQA.aim(e.x,1.25,e.z);oakrestQA.step(1);
   const before=oakrestQA.state().enemies[0].hp;oakrestQA.basic();oakrestQA.step(.5);const inFlight=oakrestQA.state().projectiles;oakrestQA.step(.8);const hit=oakrestQA.state().enemies[0].hp;
   oakrestQA.step(1);oakrestQA.teleport(e.x,e.z+10,Math.PI/2);oakrestQA.step(1);oakrestQA.basic();oakrestQA.step(2);
   return {before,hit,miss:oakrestQA.state().enemies[0].hp,inFlight};
  });assert.ok(result.inFlight>0);assert.ok(result.hit<result.before,JSON.stringify(result));assert.equal(result.miss,result.hit);return result;
 });
 await scenario('C magic catalogue and status simulation',async page=>{
  const result=await page.evaluate(async()=>{
   const {LOADOUTS,skillCatalogue}=await import('/src/rules.js');const checks=[];
   for(const style of ['melee','ranged','magic'])for(const [id,w] of Object.entries(LOADOUTS[style])){
    oakrestQA.step(22);oakrestQA.style(style);oakrestQA.step(1);oakrestQA.equip('weapon',id);
    for(const ability of skillCatalogue(style,id)){
     oakrestQA.teleport(-6,-.8);oakrestQA.aim(-6,1.25,-3);oakrestQA.step(22);const slot=checks.length%4;oakrestQA.slot(slot,ability.id);
     const before=oakrestQA.state();oakrestQA.ability(slot);const queued=oakrestQA.state().pendingAbility;oakrestQA.step(1);
     const after=oakrestQA.state(),hurt=after.enemies[0].hp!==before.enemies[0].hp;
     const damaging=['hit','execute','sweep','nova','bolt','burst','retreat'].includes(ability.kind);
     if(!queued||damaging&&!hurt)throw Error(style+'/'+id+'/'+ability.name+' failed '+JSON.stringify({before:before.enemies[0],after:after.enemies[0]}));
     if(ability.root&&after.enemies[0].rootUntil<=after.time)throw Error('root missing');
     const clocks=JSON.stringify(after.cooldowns);oakrestQA.ability(slot);if(JSON.stringify(oakrestQA.state().cooldowns)!==clocks)throw Error('cooldown bypass');
     checks.push(style+'/'+id+'/'+ability.name);
    }
    }
   oakrestQA.step(22);oakrestQA.style('magic');oakrestQA.step(1);oakrestQA.equip('weapon','frost');oakrestQA.slot(0,'w2');
   const e=oakrestQA.state().enemies.find(e=>e.type==='mossling'),{terrainHeight}=await import('/src/terrain.js');
   oakrestQA.teleport(e.x,e.z+3);oakrestQA.aim(e.x,terrainHeight(e.x,e.z)+.75,e.z);oakrestQA.step(.4);oakrestQA.ability(0);oakrestQA.step(.7);
   const rooted=oakrestQA.state().enemies.find(e=>e.type==='mossling');if(rooted.rootUntil<=oakrestQA.state().time)throw Error('Live mossling was not rooted');
   oakrestQA.step(.5);const held=oakrestQA.state().enemies.find(e=>e.type==='mossling');if(Math.hypot(held.x-rooted.x,held.z-rooted.z)>.01)throw Error('Root did not stop enemy simulation');
   return {abilities:checks.length,liveEnemyRoot:true};
  });return result;
 });
 await scenario('D tribrid recovery',async page=>page.evaluate(()=>{
  oakrestQA.teleport(-6,-.8);oakrestQA.basic();const recovery=oakrestQA.state().attackUntil;oakrestQA.style('magic');oakrestQA.step(.5);
  let s=oakrestQA.state();if(s.style!=='magic'||s.attackUntil!==recovery)throw Error('Style switch lost recovery');
  oakrestQA.step(1);oakrestQA.aim(-6,1.25,-3);oakrestQA.step(.5);oakrestQA.basic();oakrestQA.style('ranged');oakrestQA.step(.7);
  s=oakrestQA.state();if(s.style!=='ranged')throw Error('Second switch blocked');return {style:s.style,cooldowns:s.cooldowns,targetHP:s.enemies[0].hp};
 }));
 await scenario('E multiple enemy identities and leash cancellation',async page=>page.evaluate(()=>{
  oakrestQA.spawn('boar',0,-58);oakrestQA.spawn('bandit',0,-60);oakrestQA.teleport(0,-55);oakrestQA.step(1);
  const encounter=oakrestQA.state().enemies.filter(e=>e.aggro);if(encounter.length<2)throw Error('Multiple enemies did not engage');
  oakrestQA.teleport(0,11);oakrestQA.step(12);
  const s=oakrestQA.state();if(s.enemies.some(e=>e.warning||e.aggro))throw Error('Leash retained attacks');if(s.enemies.some(e=>e.type!=='dummy'&&(e.retreating||Math.hypot(e.x-e.startX,e.z-e.startZ)>.15)))throw Error('Enemy failed to complete return home');
  return {engaged:encounter.map(e=>({type:e.type,state:e.aiState})),returned:s.enemies.filter(e=>e.type!=='dummy').map(e=>({type:e.type,distance:Math.hypot(e.x-e.startX,e.z-e.startZ)}))};
 }));
 await scenario('F cover and continuous dodge',async page=>{
  const result=await page.evaluate(async()=>{
   const {addWorldObstacle,blocked}=await import('/src/terrain.js');
   addWorldObstacle({x:-6,z:-1.9,hx:2,hz:.1,height:4});
   oakrestQA.teleport(-6,-.6);oakrestQA.step(1);const before=oakrestQA.state().enemies[0].hp;
   oakrestQA.basic();oakrestQA.step(1);const after=oakrestQA.state().enemies[0].hp;
   oakrestQA.dodge();oakrestQA.step(.4);const s=oakrestQA.state();
   return {before,after,hero:s.hero,blocked:blocked(s.hero.x,s.hero.z,.42)};
  });assert.equal(result.before,result.after);assert.equal(result.blocked,false);assert.ok(result.hero.z>-1.4);return result;
 });
 await scenario('H simultaneous touch and layout',async page=>{
  if(engine!=='chromium')return {unavailable:'CDP touch dispatch is Chromium-only'};
  const context=page.context(),cdp=await context.newCDPSession(page);
  const ids=['joystick','touch-attack','touch-dodge','touch-swap'];
  const boxes={};for(const id of ids)boxes[id]=await page.locator('#'+id).boundingBox();
  const joy=boxes.joystick,attack=boxes['touch-attack'],swap=boxes['touch-swap'];
  const first={x:joy.x+joy.width/2,y:joy.y+joy.height*.2,id:1},second={x:attack.x+attack.width/2,y:attack.y+attack.height/2,id:2};
  const before=await page.evaluate(()=>oakrestQA.state());
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[first,second]});
  await page.evaluate(()=>oakrestQA.step(.2));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[first,{...second,x:second.x-30}]});
  await page.evaluate(()=>oakrestQA.step(.2));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[first,{...second,x:second.x-30},{x:swap.x+swap.width/2,y:swap.y+swap.height/2,id:3}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.evaluate(()=>oakrestQA.step(1));
  const after=await page.evaluate(()=>oakrestQA.state());assert.ok(after.hero.z<before.hero.z);assert.notEqual(after.yaw,before.yaw);assert.equal(after.style,'magic');
  await page.locator('#loadout-button').click();await page.locator('#close-progression').click();await page.keyboard.down('w');await page.evaluate(()=>oakrestQA.step(.3));await page.keyboard.up('w');
  const layouts=[];for(const [width,height] of [[1366,1024],[1024,1366],[844,390],[390,844]]){
   await page.setViewportSize({width,height});
   const targets=await page.evaluate(()=>['joystick','touch-attack','touch-swap','touch-dodge',...Array.from({length:4},(_,i)=>'skill-'+i)].map(id=>{
    const el=id.startsWith('skill-')?document.querySelectorAll('#skills .skill')[Number(id.slice(6))]:document.getElementById(id),r=el.getBoundingClientRect();
    return {id,x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};
   }));
   assert.ok(targets.every(r=>r.x>=0&&r.y>=0&&r.right<=width&&r.bottom<=height),JSON.stringify({width,height,targets}));
   for(let i=0;i<targets.length;i++)for(let j=0;j<i;j++){const a=targets[i],b=targets[j];assert.ok(a.right<=b.x||b.right<=a.x||a.bottom<=b.y||b.bottom<=a.y,'touch targets overlap: '+a.id+'/'+b.id+' at '+width+'x'+height);}
   layouts.push({width,height,targets});
  }
  return {multitouch:true,menusReleaseInput:true,layouts};
 });
 await scenario('G repeated combat, death, reload and render stability',async page=>{
  const result=await page.evaluate(()=>{
   oakrestQA.teleport(-6,-.8);for(let i=0;i<80;i++){oakrestQA.basic();oakrestQA.step(1.1);if(i%8===0)oakrestQA.dodge();}
   const xp=oakrestQA.state().data.xp;oakrestQA.step(3);oakrestQA.receiveDamage(100000);oakrestQA.step(3);
   const s=oakrestQA.state();if(s.hp<=0||Math.abs(s.hero.z-11)>.1)throw Error('Death/respawn failed');oakrestQA.save();return {xp,data:s.data,hp:s.hp};
  });
  await page.reload();await page.waitForFunction(()=>window.oakrestQA);assert.deepEqual(await page.evaluate(()=>oakrestQA.state().data),result.data);await page.locator('#begin').click();
  await page.waitForTimeout(2500);const initial=await page.evaluate(()=>oakrestDiagnostics());
  const deadline=Date.now()+30000;while(Date.now()<deadline){await page.evaluate(()=>oakrestQA.basic());await page.waitForTimeout(1000);report.performance.push(await page.evaluate(()=>oakrestDiagnostics()));}
  await page.evaluate(()=>oakrestQA.step(3));const final=await page.evaluate(()=>oakrestDiagnostics());
  assert.ok(final.effects<200);assert.ok(final.geometries<initial.geometries+50,JSON.stringify({initial,final}));
  return {hp:result.hp,simulatedSeconds:91,renderedSeconds:30,initial,final};
 });
 if(report.errors.length){console.error(report.errors);process.exitCode=1;}
}finally{fs.writeFileSync(path.join(output,engine+'-combat-reborn.json'),JSON.stringify(report,null,2));await browser?.close();server?.kill();}})().catch(e=>{console.error(e);process.exitCode=1});
