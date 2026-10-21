/**
 * Whole-town visual completion audit: every one of the 16 real buildings,
 * exterior facade + camera-cutaway interior, with representative oblique views.
 * Screenshots are evidence, never a replacement for structural raycast tests.
 */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {resolve,join}=require('node:path');
const {mkdirSync,writeFileSync}=require('node:fs');
const root=resolve(__dirname,'..'),out=join(root,'qa','building-completion');
mkdirSync(out,{recursive:true});
const server=spawn('python3',['-m','http.server','5173','--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});
let browser;
const errors=[],report={viewport:'iPad 13-inch landscape proxy (Chromium SwiftShader, not physical Safari)',buildings:[],errors};
(async()=>{
 try{
  await new Promise(ok=>setTimeout(ok,1000));
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1366,height:1024},hasTouch:true,deviceScaleFactor:1});
  const page=await context.newPage();page.setDefaultTimeout(30000);
  page.on('pageerror',e=>errors.push(e.message));
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
  const buildings=await page.evaluate(async()=>{const mod=await import('/src/town-layout.js');return mod.OAKREST_BUILDINGS});
  assert.equal(buildings.length,16,'all starter-town structures must be audited');
  const orient={north:Math.PI,south:0,east:Math.PI/2,west:-Math.PI/2};
  function point(b,x,z){const a=orient[b.face],co=Math.cos(a),si=Math.sin(a);
   return{x:b.x+x*co+z*si,z:b.z-x*si+z*co};
  }
  async function place(at,target){
   await page.evaluate(({at,target})=>{
    oakrestQA.teleport(at.x,at.z);
    oakrestQA.aim(target.x,target.y,target.z);
    oakrestQA.step(.050);
   },{at,target});
  }
  for(const b of buildings){
   const outside=point(b,0,b.d/2+4.5),centre=point(b,0,0);
   const note={id:b.id,kind:b.kind,face:b.face};
   // Real gameplay view from the street, not a camera inside wall geometry.
   await place(outside,{x:b.x,y:3.35,z:b.z});
   const facade=await page.evaluate(()=>oakrestQA.state());
   assert.equal(facade.town.inside,null,b.id+' exterior screenshot must be outside');
   assert.ok(facade.hp>0,b.id+' player unexpectedly dead during QA');
   await page.screenshot({path:join(out,b.id+'-front.jpg'),type:'jpeg',quality:75});
   // Oblique view checks the wall/roof joins that front-only screenshots miss.
   const oblique=point(b,b.w/2+3.8,b.d/2+3.8);
   await place(oblique,{x:b.x,y:3,z:b.z});
   await page.screenshot({path:join(out,b.id+'-corner.jpg'),type:'jpeg',quality:72});
   // The room shell must remain usable, and camera-aware removable geometry
   // should reveal the interior instead of cutting off the user's view.
   await place(centre,{x:b.x,y:2.0,z:b.z-b.d*.2});
   const interior=await page.evaluate(()=>oakrestQA.state());
   assert.equal(interior.town.inside,b.id,b.id+' has no usable interior');
   assert.ok(interior.town.interiorCameraBlend>=0,b.id+' cutaway camera state invalid');
   await page.screenshot({path:join(out,b.id+'-interior.jpg'),type:'jpeg',quality:72});
   report.buildings.push({...note,exterior:true,corner:true,interior:true});
   console.log('PASS shell browser audit '+b.id+' ('+b.kind+', '+b.face+')');
  }
  assert.equal(report.buildings.length,16);
  assert.deepEqual(errors,[],'no JavaScript errors during complete town walkthrough');
  console.log('PASS 16 Oakrest facades, corners, interiors; 48 visual captures.');
  await context.close();
 }catch(e){report.failure=e.stack||String(e);console.error(e.stack||String(e));process.exitCode=1;}
 finally{writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2));await browser?.close();server.kill();}
})();
