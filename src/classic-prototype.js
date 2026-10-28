import {bindClassicItemDrag} from './classic-item-drag.js';
import {classicItemDetails} from './classic-item-state.js';
import {createClassicSimulationClock} from './classic-combat-clock.js';
import {installClassicCanvasInput} from './classic-canvas-input.js';
import {createAudio} from './audio.js';
import {createClassicFrameBudget,classicAdaptiveRatio} from './classic-frame-budget.js';
import {createClassicCombatFeedback} from './classic-combat-feedback.js';
import {createClassicCombatImpacts,hitRecoilStrength} from './classic-combat-impacts.js';
import {bindClassicPress} from './classic-touch-press.js';
import {setupClassicFieldNotes} from './classic-field-notes.js';
import {setupClassicChat} from './classic-chat.js';
import {setupClassicActionBar} from './classic-actionbar.js';
import {citizenRoutine} from './classic-world-life.js';
import {OAKREST_PALETTE,classicPixelRatio} from './classic-art-direction.js';
import {createAdventureWorld} from './adventure-world.js';
import {setupAdventureUI} from './adventure-ui.js';
import {installClassicIntegratedLayout} from './classic-integrated-layout.js';
import {setupClassicSkills} from './classic-skills-ui.js';
import {DUNGEON_ROOMS,ADVENTURE_REGIONS} from './adventure-content.js';
/** Oakrest Classic Block 3 — input shell around renderer-free navigation.
 * Retains the original character save and all gameplay rules untouched.
 */
import * as THREE from 'three';
import {validSave,defaultSave,STYLE_ORDER} from './rules.js';
import {readCharacters} from './characters.js';
import {storageKey} from './storage-key.js';
import {createClassicSaveManager} from './classic-save-manager.js';
import {installGameZoomGuard} from './touch-gestures.js';
import {CLASSIC_CAMERA,CLASSIC_NPCS,classicScreenBasis,clamp,occupantBuilding,presentationSnapshot,slideMove} from './classic-presentation.js';
import {createClassicOrbitCamera} from './classic-camera-controls.js';
import {createClassicCombat} from './classic-combat.js';
import {createClassicAbilityView} from './classic-ability-view.js';
import {classicAttackPose} from './classic-combat-motion.js';
import {breaksPlayerAttackIntent,createClassicCombatMovementIntent} from './classic-combat-intent.js';
import {createClassicCombatView} from './classic-combat-view.js';
import {createClassicQuestBeacon} from './classic-quest-beacon.js';
import {availableQuestGivers} from './classic-quest-indicators.js';
import {createClassicGroundLoot} from './classic-loot-view.js';
import {setupClassicItems} from './classic-items-ui.js';
import {createClassicMinimap} from './classic-minimap.js';
import {createClassicWindowController} from './classic-ui-controller.js';
import {createClassicNavigation} from './classic-navigation.js';
import {CLASSIC_INTERACTABLES,closestClickedInteractable,findClassicInteractable,
 nearbyClassicInteraction,classicInteractionCopy} from './classic-interactions.js';
import {createClassicVillage} from './classic-village.js';
import {makeClassicActor,makeGroundShadow} from './classic-sprites.js';
import {setupClassicCharacterUI} from './classic-character-ui.js';

const $=id=>document.getElementById(id);
const root=$('classic-game'),keys=new Set();
installClassicIntegratedLayout(document);
const fieldNotes=setupClassicFieldNotes(document);
const chat=setupClassicChat(document);
const audio=createAudio(localStorage,storageKey('oakrest-audio',location.pathname));
const damageFeedback=createClassicCombatFeedback(root);
document.addEventListener('pointerdown',()=>audio.unlock(),{once:true});
document.addEventListener('keydown',()=>audio.unlock(),{once:true});
installGameZoomGuard(document);
function readExistingCharacter(){
 const key=k=>storageKey(k,location.pathname);
 try{
  const roster=readCharacters(localStorage,key('oakrest-characters-v1'));
  const active=roster.find(x=>x.id===localStorage.getItem(key('oakrest-active-character')));
  const raw=active?localStorage.getItem(key('oakrest-character-save-'+active.id)):
   localStorage.getItem(key('oakrest-v1'));
  return {profile:active||null,save:raw?validSave(JSON.parse(raw)):defaultSave(),existing:!!raw,raw};
 }catch{return {profile:null,save:defaultSave(),existing:false};}
}
const existing=readExistingCharacter(),navigation=createClassicNavigation(),combat=createClassicCombat({save:existing.save,adventure:true});
const saveManager=createClassicSaveManager({storage:localStorage,pathname:location.pathname,
 profile:existing.profile,baselineRaw:existing.raw,
 onStatus:result=>{
  const state=document.getElementById('classic-save-state');
  if(state)state.textContent=result.reason;
 }});
let sessionMutated=false,needsSave=false,lastSavedAt=0;
let wornCache=null,wornCacheStyle=null;
function savedWorn(){
 if(!wornCache||wornCacheStyle!==style){
  // Temporary simulation-loaned weapons must not masquerade as equipped items.
  wornCache=presentationSnapshot(combat.persistentSave(),style,player).worn;
  wornCacheStyle=style;
 }
 return wornCache;
}
const player={x:0,z:39},input={x:0,z:0},npcActors=[];
let combatPursuitId=null;
const combatMovementIntent=createClassicCombatMovementIntent();
let style='melee',zoom=1,look={x:0,z:1},walkClock=0,lastInside=null;
const orbitCamera=createClassicOrbitCamera();
let selectedTarget=null,lastInteraction=null,lastStatus='Tap to move, or select a person or object.';
let playerHurtUntil=0;
let dodgeTravel=null,nextTargetUi=0;
const scene=new THREE.Scene();
scene.background=new THREE.Color(OAKREST_PALETTE.sky);
scene.fog=new THREE.Fog(OAKREST_PALETTE.sky,75,160);
scene.add(new THREE.HemisphereLight(OAKREST_PALETTE.sun,OAKREST_PALETTE.shade,1.7));
const sun=new THREE.DirectionalLight(OAKREST_PALETTE.sun,1.8);sun.position.set(-27,55,36);scene.add(sun);
const frameBudget=createClassicFrameBudget();
let renderer,basePixelRatio=1,drawRatio=0;
try{
 renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 root.append(renderer.domElement);
}catch(err){$('classic-error').hidden=false;throw err;}
const camera=new THREE.OrthographicCamera(-20,20,20,-20,.1,270);
const raycaster=new THREE.Raycaster(),groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
const village=createClassicVillage(scene);
const reducedCombatMotion=!!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
const abilityView=createClassicAbilityView(scene,{reducedMotion:reducedCombatMotion});
const impactEffects=createClassicCombatImpacts(scene,{reducedMotion:reducedCombatMotion});
const adventureWorld=createAdventureWorld(scene);
let adventureUi=null;
const combatView=createClassicCombatView(scene,combat.getState().monsters,{reducedMotion:reducedCombatMotion});
const groundView=createClassicGroundLoot(scene);
let itemUi=null,windowUi=null,characterUI=null,skillsUi=null;
const actionbar=setupClassicActionBar({doc:document,combat,legacyPreferences:!existing.profile,
 activateBinding:binding=>{
  if(/^ability[0-3]$/.test(binding))return useCombatAbility(Number(binding.at(-1)));
  if(binding==='dodge'){triggerDodge();return true;}
  if(binding==='attack'){toggleAttack();return true;}
  if(binding==='skills'){skillsUi?.open();return true;}
  if(binding==='quests'){adventureUi?.showJournal();return true;}
  if(['inventory','equipment','map'].includes(binding)){windowUi?.open(binding);return true;}
  const id=binding==='eat'?'material.ration':binding==='drink'?'material.woodland-tonic':binding;
  const details=classicItemDetails(combat.sandboxSave(),id,style);
  if(details?.action&&details.action.style!==style)switchStyle(details.action.style);
  const result=combat.itemAction(details?.action?{...details.action,id:details.item.legacy.itemId}:{type:'use',id},player);
  feedback(result.reason);if(result.ok){markProgress();itemUi?.render();refreshHud();}return result.ok;
 },changed:()=>{markProgress();itemUi?.render();},feedback});
const minimap=createClassicMinimap({canvas:$('classic-minimap-canvas'),fullCanvas:$('classic-map-canvas'),
 onDestination:point=>{windowUi?.hide();queueDestination(point);}});
const hero=makeClassicActor({style,skin:existing.profile?.skinTone||'#f0ceaa',
 hair:existing.profile?.hairColor||'#39271f',coat:existing.profile?.outfitColor||'#607b7c',
 outfit:existing.profile?.outfit||'tunic',hairstyle:existing.profile?.hairstyle||'short',
 sex:existing.profile?.sex||'male'});
const heroShadow=makeGroundShadow();
scene.add(hero.sprite,heroShadow);
for(const npc of CLASSIC_NPCS){
 const actor=makeClassicActor({style:'melee',coat:npc.colour,skin:'#dbaf8d',
  hair:npc.role==='guard'?'#4b3029':'#72533c',npc:true,armed:npc.role==='guard'});
 const shadow=makeGroundShadow();
 scene.add(actor.sprite,shadow);
 actor.sprite.position.set(npc.x,.08,npc.z);
 shadow.position.set(npc.x,.04,npc.z);
 const beacon=npc.targetId?createClassicQuestBeacon(scene,npc.x,npc.z,npc.targetId):null;
 npcActors.push({...npc,actor,shadow,beacon});
}
const pointerMark=new THREE.Mesh(new THREE.RingGeometry(.54,.66,24),
 new THREE.MeshBasicMaterial({color:'#e6d29b',side:THREE.DoubleSide,transparent:true,opacity:.82,depthWrite:false}));
pointerMark.rotation.x=-Math.PI/2;pointerMark.position.y=.08;pointerMark.visible=false;scene.add(pointerMark);
let markerTime=0;
const selectableWorld=[];
village.root.traverse(node=>{if(node.userData.interactId)selectableWorld.push(node);});
adventureWorld.root.traverse(node=>{if(node.userData.interactId)selectableWorld.push(node);});
const dialogue=$('classic-dialogue'),statusText=$('classic-action-hint'),interactButton=$('classic-interact-button');
let toastUntil=0;
function feedback(text){
 lastStatus=text;statusText.textContent=text;fieldNotes.record(text);
 if(text&&!/^(Tap to move|Walking|Destination reached|Approaching |Attacking )/i.test(text)){
  const type=/hit ·|damage|Miss|attac|Dodged|incoming|defeated/i.test(text)?'Combat':'Game';
  chat.record(text,type==='Combat'?'Game':type);
 }
 const toast=$('classic-toasts');
 const critical=/save failed|save locked|changed by another|could not save|storage failed|save conflict/i.test(text);
 toast.classList.remove('is-faded');toast.classList.toggle('is-critical',critical);
 toastUntil=critical?Infinity:combat.getState().time+3.2;
}
function showSaveState(message=null){
 const s=saveManager.status();
 const pill=$('classic-save-indicator');
 pill.classList.toggle('is-saved',s.enabled);
 pill.classList.toggle('is-blocked',!!s.blocked);
 pill.textContent=s.blocked?'● SAVE LOCKED':s.enabled?'● SAVING ENABLED':'● PRACTICE MODE';
 $('classic-save-mode').textContent=s.blocked?'SAVE LOCKED · RELOAD':
  s.enabled?'PERSISTENT · GUARDED':'PRACTICE · NOT SAVING';
 $('classic-enable-save').disabled=s.enabled||!s.canEnable;
 $('classic-enable-save').textContent=s.blocked?'LOCKED':'ENABLE SAVING';
 $('classic-save-now').disabled=!s.enabled;
 $('classic-restore-save').disabled=!s.canRestore;
 if(message)$('classic-save-state').textContent=message;
 else if(s.blocked)$('classic-save-state').textContent=s.blocked;
 else if(s.enabled)$('classic-save-state').textContent=
  needsSave?'Unsaved changes · saving automatically':'All changes saved · rollback backup retained';
 else $('classic-save-state').textContent=existing.profile?
  'Changes are temporary. Enable before practising to save new progress.':
  'Select an existing character in the original game first.';
}
function saveNow(){
 if(!saveManager.status().enabled)return false;
 const result=saveManager.save(combat.persistentSave());
 needsSave=!result.ok;
 if(result.ok)lastSavedAt=combat.getState().time;
 showSaveState(result.reason);
 if(!result.ok)feedback(result.reason);
 return result.ok;
}
function markProgress(){
 wornCache=null;
 sessionMutated=true;
 if(saveManager.status().enabled){needsSave=true;showSaveState();}
}
$('classic-enable-save').addEventListener('click',()=>{
 if(sessionMutated){
  const message='This practice session has changed. Reload Classic before enabling saving so test items and XP cannot accidentally be imported.';
  showSaveState(message);feedback(message);return;
 }
 if(!existing.profile){
  showSaveState('Create or select a saved character in the original game first.');return;
 }
 if(!confirm('Enable saved character progression in Oakrest Classic? Your original save will be backed up first. Future combat, inventory, banking and shop changes will then be saved to this character.'))return;
 const result=saveManager.enable();
 showSaveState(result.reason);feedback(result.reason);
});
$('classic-save-now').addEventListener('click',saveNow);
$('classic-restore-save').addEventListener('click',()=>{
 const status=saveManager.status();
 if(!status.canRestore)return;
 if(!confirm('Restore the previous verified character save? Your latest saved changes will be replaced. The untouched original backup will remain.'))return;
 const restored=saveManager.restorePrevious();
 showSaveState(restored.reason);feedback(restored.reason);
 if(restored.ok)location.reload();
});
function showInteraction(target){
 const distance=Math.hypot(target.x-player.x,target.z-player.z);
 if(distance>.001)look={x:(target.x-player.x)/distance,z:(target.z-player.z)/distance};
 combat.stopTarget();
 lastInteraction=target.id;
 if(adventureUi?.talk(target))return;
 adventureUi?.hideContent();
 if(target?.service==='bank'||target?.service==='store'){
  navigation.stop();
  windowUi.open(target.service==='bank'?'bank':'shop');
  feedback('Talking to '+target.name+'.');
  return;
 }
 const copy=classicInteractionCopy(target,combat.sandboxSave());
 $('classic-dialogue-name').textContent=copy.title;
 $('classic-dialogue-text').textContent=copy.body;
 windowUi.open('dialogue');lastInteraction=target.id;
 feedback('Talking to '+target.name+'.');
}
$('classic-dialogue-close').addEventListener('click',()=>windowUi.hide());
function refreshHud(){
 wornCache=null;
 const view=presentationSnapshot(combat.persistentSave(),style,player);
 $('classic-name').textContent=existing.profile?.name||'The Wanderer';
 $('classic-combat').textContent=view.combatLevel;
 $('classic-vitality').textContent=view.vitality;
 $('classic-weapon').textContent=view.weaponName;
 $('classic-level').textContent=view.styleLevel;
 for(const b of document.querySelectorAll('[data-style]')){
  const chosen=b.dataset.style===style;
  b.classList.toggle('active',chosen);b.setAttribute('aria-pressed',String(chosen));
 }
 hero.update({facing:look,style,worn:view.worn,cameraOffset:orbitCamera.offset()});
 // Switching combat style changes equipped hotkeys immediately, even while
 // the render loop is paused for menus or a backgrounded browser tab.
 actionbar.update(combat.getState());
}
function switchStyle(which){
 if(!combat.styleSwitch(which))return;
 const current=combat.getState().style;
 if(current!==style){style=current;refreshHud();itemUi?.render();}
 updateCombatUi(combat.getState());
}
for(const b of document.querySelectorAll('[data-style]'))
 bindClassicPress(b,()=>switchStyle(b.dataset.style));
function updateLocation(){
 const building=occupantBuilding(player.x,player.z);
 const id=building?.id||null;
 if(id!==lastInside){lastInside=id;village.updateCutaway(id);}
 $('classic-location').textContent=building
  ?building.kind==='bank'?'Oakrest Bank':building.kind==='store'?'General Store':
   building.kind==='forester'?'Forester Lodge':building.kind==='trade'?'Trade Hall':building.id.replace(/-/g,' ')
  :player.z>210?(DUNGEON_ROOMS.find(r=>player.z>=r.minZ&&player.z<=r.maxZ)?.name||'Warden’s Hollow'):player.z>80?([...ADVENTURE_REGIONS].sort((a,b)=>Math.hypot(player.x-a.x,player.z-a.z)-Math.hypot(player.x-b.x,player.z-b.z))[0].name):'Oakrest Village';
 const areaDescription=$('classic-area-description');
 if(areaDescription)areaDescription.textContent=building
  ?'Inside the village · Visit services and explore.'
  :player.z>210?'The depths beyond the village walls.'
  :player.z>80?'Beyond Oakrest · Explore the frontier.'
  :'A home for adventurers, traders and new arrivals.';
 $('classic-inside').textContent=building?'You are indoors; the roof has lifted.'
  :'Follow the lane to an open doorway to explore building interiors.';
}
function resize(){
 // The world has its own rectangle; using window dimensions distorts picking
 // and stretches character sprites once the menu is outside the viewport.
 const width=Math.max(1,root.clientWidth),height=Math.max(1,root.clientHeight);
 const aspect=width/height,half=CLASSIC_CAMERA.viewHeight/2/zoom;
 camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;
 camera.updateProjectionMatrix();
 basePixelRatio=classicPixelRatio(width,height,devicePixelRatio);
 drawRatio=classicAdaptiveRatio(basePixelRatio,frameBudget.scale);
 renderer.setPixelRatio(drawRatio);renderer.setSize(width,height,false);
}
function setZoom(n){zoom=clamp(n,CLASSIC_CAMERA.minZoom,CLASSIC_CAMERA.maxZoom);resize();}
$('classic-zoom-in').addEventListener('click',()=>setZoom(zoom+.12));
$('classic-zoom-out').addEventListener('click',()=>setZoom(zoom-.12));
for(const button of document.querySelectorAll('[data-camera-turn]'))
 button.addEventListener('click',()=>orbitCamera.nudge(button.dataset.cameraTurn));
$('classic-camera-reset').addEventListener('click',()=>orbitCamera.reset());
root.addEventListener('wheel',e=>{e.preventDefault();setZoom(zoom+(e.deltaY<0?.08:-.08));},{passive:false});
addEventListener('resize',resize);
if(typeof ResizeObserver!=='undefined')new ResizeObserver(resize).observe(root);
resize();
function screenRay(clientX,clientY){
 const box=renderer.domElement.getBoundingClientRect();
 const x=(clientX-box.left)/box.width*2-1;
 const y=1-(clientY-box.top)/box.height*2;
 raycaster.setFromCamera(new THREE.Vector2(x,y),camera);
}
function destinationAt(clientX,clientY){
 screenRay(clientX,clientY);
 const hit=new THREE.Vector3();
 return raycaster.ray.intersectPlane(groundPlane,hit)?{x:hit.x,z:hit.z}:null;
}
function selectedFromRay(clientX,clientY){
 screenRay(clientX,clientY);
 const npcHit=raycaster.intersectObjects(npcActors.map(n=>n.actor.sprite),false)[0];
 if(npcHit){
  const npc=npcActors.find(n=>n.actor.sprite===npcHit.object);
  if(npc)return findClassicInteractable(npc.targetId);
 }
 const worldHits=raycaster.intersectObjects(selectableWorld,true);
 for(const hit of worldHits){
  let obj=hit.object;
  while(obj&&!obj.userData.interactId)obj=obj.parent;
  const target=obj&&findClassicInteractable(obj.userData.interactId);
  if(target)return target;
 }
 return null;
}
function placeMark(x,z){
 pointerMark.position.set(x,.08,z);pointerMark.visible=true;markerTime=0;
}
function chooseInteraction(target){
 if(!target)return false;
 disengageFromCombat();
 dialogue.hidden=true;pendingDrop=null;selectedTarget=target;
 placeMark(target.x,target.z);
 const result=navigation.interactWith(player,target);
 if(result.interaction){showInteraction(result.interaction);selectedTarget=null;return true;}
 if(!result.ok){feedback(result.reason);selectedTarget=null;return false;}
 feedback('Approaching '+target.name+'…');
 return true;
}
function disengageFromCombat(){
 const wasFighting=!!combat.getState().targetId;
 combatPursuitId=null;
 combatMovementIntent.reset();
 combat.stopTarget('player-movement');
 return wasFighting;
}
let pursuitRouteAt=0,pursuitPosition=null;
function chaseSelectedEnemy(){
 const state=combat.getState();
 if(!combatPursuitId||state.targetId!==combatPursuitId){combatPursuitId=null;return;}
 const enemy=state.target;
 if(!enemy){combatPursuitId=null;return;}
 if(combat.canAttackFrom(player,enemy.id)){navigation.stop();return;}
 if(navigation.state().waypoints.length&&(state.time<pursuitRouteAt||
  pursuitPosition&&Math.hypot(enemy.x-pursuitPosition.x,enemy.z-pursuitPosition.z)<.75))return;
 pursuitRouteAt=state.time+.6;pursuitPosition={x:enemy.x,z:enemy.z};
 const path=navigation.interactWith(player,{...enemy,kind:'combat',reach:state.reach,
  canComplete:position=>combat.canAttackFrom(position,enemy.id)});
 if(!path.ok){
  combatPursuitId=null;combat.stopTarget('unreachable');
  feedback('Cannot reach that creature. Choose another approach.');
 }
}

function chooseEnemy(id){
 const result=combat.chooseTarget(id,player);
 combatMovementIntent.reset();
 if(result){
  navigation.stop();selectedTarget=null;pendingDrop=null;pointerMark.visible=false;windowUi?.hide();
  combatPursuitId=id;
  chaseSelectedEnemy();
  const e=combat.getState().monsters.find(m=>m.id===id);
  if(combat.getState().targetId===id)feedback('Attacking '+e.name+' · Short steps reposition; retreat to escape.');
 }else feedback('Creature too far away or behind an obstacle.');
 return result;
}
function queueDestination(point){
 if(!point)return;
 // Nearby taps are tactical footwork; longer moves are explicit retreats.
 const target=closestClickedInteractable(point);
 if(target){chooseInteraction(target);return;}
 pendingDrop=null;selectedTarget=null;windowUi?.hide();
 const engaged=!!combat.getState().targetId;
 const escape=breaksPlayerAttackIntent({kind:'path'},{
  player,target:combat.getState().target,destination:point});
 // Even an unreachable manual destination must cancel autonomous pursuit.
 // A clear escape order breaks attacks whether the suggested route is valid.
 combatPursuitId=null;combatMovementIntent.reset();
 if(escape)disengageFromCombat();
 const result=navigation.moveTo(player,point);
 if(!result.ok){
  pointerMark.visible=false;
  feedback(result.reason+(escape?' Find another escape route.':''));
  return;
 }
 placeMark(point.x,point.z);
 feedback(result.arrived?'You are here.':escape?'Escaping the fight — enemies may still chase.':
  engaged?'Repositioning — target retained.':'Walking to destination…');
}
const canvasInput=installClassicCanvasInput(renderer.domElement,{
 orbit:(yaw,pitch)=>orbitCamera.turn(yaw,pitch),zoom:setZoom,currentZoom:()=>zoom,
 tap:(clientX,clientY)=>{
 screenRay(clientX,clientY);
 const lootObjects=groundView.hitObjects();
 const lootHits=raycaster.intersectObjects(lootObjects.map(o=>o.object),false);
 const drop=lootHits[0]&&lootObjects.find(x=>x.object===lootHits[0].object);
 if(drop){chooseLoot(drop.id);return;}
 const hit=raycaster.intersectObjects(combatView.hitObjects().map(o=>o.object),false)[0];
 const monster=hit&&combatView.hitObjects().find(o=>o.object===hit.object);
 if(monster){chooseEnemy(monster.id);return;}
 const target=selectedFromRay(clientX,clientY);
 if(target)chooseInteraction(target);
 else queueDestination(destinationAt(clientX,clientY));
 }
});
const joy=$('classic-joystick'),stick=$('classic-stick');
let joystickId=null;
function updateStick(clientX,clientY){
 const box=joy.getBoundingClientRect(),cx=box.left+box.width/2,cy=box.top+box.height/2;
 const dx=clientX-cx,dy=clientY-cy,len=Math.hypot(dx,dy),radius=box.width*.36;
 const ux=dx/Math.max(1,len),uy=dy/Math.max(1,len),amount=clamp(len/radius,0,1);
 input.x=ux*amount;input.z=uy*amount;
 stick.style.transform=`translate(${ux*Math.min(radius,len)}px,${uy*Math.min(radius,len)}px)`;
}
joy.addEventListener('pointerdown',e=>{
 if(joystickId!==null&&joystickId!==e.pointerId)return;
 e.preventDefault();joystickId=e.pointerId;joy.setPointerCapture(e.pointerId);
 // A joystick touch alone is not fleeing. Physical movement decides.
  combatPursuitId=null;combatMovementIntent.reset();
  navigation.stop();updateStick(e.clientX,e.clientY);
 selectedTarget=null;pointerMark.visible=false;
});
joy.addEventListener('pointermove',e=>{if(e.pointerId===joystickId)updateStick(e.clientX,e.clientY);});
function releaseJoy(e){
 if(e.pointerId===joystickId){joystickId=null;input.x=0;input.z=0;stick.style.transform='';}
}
joy.addEventListener('pointerup',releaseJoy);joy.addEventListener('pointercancel',releaseJoy);joy.addEventListener('lostpointercapture',releaseJoy);
let pendingDrop=null;
function pickUp(id){
 const item=id||combat.nearestLoot(player)?.id;
 if(!item){feedback('No loot within reach.');return false;}
 const result=combat.pickup(player,item);
 feedback(result.reason);
 if(result.ok){
  pendingDrop=null;
  itemUi?.render();refreshHud();markProgress();
 }
 return result.ok;
}
function chooseLoot(id){
 disengageFromCombat();navigation.stop();pendingDrop=null;selectedTarget=null;pointerMark.visible=false;
 const drop=combat.getState().groundLoot.find(item=>item.id===id);
 if(!drop)return;
 if(Math.hypot(player.x-drop.x,player.z-drop.z)<=3.2){pickUp(id);return;}
 pendingDrop=id;
 const route=navigation.moveTo(player,{x:drop.x,z:drop.z});
 if(!route.ok){feedback(route.reason);pendingDrop=null;}
 else feedback('Approaching dropped item…');
}
$('classic-pickup').addEventListener('click',()=>pickUp());
$('classic-inventory-toggle').addEventListener('click',()=>windowUi.open('inventory'));
$('classic-equipment-toggle').addEventListener('click',()=>windowUi.open('equipment'));
$('classic-abilities-toggle').addEventListener('click',()=>windowUi.open('abilities'));
$('classic-skills-toggle').addEventListener('click',()=>skillsUi?.open());
$('classic-skills-close').addEventListener('click',()=>windowUi.hide());
$('classic-map-toggle').addEventListener('click',()=>windowUi.open('map'));
$('classic-minimap-expand').addEventListener('click',()=>windowUi.open('map'));
$('classic-settings-toggle').addEventListener('click',()=>windowUi.open('settings'));
$('classic-social-toggle').addEventListener('click',()=>windowUi.open('social'));
$('classic-social-close').addEventListener('click',()=>windowUi.hide());
$('classic-save-indicator').addEventListener('click',()=>windowUi.open('settings'));
$('classic-map-close').addEventListener('click',()=>windowUi.hide());
$('classic-quests-close').addEventListener('click',()=>windowUi.hide());
$('classic-quests-toggle').addEventListener('click',()=>adventureUi?.showJournal());
$('classic-settings-close').addEventListener('click',()=>windowUi.hide());
$('classic-audio-enabled').checked=audio.enabled;
$('classic-audio-volume').value=audio.volume;
$('classic-audio-enabled').addEventListener('change',e=>{audio.setEnabled(e.target.checked);audio.unlock();});
$('classic-audio-volume').addEventListener('input',e=>{audio.setVolume(e.target.value);audio.unlock();});
$('classic-map-zoom-in').addEventListener('click',()=>minimap.setZoom(minimap.zoom()+.55));
$('classic-map-zoom-out').addEventListener('click',()=>minimap.setZoom(minimap.zoom()-.55));
function toggleAttack(){
 // The button is attack/retarget only; it is no longer a sticky lock/unlock switch.
 const state=combat.getState();
 const enemy=state.monsters.filter(m=>!m.dead&&!m.hidden&&!m.retreating&&m.hp>0)
  .sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z))
  .find(m=>Math.hypot(m.x-player.x,m.z-player.z)<29);
 if(enemy)chooseEnemy(enemy.id);
 else feedback('Tap a nearby creature to attack. Walking always cancels combat.');
}
function useCombatAbility(index){
 const ability=combat.getState().abilities[index];
 if(!ability){feedback('Ability slot locked or empty.');return false;}
 if(!combat.queueAbility(index,player)){feedback(combat.getState().lastFailure);return false;}
 feedback(ability.name+(combat.getState().queuedAbility?' queued.':' preparing.'));return true;
}
function triggerDodge(){
 if(!combat.dodge())return;
 // Defensive repositioning preserves the target without automatic pursuit.
 combatPursuitId=null;combatMovementIntent.reset();
 const keysDir=axesFromKeys(),length=Math.hypot(keysDir.x,keysDir.z);
 dodgeTravel={direction:length>.15?{x:keysDir.x/length,z:keysDir.z/length}:look,remaining:.32};
 navigation.stop();feedback('Dodged!');
}
function combatEvents(events){
 if(!events.length)return;
 const visualState=combat.getState();
 for(const event of events){
  damageFeedback.event(event,visualState,player);
  impactEffects.onEvent(event,visualState,player);
  if(event.type==='hurt')playerHurtUntil=Math.max(playerHurtUntil,event.time+.23);
  if(event.type==='hit'&&!event.periodic)audio.play(event.style==='magic'?'spell-impact':event.style==='ranged'?'arrow-impact':'hit',event.family==='greatsword'||event.family==='axe');
  if(event.type==='hurt'&&event.guarded)audio.play('guard');
  if(event.type==='evade')audio.play('dodge');
  if(event.type==='release')audio.playAbility(event.style,event.kind,event.family,event.effect);
  if(['hurt','warning','pickup','dead','dash'].includes(event.type))audio.play(({pickup:'loot',dead:'death',dash:'dodge'})[event.type]||event.type);
  if(['xp','ground-loot','item','pickup'].includes(event.type))markProgress();
  if(event.type==='style'){style=event.style;refreshHud();}
  else if(event.type==='release'&&event.name)feedback(event.name+' released.');
  else if(event.type==='hit')chat.record(event.style.toUpperCase()+' hit · '+event.damage+' damage','Game');
  else if(event.type==='miss')feedback('Miss');
  else if(event.type==='defeated')feedback(event.name+' defeated');
  else if(event.type==='adventure'){markProgress();itemUi?.render();refreshHud();if(!event.reason.startsWith('Used '))feedback(event.reason);}
  else if(event.type==='action-cancelled')feedback((event.name?event.name+' cancelled: ':'')+event.reason);
  else if(event.type==='adventure-notice')feedback(event.reason);
  else if(event.type==='xp'){
   refreshHud();$('classic-session-xp').textContent='Session XP +'+event.amount+' ('+event.style+')';
  }else if(event.type==='warning')feedback('Enemy attack incoming — MOVE or DODGE!');
  else if(event.type==='hurt')feedback('You took '+event.damage+' damage');
  else if(event.type==='dead'){
   navigation.stop();dodgeTravel=null;feedback('Defeated — respawning in Oakrest');
  }else if(event.type==='revive'){
   windowUi.hide();
   player.x=0;player.z=39;navigation.stop();feedback('Respawned in Oakrest');
  }else if(event.type==='heal')feedback('Healed '+event.amount+' HP');
  else if(event.type==='dash'){
   const moved=slideMove(player,look.x*event.distance,look.z*event.distance);
   if(combat.adventureCanPass(moved.z)){player.x=moved.x;player.z=moved.z;}
  }
 }
}
function updateCombatUi(snapshot){
 $('classic-health-label').textContent=snapshot.hp+' / '+snapshot.maxHp+' HP';
 $('classic-health-fill').style.width=(100*snapshot.hp/Math.max(1,snapshot.maxHp))+'%';
 const target=snapshot.target;
 $('classic-combat-target').hidden=!target;
 $('classic-target-name').textContent=target?target.name+(target.weak?' · weak to '+target.weak:''):'No monster selected';
 $('classic-target-level').textContent=target?'Lv '+target.level:'';
 $('classic-target-health').style.width=target?(100*target.hp/target.maxHp)+'%':'0%';
 actionbar.update(snapshot,false);
}
function updateContextActions(){
 const interaction=nearbyClassicInteraction(player),drop=combat.nearestLoot(player);
 interactButton.hidden=!interaction;
 $('classic-pickup').hidden=!drop;
 $('classic-pickup').disabled=!drop;
 if(interaction)interactButton.title='Talk to '+interaction.name;
 if(drop)$('classic-pickup').title='Pick up nearby loot';
 $('classic-interact-button').parentNode.hidden=!interaction&&!drop;
}
function interactNearby(){
 const candidate=nearbyClassicInteraction(player);
 if(candidate){disengageFromCombat();navigation.stop();selectedTarget=null;showInteraction(candidate);}
 else feedback('Walk closer to a person, sign or training tree.');
}
interactButton.addEventListener('click',interactNearby);
document.addEventListener('keydown',e=>{
 if(characterUI?.isOpen()||['INPUT','SELECT','TEXTAREA'].includes(e.target?.tagName))return;
 if(e.target?.closest?.('button')&&['Enter',' '].includes(e.key))return;
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab','Space','Home'].includes(e.key))e.preventDefault();
 keys.add(e.key.toLowerCase());
 if(e.repeat)return;
 if(e.key==='Home')orbitCamera.reset();
 if(e.key==='Tab')switchStyle(STYLE_ORDER[(STYLE_ORDER.indexOf(style)+1)%3]);
 if(e.shiftKey&&['1','2','3'].includes(e.key))switchStyle(STYLE_ORDER[Number(e.key)-1]);
 else if(/^[1-8]$/.test(e.key))actionbar.activate(Number(e.key)-1);
 if(e.key.toLowerCase()==='t')interactNearby();
 if(e.key.toLowerCase()==='i')windowUi.open('inventory');
 if(e.key.toLowerCase()==='k')windowUi.open('equipment');
 if(e.key.toLowerCase()==='l')windowUi.open('abilities');
 if(e.key.toLowerCase()==='v')skillsUi?.open();
 if(e.key.toLowerCase()==='m')windowUi.open('map');
 if(e.key.toLowerCase()==='u')adventureUi.showJournal();
 if(e.key.toLowerCase()==='h'){const r=combat.adventureAction('eat',{},player);feedback(r.reason);if(r.ok)markProgress();}
 if(e.key.toLowerCase()==='g')pickUp();
 if(e.key.toLowerCase()==='j')toggleAttack();
 if(e.key==='Enter'){e.preventDefault();chat.focus();}
 if(e.code==='Space')triggerDodge();
 const bindings=['q','e','r','f'];
 if(bindings.includes(e.key.toLowerCase()))useCombatAbility(bindings.indexOf(e.key.toLowerCase()));
 if(e.key==='Escape'){disengageFromCombat();windowUi.hide();navigation.stop();selectedTarget=null;pendingDrop=null;pointerMark.visible=false;}
});
document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
function releaseAll(){
 simulationClock.resetRemainder();combat.pause();
 keys.clear();joystickId=null;canvasInput.reset();pendingDrop=null;input.x=0;input.z=0;navigation.stop();disengageFromCombat();selectedTarget=null;pointerMark.visible=false;
 stick.style.transform='';
}
addEventListener('blur',releaseAll);
document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseAll();});
function axesFromKeys(){
 // Arrows orbit/tilt the camera exclusively; only WASD / touch joystick move.
 // Sample the SAME live basis used by the camera and rotating corner minimap.
 const {right,up}=classicScreenBasis(orbitCamera.offset());
 const h=Number(keys.has('d'))-Number(keys.has('a'))+input.x;
 const v=Number(keys.has('w'))-Number(keys.has('s'))-input.z;
 return {x:right.x*h+up.x*v,z:right.z*h+up.z*v};
}
function moveGame(dt){
 const previous={...player};
 const update=navigation.step(player,axesFromKeys(),dt);
 if(update.kind==='manual'){
  // Manual input overrides any pursuit. Only sustained outward movement
  // abandons the target; a short step or circle strafe keeps combat.
  combatPursuitId=null;
  const retreat=combatMovementIntent.step({movement:update,start:previous,
   end:update.position,target:combat.getState().target});
  if(retreat){
   pendingDrop=null;
   if(disengageFromCombat())feedback('Escaping the fight — enemies may still chase.');
  }
 }else combatMovementIntent.reset();
 if(!combat.adventureCanPass(update.position.z)&&update.position.z>210){navigation.stop();feedback('Restore this chamber’s ward before proceeding.');}
 else {player.x=update.position.x;player.z=update.position.z;}
 if(update.heading){look=update.heading;walkClock+=dt;}
 else walkClock=0;
 if(update.interaction){
  if(update.interaction.kind!=='combat')showInteraction(update.interaction);selectedTarget=null;pointerMark.visible=false;
 }else if(update.failed){
  feedback(update.failed);selectedTarget=null;pointerMark.visible=false;
 }else if(update.kind==='manual'&&selectedTarget){
  selectedTarget=null;pointerMark.visible=false;
  feedback('Manual movement — tap a person or object to interact.');
 }
 if(pointerMark.visible&&update.kind==='path'&&update.remaining===0){
  pointerMark.visible=false;feedback('Destination reached.');
 }
 hero.sprite.position.set(player.x,.08,player.z);
 heroShadow.position.set(player.x,.04,player.z);
 // Hero sprite is drawn once in draw(), not twice per frame.
 if(pendingDrop){
  const item=combat.getState().groundLoot.find(x=>x.id===pendingDrop);
  if(!item||Math.hypot(player.x-item.x,player.z-item.z)<=3.2)pickUp(pendingDrop);
  else if(!navigation.state().waypoints.length&&update.kind==='idle'){feedback('Cannot reach dropped item.');pendingDrop=null;}
 }
 updateLocation();
 return {...update,movedDistance:Math.hypot(player.x-previous.x,player.z-previous.z)};
}
const simulationClock=createClassicSimulationClock();
let nextBookRefresh=0;
let lastMovement={kind:'idle',movedDistance:0};
function draw(dt,render=true){
 if(characterUI?.isOpen())return;
 simulationClock.advance(dt,step=>drawStep(step,false));
 if(render)drawStep(0,true);
}
function drawStep(dt,render=true){
 if(characterUI?.isOpen())return; // Do not move or fight behind character selection.
 if(dt>0){
 orbitCamera.step(keys,dt);
 lastMovement=moveGame(dt);
 // Stop approaching as soon as the monster is actually in weapon range:
 // don't walk through its sprite or past it to an old path waypoint.
 if(combatPursuitId){
  const engaging=combat.getState(),enemy=engaging.target;
  if(enemy&&engaging.targetId===combatPursuitId&&
   combat.canAttackFrom(player,enemy.id))
   navigation.stop();
 }
 if(dodgeTravel&&dt>0){
  const slice=Math.min(dt,dodgeTravel.remaining),direction=dodgeTravel.direction;
  const moved=slideMove(player,direction.x*slice*12.5,direction.z*slice*12.5);
  if(combat.adventureCanPass(moved.z)){player.x=moved.x;player.z=moved.z;}
  dodgeTravel.remaining-=slice;if(dodgeTravel.remaining<=0)dodgeTravel=null;
 }
 // Follow only the original attack click until movement overrides it.
 // Repositioning keeps the target but never restarts automatic pursuit.
 chaseSelectedEnemy();
 const events=combat.tick(dt,player);
 combatEvents(events);
 if(needsSave&&saveManager.status().enabled&&combat.getState().time-lastSavedAt>=2)saveNow();
 }
 if(dt===0)combatEvents(combat.tick(0,player));
 const movement=lastMovement,cameraOffset=orbitCamera.offset();
 const state=combat.getState();
 if(state.action&&state.target&&!movement.moved){
  const dx=state.target.x-player.x,dz=state.target.z-player.z,d=Math.hypot(dx,dz);
  if(d>.001)look={x:dx/d,z:dz/d};
 }
 const adventureState=combat.adventureState();
 // Accelerated QA executes all movement, combat, rewards and guarded saves,
 // then presents its final frame. Do not flood Canvas/WebGL with intermediate
 // minimap and sprite uploads that cannot be displayed.
 if(!render)return;
 updateLocation();
 adventureWorld.update(adventureState,player,cameraOffset,state.time);
 village.update(state.time);
 for(const npc of npcActors)npc.beacon?.update(adventureState,state.time);
 // UI refresh is bounded; input, combat and world rendering remain at 60 Hz.
 if(state.time>=nextBookRefresh){
  adventureUi?.tick();skillsUi?.tick();itemUi?.tick();
  fieldNotes.update({name:existing.profile?.name,xp:state.progression,saved:saveManager.status().enabled});
  nextBookRefresh=state.time+.12;
 }
 if(state.style!==style){style=state.style;refreshHud();}
 combatView.update(state,cameraOffset,player);abilityView.update(state,player);
 groundView.update(state.groundLoot,state.time);
 minimap.update({player,facing:look,destination:navigation.state().goal,cameraOffset,
  monsters:state.monsters,drops:state.groundLoot,objective:adventureUi?.objective(),
  questGivers:availableQuestGivers(adventureState,findClassicInteractable),adventure:adventureState},state.time);
 if(!$('classic-toasts').classList.contains('is-critical')&&state.time>=toastUntil)
  $('classic-toasts').classList.add('is-faded');
 updateContextActions();
 if(state.time>=nextTargetUi){updateCombatUi(state);nextTargetUi=state.time+.13;}
 hero.sprite.position.set(player.x,.08,player.z);
 heroShadow.position.set(player.x,.04,player.z);
 hero.update({facing:look,style,
  step:movement.movedDistance>.001?1+Math.floor(walkClock/.17)%2:0,
  pose:classicAttackPose(state.time,state.action,state.lastRelease),
  worn:savedWorn(),cameraOffset});
 // Local-only damage response; the character's actual position never moves.
 const heroRecoil=hitRecoilStrength(playerHurtUntil,state.time,.23);
 if(heroRecoil&&!reducedCombatMotion)hero.sprite.position.y+=heroRecoil*.16;
 hero.sprite.material.color.set(playerHurtUntil>state.time?'#ffc4b7':'#ffffff');
 for(const n of npcActors){
  const life=citizenRoutine(n,state.time,player);
  n.actor.sprite.position.set(life.x,.08,life.z);n.shadow.position.set(life.x,.04,life.z);
  n.actor.update({facing:life.facing,step:life.moving?1+Math.floor(state.time/.25)%2:0,style:'melee',cameraOffset});
 }
 if(pointerMark.visible){
  markerTime+=dt;pointerMark.material.opacity=.55+.25*Math.sin(markerTime*4);
  pointerMark.scale.setScalar(1+.1*Math.sin(markerTime*4));
 }
 // Keep real camera, movement basis and minimap synchronised each frame.
 // Smooth orbit comes from frame-rate-independent angular velocity, not a
 // following lag that could invert navigation while the view is catching up.
 camera.position.set(player.x+cameraOffset.x,cameraOffset.y,player.z+cameraOffset.z);
 camera.lookAt(player.x,0,player.z);
 camera.updateMatrixWorld();damageFeedback.update(state.time,camera);
 impactEffects.update(state.time,camera);
 audio.cityAmbience(state.time,player.z<80);
 if(render)renderer.render(scene,camera);
}
let last=performance.now(),qaPaused=false;
function tick(time){
 requestAnimationFrame(tick);
 if(document.hidden||qaPaused){last=time;frameBudget.reset();return;}
 const frameMs=Math.max(0,time-last),dt=frameMs/1000;last=time;
 if(frameBudget.sample(frameMs)){
  const ratio=classicAdaptiveRatio(basePixelRatio,frameBudget.scale);
  if(Math.abs(ratio-drawRatio)>.015){
   drawRatio=ratio;renderer.setPixelRatio(ratio);
   renderer.setSize(Math.max(1,root.clientWidth),Math.max(1,root.clientHeight),false);
  }
 }
 draw(dt);
}
itemUi=setupClassicItems({
 combat,player:()=>player,style:()=>style,notify:feedback,
 changed:next=>{
  if(STYLE_ORDER.includes(next))switchStyle(next);
  else markProgress();
  refreshHud();
 },
 onOpen:tab=>windowUi?.adopt(tab),
 onClose:()=>{if(['inventory','equipment','abilities','bank','shop'].includes(windowUi?.current()))windowUi.adopt(null);}
});
bindClassicItemDrag($('classic-app'),payload=>{
 if(payload.toScope==='quick'){actionbar.assign(payload.toIndex,payload.fromScope==='quick'?payload.binding:payload.canonical);return;}
 if(payload.fromScope==='quick'){feedback('Drag quick actions to another quick slot, or clear them with Arrange.');return;}
 itemUi.drop(payload);
});
windowUi=createClassicWindowController({items:itemUi,map:$('classic-map-window'),
 settings:$('classic-settings-window'),dialogue,minimap,quests:$('classic-quests-window'),skills:$('classic-skills-window'),social:$('classic-social-window')});
skillsUi=setupClassicSkills({combat,windowUi});
adventureUi=setupAdventureUI({combat,player:()=>player,windowUi,notify:feedback,findTarget:findClassicInteractable,
 changed:()=>{if(!sessionMutated&&existing.profile&&!saveManager.status().enabled)saveManager.enable();markProgress();refreshHud();itemUi?.render();},
 teleport:p=>{disengageFromCombat();player.x=p.x;player.z=p.z;navigation.stop();dodgeTravel=null;selectedTarget=null;}});
// The old standalone ration button is superseded by slot 5, but remains
// wired for compatibility with the adventure test hooks.
$('classic-settings-window').append($('adventure-eat'));
$('adventure-eat').hidden=true;
if(existing.profile&&existing.save.adventure?.autoSave){saveManager.enable();showSaveState();}
characterUI=setupClassicCharacterUI({storage:localStorage,pathname:location.pathname,
 onOpen:()=>{windowUi.hide();releaseAll();combat.reset();},
 beforeSwitch:()=>{
  if(needsSave&&saveManager.status().enabled&&!saveNow())return false;
  return !sessionMutated||saveManager.status().enabled||
   confirm('Unsaved practice changes will be lost when changing characters. Continue?');
 }
});
$('classic-characters-open').addEventListener('click',()=>characterUI.show());
// Inventory is the default right-hand book, as in the approved MMORPG layout.
windowUi.open('inventory');
feedback(lastStatus);refreshHud();updateLocation();updateCombatUi(combat.getState());
showSaveState();updateContextActions();
minimap.update({player,facing:look,cameraOffset:orbitCamera.offset(),
 monsters:combat.getState().monsters,drops:combat.getState().groundLoot,
 questGivers:availableQuestGivers(combat.adventureState(),findClassicInteractable),
 adventure:combat.adventureState()},0,true);
// The original 3D homepage can seed oakrest-dev-v1 before a new visitor
// clicks "Play Classic". Offer the Classic character chooser on that one
// explicit transition rather than silently dropping them into practice mode.
// Consume the marker so an intentional "Original Adventurer" selection works.
const cameFromDevLauncher=(()=>{
 try{
  const value=sessionStorage.getItem('oakrest-dev-classic-from-home')==='1';
  sessionStorage.removeItem('oakrest-dev-classic-from-home');
  return value;
 }catch{return false;}
})();
if(!existing.profile&&(!existing.existing||cameFromDevLauncher))characterUI.show();
addEventListener('pagehide',()=>{if(needsSave)saveNow();});
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){frameBudget.reset();simulationClock.resetRemainder();if(needsSave)saveNow();}
});
const initialCameraOffset=orbitCamera.offset();
camera.position.set(player.x+initialCameraOffset.x,initialCameraOffset.y,player.z+initialCameraOffset.z);
camera.lookAt(player.x,0,player.z);
requestAnimationFrame(tick);
const isQa=new URLSearchParams(location.search).has('qa')&&
 (['localhost','127.0.0.1'].includes(location.hostname)||/^\/oakrest-dev(?:\/|$)/.test(location.pathname));
if(isQa)window.oakrestClassicQA={
 pauseAutomaticLoop:(paused=true)=>{qaPaused=!!paused;last=performance.now();},
 worldLife:()=>npcActors.map(n=>({id:n.id,x:n.actor.sprite.position.x,z:n.actor.sprite.position.z})),
 renderStats:()=>({batching:village.batching,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries,pixelRatio:renderer.getPixelRatio(),qualityScale:frameBudget.scale,qualityChanges:frameBudget.changes,width:renderer.domElement.width,height:renderer.domElement.height}),
 state:()=>({x:player.x,z:player.z,style,interior:occupantBuilding(player.x,player.z)?.id||null,
  pathLength:navigation.state().waypoints.length,hasSavedProfile:existing.existing,
  npcCount:npcActors.length,roofHidden:!!occupantBuilding(player.x,player.z)&&
   village.roofs.find(x=>x.id===occupantBuilding(player.x,player.z)?.id)?.roofs.visible===false,
  combatLevel:presentationSnapshot(combat.sandboxSave(),style,player).combatLevel,
  selected:selectedTarget?.id||null,lastInteraction,status:lastStatus}),
 step:dt=>draw(clamp(dt,0,1)),moveTo:(x,z)=>queueDestination({x,z}),switchStyle,
 // Accelerated transaction checks still run every gameplay/UI tick, but submit
 // only their final frame to WebGL instead of flooding a software GPU queue.
 advance:seconds=>{let remaining=clamp(Number(seconds)||0,0,120);while(remaining>0){const dt=Math.min(.1,remaining);draw(dt,false);remaining-=dt;}draw(0);},
 selectTarget:id=>chooseInteraction(findClassicInteractable(id)),
 interactNow:interactNearby,
 teleport:(x,z)=>{if(!Number.isFinite(x)||!Number.isFinite(z))return;player.x=x;player.z=z;
  navigation.stop();disengageFromCombat();dodgeTravel=null;selectedTarget=null;draw(0);},
 projectWorld:(x,z)=>{
  // QA may query the projection before the first requestAnimationFrame.
  // Ensure the saved/test character overlay cannot leave matrices stale.
  camera.updateMatrixWorld(true);
  const p=new THREE.Vector3(x,0,z).project(camera);
  return {x:p.x,y:-p.y};
 },
 navigationState:()=>navigation.state(),
 combatState:()=>combat.getState(),impactState:()=>({active:impactEffects.active(),heroTint:hero.sprite.material.color.getHexString()}),lockMonster:id=>chooseEnemy(id),
 combatPresentation:()=>({heroPose:hero.sprite.userData.pose,ability:abilityView.stats(),...combatView.stats()}),
 minimapState:()=>({position:minimap.coordinates(),zoom:minimap.zoom(),features:minimap.features(),cameraOffset:orbitCamera.offset()}),
 cameraState:()=>({...orbitCamera.state(),zoom}),cameraKeys:()=>[...keys],cameraNudge:key=>{orbitCamera.nudge(key);draw(0);},
 resetCamera:()=>{orbitCamera.reset();draw(0);},
 openWindow:name=>name==='skills'?skillsUi.open():windowUi.open(name),windowState:()=>windowUi.current(),
 itemState:()=>combat.itemSnapshot(style),itemAction:action=>{
  const result=combat.itemAction(action,player);if(result.ok){refreshHud();itemUi.render();markProgress();}return result;
 },pickupDrop:id=>pickUp(id),openItemMenu:tab=>windowUi.open(tab),
 useAbility:index=>useCombatAbility(index),attack:toggleAttack,dodge:triggerDodge,
 savedState:()=>JSON.stringify(existing.save),
 saveStatus:()=>saveManager.status(),enableSaving:()=>{if(sessionMutated)return {ok:false};const r=saveManager.enable();showSaveState(r.reason);return r;},
 saveNow,persistentSnapshot:()=>combat.persistentSave(),
  characterCreatorState:()=>({open:characterUI.isOpen(),appearance:existing.profile||null}),
  openCharacterCreator:()=>characterUI.show(),
  chatState:()=>({channel:chat.active(),entries:chat.entries()}),
  hotbarState:()=>({slots:actionbar.slots(),style:combat.getState().style}),
  hotbarUse:index=>actionbar.activate(index),
  wornVisual:()=>savedWorn(),
  adventureState:()=>combat.adventureState(),
  questBeacons:()=>[...npcActors.filter(n=>n.targetId).map(n=>({id:n.targetId,visible:n.beacon?.sprite.visible||false})),
   ...availableQuestGivers(combat.adventureState(),findClassicInteractable)],
  adventureAction:(kind,id,choice)=>{const r=combat.adventureAction(kind,{target:findClassicInteractable(id),choice},player);if(r.ok){if(r.teleport){player.x=r.teleport.x;player.z=r.teleport.z;navigation.stop();}markProgress();refreshHud();}return r;},
  heroPixelSignature:()=>{
   const image=hero.sprite.material.map?.image;
   if(!image)return null;
   const ctx=image.getContext('2d'),bytes=ctx.getImageData(0,0,image.width,image.height).data;
   let hash=2166136261;
   for(let i=0;i<bytes.length;i++)hash=Math.imul(hash^bytes[i],16777619);
   return hash>>>0;
  }
};
