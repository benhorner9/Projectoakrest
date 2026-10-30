// Real DOM/touch regression for all issue-208 presentation and world contracts.
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const {spawn}=require('node:child_process'),{mkdirSync}=require('node:fs');
const server=spawn('python3',['-m','http.server','5298','--bind','127.0.0.1'],{stdio:'ignore'});let browser;
(async()=>{try{
 await new Promise(r=>setTimeout(r,700));
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1194,height:834},hasTouch:true});
 const {defaultSave}=await import('../src/rules.js');const save=defaultSave();
 save.inventory.materials={...save.inventory.materials,reed:5,'softwood-logs':5};
 await context.addInitScript(s=>localStorage.setItem('oakrest-v1',JSON.stringify(s)),save);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5298/classic.html?qa=1');await page.waitForFunction(()=>window.oakrestClassicQA);
 await page.evaluate(()=>oakrestClassicQA.pauseAutomaticLoop());
 assert.equal(await page.locator('#classic-player-status').isVisible(),false);
 assert.equal(await page.locator('#classic-combat-target').isVisible(),false);
 assert.equal(await page.locator('#classic-joystick').isVisible(),false);
 assert.equal(await page.getByRole('button',{name:'MAKE FROM BAG'}).count(),0);
 assert.equal(await page.locator('.oakrest-chat-notice').count(),0);
 await page.locator('#oakrest-chat-input').fill('A local message');await page.locator('.oakrest-chat-send').tap();
 assert.ok(await page.locator('#oakrest-chat-log').textContent().then(t=>t.includes('A local message')));
 // Genuine item-on-item transaction, accessed by touch.
 await page.locator('[data-scope=bag][data-canonical="material.reed"]').tap();
 await page.getByRole('button',{name:'USE WITH…',exact:true}).tap();
 await page.locator('[data-scope=bag][data-canonical="material.softwood-logs"]').tap();
 await page.getByLabel('Choose crafting recipe').selectOption('frost');
 await page.getByRole('button',{name:'START CRAFTING'}).tap();
 await page.evaluate(()=>oakrestClassicQA.advance(4));
 await page.getByRole('button',{name:'CLOSE',exact:true}).tap();
 assert.ok((await page.evaluate(()=>oakrestClassicQA.persistentSnapshot())).inventory.materials['frost-scroll']>0);
 for(const size of [{width:1194,height:834},{width:1024,height:768},{width:820,height:630}]){
  await page.setViewportSize(size);
  const map=await page.locator('#classic-minimap-expand').evaluate(e=>{
   const r=e.getBoundingClientRect(),c=e.querySelector('canvas').getBoundingClientRect(),p=e.closest('.classic-sidebar-map').getBoundingClientRect();
   return {w:r.width,h:r.height,inside:r.left-8>=p.left&&r.right+8<=p.right&&r.top-8>=p.top&&r.bottom+8<=p.bottom,centred:Math.abs((r.left+r.right)-(c.left+c.right))<2&&Math.abs((r.top+r.bottom)-(c.top+c.bottom))<2};
  });
  assert.equal(map.w,map.h);assert.ok(map.inside,JSON.stringify({size,map}));assert.ok(map.centred);
 }
 await page.setViewportSize({width:1194,height:834});
 await page.evaluate(()=>{oakrestClassicQA.teleport(-1,71);oakrestClassicQA.lockMonster('practice');oakrestClassicQA.advance(.4);});
 assert.equal(await page.locator('#classic-player-status').isVisible(),true);
 assert.equal(await page.locator('#classic-combat-target').isVisible(),true);
 const positions=await page.evaluate(()=>{
  const a=document.querySelector('#classic-player-status').getBoundingClientRect(),b=document.querySelector('#classic-combat-target').getBoundingClientRect(),w=document.querySelector('#classic-game').getBoundingClientRect();
  return {top:a.top<w.top+35&&b.top<w.top+35,separate:a.right<b.left};
 });assert.ok(positions.top&&positions.separate);
 await page.keyboard.press('Escape');await page.evaluate(()=>oakrestClassicQA.advance(.4));
 assert.equal(await page.locator('#classic-combat-target').isVisible(),false);
 assert.equal(await page.locator('#classic-player-status').isVisible(),false);
 await page.evaluate(()=>{const e=oakrestClassicQA.combatState().monsters.find(e=>e.id==='moss-a');oakrestClassicQA.teleport(e.x,e.z+1);oakrestClassicQA.advance(1);});
 assert.equal(await page.locator('#classic-player-status').isVisible(),true,'incoming aggression shows player HP without target selection');
 await page.evaluate(()=>{oakrestClassicQA.teleport(0,39);oakrestClassicQA.advance(16);});
 assert.equal(await page.locator('#classic-player-status').isVisible(),false,'HP hides after enemies return');
 const hits=await page.evaluate(async()=>{
  const {createClassicCombatFeedback}=await import('./src/classic-combat-feedback.js'),THREE=await import('three');
  const root=document.createElement('div');root.style.cssText='width:600px;height:400px';document.body.append(root);
  const f=createClassicCombatFeedback(root),c=new THREE.PerspectiveCamera(50,1.5,.1,100);c.position.set(0,3,10);c.lookAt(0,3,0);c.updateMatrixWorld();
  const s={monsters:[{id:'test',x:0,z:0}]},p={x:0,z:0};
  for(const e of [{type:'hit',damage:12},{type:'hurt',damage:7},{type:'hit',damage:0},{type:'enemy-miss'}])f.event({...e,id:'test',time:2},s,p);
  f.update(2,c);const nodes=[...root.querySelectorAll('.classic-damage')];
  const result={texts:nodes.map(n=>n.textContent),positions:new Set(nodes.map(n=>n.style.transform)).size,colours:new Set(nodes.map(n=>getComputedStyle(n).color)).size};
  f.update(4,c);result.remaining=root.querySelectorAll('.classic-damage').length;root.remove();return result;
 });
 assert.deepEqual(hits.texts,['12','−7','0','MISS']);assert.equal(hits.positions,4);assert.ok(hits.colours>=2);assert.equal(hits.remaining,0);
 // Real tap movement after the joystick is removed.
 const before=await page.evaluate(()=>oakrestClassicQA.state());
 const point=await page.evaluate(()=>{const q=oakrestClassicQA.projectWorld(3,39),b=document.querySelector('#classic-game canvas').getBoundingClientRect();return {x:b.x+(q.x+1)*b.width/2,y:b.y+(q.y+1)*b.height/2};});
 await page.touchscreen.tap(point.x,point.y);await page.evaluate(()=>oakrestClassicQA.advance(1));
 const after=await page.evaluate(()=>oakrestClassicQA.state());assert.ok(Math.hypot(after.x-before.x,after.z-before.z)>.1);
 mkdirSync('qa/issue208',{recursive:true});
 await page.evaluate(()=>{oakrestClassicQA.teleport(-1,71);oakrestClassicQA.lockMonster('practice');oakrestClassicQA.advance(.45);});
 await page.screenshot({path:'qa/issue208/combat-ipad-landscape.png'});
 await page.locator('#classic-settings-toggle').tap();
 page.once('dialog',d=>d.dismiss());await page.locator('#classic-logout').tap();assert.equal(await page.locator('#classic-creator').isVisible(),false);
 page.once('dialog',d=>d.accept());await page.locator('#classic-logout').tap();assert.equal(await page.locator('#classic-creator').isVisible(),true);
 assert.deepEqual(errors,[]);console.log('PASS issue208: HP lifecycle, target deselect, simultaneous damage/miss/zero, touch navigation/crafting, chat, circular minimap, guarded logout.');
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
