// Simulates a standards-mapped controller in Chromium at the actual shared-host dev path.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {resolve,join}=require('node:path');
const {symlinkSync,unlinkSync,existsSync}=require('node:fs');
const root=resolve(__dirname,'..'),path=join(root,'oakrest-dev');
if(existsSync(path))throw Error('Existing oakrest-dev path: refusing to modify');
symlinkSync('.',path,'dir');
const server=spawn('python3',['-m','http.server','5175','--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});
let browser;
(async()=>{
 try{
  await new Promise(r=>setTimeout(r,1100));
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await browser.newContext({viewport:{width:1194,height:834},hasTouch:true,deviceScaleFactor:1});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   localStorage.setItem('oakrest-dev-v1',JSON.stringify({
    xp:{melee:0,magic:0,ranged:0,vitality:0},lootVersion:1,
    gear:{melee:'sword',magic:'frost',ranged:'bow'},
    armour:{melee:'traveller',magic:'traveller',ranged:'traveller'},
    inventory:{weapons:{melee:['sword'],magic:['frost'],ranged:['bow']},armour:['traveller'],materials:{}}
   }));
   window.virtualPad={connected:true,mapping:'standard',index:0,id:'Virtual Xbox Controller',
    axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
   window.padAttached=false;
   Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>window.padAttached?[window.virtualPad]:[]});
  });
  await page.goto('http://127.0.0.1:5175/oakrest-dev/?qa=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.oakrestQA,{timeout:20000});
  await page.locator('#begin').click();
  const before=await page.evaluate(()=>oakrestQA.state());
  await page.evaluate(()=>{window.padAttached=true;window.virtualPad.axes=[.65,-1,.8,-.5];oakrestQA.step(.35);});
  const moved=await page.evaluate(()=>oakrestQA.state());
  assert.equal(moved.gamepadConnected,true);
  assert.ok(Math.hypot(moved.hero.x-before.hero.x,moved.hero.z-before.hero.z)>.3,'left stick moves hero');
  assert.ok(Math.abs(moved.yaw-before.yaw)>.05,'right stick turns camera');
  assert.ok(Math.abs(moved.pitch-before.pitch)>.02,'right stick changes camera pitch');
  assert.match(await page.locator('#gamepad-status').textContent(),/Connected:/);
  await page.locator('#help-button').click();
  await page.locator('#camera-zoom').fill('11');
  await page.locator('#camera-height').fill('4');
  await page.locator('#camera-fov').fill('75');
  await page.locator('#camera-invert-y').check();
  assert.equal((await page.evaluate(()=>oakrestQA.state().cameraSettings)).zoom,11);
  assert.equal((await page.evaluate(()=>oakrestQA.state().cameraSettings)).invertY,true);
  await page.evaluate(()=>{window.virtualPad.axes=[0,0,0,0];window.padAttached=false;oakrestQA.step(.1);});
  assert.equal((await page.evaluate(()=>oakrestQA.state())).gamepadConnected,false);
  assert.match(await page.locator('#gamepad-status').textContent(),/No compatible/);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.oakrestQA,{timeout:20000});
  const restored=await page.evaluate(()=>oakrestQA.state().cameraSettings);
  assert.equal(restored.zoom,11);assert.equal(restored.height,4);
  assert.equal(restored.fov,75);assert.equal(restored.invertY,true);
  assert.deepEqual(errors,[]);
  console.log('PASS: simulated iPad gamepad movement, camera, disconnect and persisted camera settings.');
  await ctx.close();
 }catch(e){console.error(e.stack||e);process.exitCode=1;}
 finally{await browser?.close();server.kill();unlinkSync(path);}
})();
