// Visual Block 4 integration: real Classic browser + isolated authoritative-state presentation.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {resolve,join}=require('node:path');
const {mkdirSync,writeFileSync}=require('node:fs');
const root=resolve(__dirname,'..'),out=join(root,'qa','visual-block4');
mkdirSync(out,{recursive:true});
const server=spawn('python3',['-m','http.server','5299','--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});
let browser;
(async()=>{try{
 await new Promise(r=>setTimeout(r,900));
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1194,height:834},hasTouch:true,deviceScaleFactor:1});
 const {defaultSave}=await import('../src/rules.js');
 await context.addInitScript(save=>{
  localStorage.setItem('oakrest-v1',JSON.stringify(save));
  let qa;Object.defineProperty(window,'oakrestClassicQA',{configurable:true,
   get:()=>qa,set:v=>{qa=v;v?.pauseAutomaticLoop?.();}});
 },defaultSave());
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5299/classic.html?qa=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.oakrestClassicQA,null,{timeout:30000});
 // Check presentation independently so combat simulation events cannot accidentally be retimed.
 const prior=await page.evaluate(()=>JSON.stringify(oakrestClassicQA.persistentSnapshot()));
 const visuals=await page.evaluate(async()=>{
  const THREE=await import('three');
  const {createClassicCombatView}=await import('./src/classic-combat-view.js');
  const defs=[
   {id:'qa-moss',type:'mossling',name:'Mossling',level:2,x:0,z:0,maxHp:100},
   {id:'qa-boar',type:'boar',name:'Field Boar',level:5,x:4,z:1,maxHp:100},
   {id:'guardian',type:'mossling',name:'Bramble Guardian',level:9,x:8,z:0,maxHp:100},
   {id:'qa-keeper',type:'mossling',name:'Woodland Keeper',boss:true,level:12,x:12,z:0,maxHp:100},
   {id:'qa-bandit',type:'bandit',name:'Forest Bandit',level:8,x:16,z:0,maxHp:100},
   {id:'qa-dummy',type:'dummy',name:'Training Dummy',level:1,x:20,z:0,maxHp:100}
  ];
  const scene=new THREE.Scene(),view=createClassicCombatView(scene,defs);
  const monsters=defs.map(d=>({...d,hp:d.maxHp,dead:false,hidden:false,aggro:false,
   warning:null,hitFlashUntil:0,releaseUntil:0}));
  monsters[0].x=.8; // genuine positional movement supplied by simulation
  monsters[1].warning={kind:'charge',width:1.2,length:6,x:4,z:1,
   direction:{x:0,z:1},startedAt:.6,end:1.6};
  monsters[2].hitFlashUntil=1.4;
  monsters[3].dead=true;monsters[3].deathAt=.8;
  monsters[4].warning={kind:'cleave',radius:3.25,halfAngle:.69,x:16,z:0,
   direction:{x:0,z:1},startedAt:.4,end:1.6};
  const projectiles=[
   {style:'magic',family:'ember',name:'Firebolt',x:2,z:1,direction:{x:1,z:0}},
   {style:'magic',family:'frost',effect:'ice-shard',name:'Frozen Binding',x:4,z:4,direction:{x:0,z:1}},
   {style:'ranged',effect:'piercing-arrow',name:'Focus Shot',x:5,z:4,direction:{x:1,z:0}}
  ];
  const state={time:1,monsters,projectiles,target:null};
  const immutable=JSON.stringify(state);
  view.update(state,undefined,{x:0,z:-1});
  const active=view.stats();
  if(JSON.stringify(state)!==immutable)throw Error('rendering must not mutate any combat state');
  const visualActors=Object.fromEntries(active.actors.map(a=>[a.id,a]));
  const warnings=[...scene.children].filter(n=>n.userData?.startedAt!==undefined);
  const outlineCount=warnings.filter(n=>n.userData.edge?.type==='LineLoop').length;
  const boundarySizes=warnings.map(w=>w.userData.edge.geometry.attributes.position.count);
  const hasAllMaterials=projectiles.every(p=>active.projectiles.visualKinds.includes(
   p.style==='ranged'?'piercing':p.family==='ember'?'ember':'ice-shard'));
  if(!hasAllMaterials)throw Error('distinct real ammo and spell visuals missing');
  const result={active,poses:visualActors,outlines:outlineCount,boundarySizes};
  for(const e of monsters){e.warning=null;e.hitFlashUntil=0;e.releaseUntil=0;e.dead=false;}
  view.update({time:4,monsters,projectiles:[],target:null},undefined,{x:0,z:-1});
  result.cleared=view.stats();
  view.dispose();
  result.objectsAfterDispose=scene.children.length;
  return result;
 });
 assert.equal(visuals.active.actors.length,6);
 assert.equal(visuals.poses['qa-boar'].pose,'brace');
 assert.equal(visuals.poses['guardian'].pose,'hurt');
 assert.equal(visuals.poses['qa-keeper'].pose,'fall');
 assert.equal(visuals.poses['qa-bandit'].kind,'humanoid');
 assert.equal(visuals.active.warnings,2);
 assert.equal(visuals.outlines,2,'real attack shapes have crisp visible boundaries');
 assert.ok(visuals.boundarySizes.every(n=>n>=4));
 assert.equal(visuals.active.projectiles.visible,3);
 assert.ok(visuals.active.creatures.textures<=visuals.active.creatures.limit,'finite texture atlas');
 assert.equal(visuals.cleared.warnings,0);
 assert.equal(visuals.cleared.projectiles.visible,0);
 assert.equal(visuals.objectsAfterDispose,0,'all temporary art and warning meshes are released');
 assert.equal(await page.evaluate(()=>JSON.stringify(oakrestClassicQA.persistentSnapshot())),prior,
  'render-only tests must never grant, alter or save player data');
 await page.evaluate(()=>{oakrestClassicQA.teleport(-12,88);oakrestClassicQA.advance(.8);});
 const live=await page.evaluate(()=>oakrestClassicQA.combatPresentation());
 assert.ok(live.creatures.textures<=live.creatures.limit);
 await page.screenshot({path:join(out,'classic-combat-ipad.png')});
 assert.deepEqual(errors,[],'no renderer runtime exceptions on iPad-size touch Chromium');
 writeFileSync(join(out,'visual-qa.json'),JSON.stringify({platform:'Touch Chromium, not physical iPad Safari',visuals,live,errors},null,2));
 console.log('PASS Visual Block 4: distinct species, 6 poses, exact attack boundaries, magic and arrow art, bounded resources, unchanged saves.');
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
