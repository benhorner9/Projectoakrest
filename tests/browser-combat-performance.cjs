// Same-run baseline/current comparison. Software GPU numbers are not iPad FPS.
const {chromium}=require('playwright'),{spawn,execFileSync}=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),qa=path.join(root,'qa'),baseline=path.join(qa,'combat-baseline');
fs.mkdirSync(baseline,{recursive:true});
const archive=path.join(qa,'combat-baseline.tar');
fs.writeFileSync(archive,execFileSync('git',['archive','fda62e0fa6b9f4c5c1d055d4e53ea6d2a00a9f48'],{cwd:root,maxBuffer:30000000}));
execFileSync('tar',['-xf',archive,'-C',baseline]);
const servers=[spawn('python3',['-m','http.server','5184','--bind','127.0.0.1'],{cwd:baseline,stdio:'ignore'}),spawn('python3',['-m','http.server','5185','--bind','127.0.0.1'],{cwd:root,stdio:'ignore'})];
let browser;const report={environment:'Linux headless Chromium with SwiftShader; not iPad hardware',samples:[]};
(async()=>{try{
 await new Promise(r=>setTimeout(r,800));browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const {defaultSave}=await import('../src/rules.js');
 for(const [label,port] of [['baseline',5184],['combat-reborn',5185]]){
  const context=await browser.newContext({viewport:{width:1366,height:1024},hasTouch:true});
  await context.addInitScript(d=>{localStorage.setItem('oakrest-v1',JSON.stringify(d));},defaultSave());
  const page=await context.newPage();await page.goto('http://127.0.0.1:'+port+'/?qa=1');await page.waitForFunction(()=>window.oakrestQA);await page.locator('#begin').click();
  const cpu=await page.evaluate(()=>{oakrestQA.teleport(-6,-.8);const timings=[];for(let i=0;i<5;i++){oakrestQA.basic();const start=performance.now();oakrestQA.step(2);timings.push(performance.now()-start);}return timings;});
  await page.waitForTimeout(6000);const samples=[];for(let i=0;i<5;i++){await page.waitForTimeout(2000);samples.push(await page.evaluate(()=>oakrestDiagnostics()));}
  const median=a=>a.slice().sort((a,b)=>a-b)[Math.floor(a.length/2)];
  report.samples.push({label,cpuMsPerSimulatedSecond:median(cpu)/2,medianFPS:median(samples.map(s=>s.fps)),medianP95ms:median(samples.map(s=>s.p95)),samples});
  await context.close();
 }
 console.log('PERFORMANCE COMPARISON',JSON.stringify(report));
}finally{fs.writeFileSync(path.join(qa,'combat-performance.json'),JSON.stringify(report,null,2));await browser?.close();servers.forEach(s=>s.kill());fs.rmSync(baseline,{recursive:true,force:true});fs.rmSync(archive,{force:true});}})().catch(e=>{console.error(e);process.exitCode=1});
