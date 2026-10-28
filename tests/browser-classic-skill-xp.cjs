// iPad-size browser regression: skill XP must rise over the player, while
// skill level-ups appear at the top of the world without touching combat XP.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {resolve}=require('node:path');
const server=spawn('python3',['-m','http.server','5197','--bind','127.0.0.1'],
 {cwd:resolve(__dirname,'..'),stdio:'ignore'});
let browser;
(async()=>{
 try{
  const {freshCharacterSave}=await import('../src/rules.js');
  const {teachWoodcutting}=await import('../src/town-services.js');
  const {WOODCUTTING_LEVEL_XP}=await import('../src/woodcutting.js');
  const save=freshCharacterSave();save.onboarding.area='world';
  teachWoodcutting(save);
  save.professions.woodcuttingXp=WOODCUTTING_LEVEL_XP[4]-35;
  await new Promise(resolve=>setTimeout(resolve,1000));
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1194,height:834},hasTouch:true,deviceScaleFactor:1});
  await context.addInitScript(raw=>localStorage.setItem('oakrest-v1',raw),JSON.stringify(save));
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5197/classic.html?qa=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.oakrestClassicQA,{timeout:30000});
  await page.evaluate(()=>{oakrestClassicQA.pauseAutomaticLoop();oakrestClassicQA.teleport(-20,101.4);});
  assert.equal(await page.evaluate(()=>oakrestClassicQA.adventureAction('gather','adventure:softwood').ok),true);
  await page.evaluate(()=>oakrestClassicQA.advance(1.3));
  const result=await page.evaluate(()=>{
   const qa=oakrestClassicQA;
   const float=document.querySelector('.classic-skill-xp-float');
   const banner=document.querySelector('.classic-skill-level-banner');
   const world=document.getElementById('classic-game');
   const b=world.getBoundingClientRect(),f=float?.getBoundingClientRect(),l=banner.getBoundingClientRect();
   return {feedback:qa.skillXpFloatState(),floatVisible:!!float&&!float.hidden,
    floatWithin:!!f&&f.x>b.x&&f.right<b.right&&f.y>b.y&&f.bottom<b.bottom,
    bannerVisible:!banner.hidden,bannerWithin:l.x>b.x&&l.right<b.right&&l.y>=b.y,
    clickThrough:getComputedStyle(float).pointerEvents==='none',
    currentXp:qa.persistentSnapshot().professions.woodcuttingXp};
  });
  assert.ok(result.feedback.labels.includes('+35 Woodcutting XP'),JSON.stringify(result));
  assert.equal(result.feedback.levelBanner,`Woodcutting 4/${WOODCUTTING_LEVEL_XP.length-1}`);
  assert.equal(result.floatVisible,true);
  assert.equal(result.floatWithin,true,'XP rises within the world canvas instead of over UI');
  assert.equal(result.bannerVisible,true);
  assert.equal(result.bannerWithin,true);
  assert.equal(result.clickThrough,true);
  assert.equal(result.currentXp,WOODCUTTING_LEVEL_XP[4]);
  await page.evaluate(()=>oakrestClassicQA.advance(3.5));
  const faded=await page.evaluate(()=>oakrestClassicQA.skillXpFloatState());
  assert.equal(faded.active,0,'floats expire without a permanent HUD');
  assert.equal(faded.levelBanner,null,'level banner automatically disappears');
  // This exhausted tree is still regrowing. Failed gathering must not create XP.
  assert.equal(await page.evaluate(()=>oakrestClassicQA.adventureAction('gather','adventure:softwood').ok),false);
  await page.evaluate(()=>oakrestClassicQA.advance(.2));
  assert.equal(await page.evaluate(()=>oakrestClassicQA.skillXpFloatState().active),0);
  assert.deepEqual(errors,[]);
  console.log('PASS: skill-only XP floats, top level-up banner, world bounds, no false feedback or permanent UI');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
