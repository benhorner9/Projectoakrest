// Rendered doorway/cutaway and batch regression; not physical iPad testing.
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const {spawn}=require('node:child_process'),{mkdirSync,writeFileSync}=require('node:fs');
const server=spawn('python3',['-m','http.server','5246','--bind','127.0.0.1'],{stdio:'ignore'});
let browser;
(async()=>{try{
 await new Promise(r=>setTimeout(r,900));
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1366,height:1024},hasTouch:true});
 const {defaultSave}=await import('../src/rules.js');await context.addInitScript(s=>localStorage.setItem('oakrest-v1',JSON.stringify(s)),defaultSave());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5246/classic.html?qa=1');await page.waitForFunction(()=>window.oakrestClassicQA);
 const {OAKREST_BUILDINGS}=await import('../src/town-layout.js');
 for(const b of OAKREST_BUILDINGS){
  await page.evaluate(b=>oakrestClassicQA.teleport(b.x,b.z),b);
  const s=await page.evaluate(()=>oakrestClassicQA.state());
  assert.equal(s.interior,b.id);assert.equal(s.roofHidden,true,b.id+' cutaway remains independent of static batching');
 }
 await page.evaluate(()=>oakrestClassicQA.teleport(0,39));
 assert.equal(await page.evaluate(()=>oakrestClassicQA.state().roofHidden),false);
 await page.evaluate(()=>oakrestClassicQA.advance(3));
 const stats=await page.evaluate(()=>oakrestClassicQA.renderStats());
 assert.ok(stats.batching.objectsReplaced>500);assert.ok(stats.calls<230,JSON.stringify(stats));
 mkdirSync('qa/rebirth',{recursive:true});await page.screenshot({path:'qa/rebirth/village.png'});
 await page.evaluate(()=>oakrestClassicQA.teleport(-30,14));await page.screenshot({path:'qa/rebirth/bank-interior.png'});
 await page.evaluate(()=>oakrestClassicQA.teleport(-8,108));await page.screenshot({path:'qa/rebirth/woodland.png'});
 writeFileSync('qa/rebirth/render-observations.json',JSON.stringify({environment:'Chromium software renderer, emulated viewport; not hardware FPS',stats,buildings:OAKREST_BUILDINGS.length},null,2));
 assert.deepEqual(errors,[]);console.log('PASS: all '+OAKREST_BUILDINGS.length+' building cutaways, restored exterior, static batches, woodland and interiors render without runtime errors.');
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
