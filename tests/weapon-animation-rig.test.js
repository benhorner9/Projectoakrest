import test from 'node:test';
import assert from 'node:assert/strict';
import {createActor,equipActor,animateActor} from '../src/actors.js';

const attack={start:0,impactAt:.5,interval:1.6};
test('longbow and shortbow physically draw a reused bowstring buffer on the real rig',()=>{
 for(const family of ['bow','shortbow']){
  const actor=createActor();
  equipActor(actor,'ranged',family,'leather');
  const string=actor.userData.bowString;
  assert.ok(string?.geometry?.isBufferGeometry);
  const geometry=string.geometry,positions=geometry.attributes.position.array,base=positions[5];
  animateActor(actor,{t:.32,dt:.016,attack,speed:0});
  assert.equal(actor.userData.bowString.geometry,geometry,'same retained geometry');
  assert.equal(string.geometry.attributes.position.array,positions,'no per-frame buffer allocation');
  assert.ok(positions[5]>base+.20,'drawable bowstring should visibly retract');
  animateActor(actor,{t:.60,dt:.016,attack,speed:0});
  assert.ok(positions[5]<base+.10,'string should return on actual release');
 }
});

test('crossbow mechanical catch and magic staff/wand focus reflect gameplay wind-up',()=>{
 for(const [style,family] of [['ranged','crossbow'],['magic','frost'],['magic','ember']]){
  const actor=createActor();
  equipActor(actor,style,family,'none');
  if(family==='crossbow'){
   assert.ok(actor.userData.crossbowSlider);
   const base=actor.userData.crossbowSlider.position.z;
   animateActor(actor,{t:.35,dt:.016,attack});
   assert.ok(actor.userData.crossbowSlider.position.z>base+.1);
  }else{
   assert.ok(actor.userData.magicFocus);
   animateActor(actor,{t:.35,dt:.016,attack});
   assert.ok(actor.userData.magicFocus.scale.x>1.05);
  }
 }
});

test('non-combat idle eases magic hands down without changing rig parts or saved customisation',()=>{
 const actor=createActor(),u=actor.userData;
 equipActor(actor,'magic','frost','none');
 for(let i=0;i<30;i++)animateActor(actor,{t:i/60,dt:1/60,combat:true});
 const ready=u.rightArm.rotation.x;
 for(let i=30;i<120;i++)animateActor(actor,{t:i/60,dt:1/60,combat:false});
 assert.ok(Math.abs(u.rightArm.rotation.x)<Math.abs(ready),'village stance should lower arm');
 assert.equal(u.weapon.children.length>0,true);
 const head=u.head,body=u.body;
 animateActor(actor,{t:2,dt:1/60,combat:false});
 assert.equal(u.head,head);assert.equal(u.body,body);
});

test('re-equipping clears stale animation anchors and rebuilds only current weapon',()=>{
 const actor=createActor(),u=actor.userData;
 equipActor(actor,'ranged','bow','none');
 const previous=u.bowString.geometry;
 equipActor(actor,'ranged','crossbow','none');
 assert.equal(u.bowString,null);
 assert.ok(u.crossbowSlider);
 assert.equal(previous.uuid===u.crossbowSlider.geometry.uuid,false);
 equipActor(actor,'melee','daggers','none');
 assert.equal(u.crossbowSlider,null);assert.equal(u.magicFocus,null);
 assert.ok(u.offhand.children.length>0,'dual wield offhand stays equipped');
});
