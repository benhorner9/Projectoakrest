const assert=require('node:assert/strict'),{chromium}=require('playwright');
const {spawn}=require('node:child_process'),{mkdirSync}=require('node:fs');
const server=spawn('python3',['-m','http.server','5248','--bind','127.0.0.1'],{stdio:'ignore'});let browser;
(async()=>{try{
 await new Promise(r=>setTimeout(r,900));browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1200,height:820}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5248/classic.html?qa=1');await page.waitForFunction(()=>window.oakrestClassicQA);
 const result=await page.evaluate(async()=>{
  oakrestClassicQA.pauseAutomaticLoop();
  const {makeClassicActor,classicSpriteCacheStats}=await import('./src/classic-sprites.js');
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=800;canvas.style='position:fixed;inset:0;z-index:99999;width:1200px;height:800px';document.body.append(canvas);
  const c=canvas.getContext('2d');c.fillStyle='#182d29';c.fillRect(0,0,1200,800);c.imageSmoothingEnabled=false;c.font='16px sans-serif';
  const styles=[['melee','sword'],['melee','greatsword'],['melee','daggers'],['ranged','bow'],['ranged','crossbow'],['magic','frost']];
  const signatures=[],clipped=[];
  for(const [row,[style,weapon]] of styles.entries()){
   const actor=makeClassicActor({style,coat:'#667f78',hairstyle:'swept'});
   for(const [col,pose] of ['idle','windup','strike'].entries()){
    actor.update({style,pose,worn:{weapon},facing:{x:0,z:-1}});
    const image=actor.sprite.material.map.image;c.drawImage(image,70+col*180,row*130+5,90,120);
    signatures.push(image.toDataURL());
    if(style==='melee'){const pixels=image.getContext('2d').getImageData(0,0,image.width,image.height).data;for(let y=0;y<image.height;y++)if(pixels[(y*image.width)*4+3]||pixels[(y*image.width+image.width-1)*4+3]){clipped.push([weapon,pose]);break;}}c.fillStyle='#e1e8d8';c.fillText(style+' '+pose,35+col*180,row*130+125);
   }
   actor.dispose();
  }
  // Stress creator changes and release temporary portrait actors.
  for(let i=0;i<400;i++){
   const a=makeClassicActor({coat:'#'+(0x400000+i).toString(16)});a.dispose();
  }
  return {distinct:new Set(signatures).size,count:signatures.length,clipped,cache:classicSpriteCacheStats()};
 });
 assert.deepEqual(result.clipped,[],'weapon silhouettes fit the sprite canvas');
 assert.equal(result.distinct,result.count,'every weapon/pose has distinct presentation');
 assert.ok(result.cache.textures<=256,JSON.stringify(result));assert.deepEqual(errors,[]);
 mkdirSync('qa/rebirth',{recursive:true});await page.screenshot({path:'qa/rebirth/weapon-poses.png'});
 console.log('PASS: 18 weapon action poses, connected shared rig and bounded disposed creator texture cache',result);
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
