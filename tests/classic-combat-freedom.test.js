import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultSave} from '../src/rules.js';
import {createClassicCombat} from '../src/classic-combat.js';
import {combatApproachPoint,breaksPlayerAttackIntent} from '../src/classic-combat-intent.js';

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
test('disengaging preserves attack rate and does not refund a fired projectile',()=>{
 const game=createClassicCombat({save:defaultSave(),random:()=>.01});
 const player={x:-1,z:69};
 assert.equal(game.chooseTarget('practice',player),true);
 step(game,player,.03);game.stopTarget();
 const attackUntil=game.getState().attackUntil;
 assert.ok(attackUntil>0);
 assert.equal(game.chooseTarget('practice',player),true);
 assert.equal(game.tick(.01,player).some(e=>e.type==='windup'),false,'no attack-speed exploit from switching targets');
});
test('approach stops at weapon reach while manual input breaks combat pursuit',()=>{
 const pos={x:1,z:10},enemy={x:1,z:20};
 const approach=combatApproachPoint(pos,enemy,2.2);
 assert.ok(approach.z<enemy.z);
 assert.ok(Math.abs(enemy.z-approach.z-1.75)<1e-8);
 assert.equal(combatApproachPoint({x:1,z:19},enemy,2.2),null);
 assert.equal(breaksPlayerAttackIntent({kind:'manual'}),true);
 assert.equal(breaksPlayerAttackIntent({kind:'path'}),false,'initial click-to-attack walk is not cancelled');
 assert.equal(breaksPlayerAttackIntent({kind:'idle'}),false);
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
