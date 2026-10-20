// iPad-shaped touch-browser regression on the real /oakrest-dev/ subdirectory.
// Chromium emulation only: it does not claim physical iPad or Safari/WebKit QA.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {resolve,join}=require('node:path');
const {symlinkSync,unlinkSync,existsSync}=require('node:fs');

const root=resolve(__dirname,'..');
const subdirectory=join(root,'oakrest-dev');
if(existsSync(subdirectory))throw Error('Refusing to replace an existing oakrest-dev path');
symlinkSync('.',subdirectory,'dir');
const server=spawn('python3',['-m','http.server','5174','--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});
let browser;

async function runCase(label,viewport,seedBrokenLegacy){
 const context=await browser.newContext({viewport,hasTouch:true,isMobile:true,deviceScaleFactor:2});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 if(seedBrokenLegacy)await page.addInitScript(()=>{
  localStorage.setItem('oakrest-dev-v1','{invalid legacy json');
 });
 try{
  await page.goto('http://127.0.0.1:5174/oakrest-dev/?qa=1',{waitUntil:'domcontentloaded',timeout:20000});
  await page.waitForFunction(()=>!!window.oakrestQA,{timeout:20000});
  assert.equal(await page.locator('#character-creator').isVisible(),true,label+' should open character creator');
  assert.equal(await page.locator('#creator-confirm').isEnabled(),true);
  await page.locator('#creator-name').fill(seedBrokenLegacy?'Coastal Explorer':'First Adventurer');
  await page.locator('#creator-form select[name="sex"]').selectOption('female');
  await page.locator('#creator-form select[name="hairstyle"]').selectOption('curly');
  await page.locator('#creator-form select[name="outfit"]').selectOption('scholar');
  await page.locator('#creator-confirm').click({timeout:15000});
  await page.waitForFunction(()=>document.getElementById('intro').classList.contains('hidden'),{timeout:10000});
  assert.equal(await page.locator('#character-creator').isHidden(),true,'creator closes');
  assert.equal(await page.locator('#intro').isHidden(),true,'game begins with no second title button');
  assert.equal(await page.locator('#area').textContent(),'The First Steps');
  const snapshot=await page.evaluate(()=>{
   const id=localStorage.getItem('oakrest-dev-active-character');
   const roster=JSON.parse(localStorage.getItem('oakrest-dev-characters-v1'));
   const saved=JSON.parse(localStorage.getItem('oakrest-dev-character-save-'+id));
   return {id,roster,saved,legacy:localStorage.getItem('oakrest-dev-v1'),introHidden:document.getElementById('intro').classList.contains('hidden')};
  });
  assert.equal(snapshot.roster.length,1);
  assert.equal(snapshot.saved.onboarding.area,'tutorial');
  assert.deepEqual(snapshot.saved.inventory.weapons,{melee:[],magic:[],ranged:[]});
  if(seedBrokenLegacy)assert.equal(snapshot.legacy,'{invalid legacy json','do not overwrite damaged old saves');
  assert.deepEqual(errors,[],'no uncaught page errors: '+errors.join(', '));
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.oakrestQA,{timeout:20000});
  assert.equal(await page.locator('#character-name-label').textContent(),snapshot.roster[0].name);
  assert.equal(await page.evaluate(()=>oakrestQA.state().area),'tutorial');
  console.log('PASS: '+label+' created and started character; save survived reload.');
 }finally{await context.close();}
}

(async()=>{
 try{
  await new Promise(resolve=>setTimeout(resolve,1100));
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  await runCase('iPad portrait dev path',{width:1024,height:1366},false);
  await runCase('iPad landscape dev path with corrupt legacy save',{width:1366,height:1024},true);
 }catch(e){console.error(e.stack||e);process.exitCode=1;}
 finally{await browser?.close();server.kill();unlinkSync(subdirectory);}
})();
