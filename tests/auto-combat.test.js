import test from 'node:test';
import assert from 'node:assert/strict';
import {maxHitFor,accuracyFor,rollHit,maxHitForAction,acquireEnemy,targetValid,inAttackRange} from '../src/auto-combat.js';
test('levels, weapon strength and equipment independently increase maximum hit',()=>{
 assert.ok(maxHitFor(50,19)>maxHitFor(1,19));
 assert.ok(maxHitFor(50,39)>maxHitFor(50,19));
 assert.ok(maxHitFor(50,19,1.1)>maxHitFor(50,19));
 assert.equal(maxHitFor(1,0),0);
 for(let lv=1;lv<=99;lv++)assert.ok(maxHitFor(lv,19)<=maxHitFor(lv+1,19));
});
test('miss deals zero, successful damage is uniformly bounded from 1 to max',()=>{
 assert.deepEqual(rollHit({maxHit:17,accuracy:.7,random:()=>.95}),{hit:false,damage:0});
 const sequence=[.2,0,.2,.999999];let i=0;
 assert.deepEqual(rollHit({maxHit:17,accuracy:.7,random:()=>sequence[i++]}),{hit:true,damage:1});
 assert.deepEqual(rollHit({maxHit:17,accuracy:.7,random:()=>sequence[i++]}),{hit:true,damage:17});
 assert.deepEqual(rollHit({maxHit:0,accuracy:1,random:()=>0}),{hit:false,damage:0});
});
test('accuracy increases with training and accounts for enemy defence',()=>{
 assert.ok(accuracyFor(90,8,19)>accuracyFor(1,8,19));
 assert.ok(accuracyFor(30,8,39)>accuracyFor(30,8,9));
 assert.ok(accuracyFor(30,8,19,.15)<accuracyFor(30,8,19));
 assert.ok(accuracyFor(99,1,200)<1);
 assert.ok(accuracyFor(1,999,0)>0);
});
test('special attacks inherit the levelled weapon ceiling with a capped multiplier',()=>{
 assert.equal(maxHitForAction(20,20,40),40);
 assert.equal(maxHitForAction(20,20,10000),80);
 assert.equal(maxHitForAction(20,0,40),0);
});
test('targeting selects visible forward threat and refuses dead, returning or distant mobs',()=>{
 const front={x:0,z:-12,hp:20},behind={x:0,z:4,hp:10},obstructed={x:0,z:-5,hp:20,blocked:true};
 assert.equal(acquireEnemy([front,behind,obstructed],{x:0,z:0},{x:0,z:-1},e=>!e.blocked),front);
 assert.equal(targetValid(front,[front],{x:0,z:0}),true);
 assert.equal(targetValid({...front,dead:true},[front],{x:0,z:0}),false);
 assert.equal(targetValid(front,[front],{x:0,z:70}),false);
 assert.equal(inAttackRange({x:0,z:0},front,13,true),true);
 assert.equal(inAttackRange({x:0,z:0},front,13,false),false);
});
test('damage distribution includes misses and a spread of successful hits',()=>{
 let seed=321;const random=()=>((seed=seed*16807%2147483647)-1)/2147483646;
 const rolls=Array.from({length:2000},()=>rollHit({maxHit:21,accuracy:.75,random}));
 const misses=rolls.filter(x=>!x.hit).length,hitDamage=new Set(rolls.filter(x=>x.hit).map(x=>x.damage));
 assert.ok(misses>300&&misses<700);
 assert.ok(hitDamage.size>=18);
 assert.ok(Math.max(...hitDamage)<=21);
});
