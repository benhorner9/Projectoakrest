/* Review the actual actor factory and real building, never a screenshot substitute. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'qa','visual-foundation');
const server=spawn('python3',['-m','http.server','5198','--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});
let browser;
(async()=>{try{
 fs.mkdirSync(out,{recursive:true});await new Promise(r=>setTimeout(r,900));
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1366,height:1024},hasTouch:true,recordVideo:{dir:out,size:{width:1024,height:768}}});
 const page=await context.newPage(),errors=[],failures=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push(r.url()+': '+r.status());});
 await page.goto('http://127.0.0.1:5198/visual-reference.html');await page.waitForFunction(()=>window.oakrestVisualQA);
 await page.evaluate(()=>localStorage.setItem('oakrest-reference-sentinel','preserve'));const initial=await page.evaluate(()=>JSON.stringify({...localStorage}));
 const families=await page.locator('#family option').evaluateAll(nodes=>nodes.map(n=>n.value)),results=[];
 for(const family of families){
  await page.selectOption('#family',family);
  const states=await page.evaluate(family=>{
   const rows=[];for(const state of ['idle','ready','walk','run','backward','left','right','turn','basic','hit','death']){
    oakrestVisualQA.select(family,state);
    for(const t of [0,.09,.3,.5,.85,1.1]){const r=oakrestVisualQA.sample(t,false);rows.push({family,state,t,gripError:r.gripError,footError:r.footError,rigErrors:r.rigErrors});}
   }return rows;
  },family);
  for(const result of states){assert.deepEqual(result.rigErrors,[]);assert.ok(result.gripError<.001,`${family}/${result.state}/${result.t}`);assert.ok(result.footError===undefined||result.footError<.001,'foot reach');results.push(result);}
  await page.evaluate(family=>{oakrestVisualQA.select(family,'basic');oakrestVisualQA.sample(.2);},family);
  await page.screenshot({path:path.join(out,family+'.png')});console.log('Captured '+family);
 }
 const specs=await page.evaluate(()=>oakrestVisualQA.specs());
 const abilityResults=await page.evaluate(specs=>{
  const rows=[];for(const spec of specs){oakrestVisualQA.select(spec.weaponFamily,'basic',spec.id);for(const at of [0,spec.anticipation.seconds*.8,spec.anticipation.seconds,spec.recovery.seconds*.9]){const r=oakrestVisualQA.sample(at,false);rows.push({spec:spec.id,at,gripError:r.gripError});}}return rows;
 },specs);
 for(const result of abilityResults){assert.ok(result.gripError<.001,result.spec);assert.ok(result.footError===undefined||result.footError<.001,'foot reach');results.push(result);}
 for(const [family,state,view,at,name] of [['greatsword','basic','hands',.2,'hand-grip'],['bow','basic','hands',.3,'bow-draw-hand'],['greatsword','death','fallen',.3,'fall-transition'],['greatsword','death','fallen',.9,'fallen-ground']]){
  const sample=await page.evaluate(({family,state,view,at})=>{oakrestVisualQA.select(family,state);oakrestVisualQA.view(view);return oakrestVisualQA.sample(at);},{family,state,view,at});
  assert.ok(sample.gripError<.001);if(name==='fallen-ground')assert.equal(sample.reaction.fall,1);
  await page.screenshot({path:path.join(out,name+'.png')});
 }
 for(const view of ['ensemble','interior','side','rear']){
  await page.evaluate(view=>{oakrestVisualQA.select('greatsword','ready');oakrestVisualQA.view(view);oakrestVisualQA.sample(.3);},view);
  await page.screenshot({path:path.join(out,view+'.png')});
 }
 await page.evaluate(()=>{oakrestVisualQA.view('character');oakrestVisualQA.select('greatsword','basic');oakrestVisualQA.sample(.2);});
 await page.locator('#legacy').check();await page.screenshot({path:path.join(out,'before-greatsword.png')});
 await page.locator('#legacy').uncheck();await page.screenshot({path:path.join(out,'after-greatsword.png')});
 const before=await page.evaluate(()=>oakrestVisualQA.snapshot());
 await page.evaluate(()=>{for(let i=0;i<60;i++){oakrestVisualQA.select(i%2?'bow':'greatsword');oakrestVisualQA.sample(.2);}});
 const after=await page.evaluate(()=>oakrestVisualQA.snapshot());assert.ok(after.geometries<=before.geometries+5,'equipment swaps should not accumulate GPU geometry');
 await page.evaluate(()=>{oakrestVisualQA.view('ensemble');oakrestVisualQA.resume();});
 await page.waitForTimeout(10000);
 const metrics=await page.evaluate(()=>({runtime:oakrestVisualQA.snapshot(),userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],memory:performance.memory?{usedJSHeapSize:performance.memory.usedJSHeapSize,totalJSHeapSize:performance.memory.totalJSHeapSize}:null}));
 Object.assign(metrics,metrics.runtime.frameStatistics);metrics.softwareGPU=true;metrics.physicalIPad=false;
 assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),initial,'reference must not mutate gameplay saves');
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({browser:await browser.version(),cases:results,metrics,errors,assetFailures:failures},null,2));
 console.log(`PASS ${results.length} reference samples, ${specs.length} ability/basic specifications, nine profiles, scene screenshots, swap memory and save isolation`);
 console.log(JSON.stringify({measurementStatus:metrics.status,sampleCount:metrics.sampleCount,meanFPS:metrics.meanFPS,p95FrameMs:metrics.p95FrameMs,drawCalls:metrics.runtime.drawCalls,triangles:metrics.runtime.triangles}));
 await context.close();
}catch(e){console.error(e.stack);process.exitCode=1;}finally{await browser?.close();server.kill();}})();
