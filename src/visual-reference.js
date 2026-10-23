/** Dedicated review page. No main.js, combat simulation or save access. */
import * as THREE from 'three';
import {createActor,equipActor,applyCharacterAppearance,createCreature,animateCreature,animateActor} from './actors.js';
import {animateFoundation} from './foundation-motion.js';
import {applyVisibleEquipment} from './character-equipment-art.js';
import {WEAPON_PROFILES,validateHumanoidRig,HUMANOID_RIG_VERSION} from './rig-contract.js';
import {listAnimationSpecs} from './ability-animation.js';
import {LOADOUTS} from './rules.js';
import {buildHouse,OAKREST_BUILDINGS} from './town-world.js';
import {terrainHeight} from './terrain.js';
import {treeModel} from './environment.js';
import {upgradeHeldWeapon,invalidateHeldWeapon} from './model-assets.js';
import {modelNameForItem} from './item-model-registry.js';
import {weaponMuzzle} from './weapon-handling.js';
import {summarizeFrameTimes} from './frame-statistics.js';
const allowed=['localhost','127.0.0.1'].includes(location.hostname)||/^\/oakrest-dev(?:\/|$)/.test(location.pathname);
if(!allowed){document.querySelector('main').textContent='The foundation room is available on the development site only.';throw new Error('Development-only reference scene');}
const $=id=>document.getElementById(id),canvas=$('reference');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();scene.background=new THREE.Color('#a7b9ab');scene.fog=new THREE.Fog('#a7b9ab',25,65);
scene.add(new THREE.HemisphereLight('#e5eedc','#59654c',2));
const sun=new THREE.DirectionalLight('#fff0cc',3);sun.position.set(-6,12,-8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-16;sun.shadow.camera.right=16;sun.shadow.camera.top=16;sun.shadow.camera.bottom=-16;sun.shadow.normalBias=.03;scene.add(sun);
const ground=new THREE.Mesh(new THREE.CircleGeometry(30,64),new THREE.MeshStandardMaterial({color:'#7b8966',roughness:1}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;ground.position.y=-.04;scene.add(ground);
const path=new THREE.Mesh(new THREE.PlaneGeometry(5,24),new THREE.MeshStandardMaterial({color:'#b3a484',roughness:1}));path.rotation.x=-Math.PI/2;path.position.set(0,-.02,3);path.receiveShadow=true;scene.add(path);
const actor=createActor(false,{foundation:true}),legacyActor=createActor();scene.add(actor,legacyActor);legacyActor.visible=false;
const civilian=createActor(false,{foundation:true});equipActor(civilian,'melee','sword','none');civilian.userData.weapon.clear();civilian.userData.offhand.clear();civilian.userData.family='civilian';civilian.userData.cape.visible=false;applyCharacterAppearance(civilian,{outfitColor:'#9c7954',hairstyle:'swept',hairColor:'#564433'});civilian.position.set(-2.7,0,1.1);scene.add(civilian);
const creature=createCreature('boar');creature.position.set(3,0,1.5);creature.rotation.y=-.35;scene.add(creature);
const building={...OAKREST_BUILDINGS.find(b=>b.kind==='home'),id:'reference-house',x:0,z:9,face:'north'};
const buildingScene=new THREE.Group();scene.add(buildingScene);const house=buildHouse(buildingScene,building);buildingScene.position.y=-terrainHeight(0,9);
for(const [i,x,z,h] of [[1,-7,5,1.25],[2,8,8,1.3],[3,-10,13,1.6]])scene.add(treeModel(x,z,h,i));
const camera=new THREE.PerspectiveCamera(38,1,.05,100);
const views={hands:[1.4,1.8,-2.1,.10,1.45,-.25],fallen:[3.8,3,-5.5,0,.4,0],character:[4,2.9,-6.5,0,1.25,0],side:[5,2,-1,0,1.35,0],rear:[3,2.6,6,0,1.3,0],ensemble:[12,9,-18,0,2,5],interior:[8,8,1,0,1.8,9]};
const specs=listAnimationSpecs();let family='sword',action='idle',selected=null,t=0,paused=false,last=performance.now(),frames=[],elapsed=0,raf=0,disposed=false;
function option(el,value,label){const o=document.createElement('option');o.value=value;o.textContent=label;el.add(o);}
for(const name of Object.keys(WEAPON_PROFILES))option($('family'),name,({bow:'Longbow',frost:'Staff',ember:'Wand',daggers:'Twin daggers',woodaxe:'Woodcutting axe'})[name]||name[0].toUpperCase()+name.slice(1));
function selectFamily(){family=$('family').value;selected=null;$('ability').replaceChildren();option($('ability'),'','Use action above');for(const spec of specs.filter(s=>s.weaponFamily===family&&s.abilityId!=='basic'))option($('ability'),spec.id,spec.abilityName);equip();t=0;}
function equip(){for(const model of [actor,legacyActor]){invalidateHeldWeapon(model);model.userData.weapon.userData.assetLoaded=null;equipActor(model,WEAPON_PROFILES[family].style,family,'none');applyCharacterAppearance(model,{hairstyle:'swept',hairColor:'#47352a',outfitColor:'#4e7064'});applyVisibleEquipment(model,$('equipment').checked?'starter-mail':'none',$('equipment').checked?{legs:'recruit-greaves',boots:'recruit-boots',amulet:'recruit-amulet'}:{},'melee');if($('imported').checked)upgradeHeldWeapon(model,WEAPON_PROFILES[family].style,family==='woodaxe'?'bronze-axe':family);}}
function view(){const v=views[$('view').value];camera.position.set(...v.slice(0,3));camera.lookAt(...v.slice(3));$('shot-label').textContent=$('view').selectedOptions[0].textContent;const interior=$('view').value==='interior';house.roof.visible=!interior;for(const m of house.cutaway.front)m.visible=!interior;for(const m of house.cutaway.left)m.visible=!interior;}
function resize(){const r=canvas.parentElement.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}
function duration(){return selected?.recovery.seconds||LOADOUTS[WEAPON_PROFILES[family].style]?.[family]?.interval||1.18;}
function pose(sample=false,dt=1/60){
 const d=duration(),weapon=LOADOUTS[WEAPON_PROFILES[family].style]?.[family],cycle=t%d;
 const attacking=!!selected||action==='basic';
 const attack=attacking?{start:0,impactAt:selected?.anticipation.seconds??weapon?.windup??.35,interval:d,abilityKind:selected?.motionCue}:null;
 const moving=['walk','backward','left','right'].includes(action),turning=action==='turn';
 actor.rotation.y=legacyActor.rotation.y=turning?t*.7:0;
 const info={dt,t:cycle,deathElapsed:t,stride:t*(action==='run'?10:5),speed:action==='run'?4.7:moving?1.6:0,backwards:action==='backward',side:action==='left'?1:action==='right'?-1:0,turnRate:turning?.7:0,attack,combat:action==='ready'||attacking,hit:action==='hit',dead:action==='death',chopping:action==='work'?{start:0,period:1.18}:null,sample};
 animateFoundation(actor.userData,info);animateActor(legacyActor,info);
 animateFoundation(civilian.userData,{dt:1/60,t,combat:false,sample});animateCreature(creature,'boar',t,1/60,0,0,false,0);
 actor.visible=!$('legacy').checked;legacyActor.visible=$('legacy').checked;
 actor.updateMatrixWorld(true);
 const stats=summarizeFrameTimes(frames);
 $('readout').textContent=`${HUMANOID_RIG_VERSION}\n${actor.userData.animationState} / ${actor.userData.locomotion.stage} · ${family}\nGrip reach residual: ${(actor.userData.gripError*1000).toFixed(2)} mm\nFoot reach residual: ${(actor.userData.footError*1000).toFixed(2)} mm\n${selected?.tell||'Observe body weight, hand contact and recovery.'}\nFrame p95: ${stats.p95FrameMs?.toFixed(1)??'—'} ms · ${stats.sampleCount} samples (${stats.status})\n${renderer.info.render.calls} draw calls · ${renderer.info.render.triangles.toLocaleString()} triangles`;
 $('timeline').value=Math.round(cycle/d*1000);
}
function render(now){if(disposed)return;const rawDt=(now-last)/1000,dt=Math.min(.1,rawDt);last=now;if(!paused)t+=dt;elapsed+=rawDt;frames.push(rawDt*1000);if(frames.length>600)frames.shift();pose(paused,paused?0:dt);renderer.render(scene,camera);raf=requestAnimationFrame(render);}
$('family').onchange=selectFamily;$('action').onchange=()=>{action=$('action').value;selected=null;$('ability').value='';t=0;};$('ability').onchange=()=>{selected=specs.find(s=>s.id===$('ability').value&&s.weaponFamily===family)||null;t=0;};$('view').onchange=view;$('equipment').onchange=equip;$('imported').onchange=equip;
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'Play':'Pause';};$('reset').onclick=()=>{t=0;actor.userData.foundationPosed=false;};$('timeline').oninput=()=>{paused=true;$('pause').textContent='Play';t=Number($('timeline').value)/1000*duration();pose(true);};
const observer=new ResizeObserver(resize);observer.observe(canvas.parentElement);
window.oakrestVisualQA={select(name,state='basic',id=''){if(!WEAPON_PROFILES[name])throw Error('Unknown family');$('family').value=name;selectFamily();action=state;$('action').value=state;selected=specs.find(s=>s.id===id&&s.weaponFamily===name)||null;},sample(at,draw=true){paused=true;t=at;pose(true);if(draw)renderer.render(scene,camera);return this.snapshot();},snapshot(){return {family,assetLoaded:actor.userData.weapon.userData.assetLoaded||null,expectedAsset:modelNameForItem('weapon.'+WEAPON_PROFILES[family].style+'.'+(family==='woodaxe'?'bronze-axe':family)),state:actor.userData.animationState,locomotion:actor.userData.locomotion.stage,footError:actor.userData.footError,reaction:{...actor.userData.reaction},bodyGroundCorrection:actor.userData.bodyGroundCorrection,frameStatistics:summarizeFrameTimes(frames),rigErrors:validateHumanoidRig(actor),gripError:actor.userData.gripError,muzzle:weaponMuzzle(actor).toArray(),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,frames:[...frames],elapsed};},specs:()=>specs,view(name){$('view').value=name;view();},resume(){paused=false;frames=[];}};
function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);observer.disconnect();const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.forceContextLoss();}
addEventListener('pagehide',dispose,{once:true});selectFamily();view();resize();raf=requestAnimationFrame(render);
