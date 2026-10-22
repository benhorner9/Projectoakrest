/** iPad-size Chromium visual review of the actual city paving and meadows. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {resolve,join}=require('node:path');
const {mkdirSync,writeFileSync}=require('node:fs');
const root=resolve(__dirname,'..'),out=join(root,'qa','city-ground');
mkdirSync(out,{recursive:true});
const server=spawn('python3',['-m','http.server','5173','--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});
let browser;
const report={screen:'iPad landscape Chromium simulation, not actual Safari hardware',views:[],errors:[]};
(async()=>{try{
 await new Promise(done=>setTimeout(done,1200));
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1366,height:1024},hasTouch:true,deviceScaleFactor:1});
 const page=await context.newPage();page.setDefaultTimeout(30000);
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.addInitScript(()=>{
  if(!localStorage.getItem('oakrest-v1'))localStorage.setItem('oakrest-v1',JSON.stringify({
   xp:{melee:0,ranged:0,magic:0,vitality:0},lootVersion:1,
   gear:{melee:'sword',ranged:'bow',magic:'frost'},
   armour:{melee:'traveller',ranged:'traveller',magic:'traveller'},
   inventory:{weapons:{melee:['sword'],ranged:['bow'],magic:['frost']},armour:['traveller'],materials:{}}
  }));
 });
 await page.goto('http://127.0.0.1:5173/?qa=1',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>!!window.oakrestQA,null,{timeout:30000});
 await page.locator('#begin').click();
 const views=[
  {name:'southgate-path',x:0,z:1,lookX:0,lookZ:19},
  {name:'merchant-quarter-paving',x:0,z:19,lookX:-16,lookZ:19},
  {name:'heartwood-meadow',x:7,z:33,lookX:0,lookZ:39},
  {name:'green-quarter-grassland',x:40,z:55,lookX:34,lookZ:70}
 ];
 for(const view of views){
  await page.evaluate(({x,z,lookX,lookZ})=>{
   oakrestQA.teleport(x,z);
   oakrestQA.aim(lookX,1.1,lookZ);
   oakrestQA.step(.067);
  },view);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const data=await page.evaluate(()=>({
   hero:oakrestQA.state().hero,
   diagnostics:oakrestDiagnostics(),
   pageWidth:document.documentElement.scrollWidth
  }));
  assert.ok(data.diagnostics.drawCalls>0,view.name+' must render');
  assert.ok(data.pageWidth<1400,view.name+' overflowed the iPad viewport');
  report.views.push({name:view.name,x:view.x,z:view.z,drawCalls:data.diagnostics.drawCalls,hero:data.hero});
  await page.screenshot({path:join(out,view.name+'.png')});
 }
 assert.deepEqual(report.errors,[],'browser console errors during city paving and grass tour');
 writeFileSync(join(out,'city-ground-visual-report.json'),JSON.stringify(report,null,2));
 console.log('CITY_GROUND_QA '+JSON.stringify(report));
 await context.close();
} catch(e){console.error(e.stack||e);writeFileSync(join(out,'city-ground-visual-report.json'),JSON.stringify(report,null,2));process.exitCode=1;}
finally{await browser?.close();server.kill('SIGTERM');}
})();
