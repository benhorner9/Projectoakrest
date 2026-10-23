import test from 'node:test';
import assert from 'node:assert/strict';
import {createSkinnedOakrestHero} from '../src/skeletal-character.js';
import {selectSkeletalLocomotion,createSkeletalMotionController} from '../src/skeletal-motion-controller.js';
test('all locomotion directions and turn/ready states select authored animations',()=>{
 assert.equal(selectSkeletalLocomotion({speed:0,combat:false}),'Idle');
 assert.equal(selectSkeletalLocomotion({speed:0,combat:true}),'Ready');
 assert.equal(selectSkeletalLocomotion({turn:.6}),'TurnRight');
 assert.equal(selectSkeletalLocomotion({turn:-.6}),'TurnLeft');
 assert.equal(selectSkeletalLocomotion({speed:1.4}),'Walk');
 assert.equal(selectSkeletalLocomotion({speed:4.1}),'Run');
 assert.equal(selectSkeletalLocomotion({speed:2,backwards:true}),'Backstep');
 assert.equal(selectSkeletalLocomotion({speed:2,side:-1}),'StrafeLeft');
 assert.equal(selectSkeletalLocomotion({speed:2,side:1}),'StrafeRight');
});
test('authoritative combat follows reaction/death priority, then safe locomotion recovery',()=>{
 const hero=createSkinnedOakrestHero(),controller=createSkeletalMotionController(hero),pos=hero.root.position.clone();
 for(const family of ['sword','daggers','greatsword','bow','shortbow','crossbow','frost','ember']){
  assert.ok(controller.equipFamily(family));
  const visual=controller.tick({family,abilityId:'w0',t:10.2,
   attack:{id:family+'-test',start:10,impactAt:10.2,interval:.5},dt:.016,speed:0});
  assert.equal(visual.priority,'attack');
  assert.equal(visual.sample.contact,true);
  assert.deepEqual(hero.root.position.toArray(),pos.toArray());
 }
 assert.equal(controller.tick({dead:true,hit:true,dodge:true,dt:.016}).priority,'death');
 assert.equal(controller.state,'Death');
 assert.equal(controller.tick({hit:true,dodge:true,dt:.016}).priority,'hit');
 assert.equal(controller.state,'Hit');
 assert.equal(controller.tick({dodge:true,dt:.016}).priority,'dodge');
 assert.equal(controller.tick({working:true,dt:.016}).priority,'work');
 assert.equal(controller.tick({speed:3.2,dt:.016}).state,'Run');
 assert.equal(controller.tick({speed:0,combat:true,dt:.016}).state,'Ready');
 assert.throws(()=>controller.equipFamily('halberd'),/Unknown weapon family/);
 hero.dispose();
});
test('instant gameplay spells have immediate visible response, no fabricated anticipatory beat',()=>{
 const hero=createSkinnedOakrestHero(),controller=createSkeletalMotionController(hero);
 const instance=controller.tick({family:'ember',abilityId:'w3',t:5,
  attack:{id:'heal',start:5,impactAt:5,interval:.4},dt:.01});
 assert.equal(instance.priority,'attack');
 assert.equal(instance.sample.phase,'instant');
 assert.equal(instance.sample.contact,true);
 assert.equal(hero.equipment.parent,hero.bones.get('RightHand'));
 hero.dispose();
});
