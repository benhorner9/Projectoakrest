import * as THREE from 'three';
import {MELEE_PROFILES,sweptStrikeHit,movingSphereHit,abilityCooldownKey,groundPath,DODGE,dodgeInvulnerable,withinChargeLane} from './combat-physics.js';
import { storageKey } from './storage-key.js';
import {CAMERA_DEFAULTS,normalizeCameraSettings,readCameraSettings,firstStandardGamepad,gamepadEdges,cameraOrbitVector,frameDamping} from './control-config.js';
import {indoorViewHeight} from './building-visibility.js';
import { STYLE_ORDER,STYLE_COLOURS,LOADOUTS,XP_BY_MOB,nextStyle,levelFromXp,maxHealth,damageAfterArmour,meleeTarget,clamp,defaultSave,validSave,freshCharacterSave,xpProgress,combatLevelFromXp,ARMOUR,SKILLS_OVERVIEW,skillMilestones,awardTrainingGear,ownsWeapon,ownsArmour,skillCatalogue,equippedSkills,equipSkill,canEquipWeapon,canEquipArmour,slotFamily,outgoingMultiplier,defenceFor,equipPrimaryItem } from './rules.js';
import { stickFromOffset, cameraKeyDirection, cameraSensitivity, attackDragDelta, characterFacingTarget } from './controls.js';
import { installGameZoomGuard } from './touch-gestures.js';
import { ENEMY_PATTERNS, ENEMY_COMBAT, enemyBehaviour, enemyThreatTier, isThreatened, combatAim, MATERIAL_DROPS, grantMonsterMaterial } from './combat-feel.js';
import { basicAttackReady, attackCooldown, projectileTravel, weaponDisplay } from './attack-rules.js';
import {abilityAnimationSpec,basicAnimationSpec,listAnimationSpecs,createAnimationEventJournal} from './ability-animation.js';
import {abilityMotion} from './animation-language.js';
import {maxHitFor,accuracyFor,rollHit,maxHitForAction,acquireEnemy,targetValid,inAttackRange} from './auto-combat.js';
import { createOakrestScenery } from './visual-world.js';
import { createCombatVisuals } from './combat-visuals.js';
import {createOakrestLighting,graphicsProfile} from './visual-fidelity.js';
import { damp, dampAngle, smoothMotion } from './motion.js';
import { createTerrain,terrainHeight,groundScenery,moveOnGround,blocked,safeCamera,addWorldObstacle,registerWorldObstacle,removeWorldObstacle,segmentWorldHit,groundSegmentClear,setCollisionArea } from './terrain.js';
import { createActor,equipActor,applyEquipmentVariant,applyCharacterAppearance,animateActor,createCreature,animateCreature } from './actors.js';
import { readCharacters,createCharacter } from './characters.js';
import { setupCharacterCreator } from './character-creator.js';
import { cottageModel,treeModel,addLandmarks,batchScenery } from './environment.js';
import { segmentHit,dodgeDirection,weaponComparison } from './gameplay-math.js';
import { createAudio } from './audio.js';
import { createOpeningLocations,START_POINTS } from './opening-world.js';
import { buildOakrestTown } from './town-world.js';
import { createOakrestTownLife } from './town-life.js';
import {setupTownUI} from './town-ui.js';
import {equipSlotItem,equipmentModifiers} from './equipment-slots.js';
import {inventoryEntries,renderInventoryGrid,renderEquipmentPaperDoll,renderExamine} from './equipment-ui.js';
import {isOakrestSafe,townInteraction,OAKREST_GROVES} from './town-services.js';
import {TREE_BY_ID,WOODCUTTING_SWING_SECONDS,canCutTree,chopOnce,newTreeState,respawnTree,woodcuttingLevel,woodcuttingProgress,woodcuttingMilestones} from './woodcutting.js';
import {createWoodcuttingTree} from './woodcutting-art.js';
import {renderQuestPage,renderWorldPage} from './ui-pages.js';
import {createOakrestMinimap} from './minimap.js';
import { MAX_GROUND_LOOT,createMonsterDrops,closestDrop,collectDrop,lootName } from './loot.js';
import { itemFromDrop } from './items.js';
import {makeInventoryIcon,makeWorldItemModel} from './item-visuals.js';
import {upgradeHeldWeapon,invalidateHeldWeapon} from './model-assets.js';
import {applyVisibleEquipment} from './character-equipment-art.js';
import {cloneDropTables,readDropTables} from './drop-tables.js';
import {isDropEditorAllowed,setupDropEditor} from './drop-editor.js';

const $=id=>document.getElementById(id);
const oakrestKey=key=>storageKey(key,location.pathname);
const devDropEditor=isDropEditorAllowed(location.pathname,location.hostname);
const dropStorageKey=oakrestKey('oakrest-drop-tables-v1');
let activeDropTables=devDropEditor?readDropTables(localStorage,dropStorageKey):cloneDropTables();
const isTouch=matchMedia('(hover:none), (pointer:coarse)').matches || navigator.maxTouchPoints > 0;
document.documentElement.classList.toggle('touch-enabled',isTouch);
// Suppress Safari page zoom while keeping gameplay multitouch working.
installGameZoomGuard(document);
// Reuse the existing weapon ability buttons inside a right-thumb arc on touch devices.
if(isTouch) $('touch-skill-dock').appendChild($('skills'));
let gameTime=0;const now=()=>gameTime;const audio=createAudio(localStorage,oakrestKey('oakrest-audio'));
const rand=(seed)=>{let s=seed;return ()=>{s=(s*16807)%2147483647;return (s-1)/2147483646;};};
const random=rand(27184);
const scene=new THREE.Scene();scene.background=new THREE.Color('#a9c8b7');scene.fog=new THREE.Fog('#a9c8b7',32,105);
let renderer,visualLighting=null,quality='balanced';try{quality=localStorage.getItem(oakrestKey('oakrest-quality'))||'balanced';}catch{}if(!['low','balanced','high'].includes(quality))quality='balanced';
try { renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,isTouch?1.45:1.85));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;$('game').appendChild(renderer.domElement); }
catch(err){$('error').hidden=false;throw err;}
function applyQuality(value){quality=value;renderer.setPixelRatio(Math.min(devicePixelRatio,graphicsProfile(quality).pixelRatio));visualLighting?.setQuality(quality);renderer.shadowMap.enabled=quality!=='low';renderer.setSize(innerWidth,innerHeight);try{localStorage.setItem(oakrestKey('oakrest-quality'),quality);}catch{}}applyQuality(quality);$('quality').value=quality;$('quality').addEventListener('change',e=>applyQuality(e.target.value));$('sound-enabled').addEventListener('change',e=>{audio.setEnabled(e.target.checked);audio.unlock();});
$('sound-enabled').checked=audio.enabled;
const soundVolume=document.createElement('input');soundVolume.id='combat-volume';soundVolume.type='range';soundVolume.min='0';soundVolume.max='1';soundVolume.step='.05';soundVolume.value=audio.volume;soundVolume.setAttribute('aria-label','Combat sound volume');
soundVolume.addEventListener('input',()=>{audio.setVolume(soundVolume.value);audio.unlock();});
$('sound-enabled').parentElement.append(soundVolume);
const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.1,150);
const sun=new THREE.DirectionalLight('#ffdfad',2.1);sun.position.set(-26,45,20);sun.castShadow=true;sun.shadow.mapSize.set(isTouch?1024:2048,isTouch?1024:2048);sun.shadow.camera.left=-36;sun.shadow.camera.right=36;sun.shadow.camera.top=36;sun.shadow.camera.bottom=-36;sun.shadow.normalBias=.045;scene.add(sun);
scene.add(new THREE.AmbientLight('#dae5da',.40));
const hemi=new THREE.HemisphereLight('#d4e6e4','#747350',1.05);scene.add(hemi);
visualLighting=createOakrestLighting({THREE,scene,sun,quality,terrainHeight});
const MAT={ground:new THREE.MeshLambertMaterial({color:'#73956e',flatShading:true}),road:new THREE.MeshLambertMaterial({color:'#baa889',flatShading:true}),wood:new THREE.MeshLambertMaterial({color:'#79543a'}),woodLight:new THREE.MeshLambertMaterial({color:'#ac7951'}),stone:new THREE.MeshLambertMaterial({color:'#a1a399'}),roof:new THREE.MeshLambertMaterial({color:'#775c56'}),roof2:new THREE.MeshLambertMaterial({color:'#57685a'}),grass:new THREE.MeshLambertMaterial({color:'#547a53'}),leaves:new THREE.MeshLambertMaterial({color:'#436949'}),leaves2:new THREE.MeshLambertMaterial({color:'#648456'}),gold:new THREE.MeshLambertMaterial({color:'#e4bd72'}),black:new THREE.MeshLambertMaterial({color:'#171f1f'}),eye:new THREE.MeshBasicMaterial({color:'#edead6'}),water:new THREE.MeshLambertMaterial({color:'#759e9b'})};
const playerColours={melee:'#ae6954',magic:'#597ba0',ranged:'#627e51'};
const boxGeom=new THREE.BoxGeometry(1,1,1), ballGeom=new THREE.SphereGeometry(1,9,7);
function mat(color){return new THREE.MeshLambertMaterial({color});}
function put(parent,geo,material,x,y,z,sx=1,sy=1,sz=1,shadow=true){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=shadow;m.receiveShadow=shadow;parent.add(m);return m;}
function block(parent,x,y,z,sx,sy,sz,m){return put(parent,boxGeom,m,x,y,z,sx,sy,sz);}
function ball(parent,x,y,z,sx,sy,sz,m){return put(parent,ballGeom,m,x,y,z,sx,sy,sz);}
function cylinder(parent,x,y,z,r,h,m){return put(parent,new THREE.CylinderGeometry(r,r,h,8),m,x,y,z);}
const ground=createTerrain(THREE,scene);
const woodcuttingTrees=[],woodcuttingTreeMap=new Map();
function registerWoodcuttingTree(x,z,height,species,id){
 const group=createWoodcuttingTree(species,height,random()*Math.PI*2);
 group.position.set(x,terrainHeight(x,z),z);scene.add(group);
 const state=newTreeState(species,random);
 const entry={id,x,z,species,group,state,height,obstacle:registerWorldObstacle({x,z,r:.33*height,height:7*height}),approaching:false};
 woodcuttingTrees.push(entry);woodcuttingTreeMap.set(id,entry);return entry;
}
let treeIndex=0;
function tree(x,z,height=1){
 const i=treeIndex++,roll=random();
 const species=z> -25?(roll<.63?'softwood':roll<.85?'pine':'oak'):
  z> -72?(roll<.2?'pine':roll<.45?'oak':roll<.70?'willow':roll<.9?'ironbark':'moonwood'):
  roll<.12?'oak':roll<.28?'willow':roll<.52?'ironbark':roll<.77?'moonwood':'elderwood';
 registerWoodcuttingTree(x,z,height,species,'wild-'+i);
}
for(let i=0;i<155;i++){let x=(random()-.5)*178,z=(random()-.5)*230;if(Math.abs(x)<47&&z>-30&&z<91)continue;if(Math.abs(x)<9&&z< -12)continue;if(Math.hypot(x,z)<12)continue;tree(x,z,.68+random()*.52);}
// The original sealed cottages are replaced by walkable homes in town-world.js.
// Restrained, fixed approach stones instead of random debris spawning through
// paved streets or over city furniture.
for(const [x,z] of [[-12,-28],[13,-30],[-10,-42],[12,-43]]){
  const stone=cylinder(scene,x,.13,z,.25,.26,MAT.stone);
  stone.scale.y=.6;
}
// All wells, city walls, gates, stalls and signs are now authored together in
// the town layout, so their colliders and visual meshes cannot drift apart.
const scenery=createOakrestScenery({THREE,scene,random,MAT});
groundScenery(THREE,scene,[ground]);addLandmarks(scene);batchScenery(scene);
const expandedTown=buildOakrestTown(scene);
for(const spot of OAKREST_GROVES)registerWoodcuttingTree(spot.x,spot.z,.98,'softwood',spot.id);
// Merge static facade/interior materials without merging removable roofs or villagers.
batchScenery(scene);
const townLife=createOakrestTownLife(scene);
const visuals=createCombatVisuals(THREE,scene);

function createHero(){return createActor();}
const hero=createHero();hero.position.set(0,terrainHeight(0,11),11);scene.add(hero);
const minimap=createOakrestMinimap($('minimap-canvas'),$('minimap-area'));
const oldSaveKey=oakrestKey('oakrest-v1'),rosterKey=oakrestKey('oakrest-characters-v1'),activeKey=oakrestKey('oakrest-active-character');
const saveKeyFor=id=>oakrestKey('oakrest-character-save-'+id);
let profiles=[],activeCharacter=null,legacySave=null,saveWritable=true,data=defaultSave();
try{
 const raw=localStorage.getItem(oldSaveKey);
 if(raw){
  // Corrupt legacy data must never prevent creating a new character.
  // Keep its original bytes untouched, and preserve a backup if possible.
  try{
   if(!localStorage.getItem(oakrestKey('oakrest-before-greenwood')))
    localStorage.setItem(oakrestKey('oakrest-before-greenwood'),raw);
  }catch{}
  try{legacySave=validSave(JSON.parse(raw));data=legacySave;}catch{legacySave=null;}
 }
 profiles=readCharacters(localStorage,rosterKey);
 const selected=localStorage.getItem(activeKey);
 const profile=profiles.find(p=>p.id===selected);
 if(profile){
  const saved=localStorage.getItem(saveKeyFor(profile.id));
  if(saved){
   try{data=validSave(JSON.parse(saved));activeCharacter=profile;}catch{activeCharacter=null;}
  }
 }
}catch{saveWritable=false;}
function equipVisual(style,weaponId){
 invalidateHeldWeapon(hero);
 const practice=data.onboarding?.area==='tutorial';
 const protection=ownsArmour(data,data.armour[style])?data.armour[style]:'none';
 equipActor(hero,style,weaponId?.endsWith('-axe')?'woodaxe':slotFamily(style,weaponId),protection);
 const owns=practice||ownsWeapon(data,style,weaponId);
 if(!owns){hero.userData.weapon.clear();hero.userData.offhand.clear();}
 else applyEquipmentVariant(hero,style,weaponId);
 if(activeCharacter)applyCharacterAppearance(hero,activeCharacter);
 applyVisibleEquipment(hero,protection,data.equipment?.[style],style);
 if(owns)upgradeHeldWeapon(hero,style,weaponId);
}
let style='melee',hp=maxHealth(levelFromXp(data.xp.vitality).level), shieldUntil=0,switchUntil=0,attackUntil=0,dodgeUntil=0,dodgeMovingUntil=0;
const activeStrikes=[],groundEffects=[];let dodgeStarted=-Infinity;
let pendingBasic=null,pendingAbility=null,attackAnimation=null,queuedStyle=null,queuedAbility=null,lastAttackInterval=1.15,dodgeTravel=null;
// Instrumentation follows real attack clocks; it is never consulted by hit resolution.
const animationJournal=createAnimationEventJournal(),animationRecoveries=[];
let releasingActionId=null, projectileOrdinal=0;
function beginAnimationAction(spec,at,recoveryAt){
 const id=animationJournal.begin({specId:spec?.id||'unknown',style:spec?.style||style,family:spec?.weaponFamily||'unknown',at});
 animationRecoveries.push({id,at:recoveryAt});return id;
}
function advanceAnimationJournal(t){
 for(let i=animationRecoveries.length-1;i>=0;i--)if(t>=animationRecoveries[i].at){
  const a=animationRecoveries[i];animationJournal.record(a.id,'recovery_end',a.at);animationRecoveries.splice(i,1);
 }
}
function interruptPendingAnimation(t){
 for(const a of [pendingBasic,pendingAbility])if(a?.animationActionId)animationJournal.record(a.animationActionId,'interrupted',t);
}
let yaw=0,pitch=.12,elapsed=0,started=false,questCompleted=false;
const cameraStorageKey=oakrestKey('oakrest-camera-settings-v1');
let cameraSettings=readCameraSettings(localStorage,cameraStorageKey);
try{if(!localStorage.getItem(cameraStorageKey)){const older=localStorage.getItem(oakrestKey('oakrest-look-speed'));if(older!==null)cameraSettings=normalizeCameraSettings({...cameraSettings,sensitivity:cameraSensitivity(older)});}}catch{}
let lookSensitivity=cameraSettings.sensitivity;
camera.fov=cameraSettings.fov;camera.updateProjectionMatrix();
function saveCameraSettings(){try{localStorage.setItem(cameraStorageKey,JSON.stringify(cameraSettings));}catch{}}
let padState=null,padPrevious=null,padName='';
let holdingAttack=false;let activeSkillCache=[];let nextLabelUpdate=0;
let combatTarget=null,combatPath=null,combatPathAt=0,combatPathGoal=null;
const keys=new Set(),joystick={x:0,y:0},enemies=[],projectiles=[],rings=[],floaters=[],cooldowns=new Map();
let respawnAt=0,lastHurt=-100;let comboStage=0,lastMeleeAttack=-10,recoilUntil=0,cameraJolt=0;
let motion={x:0,z:0},stride=0,visualHeading=0;
const cameraFocus=new THREE.Vector3(0,1.6,7.8);
 let interiorCameraBlend=0;
const forward=()=>new THREE.Vector3(Math.sin(yaw),0,-Math.cos(yaw));
const directions={ArrowUp:'w',ArrowDown:'s'};
let bookStyle='melee',bookTab='skills',bookSlot=0,skillDetail=null;
const progressPanel=$('progression-panel'),detailPanel=$('skill-detail');
const sideInventory=$('side-inventory'),sideInventoryToggle=$('side-inventory-toggle'),sideInventoryBody=$('side-inventory-body');
const sideInventoryStorageKey=oakrestKey('oakrest-quick-inventory-v1');
let sideInventoryOpen=false,sideInventoryFingerprint='';
try{sideInventoryOpen=localStorage.getItem(sideInventoryStorageKey)==='open';}catch{}
/** Quick backpack uses the exact same item identities, slot layout and drag rules as the full inventory. */
function refreshSideInventory(force=false){
 sideInventory.hidden=!sideInventoryOpen;
 sideInventoryToggle.setAttribute('aria-expanded',String(sideInventoryOpen));
 sideInventoryToggle.setAttribute('aria-label',sideInventoryOpen?'Hide backpack while playing':'Show backpack while playing');
 if(!sideInventoryOpen)return;
 const entries=inventoryEntries(data);
 const fingerprint=JSON.stringify([entries.map(e=>[e.canonical,e.qty]),data.inventorySlots,data.coins]);
 if(!force&&fingerprint===sideInventoryFingerprint)return;
 sideInventoryFingerprint=fingerprint;
 const scroll=sideInventoryBody.scrollTop;
 sideInventoryBody.replaceChildren();
 $('side-inventory-count').textContent=entries.length+' / 28';
 renderInventoryGrid(sideInventoryBody,data,id=>{
  bookOpen('inventory');
  showItemDetail(id);
 },()=>{save();if(!progressPanel.hidden)renderBook();});
 sideInventoryBody.scrollTop=scroll;
}
function setSideInventoryOpen(open){
 sideInventoryOpen=!!open;
 try{localStorage.setItem(sideInventoryStorageKey,sideInventoryOpen?'open':'closed');}catch{}
 refreshSideInventory(true);
}
sideInventoryToggle.addEventListener('click',()=>setSideInventoryOpen(!sideInventoryOpen));
$('side-inventory-close').addEventListener('click',()=>setSideInventoryOpen(false));

function bookOpen(tab='inventory',toggle=false){
 if(woodcuttingTarget)stopWoodcutting();
 if(toggle&&!progressPanel.hidden&&bookTab===tab){bookClose();return;}
 bookStyle=style;bookTab=tab;bookSlot=0;skillDetail=null;detailPanel.hidden=true;
 progressPanel.hidden=false;$('equipment-picker').hidden=true;
 $('menu-backdrop').hidden=false;document.documentElement.classList.add('oak-menu-open');
 $('loadout-button').setAttribute('aria-expanded','true');
 $('loadout-button').setAttribute('aria-label','Close character menu');
 document.exitPointerLock?.();renderBook();
 $(bookTabs[tab])?.focus({preventScroll:true});
}
function bookClose(){
 if(progressPanel.hidden)return;
 skillDetail=null;detailPanel.hidden=true;progressPanel.hidden=true;
 $('controls-panel').hidden=true;
 $('menu-backdrop').hidden=true;document.documentElement.classList.remove('oak-menu-open');
 $('loadout-button').setAttribute('aria-expanded','false');
 $('loadout-button').setAttribute('aria-label','Open character menu');
 $('loadout-button').focus({preventScroll:true});
}
$('close-progression').addEventListener('click',bookClose);
$('menu-backdrop').addEventListener('click',bookClose);
const bookTabs={equip:'progression-equipment',inventory:'progression-inventory',skills:'progression-levels-tab',abilities:'progression-skills',quests:'progression-quests',map:'progression-map',settings:'progression-settings'};
for(const [tab,id] of Object.entries(bookTabs))$(id).addEventListener('click',()=>{bookTab=tab;skillDetail=null;detailPanel.hidden=true;renderBook();$('progression-content').scrollTop=0;});
$('loadout-button').addEventListener('click',()=>bookOpen(progressPanel.hidden?'inventory':bookTab,true));
$('minimap-button').addEventListener('click',()=>bookOpen('map'));
document.addEventListener('keydown',event=>{
 if(progressPanel.hidden)return;
 if(event.key==='Escape'){event.preventDefault();event.stopPropagation();bookClose();return;}
 if(event.key==='Tab'){
  const fields=[...progressPanel.querySelectorAll('button:not(:disabled),select:not(:disabled),input:not(:disabled),a[href]')].filter(x=>x.getClientRects().length);
  if(fields.length){const first=fields[0],last=fields[fields.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
 }
 event.stopPropagation(); // Menu keys must not also trigger gameplay.
},true);
if(devDropEditor){
 setupDropEditor({
  storage:localStorage,key:dropStorageKey,
  button:$('drop-editor-open'),modal:$('drop-editor'),
  onApply:(saved)=>{activeDropTables=saved;}
 });
}
$('skill-detail-back').addEventListener('click',()=>{skillDetail=null;detailPanel.hidden=true;});
function el(tag,text,parent,className){
 const node=document.createElement(tag);if(text!==null&&text!==undefined)node.textContent=text;
 if(className)node.className=className;if(parent)parent.append(node);return node;
}
function addItemIcon(parent,itemId){
 const img=makeInventoryIcon(itemId);if(img)parent.append(img);return img;
}
function uiButton(parent,label,act,disabled=false){
 const b=el('button',label,parent);b.type='button';b.disabled=disabled;if(act)b.addEventListener('click',act);return b;
}
const xpText=value=>Math.floor(value).toLocaleString('en-GB');
function showSkillDetail(id){
 const isWoodcutting=id==='woodcutting';
 const def=isWoodcutting?{icon:'🌲',label:'Woodcutting',description:'Cut seven tree species, collect logs and use progressively stronger axes. Higher-level axes make returning to lower-level trees more efficient.'}:
  SKILLS_OVERVIEW.find(entry=>entry.id===id);
 if(!def)return;
 skillDetail=id;
 const learned=data.professions?.woodcuttingLearned===true;
 const info=isWoodcutting?woodcuttingProgress(data.professions?.woodcuttingXp||0):xpProgress(data.xp[id]);
 detailPanel.hidden=false;
 $('skill-detail-title').textContent=def.icon+' '+def.label+' · Level '+info.level;
 const body=$('skill-detail-body');body.replaceChildren();
 el('p',def.description,body,'detail-desc');
 if(isWoodcutting&&!learned)el('p',"Learn Woodcutting at Oakrest's Forester's Lodge to use these unlocks.",body,'detail-footnote');
 el('p',info.maxed?'MAX LEVEL · '+xpText(info.totalXp)+' total XP':
  xpText(info.current)+' / '+xpText(info.required)+' XP · '+xpText(info.needed)+' XP needed for level '+(info.level+1),body,'detail-xp');
 el('h3',isWoodcutting?'Tree and axe level requirements':'What you learn or can wear',body);
 const milestones=isWoodcutting?woodcuttingMilestones():skillMilestones(id);
 for(const entry of milestones){
  const unlocked=info.level>=entry.level&&(!isWoodcutting||learned);
  const row=el('div',null,body,'milestone '+(unlocked?'earned':'upcoming'));
  el('span','LV '+entry.level,row,'milestone-level');
  const item=el('div',null,row,'milestone-content');
  el('strong',entry.name,item);
  el('small',entry.type+' · '+entry.detail,item);
  el('span',unlocked?'UNLOCKED':'LOCKED',row,'milestone-state');
 }
 el('p',isWoodcutting?'Each tree gives 1–5 logs before falling and regrows after 15–60 seconds. Axes can be carried or wielded; higher-tier axes still cut every lower-tier tree.':'Levels let you use equipment and learn abilities. Find equipment in physical enemy drops, then collect it from the ground.',body,'detail-footnote');
}
function selectStyle(s){bookStyle=s;bookSlot=0;renderBook();}
function chooseGear(kind,id,selectedStyle=bookStyle){
 if(selectedStyle===style&&(pendingBasic||pendingAbility||activeStrikes.length)){toast("Finish your attack before changing equipment.");return;}
 if(!equipPrimaryItem(data,kind,selectedStyle,id))return;
 save();if(style===selectedStyle){equipVisual(style,data.gear[style]);refreshSkills();}
 renderBook();
}
function chooseSlotGear(selectedStyle,slot,id){
 if(selectedStyle===style&&(pendingBasic||pendingAbility||activeStrikes.length)){toast('Finish your attack before changing equipment.');return;}
 if(!equipSlotItem(data,selectedStyle,slot,id))return;
 save();if(selectedStyle===style)equipVisual(style,data.gear[style]);renderBook();
}
function showItemDetail(itemId){
 skillDetail=null;detailPanel.hidden=false;
 $('skill-detail-title').textContent='EXAMINE ITEM';
 const body=$('skill-detail-body');body.replaceChildren();
 renderExamine(body,data,bookStyle,itemId,{
  onGear:(kind,id,s)=>{chooseGear(kind,id,s);showItemDetail(itemId);},
  onSlot:(s,slot,id)=>{chooseSlotGear(s,slot,id);showItemDetail(itemId);},
  onTravel:()=>{bookClose();useTravelScroll();}
 });
}
function renderBook(){
 if(progressPanel.hidden)return;
 const combatLevel=levelFromXp(data.xp[bookStyle]).level;
 $('progression-levels').textContent='COMBAT LV '+combatLevelFromXp(data.xp)+' · '+bookStyle.toUpperCase()+' '+combatLevel+' · '+data.coins+' COINS';
 for(const [tab,id] of Object.entries(bookTabs))$(id).classList.toggle('selected',tab===bookTab);
 const styles=$('progression-styles');styles.replaceChildren();
 styles.hidden=!['equip','abilities'].includes(bookTab);
 if(bookTab!=='settings')$('controls-panel').hidden=true;
 if(!styles.hidden)for(const s of STYLE_ORDER){
  const b=uiButton(styles,s.toUpperCase()+' '+levelFromXp(data.xp[s]).level,()=>selectStyle(s));
  b.classList.toggle('selected',s===bookStyle);
 }
 const host=$('progression-content');
 // Keep the original settings controls in the live DOM between tab changes.
 const controls=$('controls-panel');
 if(controls.parentElement===host){controls.hidden=true;$('hud').append(controls);}
 host.replaceChildren();
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
  const wcXp=data.professions?.woodcuttingXp||0,learned=data.professions?.woodcuttingLearned===true;
  const wcInfo=woodcuttingProgress(wcXp);
  const woodCard=uiButton(grid,'',()=>showSkillDetail('woodcutting'));
  woodCard.className='level-card level-woodcutting';
  const woodTop=el('div',null,woodCard,'level-card-title');
  el('strong','🌲 Woodcutting',woodTop);
  el('span','Level '+wcInfo.level,woodTop);
  const wcTrack=el('div',null,woodCard,'level-xp-track');
  const wcFill=el('div',null,wcTrack,'level-xp-fill');
  wcFill.style.width=(wcInfo.progress*100).toFixed(1)+'%';
  el('small',!learned?'Learn at Oakrest Forester’s Lodge':wcInfo.maxed?'MAX LEVEL':xpText(wcInfo.needed)+' XP to next level',woodCard);
  el('small','Total XP '+xpText(wcInfo.totalXp)+' · View unlocks ›',woodCard,'level-meta');
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
  renderEquipmentPaperDoll(host,data,bookStyle,showItemDetail);
   const item=LOADOUTS[bookStyle]?.[data.gear[bookStyle]];
   const weaponPower=item?.basic||(bookStyle==='melee'?UNARMED.basic:0);
   const combatLv=levelFromXp(data.xp[bookStyle]).level;
   const equipmentPower=outgoingMultiplier(data.armour[bookStyle],bookStyle)*equipmentModifiers(data,bookStyle).power;
   el('p',bookStyle.toUpperCase()+' · Level '+combatLv+' · Maximum hit '+maxHitFor(combatLv,weaponPower,equipmentPower)+' · Accuracy vs level '+combatLv+': '+Math.round(accuracyFor(combatLv,combatLv,weaponPower)*100)+'% · '+(item?.interval||UNARMED.interval).toFixed(2)+'s per attack',host,'detail-footnote');
 }else if(bookTab==='inventory'){
  renderInventoryGrid(host,data,showItemDetail,()=>{save();renderBook();});
 }else if(bookTab==='quests'){
  renderQuestPage(host,{area:data.onboarding?.area||'world',defeated:data.defeated||0,quest:$('quest-text').textContent,progress:$('quest-progress').textContent});
 }else if(bookTab==='map'){
  renderWorldPage(host,{area:data.onboarding?.area||'world',x:hero.position.x,z:hero.position.z});
 }else if(bookTab==='settings'){
  host.append($('controls-panel'));$('controls-panel').hidden=false;
  $('help-button').setAttribute('aria-expanded','true');
 }
}
const UNARMED={title:'Unarmed',family:'unarmed',basic:6,reach:1.55,interval:1.08,windup:.29};
function getWeapon(){if(data.onboarding?.area==='tutorial'&&LOADOUTS[style][data.gear[style]])return LOADOUTS[style][data.gear[style]];if(ownsWeapon(data,style,data.gear[style]))return LOADOUTS[style][data.gear[style]];return style==='melee'?UNARMED:{...UNARMED,title:'No weapon',basic:0,reach:0};}
function save(){refreshSideInventory();if(!saveWritable)return;try{localStorage.setItem(activeCharacter?saveKeyFor(activeCharacter.id):oldSaveKey,JSON.stringify(data));}catch{saveWritable=false;}}
function useCharacter(profile,loaded){
 stopWoodcutting();stopCombat();
 // Switching a saved character must also switch its physical ground drops.
 for(const id of [...lootModels.keys()])discardLootModel(id);
 activeCharacter=profile;data=loaded;style='melee';hp=maxHealth(levelFromXp(data.xp.vitality).level);
 for(const drop of data.groundLoot||[]){makeLootModel(drop);worldLayer.push(lootModels.get(drop.id).group);}
 hero.position.set(0,terrainHeight(0,11),11);
 updateOpeningArea();equipVisual(style,data.gear[style]);refreshSkills();
 $('character-name-label').hidden=!profile;$('character-name-label').textContent=profile?.name||'';
 $('begin').textContent=profile?'PLAY AS '+profile.name.toUpperCase():'CONTINUE ORIGINAL ADVENTURE';
 $('quest-text').textContent=data.defeated>=3?'Master all three styles and defeat the bandit on the forest road.':'Explore the Bank, General Store and Forester\'s Lodge. Then follow the protected greenbelt to the monsters in the Greenwood.';
 questCompleted=data.defeated>=3;updateHpUI();refreshSideInventory(true);
}
function toast(message){
 const el=document.createElement('div');el.className='toast';
 if(message.includes('LEVEL '))el.classList.add('level-up');
 else if(message.includes('LOOT'))el.classList.add('loot');
 else if(message.includes('DEFEATED'))el.classList.add('defeat');
 el.innerHTML=message;$('notifications').prepend(el);
 setTimeout(()=>el.remove(),3100);
}
function floating(text,color,pos){if(floaters.length>=48){const oldest=floaters.shift();oldest.el.remove();}const el=document.createElement('div');el.className='damage-pop';el.textContent=text;el.style.color=color;$('floating').append(el);floaters.push({el,pos:pos.clone(),age:0});}
// Persisted ground pickups are separate from combat XP and existing local inventory.
const lootModels=new Map();let lootCounter=0,lastLootId=null;
function makeLootModel(drop){
 const group=new THREE.Group();group.position.set(drop.x,terrainHeight(drop.x,drop.z),drop.z);
 const colour=itemFromDrop(drop)?.accent||'#b8b6f3';
 const glow=new THREE.MeshBasicMaterial({color:colour,transparent:true,opacity:.75,depthWrite:false});
 const halo=new THREE.Mesh(new THREE.RingGeometry(.36,.53,20),new THREE.MeshBasicMaterial({color:colour,transparent:true,opacity:.46,side:THREE.DoubleSide,depthWrite:false}));
 halo.rotation.x=-Math.PI/2;halo.position.y=.065;group.add(halo);
 const core=makeWorldItemModel(drop);
 if(!core)return;
 core.position.y=.30;
 group.add(core);
 const aura=new THREE.Mesh(new THREE.SphereGeometry(.38,9,7),glow);
 aura.position.y=.62;group.add(aura);
 scene.add(group);lootModels.set(drop.id,{group,core,aura,halo,phase:random()*6.28});
}
function discardLootModel(id){
 const m=lootModels.get(id);if(!m)return;
 scene.remove(m.group);m.core.userData.destroyed=true;
 m.group.traverse(o=>{if(o.isMesh&&!o.userData.sharedKayKitAsset){o.geometry.dispose();o.material.dispose();}});
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
 const created=createMonsterDrops(enemy.type,enemy.x,enemy.z,random,()=>prefix+'-'+(++lootCounter),activeDropTables);
 for(const d of created)addGroundLoot(d);
 save();
}
function pickupNearby(){
 if(woodcuttingTarget)stopWoodcutting();
 if(!started||hp<=0||data.onboarding?.area==='tutorial'||data.onboarding?.area==='realm')return;
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
 if(started&&hp>0&&data.onboarding?.area!=='tutorial'&&data.onboarding?.area!=='realm')nearest=closestDrop(data.groundLoot,hero.position.x,hero.position.z,3.3);
 if(nearest?.id!==lastLootId){
  lastLootId=nearest?.id||null;
  lootPanel.hidden=!nearest;
  if(nearest){
   $('loot-label').textContent=lootName(nearest);
   const graphic=$('loot-item-icon');graphic.replaceChildren();
   const item=itemFromDrop(nearest);if(item)addItemIcon(graphic,item.id);
  }
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
 label.className='enemy-world-label';label.addEventListener('pointerdown',event=>{event.preventDefault();event.stopPropagation();selectCombatTarget(d);});label.textContent='Lv '+d.level+' · '+ENEMY_COMBAT[type].name;
 label.hidden=true;d.levelLabel=label;$('enemy-level-layer').append(label);
 return d;
}
makeEnemy('dummy',-6,-3);

let woodcuttingTarget=null,woodcuttingSwingStart=0,woodcuttingNextChop=0;
function nearbyWoodcuttingTree(x,z){
 let best=null,distance=4.2;
 for(const tree of woodcuttingTrees){
  if(tree.state.respawnAt)continue;
  const d=Math.hypot(x-tree.x,z-tree.z);
  if(d<distance){best=tree;distance=d;}
 }
 return best?{id:best.id,x:best.x,z:best.z,type:'grove',label:TREE_BY_ID[best.species].name+' tree',level:TREE_BY_ID[best.species].level,reach:4.2}:null;
}
function stopWoodcutting(){
 if(!woodcuttingTarget)return;
 woodcuttingTarget.approaching=false;woodcuttingTarget=null;
 woodcuttingSwingStart=0;woodcuttingNextChop=0;
 equipVisual(style,data.gear[style]);
}
function startWoodcutting(id){
 const tree=woodcuttingTreeMap.get(id);
 if(!started||hp<=0||(data.onboarding?.area||'world')!=='world'||!tree)return false;
 if(tree.state.respawnAt){toast('This '+TREE_BY_ID[tree.species].name+' tree is regrowing');return true;}
 const allowed=canCutTree(data,tree.species);
 if(!allowed.ok){toast(allowed.reason);return true;}
 if(pendingBasic||pendingAbility||dodgeTravel){toast('Finish your action before cutting wood');return true;}
 stopWoodcutting();stopCombat();
 woodcuttingTarget=tree;tree.approaching=true;woodcuttingSwingStart=0;woodcuttingNextChop=0;
 const protection=ownsArmour(data,data.armour[style])?data.armour[style]:'none';
 invalidateHeldWeapon(hero);
 equipActor(hero,'melee','woodaxe',protection);
 applyEquipmentVariant(hero,'melee',allowed.axe.id);
 if(activeCharacter)applyCharacterAppearance(hero,activeCharacter);
 applyVisibleEquipment(hero,protection,data.equipment?.[style],style);
 upgradeHeldWeapon(hero,'melee',allowed.axe.id);
 toast('Cutting '+allowed.tree.name+' · '+allowed.axe.name);
 return true;
}
function updateWoodcutting(dt,t,manualInput){
 const tree=woodcuttingTarget;
 if(!tree)return;
 if(manualInput||hp<=0||combatTarget||dodgeTravel||isGameplayMenuOpen()||
    (data.onboarding?.area||'world')!=='world'||tree.state.respawnAt){
  stopWoodcutting();return;
 }
 const dist=Math.hypot(tree.x-hero.position.x,tree.z-hero.position.z);
 if(dist>4.4){stopWoodcutting();return;}
 const dx=tree.x-hero.position.x,dz=tree.z-hero.position.z;
 if(dist>1.32){
  tree.approaching=true;woodcuttingSwingStart=0;woodcuttingNextChop=0;
  const step=Math.min(3.5*dt,Math.max(0,dist-1.30));
  const next=moveOnGround(hero.position,dx/dist*step,dz/dist*step,.42);
  const moved=Math.hypot(next.x-hero.position.x,next.z-hero.position.z);
  hero.position.set(next.x,next.y,next.z);
  if(moved<.001&&step>.001){stopWoodcutting();toast('Cannot reach that tree');}
  return;
 }
 tree.approaching=false;
 if(!woodcuttingSwingStart){woodcuttingSwingStart=t;woodcuttingNextChop=t+WOODCUTTING_SWING_SECONDS*.48;}
 if(t+1e-6<woodcuttingNextChop)return;
 woodcuttingNextChop+=WOODCUTTING_SWING_SECONDS;
 audio.play('chop');
 const outcome=chopOnce(data,tree.state,t,random);
 if(!outcome.ok){stopWoodcutting();toast(outcome.reason);return;}
 sparks(new THREE.Vector3(tree.x,terrainHeight(tree.x,tree.z)+1.12,tree.z),'#d6b68b',2);
 if(!outcome.success)return;
 floating('+'+outcome.xp+' WC XP · '+TREE_BY_ID[tree.species].name+' log','#c5ed97',
  hero.position.clone().add(new THREE.Vector3(0,2.7,0)));
 if(outcome.levelUp)toast('WOODCUTTING LEVEL '+outcome.newLevel+'!');
 save();if(!progressPanel.hidden)renderBook();
 if(outcome.depleted){
  if(tree.obstacle){removeWorldObstacle(tree.obstacle);tree.obstacle=null;}
  audio.play('treefall',true);
  stopWoodcutting();
  toast(TREE_BY_ID[tree.species].name+' tree fell · Regrowing');
 }
}
function updateWoodcuttingTrees(t){
 for(const tree of woodcuttingTrees){
  const state=tree.state;
  if(!state.respawnAt)continue;
  if(respawnTree(state,t,random)){
   tree.group.rotation.set(0,0,0);
   tree.group.visible=(data.onboarding?.area||'world')==='world';
   tree.obstacle=registerWorldObstacle({x:tree.x,z:tree.z,r:.33*tree.height,height:7*tree.height});
   continue;
  }
  const elapsed=t-state.fallAt;
  tree.group.rotation.z=-Math.min(1,Math.max(0,elapsed)/1.18)*Math.PI*.49;
  tree.group.visible=elapsed<1.32&&(data.onboarding?.area||'world')==='world';
 }
}

// First hostile encounters are a journey beyond the safe town and approach.
makeEnemy('mossling',-4,-55);makeEnemy('mossling',6,-62);makeEnemy('mossling',-9,-70);
makeEnemy('boar',5,-77);makeEnemy('boar',11,-83);
makeEnemy('bandit',-6,-98);
// The existing Greenwood is one physical world layer. The tutorial and Portal
// Realm are separate scenes in the same renderer, with independent visibility.
const worldLayer=scene.children.filter(obj=>obj!==hero&&!obj.isLight);
const openingWorld=createOpeningLocations(scene);
const townUI=setupTownUI({
 getData:()=>data,getTime:now,getVillager:(x,z)=>townLife.nearby(x,z),
 getTree:nearbyWoodcuttingTree,onCutTree:startWoodcutting,
 onChange:()=>{save();updateHpUI();if(!progressPanel.hidden)renderBook();},
 onEquipmentChange:()=>{equipVisual(style,data.gear[style]);refreshSkills();},
 notify:message=>toast(message),
 onOpen:()=>{stopWoodcutting();bookClose();$('controls-panel').hidden=true;document.exitPointerLock?.();}
});
const practiceDummy=makeEnemy('dummy',0,-7);
practiceDummy.onboardingDummy=true;
openingWorld.training.add(practiceDummy.group);
const activeEnemies=()=>data.onboarding?.area==='tutorial'?[practiceDummy]:
 data.onboarding?.area==='realm'?[]:enemies.filter(e=>!e.onboardingDummy);
const firstCity={name:'Oakrest',id:'oakrest'};
function updateOpeningArea(){
 const area=data.onboarding?.area||'world';setCollisionArea(area);activeStrikes.length=0;groundEffects.length=0;
 for(const p of projectiles){scene.remove(p.mesh);visuals.cleanupProjectile(p.mesh);}projectiles.length=0;
 for(const o of worldLayer)o.visible=area==='world';
 openingWorld.training.visible=area==='tutorial';
 openingWorld.realm.visible=area==='realm';
 scene.background.set(area==='realm'?'#3b445e':area==='tutorial'?'#9fbf9f':'#a9c8b7');
 scene.fog.color.set(scene.background);
 $('area').textContent=area==='tutorial'?'The First Steps':area==='realm'?'Portal Realm':'Oakrest City';
 $('quest-text').closest('.quest').style.display=area==='world'?'':'none';
 hero.position.set(START_POINTS[area].x,terrainHeight(START_POINTS[area].x,START_POINTS[area].z),START_POINTS[area].z);
 yaw=0;motion={x:0,z:0};queuedStyle=null;pendingBasic=null;pendingAbility=null;dodgeTravel=null;
 for(const e of enemies){e.levelLabel.hidden=true; if(e.onboardingDummy){e.group.visible=area==='tutorial';e.hp=e.max;}else e.group.visible=area==='world';}
 for(const model of lootModels.values())model.group.visible=area==='world';
 $('targetbox').hidden=true;
 renderOpeningGuide();
}
function renderOpeningGuide(){
 const o=data.onboarding,area=o?.area||'world';
 const panel=$('opening-panel'),action=$('opening-action'),styles=$('opening-styles'),interact=$('opening-interact');
 panel.hidden=area==='world';interact.hidden=true;action.hidden=true;styles.hidden=true;
 if(area==='world')return;
 if(area==='tutorial'){
  const hits=o.tutorial.hitStyles,finished=hits.length===3;
  $('opening-step').textContent='THE FIRST STEPS';
  $('opening-progress').textContent=finished?'3 / 3':hits.length+' / 3';
  if(!finished){
   $('opening-title').textContent='Practise all three combat styles';
   $('opening-instructions').textContent='Move towards the training dummy and hit it with Melee, Magic and Ranged. Use Tab, 1/2/3 or SWAP to change style. Practice weapons are loaned here and disappear when you leave.';
   styles.hidden=false;styles.replaceChildren();
   for(const s of STYLE_ORDER){const chip=document.createElement('span');chip.className='opening-style'+(hits.includes(s)?' done':'');chip.textContent=(hits.includes(s)?'✓ ':'○ ')+s.toUpperCase();styles.append(chip);}
  }else if(!o.tutorial.skillsRead){
   $('opening-title').textContent='Understanding your skills';
   $('opening-instructions').textContent='Health, Melee, Magic and Ranged grow separately. Gathering and crafting skills—including Mining, Hunting, Blacksmithing and Inscription—will be taught here as they are implemented. Inscription will make spell and travel scrolls.';
   action.hidden=false;action.textContent='I UNDERSTAND THE SKILLS';
   action.onclick=()=>{o.tutorial.skillsRead=true;save();renderOpeningGuide();};
  }else if(o.teleportScrolls<1){
   $('opening-title').textContent='Training complete!';
   $('opening-instructions').textContent='You have learned the basics. Accept your first Teleportation Scroll from your instructor. Your practice equipment stays here.';
   action.hidden=false;action.textContent='RECEIVE TELEPORTATION SCROLL';
   action.onclick=()=>{o.teleportScrolls=1;save();renderOpeningGuide();toast('Received: Teleportation Scroll ×1');};
  }else{
   $('opening-title').textContent='Your first journey';
   $('opening-instructions').textContent='Use your Teleportation Scroll to travel to the Portal Realm. Only the portal to '+firstCity.name+' is open. The scroll is consumed when used.';
   action.hidden=false;action.textContent='USE TELEPORTATION SCROLL (1)';
   action.onclick=()=>useTravelScroll();
  }
 }else if(area==='realm'){
  $('opening-step').textContent='THE PORTAL REALM';
  $('opening-progress').textContent='FIRST DESTINATION';
  $('opening-title').textContent='The gateway to '+firstCity.name;
  $('opening-instructions').textContent='Walk into reach of the glowing gateway ahead. It is your only active destination. Other portals unlock when you activate them in cities you visit.';
 }
}
function useTravelScroll(){
 const o=data.onboarding;
 if(!started||!o||o.teleportScrolls<1||o.area==='realm')return false;
 if(o.area==='tutorial'&&(!o.tutorial.skillsRead||o.tutorial.hitStyles.length<3))return false;
 o.teleportScrolls--;o.area='realm';style='melee';updateOpeningArea();equipVisual(style,data.gear[style]);refreshSkills();save();
 toast('You entered the Portal Realm');return true;
}
function enterCityPortal(){
 const o=data.onboarding;
 if(!started||o?.area!=='realm'||Math.hypot(hero.position.x-openingWorld.cityPortal.x,hero.position.z-openingWorld.cityPortal.z)>3.7)return false;
 o.activatedPortals=['oakrest'];o.area='world';style='melee';updateOpeningArea();yaw=Math.PI;visualHeading=-Math.PI;hero.rotation.y=visualHeading;equipVisual(style,data.gear[style]);refreshSkills();
 save();toast('Welcome to '+firstCity.name+'! Your adventure begins.');return true;
}
$('opening-interact-button').addEventListener('click',enterCityPortal);
function updatePortalInteraction(){
 const o=data.onboarding,interact=$('opening-interact');
 if(!started||o?.area!=='realm'){interact.hidden=true;return;}
 const near=Math.hypot(hero.position.x-openingWorld.cityPortal.x,hero.position.z-openingWorld.cityPortal.z)<=3.7;
 interact.hidden=!near;if(near){$('opening-interact-description').textContent='Active gateway: '+firstCity.name;$('opening-interact-button').textContent='ENTER '+firstCity.name.toUpperCase()+' · E';}
}
function updateHpUI(){$('combat-level-value').textContent=combatLevelFromXp(data.xp);const vital=levelFromXp(data.xp.vitality);const max=maxHealth(vital.level);$('health-label').textContent=`${Math.ceil(hp)} / ${max} HP`;$('hp-fill').style.width=`${100*hp/max}%`;$('hp-fill').parentElement.setAttribute('aria-valuenow',String(Math.max(0,Math.ceil(hp))));$('hp-fill').parentElement.setAttribute('aria-valuemax',String(max));$('xp-fill').style.width=`${100*levelFromXp(data.xp[style]).progress}%`;$('level-label').textContent=`VITALITY ${vital.level}`;$('style-level').textContent=`${style.toUpperCase()} LEVEL ${levelFromXp(data.xp[style]).level}`;$('coins').textContent=`${data.coins} COINS`;$('quest-progress').textContent=data.defeated<3?`${data.defeated} / 3 defeated`:'✓ 3 / 3 completed';}
function refreshStyles(){const host=$('styles');host.innerHTML='';for(const st of STYLE_ORDER){const b=document.createElement('button');b.className=`style ${st===style?'active':''}`;b.style.borderColor=st===style?STYLE_COLOURS[st]:'';b.innerHTML=`<span class="symbol">${{melee:'⚔',magic:'✦',ranged:'➶'}[st]}</span>${st.toUpperCase()} <small>${levelFromXp(data.xp[st]).level}</small>`;b.addEventListener('click',()=>setStyle(st));host.append(b);}}
function refreshSkills(){
 const host=$('skills');host.innerHTML='';
 activeSkillCache=equippedSkills(data,style,data.gear[style]);activeSkillCache.forEach((a,i)=>{
  const b=document.createElement('button');b.className='skill';b.type='button';b.title=a?`${a.note} Cooldown: ${a.cooldown}s`:'Open SKILLS to equip an ability';
  b.classList.toggle('empty',!a);
  b.innerHTML=`<span class="key">${'QERF'[i]}</span><span class="skill-icon">${a?.icon||'+'}</span><span class="name">${a?.name||'EMPTY'}</span><span class="cooldown"></span>`;
  let touchAt=-Infinity;
  b.addEventListener('pointerdown',event=>{if(event.pointerType==='touch'||event.pointerType==='pen'){event.preventDefault();touchAt=now();a?useAbility(i):bookOpen('abilities');}});
  b.addEventListener('click',()=>{if(now()-touchAt>.35)a?useAbility(i):bookOpen('abilities');});host.append(b);
 });
 $('weapon-name').textContent=getWeapon().title;refreshStyles();updateHpUI();
 $('touch-attack').title=getWeapon().title+' · Max hit '+maxHitFor(levelFromXp(data.xp[style]).level,getWeapon().basic,outgoingMultiplier(data.armour[style],style)*equipmentModifiers(data,style).power)+' · '+weaponDisplay(getWeapon());
 document.documentElement.dataset.combatStyle=style;
 const swap=$('touch-swap'),upcoming=nextStyle(style);
 swap.querySelector('small').textContent=upcoming.toUpperCase();swap.setAttribute('aria-label',`Switch to ${upcoming}`);
}
function setStyle(which,instant=false){if(!STYLE_ORDER.includes(which)||which===style)return;if(woodcuttingTarget)stopWoodcutting();if((pendingBasic||pendingAbility||activeStrikes.length)&&!instant){queuedStyle=which;return;}if(!instant && now()<switchUntil)return;style=which;switchUntil=now()+.12;equipVisual(style,data.gear[style]);refreshSkills();addRing(hero.position.clone(),'#e7ca81',1.8,.38);toast(`${{melee:'⚔',magic:'✦',ranged:'➶'}[style]} ${style.toUpperCase()} · ${getWeapon().title}`);}
function gearMenu(){bookOpen('equip',true);}
$('gear-button').addEventListener('click',gearMenu);
function addRing(pos,color,radius=1.4,duration=.5){if(rings.length>=32)return;const geom=new THREE.RingGeometry(.89,1,24);const mesh=new THREE.Mesh(geom,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.position.copy(pos);mesh.position.y=terrainHeight(pos.x,pos.z)+.065;scene.add(mesh);rings.push({mesh,radius,duration,time:0});}
function sparks(pos,color,count=10){count=Math.min(count,Math.max(0,120-projectiles.length));for(let i=0;i<count;i++){const sphere=put(scene,ballGeom.clone(),new THREE.MeshBasicMaterial({color}),pos.x,pos.y,pos.z,.07,.07,.07,false);const a=random()*Math.PI*2;projectiles.push({mesh:sphere,particle:true,velocity:new THREE.Vector3(Math.cos(a)*(2+random()*3),1+random()*4,Math.sin(a)*(2+random()*3)),life:.35+random()*.35,age:0});}}
function gainXp(type,sourceStyle=style){const val=XP_BY_MOB[type]??0;if(!val)return;const old=levelFromXp(data.xp[sourceStyle]).level;const oldVital=levelFromXp(data.xp.vitality).level;data.xp[sourceStyle]+=val;data.xp.vitality+=Math.floor(val*.55);const newLevel=levelFromXp(data.xp[sourceStyle]).level,newVital=levelFromXp(data.xp.vitality).level;if(newLevel>old){const unlocked=skillCatalogue(sourceStyle,data.gear[sourceStyle]).filter(a=>a.requiredLevel>old&&a.requiredLevel<=newLevel).map(a=>a.name);toast(`<b>${sourceStyle.toUpperCase()} LEVEL ${newLevel}!</b> ${unlocked.length?'New skills: '+unlocked.join(', '):'Check MENU for new unlocks.'}`);}if(newVital>oldVital){hp+=8*(newVital-oldVital);toast(`<b>VITALITY LEVEL ${newVital}!</b> Maximum HP and armour choices increased.`);}data.defeated++;if(data.defeated===3&&!questCompleted){questCompleted=true;toast('<b>FIRST CHALLENGE COMPLETE!</b> Explore, train and try different weapons.');$('quest-text').textContent='Well done! Master all three styles and defeat the bandit on the forest road.';}save();refreshStyles();updateHpUI();if(!progressPanel.hidden)renderBook();}
function hitEnemy(e,damage,ability,source=sourceSnapshot()){
 if(!e||e.dead||e.hp<=0||e.retreating||!activeEnemies().includes(e))return;
 if(e.type!=='dummy'&&Math.hypot(hero.position.x-e.startX,hero.position.z-e.startZ)>ENEMY_COMBAT[e.type].leash){disengageEnemy(e,now());return;}
 const periodic=ability?.periodic===true;
 const maximum=periodic?Math.max(1,Math.floor(damage)):maxHitForAction(source.maxHit||maxHitFor(source.level,source.weaponBasic,source.power),source.weaponBasic,damage);
 const result=periodic?{hit:true,damage:maximum}:rollHit({maxHit:maximum,accuracy:accuracyFor(source.level,e.level,source.weaponBasic,{dummy:0,mossling:0,boar:.04,bandit:.08}[e.type]||0)});
 if(e.type!=='dummy'){const cfg=ENEMY_COMBAT[e.type];if(Math.hypot(hero.position.x-e.startX,hero.position.z-e.startZ)<=cfg.leash)e.aggro=true;}
 if(!result.hit){floating('0','#c4d2d7',e.group.position.clone().add(new THREE.Vector3(0,e.type==='mossling'?1.7:2.8,0)));return;}
 if(e.onboardingDummy&&data.onboarding?.area==='tutorial'){
  const hits=data.onboarding.tutorial.hitStyles;
  if(!hits.includes(source.style)){hits.push(source.style);save();renderOpeningGuide();}
 }
 const amount=result.damage;audio.play('hit',amount>25);e.plate.visible=true;e.hp-=amount;e.hitFlashUntil=now()+.16;
 if(e.type!=='dummy'&&!e.retreating){
  const cfg=ENEMY_COMBAT[e.type],heroHome=Math.hypot(hero.position.x-e.startX,hero.position.z-e.startZ);
  if(heroHome<=cfg.leash)e.aggro=true;
 }
 floating(`-${amount}`,'#fff0a0',e.group.position.clone().add(new THREE.Vector3(0,e.type==='mossling'?1.7:2.8,0)));
 if(e.type!=='dummy'){sparks(e.group.position.clone().add(new THREE.Vector3(0,.9,0)),STYLE_COLOURS[source.style],4);visuals.impact(e.group.position,STYLE_COLOURS[source.style],amount>25);}if(ability?.bleed){e.bleedUntil=now()+ability.bleed;e.nextBleed=now()+1;e.bleedSource=source;}if(ability?.stun){e.stunUntil=now()+ability.stun;cancelEnemyWarning(e);e.charge=null;e.pounce=null;e.lastAttack=now();}if(ability?.slow)e.slowUntil=now()+ability.slow;if(ability?.root){e.rootUntil=now()+ability.root;e.charge=null;e.pounce=null;}if(ability?.swapLock)e.swapLockedUntil=now()+ability.swapLock;if(e.hp<=0){if(e===combatTarget)stopCombat();cancelEnemyWarning(e);e.charge=null;e.pounce=null;e.aiState='dead';audio.play('death');if(e.type==='dummy'){e.hp=e.max;toast('Training dummy · practice any style here');return;}e.hp=0;e.dead=true;e.aggro=false;e.retreating=false;e.levelLabel.hidden=true;e.respawn=now()+12;e.deathAt=now();addRing(e.group.position,'#e9bb76',2,.55);sparks(e.group.position.clone().add(new THREE.Vector3(0,.7,0)),'#ecd39b',9);spawnMonsterLoot(e);gainXp(e.type,source.style);}}
function enemyCentre(e){return {x:e.x,y:e.group.position.y+(e.type==='mossling'?.75:1.25),z:e.z};}
function enemyRadius(e){return e.type==='mossling'?.6:e.type==='boar'?.8:.65;}
function clearCombatLine(a,b,r=.05){return segmentWorldHit(a,b,r)===null;}
function sourceSnapshot(){
 const level=levelFromXp(data.xp[style]).level,weaponBasic=getWeapon().basic;
 const power=outgoingMultiplier(data.armour[style],style)*equipmentModifiers(data,style).power;
 return {style,level,power,weaponBasic,maxHit:maxHitFor(level,weaponBasic,power)};
}
function stopCombat(){combatTarget=null;combatPath=null;combatPathGoal=null;$('touch-attack').classList.remove('auto-locked');}
function selectCombatTarget(enemy){
 if(!started||hp<=0||isGameplayMenuOpen()||!targetValid(enemy,activeEnemies(),hero.position,30))return false;
 if(!clearCombatLine({x:hero.position.x,y:hero.position.y+1.25,z:hero.position.z},enemyCentre(enemy)))return false;
 if(woodcuttingTarget)stopWoodcutting();
 combatTarget=enemy;combatPath=null;combatPathGoal=null;
 $('touch-attack').classList.add('auto-locked');toast('Target locked · '+ENEMY_COMBAT[enemy.type].name);
 return true;
}
function toggleCombat(){
 if(isGameplayMenuOpen()||!started||hp<=0)return;
 if(woodcuttingTarget)stopWoodcutting();
 if(combatTarget){stopCombat();return;}
 const target=acquireEnemy(activeEnemies(),hero.position,forward(),enemy=>clearCombatLine(
  {x:hero.position.x,y:hero.position.y+1.25,z:hero.position.z},enemyCentre(enemy)));
 if(!target){toast('No enemy in range · Move closer or select an enemy');return;}
 selectCombatTarget(target);
}
function updateAutoCombat(dt,t,manualInput){
 if(!combatTarget)return;
 if(!targetValid(combatTarget,activeEnemies(),hero.position)){stopCombat();return;}
 if(isGameplayMenuOpen()||!started||hp<=0)return;
 const weapon=getWeapon();if(weapon.reach<=0)return;
 const origin={x:hero.position.x,y:hero.position.y+1.2,z:hero.position.z};
 const clear=clearCombatLine(origin,enemyCentre(combatTarget));
 if(inAttackRange(hero.position,combatTarget,weapon.reach,clear)){doBasic();return;}
 if(manualInput||dodgeTravel||pendingBasic||pendingAbility||t<switchUntil)return;
 const goal={x:combatTarget.x,z:combatTarget.z},start={x:hero.position.x,z:hero.position.z};
 if(!combatPath||t>=combatPathAt||!combatPathGoal||Math.hypot(goal.x-combatPathGoal.x,goal.z-combatPathGoal.z)>1.5){
  combatPath=groundSegmentClear(start,goal,.45)?[goal]:groundPath(start,goal,(a,b)=>groundSegmentClear(a,b,.45),{within:p=>Math.hypot(p.x-start.x,p.z-start.z)<38,maxNodes:350});
  combatPathGoal=goal;combatPathAt=t+.7;
 }
 while(combatPath?.length>1&&Math.hypot(combatPath[0].x-start.x,combatPath[0].z-start.z)<.4)combatPath.shift();
 const dest=combatPath?.[0];if(!dest)return;
 const dx=dest.x-start.x,dz=dest.z-start.z,d=Math.hypot(dx,dz);
 const stop=clear?Math.min(Math.max(.8,weapon.reach*.70),Math.max(.8,weapon.reach-.4)):.6;
 const stride=Math.min(4.7*dt,Math.max(0,d-(combatPath.length===1?stop:0)));
 if(stride<=0)return;
 const moved=moveOnGround(hero.position,dx/Math.max(.001,d)*stride,dz/Math.max(.001,d)*stride,.45);
 hero.position.set(moved.x,data.onboarding?.area==='tutorial'||data.onboarding?.area==='realm'?0:moved.y,moved.z);
 motion={x:dx/Math.max(.001,d)*stride/Math.max(.001,dt),z:dz/Math.max(.001,d)*stride/Math.max(.001,dt)};
}

function beginStrike(damage,reach,ability={},family=slotFamily(style,data.gear[style])){
 const profile={...(MELEE_PROFILES[family]||MELEE_PROFILES.unarmed)};
 if(ability.kind==='sweep'){profile.halfAngle=1.15;profile.multi=true;}
 if(ability.kind==='hit'||ability.kind==='execute'){profile.halfAngle=Math.min(.48,profile.halfAngle);profile.multi=false;}
 const origin=hero.position.clone();origin.y+=1.1;
 const target=combatTarget&&targetValid(combatTarget,activeEnemies(),hero.position)?combatTarget:null;
 const strikeYaw=target?Math.atan2(target.x-hero.position.x,-(target.z-hero.position.z)):yaw;
 const strike={origin,yaw:strikeYaw,profile,reach,damage,ability,source:sourceSnapshot(),start:now(),previous:0,reverse:comboStage===1,hits:new Set(),animationActionId:releasingActionId,contactIndex:0};
 if(ability.strikes===2){strike.damage=damage/2;activeStrikes.push({...strike,start:now()+profile.duration+.035,previous:0,hits:new Set(),reverse:!strike.reverse,visualPending:true,contactIndex:1});}
 activeStrikes.push(strike);visuals.sweep(strike,STYLE_COLOURS[style]);
 if(attackAnimation){attackAnimation.contactDuration=profile.duration;attackAnimation.halfAngle=profile.halfAngle;attackAnimation.reverse=strike.reverse;}
}
function updateStrikes(t){
 for(let i=activeStrikes.length-1;i>=0;i--){
  const strike=activeStrikes[i];if(t<strike.start)continue;
  if(strike.animationActionId&&!strike.contactLogged){
   animationJournal.record(strike.animationActionId,strike.contactIndex?'contact_window_start_2':'contact_window_start',strike.start);strike.contactLogged=true;
  }
  strike.previousOrigin={...strike.origin};strike.origin={x:hero.position.x,y:hero.position.y+1.1,z:hero.position.z};if(strike.visualPending){visuals.sweep(strike,STYLE_COLOURS[strike.source.style]);strike.visualPending=false;}const progress=clamp((t-strike.start)/strike.profile.duration,0,1);
  for(const e of activeEnemies()){
   if(e.dead||e.retreating||strike.hits.has(e)||(!strike.profile.multi&&strike.hits.size))continue;
   const centre=enemyCentre(e);
   if(sweptStrikeHit(strike,strike.previous,progress,e.previousCentre||centre,centre,enemyRadius(e),segmentWorldHit)!==null){
    strike.hits.add(e);hitEnemy(e,strike.damage+(strike.ability.kind==='execute'&&e.bleedUntil>t?20:0),strike.ability,strike.source);
    cameraJolt=Math.max(cameraJolt,strike.source.style==='melee'?.045:0);
   }
  }
  strike.previous=progress;if(progress>=1){
   if(strike.animationActionId)animationJournal.record(strike.animationActionId,strike.contactIndex?'contact_window_end_2':'contact_window_end',strike.start+strike.profile.duration);
   activeStrikes.splice(i,1);
  }
 }
}
function areaImpact(origin,radius,damage,ability,source,exclude=null){
 for(const e of activeEnemies()){if(e.dead||e.retreating||e===exclude)continue;const c=enemyCentre(e);
  if(Math.hypot(c.x-origin.x,c.y-origin.y,c.z-origin.z)<=radius&&clearCombatLine(origin,c))hitEnemy(e,damage,ability,source);
 }
 const ground=new THREE.Vector3(origin.x,terrainHeight(origin.x,origin.z),origin.z);
 addRing(ground,STYLE_COLOURS[source.style],radius,.5);
}
function shoot(damage,speed=24,colour='#f4c377',opts={},spread=0,maxRange=getWeapon().reach){
 if(projectiles.filter(p=>!p.particle).length>=48)return;
 camera.updateMatrixWorld();hero.updateMatrixWorld(true);
 const cameraDirection=new THREE.Vector3();camera.getWorldDirection(cameraDirection);
 const rayEnd=camera.position.clone().addScaledVector(cameraDirection,120);
 let aimPoint=rayEnd.clone(),nearest=segmentWorldHit(camera.position,rayEnd,.01)??1;
 for(const e of activeEnemies()){
  if(e.dead||e.retreating)continue;
  const hit=segmentHit(camera.position,rayEnd,enemyCentre(e),enemyRadius(e));
  if(hit!==null&&hit<nearest)nearest=hit;
 }
 aimPoint.copy(camera.position).lerp(rayEnd,nearest);
 const locked=combatTarget&&targetValid(combatTarget,activeEnemies(),hero.position)&&Math.hypot(combatTarget.x-hero.position.x,combatTarget.z-hero.position.z)<=maxRange?combatTarget:null;
 if(locked){const c=enemyCentre(locked);aimPoint.set(c.x,c.y,c.z);}
 const origin=new THREE.Vector3();hero.userData.weapon.getWorldPosition(origin);
 // Keep the muzzle outside the body while retaining the rig's actual hand elevation.
 const facing=locked?new THREE.Vector3(locked.x-hero.position.x,0,locked.z-hero.position.z).normalize():forward();origin.addScaledVector(facing,.35);
 const chest=hero.position.clone().add(new THREE.Vector3(0,1.3,0));
 if(!clearCombatLine(chest,origin,.08)){sparks(chest,colour,3);return;}
 let dir=aimPoint.clone().sub(origin).normalize();
 if(dir.dot(facing)<.08&&!locked)dir.copy(cameraDirection);
 if(isTouch){
  let candidate=null,score=.996; // At most ~5 degrees; only visible targets ahead of the muzzle.
  for(const e of activeEnemies()){
   if(e.dead||e.retreating)continue;const c=enemyCentre(e),v=new THREE.Vector3(c.x-origin.x,c.y-origin.y,c.z-origin.z),distance=v.length();
   if(distance>maxRange||distance<.1)continue;v.normalize();const dot=v.dot(dir);
   if(dot>score&&v.dot(facing)>.2&&clearCombatLine(origin,c)){candidate=v;score=dot;}
  }
  if(candidate)dir.copy(candidate);
 }
 dir.applyAxisAngle(new THREE.Vector3(0,1,0),spread).normalize();
 const mesh=ball(scene,origin.x,origin.y,origin.z,style==='magic'?.24:.13,style==='magic'?.24:.13,style==='magic'?.3:.48,new THREE.MeshBasicMaterial({color:colour}));
 mesh.geometry=mesh.geometry.clone();mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),dir);
 visuals.projectile(mesh,colour,style);audio.play(style==='magic'?'magic':'bow');
 projectiles.push({mesh,dir,speed,damage,opts,life:maxRange/Math.max(1,speed)+.15,age:0,distance:0,maxDistance:maxRange,origin:origin.clone(),style,source:sourceSnapshot(),particle:false});
 if(releasingActionId){projectileOrdinal++;animationJournal.record(releasingActionId,projectileOrdinal===1?'projectile_spawn':`projectile_spawn_${projectileOrdinal}`,now(),{origin:[origin.x,origin.y,origin.z]});}
}
function slashEffect(reach=3){
 const heading=forward();
 const p=hero.position.clone().add(heading.clone().multiplyScalar(Math.min(2,reach*.68)));
 p.y=hero.position.y+1.25;
 // A miss has a weapon trail but no impact particles.
 visuals.arc(hero.position,heading,reach,STYLE_COLOURS[style],comboStage);
}
function doBasic(){
 if(woodcuttingTarget)stopWoodcutting();
 if(isGameplayMenuOpen())return;const t=now();if(!started||hp<=0||dodgeTravel||pendingAbility||t<switchUntil||!basicAttackReady(t,attackUntil,!!pendingBasic))return;
 if(data.onboarding?.area!=='tutorial'&&style!=='melee'&&!ownsWeapon(data,style,data.gear[style])){toast('You need a weapon to use this combat style.');return;}
 const w=getWeapon();
 attackUntil=t+w.interval;lastAttackInterval=w.interval;
 const windup=Math.min(w.interval*.70,w.windup||w.interval*.25);
 pendingBasic={style,weapon:data.gear[style],impactAt:t+windup,interval:w.interval,start:t};
 pendingBasic.animationActionId=beginAnimationAction(basicAnimationSpec(style,pendingBasic.weapon),t,attackUntil);
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
 if(!started||hp<=0||style!==attack.style){animationJournal.record(attack.animationActionId,'interrupted',t);return;}
 if(combatTarget&&!targetValid(combatTarget,activeEnemies(),hero.position)){stopCombat();return;}
 animationJournal.record(attack.animationActionId,'release',attack.impactAt);
 releasingActionId=attack.animationActionId;projectileOrdinal=0;
 audio.play(style==='magic'?'magic':'attack',getWeapon().basic>25);
 const w=(data.onboarding?.area==='tutorial'||ownsWeapon(data,attack.style,attack.weapon))?LOADOUTS[attack.style][attack.weapon]:attack.style==='melee'?UNARMED:null;
 if(!w){releasingActionId=null;return;}
 hero.userData.rightArm.rotation.x=-1.5;
 if(attack.style==='melee'){
  beginStrike(Math.round(w.basic*(attack.combo===2?1.21:attack.combo===1?1.09:1)),w.reach,slotFamily(style,attack.weapon)==='daggers'?{bleed:1.5}:slotFamily(style,attack.weapon)==='greatsword'?{stun:.22}:{},slotFamily(style,attack.weapon));
 }else{
  sparks(hero.position.clone().add(forward().multiplyScalar(1.1)).add(new THREE.Vector3(0,1.2,0)),STYLE_COLOURS[style],3);
  // Bows are distinguished by launch speed and maximum travel; heavy crossbow recovers slowly.
  const velocity=attack.style==='magic'?(slotFamily(style,attack.weapon)==='ember'?24:21):
    slotFamily(style,attack.weapon)==='shortbow'?27:slotFamily(style,attack.weapon)==='crossbow'?34:36;
  shoot(w.basic,velocity,attack.style==='magic'?(slotFamily(style,attack.weapon)==='ember'?'#f6b070':'#b6d9ef'):'#e4c292',{},0,w.reach);
 }
 releasingActionId=null;
}
function shiftHero(dist){const f=forward();dodgeTravel={dir:{x:f.x*Math.sign(dist),z:f.z*Math.sign(dist)},speed:Math.abs(dist)/.32,start:now(),end:now()+.32};addRing(hero.position.clone(),'#cce2b1',1.8,.4);}
function useAbility(index,fromQueue=false){
 if(woodcuttingTarget)stopWoodcutting();
 if(isGameplayMenuOpen()||!started||hp<=0||dodgeTravel||(data.onboarding?.area!=='tutorial'&&!ownsWeapon(data,style,data.gear[style])))return;
 const a=activeSkillCache[index];if(!a)return;
 const id=abilityCooldownKey(style,slotFamily(style,data.gear[style]),a);
 if(now()<(cooldowns.get(id)||0))return;
 // Players must be able to activate abilities DURING auto-attack recovery.
 // Buffer the selected ability for the next legal opening instead of ignoring it.
 if(pendingAbility||now()<switchUntil||now()<attackUntil||pendingBasic){
  if(!fromQueue)queuedAbility={index,style,weapon:data.gear[style]};
  return;
 }
 queuedAbility=null;const startAt=now(),w=getWeapon(),windup=['shield','heal','dash','dashback'].includes(a.kind)?0:Math.min(slotFamily(style,data.gear[style])==='greatsword'?.6:.45,w.windup);
 const interval=Math.max(.4,windup+.28),spec=abilityAnimationSpec(style,data.gear[style],a);
 cooldowns.set(id,startAt+a.cooldown);attackUntil=startAt+interval;lastAttackInterval=interval;
 pendingAbility={a,style,impactAt:startAt+windup,animationActionId:beginAnimationAction(spec,startAt,attackUntil)};
 attackAnimation={start:startAt,impactAt:startAt+Math.max(.01,windup),interval,abilityKind:spec?.motionCue||a.kind,abilityId:spec?.id,actionId:pendingAbility.animationActionId};}
function resolveAbility(t){if(!pendingAbility||t<pendingAbility.impactAt)return;
 const {a,style:castStyle,animationActionId,impactAt}=pendingAbility;pendingAbility=null;
 if(hp<=0||style!==castStyle){animationJournal.record(animationActionId,'interrupted',t);return;}
 animationJournal.record(animationActionId,'release',impactAt);
 releasingActionId=animationActionId;projectileOrdinal=0;
 audio.playAbility(castStyle,a.kind,slotFamily(castStyle,data.gear[castStyle]));
  if(a.kind==='hit'||a.kind==='execute'){beginStrike(a.damage,a.reach,a);}
  else if(a.kind==='sweep'){
   if(style==='melee')beginStrike(a.damage,a.reach,a);
   else if(style==='ranged')[-.18,-.09,0,.09,.18].forEach(v=>shoot(a.damage,30,'#edd28f',a,v,a.reach));
   else [-.28,-.14,0,.14,.28].forEach(v=>shoot(a.damage,13,'#f6b070',{...a,waveId:now()},v,a.reach));
  }
  else if(a.kind==='nova'){const origin=hero.position.clone().add(new THREE.Vector3(0,1.1,0));areaImpact(origin,a.reach,a.damage,a,sourceSnapshot());if(groundEffects.length<8){groundEffects.push({origin,radius:a.reach,until:now()+3,source:sourceSnapshot()});visuals.field(origin,a.reach,3,'#92d8ec',(x,z)=>data.onboarding?.area==='tutorial'?0:terrainHeight(x,z));}}
  else if(a.kind==='bolt')shoot(a.damage,a.speed,style==='magic'?(slotFamily(style,data.gear[style])==='ember'?'#f6b070':'#a3d6f7'):'#edd28f',a);
  else if(a.kind==='burst')[-.09,0,.09].forEach(v=>shoot(a.damage,a.speed,'#eac993',a,v));
  else if(a.kind==='shield'){shieldUntil=now()+a.duration;addRing(hero.position.clone(),'#83c4ee',2.6,.65);toast(`${a.name} activated`);}
  else if(a.kind==='heal'){const max=maxHealth(levelFromXp(data.xp.vitality).level);hp=Math.min(max,hp+a.heal);floating(`+${a.heal}`,'#80f0a2',hero.position.clone().add(new THREE.Vector3(0,2.4,0)));addRing(hero.position.clone(),'#80f0a2',2,.4);updateHpUI();}
  else if(a.kind==='dash')shiftHero(a.distance);
  else if(a.kind==='dashback')shiftHero(-a.distance);
  else if(a.kind==='retreat'){shoot(a.damage,26,'#f2d79a');shiftHero(-4);}
  if(['shield','heal','dash','dashback','nova'].includes(a.kind))animationJournal.record(animationActionId,'ability_effect',impactAt);
 releasingActionId=null;
 sparks(hero.position.clone().add(new THREE.Vector3(0,1.15,0)),STYLE_COLOURS[style],5);
}
function dodge(){if(isGameplayMenuOpen())return;if(!started||hp<=0||now()<dodgeUntil)return;interruptPendingAnimation(now());pendingBasic=null;pendingAbility=null;activeStrikes.length=0;attackAnimation=null;dodgeStarted=now();dodgeUntil=now()+DODGE.cooldown;dodgeMovingUntil=now()+DODGE.startup+DODGE.active;const dir=dodgeDirection({x:Number(keys.has('d'))-Number(keys.has('a'))+joystick.x+(padState?.moveX||0),z:Number(keys.has('s'))-Number(keys.has('w'))+joystick.y+(padState?.moveY||0)},yaw);dodgeTravel={dir,start:now(),end:now()+.32};audio.play('dodge');addRing(hero.position.clone(),'#fff1b8',2,.4);}
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
 e.attackYaw=Math.atan2(-dir.x,-dir.z);e.warning=warning;e.warningMesh=mesh;e.aiState='windup';e.attackWindup=t+spec.windup;e.lastAttack=t;audio.play('warning');
 scene.add(mesh);
}
function applyEnemyDamage(e,spec,t){
 if(hp<=0||dodgeInvulnerable(t,dodgeStarted)){floating('EVADED','#a8f2be',hero.position.clone().add(new THREE.Vector3(0,2.7,0)));return;}
 const vitality=levelFromXp(data.xp.vitality).level,sourceLevel=e?.level||vitality;
 const result=rollHit({maxHit:Math.max(1,Math.round(spec.damage)),accuracy:accuracyFor(sourceLevel,vitality,19,equipmentModifiers(data,style).guard)});
 if(!result.hit){floating('0','#c4d2d7',hero.position.clone().add(new THREE.Vector3(0,2.7,0)));return;}
 const harm=Math.max(1,Math.round(damageAfterArmour(result.damage,shieldUntil>t,data.armour[style])*(1-equipmentModifiers(data,style).guard)));
 hp=Math.max(0,hp-harm);lastHurt=t;cameraJolt=.13;audio.play('hurt');
 $('damage-flash').classList.remove('hit');void $('damage-flash').offsetWidth;$('damage-flash').classList.add('hit');
 floating('-'+harm,'#ff948d',hero.position.clone().add(new THREE.Vector3(0,2.8,0)));
 updateHpUI();
 if(hp<=0){interruptPendingAnimation(now());stopCombat();queuedAbility=null;activeStrikes.length=0;queuedStyle=null;pendingBasic=null;pendingAbility=null;dodgeTravel=null;attackAnimation=null;groundEffects.length=0;motion={x:0,z:0};
  toast('<b>YOU WERE DEFEATED</b> · Respawning in Oakrest');
  respawnAt=t+2.1;
 }
}
function disengageEnemy(e,t){
 if(e===combatTarget)stopCombat();
 // Never carry a queued hit or charge across the leash boundary.
 cancelEnemyWarning(e);e.charge=null;e.pounce=null;e.path=null;e.aiState='disengage';e.aggro=false;e.retreating=true;e.acquireAfter=t+2;
 e.hp=e.max;e.bleedUntil=0;e.nextBleed=0;e.slowUntil=0;
 e.stunUntil=0;e.rootUntil=0;e.swapLockedUntil=0;e.attackWindup=0;
 e.lastAttack=t;
}
function navigateEnemy(e,goal,speed,dt,t){
 const radius=e.type==='boar'?.72:.42,cfg=ENEMY_COMBAT[e.type],position={x:e.x,z:e.z};
 const canTravel=(a,b)=>groundSegmentClear(a,b,radius);
 if(!e.path||t>=(e.pathAt||0)||Math.hypot(goal.x-e.pathGoal.x,goal.z-e.pathGoal.z)>2){
  e.path=groundPath(position,goal,canTravel,{within:p=>Math.hypot(p.x-e.startX,p.z-e.startZ)<=cfg.leash});
  e.pathGoal={...goal};e.pathAt=t+.8;
 }
 while(e.path.length>1&&Math.hypot(e.path[0].x-e.x,e.path[0].z-e.z)<.18)e.path.shift();
 const target=e.path[0];if(!target){e.stuck=(e.stuck||0)+dt;return false;}
 const dx=target.x-e.x,dz=target.z-e.z,d=Math.hypot(dx,dz),step=Math.min(d,speed*dt);
 const moved=moveOnGround(position,dx/Math.max(.001,d)*step,dz/Math.max(.001,d)*step,radius);
 if(Math.hypot(moved.x-e.x,moved.z-e.z)<step*.1)e.stuck=(e.stuck||0)+dt;else e.stuck=0;
 e.x=moved.x;e.z=moved.z;e.group.position.set(e.x,moved.y,e.z);
 e.group.rotation.y=dampAngle(e.group.rotation.y,Math.atan2(-dx,-dz),10,dt);
 return true;
}
function returnEnemyHome(e,dt,t){
 e.aiState='return';const dist=Math.hypot(e.startX-e.x,e.startZ-e.z);
 if(dist<.15){e.x=e.startX;e.z=e.startZ;e.group.position.set(e.x,terrainHeight(e.x,e.z),e.z);e.retreating=false;e.path=null;e.stuck=0;e.aiState='idle';return;}
 navigateEnemy(e,{x:e.startX,z:e.startZ},ENEMY_COMBAT[e.type].returnSpeed,dt,t);
}
function updateEnemy(e,dt,t){
 if(e.dead){
  e.levelLabel.hidden=true;e.plate.visible=false;animateCreature(e.group,e.type,t,dt,0,0,false,t-e.deathAt+.01);e.group.visible=t-e.deathAt<.8;
  if(t>=e.respawn){
   e.dead=false;e.plate.visible=true;e.hp=e.max;e.bleedUntil=0;e.rootUntil=0;e.stunUntil=0;e.slowUntil=0;e.pounce=null;e.charge=null;e.path=null;e.stuck=0;
   e.lastAttack=t;e.aggro=false;e.retreating=false;
   e.group.visible=true;e.group.position.set(e.startX,terrainHeight(e.startX,e.startZ),e.startZ);e.x=e.startX;e.z=e.startZ;
  }
  return;
 }
 if(e.bleedUntil>t&&t>=e.nextBleed){e.nextBleed=t+1;hitEnemy(e,3,{periodic:true},e.bleedSource);}
 if(e.dead)return;
 e.bar.scale.x=clamp(e.hp/e.max,.001,1);e.bar.position.x=-.68*(1-e.hp/e.max);e.plate.lookAt(camera.position);
 animateCreature(e.group,e.type,t,dt,e.charge?10:e.aggro?2:0,e.warning?e.attackWindup:0,e.hitFlashUntil>t,0);
 if(e.type==='dummy')return;
 e.group.position.y=terrainHeight(e.x,e.z);
 // No monster may continue a chase or strike while the hero is protected by town patrols.
 if(isOakrestSafe(hero.position.x,hero.position.z)){
  if(e.aggro||e.retreating){if(!e.retreating)disengageEnemy(e,t);returnEnemyHome(e,dt,t);}
  return;
 }
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
 if(state==='idle'){e.aiState='idle';return;}
 if(state==='acquire'){if(t<(e.acquireAfter||0)||!clearCombatLine(enemyCentre(e),{x:hero.position.x,y:hero.position.y+1.1,z:hero.position.z}))return;e.aggro=true;e.aiState='notice';e.noticeUntil=t+.22;e.lastAttack=Math.min(e.lastAttack,t-spec.cooldown+.25);}if(t<(e.noticeUntil||0))return;
 const dx=hero.position.x-e.x,dz=hero.position.z-e.z,dist=Math.hypot(dx,dz);
 if(e.stunUntil>t){cancelEnemyWarning(e);e.charge=null;e.pounce=null;e.aiState='disabled';return;}
 if(e.rootUntil>t){e.charge=null;e.pounce=null;if(e.warning&&spec.kind!=='cleave')cancelEnemyWarning(e);}
 if(e.warning){
  e.group.rotation.y=dampAngle(e.group.rotation.y,e.attackYaw,14,dt);const warning=e.warning;
  e.warningMesh.material.opacity=.23+.20*(1-Math.max(0,e.attackWindup-t)/spec.windup);
  if(t>=e.attackWindup){
   cancelEnemyWarning(e);
   if(spec.kind==='charge'){
    e.charge={direction:warning.direction,warning,end:t+spec.length/spec.chargeSpeed,hit:false};
   }else if(spec.kind==='pounce'){e.pounce={x:warning.x,z:warning.z,end:t+.28,warning};}
   else if(isThreatened(spec.kind,warning,hero.position)&&clearCombatLine(enemyCentre(e),{x:hero.position.x,y:hero.position.y+1.1,z:hero.position.z}))applyEnemyDamage(e,spec,t);
   e.aiState='recover';
  }
  return;
 }
 if(e.pounce){
  e.aiState='attack';const p=e.pounce,dx=p.x-e.x,dz=p.z-e.z,d=Math.hypot(dx,dz),step=Math.min(d,11*dt);e.group.rotation.y=dampAngle(e.group.rotation.y,Math.atan2(-dx,-dz),14,dt);
  const moved=moveOnGround(e,dx/Math.max(.001,d)*step,dz/Math.max(.001,d)*step,.42);
  e.x=moved.x;e.z=moved.z;e.group.position.set(e.x,moved.y+Math.sin(Math.PI*clamp(1-(p.end-t)/.28,0,1))*.65,e.z);
  if(t>=p.end||d<.1){
   if(Math.hypot(e.x-p.x,e.z-p.z)<.4&&isThreatened('pounce',p.warning,hero.position)&&clearCombatLine(enemyCentre(e),{x:hero.position.x,y:hero.position.y+1.1,z:hero.position.z}))applyEnemyDamage(e,spec,t);
   e.pounce=null;e.aiState='recover';e.group.position.y=terrainHeight(e.x,e.z);
  }return;
 }
 if(e.charge){
  e.aiState='attack';if(t>=e.charge.end){e.charge=null;e.aiState='recover';return;}
  const dir=e.charge.direction,step=Math.min(spec.chargeSpeed*dt,spec.chargeSpeed*(e.charge.end-t));
  const old=enemyCentre(e),moved=moveOnGround(e,dir.x*step,dir.z*step,.72);
  if(Math.hypot(moved.x-e.startX,moved.z-e.startZ)>ENEMY_COMBAT[e.type].leash){disengageEnemy(e,t);return;}
  const travel=Math.hypot(moved.x-e.x,moved.z-e.z);
  e.x=moved.x;e.z=moved.z;e.group.position.set(e.x,moved.y,e.z);
  if(!e.charge.hit&&withinChargeLane(e.charge.warning,hero.position)&&segmentHit(old,enemyCentre(e),{x:hero.position.x,y:hero.position.y+1,z:hero.position.z},1.1)!==null&&clearCombatLine(enemyCentre(e),{x:hero.position.x,y:hero.position.y+1,z:hero.position.z})){
   e.charge.hit=true;applyEnemyDamage(e,spec,t);
  }
  if(travel<step*.7){e.charge=null;e.aiState='recover';}
  return;
 }

 const ready=t-e.lastAttack>=spec.cooldown;e.aiState=e.rootUntil>t?'disabled':ready?'engage':'recover';
 if(e.type==='bandit'&&!ready&&dist<4.5&&dist>2&&e.stunUntil<t&&e.rootUntil<t){e.aiState='reposition';const sign=e.startX<0?1:-1,n=moveOnGround({x:e.x,z:e.z},-dz/Math.max(.1,dist)*dt*.65*sign,dx/Math.max(.1,dist)*dt*.65*sign);if(Math.hypot(n.x-e.startX,n.z-e.startZ)<ENEMY_COMBAT.bandit.leash){e.x=n.x;e.z=n.z;e.group.position.set(n.x,n.y,n.z);}}

 if(dist<=spec.engage&&ready&&e.stunUntil<t&&e.rootUntil<t&&clearCombatLine(enemyCentre(e),{x:hero.position.x,y:hero.position.y+1.1,z:hero.position.z})){
  startEnemyWarning(e,t);return;
 }
 if((dist>Math.min(spec.engage*.82,2.9)||!clearCombatLine(enemyCentre(e),{x:hero.position.x,y:hero.position.y+1.1,z:hero.position.z}))&&e.stunUntil<t&&e.rootUntil<t){
  const speed=(e.type==='bandit'?2.5:e.type==='boar'?2.2:1.75)*(e.slowUntil>t?.42:1);
  const step=Math.min(speed*dt,Math.max(0,dist-.8));
  if(step>0){
   const nx=e.x+dx/dist*step,nz=e.z+dz/dist*step;
   if(Math.hypot(nx-e.startX,nz-e.startZ)>ENEMY_COMBAT[e.type].leash){disengageEnemy(e,t);return;}
   e.aiState='approach';navigateEnemy(e,{x:hero.position.x,z:hero.position.z},speed,dt,t);if(e.stuck>3){disengageEnemy(e,t);return;}
  }
  e.group.rotation.y=dampAngle(e.group.rotation.y,Math.atan2(-dx,-dz),10,dt);
 }
}
function updateEnemyLevelLabels(){
 const playerLevel=combatLevelFromXp(data.xp);
 camera.updateMatrixWorld();
 for(const e of enemies){
  if(!activeEnemies().includes(e)){e.levelLabel.hidden=true;e.plate.visible=false;continue;}
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
  const condition=e.stunUntil>now()?' · STUNNED':e.rootUntil>now()?' · ROOTED':e.slowUntil>now()?' · SLOWED':e.retreating?' · RETURNING':'';
  const text='Lv '+e.level+' · '+ENEMY_COMBAT[e.type].name+condition;if(label.textContent!==text)label.textContent=text;
 }
}
function animate(dt,t){
 elapsed+=dt;advanceAnimationJournal(t);resolveBasicAttack(t);resolveAbility(t);if(queuedStyle&&!pendingBasic&&!pendingAbility&&!activeStrikes.length){const next=queuedStyle;queuedStyle=null;setStyle(next);}
 if(queuedAbility){
  if(queuedAbility.style!==style||queuedAbility.weapon!==data.gear[style]||hp<=0||isGameplayMenuOpen())queuedAbility=null;
  else if(!pendingBasic&&!pendingAbility&&t>=attackUntil&&t>=switchUntil)useAbility(queuedAbility.index,true);
 }
 if(hp<=0&&respawnAt&&t>=respawnAt){const point=START_POINTS[data.onboarding?.area||'world'];hero.position.set(point.x,terrainHeight(point.x,point.z),point.z);hp=maxHealth(levelFromXp(data.xp.vitality).level);respawnAt=0;updateHpUI();}
 pollGamepad(dt);
 // Automatic basics run from the selected target; input is edge-triggered.
 const turn=cameraKeyDirection(keys.has('arrowleft'),keys.has('arrowright'));
 if(turn)yaw+=turn*dt*2.35*lookSensitivity;
 const front=forward(),side=new THREE.Vector3(Math.cos(yaw),0,Math.sin(yaw));
 const v=isGameplayMenuOpen()?0:(Number(keys.has('w'))-Number(keys.has('s')))-joystick.y-(padState?.moveY||0);
 const h=isGameplayMenuOpen()?0:(Number(keys.has('d'))-Number(keys.has('a')))+joystick.x+(padState?.moveX||0);
 const input=new THREE.Vector3().addScaledVector(front,v).addScaledVector(side,h);
 const attackMobility=t<recoilUntil?(slotFamily(style,data.gear[style])==='greatsword'?.5:slotFamily(style,data.gear[style])==='daggers'?.95:.78):1;
 const speed=attackMobility*(keys.has('shift')||Math.hypot(padState?.moveX||0,padState?.moveY||0)>.88?6.3:5)*defenceFor(data.armour[style]).mobility;
 motion=smoothMotion(motion,hp>0?input.x:0,hp>0?input.z:0,speed,dt);
 if(dodgeTravel){const remaining=Math.max(0,Math.min(dt,dodgeTravel.end-t+dt));const next=moveOnGround(hero.position,dodgeTravel.dir.x*(dodgeTravel.speed||12.5)*remaining,dodgeTravel.dir.z*(dodgeTravel.speed||12.5)*remaining);hero.position.set(next.x,data.onboarding?.area==='tutorial'||data.onboarding?.area==='realm'?0:next.y,next.z);if(t>=dodgeTravel.end)dodgeTravel=null;}
 else {const next=moveOnGround(hero.position,motion.x*dt,motion.z*dt);hero.position.set(next.x,data.onboarding?.area==='tutorial'||data.onboarding?.area==='realm'?0:next.y,next.z);}
 updateAutoCombat(dt,t,Math.hypot(v,h)>.12);
 updateWoodcutting(dt,t,Math.hypot(v,h)>.12);
 updateWoodcuttingTrees(t);
 // Dedicated areas are finite islands; never let players walk off their floor.
 if(data.onboarding?.area==='tutorial'){
  hero.position.x=clamp(hero.position.x,-25,25);
  hero.position.z=clamp(hero.position.z,-25,25);
 }else if(data.onboarding?.area==='realm'){
  const r=Math.hypot(hero.position.x,hero.position.z);
  if(r>15.5){hero.position.x*=15.5/r;hero.position.z*=15.5/r;}
 }
 // Keep cutaway in sync with the actual rendered camera, updated below.
  townLife.update(dt,t,hero.position,(data.onboarding?.area||'world')==='world');
  audio.cityAmbience(t,(data.onboarding?.area||'world')==='world'&&isOakrestSafe(hero.position.x,hero.position.z));
  const gait=Math.hypot(motion.x,motion.z)+(woodcuttingTarget?.approaching?3.5:0);stride+=gait*dt*2.6;
 const combatFacing=!!combatTarget||holdingAttack||pendingBasic||pendingAbility||activeStrikes.length||t<attackUntil;
 const aimingAt=combatTarget&&targetValid(combatTarget,activeEnemies(),hero.position)?combatTarget:null;
 const lockYaw=aimingAt?Math.atan2(aimingAt.x-hero.position.x,-(aimingAt.z-hero.position.z)):null;
 const chopYaw=woodcuttingTarget?Math.atan2(woodcuttingTarget.x-hero.position.x,-(woodcuttingTarget.z-hero.position.z)):null;
 const heading=chopYaw!==null?-chopYaw:lockYaw!==null&&Math.hypot(v,h)<.12?-lockYaw:characterFacingTarget({mode:cameraSettings.mode,lastHeading:visualHeading,cameraYaw:yaw,strikeYaw:activeStrikes.length?activeStrikes[0].yaw:null,velocityX:motion.x,velocityZ:motion.z,combatFacing});
 visualHeading=cameraSettings.mode==='follow'?(gait>.3||combatFacing?heading:visualHeading):dampAngle(visualHeading,heading,19,dt);
 hero.rotation.y=visualHeading;
 animateActor(hero,{dt,t,stride,speed:gait,hit:t-lastHurt<.16,attack:attackAnimation,chopping:woodcuttingTarget&&!woodcuttingTarget.approaching?{start:woodcuttingSwingStart,period:WOODCUTTING_SWING_SECONDS}:null,dodge:dodgeTravel?Math.sin(Math.PI*Math.min(1,(t-dodgeTravel.start)/.32)):0,side:h,backwards:v<0,dead:hp<=0,combat:combatFacing});
 const look=hero.position.clone().add(new THREE.Vector3(0,1.65,0));
 const orbit=cameraOrbitVector(yaw,pitch,cameraSettings.zoom,cameraSettings.height);
 const indoor=(data.onboarding?.area||'world')==='world'?expandedTown.interior(hero.position.x,hero.position.z):null;
 // Smoothly reveal the whole room in a raised three-quarter view; never
 // let the indoor camera collide with walls hidden by the cutaway effect.
 interiorCameraBlend+=(Number(!!indoor)-interiorCameraBlend)*frameDamping(8,dt);
 const exterior=look.clone().add(new THREE.Vector3(orbit.x,orbit.y,orbit.z));
 const height=indoor?indoorViewHeight(indoor):8.5;
 const elevated=look.clone().add(new THREE.Vector3(orbit.x*.74,height,orbit.z*.74));
 const ideal=exterior.lerp(elevated,interiorCameraBlend);
 cameraJolt=Math.max(0,cameraJolt-dt*.85);
 if(interiorCameraBlend<.08&&!matchMedia('(prefers-reduced-motion: reduce)').matches)ideal.y+=cameraJolt*Math.sin(elapsed*95)*.25;
 if(interiorCameraBlend<.02){
  const safe=safeCamera(look,ideal);ideal.set(safe.x,safe.y,safe.z);
 }
 if(cameraSettings.mode==='follow'&&interiorCameraBlend<.01)camera.position.copy(ideal);
 else camera.position.lerp(ideal,frameDamping(interiorCameraBlend>.01?12:cameraSettings.smoothing,dt));
 if(interiorCameraBlend<.02){
  const actual=safeCamera(look,camera.position);camera.position.set(actual.x,actual.y,actual.z);
 }
 const cameraAim=look.clone().addScaledVector(front,2.8*(1-interiorCameraBlend)).add(
  new THREE.Vector3(0,-pitch*4*(1-interiorCameraBlend)+.65*interiorCameraBlend,0));
 if(cameraSettings.mode==='follow'&&interiorCameraBlend<.01)cameraFocus.copy(cameraAim);
 else cameraFocus.lerp(cameraAim,frameDamping(12,dt));
 camera.lookAt(cameraFocus);
 expandedTown.update(hero.position,t,camera.position);
 for(let i=groundEffects.length-1;i>=0;i--){const field=groundEffects[i];if(t>=field.until){groundEffects.splice(i,1);continue;}
  for(const e of activeEnemies())if(!e.dead&&!e.retreating&&Math.hypot(e.x-field.origin.x,e.z-field.origin.z)<=field.radius&&clearCombatLine(field.origin,enemyCentre(e)))e.slowUntil=Math.max(e.slowUntil,t+.15);
 }
 for(const e of activeEnemies()){e.previousCentre=enemyCentre(e);updateEnemy(e,dt,t);}updateStrikes(t);
 const bodies=activeEnemies().filter(e=>!e.dead&&e.type!=='dummy');
 for(let i=0;i<bodies.length;i++){
  const e=bodies[i];if(e.retreating||e.charge||e.pounce||e.rootUntil>t||e.stunUntil>t)continue;
  for(const other of [hero.position,...bodies.slice(0,i)]){
   const dx=e.x-other.x,dz=e.z-other.z,d=Math.hypot(dx,dz),gap=.85-d;
   if(gap>0){const moved=moveOnGround(e,(d?dx/d:1)*gap*.5,(d?dz/d:0)*gap*.5,e.type==='boar'?.72:.42);
    if(Math.hypot(moved.x-e.startX,moved.z-e.startZ)<=ENEMY_COMBAT[e.type].leash){e.x=moved.x;e.z=moved.z;e.group.position.set(e.x,moved.y,e.z);}}
  }
 }
 if(t>=nextLabelUpdate){updateEnemyLevelLabels();nextLabelUpdate=t+.05;}
 updateLoot(dt,t);
for(let i=projectiles.length-1;i>=0;i--){const p=projectiles[i];p.age+=dt;if(p.particle){p.mesh.position.addScaledVector(p.velocity,dt);p.velocity.y-=7*dt;p.mesh.scale.multiplyScalar(Math.exp(-2.14*dt));}else{const start=p.mesh.position.clone(),travel=projectileTravel(p.distance, p.speed, dt, p.maxDistance);p.mesh.position.addScaledVector(p.dir,travel.step);p.distance=travel.distance;let closest=null,best=Infinity;for(const e of activeEnemies()){if(e.dead||e.hp<=0||e.retreating)continue;const center=enemyCentre(e);const hit=movingSphereHit(start,p.mesh.position,e.previousCentre||center,center,enemyRadius(e)+(p.style==='magic'?.18:.04));if(hit!==null&&hit<best){best=hit;closest=e;}}const worldHit=segmentWorldHit(start,p.mesh.position,p.style==='magic'?.18:.04);if(worldHit!==null&&worldHit<=best){const impact=start.clone().lerp(p.mesh.position,worldHit);sparks(impact,STYLE_COLOURS[p.style],4);if(p.opts.explosion){areaImpact(impact,p.opts.explosion,p.damage*.45,{},p.source);audio.play('explosion');}p.life=0;}else if(closest){p.mesh.position.lerpVectors(start,p.mesh.position,best);if(p.opts.waveId===undefined||closest.lastWave!==p.opts.waveId){hitEnemy(closest,p.damage,p.opts,p.source);closest.lastWave=p.opts.waveId;}sparks(p.mesh.position.clone(),STYLE_COLOURS[p.style],5);if(p.opts.explosion){areaImpact(p.mesh.position,p.opts.explosion,p.damage*.45,{},p.source,closest);audio.play('explosion');}p.life=0;}}
 if(p.age>p.life||(!p.particle&&(p.distance>=p.maxDistance||p.mesh.position.y<terrainHeight(p.mesh.position.x,p.mesh.position.z)))){scene.remove(p.mesh);visuals.cleanupProjectile(p.mesh);projectiles.splice(i,1);}}
visuals.update(dt);
 for(let i=rings.length-1;i>=0;i--){const r=rings[i];r.time+=dt;r.mesh.scale.setScalar(r.radius*(.3+r.time/r.duration*.7));r.mesh.material.opacity=Math.max(0,.85*(1-r.time/r.duration));if(r.time>=r.duration){scene.remove(r.mesh);r.mesh.geometry.dispose();r.mesh.material.dispose();rings.splice(i,1);}}
for(let i=floaters.length-1;i>=0;i--){const f=floaters[i];f.age+=dt;const v=f.pos.clone().project(camera);f.el.style.left=`${(v.x+1)*innerWidth*.5}px`;f.el.style.top=`${(-v.y+1)*innerHeight*.5-f.age*37}px`;f.el.style.opacity=`${Math.max(0,1-f.age/1.1)}`;if(f.age>1.1){f.el.remove();floaters.splice(i,1);}}
let aim=null,aimScore=-Infinity;for(const e of activeEnemies()){if(e.dead||e.retreating||e.type==='dummy'&&hero.position.distanceTo(e.group.position)>15)continue;const dx=e.x-hero.position.x,dz=e.z-hero.position.z,dist=Math.hypot(dx,dz);if(dist>30||!clearCombatLine(hero.position.clone().add(new THREE.Vector3(0,1.3,0)),enemyCentre(e)))continue;const dot=(dx*front.x+dz*front.z)/Math.max(.01,dist);const score=dot-0.01*dist;if(dot>.86&&score>aimScore){aim=e;aimScore=score;}}
if(combatTarget&&targetValid(combatTarget,activeEnemies(),hero.position))aim=combatTarget;
 $('targetbox').hidden=!aim;if(aim){$('target-name').textContent=ENEMY_COMBAT[aim.type].name+' · Combat Lv '+aim.level;$('target-name').dataset.threat=enemyThreatTier(aim.level,combatLevelFromXp(data.xp));$('target-hp').style.width=`${100*aim.hp/aim.max}%`;}
if(data.onboarding?.area!=='realm'&&hp>0&&isOakrestSafe(hero.position.x,hero.position.z)&&t-lastHurt>8&&!activeEnemies().some(e=>e.aggro)){const max=maxHealth(levelFromXp(data.xp.vitality).level);if(hp<max){hp=Math.min(max,hp+max*.025*dt);updateHpUI();}}
const z=hero.position.z;$('area').textContent=data.onboarding?.area==='tutorial'?'The First Steps':data.onboarding?.area==='realm'?'Portal Realm':z< -80?'Deep Greenwood':z< -47?'Forest Road':z< -13?'Oakrest Greenbelt':'Oakrest Town';updatePortalInteraction();townUI.update({x:hero.position.x,z:hero.position.z,allowed:started&&hp>0&&(data.onboarding?.area||'world')==='world'});openingWorld.update(data.onboarding?.area||'world',t);
const timer=attackCooldown(attackUntil,lastAttackInterval,t);
 const attackButton=$('touch-attack'),attackTimer=$('attack-timer');
 attackButton.style.setProperty('--attack-deg',(timer.progress*360).toFixed(1)+'deg');
 attackButton.classList.toggle('recovering',!timer.ready);
 const attackLabel=attackButton.querySelector('small');if(attackLabel)attackLabel.textContent=combatTarget?'STOP':'ATTACK';
 attackButton.setAttribute('aria-label',combatTarget?'Stop automatic combat':'Lock an enemy and begin automatic attacks');
 $('weapon-cycle').textContent=combatTarget?(timer.ready?'AUTO-ATTACK ACTIVE':'AUTO · '+timer.remaining.toFixed(1)+'s recovery'):'SELECT AN ENEMY · ATTACK';
 if(attackTimer)attackTimer.textContent=combatTarget?(timer.ready?'AUTO':timer.remaining.toFixed(1)+'s'):(timer.ready?'READY':timer.remaining.toFixed(1)+'s');
 const remainingDodge=Math.max(0,dodgeUntil-t);$('touch-dodge').classList.toggle('unavailable',remainingDodge>0);$('touch-swap').classList.toggle('queued',!!queuedStyle);const dodgeLabel=$('touch-dodge').querySelector('small');if(dodgeLabel)dodgeLabel.textContent=remainingDodge>0?remainingDodge.toFixed(1)+'s':'DODGE';
 for(const [i,b] of [...$('skills').children].entries()){const ability=activeSkillCache[i];const until=ability?cooldowns.get(abilityCooldownKey(style,slotFamily(style,data.gear[style]),ability))||0:0;const remaining=Math.max(0,until-t);b.classList.toggle('queued',queuedAbility?.style===style&&queuedAbility.index===i);b.classList.toggle('cooling',remaining>0);const unavailable=!!ability&&(remaining>0||t<attackUntil||!!dodgeTravel||t<switchUntil);b.classList.toggle('unavailable',unavailable);b.setAttribute('aria-disabled',String(unavailable));b.querySelector('.cooldown').textContent=remaining>0?remaining.toFixed(1):'';}
}
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}addEventListener('resize',resize);
const canvas=renderer.domElement;
function cameraMove(dx,dy,touch=false){const speed=lookSensitivity*(touch?.82:1);yaw+=dx*.0044*speed;pitch=clamp(pitch+dy*.0026*speed*(cameraSettings.invertY?-1:1),-.45,.85);}
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas)cameraMove(e.movementX,e.movementY);});
canvas.addEventListener('mousedown',e=>{if(!started)return;if(!isTouch&&document.pointerLockElement!==canvas)canvas.requestPointerLock?.().catch(()=>{});if(e.button===0)toggleCombat();});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
let touchLook=null;canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;if(e.clientX<innerWidth*.37)return;touchLook={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture?.(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(!touchLook||touchLook.id!==e.pointerId)return;cameraMove(e.clientX-touchLook.x,e.clientY-touchLook.y);touchLook.x=e.clientX;touchLook.y=e.clientY;});const endTouch=e=>{if(touchLook?.id===e.pointerId)touchLook=null;};canvas.addEventListener('pointerup',endTouch);canvas.addEventListener('pointercancel',endTouch);
const joy=$('joystick'),stick=$('stick');let joyId=null;joy.addEventListener('pointerdown',e=>{if(joyId!==null)return;e.preventDefault();joyId=e.pointerId;joy.setPointerCapture(e.pointerId);updateStick(e);});joy.addEventListener('pointermove',e=>{if(e.pointerId===joyId)updateStick(e);});function updateStick(e){const r=joy.getBoundingClientRect(),m=stickFromOffset(e.clientX-r.left-r.width/2,e.clientY-r.top-r.height/2,r.width*.34);joystick.x=m.x;joystick.y=m.y;stick.style.transform=`translate(${m.knobX}px,${m.knobY}px)`;}function releaseStick(e){if(e.pointerId!==joyId)return;joyId=null;joystick.x=0;joystick.y=0;stick.style.transform='';}joy.addEventListener('pointerup',releaseStick);joy.addEventListener('pointercancel',releaseStick);joy.addEventListener('lostpointercapture',releaseStick);
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

// One tap starts or stops auto-attacks; dragging still turns the camera.
const attackButton=$('touch-attack');let attackId=null,attackX=0;
attackButton.addEventListener('pointerdown',e=>{
  if(!started || attackId!==null)return;e.preventDefault();
  attackId=e.pointerId;attackX=e.clientX;holdingAttack=true;toggleCombat();
  attackButton.classList.add('held');attackButton.setPointerCapture?.(e.pointerId);
});
// Pointer capture retains this right-thumb gesture even after sliding beyond ATTACK.
// Combat stays locked after release; horizontal drag turns the camera.
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

function refreshCameraControls(){
 const cfg=cameraSettings;
 const numeric=[['look-speed','sensitivity','×',1],['camera-zoom','zoom','',1],['camera-height','height','',1],['camera-fov','fov','°',0],['camera-smoothing','smoothing','',0],['gamepad-deadzone','gamepadDeadzone','',2]];
 for(const [id,key,suffix,precision] of numeric){
  $(id).value=cfg[key];
  $(id+'-value').textContent=Number(cfg[key]).toFixed(precision)+suffix;
 }
 $('camera-invert-y').checked=cfg.invertY;
 $('camera-mode').value=cfg.mode;
}
function setCameraOption(key,value){
 // When locking, follow the existing character facing rather than spinning the
 // avatar to wherever the freely orbiting camera happened to be pointing.
 if(key==='mode'&&value==='follow'&&cameraSettings.mode!=='follow')yaw=-hero.rotation.y;
 cameraSettings=normalizeCameraSettings({...cameraSettings,[key]:value});
 lookSensitivity=cameraSettings.sensitivity;
 camera.fov=cameraSettings.fov;camera.updateProjectionMatrix();
 saveCameraSettings();refreshCameraControls();
}
refreshCameraControls();
for(const [id,key] of [['look-speed','sensitivity'],['camera-zoom','zoom'],['camera-height','height'],['camera-fov','fov'],['camera-smoothing','smoothing'],['gamepad-deadzone','gamepadDeadzone']])
 $(id).addEventListener('input',e=>setCameraOption(key,Number(e.target.value)));
$('camera-invert-y').addEventListener('change',e=>setCameraOption('invertY',e.target.checked));
 $('camera-mode').addEventListener('change',e=>setCameraOption('mode',e.target.value));
$('camera-recenter').addEventListener('click',()=>{
 yaw=cameraSettings.mode==='follow'?-hero.rotation.y:0;pitch=.12;cameraFocus.copy(hero.position).add(new THREE.Vector3(0,1.65,0));
 toast('Camera recentred');
});
$('camera-reset').addEventListener('click',()=>{
 cameraSettings=normalizeCameraSettings(CAMERA_DEFAULTS);lookSensitivity=cameraSettings.sensitivity;
 yaw=0;pitch=.12;camera.fov=cameraSettings.fov;camera.updateProjectionMatrix();
 saveCameraSettings();refreshCameraControls();toast('Camera settings reset');
});
function isGameplayMenuOpen(){
 return !progressPanel.hidden||!$('controls-panel').hidden||!$('character-creator').hidden||townUI.isOpen();
}
function focusGamepadMenu(direction){
 const parent=townUI.isOpen()?$('town-panel'):progressPanel;
 const fields=[...parent.querySelectorAll('button:not(:disabled),select:not(:disabled),input:not(:disabled)')]
  .filter(el=>el.getClientRects().length>0);
 if(!fields.length)return;
 const current=fields.indexOf(document.activeElement);
 const next=fields[(current<0?0:current+direction+fields.length)%fields.length];
 next.focus({preventScroll:true});next.scrollIntoView?.({block:'nearest',behavior:'instant'});
}
function pollGamepad(dt){
 let current=null;
 try{current=firstStandardGamepad(navigator.getGamepads?.(),cameraSettings.gamepadDeadzone);}
 catch{current=null;}
 // A disconnected or unsupported pad never leaves movement or held attack stuck.
 const newName=current?current.label:'';
 if(newName!==padName){
  padName=newName;
  $('gamepad-status').textContent=current?'Connected: '+(current.label||'Standard Gamepad'):'No compatible controller detected';
 }
 const edges=gamepadEdges(padPrevious,current);
 padState=current;
 if(!current){padPrevious=null;return;}
 const menus=isGameplayMenuOpen();
 if(edges.menu){if(menus){bookClose();closeControls();}else bookOpen('settings');}
 else if(edges.inventory){if(menus){bookClose();closeControls();}else bookOpen('inventory');}
 else if(started){
  if(menus){
   if(edges.abilities[0]||edges.abilities[2])focusGamepadMenu(-1);
   if(edges.abilities[1]||edges.abilities[3])focusGamepadMenu(1);
   if(current.attack&&!padPrevious?.attack && document.activeElement?.click)document.activeElement.click();
   if(edges.dodge){closeControls();bookClose();}
  }else{
   if(edges.dodge)dodge();
   if(current.attack&&!padPrevious?.attack)toggleCombat();
   if(edges.swap)setStyle(nextStyle(style));
   if(edges.previousStyle)setStyle(STYLE_ORDER[(STYLE_ORDER.indexOf(style)+STYLE_ORDER.length-1)%STYLE_ORDER.length]);
   if(edges.nextStyle)setStyle(nextStyle(style));
   if(edges.interact){if(data.onboarding?.area==='realm')enterCityPortal();else if(!townUI.interact({x:hero.position.x,z:hero.position.z,allowed:started&&hp>0&&(data.onboarding?.area||'world')==='world',time:now()}))pickupNearby();}
   edges.abilities.forEach((hit,index)=>{if(hit)useAbility(index);});
   if(Math.abs(current.lookX)+Math.abs(current.lookY)>.005)cameraMove(current.lookX*dt*320,current.lookY*dt*320,true);
  }
 }else if(current.attack&&!padPrevious?.attack&&$('intro').classList.contains('hidden')===false&&$('character-creator').hidden){
  startGameplay();
 }
 padPrevious=current;
}
function closeControls(){$('controls-panel').hidden=true;$('help-button').setAttribute('aria-expanded','false');}
$('help-button').addEventListener('click',()=>bookOpen('settings',true));
$('close-controls').addEventListener('click',()=>{if(!progressPanel.hidden)bookClose();else closeControls();});
addEventListener('blur',()=>{
  stopWoodcutting();holdingAttack=false;attackId=null;attackButton.classList.remove('held');
  joyId=null;joystick.x=0;joystick.y=0;stick.style.transform='';
  lookPointer=null;keys.clear();
});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){stopWoodcutting();keys.clear();holdingAttack=false;attackId=null;attackButton.classList.remove('held');joyId=null;joystick.x=0;joystick.y=0;stick.style.transform='';lookPointer=null;}
});
document.addEventListener('keydown',e=>{if(['Tab','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add((directions[e.key]||e.key).toLowerCase());if(e.repeat)return;if(e.code==='Tab')setStyle(nextStyle(style));if(e.key.toLowerCase()==='m'&&started&&progressPanel.hidden)bookOpen('map');if(e.key==='j'||e.key==='J'||e.code==='Enter')toggleCombat();if(e.key.toLowerCase()==='e'&&data.onboarding?.area==='realm')enterCityPortal();if(e.key.toLowerCase()==='t'&&started)townUI.interact({x:hero.position.x,z:hero.position.z,allowed:hp>0&&(data.onboarding?.area||'world')==='world',time:now()});if(e.code==='Escape'){stopWoodcutting();document.exitPointerLock?.();closeControls();bookClose();townUI.close();}if((e.key==='g'||e.key==='G')&&!e.repeat)pickupNearby();if(e.key==='1'||e.key==='2'||e.key==='3')setStyle(STYLE_ORDER[Number(e.key)-1]);if('qerf'.includes(e.key.toLowerCase())&&e.key.length===1)useAbility('qerf'.indexOf(e.key.toLowerCase()));if(e.code==='Space')dodge();});document.addEventListener('keyup',e=>keys.delete((directions[e.key]||e.key).toLowerCase()));addEventListener('blur',()=>keys.clear());
function startGameplay(){
 if(started)return;
 if(!activeCharacter&&!legacySave)return;
 started=true;audio.unlock();$('intro').classList.add('hidden');
 document.documentElement.classList.add('oakrest-playing');refreshSideInventory(true);
 if(!isTouch)canvas.requestPointerLock?.().catch(()=>{});
 if(!saveWritable)toast('Browser storage is unavailable. Your progress cannot be saved.');
 toast(data.onboarding?.area==='tutorial'
  ?'<b>Welcome to The First Steps!</b> Hit the training dummy with all three combat styles.'
  :'<b>Welcome to Oakrest!</b> Visit the bank, general store and Forester\'s Lodge before venturing beyond the safe greenbelt.');
}
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
  startGameplay(); // one tap: Create Character -> playable tutorial
 },
 onSelect(profile){
  const saved=localStorage.getItem(saveKeyFor(profile.id));
  if(!saved)throw new Error('Character progress could not be found. No saves were changed.');
  const loaded=validSave(JSON.parse(saved));localStorage.setItem(activeKey,profile.id);
  useCharacter(profile,loaded);
  startGameplay();
 },
 onLegacy(){
  if(!legacySave)throw new Error('No earlier character was found.');
  localStorage.removeItem(activeKey);useCharacter(null,legacySave);
  startGameplay();
 }
});
// The title's native Characters link opens a separate lightweight page even
// when the WebGL engine or its event listeners are not available.
// Reloading before changing characters clears in-flight combat state.
$('character-switch').addEventListener('click',()=>{
 save();
 location.assign(new URL('./characters.html',location.href).href);
});
if(activeCharacter)useCharacter(activeCharacter,data);
else if(legacySave)useCharacter(null,legacySave);
else characterUI.show();
const query=new URLSearchParams(location.search);
if(query.has('characters'))characterUI.show();
$('begin').addEventListener('click',()=>{if(!activeCharacter&&!legacySave){location.assign(new URL('./characters.html',location.href).href);return;}startGameplay();});
equipVisual(style,data.gear[style]);refreshSkills();
if(new URLSearchParams(location.search).has('autostart')&&(activeCharacter||legacySave))startGameplay();
if(data.defeated>=3){questCompleted=true;$('quest-text').textContent='Master all three styles and defeat the bandit on the forest road.';}
let last=performance.now(),lastMetrics=last,frameTimes=[];
const stats={fps:0,p95:0,drawCalls:0,triangles:0,geometries:0,textures:0,effects:0};
function loop(time){requestAnimationFrame(loop);const realDt=(time-last)/1000;last=time;if(document.hidden)return;const dt=Math.min(.1,Math.max(0,realDt));if(started){const steps=Math.max(1,Math.ceil(dt/(1/60)));for(let i=0;i<steps;i++){gameTime+=dt/steps;animate(dt/steps,now());}}else pollGamepad(dt);const inWorld=(data.onboarding?.area||'world')==='world';if(inWorld)scenery.update(now(),camera);visualLighting.update(hero.position,inWorld?expandedTown.interior(hero.position.x,hero.position.z):null,inWorld);renderer.render(scene,camera);minimap.update(time,{x:hero.position.x,z:hero.position.z,yaw,area:data.onboarding?.area||'world',enemies});frameTimes.push(realDt*1000);if(time-lastMetrics>2000){const sorted=frameTimes.slice().sort((a,b)=>a-b);stats.fps=1000/(frameTimes.reduce((a,b)=>a+b,0)/frameTimes.length);stats.p95=sorted[Math.floor(sorted.length*.95)];stats.drawCalls=renderer.info.render.calls;stats.triangles=renderer.info.render.triangles;stats.geometries=renderer.info.memory.geometries;stats.textures=renderer.info.memory.textures;stats.effects=projectiles.length+rings.length+visuals.count;frameTimes=[];lastMetrics=time;$('performance-stats').textContent=Math.round(stats.fps)+' FPS · '+stats.drawCalls+' draws · '+quality;}}
requestAnimationFrame(loop);setInterval(save,6000);addEventListener('pagehide',save);
// Read-only diagnostics for reproducible device measurements. No player identifiers.
window.oakrestDiagnostics=()=>({...stats,quality,graphics:visualLighting.metrics(),version:'auto-combat-1'});
// Local-only QA uses isolated browser contexts and the real simulation/actions.
if((['localhost','127.0.0.1'].includes(location.hostname)||/^\/oakrest-dev(?:\/|$)/.test(location.pathname))&&new URLSearchParams(location.search).has('qa'))window.oakrestQA={
 animation:{specs:()=>listAnimationSpecs(),events:()=>animationJournal.latest(),pose:(family,cue,windup=1,release=0)=>abilityMotion(family,cue,windup,release),active:()=>attackAnimation?{...attackAnimation}:null},
 state:()=>({data:structuredClone(data),quickInventory:{open:sideInventoryOpen,items:inventoryEntries(data).length},woodcutting:{active:woodcuttingTarget?.id||null,trees:woodcuttingTrees.map(tree=>({id:tree.id,species:tree.species,logs:tree.state.logs,respawnAt:tree.state.respawnAt,visible:tree.group.visible}))},style,hp,combatTarget:combatTarget?.type||null,autoCombat:!!combatTarget,maxHit:maxHitFor(levelFromXp(data.xp[style]).level,getWeapon().basic,outgoingMultiplier(data.armour[style],style)*equipmentModifiers(data,style).power),city:{districts:expandedTown.districts,landmark:expandedTown.landmark,ambientCount:expandedTown.ambientCount},heroHeading:hero.rotation.y,cameraPosition:{x:camera.position.x,y:camera.position.y,z:camera.position.z},town:{buildings:expandedTown.buildings,staff:townLife.staff,villagers:townLife.snapshot(),inside:expandedTown.inside(hero.position.x,hero.position.z),interiorCameraBlend},cameraSettings:{...cameraSettings},gamepadConnected:!!padState,yaw,pitch,area:data.onboarding?.area||'world',hero:{x:hero.position.x,y:hero.position.y,z:hero.position.z},yaw,shieldUntil,dodgeUntil,cooldowns:Object.fromEntries(cooldowns),pendingBasic:!!pendingBasic,pendingAbility:!!pendingAbility,queuedAbility:queuedAbility?.index??null,attackUntil,time:now(),enemies:enemies.map(e=>({type:e.type,x:e.x,z:e.z,hp:e.hp,dead:e.dead,retreating:e.retreating,aggro:e.aggro,warning:!!e.warning,aiState:e.aiState||'idle',rootUntil:e.rootUntil,stunUntil:e.stunUntil,startX:e.startX,startZ:e.startZ})),projectiles:projectiles.filter(p=>!p.particle).length,activeStrikes:activeStrikes.length,effects:projectiles.length+rings.length+visuals.count}),
 quickInventory(open){setSideInventoryOpen(open);},woodcut:id=>startWoodcutting(id),learnWoodcutting(){data.professions.woodcuttingLearned=true;if(!data.inventory.weapons.melee.includes('bronze-axe'))data.inventory.weapons.melee.push('bronze-axe');save();},
 aim(x,y,z){const dx=x-hero.position.x,dz=z-hero.position.z;yaw=Math.atan2(dx,-dz);const distance=Math.hypot(dx,dz);let lo=-.45,hi=.85;for(let i=0;i<30;i++){const p=(lo+hi)/2,orbit=cameraOrbitVector(yaw,p,cameraSettings.zoom,cameraSettings.height),cameraY=hero.position.y+1.65+orbit.y,focusY=hero.position.y+1.65-p*4,atY=cameraY+(focusY-cameraY)*(distance+Math.hypot(orbit.x,orbit.z))/(2.8+Math.hypot(orbit.x,orbit.z));if(atY>y)lo=p;else hi=p;}pitch=(lo+hi)/2;},
 teleport(x,z,angle=0){hero.position.set(x,terrainHeight(x,z),z);yaw=angle;motion={x:0,z:0};expandedTown.update(hero.position);},travel:useTravelScroll,enterCity:enterCityPortal,basic:doBasic,target:(type)=>{const e=activeEnemies().find(m=>m.type===type&&!m.dead);return e?selectCombatTarget(e):false;},toggleCombat,stopCombat,ability:useAbility,dodge,style:setStyle,pickup:pickupNearby,save,
 receiveDamage(amount){applyEnemyDamage(null,{damage:amount},now());},
 spawn(type,x,z){if(!['mossling','boar','bandit','dummy'].includes(type)||enemies.length>=24||blocked(x,z,.8))return false;makeEnemy(type,x,z);return true;},
 equip:(kind,id,s=style)=>chooseGear(kind,id,s),slot:(index,id)=>{equipSkill(data,style,data.gear[style],index,id);refreshSkills();},
 step(seconds){for(let i=0;i<Math.round(seconds*60);i++){gameTime+=1/60;animate(1/60,gameTime);}},damage(amount){hp=Math.max(1,hp-amount);updateHpUI();}
};
// The real-rig animation viewer is explicitly opt-in for local/dev QA only.
// This import never runs in production and cannot trigger gameplay effects.
if(window.oakrestQA?.animation && query.has('animation'))
 import('./animation-inspector.js').then(m=>m.mountAnimationInspector()).catch(err=>console.warn('Animation QA preview unavailable',err));
