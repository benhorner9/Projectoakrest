// Browser validation for keyboard orbit, camera-relative walk and touch-accessible controls.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {resolve}=require('node:path');
const server=spawn('python3',['-m','http.server','5192','--bind','127.0.0.1'],{cwd:resolve(__dirname,'..'),stdio:'ignore'});
let browser;
(async()=>{
 const errors=[];
 try{
  await new Promise(r=>setTimeout(r,1000));
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1194,height:834},hasTouch:true,deviceScaleFactor:1});
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  const {defaultSave}=await import('../src/rules.js');
  const raw=JSON.stringify(defaultSave());
  await page.addInitScript(raw=>localStorage.setItem('oakrest-v1',raw),raw);
  await page.goto('http://127.0.0.1:5192/classic.html?qa=1',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>!!window.oakrestClassicQA,{timeout:30000});
  const read=()=>page.evaluate(()=>({camera:oakrestClassicQA.cameraState(),player:oakrestClassicQA.state(),map:oakrestClassicQA.minimapState()}));
  const original=await read();
  assert.equal(await page.evaluate(()=>oakrestClassicQA.characterCreatorState().open),false,'camera QA must start gameplay, not character creation');
  // Explicit held arrow keys must move ONLY camera, never hero.
  await page.keyboard.down('ArrowRight');
  const captured=await page.evaluate(()=>oakrestClassicQA.cameraKeys());
  assert.ok(captured.includes('arrowright'),'keydown was blocked: '+JSON.stringify({captured,creator:await page.evaluate(()=>oakrestClassicQA.characterCreatorState())}));
  await page.evaluate(()=>{for(let i=0;i<12;i++)oakrestClassicQA.step(.05);});
  await page.keyboard.up('ArrowRight');
  const rotated=await read();
  // Angle values wrap at +PI/-PI: assert real orbit distance instead of subtracting yaw.
  const travel=Math.hypot(rotated.camera.offset.x-original.camera.offset.x,
   rotated.camera.offset.z-original.camera.offset.z);
  assert.ok(travel>3,'holding right arrow moves the camera '+JSON.stringify({travel,before:original.camera,after:rotated.camera}));
  assert.ok(Math.hypot(rotated.player.x-original.player.x,rotated.player.z-original.player.z)<.01,
   'rotating camera must not move hero');
  await page.keyboard.down('ArrowUp');
  await page.evaluate(()=>{for(let i=0;i<10;i++)oakrestClassicQA.step(.05);});
  await page.keyboard.up('ArrowUp');
  const raised=await read();
  assert.ok(raised.camera.pitch>rotated.camera.pitch,'up arrow raises the viewpoint');
  assert.ok(raised.camera.pitch<Math.PI/2,'camera cannot tip beyond overhead');
  await page.keyboard.down('ArrowDown');
  await page.evaluate(()=>{for(let i=0;i<10;i++)oakrestClassicQA.step(.05);});
  await page.keyboard.up('ArrowDown');
  const lowered=await read();
  assert.ok(lowered.camera.pitch<raised.camera.pitch,'down arrow lowers the viewpoint');

  // Confirm W moves up in the CURRENT view and in the camera-aligned minimap.
  const before=await read();
  await page.keyboard.down('w');
  await page.evaluate(()=>{for(let i=0;i<8;i++)oakrestClassicQA.step(.05);});
  await page.keyboard.up('w');
  const moved=await read();
  const horizontal={x:moved.player.x-before.player.x,z:moved.player.z-before.player.z};
  const dot=horizontal.x*before.camera.basis.up.x+horizontal.z*before.camera.basis.up.z;
  assert.ok(dot>1,'W follows the newly rotated camera, not the old geographical facing');
  const nav=await page.evaluate(async({from,to,offset})=>{
   const {worldToMinimap}=await import('./src/classic-minimap.js');
   return worldToMinimap(to,from,160,3.45,offset);
  },{from:before.player,to:moved.player,offset:before.camera.offset});
  assert.ok(nav.y<80&&Math.abs(nav.x-80)<1.5,'rotated minimap follows the same WASD basis');

  // Settings touch controls and reset recover the exact original camera.
  await page.locator('#classic-settings-toggle').click();
  await page.getByRole('button',{name:'Rotate camera left'}).click();
  const left=await read();
  assert.notEqual(left.camera.yaw,moved.camera.yaw);
  await page.getByRole('button',{name:'Raise camera'}).click();
  await page.getByRole('button',{name:'Lower camera'}).click();
  await page.getByRole('button',{name:'Reset camera angle'}).click();
  const reset=await read();
  assert.ok(Math.abs(reset.camera.yaw-original.camera.yaw)<1e-8);
  assert.ok(Math.abs(reset.camera.pitch-original.camera.pitch)<1e-8);
  await page.locator('#classic-settings-close').click();
  // Home is the in-world reset shortcut.
  await page.keyboard.down('ArrowLeft');
  await page.evaluate(()=>oakrestClassicQA.step(.07));
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.press('Home');
  await page.evaluate(()=>oakrestClassicQA.step(0));
  assert.ok(Math.abs((await read()).camera.yaw-original.camera.yaw)<1e-8);
  assert.equal(await page.evaluate(()=>localStorage.getItem('oakrest-v1')),raw,
   'camera controls never rewrite character saves');
  assert.deepEqual(errors,[],'no uncaught WebGL or runtime errors');
  console.log('Classic orbit camera verified: arrow orbit/pitch, hero immobility, rotated WASD/minimap, touch buttons, Home/reset and save isolation.');
  await context.close();
 }catch(err){console.error(err);process.exitCode=1;}
 finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);server.kill();process.exitCode=1});
