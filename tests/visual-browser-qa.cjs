/* Focused graphical browser smoke test. Does not make gameplay assertions on
 * old combat fixture timings; those belong to the separate gameplay suite.
 * Chromium + SwiftShader is not a substitute for a physical iPad Safari pass.
 */
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {mkdirSync,writeFileSync}=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
mkdirSync(path.join(root,'qa'),{recursive:true});
const server=spawn('python3',['-m','http.server','5173'],{cwd:root,stdio:'ignore'});
const report={browser:'Chromium headless SwiftShader',shots:[],profiles:[],errors:[]};
let browser;
(async()=>{
  try{
    browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const ctx=await browser.newContext({viewport:{width:1366,height:1024},hasTouch:true,deviceScaleFactor:1});
    const page=await ctx.newPage();
    page.on('pageerror',e=>report.errors.push('JavaScript: '+e.message));
    page.on('console',m=>{
      if(m.type()==='error'&&/(THREE\.WebGLProgram|shader.*error|WebGL.*(?:INVALID|ERROR))/i.test(m.text()))
        report.errors.push('WebGL: '+m.text().slice(0,500));
    });
    await page.addInitScript(()=>{
      if(!localStorage.getItem('oakrest-v1'))localStorage.setItem('oakrest-v1',JSON.stringify({
        xp:{melee:0,magic:0,ranged:0,vitality:0},lootVersion:1,
        gear:{melee:'sword',magic:'frost',ranged:'bow'},
        armour:{melee:'traveller',magic:'traveller',ranged:'traveller'},
        inventory:{weapons:{melee:['sword'],magic:['frost'],ranged:['bow']},armour:['traveller'],materials:{}}
      }));
    });
    await page.goto('http://127.0.0.1:5173/?qa=1');
    await page.waitForFunction(()=>!!window.oakrestQA,{timeout:20000});
    await page.locator('#begin').click();
    await page.waitForFunction(()=>window.oakrestDiagnostics?.().drawCalls>0,{timeout:20000});
    for(const [name,x,z] of [
      ['southgate',0,11],['heartwood-square',0,39],
      ['bank-exterior',-23,14],['bank-interior',-30,14],
      ['wilderness',0,-42]
    ]){
      await page.evaluate(([x,z])=>{oakrestQA.teleport(x,z);oakrestQA.step(.1);},[x,z]);
      await page.waitForTimeout(350);
      const diagnostics=await page.evaluate(()=>oakrestDiagnostics());
      assert.ok(diagnostics.drawCalls>0,name+' should render real 3D geometry');
      report.shots.push({name,...diagnostics});
      await page.screenshot({path:path.join(root,'qa','visual-'+name+'.png')});
    }
    await page.evaluate(()=>{oakrestQA.teleport(-30,14);oakrestQA.step(.1);});
    await page.waitForTimeout(300);
    const inside=await page.evaluate(()=>({town:oakrestQA.state().town.inside,graphics:oakrestDiagnostics().graphics}));
    assert.equal(inside.town,'bank','inside bank should still be a physical interior');
    assert.ok(inside.graphics.interiorLight,'interior light should follow enterable room');
    for(const [quality,resolution,maxLanterns] of [['low',512,0],['balanced',1024,1],['high',2048,2]]){
      await page.evaluate(v=>{
        const selector=document.getElementById('quality');
        selector.value=v;selector.dispatchEvent(new Event('change',{bubbles:true}));
      },quality);
      await page.waitForTimeout(450);
      const metrics=await page.evaluate(()=>oakrestDiagnostics());
      assert.equal(metrics.graphics.shadowResolution,resolution);
      assert.ok(metrics.graphics.practicalLights<=maxLanterns);
      assert.ok(metrics.drawCalls>0);
      report.profiles.push({quality,metrics});
      await page.screenshot({path:path.join(root,'qa','visual-preset-'+quality+'.png')});
    }
    await page.evaluate(()=>{oakrestQA.teleport(-22,9);oakrestQA.step(.1);});
    await page.waitForTimeout(300);
    const street=await page.evaluate(()=>oakrestDiagnostics().graphics);
    assert.ok(street.practicalLights>0,'high quality should light nearby lantern');
    assert.equal(street.interiorLight,false);
    assert.deepEqual(report.errors,[],'no shader compilation or runtime errors');
    report.passed=true;
    console.log('GRAPHICS_QA_DIAGNOSTICS '+JSON.stringify(report.shots.map(({name,fps,p95,drawCalls,triangles,textures,graphics})=>({name,fps,p95,drawCalls,triangles,textures,graphics}))));
    console.log('PASS: starter city/wilderness renders, enterable bank, 3 quality profiles, no shader errors');
  }catch(error){
    report.passed=false;report.errors.push(String(error.stack||error));
    console.error(error);process.exitCode=1;
  }finally{
    writeFileSync(path.join(root,'qa','visual-qa.json'),JSON.stringify(report,null,2));
    if(browser)await browser.close();
    server.kill('SIGTERM');
  }
})();
