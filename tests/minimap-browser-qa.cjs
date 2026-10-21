// Regression QA: HUD positioning, live minimap updates and menu navigation.
// Headless Chromium touch emulation is not a substitute for physical iPad QA.
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
fs.mkdirSync(path.join(root,'qa'),{recursive:true});
const server=spawn('python3',['-m','http.server','5173'],{cwd:root,stdio:'ignore'});
const report={screens:[],checks:[],errors:[]};
let browser;
(async()=>{try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 // Keep headless software-GPU testing at 1x; test actual high-DPR GPU cost on iPad Safari.
 const configurations=[
  {name:'ipad-landscape',width:1366,height:1024,touch:true,dpr:1},
  {name:'phone-portrait',width:390,height:844,touch:true,dpr:1},
  {name:'phone-landscape',width:844,height:390,touch:true,dpr:1},
  {name:'compact-phone',width:320,height:640,touch:true,dpr:1},
  {name:'desktop',width:1440,height:900,touch:false,dpr:1}
 ];
 for(const config of configurations){
  const ctx=await browser.newContext({viewport:{width:config.width,height:config.height},hasTouch:config.touch,deviceScaleFactor:config.dpr});
  const page=await ctx.newPage();
  page.on('pageerror',e=>report.errors.push(config.name+': '+e.message));
  await page.addInitScript(()=>{
   if(!localStorage.getItem('oakrest-v1'))localStorage.setItem('oakrest-v1',JSON.stringify({
    xp:{melee:0,magic:0,ranged:0,vitality:0},lootVersion:1,
    gear:{melee:'sword',magic:'frost',ranged:'bow'},
    armour:{melee:'traveller',magic:'traveller',ranged:'traveller'},
    inventory:{weapons:{melee:['sword'],magic:['frost'],ranged:['bow']},armour:['traveller'],materials:{}}
   }));
  });
  await page.goto('http://127.0.0.1:5173/?qa=1');
  await page.waitForFunction(()=>window.oakrestQA,{timeout:20000});
  await page.locator('#begin').click();
  await page.waitForTimeout(360);
  if(config.name==='phone-landscape'){
    const skillCaption=page.locator('#skills .skill .name').first();
    assert.ok(await skillCaption.count(),'combat skill captions must remain accessible');
    const size=await skillCaption.evaluate(element=>parseFloat(getComputedStyle(element).fontSize));
    assert.ok(size>=9,'compact landscape ability labels should be legible: '+size+'px');
  }
  const vitals=await page.locator('.player-hud .vitals').boundingBox();
  const menu=await page.locator('#loadout-button').boundingBox();
  const map=await page.locator('#minimap-button').boundingBox();
  const onScreen=r=>r&&r.x>=0&&r.y>=0&&r.x+r.width<=config.width+1&&r.y+r.height<=config.height+1;
  assert.ok(onScreen(vitals)&&onScreen(menu)&&onScreen(map),config.name+' HUD bounds');
  assert.ok(menu.y>=vitals.y+vitals.height-1,config.name+' menu must be beneath HP');
  assert.ok(Math.abs(menu.x-vitals.x)<3,config.name+' menu must align left to HP');
  assert.ok(map.x>vitals.x+vitals.width+3,config.name+' map must not overlap HP');
  assert.ok(map.x>menu.x+menu.width+3,config.name+' map must not overlap menu');
  assert.ok(map.x+map.width>config.width-190,config.name+' map should be in top-right');
  const area=page.locator('#minimap-area');
  await page.evaluate(()=>{oakrestQA.teleport(0,20);oakrestQA.step(.1);});
  await page.waitForTimeout(240);
  assert.equal(await area.textContent(),'OAKREST TOWN');
  const screenshot0=await page.locator('#minimap-canvas').evaluate(e=>e.toDataURL());
  await page.evaluate(()=>{oakrestQA.teleport(0,-70);oakrestQA.step(.1);});
  await page.waitForTimeout(240);
  assert.equal(await area.textContent(),'GREENWOOD',config.name+' area must track hero');
  const screenshot1=await page.locator('#minimap-canvas').evaluate(e=>e.toDataURL());
  assert.notEqual(screenshot0,screenshot1,config.name+' map must redraw as hero travels');
  if(!config.touch){
   // Desktop uses pointer lock; M must open the map and release the cursor.
   await page.keyboard.press('m');
   assert.ok(await page.locator('#progression-panel').isVisible(),'desktop M shortcut should open the map');
   await page.locator('#close-progression').click();
   await page.keyboard.press('Escape');
  }
  await page.locator('#minimap-button').click();
  assert.ok(await page.locator('#progression-panel').isVisible(),config.name+' map tap opens full map menu');
  assert.ok(await page.locator('#progression-map').isVisible());
  assert.ok((await page.locator('#progression-content').textContent()).includes('World Map'));
  await page.locator('#close-progression').click();
  await page.locator('#loadout-button').click();
  assert.ok(await page.locator('#progression-panel').isVisible(),config.name+' menu button still works');
  await page.locator('#close-progression').click();
  await page.screenshot({path:path.join(root,'qa','hud-minimap-'+config.name+'.png')});
  report.screens.push({name:config.name,vitals,menu,map});
  report.checks.push(config.name+' HUD bounds, map travel, tap actions');
  await ctx.close();
 }
 assert.deepEqual(report.errors,[],'browser runtime errors');
 report.passed=true;console.log('PASS HUD minimap/browser:',report.checks.join('; '));
 }catch(e){report.passed=false;report.errors.push(String(e.stack||e));console.error(e);process.exitCode=1;}
 finally{
  fs.writeFileSync(path.join(root,'qa','hud-minimap-qa.json'),JSON.stringify(report,null,2));
  if(browser)await browser.close();server.kill('SIGTERM');
 }
})();
