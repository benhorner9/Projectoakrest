// Actual in-browser directional sprite sprites, 1194x834 touch viewport.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {resolve,join}=require('node:path');
const {mkdirSync,writeFileSync}=require('node:fs');
const root=resolve(__dirname,'..'),out=join(root,'qa','visual-block2');
mkdirSync(out,{recursive:true});
const server=spawn('python3',['-m','http.server','5287','--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});
let browser;
const record={browser:'touch Chromium at 1194x834, not physical iPad Safari',errors:[]};
(async()=>{try{
 await new Promise(ok=>setTimeout(ok,1000));
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const ctx=await browser.newContext({viewport:{width:1194,height:834},hasTouch:true,deviceScaleFactor:1});
 const page=await ctx.newPage();page.on('pageerror',e=>record.errors.push(e.message));
 await page.goto('http://127.0.0.1:5287/classic.html?qa=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.oakrestClassicQA,null,{timeout:30000});
 assert.equal(await page.locator('#classic-creator').isVisible(),true);
 await page.locator('select[name="sex"]').selectOption('female');
 await page.locator('select[name="hairstyle"]').selectOption('ponytail');
 await page.locator('select[name="outfit"]').selectOption('scholar');
 const original=await page.locator('#classic-creator-preview').evaluate(el=>el.toDataURL());
 await page.locator('#classic-creator-turn').tap();
 const turned=await page.locator('#classic-creator-preview').evaluate(el=>el.toDataURL());
 assert.notEqual(turned,original,'rotating creator character must change the real preview');
 assert.match(await page.locator('#classic-creator-preview-heading').textContent(),/FRONT-RIGHT/);
 const result=await page.evaluate(async()=>{
  const {makeClassicActor,classicSpriteCacheStats}=await import('./src/classic-sprites.js');
  const pane=document.createElement('canvas');pane.width=1150;pane.height=810;
  pane.style='position:fixed;inset:0;z-index:99999;background:#213a30';
  document.body.append(pane);const g=pane.getContext('2d');
  g.fillStyle='#213a30';g.fillRect(0,0,pane.width,pane.height);g.imageSmoothingEnabled=false;
  const signature=(image)=>{
   const pixels=image.getContext('2d').getImageData(0,0,image.width,image.height).data;
   let hash=2166136261;
   for(let i=0;i<pixels.length;i++)hash=Math.imul(hash^pixels[i],16777619);
   return hash>>>0;
  };
  const make=(worn,style='melee',pose='idle',sex='female',step=0)=>{
   const a=makeClassicActor({sex,coat:'#547a68',skin:'#dcaf88',
    hair:'#765037',hairstyle:'ponytail',outfit:'scholar'});
   a.update({style,pose,step,worn,facing:{x:0,z:-1}});
   const image=a.sprite.material.map.image,hash=signature(image);
   const pixels=image.getContext('2d').getImageData(0,0,image.width,image.height).data;
   let clipped=false;
   for(let y=0;y<image.height;y++)if(pixels[(y*image.width)*4+3]||pixels[(y*image.width+image.width-1)*4+3]){clipped=true;break;}
   a.dispose();return {hash,image,clipped};
  };
  const base=make({},'melee'),magicBare=make({},'magic'),rangedBare=make({},'ranged');
  const styles=[
   {name:'RECRUIT',style:'melee',gear:{helm:'recruit-helm',chest:'starter-mail',legs:'recruit-greaves',boots:'recruit-boots',weapon:'sword',offhand:'recruit-shield'}},
   {name:'SCOUT',style:'ranged',gear:{helm:'scout-hood',chest:'starter-leather',legs:'scout-chaps',boots:'scout-boots',weapon:'bow',arrows:'bronze-arrows'}},
   {name:'APPRENTICE',style:'magic',gear:{helm:'apprentice-hood',chest:'starter-robes',legs:'apprentice-leggings',boots:'apprentice-boots',weapon:'frost',offhand:'apprentice-orb'}}
  ];
  const stats={bare:[base.hash,magicBare.hash,rangedBare.hash],styles:[],clipped:[],poseHashes:[]};
  g.font='14px Georgia';g.fillStyle='#f7e8c8';
  for(let row=0;row<styles.length;row++){
   const s=styles[row];g.fillText(s.name,12,50+row*215);
   for(let i=0;i<8;i++){
    const actor=makeClassicActor({sex:'female',coat:'#547a68',skin:'#dcaf88',
     hair:'#765037',hairstyle:'ponytail',outfit:'scholar'});
    actor.update({style:s.style,worn:s.gear,facing:{x:Math.sin(i*Math.PI/4),z:-Math.cos(i*Math.PI/4)}});
    const img=actor.sprite.material.map.image;
    g.drawImage(img,60+i*130,25+row*215,100,140);
    actor.dispose();
   }
   const held=make(s.gear,s.style);
   stats.styles.push({name:s.name,hash:held.hash,distinct:held.hash!==base.hash});
  }
  const poses=['idle','prepare','windup','swing','strike','follow','recover'];
  for(const pose of poses){
   const item=make({weapon:'greatsword',chest:'starter-mail'},'melee',pose);
   stats.poseHashes.push(item.hash);
   if(item.clipped)stats.clipped.push(pose);
  }
  stats.tiers=['bronze','iron','steel','verdite','safferite','cobalt','pryrite']
    .map(tier=>make({weapon:tier+'-sword',chest:tier+'-mail'},'melee').hash);
  stats.motions=[0,1,2].map(step=>make({},'melee','idle','female',step).hash);
  for(let i=0;i<300;i++)makeClassicActor({coat:'#'+(0x400000+i).toString(16)}).dispose();
  stats.cache=classicSpriteCacheStats();
  return stats;
 });
 record.art=result;
 assert.equal(new Set(result.bare).size,1,'unarmed empty styles may not invent different gear');
 assert.ok(result.styles.every(x=>x.distinct),'every genuine equipped set must visibly differ from bare');
 assert.equal(new Set(result.styles.map(x=>x.hash)).size,3,'three armour styles must be distinct');
 assert.equal(new Set(result.poseHashes).size,7,'every combat pose must be recognizable');
 assert.equal(new Set(result.tiers).size,7,'all seven mining/crafting metal tiers must differ');
 assert.equal(new Set(result.motions).size,3,'idle, first stride and second stride must be distinct');
 assert.deepEqual(result.clipped,[],'greatsword action silhouette must remain inside sprite canvas');
 assert.ok(result.cache.textures<=256,JSON.stringify(result.cache));
 assert.deepEqual(record.errors,[]);
 await page.screenshot({path:join(out,'armour-and-direction-lineup.png')});
 writeFileSync(join(out,'visual-qa.json'),JSON.stringify(record,null,2));
 console.log('PASS Oakrest Visual Block 2: creator, 8 directions, real worn gear, tiers, 7 action poses, cache budget, no phantom items.');
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
