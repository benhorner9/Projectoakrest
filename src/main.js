import * as THREE from 'three';
import { storageKey } from './storage-key.js';
import { STYLE_ORDER,STYLE_COLOURS,LOADOUTS,XP_BY_MOB,nextStyle,levelFromXp,maxHealth,damageAfterArmour,meleeTarget,clamp,defaultSave,validSave,freshCharacterSave,xpProgress,combatLevelFromXp,ARMOUR,SKILLS_OVERVIEW,skillMilestones,awardTrainingGear,ownsWeapon,ownsArmour,skillCatalogue,equippedSkills,equipSkill,canEquipWeapon,canEquipArmour,slotFamily,outgoingMultiplier,defenceFor } from './rules.js';
import { stickFromOffset, cameraKeyDirection, cameraSensitivity, attackDragDelta } from './controls.js';
import { installGameZoomGuard } from './touch-gestures.js';
import { ENEMY_PATTERNS, ENEMY_COMBAT, enemyBehaviour, enemyThreatTier, isThreatened, combatAim, MATERIAL_DROPS, grantMonsterMaterial } from './combat-feel.js';
import { basicAttackReady, attackCooldown, projectileTravel, weaponDisplay } from './attack-rules.js';
import { createOakrestScenery } from './visual-world.js';
import { createCombatVisuals } from './combat-visuals.js';
import { damp, dampAngle, smoothMotion } from './motion.js';
import { createTerrain,terrainHeight,groundScenery,moveOnGround,blocked,safeCamera,addWorldObstacle,segmentWorldHit } from './terrain.js';
import { createActor,equipActor,applyCharacterAppearance,animateActor,createCreature,animateCreature } from './actors.js';
import { readCharacters,createCharacter } from './characters.js';
import { setupCharacterCreator } from './character-creator.js';
import { cottageModel,treeModel,addLandmarks,batchScenery } from './environment.js';
import { segmentHit,dodgeDirection,weaponComparison } from './gameplay-math.js';
import { createAudio } from './audio.js';
import { MAX_GROUND_LOOT,createMonsterDrops,closestDrop,collectDrop,lootName } from './loot.js';

const $=id=>document.getElementById(id);
const oakrestKey=key=>storageKey(key,location.pathname);
const isTouch=matchMedia('(hover:none), (pointer:coarse)').matches || navigator.maxTouchPoints > 0;
document.documentElement.classList.toggle('touch-enabled',isTouch);
// Suppress Safari page zoom while keeping gameplay multitouch working.
installGameZoomGuard(document);
// Reuse the existing weapon ability buttons inside a right-thumb arc on touch devices.
if(isTouch) $('touch-skill-dock').appendChild($('skills'));
let gameTime=0;const now=()=>gameTime;const audio=createAudio();
const rand=(seed)=>{let s=seed;return ()=>{s=(s*16807)%2147483647;return (s-1)/2147483646;};};
const random=rand(27184);
const scene=new THREE.Scene();scene.background=new THREE.Color('#a9c8b7');scene.fog=new THREE.Fog('#a9c8b7',32,105);
let renderer,quality='balanced';try{quality=localStorage.getItem(oakrestKey('oakrest-quality'))||'balanced';}catch{}if(!['low','balanced','high'].includes(quality))quality='balanced';
try { renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,isTouch?1.45:1.85));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;$('game').appendChild(renderer.domElement); }
catch(err){$('error').hidden=false;throw err;}
function applyQuality(value){quality=value;renderer.setPixelRatio(Math.min(devicePixelRatio,{low:1,balanced:1.35,high:1.8}[quality]));renderer.shadowMap.enabled=quality!=='low';renderer.setSize(innerWidth,innerHeight);try{localStorage.setItem(oakrestKey('oakrest-quality'),quality);}catch{}}applyQuality(quality);$('quality').value=quality;$('quality').addEventListener('change',e=>applyQuality(e.target.value));$('sound-enabled').addEventListener('change',e=>{audio.setEnabled(e.target.checked);audio.unlock();});
const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.1,150);
const sun=new THREE.DirectionalLight('#ffdfad',2.1);sun.position.set(-26,45,20);sun.castShadow=true;sun.shadow.mapSize.set(isTouch?1024:2048,isTouch?1024:2048);sun.shadow.camera.left=-36;sun.shadow.camera.right=36;sun.shadow.camera.top=36;sun.shadow.camera.bottom=-36;sun.shadow.normalBias=.045;scene.add(sun);
scene.add(new THREE.AmbientLight('#dae5da',.40));
const hemi=new THREE.HemisphereLight('#d4e6e4','#747350',1.05);scene.add(hemi);
const MAT={ground:new THREE.MeshLambertMaterial({color:'#73956e',flatShading:true}),road:new THREE.MeshLambertMaterial({color:'#baa889',flatShading:true}),wood:new THREE.MeshLambertMaterial({color:'#79543a'}),woodLight:new THREE.MeshLambertMaterial({color:'#ac7951'}),stone:new THREE.MeshLambertMaterial({color:'#a1a399'}),roof:new THREE.MeshLambertMaterial({color:'#775c56'}),roof2:new THREE.MeshLambertMaterial({color:'#57685a'}),grass:new THREE.MeshLambertMaterial({color:'#547a53'}),leaves:new THREE.MeshLambertMaterial({color:'#436949'}),leaves2:new THREE.MeshLambertMaterial({color:'#648456'}),gold:new THREE.MeshLambertMaterial({color:'#e4bd72'}),black:new THREE.MeshLambertMaterial({color:'#171f1f'}),eye:new THREE.MeshBasicMaterial({color:'#edead6'}),water:new THREE.MeshLambertMaterial({color:'#759e9b'})};
const playerColours={melee:'#ae6954',magic:'#597ba0',ranged:'#627e51'};
const boxGeom=new THREE.BoxGeometry(1,1,1), ballGeom=new THREE.SphereGeometry(1,9,7);
function mat(color){return new THREE.MeshLambertMaterial({color});}
function put(parent,geo,material,x,y,z,sx=1,sy=1,sz=1,shadow=true){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=shadow;m.receiveShadow=shadow;parent.add(m);return m;}
function block(parent,x,y,z,sx,sy,sz,m){return put(parent,boxGeom,m,x,y,z,sx,sy,sz);}
function ball(parent,x,y,z,sx,sy,sz,m){return put(parent,ballGeom,m,x,y,z,sx,sy,sz);}
function cylinder(parent,x,y,z,r,h,m){return put(parent,new THREE.CylinderGeometry(r,r,h,8),m,x,y,z);}
const ground=createTerrain(THREE,scene);
let treeIndex=0;function tree(x,z,height=1){scene.add(treeModel(x,z,height,treeIndex++));addWorldObstacle({x,z,r:.3*height,height:3.3*height});}
for(let i=0;i<90;i++){let x=(random()-.5)*112,z=(random()-.5)*112;if(Math.abs(x)<11&&z>-38&&z<35)continue;if(Math.hypot(x,z)<12)continue;tree(x,z,.68+random()*.52);}
let houseIndex=0;function cottage(x,z){scene.add(cottageModel(x,z,houseIndex++));}
cottage(-14,12);cottage(14,8,MAT.roof2);cottage(-14,28,MAT.roof2);cottage(14,27);
function fence(x,z,len){for(let i=0;i<len;i++){block(scene,x+i*2,.7,z,.2,1.4,.2,MAT.wood);if(i<len-1){block(scene,x+i*2+1,1.04,z,2,.16,.15,MAT.woodLight);block(scene,x+i*2+1,.54,z,2,.15,.15,MAT.woodLight);}}addWorldObstacle({x:x+len-1,z,hx:len-1+.14,hz:.14,height:1.4});}
fence(-8,37,9);fence(7,37,7);fence(-8,-8,3);fence(5,-8,4);
// Village well and a training dummy establish scale and orientation.
cylinder(scene,6,.7,19,2.1,1.3,MAT.stone);cylinder(scene,6,1.38,19,1.5,.18,MAT.woodLight);
for(let x of [4,8])block(scene,x,2.6,19,.3,3.8,.3,MAT.wood);
block(scene,6,4.6,19,4.9,.3,4,MAT.wood);const wellRoof=put(scene,new THREE.ConeGeometry(3.6,2,4),MAT.roof,6,5.25,19);wellRoof.rotation.y=Math.PI/4;
for(let i=0;i<13;i++){const x=(random()-.5)*85,z=(random()-.5)*90;if(Math.abs(x)<5&&z<40&&z>-60)continue;const m=cylinder(scene,x,.13,z,.25,.26,MAT.stone);m.scale.y=.6;}
// A landmark to help new players know which way to leave the village.
for(const x of [-4,4])block(scene,x,2.35,-9,.7,4.7,.7,MAT.wood);block(scene,0,4.7,-9,8.6,.6,.8,MAT.woodLight);
const banner=block(scene,0,3.9,-9,3.1,.75,.15,mat('#8f7346'));block(scene,0,3.9,-9.1,2.45,.10,.05,MAT.gold);
function sign(x,z){block(scene,x,1.75,z,.18,3.5,.18,MAT.wood);block(scene,x+.8,2.65,z,1.75,.7,.16,MAT.woodLight);}sign(5,12);
const scenery=createOakrestScenery({THREE,scene,random,MAT});
groundScenery(THREE,scene,[ground]);addLandmarks(scene);batchScenery(scene);
const visuals=createCombatVisuals(THREE,scene);

function createHero(){return createActor();}
const hero=createHero();hero.position.set(0,terrainHeight(0,11),11);scene.add(hero);
const oldSaveKey=oakrestKey('oakrest-v1'),rosterKey=oakrestKey('oakrest-characters-v1'),activeKey=oakrestKey('oakrest-active-character');
const saveKeyFor=id=>oakrestKey('oakrest-character-save-'+id);
let profiles=[],activeCharacter=null,legacySave=null,saveWritable=true,data=defaultSave();
try{
 const raw=localStorage.getItem(oldSaveKey);
 if(raw){
  if(!localStorage.getItem(oakrestKey('oakrest-before-greenwood')))localStorage.setItem(oakrestKey('oakrest-before-greenwood'),raw);
  legacySave=validSave(JSON.parse(raw));data=legacySave;
 }
 profiles=readCharacters(localStorage,rosterKey);
 const selected=localStorage.getItem(activeKey);
 const profile=profiles.find(p=>p.id===selected);
 if(profile){
  const saved=localStorage.getItem(saveKeyFor(profile.id));
  if(saved){activeCharacter=profile;data=validSave(JSON.parse(saved));}
 }
}catch{saveWritable=false;}
function equipVisual(style,weaponId){
 const protection=ownsArmour(data,data.armour[style])?data.armour[style]:'none';
 equipActor(hero,style,slotFamily(style,weaponId),protection);
 if(!ownsWeapon(data,style,weaponId)){hero.userData.weapon.clear();hero.userData.offhand.clear();}
 if(activeCharacter)applyCharacterAppearance(hero,activeCharacter);
}
let style='melee',hp=maxHealth(levelFromXp(data.xp.vitality).level), shieldUntil=0,switchUntil=0,attackUntil=0,dodgeUntil=0,dodgeMovingUntil=0;
let pendingBasic=null,pendingAbility=null,attackAnimation=null,queuedStyle=null,lastAttackInterval=0.95,dodgeTravel=null;
let yaw=0,pitch=.12,elapsed=0,started=false,questCompleted=false;
let savedLookSpeed=1;try{savedLookSpeed=localStorage.getItem(oakrestKey('oakrest-look-speed')) ?? 1;}catch{}
let lookSensitivity=cameraSensitivity(savedLookSpeed);
let holdingAttack=false;
const keys=new Set(),joystick={x:0,y:0},enemies=[],projectiles=[],rings=[],floaters=[],cooldowns=new Map();
let respawnAt=0,lastHurt=-100;let comboStage=0,lastMeleeAttack=-10,recoilUntil=0,cameraJolt=0;
let motion={x:0,z:0},stride=0,visualHeading=0;
const cameraFocus=new THREE.Vector3(0,1.6,7.8);
const forward=()=>new THREE.Vector3(Math.sin(yaw),0,-Math.cos(yaw));
const directions={ArrowUp:'w',ArrowDown:'s'};
let bookStyle='melee',bookTab='skills',bookSlot=0,skillDetail=null;
const progressPanel=$('progression-panel'),detailPanel=$('skill-detail');
function bookOpen(tab='skills',toggle=false){
 if(toggle&&!progressPanel.hidden&&bookTab===tab){bookClose();return;}
 bookStyle=style;bookTab=tab;bookSlot=0;skillDetail=null;detailPanel.hidden=true;
 progressPanel.hidden=false;$('equipment-picker').hidden=true;
 $('loadout-button').setAttribute('aria-expanded','true');renderBook();
}
function bookClose(){skillDetail=null;detailPanel.hidden=true;progressPanel.hidden=true;$('loadout-button').setAttribute('aria-expanded','false');}
$('close-progression').addEventListener('click',bookClose);
const bookTabs={equip:'progression-equipment',inventory:'progression-inventory',skills:'progression-levels-tab',abilities:'progression-skills'};
for(const [tab,id] of Object.entries(bookTabs))$(id).addEventListener('click',()=>{bookTab=tab;skillDetail=null;detailPanel.hidden=true;renderBook();});
$('loadout-button').addEventListener('click',()=>bookOpen('skills',true));
$('skill-detail-back').addEventListener('click',()=>{skillDetail=null;detailPanel.hidden=true;});
function el(tag,text,parent,className){
 const node=document.createElement(tag);if(text!==null&&text!==undefined)node.textContent=text;
 if(className)node.className=className;if(parent)parent.append(node);return node;
}
function uiButton(parent,label,act,disabled=false){
 const b=el('button',label,parent);b.type='button';b.disabled=disabled;if(act)b.addEventListener('click',act);return b;
}
const xpText=value=>Math.floor(value).toLocaleString('en-GB');
function showSkillDetail(id){
 const def=SKILLS_OVERVIEW.find(entry=>entry.id===id);if(!def)return;
 skillDetail=id;
 const info=xpProgress(data.xp[id]);detailPanel.hidden=false;
 $('skill-detail-title').textContent=def.icon+' '+def.label+' · Level '+info.level;
 const body=$('skill-detail-body');body.replaceChildren();
 el('p',def.description,body,'detail-desc');
 el('p',info.maxed?'MAX LEVEL':xpText(info.current)+' / '+xpText(info.required)+' XP · '+xpText(info.needed)+' XP needed for level '+(info.level+1),body,'detail-xp');
 el('h3','What you learn or can wear',body);
 const milestones=skillMilestones(id);
 for(const entry of milestones){
  const unlocked=info.level>=entry.level;
  const row=el('div',null,body,'milestone '+(unlocked?'earned':'upcoming'));
  el('span','LV '+entry.level,row,'milestone-level');
  const item=el('div',null,row,'milestone-content');
  el('strong',entry.name,item);
  el('small',entry.type+' · '+entry.detail,item);
  el('span',unlocked?'UNLOCKED':'LOCKED',row,'milestone-state');
 }
 el('p','Levels let you use equipment and learn abilities. Find equipment in physical enemy drops, then collect it from the ground.',body,'detail-footnote');
}
function selectStyle(s){bookStyle=s;bookSlot=0;renderBook();}
function chooseGear(kind,id,selectedStyle=bookStyle){
 if(selectedStyle===style&&(pendingBasic||pendingAbility)){toast("Finish your attack before changing equipment.");return;}
 if(kind==='weapon'){
  if(!canEquipWeapon(selectedStyle,id,data.xp)||!ownsWeapon(data,selectedStyle,id))return;
  data.gear[selectedStyle]=id;
 }else{
  if(!canEquipArmour(id,data.xp)||!ownsArmour(data,id))return;
  data.armour[selectedStyle]=id;
 }
 save();if(style===selectedStyle){equipVisual(style,data.gear[style]);refreshSkills();}
 renderBook();
}
function renderBook(){
 if(progressPanel.hidden)return;
 const combatLevel=levelFromXp(data.xp[bookStyle]).level;
 $('progression-levels').textContent='COMBAT LV '+combatLevelFromXp(data.xp)+' · '+bookStyle.toUpperCase()+' '+combatLevel+' · '+data.coins+' COINS';
 for(const [tab,id] of Object.entries(bookTabs))$(id).classList.toggle('selected',tab===bookTab);
 const styles=$('progression-styles');styles.replaceChildren();
 styles.hidden=bookTab==='skills'||bookTab==='inventory';
 if(!styles.hidden)for(const s of STYLE_ORDER){
  const b=uiButton(styles,s.toUpperCase()+' '+levelFromXp(data.xp[s]).level,()=>selectStyle(s));
  b.classList.toggle('selected',s===bookStyle);
 }
 const host=$('progression-content');host.replaceChildren();
 const weaponId=data.gear[bookStyle];
 if(bookTab==='skills'){
  el('p','Overall Combat Level '+combatLevelFromXp(data.xp)+' · Based on your strongest attack style, Vitality and smaller contributions from other styles. Tap a skill to see its unlocks.',host);
  const grid=el('div',null,host,'skills-grid');
  for(const skill of SKILLS_OVERVIEW){
   const info=xpProgress(data.xp[skill.id]);
   const card=uiButton(grid,'',()=>showSkillDetail(skill.id));card.className='level-card level-'+skill.id;
   const top=el('div',null,card,'level-card-title');
   el('strong',skill.icon+' '+skill.label,top);
   el('span','Level '+info.level,top);
   const track=el('div',null,card,'level-xp-track');
   const fill=el('div',null,track,'level-xp-fill');fill.style.width=(info.progress*100).toFixed(1)+'%';
   el('small',info.maxed?'MAX LEVEL':xpText(info.needed)+' XP to next level',card);
   el('small','Total XP '+xpText(info.totalXp)+'  ·  View unlocks ›',card,'level-meta');
  }
 }else if(bookTab==='abilities'){
  el('p','Select a slot, then choose an unlocked ability. Each weapon family remembers its four slots.',host);
  const slots=el('div',null,host,'book-slots'),current=equippedSkills(data,bookStyle,weaponId);
  for(let i=0;i<4;i++){
   const b=uiButton(slots,'',()=>{bookSlot=i;renderBook();});
   b.classList.toggle('selected',i===bookSlot);
   el('span',current[i]?.icon||'+',b);
   el('small',current[i]?.name||'Slot '+(i+1),b);
  }
  el('h3','Available and upcoming abilities',host);
  const list=el('div',null,host,'catalogue-list');
  for(const a of skillCatalogue(bookStyle,weaponId)){
   const level=levelFromXp(data.xp[bookStyle]).level,ready=level>=a.requiredLevel;
   const b=uiButton(list,'',()=>{
    if(equipSkill(data,bookStyle,weaponId,bookSlot,a.id)){
     save();renderBook();if(bookStyle===style)refreshSkills();
    }
   },!ready);
   b.classList.toggle('selected',current[bookSlot]?.id===a.id);
   el('span',a.icon,b);const desc=el('div',null,b);
   el('strong',a.name,desc);el('small',a.note,desc);
   el('em',(ready?'UNLOCKED':'LEVEL '+a.requiredLevel+' REQUIRED')+' · '+a.cooldown+'s cooldown',desc);
  }
  const clear=uiButton(host,'CLEAR SELECTED SLOT',()=>{
   if(equipSkill(data,bookStyle,weaponId,bookSlot,null)){
    save();renderBook();if(bookStyle===style)refreshSkills();
   }
  },!current[bookSlot]);clear.className='book-clear';
 }else if(bookTab==='equip'){
  el('h3','Equipped for '+bookStyle.toUpperCase(),host);
  const ownWeapon=ownsWeapon(data,bookStyle,data.gear[bookStyle])?LOADOUTS[bookStyle][data.gear[bookStyle]]:{title:bookStyle==='melee'?'Unarmed':'None'},ownArmour=ownsArmour(data,data.armour[bookStyle])?defenceFor(data.armour[bookStyle]):defenceFor('none');
  el('p','Weapon: '+ownWeapon.title+'  ·  Armour: '+ownArmour.title,host);
  el('h3','Your weapons',host);
  const weapons=el('div',null,host,'catalogue-list');
  for(const [id,w] of Object.entries(LOADOUTS[bookStyle])){
   const unlocked=canEquipWeapon(bookStyle,id,data.xp),owned=ownsWeapon(data,bookStyle,id);
   const b=uiButton(weapons,'',()=>chooseGear('weapon',id),!unlocked||!owned);
   b.classList.toggle('selected',data.gear[bookStyle]===id);
   el('span',w.icon,b);const d=el('div',null,b);el('strong',w.title,d);
   el('small',weaponDisplay(w),d);if(id!==data.gear[bookStyle])el('small',weaponComparison(w,ownWeapon),d,'gear-comparison');
   el('em',!unlocked?'LEVEL '+w.requiredLevel+' REQUIRED':!owned?'NOT OWNED':data.gear[bookStyle]===id?'EQUIPPED':'TAP TO EQUIP',d);
  }
  el('h3','Your armour',host);
  const armourGrid=el('div',null,host,'catalogue-list');
  for(const [id,a] of Object.entries(ARMOUR)){
   const unlocked=canEquipArmour(id,data.xp),owned=ownsArmour(data,id);
   const b=uiButton(armourGrid,'',()=>chooseGear('armour',id),!unlocked||!owned);
   b.classList.toggle('selected',data.armour[bookStyle]===id);
   el('span',id==='plate'?'⬡':id==='leather'?'◈':'✧',b);const d=el('div',null,b);
   el('strong',a.title,d);el('small',a.description,d);
   el('em',!unlocked?'VITALITY '+a.requiredVitality+' REQUIRED':!owned?'NOT OWNED':data.armour[bookStyle]===id?'EQUIPPED':'TAP TO EQUIP',d);
  }
 }else if(bookTab==='inventory'){
  el('h3','Owned equipment',host);el('p','Collect glowing drops from defeated creatures. Picked-up gear stays here, even if your level is too low to equip it.',host);
  el('h3','Weapons',host);
  const weapons=el('div',null,host,'catalogue-list');
  for(const s of STYLE_ORDER){
   for(const id of data.inventory?.weapons?.[s]||[]){
    const w=LOADOUTS[s]?.[id];if(!w)continue;
    const ready=canEquipWeapon(s,id,data.xp);
    const b=uiButton(weapons,'',()=>{bookStyle=s;chooseGear('weapon',id,s);},!ready);
    b.classList.toggle('selected',data.gear[s]===id);
    el('span',w.icon,b);const d=el('div',null,b);el('strong',w.title,d);
    el('small',s.toUpperCase()+' · LV '+w.requiredLevel+' · '+weaponDisplay(w),d);
    el('em',!ready?'LV '+w.requiredLevel+' REQUIRED':data.gear[s]===id?'EQUIPPED':'TAP TO EQUIP',d);
   }
  }
  el('h3','Armour',host);
  const armour=el('div',null,host,'catalogue-list');
  for(const id of data.inventory?.armour||[]){
   const a=ARMOUR[id];if(!a)continue;
   const ready=canEquipArmour(id,data.xp);
   const b=uiButton(armour,'',()=>chooseGear('armour',id,style),!ready);
   el('span',id==='plate'?'⬡':id==='leather'?'◈':'✧',b);
   const d=el('div',null,b);el('strong',a.title,d);
   el('small','Vitality '+a.requiredVitality+' · '+a.description,d);
   el('em',!ready?'VITALITY '+a.requiredVitality+' REQUIRED':data.armour[style]===id?'EQUIPPED':'EQUIP TO '+style.toUpperCase(),d);
  }
  el('h3','Materials',host);
  const materials=el('div',null,host,'catalogue-list');
  let anyMaterial=false;
  for(const mat of Object.values(MATERIAL_DROPS)){
    const qty=data.inventory?.materials?.[mat.id]||0;if(!qty)continue;anyMaterial=true;
    const tile=el('div',null,materials,'material-tile');
    el('strong',mat.title,tile);el('small','Owned ×'+qty,tile);
  }
  if(!anyMaterial)el('p','Defeat creatures outside the village to collect materials.',host);
  el('p','Coins: '+data.coins+' · Crafting with these materials will arrive later.',host,'inventory-footnote');
 }
}
const UNARMED={title:'Unarmed',family:'unarmed',basic:6,reach:1.55,interval:.88,windup:.25};
function getWeapon(){if(ownsWeapon(data,style,data.gear[style]))return LOADOUTS[style][data.gear[style]];return style==='melee'?UNARMED:{...UNARMED,title:'No weapon',basic:0,reach:0};}
function save(){if(!saveWritable)return;try{localStorage.setItem(activeCharacter?saveKeyFor(activeCharacter.id):oldSaveKey,JSON.stringify(data));}catch{saveWritable=false;}}
function useCharacter(profile,loaded){
 activeCharacter=profile;data=loaded;style='melee';hp=maxHealth(levelFromXp(data.xp.vitality).level);
 hero.position.set(0,terrainHeight(0,11),11);
 equipVisual(style,data.gear[style]);refreshSkills();
 $('character-name-label').hidden=!profile;$('character-name-label').textContent=profile?.name||'';
 $('begin').textContent=profile?'PLAY AS '+profile.name.toUpperCase():'CONTINUE ORIGINAL ADVENTURE';
 $('quest-text').textContent=data.defeated>=3?'Master all three styles and defeat the bandit on the forest road.':'Practice on the straw dummy by the gate. Follow the road to the mosslings; step out of red warnings. Defeat 3 creatures and collect their drops.';
 questCompleted=data.defeated>=3;updateHpUI();
}
function toast(message){
 const el=document.createElement('div');el.className='toast';
 if(message.includes('LEVEL '))el.classList.add('level-up');
 else if(message.includes('LOOT'))el.classList.add('loot');
 else if(message.includes('DEFEATED'))el.classList.add('defeat');
 el.innerHTML=message;$('notifications').prepend(el);
 setTimeout(()=>el.remove(),3100);
}
function floating(text,color,pos){const el=document.createElement('div');el.className='damage-pop';el.textContent=text;el.style.color=color;$('floating').append(el);floaters.push({el,pos:pos.clone(),age:0});}
// Persisted ground pickups are separate from combat XP and existing local inventory.
const lootModels=new Map();let lootCounter=0,lastLootId=null;
function makeLootModel(drop){
 const group=new THREE.Group();group.position.set(drop.x,terrainHeight(drop.x,drop.z),drop.z);
 const colour=drop.kind==='coins'?'#edc774':drop.kind==='material'?'#8ecfa7':'#b8b6f3';
 const glow=new THREE.MeshBasicMaterial({color:colour,transparent:true,opacity:.75,depthWrite:false});
 const halo=new THREE.Mesh(new THREE.RingGeometry(.36,.53,20),new THREE.MeshBasicMaterial({color:colour,transparent:true,opacity:.46,side:THREE.DoubleSide,depthWrite:false}));
 halo.rotation.x=-Math.PI/2;halo.position.y=.065;group.add(halo);
 const coreGeo=drop.kind==='coins'?new THREE.CylinderGeometry(.26,.26,.10,8):
   drop.kind==='material'?new THREE.IcosahedronGeometry(.29,0):new THREE.OctahedronGeometry(.35,0);
 const core=new THREE.Mesh(coreGeo,new THREE.MeshLambertMaterial({color:colour,emissive:colour,emissiveIntensity:.22,flatShading:true}));
 core.position.y=.62;core.rotation.x=drop.kind==='coins'?Math.PI/2:0;
 group.add(core);
 const aura=new THREE.Mesh(new THREE.SphereGeometry(.38,9,7),glow);
 aura.position.y=.62;group.add(aura);
 scene.add(group);lootModels.set(drop.id,{group,core,aura,halo,phase:random()*6.28});
}
function discardLootModel(id){
 const m=lootModels.get(id);if(!m)return;
 scene.remove(m.group);m.group.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
 lootModels.delete(id);
}
for(const drop of data.groundLoot||[])makeLootModel(drop);
function addGroundLoot(drop){
 if(data.groundLoot.length>=MAX_GROUND_LOOT){
  const oldest=data.groundLoot.shift();if(oldest)discardLootModel(oldest.id);
 }
 data.groundLoot.push(drop);makeLootModel(drop);
}
function spawnMonsterLoot(enemy){
 // Every enemy awards a tangible coin pouch, with independent material/gear rolls.
 const prefix=String(Date.now())+'-'+(++lootCounter)+'-'+Math.floor(random()*1e6);
 const created=createMonsterDrops(enemy.type,enemy.x,enemy.z,random,()=>prefix+'-'+(++lootCounter));
 for(const d of created)addGroundLoot(d);
 save();
}
function pickupNearby(){
 if(!started||hp<=0)return;
 const nearest=closestDrop(data.groundLoot,hero.position.x,hero.position.z,3.3);
 if(!nearest||!collectDrop(data,nearest))return;
 data.groundLoot=data.groundLoot.filter(d=>d.id!==nearest.id);discardLootModel(nearest.id);
 const text=lootName(nearest);
 toast('<b>PICKED UP</b> · '+text);audio.play('loot');
 floating('+'+text,'#e9d39d',hero.position.clone().add(new THREE.Vector3(0,2.7,0)));
 updateHpUI();if(!progressPanel.hidden)renderBook();save();updateLoot(0,now());
}
const lootPanel=$('loot-prompt'),lootButton=$('loot-pickup');
lootButton.addEventListener('click',e=>{e.preventDefault();pickupNearby();});
function updateLoot(dt,t){
 let nearest=null;
 if(started&&hp>0)nearest=closestDrop(data.groundLoot,hero.position.x,hero.position.z,3.3);
 if(nearest?.id!==lastLootId){
  lastLootId=nearest?.id||null;
  lootPanel.hidden=!nearest;
  if(nearest)$('loot-label').textContent=lootName(nearest);
 }
 if(!nearest)lootPanel.hidden=true;
 for(const m of lootModels.values()){
  const bob=Math.sin(t*2.4+m.phase);
  m.core.position.y=.61+bob*.115;
  m.aura.position.y=m.core.position.y;
  m.core.rotation.y+=dt*.85;
  m.halo.material.opacity=.29+(.5+bob*.5)*.22;
 }
}

function makeEnemy(type,x,z){const g=type==='bandit'?createActor(true):createCreature(type);g.position.set(x,terrainHeight(x,z),z);const d={type,x,z,startX:x,startZ:z,group:g,level:ENEMY_COMBAT[type].level,aggro:false,retreating:false,hp:1,max:1,dead:false,respawn:0,lastAttack:0,attackWindup:0,warning:null,warningMesh:null,charge:null,hitFlashUntil:0,bleedUntil:0,nextBleed:0,slowUntil:0,rootUntil:0,stunUntil:0,swapLockedUntil:0,rot:random()*Math.PI*2};
d.max={dummy:1200,mossling:57,boar:90,bandit:125}[type];d.hp=d.max;if(type==='bandit')equipActor(g,'melee','sword','leather');
 const plate=new THREE.Group();plate.position.y=type==='dummy'?3.15:type==='mossling'?1.5:2.55;g.add(plate);
 const frame=block(plate,0,0,-.05,1.55,.24,.07,MAT.gold);
 const bg=block(plate,0,0,0,1.40,.14,.06,MAT.black);
 const bar=block(plate,0,.01,.06,1.36,.10,.05,mat(type==='mossling'?'#9ddc9b':type==='boar'?'#e9af81':'#f18c7b'));
d.bar=bar;d.plate=plate;scene.add(g);enemies.push(d);
 const label=document.createElement('span');
 label.className='enemy-world-label';label.textContent='Lv '+d.level+' · '+ENEMY_COMBAT[type].name;
 label.hidden=true;d.levelLabel=label;$('enemy-level-layer').append(label);
 return d;
}
makeEnemy('dummy',-6,-3);
makeEnemy('mossling',-4,-21);makeEnemy('mossling',5,-24);makeEnemy('mossling',-8,-30);
makeEnemy('boar',4,-33);makeEnemy('boar',10,-39);
makeEnemy('bandit',-5,-49);
function updateHpUI(){$('combat-level-value').textContent=combatLevelFromXp(data.xp);const vital=levelFromXp(data.xp.vitality);const max=maxHealth(vital.level);$('health-label').textContent=`${Math.ceil(hp)} / ${max} HP`;$('hp-fill').style.width=`${100*hp/max}%`;$('xp-fill').style.width=`${100*levelFromXp(data.xp[style]).progress}%`;$('level-label').textContent=`VITALITY ${vital.level}`;$('style-level').textContent=`${style.toUpperCase()} LEVEL ${levelFromXp(data.xp[style]).level}`;$('coins').textContent=`${data.coins} COINS`;$('quest-progress').textContent=data.defeated<3?`${data.defeated} / 3 defeated`:'✓ 3 / 3 completed';}
function refreshStyles(){const host=$('styles');host.innerHTML='';for(const st of STYLE_ORDER){const b=document.createElement('button');b.className=`style ${st===style?'active':''}`;b.style.borderColor=st===style?STYLE_COLOURS[st]:'';b.innerHTML=`<span class="symbol">${{melee:'⚔',magic:'✦',ranged:'➶'}[st]}</span>${st.toUpperCase()} <small>${levelFromXp(data.xp[st]).level}</small>`;b.addEventListener('click',()=>setStyle(st));host.append(b);}}
function refreshSkills(){
 const host=$('skills');host.innerHTML='';
 equippedSkills(data,style,data.gear[style]).forEach((a,i)=>{
  const b=document.createElement('button');b.className='skill';b.type='button';b.title=a?`${a.note} Cooldown: ${a.cooldown}s`:'Open SKILLS to equip an ability';
  b.classList.toggle('empty',!a);
  b.innerHTML=`<span class="key">${'QERF'[i]}</span><span class="skill-icon">${a?.icon||'+'}</span><span class="name">${a?.name||'EMPTY'}</span><span class="cooldown"></span>`;
  b.addEventListener('click',()=>a?useAbility(i):bookOpen('abilities'));host.append(b);
 });
 $('weapon-name').textContent=getWeapon().title;refreshStyles();updateHpUI();
 $('touch-attack').title=weaponDisplay(getWeapon());
 document.documentElement.dataset.combatStyle=style;
 const swap=$('touch-swap'),upcoming=nextStyle(style);
 swap.querySelector('small').textContent=upcoming.toUpperCase();swap.setAttribute('aria-label',`Switch to ${upcoming}`);
}
function setStyle(which,instant=false){if(!STYLE_ORDER.includes(which)||which===style)return;if((pendingBasic||pendingAbility)&&!instant){queuedStyle=which;return;}if(!instant && now()<switchUntil)return;style=which;switchUntil=now()+.53;equipVisual(style,data.gear[style]);refreshSkills();addRing(hero.position.clone(),'#e7ca81',1.8,.38);toast(`${{melee:'⚔',magic:'✦',ranged:'➶'}[style]} ${style.toUpperCase()} · ${getWeapon().title}`);}
function gearMenu(){bookOpen('equip',true);}
$('gear-button').addEventListener('click',gearMenu);
function addRing(pos,color,radius=1.4,duration=.5){const geom=new THREE.RingGeometry(.89,1,24);const mesh=new THREE.Mesh(geom,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.position.copy(pos);mesh.position.y=terrainHeight(pos.x,pos.z)+.065;scene.add(mesh);rings.push({mesh,radius,duration,time:0});}
function sparks(pos,color,count=10){for(let i=0;i<count;i++){const sphere=put(scene,ballGeom.clone(),new THREE.MeshBasicMaterial({color}),pos.x,pos.y,pos.z,.07,.07,.07,false);const a=random()*Math.PI*2;projectiles.push({mesh:sphere,particle:true,velocity:new THREE.Vector3(Math.cos(a)*(2+random()*3),1+random()*4,Math.sin(a)*(2+random()*3)),life:.35+random()*.35,age:0});}}
function gainXp(type,sourceStyle=style){const val=XP_BY_MOB[type]??0;if(!val)return;const old=levelFromXp(data.xp[sourceStyle]).level;const oldVital=levelFromXp(data.xp.vitality).level;data.xp[sourceStyle]+=val;data.xp.vitality+=Math.floor(val*.55);const newLevel=levelFromXp(data.xp[sourceStyle]).level,newVital=levelFromXp(data.xp.vitality).level;if(newLevel>old){const unlocked=skillCatalogue(sourceStyle,data.gear[sourceStyle]).filter(a=>a.requiredLevel>old&&a.requiredLevel<=newLevel).map(a=>a.name);toast(`<b>${sourceStyle.toUpperCase()} LEVEL ${newLevel}!</b> ${unlocked.length?'New skills: '+unlocked.join(', '):'Check MENU for new unlocks.'}`);}if(newVital>oldVital){hp+=8*(newVital-oldVital);toast(`<b>VITALITY LEVEL ${newVital}!</b> Maximum HP and armour choices increased.`);}data.defeated++;if(data.defeated===3&&!questCompleted){questCompleted=true;toast('<b>FIRST CHALLENGE COMPLETE!</b> Explore, train and try different weapons.');$('quest-text').textContent='Well done! Master all three styles and defeat the bandit on the forest road.';}save();refreshStyles();updateHpUI();if(!progressPanel.hidden)renderBook();}
function hitEnemy(e,damage,ability,source={style,level:levelFromXp(data.xp[style]).level,power:outgoingMultiplier(data.armour[style],style)}){if(!e||e.dead||e.hp<=0||e.retreating)return;if(e.type!=='dummy'&&Math.hypot(hero.position.x-e.startX,hero.position.z-e.startZ)>ENEMY_COMBAT[e.type].leash){disengageEnemy(e,now());return;}const amount=Math.round(damage*(1+Math.min(24,source.level-1)*.025)*source.power);audio.play('hit',amount>25);e.plate.visible=true;e.hp-=amount;e.hitFlashUntil=now()+.16;
 if(e.type!=='dummy'&&!e.retreating){
  const cfg=ENEMY_COMBAT[e.type],heroHome=Math.hypot(hero.position.x-e.startX,hero.position.z-e.startZ);
  if(heroHome<=cfg.leash)e.aggro=true;
 }
 floating(`-${amount}`,'#fff0a0',e.group.position.clone().add(new THREE.Vector3(0,e.type==='mossling'?1.7:2.8,0)));
 if(e.type!=='dummy'){sparks(e.group.position.clone().add(new THREE.Vector3(0,.9,0)),STYLE_COLOURS[style],4);visuals.impact(e.group.position,STYLE_COLOURS[style],amount>25);}if(ability?.bleed){e.bleedUntil=now()+ability.bleed;e.nextBleed=now()+1;e.bleedSource=source;}if(ability?.stun)e.stunUntil=now()+ability.stun;if(ability?.slow)e.slowUntil=now()+ability.slow;if(ability?.root)e.rootUntil=now()+ability.root;if(ability?.swapLock)e.swapLockedUntil=now()+ability.swapLock;if(e.hp<=0){cancelEnemyWarning(e);e.charge=null;if(e.type==='dummy'){e.hp=e.max;toast('Training dummy · practice any style here');return;}e.hp=0;e.dead=true;e.aggro=false;e.retreating=false;e.levelLabel.hidden=true;e.respawn=now()+12;e.deathAt=now();addRing(e.group.position,'#e9bb76',2,.55);sparks(e.group.position.clone().add(new THREE.Vector3(0,.7,0)),'#ecd39b',9);spawnMonsterLoot(e);gainXp(e.type,source.style);}}
function enemiesNear(reach,cone=.2){const pos=hero.position,front=forward();return enemies.filter(e=>!e.dead&&e.hp>0&&!e.retreating).filter(e=>{const dx=e.x-pos.x,dz=e.z-pos.z,dist=Math.hypot(dx,dz);return dist<=reach&&(dx*front.x+dz*front.z)/(dist||1)>=cone;});}
function nearTarget(reach){return meleeTarget({x:hero.position.x,z:hero.position.z},{x:Math.sin(yaw),z:-Math.cos(yaw)},enemies.filter(e=>!e.retreating),reach,isTouch?.35:.40);}
function shoot(damage,speed=24,colour='#f4c377',opts={},spread=0,maxRange=getWeapon().reach){
 let dir=forward(),aimTarget=null;
 if(isTouch){const target=combatAim(hero.position,{x:dir.x,z:dir.z},enemies.filter(e=>!e.retreating),maxRange,.24);
  if(target){aimTarget=target;dir=new THREE.Vector3(target.x-hero.position.x,0,target.z-hero.position.z).normalize();}
 }
 dir.applyAxisAngle(new THREE.Vector3(0,1,0),spread);const horizontal=Math.max(.1,aimTarget?Math.hypot(aimTarget.x-hero.position.x,aimTarget.z-hero.position.z):maxRange);dir.y=aimTarget?(terrainHeight(aimTarget.x,aimTarget.z)+(aimTarget.type==='mossling'?.75:1.25)-hero.position.y-1.3)/horizontal:0;
 const mesh=ball(scene,hero.position.x+dir.x*.9,hero.position.y+1.3+dir.y*.9,hero.position.z+dir.z*.9,
 style==='magic'?.24:.13,style==='magic'?.24:.13,style==='magic'?.3:.48,
 new THREE.MeshBasicMaterial({color:colour}));
 mesh.geometry=mesh.geometry.clone();mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),dir.clone().normalize());visuals.projectile(mesh,colour,style);
 projectiles.push({mesh,dir,speed,damage,opts,life:Math.max(1.4,maxRange/Math.max(1,speed)+.1),age:0,distance:0,maxDistance:Math.max(.1,maxRange-.9),origin:hero.position.clone(),style,source:{style,level:levelFromXp(data.xp[style]).level,power:outgoingMultiplier(data.armour[style],style)},particle:false});
}
function slashEffect(reach=3){
 const heading=forward();
 const p=hero.position.clone().add(heading.clone().multiplyScalar(Math.min(2,reach*.68)));
 p.y=hero.position.y+1.25;
 sparks(p,STYLE_COLOURS[style],7);
 visuals.arc(hero.position,heading,reach,STYLE_COLOURS[style],comboStage);
}
function doBasic(){
 const t=now();if(!started||hp<=0||dodgeTravel||pendingAbility||t<switchUntil||!basicAttackReady(t,attackUntil,!!pendingBasic))return;
 if(style!=='melee'&&!ownsWeapon(data,style,data.gear[style])){toast('You need a weapon to use this combat style.');return;}
 const w=getWeapon();
 attackUntil=t+w.interval;lastAttackInterval=w.interval;
 const windup=Math.min(w.interval*.70,w.windup||w.interval*.25);
 pendingBasic={style,weapon:data.gear[style],impactAt:t+windup,interval:w.interval,start:t};
 recoilUntil=t+Math.max(windup+.13,w.interval*.56);attackAnimation=pendingBasic;
 if(style==='melee'){
  comboStage=t-lastMeleeAttack<w.interval*1.8?(comboStage+1)%3:0;
  lastMeleeAttack=t;pendingBasic.combo=comboStage;
 }else comboStage=0;
 // The hit or projectile is deliberately delayed until the wind-up completes.
 hero.userData.rightArm.rotation.x=style==='melee'?-.54:-1.07;
}
function resolveBasicAttack(t){
 if(!pendingBasic||t<pendingBasic.impactAt)return;
 const attack=pendingBasic;pendingBasic=null;
 if(!started||hp<=0||style!==attack.style)return;audio.play(style==='magic'?'magic':'attack',getWeapon().basic>25);
 const w=ownsWeapon(data,attack.style,attack.weapon)?LOADOUTS[attack.style][attack.weapon]:attack.style==='melee'?UNARMED:null;
 if(!w)return;
 hero.userData.rightArm.rotation.x=-1.5;
 if(attack.style==='melee'){
  slashEffect(w.reach);const target=nearTarget(w.reach);
  if(target)hitEnemy(target,Math.round(w.basic*(attack.combo===2?1.21:attack.combo===1?1.09:1)),slotFamily(style,attack.weapon)==='daggers'?{bleed:1.5}:{});
 }else{
  sparks(hero.position.clone().add(forward().multiplyScalar(1.1)).add(new THREE.Vector3(0,1.2,0)),STYLE_COLOURS[style],3);
  // Bows are distinguished by launch speed and maximum travel; heavy crossbow recovers slowly.
  const velocity=attack.style==='magic'?(slotFamily(style,attack.weapon)==='ember'?24:21):
    slotFamily(style,attack.weapon)==='shortbow'?27:slotFamily(style,attack.weapon)==='crossbow'?34:36;
  shoot(w.basic,velocity,attack.style==='magic'?(slotFamily(style,attack.weapon)==='ember'?'#f6b070':'#b6d9ef'):'#e4c292',{},0,w.reach);
 }
}
function shiftHero(dist){const f=forward();dodgeTravel={dir:{x:f.x*Math.sign(dist),z:f.z*Math.sign(dist)},speed:Math.abs(dist)/.32,start:now(),end:now()+.32};addRing(hero.position.clone(),'#cce2b1',1.8,.4);}
function useAbility(index){if(!started||hp<=0||dodgeTravel||pendingAbility||now()<switchUntil||now()<attackUntil||pendingBasic||!ownsWeapon(data,style,data.gear[style]))return;const a=equippedSkills(data,style,data.gear[style])[index];if(!a)return;const id=`${style}.${slotFamily(style,data.gear[style])}.${a.id}`;if(now()<(cooldowns.get(id)||0))return;cooldowns.set(id,now()+a.cooldown);const w=getWeapon(),windup=['shield','heal','dash','dashback'].includes(a.kind)?0:Math.min(.45,w.windup);pendingAbility={a,style,impactAt:now()+windup};attackAnimation={start:now(),impactAt:now()+Math.max(.01,windup),interval:Math.max(.4,windup+.28)};attackUntil=now()+Math.max(.4,windup+.28);lastAttackInterval=Math.max(.4,windup+.28);}
function resolveAbility(t){if(!pendingAbility||t<pendingAbility.impactAt)return;const {a,style:castStyle}=pendingAbility;pendingAbility=null;if(hp<=0||style!==castStyle)return;audio.play(style==='magic'?'magic':'attack');
  if(a.kind==='hit'||a.kind==='execute'){const t=nearTarget(a.reach);if(t)hitEnemy(t,a.damage+(a.kind==='execute'&&t.bleedUntil>now()?20:0),a);slashEffect(a.reach);}
  else if(a.kind==='sweep'){for(const e of enemiesNear(a.reach,.10))hitEnemy(e,a.damage,a);addRing(hero.position.clone(),STYLE_COLOURS[style],a.reach,.46);}
  else if(a.kind==='nova'){for(const e of enemies){if(!e.dead&&e.group.position.distanceTo(hero.position)<a.reach)hitEnemy(e,a.damage,a);}addRing(hero.position.clone(),'#92d8ec',a.reach,.65);}
  else if(a.kind==='bolt')shoot(a.damage,a.speed,style==='magic'?(slotFamily(style,data.gear[style])==='ember'?'#f6b070':'#a3d6f7'):'#edd28f',a);
  else if(a.kind==='burst')[-.09,0,.09].forEach(v=>shoot(a.damage,a.speed,'#eac993',a,v));
  else if(a.kind==='shield'){shieldUntil=now()+a.duration;addRing(hero.position.clone(),'#83c4ee',2.6,.65);toast(`${a.name} activated`);}
  else if(a.kind==='heal'){const max=maxHealth(levelFromXp(data.xp.vitality).level);hp=Math.min(max,hp+a.heal);floating(`+${a.heal}`,'#80f0a2',hero.position.clone().add(new THREE.Vector3(0,2.4,0)));addRing(hero.position.clone(),'#80f0a2',2,.4);updateHpUI();}
  else if(a.kind==='dash')shiftHero(a.distance);
  else if(a.kind==='dashback')shiftHero(-a.distance);
  else if(a.kind==='retreat'){shoot(a.damage,26,'#f2d79a');shiftHero(-4);}
  sparks(hero.position.clone().add(new THREE.Vector3(0,1.15,0)),STYLE_COLOURS[style],5);
}
function dodge(){if(!started||hp<=0||now()<dodgeUntil)return;pendingBasic=null;pendingAbility=null;attackAnimation=null;dodgeUntil=now()+2;dodgeMovingUntil=now()+.22;const dir=dodgeDirection({x:Number(keys.has('d'))-Number(keys.has('a'))+joystick.x,z:Number(keys.has('s'))-Number(keys.has('w'))+joystick.y},yaw);dodgeTravel={dir,start:now(),end:now()+.32};audio.play('dodge');addRing(hero.position.clone(),'#fff1b8',2,.4);}
function collides(x,z){return blocked(x,z);}
// Attack telegraphs are visible ground geometry and use a frozen target/direction.
// Moving out of the red shape before it resolves avoids damage.
function cancelEnemyWarning(e){
 if(e.warningMesh){scene.remove(e.warningMesh);e.warningMesh.geometry.dispose();e.warningMesh.material.dispose();e.warningMesh=null;}
 e.warning=null;
}
function startEnemyWarning(e,t){
 const spec=ENEMY_PATTERNS[e.type];if(!spec)return;
 const dx=hero.position.x-e.x,dz=hero.position.z-e.z,dist=Math.hypot(dx,dz)||1;
 const dir={x:dx/dist,z:dz/dist};
 let warning,mesh;
 const material=new THREE.MeshBasicMaterial({color:spec.kind==='charge'?'#ef8f59':'#df6054',transparent:true,opacity:.24,side:THREE.DoubleSide,depthWrite:false});
 if(spec.kind==='pounce'){
  warning={kind:'pounce',x:hero.position.x,z:hero.position.z,radius:spec.radius};
  mesh=new THREE.Mesh(new THREE.CircleGeometry(spec.radius,28),material);
  mesh.rotation.x=-Math.PI/2;mesh.position.set(warning.x,.028,warning.z);
 }else if(spec.kind==='charge'){
  warning={kind:'charge',x:e.x,z:e.z,direction:dir,length:spec.length,width:spec.width};
  mesh=new THREE.Mesh(new THREE.PlaneGeometry(spec.width*2,spec.length),material);
  const angle=Math.atan2(dir.x,-dir.z);mesh.rotation.set(-Math.PI/2,-angle,0,'YXZ');
  // Rotating around Y after lying flat keeps the charge lane aligned with the target.
  mesh.rotation.order='YXZ';mesh.rotation.set(-Math.PI/2,-angle,0,'YXZ');
  mesh.position.set(e.x+dir.x*spec.length*.5,.029,e.z+dir.z*spec.length*.5);
 }else{
  warning={kind:'cleave',x:e.x,z:e.z,direction:dir,radius:spec.radius,halfAngle:spec.halfAngle};
  mesh=new THREE.Mesh(new THREE.CircleGeometry(spec.radius,28,Math.PI/2-spec.halfAngle,spec.halfAngle*2),material);
  mesh.rotation.set(-Math.PI/2,-Math.atan2(dir.x,-dir.z),0,'YXZ');
  mesh.position.set(e.x,.029,e.z);
 }
 mesh.updateMatrixWorld();const pos=mesh.geometry.attributes.position,world=new THREE.Vector3();for(let i=0;i<pos.count;i++){world.fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld);world.y=terrainHeight(world.x,world.z)+.055;mesh.worldToLocal(world);pos.setXYZ(i,world.x,world.y,world.z);}mesh.geometry.computeBoundingSphere();
 e.warning=warning;e.warningMesh=mesh;e.attackWindup=t+spec.windup;e.lastAttack=t;
 scene.add(mesh);
}
function applyEnemyDamage(e,spec,t){
 if(hp<=0||t<dodgeMovingUntil){floating('EVADED','#a8f2be',hero.position.clone().add(new THREE.Vector3(0,2.7,0)));return;}
 const harm=damageAfterArmour(spec.damage,shieldUntil>t,data.armour[style]);
 hp=Math.max(0,hp-harm);lastHurt=t;cameraJolt=.13;
 $('damage-flash').classList.remove('hit');void $('damage-flash').offsetWidth;$('damage-flash').classList.add('hit');
 floating('-'+harm,'#ff948d',hero.position.clone().add(new THREE.Vector3(0,2.8,0)));
 updateHpUI();
 if(hp<=0){pendingBasic=null;pendingAbility=null;dodgeTravel=null;attackAnimation=null;motion={x:0,z:0};
  toast('<b>YOU WERE DEFEATED</b> · Respawning in Oakrest');
  respawnAt=t+2.1;
 }
}
function disengageEnemy(e,t){
 // Never carry a queued hit or charge across the leash boundary.
 cancelEnemyWarning(e);e.charge=null;e.aggro=false;e.retreating=true;
 e.hp=e.max;e.bleedUntil=0;e.nextBleed=0;e.slowUntil=0;
 e.stunUntil=0;e.rootUntil=0;e.swapLockedUntil=0;e.attackWindup=0;
 e.lastAttack=t;
}
function returnEnemyHome(e,dt,t){
 const dx=e.startX-e.x,dz=e.startZ-e.z,dist=Math.hypot(dx,dz);
 if(dist<.15){e.x=e.startX;e.z=e.startZ;e.group.position.set(e.x,terrainHeight(e.x,e.z),e.z);e.retreating=false;return;}
 const step=Math.min(dist,ENEMY_COMBAT[e.type].returnSpeed*dt);
 const nx=e.x+dx/dist*step,nz=e.z+dz/dist*step;
 // Enemy pathing cannot permanently trap an evading creature on scenery.
 if(!collides(nx,nz)){e.x=nx;e.z=nz;}
 else {e.x+=dx/dist*step;e.z+=dz/dist*step;}
 e.group.position.set(e.x,terrainHeight(e.x,e.z),e.z);
 e.group.rotation.y=dampAngle(e.group.rotation.y,Math.atan2(-dx,-dz),10,dt);
}
function updateEnemy(e,dt,t){
 if(e.dead){
  e.levelLabel.hidden=true;e.plate.visible=false;animateCreature(e.group,e.type,t,dt,0,0,false,t-e.deathAt+.01);e.group.visible=t-e.deathAt<.8;
  if(t>=e.respawn){
   e.dead=false;e.plate.visible=true;e.hp=e.max;e.bleedUntil=0;e.rootUntil=0;e.stunUntil=0;
   e.lastAttack=t;e.aggro=false;e.retreating=false;
   e.group.visible=true;e.group.position.set(e.startX,terrainHeight(e.startX,e.startZ),e.startZ);e.x=e.startX;e.z=e.startZ;
  }
  return;
 }
 if(e.bleedUntil>t&&t>=e.nextBleed){e.nextBleed=t+1;hitEnemy(e,3,null,e.bleedSource);}
 if(e.dead)return;
 e.bar.scale.x=clamp(e.hp/e.max,.001,1);e.bar.position.x=-.68*(1-e.hp/e.max);e.plate.lookAt(camera.position);
 animateCreature(e.group,e.type,t,dt,e.charge?10:e.aggro?2:0,e.warning?e.attackWindup:0,e.hitFlashUntil>t,0);
 if(e.type==='dummy')return;
 e.group.position.y=terrainHeight(e.x,e.z);
 const spec=ENEMY_PATTERNS[e.type];
 const playerPos={x:hero.position.x,z:hero.position.z};
 const state=enemyBehaviour(e.type,e,playerPos,e.aggro);
 if(state==='retreat' || hp<=0){
  if(!e.retreating)disengageEnemy(e,t);
  returnEnemyHome(e,dt,t);return;
 }
 if(e.retreating||state==='return'){
  // Once leashed, the mob must reach its home before it can acquire again.
  e.aggro=false;returnEnemyHome(e,dt,t);return;
 }
 if(state==='idle'){return;}
 if(state==='acquire'){e.aggro=true;e.lastAttack=Math.min(e.lastAttack,t-spec.cooldown+.25);}
 const dx=hero.position.x-e.x,dz=hero.position.z-e.z,dist=Math.hypot(dx,dz);
 if((e.stunUntil>t||e.rootUntil>t)&&e.warning)cancelEnemyWarning(e);
 if(e.stunUntil>t&&e.charge)e.charge=null;
 if(e.warning){
  const warning=e.warning;
  e.warningMesh.material.opacity=.23+.20*(1-Math.max(0,e.attackWindup-t)/spec.windup);
  if(t>=e.attackWindup){
   cancelEnemyWarning(e);
   if(spec.kind==='charge'){
    e.charge={direction:warning.direction,end:t+spec.length/spec.chargeSpeed,hit:false};
   }else if(isThreatened(spec.kind,warning,hero.position))applyEnemyDamage(e,spec,t);
  }
  return;
 }
 if(e.charge){
  if(t>=e.charge.end){e.charge=null;return;}
  const dir=e.charge.direction,step=spec.chargeSpeed*dt,nx=e.x+dir.x*step,nz=e.z+dir.z*step;
  const homeDistance=Math.hypot(nx-e.startX,nz-e.startZ);
  if(homeDistance>ENEMY_COMBAT[e.type].leash||collides(nx,nz)){e.charge=null;disengageEnemy(e,t);return;}
  e.x=nx;e.z=nz;e.group.position.set(nx,terrainHeight(nx,nz),nz);
  if(!e.charge.hit&&Math.hypot(hero.position.x-e.x,hero.position.z-e.z)<1.4){
   e.charge.hit=true;applyEnemyDamage(e,spec,t);
  }
  return;
 }
 const ready=t-e.lastAttack>=spec.cooldown;
 if(e.type==='bandit'&&!ready&&dist<4.5&&dist>2&&e.stunUntil<t&&e.rootUntil<t){const sign=e.startX<0?1:-1,n=moveOnGround({x:e.x,z:e.z},-dz/Math.max(.1,dist)*dt*.65*sign,dx/Math.max(.1,dist)*dt*.65*sign);if(Math.hypot(n.x-e.startX,n.z-e.startZ)<ENEMY_COMBAT.bandit.leash){e.x=n.x;e.z=n.z;e.group.position.set(n.x,n.y,n.z);}}

 if(dist<=spec.engage&&ready&&e.stunUntil<t&&e.rootUntil<t){
  startEnemyWarning(e,t);return;
 }
 if(dist>Math.min(spec.engage*.82,2.9)&&e.stunUntil<t&&e.rootUntil<t){
  const speed=(e.type==='bandit'?2.5:e.type==='boar'?2.2:1.75)*(e.slowUntil>t?.42:1);
  const step=Math.min(speed*dt,Math.max(0,dist-2.2));
  if(step>0){
   const nx=e.x+dx/dist*step,nz=e.z+dz/dist*step;
   if(Math.hypot(nx-e.startX,nz-e.startZ)>ENEMY_COMBAT[e.type].leash){disengageEnemy(e,t);return;}
   const moved=moveOnGround({x:e.x,z:e.z},nx-e.x,nz-e.z);e.x=moved.x;e.z=moved.z;e.group.position.set(e.x,moved.y,e.z);
  }
  e.group.rotation.y=dampAngle(e.group.rotation.y,Math.atan2(-dx,-dz),10,dt);
 }
}
function updateEnemyLevelLabels(){
 const playerLevel=combatLevelFromXp(data.xp);
 camera.updateMatrixWorld();
 for(const e of enemies){
  const label=e.levelLabel,dist=Math.hypot(hero.position.x-e.x,hero.position.z-e.z);
  e.plate.visible=!e.dead&&started&&dist<17;if(e.dead||!started||dist>17){label.hidden=true;continue;}
  const pos=new THREE.Vector3(e.x,(e.type==='dummy'?3.78:e.type==='mossling'?2.15:3.24)+e.group.position.y,e.z);
  pos.project(camera);
  if(pos.z< -1||pos.z>1||Math.abs(pos.x)>1.05||Math.abs(pos.y)>1.05){
   label.hidden=true;continue;
  }
  label.hidden=false;
  label.style.left=((pos.x+1)*50).toFixed(2)+'%';
  label.style.top=((1-pos.y)*50).toFixed(2)+'%';
  label.dataset.threat=enemyThreatTier(e.level,playerLevel);
  label.classList.toggle('is-aggro',e.aggro);
 }
}
function animate(dt,t){
 elapsed+=dt;resolveBasicAttack(t);resolveAbility(t);if(queuedStyle&&!pendingBasic&&!pendingAbility){const next=queuedStyle;queuedStyle=null;setStyle(next);}if(hp<=0&&respawnAt&&t>=respawnAt){hero.position.set(0,terrainHeight(0,11),11);hp=maxHealth(levelFromXp(data.xp.vitality).level);respawnAt=0;updateHpUI();}
 if(holdingAttack||keys.has('j')||keys.has('enter'))doBasic();
 const turn=cameraKeyDirection(keys.has('arrowleft'),keys.has('arrowright'));
 if(turn)yaw+=turn*dt*2.35*lookSensitivity;
 const front=forward(),side=new THREE.Vector3(Math.cos(yaw),0,Math.sin(yaw));
 const v=(Number(keys.has('w'))-Number(keys.has('s')))-joystick.y;
 const h=(Number(keys.has('d'))-Number(keys.has('a')))+joystick.x;
 const input=new THREE.Vector3().addScaledVector(front,v).addScaledVector(side,h);
 const speed=(keys.has('shift')?6.3:5)*defenceFor(data.armour[style]).mobility;
 motion=smoothMotion(motion,hp>0?input.x:0,hp>0?input.z:0,speed,dt);
 if(dodgeTravel){const remaining=Math.max(0,Math.min(dt,dodgeTravel.end-t+dt));const next=moveOnGround(hero.position,dodgeTravel.dir.x*(dodgeTravel.speed||12.5)*remaining,dodgeTravel.dir.z*(dodgeTravel.speed||12.5)*remaining);hero.position.set(next.x,next.y,next.z);if(t>=dodgeTravel.end)dodgeTravel=null;}
 else {const next=moveOnGround(hero.position,motion.x*dt,motion.z*dt);hero.position.set(next.x,next.y,next.z);}
 const gait=Math.hypot(motion.x,motion.z);stride+=gait*dt*2.6;
 const combatFacing=holdingAttack||pendingBasic||pendingAbility||t<attackUntil;
 const heading=gait>.3&&!combatFacing?Math.atan2(-motion.x,-motion.z):-yaw;
 visualHeading=dampAngle(visualHeading,heading,19,dt);hero.rotation.y=visualHeading;
 animateActor(hero,{dt,t,stride,speed:gait,attack:attackAnimation,dodge:dodgeTravel?Math.sin(Math.PI*Math.min(1,(t-dodgeTravel.start)/.32)):0,side:h,backwards:v<0,dead:hp<=0});
 const back=front.clone().multiplyScalar(-7.8);
 const look=hero.position.clone().add(new THREE.Vector3(0,1.65,0));
 const ideal=look.clone().add(back).add(new THREE.Vector3(0,2.8+Math.sin(pitch)*3,0));
 cameraJolt=Math.max(0,cameraJolt-dt*.85);if(!matchMedia('(prefers-reduced-motion: reduce)').matches)ideal.y+=cameraJolt*Math.sin(elapsed*95)*.25;
 const safe=safeCamera(look,ideal);ideal.set(safe.x,safe.y,safe.z);
 camera.position.lerp(ideal,1-Math.exp(-10*dt));const actual=safeCamera(look,camera.position);camera.position.set(actual.x,actual.y,actual.z);
 const cameraAim=look.clone().addScaledVector(front,2.8).add(new THREE.Vector3(0,-pitch*4,0));
 cameraFocus.lerp(cameraAim,1-Math.exp(-13*dt));camera.lookAt(cameraFocus);
 for(const e of enemies)updateEnemy(e,dt,t);
 updateEnemyLevelLabels();
 updateLoot(dt,t);
for(let i=projectiles.length-1;i>=0;i--){const p=projectiles[i];p.age+=dt;if(p.particle){p.mesh.position.addScaledVector(p.velocity,dt);p.velocity.y-=7*dt;p.mesh.scale.multiplyScalar(Math.exp(-2.14*dt));}else{const start=p.mesh.position.clone(),travel=projectileTravel(p.distance, p.speed, dt, p.maxDistance);p.mesh.position.addScaledVector(p.dir,travel.step);p.distance=travel.distance;let closest=null,best=Infinity;for(const e of enemies){if(e.dead||e.hp<=0||e.retreating)continue;const center={x:e.x,y:terrainHeight(e.x,e.z)+(e.type==='mossling'?.75:1.25),z:e.z};const hit=segmentHit(start,p.mesh.position,center,e.type==='dummy'?.7:.8);if(hit!==null&&hit<best){best=hit;closest=e;}}const worldHit=segmentWorldHit(start,p.mesh.position);if(worldHit!==null&&worldHit<=best){sparks(start.clone().lerp(p.mesh.position,worldHit),STYLE_COLOURS[p.style],4);p.life=0;}else if(closest){hitEnemy(closest,p.damage,p.opts,p.source);sparks(p.mesh.position.clone(),STYLE_COLOURS[p.style],5);p.life=0;}}
 if(p.age>p.life||(!p.particle&&(p.distance>=p.maxDistance||p.mesh.position.y<terrainHeight(p.mesh.position.x,p.mesh.position.z)))){scene.remove(p.mesh);visuals.cleanupProjectile(p.mesh);projectiles.splice(i,1);}}
visuals.update(dt);
 for(let i=rings.length-1;i>=0;i--){const r=rings[i];r.time+=dt;r.mesh.scale.setScalar(r.radius*(.3+r.time/r.duration*.8));r.mesh.material.opacity=Math.max(0,.85*(1-r.time/r.duration));if(r.time>=r.duration){scene.remove(r.mesh);r.mesh.geometry.dispose();r.mesh.material.dispose();rings.splice(i,1);}}
for(let i=floaters.length-1;i>=0;i--){const f=floaters[i];f.age+=dt;const v=f.pos.clone().project(camera);f.el.style.left=`${(v.x+1)*innerWidth*.5}px`;f.el.style.top=`${(-v.y+1)*innerHeight*.5-f.age*37}px`;f.el.style.opacity=`${Math.max(0,1-f.age/1.1)}`;if(f.age>1.1){f.el.remove();floaters.splice(i,1);}}
let aim=null,aimScore=-Infinity;for(const e of enemies){if(e.dead||e.retreating||e.type==='dummy'&&hero.position.distanceTo(e.group.position)>15)continue;const dx=e.x-hero.position.x,dz=e.z-hero.position.z,dist=Math.hypot(dx,dz);if(dist>30)continue;const dot=(dx*front.x+dz*front.z)/Math.max(.01,dist);const score=dot-0.01*dist;if(dot>.86&&score>aimScore){aim=e;aimScore=score;}}
$('targetbox').hidden=!aim;if(aim){$('target-name').textContent=ENEMY_COMBAT[aim.type].name+' · Combat Lv '+aim.level;$('target-name').dataset.threat=enemyThreatTier(aim.level,combatLevelFromXp(data.xp));$('target-hp').style.width=`${100*aim.hp/aim.max}%`;}
if(hp>0&&hero.position.z> -7&&t-lastHurt>8&&!enemies.some(e=>e.aggro)){const max=maxHealth(levelFromXp(data.xp.vitality).level);if(hp<max){hp=Math.min(max,hp+max*.025*dt);updateHpUI();}}
const z=hero.position.z;$('area').textContent=z< -42?'Forest Road':z< -12?'Oakrest Outskirts':'Oakrest Village';
const timer=attackCooldown(attackUntil,lastAttackInterval,t);
 const attackButton=$('touch-attack'),attackTimer=$('attack-timer');
 attackButton.style.setProperty('--attack-deg',(timer.progress*360).toFixed(1)+'deg');
 attackButton.classList.toggle('recovering',!timer.ready);$('weapon-cycle').textContent=timer.ready?'ATTACK READY':timer.remaining.toFixed(1)+'s recovery';
 if(attackTimer)attackTimer.textContent=timer.ready?'READY':timer.remaining.toFixed(1)+'s';
 const remainingDodge=Math.max(0,dodgeUntil-t);const dodgeLabel=$('touch-dodge').querySelector('small');if(dodgeLabel)dodgeLabel.textContent=remainingDodge>0?remainingDodge.toFixed(1)+'s':'DODGE';
 for(const [i,b] of [...$('skills').children].entries()){const ability=equippedSkills(data,style,data.gear[style])[i];const until=ability?cooldowns.get(`${style}.${slotFamily(style,data.gear[style])}.${ability.id}`)||0:0;const remaining=Math.max(0,until-t);b.classList.toggle('cooling',remaining>0);b.querySelector('.cooldown').textContent=remaining>0?remaining.toFixed(1):'';}
}
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}addEventListener('resize',resize);
const canvas=renderer.domElement;
function cameraMove(dx,dy,touch=false){const speed=lookSensitivity*(touch?.82:1);yaw+=dx*.0044*speed;pitch=clamp(pitch+dy*.0026*speed,-.35,.75);}
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas)cameraMove(e.movementX,e.movementY);});
canvas.addEventListener('mousedown',e=>{if(!started)return;if(!isTouch&&document.pointerLockElement!==canvas)canvas.requestPointerLock?.().catch(()=>{});if(e.button===0)doBasic();});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
let touchLook=null;canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;if(e.clientX<innerWidth*.37)return;touchLook={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture?.(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(!touchLook||touchLook.id!==e.pointerId)return;cameraMove(e.clientX-touchLook.x,e.clientY-touchLook.y);touchLook.x=e.clientX;touchLook.y=e.clientY;});const endTouch=e=>{if(touchLook?.id===e.pointerId)touchLook=null;};canvas.addEventListener('pointerup',endTouch);canvas.addEventListener('pointercancel',endTouch);
const joy=$('joystick'),stick=$('stick');let joyId=null;joy.addEventListener('pointerdown',e=>{joyId=e.pointerId;joy.setPointerCapture(e.pointerId);updateStick(e);});joy.addEventListener('pointermove',e=>{if(e.pointerId===joyId)updateStick(e);});function updateStick(e){const r=joy.getBoundingClientRect(),m=stickFromOffset(e.clientX-r.left-r.width/2,e.clientY-r.top-r.height/2,r.width*.34);joystick.x=m.x;joystick.y=m.y;stick.style.transform=`translate(${m.knobX}px,${m.knobY}px)`;}function releaseStick(e){if(e.pointerId!==joyId)return;joyId=null;joystick.x=0;joystick.y=0;stick.style.transform='';}joy.addEventListener('pointerup',releaseStick);joy.addEventListener('pointercancel',releaseStick);joy.addEventListener('lostpointercapture',releaseStick);
$('touch-dodge').addEventListener('pointerdown',e=>{e.preventDefault();dodge();});
// The camera zone works without pointer lock and can be used simultaneously with the left stick.
const lookZone=$('touch-look-zone');let lookPointer=null;
lookZone.addEventListener('pointerdown',e=>{
  if(!started || lookPointer || (e.pointerType==='mouse' && e.button!==0))return;
  e.preventDefault();lookPointer={id:e.pointerId,x:e.clientX,y:e.clientY};
  lookZone.setPointerCapture?.(e.pointerId);
});
lookZone.addEventListener('pointermove',e=>{
  if(!lookPointer || e.pointerId!==lookPointer.id)return;
  const dx=e.clientX-lookPointer.x,dy=e.clientY-lookPointer.y;
  if(dx||dy){cameraMove(dx,dy,e.pointerType!=='mouse');$('touch-look-tip').classList.add('faded');}
  lookPointer.x=e.clientX;lookPointer.y=e.clientY;
});
function releaseLook(e){if(lookPointer?.id===e.pointerId)lookPointer=null;}
for(const ev of ['pointerup','pointercancel','lostpointercapture'])lookZone.addEventListener(ev,releaseLook);

// Holding ATTACK repeats at each weapon's existing rate; releasing/canceling stops instantly.
const attackButton=$('touch-attack');let attackId=null,attackX=0;
attackButton.addEventListener('pointerdown',e=>{
  if(!started || attackId!==null)return;e.preventDefault();
  attackId=e.pointerId;attackX=e.clientX;holdingAttack=true;doBasic();
  attackButton.classList.add('held');attackButton.setPointerCapture?.(e.pointerId);
});
// Pointer capture retains this right-thumb gesture even after sliding beyond ATTACK.
// Auto-attacks continue while horizontal drag turns the camera; vertical drag does not tilt.
attackButton.addEventListener('pointermove',e=>{
  if(e.pointerId!==attackId || !holdingAttack || (e.pointerType!=='touch'&&e.pointerType!=='pen'))return;
  e.preventDefault();
  const dx=attackDragDelta(e.clientX-attackX);attackX=e.clientX;
  if(dx)cameraMove(dx,0,true);
});
function releaseAttack(e){if(e.pointerId!==attackId)return;attackId=null;holdingAttack=false;attackButton.classList.remove('held');}
for(const ev of ['pointerup','pointercancel','lostpointercapture'])attackButton.addEventListener(ev,releaseAttack);
// Pointerdown applies the swap immediately while another finger holds the joystick.
const swapButton=$('touch-swap');let swapPointerAt=-10;
swapButton.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'||e.pointerType==='pen'){e.preventDefault();swapPointerAt=now();setStyle(nextStyle(style));}});
swapButton.addEventListener('click',()=>{if(now()-swapPointerAt>.35)setStyle(nextStyle(style));});

const speedInput=$('look-speed');speedInput.value=lookSensitivity.toFixed(1);
$('look-speed-value').textContent=`${lookSensitivity.toFixed(1)}×`;
speedInput.addEventListener('input',e=>{
  lookSensitivity=cameraSensitivity(e.target.value);
  $('look-speed-value').textContent=`${lookSensitivity.toFixed(1)}×`;
  try{localStorage.setItem(oakrestKey('oakrest-look-speed'),String(lookSensitivity));}catch{}
});
function closeControls(){$('controls-panel').hidden=true;$('help-button').setAttribute('aria-expanded','false');}
$('help-button').addEventListener('click',()=>{
  const panel=$('controls-panel');panel.hidden=!panel.hidden;
  $('help-button').setAttribute('aria-expanded',String(!panel.hidden));
  document.exitPointerLock?.();
});
$('close-controls').addEventListener('click',closeControls);
addEventListener('blur',()=>{
  holdingAttack=false;attackId=null;attackButton.classList.remove('held');
  joyId=null;joystick.x=0;joystick.y=0;stick.style.transform='';
  lookPointer=null;keys.clear();
});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){holdingAttack=false;attackId=null;attackButton.classList.remove('held');joyId=null;joystick.x=0;joystick.y=0;stick.style.transform='';lookPointer=null;}
});
document.addEventListener('keydown',e=>{if(['Tab','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add((directions[e.key]||e.key).toLowerCase());if(e.repeat)return;if(e.code==='Tab')setStyle(nextStyle(style));if(e.key==='j'||e.key==='J'||e.code==='Enter')doBasic();if(e.code==='Escape'){document.exitPointerLock?.();closeControls();bookClose();}if((e.key==='g'||e.key==='G')&&!e.repeat)pickupNearby();if(e.key==='1'||e.key==='2'||e.key==='3')setStyle(STYLE_ORDER[Number(e.key)-1]);if('qerf'.includes(e.key.toLowerCase())&&e.key.length===1)useAbility('qerf'.indexOf(e.key.toLowerCase()));if(e.key==='Shift')dodge();if(e.code==='Space')dodge();});document.addEventListener('keyup',e=>keys.delete((directions[e.key]||e.key).toLowerCase()));addEventListener('blur',()=>keys.clear());
const characterUI=setupCharacterCreator({
 listProfiles:()=>profiles,getCurrentId:()=>activeCharacter?.id,
 legacyAvailable:()=>legacySave!==null,
 onCreate(input){
  if(!saveWritable)throw new Error('Browser storage is unavailable. Cannot save a new character.');
  const profile=createCharacter(input,profiles,crypto.randomUUID());
  const fresh=freshCharacterSave(),updated=[...profiles,profile];
  try{
   localStorage.setItem(saveKeyFor(profile.id),JSON.stringify(fresh));
   localStorage.setItem(rosterKey,JSON.stringify(updated));
   localStorage.setItem(activeKey,profile.id);
  }catch{throw new Error('Could not save the character. Check available browser storage.');}
  profiles=updated;useCharacter(profile,fresh);save();
 },
 onSelect(profile){
  const saved=localStorage.getItem(saveKeyFor(profile.id));
  if(!saved)throw new Error('Character progress could not be found. No saves were changed.');
  const loaded=validSave(JSON.parse(saved));localStorage.setItem(activeKey,profile.id);
  useCharacter(profile,loaded);
 },
 onLegacy(){
  if(!legacySave)throw new Error('No earlier character was found.');
  localStorage.removeItem(activeKey);useCharacter(null,legacySave);
 }
});
$('choose-character').addEventListener('click',()=>characterUI.show());
if(activeCharacter)useCharacter(activeCharacter,data);
else if(legacySave)useCharacter(null,legacySave);
else characterUI.show();
$('begin').addEventListener('click',()=>{if(!activeCharacter&&!legacySave){characterUI.show();return;}started=true;audio.unlock();$('intro').classList.add('hidden');if(!isTouch)canvas.requestPointerLock?.().catch(()=>{});if(!saveWritable)toast('Your existing save could not be read or backed up. Saving is paused to protect it.');toast('<b>Welcome to Oakrest!</b> Practice on the straw dummy by the gate. Red ground warnings show where an enemy will strike.');});
equipVisual(style,data.gear[style]);refreshSkills();if(data.defeated>=3){questCompleted=true;$('quest-text').textContent='Master all three styles and defeat the bandit on the forest road.';}
let last=performance.now(),lastMetrics=last,frameTimes=[];
const stats={fps:0,p95:0,drawCalls:0,triangles:0,geometries:0,textures:0,effects:0};
function loop(time){requestAnimationFrame(loop);const realDt=(time-last)/1000;last=time;if(document.hidden)return;const dt=Math.min(.05,realDt);if(started){gameTime+=dt;animate(dt,now());}scenery.update(now(),camera);renderer.render(scene,camera);frameTimes.push(realDt*1000);if(time-lastMetrics>2000){const sorted=frameTimes.slice().sort((a,b)=>a-b);stats.fps=1000/(frameTimes.reduce((a,b)=>a+b,0)/frameTimes.length);stats.p95=sorted[Math.floor(sorted.length*.95)];stats.drawCalls=renderer.info.render.calls;stats.triangles=renderer.info.render.triangles;stats.geometries=renderer.info.memory.geometries;stats.textures=renderer.info.memory.textures;stats.effects=projectiles.length+rings.length+visuals.count;frameTimes=[];lastMetrics=time;$('performance-stats').textContent=Math.round(stats.fps)+' FPS · '+stats.drawCalls+' draws · '+quality;}}
requestAnimationFrame(loop);setInterval(save,6000);addEventListener('pagehide',save);
// Read-only diagnostics for reproducible device measurements. No player identifiers.
window.oakrestDiagnostics=()=>({...stats,quality,version:'greenwood-1'});
// Local-only QA uses isolated browser contexts and the real simulation/actions.
if(['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).has('qa'))window.oakrestQA={
 state:()=>({data:structuredClone(data),style,hp,hero:{x:hero.position.x,y:hero.position.y,z:hero.position.z},yaw,shieldUntil,dodgeUntil,cooldowns:Object.fromEntries(cooldowns),pendingBasic:!!pendingBasic,pendingAbility:!!pendingAbility,attackUntil,time:now(),enemies:enemies.map(e=>({type:e.type,x:e.x,z:e.z,hp:e.hp,dead:e.dead,retreating:e.retreating,aggro:e.aggro,warning:!!e.warning})),effects:projectiles.length+rings.length+visuals.count}),
 teleport(x,z,angle=0){hero.position.set(x,terrainHeight(x,z),z);yaw=angle;motion={x:0,z:0};},basic:doBasic,ability:useAbility,dodge,style:setStyle,pickup:pickupNearby,save,
 equip:(kind,id,s=style)=>chooseGear(kind,id,s),slot:(index,id)=>{equipSkill(data,style,data.gear[style],index,id);refreshSkills();},
 step(seconds){for(let i=0;i<Math.round(seconds*60);i++){gameTime+=1/60;animate(1/60,gameTime);}},damage(amount){hp=Math.max(1,hp-amount);updateHpUI();}
};
