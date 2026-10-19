import test from 'node:test';
import assert from 'node:assert/strict';
import {LOADOUTS,defaultSave,validSave,xpToLevel,canEquipWeapon,skillCatalogue} from '../src/rules.js';
import {basicAttackReady,attackCooldown,projectileTravel,weaponDisplay} from '../src/attack-rules.js';
import {readFileSync} from 'node:fs';
const xpForLevel=n=>Array.from({length:n-1},(_,i)=>xpToLevel(i+1)).reduce((a,b)=>a+b,0);
test('daggers beat swords on cadence, greatswords take much longer',()=>{
 const d=LOADOUTS.melee;
 assert.ok(d.daggers.interval<d.sword.interval&&d.sword.interval<d.greatsword.interval);
 assert.ok(d.greatsword.basic>d.sword.basic&&d.sword.basic>d.daggers.basic);
 assert.ok(d.greatsword.windup>d.sword.windup&&d.sword.windup>d.daggers.windup);
});
test('longbows shoot further but more slowly than shortbows',()=>{
 const r=LOADOUTS.ranged;
 assert.ok(r.bow.reach>r.shortbow.reach);
 assert.ok(r.bow.interval>r.shortbow.interval);
 assert.ok(r.bow.basic>r.shortbow.basic);
});
test('crossbow is strongest, slowest and shorter-range than either bow',()=>{
 const r=LOADOUTS.ranged;
 assert.ok(r.crossbow.basic>r.bow.basic);
 assert.ok(r.crossbow.interval>r.bow.interval);
 assert.ok(r.crossbow.reach<r.shortbow.reach);
});
test('timer rejects tapping during windup or recovery',()=>{
 assert.equal(basicAttackReady(5,5,false),true);
 assert.equal(basicAttackReady(4.99,5,false),false);
 assert.equal(basicAttackReady(5,5,true),false);
 assert.deepEqual(attackCooldown(5,2,4),{remaining:1,progress:.5,ready:false});
 assert.equal(attackCooldown(5,2,5).ready,true);
});
test('projectiles cannot exceed weapon range even in oversized frame',()=>{
 assert.deepEqual(projectileTravel(0,20,.5,8),{step:8,distance:8,expired:true});
 const step=projectileTravel(7.5,20,.1,8);
 assert.equal(step.step,.5);assert.equal(step.expired,true);
 assert.ok(weaponDisplay(LOADOUTS.ranged.crossbow).includes('2.05s/attack'));
});
test('new weapons require levels, keep family ability slots, and load from saved inventory',()=>{
 const fresh=defaultSave();
 assert.equal(canEquipWeapon('ranged','shortbow',fresh.xp),false);
 assert.equal(canEquipWeapon('melee','greatsword',fresh.xp),false);
 assert.ok(skillCatalogue('ranged','shortbow').length>=4);
 const saved=validSave({xp:{ranged:xpForLevel(3),melee:xpForLevel(7)},gear:{ranged:'shortbow',melee:'greatsword'}});
 assert.equal(saved.gear.ranged,'shortbow');assert.equal(saved.gear.melee,'greatsword');
});
test('runtime uses pending windup, actual projectile limits and timing UI',()=>{
 const s=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.ok(s.includes('pendingBasic={style,weapon:data.gear[style],impactAt:t+windup'));
 assert.ok(s.includes('resolveBasicAttack(t)'));
 assert.ok(s.includes('projectileTravel(p.distance, p.speed, dt, p.maxDistance)'));
 assert.ok(s.includes("attackButton.classList.toggle('recovering'"));
 assert.ok(s.includes("const timer=attackCooldown("));
 const h=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.ok(h.includes('id="attack-timer"'));
});
