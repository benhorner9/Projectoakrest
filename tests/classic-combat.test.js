import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultSave,xpToLevel,STYLE_ORDER} from '../src/rules.js';
import {createClassicCombat,CLASSIC_ENEMY_SPAWNS} from '../src/classic-combat.js';
import {ENEMY_COMBAT,ENEMY_PATTERNS} from '../src/combat-feel.js';
import {maxHitFor} from '../src/auto-combat.js';
const near=(x,z)=>({x,z});
const time=(game,position,seconds)=>{const events=[];for(let i=0;i<Math.ceil(seconds/.08);i++)events.push(...game.tick(.08,position));return events;};

test('spawns use authoritative Oakrest mob levels, warning patterns and safe training zone',()=>{
 const game=createClassicCombat({save:defaultSave()});
 assert.ok(CLASSIC_ENEMY_SPAWNS.some(s=>s.type==='dummy'));
 assert.deepEqual(new Set(CLASSIC_ENEMY_SPAWNS.map(m=>m.type)),
  new Set(['dummy','mossling','boar','bandit']));
 for(const m of game.getState().monsters){
  assert.equal(m.level,ENEMY_COMBAT[m.type].level);
  if(m.type!=='dummy')assert.ok(ENEMY_PATTERNS[m.type].windup>0);
 }
});

test('basic Melee cadence obeys existing weapon windup and interval, no instant burst',()=>{
 const save=defaultSave(),game=createClassicCombat({save,random:()=>.1});
 const pos=near(-1,71.3);
 assert.equal(game.chooseTarget('practice',pos),true);
 let events=game.tick(.01,pos);
 assert.ok(events.some(e=>e.type==='windup'),'basic attack starts windup');
 assert.equal(events.some(e=>e.type==='hit'),false,'no instantaneous contact');
 events=time(game,pos,.22);
 assert.equal(events.some(e=>e.type==='hit'),false);
 events=time(game,pos,.16);
 assert.ok(events.some(e=>e.type==='hit'),'hit resolves after sword windup');
 events=time(game,pos,.34);
 assert.equal(events.filter(e=>e.type==='hit').length,0,'cannot bypass 1.15s weapon cadence');
});

test('ranged and Magic keep separate loadouts and release travelling projectiles',()=>{
 const game=createClassicCombat({save:defaultSave(),random:()=>.1}),pos=near(-1,66.4);
 assert.equal(game.chooseTarget('practice',pos),true);
 assert.equal(game.styleSwitch('ranged'),true);
 assert.equal(game.getState().style,'ranged');
 const first=time(game,pos,1.5);
 assert.ok(first.some(e=>e.type==='projectile'&&e.style==='ranged'));
 assert.ok(first.some(e=>e.type==='hit'),'arrow travels and contacts dummy');
 time(game,pos,1.3);
 assert.equal(game.styleSwitch('magic'),true);
 assert.equal(game.getState().style,'magic');
 const events=time(game,pos,2.5);
 assert.ok(events.some(e=>e.type==='projectile'&&e.style==='magic'));
});

test('ability slots use existing skill requirements and keyed cooldowns',()=>{
 const save=defaultSave();
 save.xp.melee=Array.from({length:5},(_,i)=>xpToLevel(i+1)).reduce((a,b)=>a+b,0);
 const game=createClassicCombat({save,random:()=>.05}),pos=near(-1,71.3);
 assert.equal(game.chooseTarget('practice',pos),true);
 assert.ok(game.getState().abilities[0]?.name);
 assert.equal(game.getState().abilities[1],null,'newly unlocked skills are not auto-slotted');
 assert.equal(game.queueAbility(0),true);
 time(game,pos,.6);
 const end=game.getState().abilities[0].cooldownEnd;
 assert.ok(end>game.getState().time);
 assert.equal(game.queueAbility(0),false,'same ability blocked until cooldown');
 const before=game.getState().progression.melee;
 time(game,pos,6);
 assert.equal(game.getState().progression.melee,before,'training dummy grants no XP');
});

test('monster warnings are timed and moving outside marked shape prevents attack',()=>{
 const game=createClassicCombat({save:defaultSave(),random:()=>.02});
 const player=near(-11,96);
 const events=time(game,player,7);
 assert.ok(events.some(e=>e.type==='warning'&&e.id==='moss-a'),
  'aggro mossling exposes a real warning');
 const warning=events.find(e=>e.type==='warning');
 assert.equal(warning.warning.kind,ENEMY_PATTERNS.mossling.kind);
 const before=game.getState().hp;
 const clear=near(0,79);
 time(game,clear,.9);
 assert.equal(game.getState().hp,before,'stepping out of the frozen pounce warning evades');
});

test('safe town and leash abort monster chase; enemy returns home',()=>{
 const game=createClassicCombat({save:defaultSave(),random:()=>.02});
 const nearEnemy=near(-14,99);
 time(game,nearEnemy,4);
 const mob=game.getState().monsters.find(e=>e.id==='moss-b');
 assert.ok(mob.aggro||mob.retreating||mob.warning);
 time(game,near(0,39),16);
 const after=game.getState().monsters.find(e=>e.id==='moss-b');
 assert.equal(after.aggro,false);
 assert.equal(after.retreating,false);
 assert.ok(Math.hypot(after.x-after.startX,after.z-after.startZ)<.3);
});

test('all combat changes remain in a separate, non-persisted session save',()=>{
 const save=defaultSave();
 const original=JSON.stringify(save);
 const game=createClassicCombat({save,random:()=>.01});
 assert.equal(game.chooseTarget('moss-a',near(-11,96)),true);
 time(game,near(-11,96),8);
 assert.equal(JSON.stringify(save),original,'caller save is immutable');
 const snap=game.sandboxSave();
 assert.notEqual(snap,save);
 snap.coins=123456;
 assert.notEqual(game.sandboxSave().coins,123456,'snapshot cannot mutate combat state');
 assert.ok(STYLE_ORDER.includes(game.getState().style));
});

test('targeting cannot lock distant/blocked enemies and dodge respects cooldown',()=>{
 const game=createClassicCombat({save:defaultSave()});
 assert.equal(game.chooseTarget('moss-a',near(0,39)),false);
 assert.equal(game.chooseTarget('practice',near(-1,71.3)),true);
 assert.equal(game.dodge(),true);
 assert.equal(game.dodge(),false);
 time(game,near(-1,71.3),2.2);
 assert.equal(game.dodge(),true);
});
