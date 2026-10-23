import * as THREE from 'three';
import {validSave,defaultSave,STYLE_ORDER} from './rules.js';
import {readCharacters} from './characters.js';
import {storageKey} from './storage-key.js';
import {installGameZoomGuard} from './touch-gestures.js';
import {CLASSIC_CAMERA,CLASSIC_NPCS,clamp,findClassicPath,occupantBuilding,
 presentationSnapshot,slideMove} from './classic-presentation.js';
import {createClassicVillage} from './classic-village.js';
import {makeClassicActor,makeGroundShadow} from './classic-sprites.js';

const $=id=>document.getElementById(id);
const root=$('classic-game'),keys=new Set();
installGameZoomGuard(document);
function readExistingCharacter(){
 // Read-only access to the same browser-local character and dev/public
 // namespace as index.html. This prototype never calls setItem/removeItem.
 const key=k=>storageKey(k,location.pathname);
 try{
  const roster=readCharacters(localStorage,key('oakrest-characters-v1'));
  const active=roster.find(x=>x.id===localStorage.getItem(key('oakrest-active-character')));
  const content=active?localStorage.getItem(key('oakrest-character-save-'+active.id)):
   localStorage.getItem(key('oakrest-v1'));
  if(!content)return {profile:active||null,save:defaultSave(),existing:false};
  return {profile:active||null,save:validSave(JSON.parse(content)),existing:true};
 }catch{return {profile:null,save:defaultSave(),existing:false};}
}
const existing=readExistingCharacter();
let style='melee',zoom=1,frame=0,walkClock=0,look={x:0,z:1},path=[],targetNpc=null;
const player={x:0,z:39},input={x:0,z:0},npcActors=[];
let lastInside=null;
const scene=new THREE.Scene();
scene.background=new THREE.Color('#b4c9ad');
scene.fog=new THREE.Fog('#b4c9ad',75,160);
scene.add(new THREE.HemisphereLight('#fff1d4','#657f68',2.1));
const sun=new THREE.DirectionalLight('#ffedc8',2.2);sun.position.set(-27,55,36);scene.add(sun);
let renderer;
try{
 renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',alpha:false});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 root.append(renderer.domElement);
}catch(err){
 $('classic-error').hidden=false;
 throw err;
}
const camera=new THREE.OrthographicCamera(-20,20,20,-20,.1,270);
const raycaster=new THREE.Raycaster(),groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
const village=createClassicVillage(scene);
const hero=makeClassicActor({
 style,skin:existing.profile?.skinTone||'#d9ad87',
 hair:existing.profile?.hairColor||'#493529'
});
const heroShadow=makeGroundShadow();
scene.add(hero.sprite,heroShadow);
for(const npc of CLASSIC_NPCS){
 const colour=npc.colour;
 const actor=makeClassicActor({style:'melee',coat:colour,skin:'#dbaf8d',hair:npc.role==='guard'?'#4b3029':'#72533c',npc:true});
 const shadow=makeGroundShadow();
 scene.add(actor.sprite,shadow);
 actor.sprite.position.set(npc.x,.08,npc.z);
 shadow.position.set(npc.x,.04,npc.z);
 npcActors.push({...npc,actor,shadow});
}
const toastName=$('classic-dialogue-name'),toastText=$('classic-dialogue-text'),dialogue=$('classic-dialogue');
function speak(npc){
 toastName.textContent=npc.name;toastText.textContent=npc.message;dialogue.hidden=false;
}
$('classic-dialogue-close').addEventListener('click',()=>{dialogue.hidden=true;});
function refreshHud(){
 const shot=presentationSnapshot(existing.save,style,player);
 $('classic-name').textContent=existing.profile?.name||'The Wanderer';
 $('classic-combat').textContent=shot.combatLevel;
 $('classic-vitality').textContent=shot.vitality;
 $('classic-weapon').textContent=shot.weaponName;
 $('classic-level').textContent=shot.styleLevel;
 for(const button of document.querySelectorAll('[data-style]')){
  const on=button.dataset.style===style;
  button.classList.toggle('active',on);button.setAttribute('aria-pressed',String(on));
 }
 hero.update({facing:look,style,worn:shot.worn});
}
function switchStyle(which){
 if(!STYLE_ORDER.includes(which))return;
 style=which;refreshHud();
}
for(const button of document.querySelectorAll('[data-style]'))
 button.addEventListener('click',()=>switchStyle(button.dataset.style));
function updateLocation(){
 const building=occupantBuilding(player.x,player.z);
 const id=building?.id||null;
 if(id!==lastInside){lastInside=id;village.updateCutaway(id);}
 $('classic-location').textContent=building
  ?building.kind==='bank'?'Oakrest Bank':building.kind==='store'?'General Store':
   building.kind==='forester'?'Forester Lodge':building.kind==='trade'?'Trade Hall':building.id.replace(/-/g,' ')
  :'Oakrest Village';
 $('classic-inside').textContent=building
  ?'You are indoors. The roof is hidden so you can explore the interior.'
  :'Walk through a real doorway to reveal the interior.';
}
function resize(){
 const width=Math.max(1,innerWidth),height=Math.max(1,innerHeight),aspect=width/height,half=CLASSIC_CAMERA.viewHeight/2/zoom;
 camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;
 camera.updateProjectionMatrix();renderer.setSize(width,height,false);
}
function setZoom(next){zoom=clamp(next,CLASSIC_CAMERA.minZoom,CLASSIC_CAMERA.maxZoom);resize();}
$('classic-zoom-in').addEventListener('click',()=>setZoom(zoom+.12));
$('classic-zoom-out').addEventListener('click',()=>setZoom(zoom-.12));
root.addEventListener('wheel',e=>{e.preventDefault();setZoom(zoom+(e.deltaY<0?.08:-.08));},{passive:false});
addEventListener('resize',resize);resize();
function destinationAt(clientX,clientY){
 const bounds=renderer.domElement.getBoundingClientRect();
 const nx=(clientX-bounds.left)/bounds.width*2-1,ny=1-(clientY-bounds.top)/bounds.height*2;
 raycaster.setFromCamera(new THREE.Vector2(nx,ny),camera);
 const point=new THREE.Vector3();
 if(!raycaster.ray.intersectPlane(groundPlane,point))return null;
 return {x:point.x,z:point.z};
}
function queueDestination(goal){
 if(!goal)return;
 const npc=CLASSIC_NPCS.find(n=>Math.hypot(n.x-goal.x,n.z-goal.z)<3.5);
 const target=npc?{x:npc.x,z:npc.z}:goal;
 targetNpc=npc||null;
 path=findClassicPath(player,target);
 if(npc&&Math.hypot(npc.x-player.x,npc.z-player.z)<3.25){path=[];speak(npc);targetNpc=null;}
}
let canvasDown=null;
renderer.domElement.addEventListener('pointerdown',e=>{
 if(e.button!==0)return;
 canvasDown={id:e.pointerId,x:e.clientX,y:e.clientY};
},{passive:true});
renderer.domElement.addEventListener('pointerup',e=>{
 if(!canvasDown||e.pointerId!==canvasDown.id)return;
 const down=canvasDown;canvasDown=null;
 if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>13)return;
 dialogue.hidden=true;queueDestination(destinationAt(e.clientX,e.clientY));
});
renderer.domElement.addEventListener('pointercancel',()=>{canvasDown=null;});
const joy=$('classic-joystick'),stick=$('classic-stick');
let joystickId=null;
function updateStick(clientX,clientY){
 const box=joy.getBoundingClientRect(),cx=box.left+box.width/2,cy=box.top+box.height/2;
 const dx=clientX-cx,dy=clientY-cy,len=Math.hypot(dx,dy),radius=box.width*.36;
 const ux=dx/Math.max(1,len),uy=dy/Math.max(1,len),amount=clamp(len/radius,0,1);
 input.x=ux*amount;input.z=uy*amount;
 stick.style.transform=`translate(${ux*Math.min(radius,len)}px,${uy*Math.min(radius,len)}px)`;
}
joy.addEventListener('pointerdown',e=>{e.preventDefault();joystickId=e.pointerId;joy.setPointerCapture(e.pointerId);updateStick(e.clientX,e.clientY);path=[];targetNpc=null;});
joy.addEventListener('pointermove',e=>{if(e.pointerId===joystickId)updateStick(e.clientX,e.clientY);});
function releaseJoy(e){if(joystickId===e.pointerId){joystickId=null;input.x=0;input.z=0;stick.style.transform='';}}
joy.addEventListener('pointerup',releaseJoy);joy.addEventListener('pointercancel',releaseJoy);
document.addEventListener('keydown',e=>{
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab','Space'].includes(e.key))e.preventDefault();
 keys.add(e.key.toLowerCase());
 if(e.repeat)return;
 if(e.key==='Tab')switchStyle(STYLE_ORDER[(STYLE_ORDER.indexOf(style)+1)%3]);
 if(['1','2','3'].includes(e.key))switchStyle(STYLE_ORDER[Number(e.key)-1]);
 if(e.key==='Escape')dialogue.hidden=true;
});
document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
addEventListener('blur',()=>{keys.clear();input.x=0;input.z=0;path=[];targetNpc=null;stick.style.transform='';});
function moveGame(dt){
 const x=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'))+input.x;
 const z=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'))+input.z;
 let dx=x,dz=z;
 const speed=5.3;
 if(Math.hypot(dx,dz)>.12){
  path=[];targetNpc=null;
 }else if(path.length){
  const next=path[0],dist=Math.hypot(next.x-player.x,next.z-player.z);
  if(dist<.33){path.shift();}
  else{dx=(next.x-player.x)/dist;dz=(next.z-player.z)/dist;}
 }
 const length=Math.hypot(dx,dz),moving=length>.12;
 if(moving){
  dx/=length;dz/=length;
  const result=slideMove(player,dx*dt*speed,dz*dt*speed);
  const vx=result.x-player.x,vz=result.z-player.z,moved=Math.hypot(vx,vz)>.0002;
  player.x=result.x;player.z=result.z;
  if(moved){look={x:vx,z:vz};walkClock+=dt;}
  else if(path.length)path=[];
 }else{walkClock=0;}
 if(targetNpc&&Math.hypot(targetNpc.x-player.x,targetNpc.z-player.z)<3.25){
  speak(targetNpc);targetNpc=null;path=[];
 }
 hero.sprite.position.set(player.x,.08,player.z);
 heroShadow.position.set(player.x,.04,player.z);
 const worn=presentationSnapshot(existing.save,style,player).worn;
 hero.update({facing:look,step:!moving?0:1+Math.floor(walkClock/.17)%2,style,worn});
 updateLocation();
}
function draw(dt){
 moveGame(dt);
 for(const [i,n] of npcActors.entries()){
  n.actor.update({facing:{x:Math.cos(i*1.3),z:Math.sin(i*1.3)},step:0,style:'melee'});
 }
 const follow=.14;const target=new THREE.Vector3(player.x+CLASSIC_CAMERA.offsetX,CLASSIC_CAMERA.elevation,player.z+CLASSIC_CAMERA.offsetZ);
 camera.position.lerp(target,1-Math.pow(1-follow,Math.max(1,dt*60)));
 camera.lookAt(player.x,0,player.z);
 renderer.render(scene,camera);
}
let last=performance.now();
function tick(time){
 requestAnimationFrame(tick);if(document.hidden){last=time;return;}
 const dt=clamp((time-last)/1000,0,.06);last=time;frame++;
 draw(dt);
}
updateLocation();refreshHud();
camera.position.set(player.x+CLASSIC_CAMERA.offsetX,CLASSIC_CAMERA.elevation,player.z+CLASSIC_CAMERA.offsetZ);
camera.lookAt(player.x,0,player.z);
requestAnimationFrame(tick);
const isQa=new URLSearchParams(location.search).has('qa')&&
 (['localhost','127.0.0.1'].includes(location.hostname)||/^\/oakrest-dev(?:\/|$)/.test(location.pathname));
if(isQa)window.oakrestClassicQA={
 state:()=>({x:player.x,z:player.z,style,interior:occupantBuilding(player.x,player.z)?.id||null,
  pathLength:path.length,hasSavedProfile:existing.existing,npcCount:npcActors.length,roofHidden:!!occupantBuilding(player.x,player.z)&&village.roofs.find(x=>x.id===occupantBuilding(player.x,player.z)?.id)?.roofs.visible===false,
  combatLevel:presentationSnapshot(existing.save,style,player).combatLevel}),
 step:dt=>draw(clamp(dt,0,.1)),moveTo:(x,z)=>queueDestination({x,z}),
 teleport:(x,z)=>{if(!Number.isFinite(x)||!Number.isFinite(z))return;player.x=x;player.z=z;path=[];targetNpc=null;draw(0);},switchStyle,
 savedState:()=>JSON.stringify(existing.save)
};
