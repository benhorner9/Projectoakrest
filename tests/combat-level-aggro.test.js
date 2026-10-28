import test from 'node:test';
import assert from 'node:assert/strict';
import {combatLevelFromXp,xpToLevel,defaultSave,validSave} from '../src/rules.js';
import {ENEMY_COMBAT,enemyBehaviour,enemyThreatTier} from '../src/combat-feel.js';
import {readFileSync} from 'node:fs';
const xp=n=>Array.from({length:n-1},(_,i)=>xpToLevel(i+1)).reduce((a,b)=>a+b,0);
test('fresh player combat level is one and derives only from existing skill levels',()=>{
 const d=defaultSave();assert.equal(combatLevelFromXp(d.xp),1);
 assert.equal(combatLevelFromXp(validSave(d).xp),1);
 const boosted={melee:xp(20),ranged:0,magic:0,vitality:xp(10)};
 assert.ok(combatLevelFromXp(boosted)>1);
 assert.ok(combatLevelFromXp({...boosted,ranged:xp(20)})>combatLevelFromXp(boosted));
 assert.ok(combatLevelFromXp({melee:xp(99),ranged:xp(99),magic:xp(99),vitality:xp(99)})<=99);
});
test('enemy levels are deliberate and show escalating challenge',()=>{
 assert.equal(ENEMY_COMBAT.dummy.level,1);
 assert.ok(ENEMY_COMBAT.mossling.level<ENEMY_COMBAT.boar.level);
 assert.ok(ENEMY_COMBAT.boar.level<ENEMY_COMBAT.bandit.level);
 assert.equal(enemyThreatTier(8,1),'danger');assert.equal(enemyThreatTier(2,10),'easy');
});
test('a lone monster only engages players within its own detection range',()=>{
 const e={x:0,z:0,startX:0,startZ:0};
 assert.equal(enemyBehaviour('mossling',e,{x:5,z:0},false),'acquire');
 assert.equal(enemyBehaviour('mossling',e,{x:9,z:0},false),'idle');
 assert.equal(enemyBehaviour('boar',e,{x:5,z:0},false),'acquire');
});
test('chase ends if the player escapes, even while enemy is pursuing',()=>{
 const e={x:7,z:0,startX:0,startZ:0};
 assert.equal(enemyBehaviour('mossling',e,{x:8,z:0},true),'pursue');
 assert.equal(enemyBehaviour('mossling',e,{x:18,z:0},true),'retreat');
 assert.equal(enemyBehaviour('mossling',{...e,x:11},{x:11,z:0},true),'retreat');
 assert.equal(enemyBehaviour('bandit',{x:2,z:0,startX:0,startZ:0},{x:20,z:0},true),'retreat');
});
test('returning enemies must reach home before aggro again',()=>{
 const away={x:6,z:0,startX:0,startZ:0};
 assert.equal(enemyBehaviour('mossling',away,{x:6,z:0},false),'return');
 assert.equal(enemyBehaviour('mossling',{...away,x:0.1},{x:20,z:0},false),'idle');
});
