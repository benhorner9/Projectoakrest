import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {skeletalAbilityCatalogue,skeletalAbilityName,skeletalAbilitySpec,buildSkeletalAbilityClips,
 createSkeletalAbilityClip,sampleSkeletalAbilityTime} from '../src/skeletal-ability-library.js';
import {createSkinnedOakrestHero} from '../src/skeletal-character.js';
const catalogue=skeletalAbilityCatalogue();
test('all 56 existing combat specifications receive a distinct authored skeletal clip',()=>{
 assert.equal(catalogue.length,56,'8 weapon families × 7 actions');
 const clips=buildSkeletalAbilityClips();
 assert.equal(clips.length,56);
 assert.equal(new Set(clips.map(c=>c.name)).size,56);
 assert.deepEqual(new Set(catalogue.map(s=>s.family)),new Set(['sword','daggers','greatsword','bow','shortbow','crossbow','frost','ember']));
 for(let i=0;i<catalogue.length;i++){
  const spec=catalogue[i],clip=clips[i];
  assert.equal(clip.name,skeletalAbilityName(spec.family,spec.abilityId));
  assert.equal(clip.userData.visualOnly,true);
  assert.equal(clip.userData.sourceEvent,spec.event, 'event metadata must be preserved');
  assert.ok(clip.tracks.length>=23,spec.id+': full skeleton choreography');
  assert.equal(clip.tracks.some(t=>/Root\.(position|quaternion)/.test(t.name)),false,'no animated gameplay root');
  assert.ok(clip.duration>0&&Number.isFinite(clip.duration));
  for(const t of clip.tracks){
   assert.match(t.name,/\.quaternion$/);
   assert.equal(t.times.length*4,t.values.length);
   assert.ok([...t.times].every(Number.isFinite)&&[...t.values].every(Number.isFinite),spec.id);
   for(let k=1;k<t.times.length;k++)assert.ok(t.times[k]>t.times[k-1],spec.id+' keyframe times strictly increase');
   for(let k=0;k<t.values.length;k+=4){
    const q=t.values.slice(k,k+4),length=Math.hypot(...q);
    assert.ok(Math.abs(length-1)<.00001,'normalised quaternion');
   }
  }
 }
});
test('each weapon family has seven distinguishable action silhouettes even without VFX',()=>{
 const clips=buildSkeletalAbilityClips();
 for(const family of new Set(catalogue.map(s=>s.family))){
  const familyClips=clips.filter(c=>c.name.startsWith('Ability/'+family+':'));
  assert.equal(familyClips.length,7);
  const signatures=familyClips.map(clip=>JSON.stringify(clip.tracks
   .filter(t=>/^(Chest|RightUpperArm|LeftUpperArm)\.quaternion$/.test(t.name))
   .map(t=>[t.name,[...t.values].map(n=>Math.round(n*1000)/1000)])));
  assert.equal(new Set(signatures).size,7,family+' all seven actions need individual authored movements');
 }
});
test('all time mapping derives from real simulation timestamps, including early cancellation',()=>{
 for(const spec of catalogue){
  const start=17,impactAt=start+spec.anticipation*1.3,duration=Math.max(.5,spec.anticipation*1.9+.43);
  const action={start,impactAt,interval:duration};
  assert.equal(sampleSkeletalAbilityTime(spec,action,start-.001),null);
  assert.equal(sampleSkeletalAbilityTime(spec,action,start+duration),null);
  const a=sampleSkeletalAbilityTime(spec,action,start);
  assert.ok(a?.visualOnly);
  assert.equal(a.contact,spec.instant,'instant abilities occur at start');
  if(!spec.instant){
   const early=sampleSkeletalAbilityTime(spec,action,start+(impactAt-start)*.55);
   const contact=sampleSkeletalAbilityTime(spec,action,impactAt);
   assert.equal(early.contact,false,spec.id);
   assert.equal(early.phase,'anticipation');
   assert.equal(contact.contact,true,spec.id);
   assert.ok(Math.abs(contact.time-contact.impact)<.00001,spec.id+' exactly impacts on clock');
  }else{
   assert.equal(a.time,0,'instant effects cannot have a fictional windup');
  }
  assert.ok(sampleSkeletalAbilityTime(spec,action,start+duration-.00001).time<a.clip.length+100,'finite sample');
 }
 assert.equal(sampleSkeletalAbilityTime(catalogue[0],{start:0,impactAt:0,interval:-1},0),null);
 assert.equal(sampleSkeletalAbilityTime(catalogue[0],{start:0,impactAt:NaN,interval:1},0),null);
});
test('special casts, defence, multishot and melee executions alter actual skeleton bones',()=>{
 const hero=createSkinnedOakrestHero(),originalRoot=hero.root.position.clone();
 const cases=[['sword','w3'],['daggers','w1'],['greatsword','w0'],['bow','w1'],
  ['shortbow','w3'],['crossbow','w0'],['crossbow','w3'],['frost','w1'],
  ['frost','w2'],['frost','w3'],['ember','w1'],['ember','w3']];
 for(const [family,id] of cases){
  const spec=skeletalAbilitySpec(family,id);
  assert.ok(spec);
  const clip=createSkeletalAbilityClip(spec),start=10,impactAt=start+spec.anticipation,interval=Math.max(.45,clip.duration);
  const t=spec.instant?start:impactAt;
  const sample=hero.sampleAbility(family,id,{start,impactAt,interval},t);
  assert.equal(sample.contact,true);
  assert.equal(sample.clip,skeletalAbilityName(family,id));
  assert.deepEqual(hero.root.position.toArray(),originalRoot.toArray(),'no movement authority');
  hero.root.updateMatrixWorld(true);
  for(const b of hero.skeleton.bones)assert.ok(b.matrixWorld.elements.every(Number.isFinite),b.name);
 }
 assert.throws(()=>hero.playAbility('frost','nonexistent'),/Unmapped Oakrest ability/);
 hero.dispose();
});
test('every combat source uses actual hand-bone attachments throughout ability transitions',()=>{
 const hero=createSkinnedOakrestHero(),left=hero.bones.get('LeftHand'),right=hero.bones.get('RightHand');
 const equipped={sword:'sword',daggers:'dagger',greatsword:'greatsword',bow:'bow',
  shortbow:'bow',crossbow:'crossbow',frost:'staff',ember:'wand'};
 for(const family of Object.keys(equipped)){
  hero.equip(equipped[family]);
  for(const row of catalogue.filter(s=>s.family===family)){
   hero.playAbility(family,row.abilityId,{fade:.05});
   hero.update(.05);
   assert.equal(hero.equipment.parent,right);
   assert.equal(hero.offhand.parent,left);
   assert.ok(hero.mesh.isSkinnedMesh);
  }
 }
 hero.dispose();
});
