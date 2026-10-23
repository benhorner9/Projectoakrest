// #84: skeletal rig browser test, independent of live saves and combat.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'qa','skeletal-lab');
const server=spawn('python3',['-m','http.server','5293','--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});
let browser;
(async()=>{try{
 fs.mkdirSync(out,{recursive:true});await new Promise(r=>setTimeout(r,900));
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1180,height:800},hasTouch:true});
 const page=await context.newPage(),errors=[],missing=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',res=>{if(res.status()>=400)missing.push(res.url()+': '+res.status());});
 await page.goto('http://127.0.0.1:5293/rig-lab.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.oakrestRigLabQA,{timeout:25000});
 const initial=await page.evaluate(()=>JSON.stringify({...localStorage}));
 const skeleton=await page.evaluate(()=>({bones:oakrestRigLabQA.hero.skeleton.bones.length,
  skinned:oakrestRigLabQA.hero.mesh.isSkinnedMesh,clips:oakrestRigLabQA.clipNames}));
 assert.equal(skeleton.skinned,true);assert.ok(skeleton.bones>=26);assert.ok(skeleton.clips.length>=18);
 const coverage=await page.evaluate(()=>{
  const qa=window.oakrestRigLabQA,root=qa.hero.root,original=root.position.clone();
  const results=[];
  for(const spec of qa.abilityCatalogue){
   const duration=Math.max(.43,spec.anticipation+.31,spec.recovery);
   const attack={start:10,impactAt:10+spec.anticipation,interval:duration};
   qa.chooseAbility(spec.id);
   const before=qa.sampleAbility(spec.family,spec.abilityId,attack,10);
   const after=qa.sampleAbility(spec.family,spec.abilityId,attack,
     10+Math.max(.001,spec.anticipation));
   qa.hero.root.updateMatrixWorld(true);
   results.push({id:spec.id,instant:spec.instant,before:before?.contact,after:after?.contact,
    hasBones:qa.hero.skeleton.bones.every(b=>b.matrixWorld.elements.every(Number.isFinite)),
    rootStill:root.position.distanceTo(original)<.000001});
  }
  return {entries:qa.abilityCatalogue.length,results};
 });
 assert.equal(coverage.entries,56,'all live-ability specifications get independent skeletal previews');
 for(const result of coverage.results){
  assert.equal(result.before,result.instant,result.id+' must not invent premature contact');
  assert.equal(result.after,true,result.id+' should reach its actual contact point');
  assert.equal(result.hasBones,true,result.id+' finite transforms');
  assert.equal(result.rootStill,true,result.id+' no gameplay root motion');
 }
 // Critical silhouette evidence: hold actual impact frame for every style.
 for(const id of ['sword:w0','daggers:w1','greatsword:w1','bow:w1',
   'shortbow:w3','crossbow:w0','frost:w1','ember:w3']){
  await page.evaluate(id=>{
   const qa=window.oakrestRigLabQA,spec=qa.abilityCatalogue.find(s=>s.id===id);
   qa.chooseAbility(id);
   const interval=Math.max(.43,spec.anticipation+.31,spec.recovery);
   qa.sampleAbility(spec.family,spec.abilityId,
    {start:0,impactAt:spec.anticipation,interval},spec.anticipation);
  },id);
  const beforePose=await page.evaluate(()=>oakrestRigLabQA.hero.bones.get('RightUpperArm').quaternion.toArray());
  await page.screenshot({path:path.join(out,'ability-'+id.replace(':','-')+'.png')});
  const afterPose=await page.evaluate(()=>oakrestRigLabQA.hero.bones.get('RightUpperArm').quaternion.toArray());
  assert.ok(beforePose.every((n,i)=>Math.abs(n-afterPose[i])<.000001),id+' release pose must remain frozen while evidence is captured');
 }
 for(const [name,weapon] of [['Walk','none'],['SwordSlash','sword'],['GreatswordStrike','greatsword'],['DaggerCombo','dagger'],['BowDraw','bow'],['CrossbowFire','crossbow'],['StaffCast','staff'],['WandCast','wand'],['Dodge','none'],['Death','none']]){
  await page.selectOption('#clip',name);await page.selectOption('#weapon',weapon);
  await page.evaluate(name=>oakrestRigLabQA.play(name),name);
  const actual=await page.evaluate(()=>({bones:oakrestRigLabQA.hero.skeleton.bones.length,
   weapon:oakrestRigLabQA.hero.equipped,skinned:oakrestRigLabQA.hero.mesh.isSkinnedMesh}));
  assert.equal(actual.weapon,weapon);assert.equal(actual.skinned,true);
  await page.screenshot({path:path.join(out,name.toLowerCase()+'.png')});
 }
 await page.locator('#skeleton').check();await page.screenshot({path:path.join(out,'skeleton.png')});
 assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),initial,'rig lab cannot change game saves');
 assert.deepEqual(errors,[],'no JS errors');assert.deepEqual(missing,[],'no missing assets');
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({skeleton,abilityCoverage:coverage,browser:await browser.version(),errors,missing,physicalIPad:false},null,2));
 console.log('SKELETAL LAB PASS: '+skeleton.bones+' skinned joints, '+skeleton.clips.length+' clips, 10 baseline + 8 ability screenshots, all 56 ability-contact scenarios and save isolation');
 await context.close();
}catch(e){console.error(e.stack||e);process.exitCode=1;}finally{await browser?.close();server.kill();}})();
