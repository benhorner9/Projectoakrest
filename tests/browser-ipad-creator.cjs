// Character management must work on a native link without the Three.js engine.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {resolve,join}=require('node:path');
const {symlinkSync,unlinkSync,existsSync}=require('node:fs');
const root=resolve(__dirname,'..'),subdirectory=join(root,'oakrest-dev');
if(existsSync(subdirectory))throw Error('Refusing to replace an existing dev directory');
symlinkSync('.',subdirectory,'dir');
const server=spawn('python3',['-m','http.server','5174','--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});
let browser;
const base='http://127.0.0.1:5174/oakrest-dev/';
async function newPage(viewport){
 const context=await browser.newContext({viewport,hasTouch:true,isMobile:true,deviceScaleFactor:2});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 return {context,page,errors};
}
async function testTitleLink(){
 const {context,page,errors}=await newPage({width:1366,height:1024});
 await page.addInitScript(()=>localStorage.setItem('oakrest-dev-v1',JSON.stringify({
  xp:{melee:0,magic:0,ranged:0,vitality:0},lootVersion:1,
  gear:{melee:'sword',magic:'frost',ranged:'bow'},
  armour:{melee:'traveller',magic:'traveller',ranged:'traveller'},
  inventory:{weapons:{melee:['sword'],magic:['frost'],ranged:['bow']},armour:['traveller'],materials:{}}
 })));
 try{
  await page.goto(base+'?qa=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.oakrestQA,{timeout:20000});
  assert.equal(await page.locator('#choose-character').getAttribute('href'),'./characters.html');
  await page.locator('#choose-character').click();
  await page.waitForURL('**/oakrest-dev/characters.html',{timeout:20000});
  assert.ok(await page.locator('#saved-character-slots').getByText('Original Oakrest Save').isVisible());
  assert.ok(await page.locator('#character-name').isVisible());
  assert.deepEqual(errors,[]);
  console.log('PASS: native Characters link navigates to working standalone character screen');
 }finally{await context.close();}
}
async function testStandalone(label,viewport,legacyBad){
 const {context,page,errors}=await newPage(viewport);
 if(legacyBad)await page.addInitScript(()=>localStorage.setItem('oakrest-dev-v1','{bad old save'));
 try{
  // Load the character manager without loading ANY Three.js game code first.
  await page.goto(base+'characters.html',{waitUntil:'domcontentloaded',timeout:20000});
  await page.locator('#character-name').fill(legacyBad?'Coastal Explorer':'First Adventurer');
  await page.locator('select[name="sex"]').selectOption('female');
  await page.locator('select[name="hairstyle"]').selectOption('curly');
  await page.locator('select[name="outfit"]').selectOption('scholar');
  await page.locator('#create-and-play').click({timeout:15000});
  await page.waitForURL(/\/oakrest-dev\/\?autostart=1/,{timeout:20000});
  await page.locator('#intro.hidden').waitFor({state:'attached',timeout:20000});
  assert.equal(await page.locator('#area').textContent(),'The First Steps');
  assert.ok(await page.locator('#intro').isHidden(),'new character auto-starts tutorial');
  assert.equal(await page.locator('#area').textContent(),'The First Steps');
  const saved=await page.evaluate(()=>{
   const id=localStorage.getItem('oakrest-dev-active-character');
   return {id,roster:JSON.parse(localStorage.getItem('oakrest-dev-characters-v1')),
    save:JSON.parse(localStorage.getItem('oakrest-dev-character-save-'+id)),
    legacy:localStorage.getItem('oakrest-dev-v1')};
  });
  assert.equal(saved.roster.length,1);assert.equal(saved.save.onboarding.area,'tutorial');
  assert.deepEqual(saved.save.inventory.weapons,{melee:[],magic:[],ranged:[]});
  if(legacyBad)assert.equal(saved.legacy,'{bad old save');
  await page.locator('#help-button').click();
  await page.locator('#character-switch').click();
  await page.waitForURL('**/oakrest-dev/characters.html',{timeout:20000});
  assert.ok(await page.locator('#saved-character-slots').getByText(saved.roster[0].name).isVisible());
  assert.deepEqual(errors,[],'No browser JavaScript errors: '+errors);
  console.log('PASS: '+label+' creates, starts and reselects same saved character');
 }finally{await context.close();}
}
(async()=>{
 try{
  await new Promise(r=>setTimeout(r,1200));
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  await testTitleLink();
  await testStandalone('iPad portrait independent screen',{width:1024,height:1366},false);
  await testStandalone('iPad landscape broken legacy save',{width:1366,height:1024},true);
 }catch(e){console.error(e.stack);process.exitCode=1;}
 finally{await browser?.close();server.kill();unlinkSync(subdirectory);}
})();
