// iPad-sized browser acceptance: creator, personal base outfit and independent gear.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {resolve}=require('node:path');
const server=spawn('python3',['-m','http.server','5191','--bind','127.0.0.1'],
 {cwd:resolve(__dirname,'..'),stdio:'ignore'});
let browser;
(async()=>{
 try{
  await new Promise(r=>setTimeout(r,1050));
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1180,height:600},hasTouch:true,isMobile:false});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const url='http://127.0.0.1:5191/classic.html?qa=1';
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.oakrestClassicQA,{timeout:30000});
  assert.equal(await page.locator('#classic-creator').isVisible(),true);
  const before=await page.locator('#classic-creator-preview').evaluate(canvas=>{
   const bytes=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
   return bytes.reduce((sum,byte)=>(sum+byte)>>>0,0);
  });
  await page.locator('select[name="hairstyle"]').selectOption('long');
  await page.locator('select[name="outfit"]').selectOption('scholar');
  await page.locator('#classic-creator-outfit label').nth(3).click();
  const after=await page.locator('#classic-creator-preview').evaluate(canvas=>{
   const bytes=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
   return bytes.reduce((sum,byte)=>(sum+byte)>>>0,0);
  });
  assert.notEqual(after,before,'creation controls visibly change the sprite portrait');
  await page.locator('#classic-creator-name').fill('Rhea Dawn');
  await page.locator('.classic-creator-submit').click();
  await page.waitForFunction(()=>window.oakrestClassicQA?.characterCreatorState().appearance?.name==='Rhea Dawn',{timeout:30000});
  assert.equal(await page.locator('#classic-creator').isVisible(),false);
  assert.equal(await page.locator('#classic-name').textContent(),'Rhea Dawn');
  let state=await page.evaluate(()=>{
   const id=localStorage.getItem('oakrest-active-character');
   return JSON.parse(localStorage.getItem('oakrest-character-save-'+id));
  });
  assert.equal(state.onboarding.area,'world');
  for(const style of ['melee','magic','ranged'])assert.equal(state.gear[style],'none');
  const initial=await page.evaluate(()=>oakrestClassicQA.heroPixelSignature());
  const switchTo=async style=>{
   await page.evaluate(style=>oakrestClassicQA.switchStyle(style),style);
   await page.evaluate(()=>{for(let i=0;i<10;i++)oakrestClassicQA.step(.05);});
   assert.equal(await page.evaluate(()=>oakrestClassicQA.state().style),style);
   return page.evaluate(()=>oakrestClassicQA.heroPixelSignature());
  };
  assert.equal(await switchTo('magic'),initial,'Magic without gear keeps the base outfit');
  assert.equal(await switchTo('ranged'),initial,'Ranged without gear keeps the base outfit');
  // Supply only melee equipment via the actual profile save, not via the UI.
  // Other style loadouts must still render the unaltered base avatar.
  await page.evaluate(()=>{
   const id=localStorage.getItem('oakrest-active-character'),key='oakrest-character-save-'+id;
   const s=JSON.parse(localStorage.getItem(key));
   s.inventory.weapons.melee=['sword'];s.gear.melee='sword';
   s.inventory.slotted=['recruit-helm'];s.equipment.melee.helm='recruit-helm';
   localStorage.setItem(key,JSON.stringify(s));
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.oakrestClassicQA,{timeout:30000});
  state=await page.evaluate(()=>oakrestClassicQA.wornVisual());
  assert.equal(state.helm,'recruit-helm');
  assert.equal(state.weapon,'sword');
  const melee=await page.evaluate(()=>oakrestClassicQA.heroPixelSignature());
  assert.notEqual(melee,initial,'actual equipped melee items visibly change silhouette');
  assert.equal(await switchTo('magic'),initial,'melee equipment never leaks into Magic');
  assert.equal(await switchTo('ranged'),initial,'melee equipment never leaks into Ranged');
  await page.locator('#classic-settings-toggle').click();
  await page.locator('#classic-characters-open').click();
  assert.equal(await page.locator('#classic-creator').isVisible(),true);
  assert.match(await page.locator('#classic-creator-roster').textContent(),/Rhea Dawn/);
  assert.deepEqual(errors,[],'no browser exceptions during creation, reload or switching');
  console.log('Classic creator and worn-gear browser QA passed.');
  await context.close();
 }catch(e){console.error(e);process.exitCode=1;}
 finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);server.kill();process.exitCode=1;});
