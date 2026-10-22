import test from 'node:test';
import assert from 'node:assert/strict';
import {createActor,equipActor,animateActor} from '../src/actors.js';
import {KAYKIT_CLIPS,KAYKIT_BONES} from '../src/kaykit-clips.js';
import {kayKitClipNames,kayKitClipFor,kayKitMotionState,restoreKayKitPose} from '../src/kaykit-motion.js';

test('CC0 KayKit curve library contains every required weapon and response family',()=>{
 const expected=[
  'Melee_1H_Attack_Chop','Melee_2H_Attack_Chop','Melee_Dualwield_Attack_Slice',
  'Ranged_Bow_Draw','Ranged_Bow_Release','Ranged_2H_Shoot',
  'Ranged_Magic_Spellcasting','Dodge_Forward','Hit_A','Death_A','Walking_A','Running_A'
 ];
 assert.equal(KAYKIT_BONES.length,10);
 assert.ok(kayKitClipNames().length>=30);
 for(const name of expected)assert.ok(KAYKIT_CLIPS[name],name);
 for(const [name,clip] of Object.entries(KAYKIT_CLIPS)){
  assert.ok(clip.seconds>0&&clip.frames.length>=3,name);
  for(const row of clip.frames){
   assert.equal(row.length,KAYKIT_BONES.length*4,name);
   assert.ok(row.every(Number.isFinite),name);
  }
  for(let i=0;i<KAYKIT_BONES.length;i++)
   assert.deepEqual(clip.frames[0].slice(i*4,i*4+4),[0,0,0,1],name+' starts neutral additive');
 }
});

test('KayKit weapon and ability clips match the equipped family and actual action state',()=>{
 assert.equal(kayKitClipFor('sword','overhand'),'Melee_1H_Attack_Chop');
 assert.equal(kayKitClipFor('greatsword','overhand'),'Melee_2H_Attack_Chop');
 assert.equal(kayKitClipFor('daggers','slice'),'Melee_Dualwield_Attack_Slice');
 assert.equal(kayKitClipFor('bow',null,'windup'),'Ranged_Bow_Draw');
 assert.equal(kayKitClipFor('bow',null,'release'),'Ranged_Bow_Release');
 assert.equal(kayKitClipFor('frost','bind'),'Ranged_Magic_Summon');
 const attack={start:10,impactAt:10.3,interval:1};
 assert.equal(kayKitMotionState({t:10.2,attack:{...attack,family:'bow'}}).clip,'Ranged_Bow_Draw');
 assert.equal(kayKitMotionState({t:10.4,attack:{...attack,family:'bow'}}).clip,'Ranged_Bow_Release');
 assert.equal(kayKitMotionState({t:10.4,attack:{...attack,family:'greatsword',abilityKind:'overhand'}}).clip,'Melee_2H_Attack_Chop');
 assert.equal(kayKitMotionState({t:10.2,attack:{...attack,family:'bow'},chopping:{start:10}}),null,'woodcutting remains independent');
});

test('motion layering never accumulates offsets or replaces the player rig and equipment',()=>{
 const actor=createActor(),u=actor.userData;
 equipActor(actor,'melee','sword','leather');
 const weapon=u.weapon,body=u.body,head=u.head;
 const opts={dt:1/60,t:4.3,attack:{start:4,impactAt:4.35,interval:1.1,abilityKind:'overhand'},stride:0,speed:0};
 animateActor(actor,opts);
 assert.equal(actor.userData.weapon,weapon);
 assert.equal(actor.userData.body,body);
 assert.equal(actor.userData.head,head);
 assert.equal(u.kaykitOffsets.length,10);
 const active=u.kaykitOffsets.some(q=>Math.abs(q.w-1)>.001||Math.abs(q.x)+Math.abs(q.y)+Math.abs(q.z)>.001);
 assert.ok(active,'source KayKit joint movement is actually applied');
 restoreKayKitPose(u);
 assert.ok(u.kaykitOffsets.every(q=>q.x===0&&q.y===0&&q.z===0&&q.w===1));
 animateActor(actor,opts);
 const snapshot=u.rightArm.quaternion.clone();
 restoreKayKitPose(u);
 animateActor(actor,opts);
 assert.ok(Math.abs(snapshot.dot(u.rightArm.quaternion))>.9999,'replaying same frame is stable');
 u.kaykitDisabled=true;
 restoreKayKitPose(u);
 animateActor(actor,opts);
 assert.ok(u.kaykitOffsets.every(q=>q.x===0&&q.y===0&&q.z===0&&q.w===1),'QA comparison disables only KayKit overlay');
});
