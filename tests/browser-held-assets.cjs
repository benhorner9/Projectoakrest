const {chromium}=require('playwright'),{spawn}=require('node:child_process');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'qa','visual-foundation','imported');
const server=spawn('python3',['-m','http.server','5200','--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});let browser;
(async()=>{try{
 fs.mkdirSync(out,{recursive:true});await new Promise(r=>setTimeout(r,700));
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const p=await browser.newPage({viewport:{width:1366,height:1024},hasTouch:true}),errors=[],responses=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)responses.push(r.url());});
 await p.goto('http://127.0.0.1:5200/visual-reference.html');await p.waitForFunction(()=>window.oakrestVisualQA);
 await p.locator('#imported').check();
 for(const family of ['sword','greatsword','daggers','crossbow','frost','ember','woodaxe']){
  await p.evaluate(family=>{oakrestVisualQA.select(family,'ready');oakrestVisualQA.sample(.2);},family);
  await p.waitForFunction(()=>{const s=oakrestVisualQA.snapshot();return s.expectedAsset&&s.assetLoaded===s.expectedAsset;});
  const r=await p.evaluate(()=>oakrestVisualQA.sample(.2));assert.ok(r.gripError<.001);
  await p.screenshot({path:path.join(out,family+'.png')});console.log('Verified retained mesh '+family+' / '+r.assetLoaded);
 }
 // Race an outstanding request against a rapid equip change; stale mesh cannot win.
 await p.evaluate(()=>{oakrestVisualQA.select('frost');oakrestVisualQA.select('crossbow');oakrestVisualQA.select('sword');});
 await p.waitForFunction(()=>oakrestVisualQA.snapshot().assetLoaded==='sword_1handed');
 await p.locator('#imported').uncheck();
 assert.equal(await p.evaluate(()=>oakrestVisualQA.snapshot().assetLoaded),null);
 assert.deepEqual(errors,[]);assert.deepEqual(responses,[]);
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({families:7,errors,assetErrors:responses,staleRequestCheck:'passed',scope:'reference-only imported transforms; live migration, reload/focus VFX and human motion review still pending'},null,2));
 console.log('PASS seven retained source meshes, correct profile selection, stale-request protection and fallback');
}catch(e){console.error(e.stack);process.exitCode=1;}finally{await browser?.close();server.kill();}})();
