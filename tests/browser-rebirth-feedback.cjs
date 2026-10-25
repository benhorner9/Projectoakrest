// Chromium presentation and preference regression. No audible-quality or real
// Safari hardware claim: synthetic events below only stress the label renderer.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/oakrest-dev\//,'/');
 const file=path.resolve(root,'.'+pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(error,data)=>{
  if(error){res.writeHead(404).end();return;}
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(data);
 });
});
let browser;
(async()=>{try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1194,height:834},hasTouch:true});
 const {defaultSave}=await import('../src/rules.js');
 await context.addInitScript(save=>{
  if(!localStorage.getItem('feedback-test-seeded')){
   localStorage.setItem('oakrest-dev-v1',JSON.stringify(save));
   localStorage.setItem('oakrest-audio','{"enabled":false,"volume":0.2}');
   localStorage.setItem('oakrest-dev-audio','{"enabled":false,"volume":0.65}');
   localStorage.setItem('feedback-test-seeded','yes');
  }
  let qa;Object.defineProperty(window,'oakrestClassicQA',{configurable:true,get:()=>qa,set:value=>{qa=value;value?.pauseAutomaticLoop?.();}});
 },defaultSave());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/oakrest-dev/classic.html?qa=1`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.oakrestClassicQA);
 await page.locator('#classic-settings-toggle').click();
 assert.equal(await page.locator('#classic-audio-enabled').isChecked(),false);
 assert.equal(await page.locator('#classic-audio-volume').inputValue(),'0.65');
 await page.locator('#classic-audio-enabled').check();
 await page.locator('#classic-audio-volume').evaluate(el=>{el.value='0.35';el.dispatchEvent(new Event('input',{bubbles:true}));});
 const preferences=()=>page.evaluate(()=>({dev:JSON.parse(localStorage.getItem('oakrest-dev-audio')),public:localStorage.getItem('oakrest-audio')}));
 const expected={dev:{enabled:true,volume:.35},public:'{"enabled":false,"volume":0.2}'};
 assert.deepEqual(await preferences(),expected,'development settings preserve public preferences byte-for-byte');
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.oakrestClassicQA);
 assert.equal(await page.locator('#classic-audio-enabled').isChecked(),true);
 assert.equal(await page.locator('#classic-audio-volume').inputValue(),'0.35');
 assert.deepEqual(await preferences(),expected,'development preference survives reload');
 await page.evaluate(()=>{oakrestClassicQA.teleport(-1,71.3);oakrestClassicQA.lockMonster('practice');});
 let visibleHit=false;
 for(let i=0;i<100&&!visibleHit;i++){
  await page.evaluate(()=>oakrestClassicQA.advance(.1));
  visibleHit=await page.locator('#classic-game .classic-damage.hit:not([hidden])').count()>0;
 }
 assert.equal(visibleHit,true,'real mounted combat produces visible damage labels');
 assert.equal(await page.locator('#classic-game .classic-damage-layer').evaluate(el=>getComputedStyle(el).pointerEvents),'none');
 const stress=await page.evaluate(async()=>{
  const {createClassicCombatFeedback}=await import('./src/classic-combat-feedback.js');
  const THREE=await import('three');
  const host=document.createElement('div');host.style.cssText='position:relative;width:400px;height:300px';document.body.append(host);
  const feedback=createClassicCombatFeedback(host),camera=new THREE.PerspectiveCamera(50,4/3,.1,100);
  camera.position.set(0,3.2,10);camera.lookAt(0,3.2,0);camera.updateMatrixWorld();
  const state={monsters:[{id:'test',x:0,z:0}]};
  for(let i=0;i<40;i++)feedback.event({type:'hit',id:'test',damage:i,time:10},state,{x:0,z:0});
  feedback.update(10.2,camera);
  const labels=()=>[...host.querySelectorAll('.classic-damage')];
  const result={cap:labels().length,first:labels()[0].textContent,visible:labels().every(el=>!el.hidden),finite:labels().every(el=>!/(NaN|Infinity)/.test(el.style.transform))};
  feedback.event({type:'hurt',damage:7,time:10.2},state,{x:0,z:0});
  feedback.event({type:'heal',amount:9,time:10.2},state,{x:0,z:0});
  feedback.update(10.3,camera);result.hurt=host.querySelector('.hurt').textContent;result.heal=host.querySelector('.heal').textContent;
  result.afterKinds=labels().length;
  feedback.update(11.2,camera);result.expired=labels().length;
  feedback.event({type:'hurt',damage:3,time:12},state,{x:1000000,z:0});feedback.update(12,camera);
  result.offscreenHidden=labels()[0].hidden;host.remove();return result;
 });
 assert.deepEqual(stress,{cap:24,first:'16',visible:true,finite:true,hurt:'−7',heal:'+9',afterKinds:24,expired:0,offscreenHidden:true});
 assert.deepEqual(errors,[],'no browser runtime exceptions');
 console.log('PASS: development audio settings persist without public-key writes; real combat label visible; presentation bounded to 24, finite, offscreen-hidden and expired. Emulated Chromium only.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}})().catch(error=>{console.error(error);process.exitCode=1;});
