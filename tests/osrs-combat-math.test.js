import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {accuracyFor,attackRating,defenceRating,opposedHitChance} from '../src/osrs-combat-math.js';
import {LOADOUTS} from '../src/rules.js';
import {maxHitFor,rollHit} from '../src/auto-combat.js';

test('opposed rolls use both RuneScape-style branches, including equal ratings',()=>{
 assert.equal(opposedHitChance(0,100),0);
 assert.equal(opposedHitChance(100,100),100/202);
 assert.equal(opposedHitChance(200,100),1-102/402);
 assert.equal(opposedHitChance(100,200),100/402);
 assert.equal(opposedHitChance(Number.NaN,200),0);
 assert.ok(opposedHitChance(2,0)<1);
});

test('skill level, weapon power and equipment increase attack rating',()=>{
 assert.ok(attackRating(5,19)<attackRating(25,19));
 assert.ok(attackRating(25,9)<attackRating(25,19));
 assert.ok(attackRating(25,19)<attackRating(25,39));
 assert.ok(attackRating(25,19)<attackRating(25,19,1.07));
 assert.ok(Number.isInteger(attackRating(1,19)));
 assert.ok(attackRating(100000,200,1e3)<=attackRating(99,200,2));
});

test('target level and defensive guard increase defence rating',()=>{
 assert.ok(defenceRating(2)<defenceRating(5));
 assert.ok(defenceRating(8)<defenceRating(8,.08));
 assert.ok(defenceRating(8,.08)<defenceRating(8,.2));
 assert.ok(Number.isFinite(defenceRating(Infinity,Infinity)));
});

test('early fighting stays approachable while tough enemies resist and no level guarantees hits',()=>{
 const mossling=accuracyFor(1,2,19);
 assert.ok(mossling>.63&&mossling<.76,'level-one sword should usually connect with a mossling');
 assert.ok(accuracyFor(1,8,19,.08)<mossling,'bandits should be harder at level one');
 assert.ok(accuracyFor(20,8,19,.08)>accuracyFor(1,8,19,.08));
 assert.ok(accuracyFor(20,8,39,.08)>accuracyFor(20,8,9,.08));
 assert.ok(accuracyFor(20,8,19,.08,1.05)>accuracyFor(20,8,19,.08,1));
 assert.ok(accuracyFor(99,1,200)<1);
 assert.ok(accuracyFor(1,999,0)>0);
 assert.ok(accuracyFor(1,2,19,.2)<accuracyFor(1,2,19,0));
});

test('all three combat styles use the same mechanics without changing weapon cadence',()=>{
 for(const style of ['melee','magic','ranged']){
  const weapon=LOADOUTS[style][{melee:'sword',magic:'frost',ranged:'bow'}[style]];
  assert.ok(accuracyFor(1,2,weapon.basic)>0);
  assert.ok(maxHitFor(1,weapon.basic)>0);
  assert.ok(weapon.windup<weapon.interval);
 }
 assert.equal(LOADOUTS.melee.daggers.interval,.4);
 assert.equal(LOADOUTS.ranged.crossbow.interval,2.05);
});

test('miss and damage rolls stay independent; successful damage remains bounded',()=>{
 const values=[.99,.10,0,.10,.999999];let index=0;
 const rng=()=>values[index++];
 assert.deepEqual(rollHit({maxHit:23,accuracy:.72,random:rng}),{hit:false,damage:0});
 assert.deepEqual(rollHit({maxHit:23,accuracy:.72,random:rng}),{hit:true,damage:1});
 assert.deepEqual(rollHit({maxHit:23,accuracy:.72,random:rng}),{hit:true,damage:23});
});

test('hit resolution snapshots equipment/style and still checks physical contact',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/accuracyFor\(source\.level,e\.level,source\.weaponBasic,.*source\.power\)/);
 assert.match(main,/sourceSnapshot\(\)/);
 assert.match(main,/sweptStrikeHit\(/);
 assert.match(main,/segmentWorldHit\(/);
 assert.match(main,/projectileTravel\(/);
 assert.match(main,/e\.type==='dummy'\?1:/);
 assert.match(main,/defenceFor\(data\.armour\[style\]\)\.physical/);
 assert.match(main,/data\.onboarding\?\.area==='tutorial'/);
});
