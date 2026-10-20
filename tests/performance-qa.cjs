// Compare an archived baseline (with the same vendored Three.js engine) and this checkout.
// Usage: node tests/performance-qa.cjs /absolute/path/to/baseline
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const baseline=process.argv[2];
const finalRun=process.argv.includes('--final');
if(!baseline)throw new Error('Pass the archived baseline directory');
const report={environment:'Linux Chromium / SwiftShader software rendering, 1366 × 1024, DPR 1, touch emulation; NOT iPad hardware',scenarios:[]};
(async()=>{
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const scenarios=finalRun?[['greenwood-balanced',root,'balanced',20000],['greenwood-low',root,'low',20000]]:[['baseline',baseline,null,20000],['greenwood-balanced',root,'balanced',20000],['greenwood-low',root,'low',120000]];
  for(const [name,folder,quality,duration] of scenarios){
   const server=spawn('python3',['-u','-m','http.server','5231'],{cwd:folder});
   let context;
   try{
    await new Promise(resolve=>server.stdout.once('data',resolve));
    context=await browser.newContext({viewport:{width:1366,height:1024},deviceScaleFactor:1,hasTouch:true});
    await context.addInitScript(d=>{if(!localStorage.getItem('oakrest-v1'))localStorage.setItem('oakrest-v1',JSON.stringify(d));},(await import('../src/rules.js')).defaultSave());
    if(quality)await context.addInitScript(q=>localStorage.setItem('oakrest-quality',q),quality);
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:5231');await page.locator('#begin').click();await page.waitForTimeout(4000);
    await page.evaluate(()=>{window.measure={last:performance.now(),frames:[]};function frame(t){measure.frames.push(t-measure.last);measure.last=t;measure.id=requestAnimationFrame(frame);}measure.id=requestAnimationFrame(frame);});
    const samples=[];const begin=Date.now();
    while(Date.now()-begin<duration){await page.waitForTimeout(2000);samples.push(await page.evaluate(()=>window.oakrestBaselineStats?.()||window.oakrestDiagnostics()));}
    const timing=await page.evaluate(()=>{cancelAnimationFrame(measure.id);const a=measure.frames.slice(1).sort((a,b)=>a-b);return {frameCount:a.length,fps:1000/(a.reduce((a,b)=>a+b,0)/a.length),medianFrameMs:a[Math.floor(a.length*.5)],p95FrameMs:a[Math.floor(a.length*.95)]};});
    const result={name,durationMs:Date.now()-begin,...timing,errors,samples};report.scenarios.push(result);console.log(name,JSON.stringify({...timing,first:samples[0],last:samples.at(-1)}));
   }finally{await context?.close();server.kill();await new Promise(resolve=>server.once('exit',resolve));}
  }
 }finally{await browser?.close();fs.writeFileSync(path.join(root,finalRun?'qa/performance-final.json':'qa/performance-report.json'),JSON.stringify(report,null,2));}
})().catch(e=>{console.error(e);process.exitCode=1;});
