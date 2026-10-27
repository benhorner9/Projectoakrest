/* Real Chromium save/reload integration on local host. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {resolve}=require('node:path');
const base='http://127.0.0.1:5192/classic.html?qa=1';
const id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const profile={id,name:'Save Tester'};
const server=spawn('python3',['-m','http.server','5192','--bind','127.0.0.1'],{cwd:resolve(__dirname,'..'),stdio:'ignore'});
async function main(){
 const {defaultSave}=await import('../src/rules.js');
 const original=defaultSave();original.coins=900;
 const raw=JSON.stringify(original);
 await new Promise(r=>setTimeout(r,1100));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const context=await browser.newContext({viewport:{width:1194,height:834},hasTouch:true});
  await context.addInitScript(({raw,id,profile})=>{
   if(!localStorage.getItem('oakrest-characters-v1')){
    localStorage.setItem('oakrest-characters-v1',JSON.stringify([profile]));
    localStorage.setItem('oakrest-active-character',id);
    localStorage.setItem('oakrest-character-save-'+id,raw);
   }
  },{raw,id,profile});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.oakrestClassicQA,{timeout:30000});
  assert.equal(await page.evaluate(()=>oakrestClassicQA.saveStatus().enabled),false);
  assert.equal(await page.evaluate(()=>localStorage.getItem('oakrest-character-save-'+
   'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')),raw);
  assert.equal(await page.evaluate(()=>oakrestClassicQA.enableSaving().ok),true);
  assert.equal(await page.evaluate(()=>oakrestClassicQA.saveStatus().enabled),true);
  assert.match(await page.locator('#classic-save-mode').textContent(),/PERSISTENT/);
  // Exercise a canonical item transaction in bank reach, not remote access.
  await page.evaluate(()=>oakrestClassicQA.teleport(-30,14));
  const result=await page.evaluate(()=>oakrestClassicQA.itemAction({
   type:'bank',kind:'coins',direction:'deposit',quantity:43}));
  assert.equal(result.ok,true);
  assert.equal(await page.evaluate(()=>oakrestClassicQA.saveNow()),true);
  const stored=await page.evaluate(id=>({
   current:localStorage.getItem('oakrest-character-save-'+id),
   backup:localStorage.getItem('oakrest-classic-before-block6-'+id),
   checkpoint:localStorage.getItem('oakrest-classic-checkpoint-'+id)
  }),id);
  assert.equal(stored.backup,raw,'original bytes retained as restore point');
  assert.equal(stored.checkpoint,raw,'immediate previous save captured before applying transaction');
  assert.equal(await page.locator('#classic-restore-save').isEnabled(),true,'manual recovery becomes available after saving');
  assert.equal(JSON.parse(stored.current).coins,857);
  assert.equal(JSON.parse(stored.current).bank.coins,43);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.oakrestClassicQA,{timeout:30000});
  assert.equal(await page.evaluate(()=>oakrestClassicQA.itemState().bankCoins),43);
  assert.equal(await page.evaluate(()=>oakrestClassicQA.itemState().coins),857);
  assert.equal(await page.evaluate(()=>oakrestClassicQA.saveStatus().enabled),false,
   'each reload starts with safe opt-in off');
  assert.equal(await page.evaluate(()=>localStorage.getItem('oakrest-classic-before-block6-'+
   'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')),raw);
  // External writes must be detected and must never be overwritten.
  assert.equal(await page.evaluate(()=>oakrestClassicQA.enableSaving().ok),true);
  await page.evaluate(id=>{
   const key='oakrest-character-save-'+id;
   const save=JSON.parse(localStorage.getItem(key));save.coins=12345;
   localStorage.setItem(key,JSON.stringify(save));
  },id);
  assert.equal(await page.evaluate(()=>oakrestClassicQA.saveNow()),false);
  assert.equal(await page.evaluate(()=>oakrestClassicQA.saveStatus().enabled),false);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('oakrest-character-save-'+
   'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')).coins),12345);
  assert.deepEqual(errors,[],'no uncaught browser errors');
  console.log('Classic save/reload, backup, conflict and session boundaries PASSED');
  await context.close();
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.kill());
