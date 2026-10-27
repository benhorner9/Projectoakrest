import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultSave} from '../src/rules.js';
import {createClassicCombat} from '../src/classic-combat.js';
import {combatApproachPoint,breaksPlayerAttackIntent,createClassicCombatMovementIntent} from '../src/classic-combat-intent.js';

const step=(game,player,seconds)=>Array.from({length:Math.ceil(seconds/.05)},()=>
 game.tick(.05,player)).flat();

test('cancelled attack windup does not hit and standing still never re-locks',()=>{
 const game=createClassicCombat({save:defaultSave(),random:()=>.01});
 const player={x:-1,z:71.3};
 assert.equal(game.chooseTarget('practice',player),true);
 assert.ok(game.tick(.01,player).some(e=>e.type==='windup'));
 game.stopTarget('player-movement');
 const target=game.getState();
 assert.equal(target.targetId,null);
 assert.equal(target.action,null);
 const hp=target.monsters.find(m=>m.id==='practice').hp;
 step(game,player,5);
 assert.equal(game.getState().monsters.find(m=>m.id==='practice').hp,hp);
 assert.equal(game.getState().targetId,null,'player can stop without ever pressing Attack again');
 assert.equal(game.chooseTarget('practice',player),true);
 assert.ok(step(game,player,2).some(e=>e.type==='hit'),'new deliberate tap restarts attacks');
});
test('disengaging preserves attack rate and does not refund a cancelled windup',()=>{
 const game=createClassicCombat({save:defaultSave(),random:()=>.01});
 const player={x:-1,z:71.3};
 assert.equal(game.chooseTarget('practice',player),true);
 step(game,player,.03);game.stopTarget();
 const attackUntil=game.getState().attackUntil;
 assert.ok(attackUntil>0);
 assert.equal(game.chooseTarget('practice',player),true);
 assert.equal(game.tick(.01,player).some(e=>e.type==='windup'),false,'no attack-speed exploit from switching targets');
});
test('approach stops at weapon reach, repositioning keeps target and long movement disengages',()=>{
 const pos={x:1,z:10},enemy={x:1,z:20};
 const approach=combatApproachPoint(pos,enemy,2.2);
 assert.ok(approach.z<enemy.z);
 assert.ok(Math.abs(enemy.z-approach.z-1.75)<1e-8);
 assert.equal(combatApproachPoint({x:1,z:19},enemy,2.2),null);
 assert.equal(breaksPlayerAttackIntent({kind:'manual'},{player:pos,target:enemy}),false,
  'brief manual movement can reposition during combat');
 assert.equal(breaksPlayerAttackIntent({kind:'path'},{player:pos,target:enemy,destination:{x:1,z:12}}),false);
 assert.equal(breaksPlayerAttackIntent({kind:'path'},{player:pos,target:enemy,destination:{x:1,z:3}}),true,
  'long click breaks the target immediately');
 const track=createClassicCombatMovementIntent();
 assert.equal(track.step({movement:{kind:'manual'},start:pos,end:{x:1,z:9.3},target:enemy}),false);
 assert.equal(track.step({movement:{kind:'manual'},start:{x:1,z:9.3},end:{x:1,z:8.8},target:enemy}),false);
 assert.equal(track.step({movement:{kind:'manual'},start:{x:1,z:8.8},end:{x:1,z:8.4},target:enemy}),true,
  'sustained manual retreat disengages even when the enemy is still nearby');
});
test('leash stays independent of player attack intent after fleeing',()=>{
 const game=createClassicCombat({save:defaultSave(),random:()=>.01});
 const near={x:-12,z:90};
 step(game,near,2);
 assert.ok(game.getState().monsters.find(m=>m.id==='moss-a').aggro);
 game.chooseTarget('moss-a',near);
 game.stopTarget('player-movement');
 assert.equal(game.getState().targetId,null);
 step(game,{x:0,z:39},14);
 const mob=game.getState().monsters.find(m=>m.id==='moss-a');
 assert.equal(mob.aggro,false);
 assert.equal(mob.retreating,false);
 assert.ok(Math.hypot(mob.x-mob.startX,mob.z-mob.startZ)<.3);
});

test('combat movement intent tracks actual outward travel, not taps or strafing',()=>{
 const track=createClassicCombatMovementIntent();
 const target={x:0,z:2};
 assert.equal(track.step({movement:{kind:'manual'},start:{x:0,z:0},end:{x:.4,z:0},target}),false);
 assert.equal(track.step({movement:{kind:'manual'},start:{x:.4,z:0},end:{x:.8,z:0},target}),false);
 assert.ok(track.outwardTravel<.3,'circle strafing does not build up a false retreat');
 track.reset();
 assert.equal(track.step({movement:{kind:'manual'},start:{x:0,z:0},end:{x:0,z:-.7},target}),false);
 assert.equal(track.step({movement:{kind:'manual'},start:{x:0,z:-.7},end:{x:0,z:-.9},target}),false);
 assert.equal(track.step({movement:{kind:'manual'},start:{x:0,z:-.9},end:{x:0,z:-.8},target}),false);
 track.step({movement:{kind:'idle'},start:{x:0,z:-.8},end:{x:0,z:-.8},target});
 assert.equal(track.outwardTravel,0,'releasing movement resets retreat commitment');
 assert.equal(breaksPlayerAttackIntent({kind:'path'},{
  player:{x:0,z:0},target,destination:{x:0,z:-9}}),true);
 assert.equal(breaksPlayerAttackIntent({kind:'path'},{
  player:{x:0,z:0},target,destination:{x:0,z:-2}}),false);
 assert.equal(breaksPlayerAttackIntent({kind:'path'},{
  player:{x:0,z:0},target:{x:0,z:12},destination:{x:0,z:7}}),false,
  'long move directly towards enemy is a tactical approach, not an escape');
 assert.equal(breaksPlayerAttackIntent({kind:'path'},{
  player:{x:0,z:0},target:{x:0,z:5},destination:{x:5,z:5}}),false,
  'long movement around the target at equal range keeps engagement');
 const lateral=createClassicCombatMovementIntent();
 let previous={x:0,z:0};
 for(let x=.25;x<=3.01;x+=.25){
  const next={x,z:0};
  assert.equal(lateral.step({movement:{kind:'manual'},start:previous,end:next,target}),false,
   'extended sideways movement should not be mistaken for running away');
  previous=next;
 }
});
