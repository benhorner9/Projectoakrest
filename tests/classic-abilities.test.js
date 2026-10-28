import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createClassicCombat} from '../src/classic-combat.js';
import {defaultSave,LOADOUTS} from '../src/rules.js';
import {createClassicAbilityView} from '../src/classic-ability-view.js';
import {abilitySoundProfile} from '../src/ability-audio.js';
const near={x:-1,z:71.3},far={x:-1,z:66};
const dummy={id:'practice',type:'dummy',x:-1,z:73,maxHp:100000};
function kit(){
 const s=defaultSave();
 for(const style of ['melee','magic','ranged']){
  s.xp[style]=100000;s.inventory.weapons[style]=Object.keys(LOADOUTS[style]);
  for(const family of Object.keys(s.slots[style]))s.slots[style][family]=['w0','w1','w2','w3'];
 }
 s.inventory.materials={'field-arrows':100,'frost-scroll':100,'ember-scroll':100};return s;
}
function advance(g,p,seconds){const out=[];for(let i=0;i<Math.round(seconds*60);i++)out.push(...g.tick(1/60,p));return out;}
function game(style='melee',options={}){
 const g=createClassicCombat({save:kit(),adventure:true,random:()=>.2,monsterDefinitions:[dummy],...options});
 g.styleSwitch(style);advance(g,style==='melee'?near:far,.2);return g;
}
function cast(g,index=0,p=near){g.chooseTarget('practice',p);assert.equal(g.queueAbility(index,p),true);return g.getState();}

test('Heavy Slash commits one timed contact, heavy tell/audio and non-refundable cooldown',()=>{
 const g=game(),s=cast(g);assert.equal(s.action.name,'Heavy Slash');assert.equal(s.action.effect,'heavy-slash');
 assert.equal(s.action.until-s.action.startedAt,.31);assert.equal(s.abilities[0].cooldownEnd,5.2);
 assert.match(s.abilities[0].description,/No consumable cost/);
 assert.equal(advance(g,near,.3).filter(e=>e.type==='hit').length,0);
 const e=advance(g,near,1/60);assert.equal(e.filter(e=>e.type==='hit'&&e.abilityId==='w0').length,1);
 assert.equal(e.find(e=>e.type==='release').name,'Heavy Slash');
 assert.notDeepEqual(abilitySoundProfile('melee','hit','sword','heavy-slash'),abilitySoundProfile('melee','basic','sword'));
 g.stopTarget();assert.equal(g.queueAbility(0,near),false);assert.equal(g.getState().abilities[0].cooldownEnd,5.2);
});
test('Heavy Slash cancels on range loss, dodge or style switch without contact or cooldown refund',()=>{
 for(const cancel of ['range','dodge','style','retreat']){
  const g=game();cast(g);const deadline=g.getState().attackUntil;
  if(cancel==='dodge')g.dodge();if(cancel==='style')g.styleSwitch('magic');if(cancel==='retreat')g.stopTarget();
  const events=advance(g,cancel==='range'?far:near,.4);
  assert.equal(events.some(e=>e.type==='release'||e.type==='hit'),false,cancel);
  assert.ok(events.some(e=>e.type==='action-cancelled'&&e.name==='Heavy Slash'),cancel);
  assert.equal(g.getState().attackUntil,deadline);
 }
});
test('Heavy Slash tell faces the target, expires and disappears immediately when cancelled',()=>{
 const scene=new THREE.Scene(),view=createClassicAbilityView(scene,{reducedMotion:true}),g=game();cast(g);
 view.update(g.getState(),near);assert.equal(view.stats().phase,'prepare');
 const heading=new THREE.Vector3(0,1,0).applyQuaternion(scene.children[0].quaternion);
 assert.ok(heading.distanceTo(new THREE.Vector3(0,0,1))<1e-6);
 g.dodge();view.update(g.getState(),near);assert.equal(view.stats().visible,false);
 view.dispose();assert.equal(scene.children.length,0);
});
test('ability input rejects invalid positions without cooldown or supplies; queued identity is explicit',()=>{
 const g=game();assert.equal(g.queueAbility(3,{x:NaN,z:0}),false);assert.equal(g.getState().abilities[3].cooldownEnd,0);
 advance(g,near,.4);g.chooseTarget('practice',near);assert.ok(g.getState().action);
 g.queueAbility(0,near);assert.deepEqual(g.getState().queuedAbility,{id:'w0',index:0,name:'Heavy Slash'});
 g.itemAction({type:'ability',style:'melee',weapon:'sword',index:0,id:'w2'},near);
 assert.equal(g.getState().queuedAbility,null);
 assert.equal(advance(g,near,.4).some(e=>e.type==='release'),false);
 assert.deepEqual(g.persistentSave().slots.melee.sword,['w2','w1',null,'w3']);
});

test('Piercing Arrow spends one arrow at release, travels before contact and retains ranged source after switch',()=>{
 const g=game('ranged'),s=cast(g,0,far);
 assert.equal(s.action.effect,'piercing-arrow');assert.equal(s.action.until-s.action.startedAt,.45);
 assert.equal(s.abilities[0].supply.amount,1);assert.match(s.abilities[0].description,/at release/);
 assert.equal(g.persistentSave().inventory.materials['field-arrows'],100);
 const events=advance(g,far,.45);assert.equal(events.filter(e=>e.type==='projectile').length,1);
 assert.equal(events.filter(e=>e.type==='hit').length,0);
 assert.equal(g.persistentSave().inventory.materials['field-arrows'],99);
 assert.equal(g.getState().projectiles[0].effect,'piercing-arrow');
 g.stopTarget();g.styleSwitch('magic');
 const impact=advance(g,far,.5).filter(e=>e.type==='hit');
 assert.equal(impact.length,1);assert.equal(impact[0].style,'ranged');assert.equal(impact[0].abilityId,'w0');
 assert.equal(g.persistentSave().inventory.materials['field-arrows'],99);
});
test('Piercing Arrow cancellation and zero supply never create an arrow or charge twice',()=>{
 for(const mode of ['cancel','empty']){
  const save=kit();if(mode==='empty')save.inventory.materials['field-arrows']=0;
  const g=game('ranged',{save});g.chooseTarget('practice',far);
  assert.equal(g.queueAbility(0,far),mode!=='empty');
  if(mode==='cancel')g.dodge();
  assert.equal(advance(g,far,.5).some(e=>e.type==='projectile'),false);
  assert.equal(g.persistentSave().inventory.materials['field-arrows'],mode==='empty'?0:100);
  assert.equal(g.getState().abilities[0].cooldownEnd,mode==='empty'?0:5.2);
 }
});
test('Piercing Arrow uses a distinct reusable projectile and sound',async()=>{
 const {createClassicProjectileView}=await import('../src/classic-projectile-view.js');
 const scene=new THREE.Scene(),view=createClassicProjectileView(scene),p={x:0,z:0,style:'ranged',direction:{x:0,z:1}};
 view.update([{...p,effect:'piercing-arrow'}]);const node=scene.children[0];
 assert.equal(node.scale.y,1.7);assert.deepEqual(view.stats().effects,['piercing-arrow']);
 view.update([p]);assert.equal(node.scale.y,1);assert.equal(scene.children.length,1);view.dispose();
 assert.notDeepEqual(abilitySoundProfile('ranged','bolt','bow','piercing-arrow'),abilitySoundProfile('ranged','basic','bow'));
});
