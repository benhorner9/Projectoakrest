import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createClassicCombat} from '../src/classic-combat.js';
import {defaultSave} from '../src/rules.js';
import {solidAt,clearClassicLine} from '../src/classic-presentation.js';
import {classicAttackPose,classicDeathProgress} from '../src/classic-combat-motion.js';
import {createClassicProjectileView,CLASSIC_PROJECTILE_VIEW_LIMIT} from '../src/classic-projectile-view.js';
import {combatImpactPosition} from '../src/classic-combat-impacts.js';

const near={x:10,z:89},home={x:10,z:87};
const enemy={id:'enemy',type:'mossling',...home,maxHp:1000};
const dummy={id:'practice',type:'dummy',...home,maxHp:10000};
const game=(options={})=>createClassicCombat({save:defaultSave(),random:()=>.2,monsterDefinitions:[enemy],...options});
function advance(g,position,seconds,dt=1/60){
 const events=[];for(let i=0;i<Math.round(seconds/dt);i++)events.push(...g.tick(dt,position));return events;
}
function returned(){
 const g=game();advance(g,near,1);
 assert.equal(g.getState().monsters[0].aggro,true);
 advance(g,{x:10,z:110},1/60);
 advance(g,near,4);
 return g;
}
test('returned enemy stays idle beside player until a genuinely new proximity entry',()=>{
 const g=returned(),e=g.getState().monsters[0];
 assert.equal(e.aiState,'idle');assert.equal(e.aggro,false);assert.equal(e.noticeSuppressed,true);
 assert.equal(e.x,home.x);assert.equal(e.z,home.z);
 assert.equal(advance(g,near,6).some(e=>e.type==='warning'),false);
 advance(g,{x:10,z:95},.1);advance(g,near,.1);
 assert.equal(g.getState().monsters[0].aggro,true,'leaving and returning is a new trigger');
});
test('explicit fresh contact can reengage a returned enemy without waiting for proximity',()=>{
 const g=returned();assert.equal(g.chooseTarget('enemy',near),true);
 const events=advance(g,near,1.2);
 assert.ok(events.some(e=>e.type==='hit'));
 assert.equal(g.getState().monsters[0].aggro,true);
 assert.equal(g.getState().monsters[0].noticeSuppressed,false);
});
test('passive enemies notice a real missed attack but not selection out of reach',()=>{
 const g=game({random:()=>.999,monsterDefinitions:[{...enemy,aggressive:false}]});
 const far={x:10,z:94};g.chooseTarget('enemy',far);advance(g,far,2);
 assert.equal(g.getState().monsters[0].aggro,false);
 const events=advance(g,near,1.5);
 assert.ok(events.some(e=>e.type==='miss'));assert.equal(g.getState().monsters[0].aggro,true);
});
test('shield mitigation reports guarded damage without inventing a full block',()=>{
 const save=defaultSave();save.xp.melee=100000;save.slots.melee.sword=['w3',null,null,null];
 const g=game({save});assert.equal(g.queueAbility(0,near),true);
 const events=advance(g,near,2.5),hurt=events.find(e=>e.type==='hurt');
 assert.ok(hurt?.guarded);assert.ok(hurt.damage>0);
 assert.equal(hurt.hp,g.getState().maxHp-hurt.damage);
});
test('dodge cancels committed and queued offense, retains target, and does not refund recovery',()=>{
 const g=game({monsterDefinitions:[dummy]});g.chooseTarget('practice',near);
 assert.equal(g.queueAbility(0,near),true,'ability queued behind a basic windup');
 const deadline=g.getState().attackUntil;
 assert.equal(g.dodge(),true);assert.equal(g.getState().targetId,'practice');
 assert.equal(g.queueAbility(0,near),false,'cannot fire during the physical dodge');
 assert.equal(advance(g,near,.4).some(e=>['hit','release','projectile'].includes(e.type)),false);
 assert.equal(g.getState().attackUntil,deadline);
 assert.equal(g.getState().abilities[0].cooldownEnd,0,'cancelled queued ability never commits');
 const resumed=advance(g,near,1.6);
 assert.ok(resumed.some(e=>e.type==='release'&&e.kind==='basic'));
 assert.equal(resumed.some(e=>e.type==='release'&&e.kind!=='basic'),false);
});
test('retreat before release prevents damage; already released arrows retain their real source',()=>{
 for(const style of ['melee','ranged','magic']){
  const g=game({monsterDefinitions:[dummy]});g.styleSwitch(style);advance(g,near,.6);
  g.chooseTarget('practice',near);assert.ok(g.getState().action,style+' commits a real windup');
  const deadline=g.getState().attackUntil;g.stopTarget();
  const events=advance(g,near,3);
  assert.equal(events.some(e=>['hit','release','projectile'].includes(e.type)),false,style);
  assert.equal(g.getState().attackUntil,deadline);
 }
 const g=game({monsterDefinitions:[{...dummy,x:-1,z:73}]}),far={x:-1,z:66};
 g.styleSwitch('ranged');advance(g,far,.6);g.chooseTarget('practice',far);
 for(let i=0;i<60&&!g.getState().projectiles.length;i++)advance(g,far,1/60);
 assert.equal(g.getState().projectiles.length,1);
 g.stopTarget();g.styleSwitch('magic');
 const events=advance(g,far,1);
 assert.equal(events.filter(e=>e.type==='hit'&&e.style==='ranged').length,1);
 assert.equal(events.some(e=>e.type==='release'),false,'no new attack follows retreat');
});
test('enemy commits a visible whiff and recovery after the player sidesteps its frozen tell',()=>{
 const g=game();let warning;
 for(let i=0;i<120&&!warning;i++){advance(g,near,1/60);warning=g.getState().monsters[0].warning;}
 assert.ok(warning);assert.equal(warning.damage,7);assert.equal(warning.engage,3.1);
 const hp=g.getState().hp;
 const events=advance(g,{x:13,z:87},warning.end-g.getState().time+.05);
 assert.ok(events.some(e=>e.type==='enemy-whiff'));
 assert.ok(events.some(e=>e.type==='enemy-release'&&!e.connected));
 assert.equal(g.getState().hp,hp);
 assert.ok(g.getState().monsters[0].recoverUntil>g.getState().time);
});
test('existing ranged casters hold casting distance and cannot kite through obstacles',()=>{
 const caster={...enemy,type:'bandit',pattern:{kind:'pounce',engage:12,radius:2,windup:1.2,cooldown:4,damage:13}};
 const g=game({monsterDefinitions:[caster]});
 const distant={x:10,z:93};advance(g,distant,6);
 assert.ok(Math.hypot(g.getState().monsters[0].x-10,g.getState().monsters[0].z-87)<.1);
 let previous=g.getState().monsters[0];
 for(let i=0;i<240;i++){
  advance(g,{x:10,z:88},1/60);const next=g.getState().monsters[0];
  assert.equal(solidAt(next.x,next.z,.4),false);
  assert.equal(clearClassicLine(previous,next,.4),true);previous=next;
 }
 assert.ok(Math.hypot(previous.x-home.x,previous.z-home.z)<14);
});
test('attack poses follow real windup/contact/recovery and never invent contact after cancellation',()=>{
 const g=game({monsterDefinitions:[dummy]});g.chooseTarget('practice',near);
 let s=g.getState();assert.equal(classicAttackPose(s.time,s.action,s.lastRelease),'prepare');
 advance(g,near,.15);s=g.getState();assert.equal(classicAttackPose(s.time,s.action,s.lastRelease),'windup');
 const events=advance(g,near,.2);s=g.getState();
 assert.ok(events.some(e=>e.type==='hit'));assert.equal(classicAttackPose(s.time,s.action,s.lastRelease),'strike');
 advance(g,near,.2);s=g.getState();assert.equal(classicAttackPose(s.time,s.action,s.lastRelease),'recover');
 g.stopTarget();advance(g,near,.2);s=g.getState();assert.equal(classicAttackPose(s.time,s.action,s.lastRelease),'idle');
});
test('death is timestamped once, visually expires and cannot grant another reward',()=>{
 const g=game({monsterDefinitions:[{...enemy,maxHp:1,aggressive:false}]});g.chooseTarget('enemy',near);
 const events=advance(g,near,.4),e=g.getState().monsters[0];
 assert.equal(events.filter(e=>e.type==='defeated').length,1);assert.equal(e.dead,true);
 assert.ok(classicDeathProgress(e,g.getState().time)<1);
 assert.equal(classicDeathProgress(e,e.deathAt+.7),1);
 assert.equal(g.chooseTarget('enemy',near),false);
 assert.equal(advance(g,near,2).filter(e=>e.type==='defeated').length,0);
});
test('combat outcome timelines stay identical at 60, 30, 10 and 5 FPS',()=>{
 const run=dt=>{const g=game({monsterDefinitions:[{...enemy,aggressive:false}]});
  g.chooseTarget('enemy',near);const events=advance(g,near,6,dt);
  g.stopTarget();events.push(...advance(g,{x:10,z:110},2,dt));
  return {events,state:g.getState(),save:g.persistentSave()};};
 const baseline=run(1/60);for(const dt of [1/30,.1,.2])assert.deepEqual(run(dt),baseline);
});
test('projectile mesh pool points along simulation direction and remains bounded/reusable',()=>{
 const scene=new THREE.Scene(),view=createClassicProjectileView(scene);
 const p={x:3,z:5,style:'ranged',direction:{x:1,z:0}};
 view.update([p]);const first=scene.children[0];
 const heading=new THREE.Vector3(0,1,0).applyQuaternion(first.quaternion);
 assert.ok(heading.distanceTo(new THREE.Vector3(1,0,0))<1e-6);
 assert.equal(first.position.x,3);assert.equal(first.position.z,5);
 view.update([]);view.update([{...p,style:'magic',family:'ember'}]);
 assert.equal(scene.children[0],first);assert.equal(view.stats().allocated,1);
 view.update(Array(100).fill(p));assert.equal(view.stats().visible,CLASSIC_PROJECTILE_VIEW_LIMIT);
 view.update([]);assert.equal(view.stats().visible,0);view.dispose();assert.equal(scene.children.length,0);
});
test('dodge feedback is located on the player, not the attacking enemy',()=>{
 assert.equal(combatImpactPosition({type:'evade',id:'enemy'},{monsters:[enemy]},near),near);
});
