// Block 2: real Classic map inspector, touch geometry and read-only export.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {resolve}=require('node:path');
const {mkdirSync}=require('node:fs');
const server=spawn('python3',['-m','http.server','5277','--bind','127.0.0.1'],
 {cwd:resolve(__dirname,'..'),stdio:'ignore'});
let browser;
(async()=>{
 try{
  await new Promise(r=>setTimeout(r,900));
  browser=await chromium.launch({headless:true,args:[
   '--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1194,height:834},
   hasTouch:true,isMobile:false});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5277/classic.html?qa=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.oakrestClassicQA);
  await page.locator('#classic-creator-name').fill('Atlas Tester');
  await page.locator('#classic-creator-form button[type=submit]').click();
  await page.waitForFunction(()=>window.oakrestClassicQA&&document.getElementById('classic-creator').hidden);
  await page.waitForFunction(()=>!!document.querySelector('#oakrest-atlas-picker'));
  // Freeze only the automatic frame loop: map inspection must not be blamed
  // for a previously ordered walk arriving during the copy/selection checks.
  // Explicit navigation commands below still update the QA state.
  await page.evaluate(()=>window.oakrestClassicQA.pauseAutomaticLoop());
  const baseline=await page.evaluate(()=>JSON.stringify(oakrestClassicQA.persistentSnapshot()));
  const map=page.locator('#classic-map-canvas');
  async function clickWorld(x,z){
   const at=await page.evaluate(async({x,z})=>{
    const {fullMapPoint}=await import('./src/classic-minimap.js');
    const e=document.querySelector('#classic-map-canvas');
    const pixel=fullMapPoint({x,z},e.width,e.height);
    const rect=e.getBoundingClientRect();
    return {x:pixel.x*rect.width/e.width,y:pixel.y*rect.height/e.height};
   },{x,z});
   await map.click({position:at});
  }
  for(const [sizeIndex,size] of [{width:1194,height:834},{width:1024,height:768},{width:1180,height:600}].entries()){
   await page.setViewportSize(size);
   await page.locator('#classic-map-toggle').click();
   assert.equal(await page.locator('#classic-map-window').isVisible(),true);
   const axes=await page.evaluate(async()=>{
    const {fullMapPoint}=await import('./src/classic-minimap.js');
    const canvas=document.querySelector('#classic-map-canvas');
    const right=fullMapPoint({x:-8,z:39},canvas.width,canvas.height);
    const left=fullMapPoint({x:8,z:39},canvas.width,canvas.height);
    const north=fullMapPoint({x:0,z:47},canvas.width,canvas.height);
    const origin=fullMapPoint({x:0,z:39},canvas.width,canvas.height);
    const renderedRight=oakrestClassicQA.projectWorld(-8,39);
    const renderedLeft=oakrestClassicQA.projectWorld(8,39);
    return {mapRight:right.x-origin.x,mapLeft:left.x-origin.x,
     mapNorth:north.y-origin.y,gameRight:renderedRight.x-renderedLeft.x};
   });
   assert.ok(axes.gameRight>0,'actual default Classic camera renders world -X to screen right');
   assert.ok(axes.mapRight>0&&axes.mapLeft<0,'the expanded map matches game east/west');
   assert.ok(axes.mapNorth<0,'north stays at the top of expanded map');
   assert.equal(await page.locator('#oakrest-atlas-picker option').count(),10);
   const initial=await page.evaluate(()=>oakrestClassicQA.atlasState());
   assert.equal(initial.zones.length,10);
   assert.equal(initial.inspecting,false,'map stays navigable unless inspect is explicitly enabled');
   await page.locator('#oakrest-atlas-picker').selectOption('OAK-WD-002');
   assert.match(await page.locator('.oakrest-atlas-title').textContent(),/Alderwood/);
   assert.match(await page.locator('.oakrest-atlas-id').textContent(),/OAK-WD-002/);
   await page.locator('#oakrest-atlas-copy-brief').click();
   assert.match(await page.locator('.oakrest-atlas-preview').inputValue(),/adventure:cart/);
   await page.locator('#oakrest-atlas-copy-json').click();
   const blueprint=JSON.parse(await page.locator('.oakrest-atlas-preview').inputValue());
   assert.equal(blueprint.mode,'reference-only');
   assert.equal(blueprint.editable,false);
   assert.equal(blueprint.zone.id,'OAK-WD-002');
   assert.ok(blueprint.entities.some(e=>e.id==='adventure:tracks'));
   await page.locator('#oakrest-atlas-mode').click();
   assert.equal(await page.locator('#oakrest-atlas-mode').getAttribute('aria-pressed'),'true');
   const before=await page.evaluate(()=>JSON.stringify(oakrestClassicQA.navigationState()));
   await clickWorld(0,93+sizeIndex);
   assert.equal((await page.evaluate(()=>oakrestClassicQA.atlasState())).selected,'OAK-WD-001',
    'touch selects named zone from canonical map coordinates');
   assert.equal(await page.evaluate(()=>JSON.stringify(oakrestClassicQA.navigationState())),before,
    'inspecting a zone cannot accidentally issue a move order');
   await page.locator('#oakrest-atlas-mode').click();
   assert.equal(await page.locator('#oakrest-atlas-mode').getAttribute('aria-pressed'),'false');
   await clickWorld(0,93+sizeIndex);
   assert.notEqual(await page.evaluate(()=>JSON.stringify(oakrestClassicQA.navigationState())),before,
    'travel mode retains the existing map click-to-move contract');
   assert.equal(await page.evaluate(()=>JSON.stringify(oakrestClassicQA.persistentSnapshot())),baseline,
    'the read-only atlas and movement orders cannot mutate stored game progression');
   await page.locator('#classic-inventory-toggle').click();
   assert.equal(await page.locator('#classic-item-window').isVisible(),true,
    'the inspector lives inside the normal persistent sidebar');
   await page.evaluate(()=>oakrestClassicQA.atlasInspect(false));
  }
  assert.deepEqual(errors,[],'no browser exceptions while selecting/copying areas');
  mkdirSync('qa/world-atlas',{recursive:true});
  await page.locator('#classic-map-toggle').click();
  await page.screenshot({path:'qa/world-atlas/world-atlas-1194.png'});
  console.log('PASS: 10 real named areas, accurate touch map selection, read-only copy/JSON, travel remains functional and save untouched.');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
