// Browser integration of persistent target lock, auto basics and tribrid switching.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const path=require('node:path');
const server=spawn('python3',['-m','http.server','5194','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:'ignore'});
let browser;
(async()=>{try{
 await new Promise(r=>setTimeout(r,1000));
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const {defaultSave}=await import('../src/rules.js');
 const data=defaultSave();
 const context=await browser.newContext({viewport:{width:1180,height:820},hasTouch:true});
 await context.addInitScript(d=>localStorage.setItem('oakrest-v1',JSON.stringify(d)),data);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5194/?qa=1');
 await page.waitForFunction(()=>Boolean(window.oakrestQA));
 await page.locator('#begin').click();
 const result=await page.evaluate(()=>{
  const qa=window.oakrestQA,health=()=>qa.state().enemies.find(e=>e.type==='dummy').hp;
  qa.teleport(-6,-1);
  qa.step(.2);
  const initial=health();
  if(!qa.target('dummy'))throw new Error('Could not select visible dummy');
  // A tapped skill during the basic attack interval must be buffered, not swallowed.
  qa.step(.15);qa.ability(0);qa.step(2.5);
  if(!Object.keys(qa.state().cooldowns).some(k=>k.includes('w0')))throw new Error('Queued melee ability never activated during auto-attacks');
  qa.step(8);
  const melee=health();
  if(!(melee<initial))throw new Error('No repeating melee hits on locked dummy');
  if(!qa.state().autoCombat)throw new Error('Target lock was lost after initial strikes');
  qa.style('magic');qa.step(1.2);
  if(qa.state().style!=='magic'||!qa.state().autoCombat)throw new Error('Magic switch lost locked target');
  qa.step(7);const magic=health();
  if(!(magic<melee))throw new Error('No continuing magic attacks after switching');
  qa.style('ranged');qa.step(1.5);
  if(qa.state().style!=='ranged'||!qa.state().autoCombat)throw new Error('Ranged switch lost target');
  qa.step(7);const ranged=health();
  if(!(ranged<magic))throw new Error('No continuing ranged attacks after switching');
  qa.stopCombat();qa.step(3);const stopped=health();qa.step(3);
  if(qa.state().autoCombat||health()!==stopped)throw new Error('Attacks continued after stop');
  return {initial,melee,magic,ranged,stopped,style:qa.state().style};
 });
 const buffered=await page.evaluate(()=>{
  oakrestQA.style('melee');oakrestQA.step(2);
  oakrestQA.teleport(-6,-1);
  oakrestQA.basic();
  if(!oakrestQA.state().pendingBasic)throw Error('Expected basic attack windup before buffering skill');
  oakrestQA.ability(0);
  if(oakrestQA.state().queuedAbility!==0)throw Error('Ability tap was swallowed while auto-basic recovering');
  oakrestQA.step(2.5);
  const state=oakrestQA.state();
  if(state.queuedAbility!==null||!Object.values(state.cooldowns).some(v=>v>state.time))throw Error('Queued ability never activated');
  return {activated:true,queued:false};
 });
 // Real touch button now changes attack state by tap, not long press.
 await page.evaluate(()=>{oakrestQA.teleport(-6,-1);oakrestQA.step(.1);});
 await page.locator('#touch-attack').tap();
 assert.equal((await page.evaluate(()=>oakrestQA.state())).autoCombat,true,'tap should lock enemy');
 await page.locator('#touch-attack').tap();
 assert.equal((await page.evaluate(()=>oakrestQA.state())).autoCombat,false,'second tap should stop');
 assert.deepEqual(errors,[],'No runtime JS exceptions');
 console.log('Auto combat browser PASS',JSON.stringify({...result,buffered}));
 await context.close();
 }catch(e){console.error('Auto combat browser FAIL',e);process.exitCode=1;}
 finally{await browser?.close();server.kill();}
})();
