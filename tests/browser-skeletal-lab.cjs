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
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({skeleton,browser:await browser.version(),errors,missing,physicalIPad:false},null,2));
 console.log('SKELETAL LAB PASS: '+skeleton.bones+' skinned joints, '+skeleton.clips.length+' clips, 10 family screenshots and save isolation');
 await context.close();
}catch(e){console.error(e.stack||e);process.exitCode=1;}finally{await browser?.close();server.kill();}})();
