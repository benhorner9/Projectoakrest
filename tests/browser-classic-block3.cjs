// Browser evidence uses actual Classic gameplay with touch viewport, not a static mockup.
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const {spawn}=require('node:child_process'),{mkdirSync}=require('node:fs');
const server=spawn('python3',['-m','http.server','5273','--bind','127.0.0.1'],{stdio:'ignore'});
let browser;
(async()=>{try{
 await new Promise(resolve=>setTimeout(resolve,800));
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1194,height:834},hasTouch:true,isMobile:true,deviceScaleFactor:1});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5273/classic.html?qa=1');
 await page.waitForFunction(()=>window.oakrestClassicQA);
 // Finish real first-launch creation so simulation time actually advances.
 await page.locator('#classic-creator-name').fill('Environment Tester');
 // Submitting the creator intentionally reloads Classic; wait for the new
 // page and its QA controller before testing the gameplay world.
 await Promise.all([
  page.waitForNavigation({waitUntil:'domcontentloaded'}),
  page.locator('#classic-creator-form button[type=submit]').click()
 ]);
 await page.waitForFunction(()=>window.oakrestClassicQA&&document.getElementById('classic-creator').hidden);
 await page.evaluate(()=>window.oakrestClassicQA.pauseAutomaticLoop());
 const before=await page.evaluate(()=>({saved:oakrestClassicQA.savedState(),life:oakrestClassicQA.worldLife(),atlas:oakrestClassicQA.atlasState().zones}));
 assert.ok(before.atlas.includes('OAK-VL-001'),'must retain Block 2 zones');
 const result=await page.evaluate(()=>{
  oakrestClassicQA.advance(5);
  return {life:oakrestClassicQA.worldLife(),stats:oakrestClassicQA.renderStats(),saved:oakrestClassicQA.savedState()};
 });
 assert.equal(result.saved,before.saved,'environment changes must not mutate character data');
 const walked=['town-porter','town-messenger','town-gardener','town-courier','town-baker','town-caretaker'];
 for(const id of walked){
  const a=before.life.find(n=>n.id===id),b=result.life.find(n=>n.id===id);
  assert.ok(a&&b,'real scene must contain '+id);
  assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>.2,'worker '+id+' should change world position');
 }
 await page.evaluate(()=>{oakrestClassicQA.teleport(-21,14);oakrestClassicQA.moveTo(-30,14);oakrestClassicQA.advance(12);});
 const indoors=await page.evaluate(()=>({state:oakrestClassicQA.state(),nav:oakrestClassicQA.navigationState(),saved:oakrestClassicQA.savedState()}));
 assert.equal(indoors.state.interior,'bank','character must enter via real bank doorway');
 assert.equal(indoors.nav.status,'arrived');
 assert.equal(indoors.state.roofHidden,true,'roof should lift when player goes indoors');
 assert.equal(indoors.saved,before.saved);
 assert.deepEqual(errors,[],'no JavaScript exceptions in the live scene');
 mkdirSync('qa/block3',{recursive:true});
 await page.screenshot({path:'qa/block3/bank-interior-town.png'});
 console.log('PASS: B3 real Classic bank entry, NPC workday movement, saved character integrity, read-only Atlas. Touch Chromium, not physical iPad Safari.');
}finally{await browser?.close();server.kill();}})().catch(err=>{console.error(err);process.exitCode=1;});
