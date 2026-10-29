// Real Classic WebGL render on iPad-sized touch Chromium. Screenshots are
// evidence for independent visual review, NOT physical iPad Safari sign-off.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {resolve,join}=require('node:path');
const {mkdirSync,writeFileSync}=require('node:fs');
const root=resolve(__dirname,'..'),folder=join(root,'qa','visual-block1');
mkdirSync(folder,{recursive:true});
const server=spawn('python3',['-m','http.server','5297','--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});
let browser;const report={browser:'touch Chromium 1194x834, not physical iPad Safari',views:[],errors:[]};
(async()=>{try{
 await new Promise(r=>setTimeout(r,1100));
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const ctx=await browser.newContext({viewport:{width:1194,height:834},hasTouch:true,deviceScaleFactor:1});
 const page=await ctx.newPage();
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto('http://127.0.0.1:5297/classic.html?qa=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.oakrestClassicQA,null,{timeout:30000});
 await page.locator('#classic-creator-name').fill('Visual Explorer');
 await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),
  page.locator('#classic-creator-form button[type=submit]').click()]);
 await page.waitForFunction(()=>window.oakrestClassicQA&&document.getElementById('classic-creator').hidden);
 await page.evaluate(()=>oakrestClassicQA.pauseAutomaticLoop());
 const baseline=await page.evaluate(()=>oakrestClassicQA.savedState());
 const views=[{name:'town-square',x:0,z:39},{name:'bank-front',x:-21,z:14},
  {name:'north-woodland-gate',x:0,z:79},{name:'woodland-trail',x:16,z:118}];
 for(const view of views){
  await page.evaluate(v=>{oakrestClassicQA.teleport(v.x,v.z);oakrestClassicQA.step(.08);},view);
  const stats=await page.evaluate(()=>oakrestClassicQA.renderStats());
  assert.ok(stats.calls>0&&stats.calls<900,'iPad-sized scene exceeded bounded draw-call budget: '+JSON.stringify(stats));
  assert.ok(stats.triangles>0&&stats.triangles<1000000,'unbounded triangle count');
  assert.ok(stats.geometries<600,'too many unique geometries');
  assert.ok(stats.pixelRatio<=1.5,'iPad render resolution should stay capped');
  assert.equal(await page.evaluate(()=>oakrestClassicQA.savedState()),baseline,'visual tour cannot mutate saves');
  const path=join(folder,view.name+'.png');await page.screenshot({path});
  report.views.push({...view,stats});
 }
 // Existing building must still have a real doorway and roof cutaway.
 await page.evaluate(()=>{oakrestClassicQA.teleport(-21,14);oakrestClassicQA.moveTo(-30,14);oakrestClassicQA.advance(12);});
 const bank=await page.evaluate(()=>oakrestClassicQA.state());
 assert.equal(bank.interior,'bank','architectural trim must not block entry');
 assert.equal(bank.roofHidden,true,'new shingles, gables and crests must lift with roof');
 assert.deepEqual(report.errors,[]);
 writeFileSync(join(folder,'qa-report.json'),JSON.stringify(report,null,2));
 console.log('PASS visual Block 1: village, bank, gate, woodland, iPad-size draw budget and bank roof cutaway.');
}finally{await browser?.close();server.kill();}})().catch(err=>{console.error(err.stack||err);process.exitCode=1;});
