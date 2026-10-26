import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassicCombat} from '../src/classic-combat.js';
import {createClassicSimulationClock,classicWeaponInterval} from '../src/classic-combat-clock.js';
import {defaultSave,LOADOUTS} from '../src/rules.js';
import {createClassicNavigation} from '../src/classic-navigation.js';
import {solidAt,clearClassicLine} from '../src/classic-presentation.js';
const near={x:-1,z:71.3},far={x:-1,z:66};
function kit(){
 const save=defaultSave();
 for(const style of ['melee','ranged','magic']){
  save.xp[style]=100000;
  save.inventory.weapons[style]=Object.keys(LOADOUTS[style]);
  for(const family of Object.keys(save.slots[style]))save.slots[style][family]=['w0','w1','w2','w3'];
 }
 save.inventory.materials={'field-arrows':100,'frost-scroll':100,'ember-scroll':100};
 return save;
}
const advance=(g,p,seconds,dt=1/60)=>{
 const events=[];for(let i=0;i<Math.round(seconds/dt);i++)events.push(...g.tick(dt,p));return events;
};
const dummy={id:'practice',type:'dummy',x:-1,z:73,maxHp:100000};
const game=(options={})=>createClassicCombat({save:kit(),adventure:true,random:()=>.2,monsterDefinitions:[dummy],...options});

test('fixed simulation yields identical event timelines at 60, 30, 10 and 5 FPS',()=>{
 const run=dt=>{const g=game();g.chooseTarget('practice',near);const events=advance(g,near,12,dt);return {events,state:g.getState(),save:g.persistentSave()};};
 const expected=run(1/60);
 for(const dt of [1/30,.1,.2])assert.deepEqual(run(dt),expected);
 const starts=expected.events.filter(e=>e.type==='windup').map(e=>e.time);
 assert.ok(starts.length>=10);
 for(let i=1;i<starts.length;i++)assert.ok(Math.abs(starts[i]-starts[i-1]-1.2)<1e-8);
});

test('every registered weapon uses an integer 600 ms interval; suspension never catches up attacks',()=>{
 for(const weapons of Object.values(LOADOUTS))for(const w of Object.values(weapons)){
  const interval=classicWeaponInterval(w);assert.ok(interval+1e-9>=w.interval);
  assert.ok(Math.abs(interval/.6-Math.round(interval/.6))<1e-8);
 }
 const clock=createClassicSimulationClock();let calls=0;
 clock.advance(.01,()=>calls++);clock.advance(90,()=>calls++);assert.equal(calls,0);
 clock.advance(1/60,()=>calls++);assert.equal(calls,1);
 const g=game();g.chooseTarget('practice',near);g.tick(30,near);
 assert.equal(g.getState().time,0);assert.equal(g.getState().target.hp,dummy.maxHp);
});

test('invalid target and range reject abilities without costs or cooldowns',()=>{
 const g=game();g.styleSwitch('magic');advance(g,far,.2);
 assert.equal(g.queueAbility(0,far),false);
 assert.equal(g.getState().abilities[0].available,false);
 assert.equal(g.getState().abilities[0].cooldownEnd,0);
 g.chooseTarget('practice',far);
 assert.equal(g.queueAbility(0,{x:-1,z:40}),false);
 assert.equal(g.getState().abilities[0].cooldownEnd,0);
 assert.equal(g.persistentSave().inventory.materials['frost-scroll'],100);
});

test('invalidated windup does not consume ammunition; explicit retreat retains its deadline',()=>{
 const g=game();g.styleSwitch('ranged');advance(g,far,.6);g.chooseTarget('practice',far);
 const deadline=g.getState().attackUntil;assert.ok(g.getState().action);
 advance(g,{x:-1,z:40},.6);
 assert.equal(g.persistentSave().inventory.materials['field-arrows'],100);
 assert.equal(g.getState().attackUntil,deadline);
 g.chooseTarget('practice',far);g.stopTarget();advance(g,far,1);
 assert.equal(g.getState().targetId,null);assert.equal(g.getState().action,null);
});

test('instant style and equipment changes cannot refund committed recovery or produce old damage',()=>{
 const g=game();g.chooseTarget('practice',near);const deadline=g.getState().attackUntil;
 advance(g,near,.1);g.styleSwitch('ranged');
 assert.equal(g.getState().style,'ranged');assert.equal(g.getState().action,null);
 assert.equal(g.getState().attackUntil,deadline);
 g.styleSwitch('magic');g.styleSwitch('melee');
 const events=advance(g,near,1);
 assert.equal(events.filter(e=>e.type==='hit').length,0);
 assert.equal(g.itemAction({type:'equip',kind:'weapon',style:'melee',id:'daggers'},near).ok,true);
 assert.equal(g.getState().attackUntil,deadline);
});

test('empty ranged supply stops auto attack and utility roll remains usable without arrows',()=>{
 const save=kit();save.gear.ranged='crossbow';save.inventory.materials['field-arrows']=0;
 const g=game({save});g.styleSwitch('ranged');advance(g,far,.6);g.chooseTarget('practice',far);
 assert.equal(g.getState().targetId,null);
 assert.ok(g.drain().some(e=>e.type==='adventure-notice'));
 assert.equal(g.queueAbility(3,far),true);
 const events=advance(g,far,.1);assert.ok(events.some(e=>e.type==='dash'));
 assert.equal(g.persistentSave().inventory.materials['field-arrows'],0);
});

test('burst consumes exactly three arrows and scatter distributes one arrow per valid target',()=>{
 for(const [weapon,index,expected] of [['bow',1,3],['crossbow',1,2]]){
  const save=kit();save.gear.ranged=weapon;
  const g=game({save,monsterDefinitions:[dummy,{...dummy,id:'second',x:1}]});
  g.styleSwitch('ranged');advance(g,near,.2);g.chooseTarget('practice',near);
  assert.equal(g.queueAbility(index,near),true);
  const events=advance(g,near,.55);
  assert.equal(events.filter(e=>e.type==='projectile').length,expected);
  assert.equal(g.persistentSave().inventory.materials['field-arrows'],100-expected);
  if(weapon==='crossbow')assert.deepEqual(new Set(events.filter(e=>e.type==='hit').map(e=>e.id)),new Set(['practice','second']));
 }
});

test('releasing one magic spell spends one scroll and its projectile retains the source style',()=>{
 const g=game();g.styleSwitch('magic');advance(g,far,.2);g.chooseTarget('practice',far);
 assert.equal(g.queueAbility(0,far),true);advance(g,far,.3);g.styleSwitch('melee');
 const events=advance(g,far,.5);
 assert.ok(events.some(e=>e.type==='hit'&&e.style==='magic'));
 assert.equal(g.persistentSave().inventory.materials['frost-scroll'],99);
 assert.ok(g.getState().attackUntil>g.getState().time);
});

test('passive enemy retaliates, defeat grants rewards once, respawn has a new life',()=>{
 const g=game({monsterDefinitions:[{id:'passive',type:'mossling',x:10,z:87,maxHp:1,aggressive:false}]});
 const p={x:10,z:88};advance(g,p,4);assert.equal(g.getState().monsters[0].aggro,false);
 g.chooseTarget('passive',p);const events=advance(g,p,2);
 assert.equal(events.filter(e=>e.type==='defeated').length,1);
 assert.equal(events.filter(e=>e.type==='xp').length,1);
 const xp=g.getState().progression.melee;advance(g,near,13);
 assert.equal(g.getState().progression.melee,xp);
 assert.equal(g.getState().monsters[0].life,1);
 assert.equal(g.getState().monsters[0].dead,false);
});

test('enemy hit attempts expose misses and cannot damage from outside attack range',()=>{
 const g=game({random:()=>.999,monsterDefinitions:[{id:'enemy',type:'mossling',x:10,z:87,maxHp:100}]});
 const p={x:10,z:89};g.chooseTarget('enemy',p);const events=advance(g,p,4);
 assert.ok(events.some(e=>e.type==='miss'));assert.ok(events.some(e=>e.type==='enemy-miss'));
 const hp=g.getState().hp;advance(g,{x:10,z:110},3);assert.equal(g.getState().hp,hp);
 assert.equal(g.getState().monsters[0].aggro,false);
});

test('combat interaction finds a reachable firing position instead of stopping across a wall',()=>{
 // Search a pair on opposite sides of an actual building footprint.
 let pair;
 for(let x=-22;x<22&&!pair;x+=2)for(let z=30;z<60;z+=2){
  const p={x:x-4,z},e={x:x+4,z};
  if(!solidAt(p.x,p.z)&&!solidAt(e.x,e.z)&&!clearClassicLine(p,e,.1)){pair={p,e};break;}
 }
 assert.ok(pair);const {p,e}=pair;
 const nav=createClassicNavigation();const target={id:'combat',name:'Target',kind:'combat',...e,reach:10,
  canComplete:q=>Math.hypot(q.x-e.x,q.z-e.z)<=10&&clearClassicLine(q,e,.1)};
 assert.equal(nav.interactWith(p,target).ok,true);
 let position=p,reached=false;
 for(let i=0;i<1200&&!reached;i++){const update=nav.step(position,{},1/60);assert.equal(clearClassicLine(position,update.position,.38),true);position=update.position;reached=!!update.interaction;}
 assert.equal(reached,true);assert.equal(target.canComplete(position),true);
});

test('a selected target behind solid scenery cannot trigger or pay for a spell',()=>{
 let pair;
 for(let x=-22;x<22&&!pair;x+=2)for(let z=30;z<60;z+=2){
  const p={x:x-4,z},e={x:x+4,z};
  if(!solidAt(p.x,p.z)&&!solidAt(e.x,e.z)&&!clearClassicLine(p,e,.1)){pair={p,e};break;}
 }
 const g=game({monsterDefinitions:[{...dummy,...pair.e}]});
 g.styleSwitch('magic');advance(g,pair.p,.6);
 assert.equal(g.chooseTarget('practice',pair.p),true,'selection may approach around a wall');
 assert.equal(g.queueAbility(0,pair.p),false);
 const events=advance(g,pair.p,3);
 assert.equal(events.some(e=>e.type==='release'),false);
 assert.equal(g.persistentSave().inventory.materials['frost-scroll'],100);
 assert.equal(g.getState().abilities[0].cooldownEnd,0);
});

test('passive creature responds to a real hit and never attacks after returning starts',()=>{
 const g=game({monsterDefinitions:[{id:'passive',type:'mossling',x:10,z:87,maxHp:1000,aggressive:false}]});
 const p={x:10,z:89};advance(g,p,4);
 assert.equal(g.getState().monsters[0].aggro,false);
 g.chooseTarget('passive',p);advance(g,p,.6);
 assert.equal(g.getState().monsters[0].aggro,true);
 g.stopTarget();const events=advance(g,p,4);
 assert.ok(events.some(e=>e.type==='warning'));
 const hp=g.getState().hp;
 const retreat=advance(g,{x:0,z:39},5);
 assert.equal(g.getState().hp,hp);assert.equal(retreat.some(e=>e.type==='hurt'),false);
 assert.equal(g.getState().monsters[0].aiState,'idle');
});

test('changing targets cancels the original windup without resetting recovery',()=>{
 const g=game({monsterDefinitions:[dummy,{...dummy,id:'second',x:1}]});
 g.chooseTarget('practice',near);advance(g,near,.1);
 const deadline=g.getState().attackUntil;g.chooseTarget('second',near);
 assert.equal(g.getState().attackUntil,deadline);
 const events=advance(g,near,2);
 assert.equal(events.filter(e=>e.type==='hit'&&e.id==='practice').length,0);
 assert.ok(events.some(e=>e.type==='hit'&&e.id==='second'));
});

test('registered patrol routes move idle enemies within their spawn region',()=>{
 const g=game({monsterDefinitions:[{id:'patrol',type:'mossling',x:10,z:87,maxHp:100,patrol:[{x:12,z:87},{x:10,z:87}]}]});
 advance(g,{x:-12,z:90},1);
 const enemy=g.getState().monsters[0];assert.equal(enemy.aiState,'patrol');assert.ok(enemy.x>10.5);
 assert.equal(enemy.aggro,false);
});
