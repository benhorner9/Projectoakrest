import test from 'node:test';
import assert from 'node:assert/strict';
import {CURRENT_SKILL_CAP,SKILL_FUTURE_TEASERS} from '../src/skill-cap.js';
import {freshCharacterSave,validSave,levelFromXp,xpProgress,COMBAT_SKILL_XP_CAP} from '../src/rules.js';
import {WOODCUTTING_LEVEL_XP,WOODCUTTING_CHAPTER_XP_CAP,woodcuttingLevel,woodcuttingProgress,canCutTree,bestWoodcuttingAxe} from '../src/woodcutting.js';
import {CLASSIC_SKILLS,skillBookSnapshot} from '../src/classic-skill-catalogue.js';
import {awardMonsterVictory} from '../src/gameplay-core.js';

test('current skills end at 60; existing XP above chapter threshold survives migration',()=>{
 assert.equal(CURRENT_SKILL_CAP,60);
 assert.equal(WOODCUTTING_CHAPTER_XP_CAP,WOODCUTTING_LEVEL_XP[60]);
 assert.equal(levelFromXp(COMBAT_SKILL_XP_CAP-1).level,59);
 assert.equal(levelFromXp(COMBAT_SKILL_XP_CAP).level,60);
 assert.equal(levelFromXp(COMBAT_SKILL_XP_CAP*100).level,60);
 assert.equal(xpProgress(COMBAT_SKILL_XP_CAP).maxed,true);
 assert.equal(xpProgress(COMBAT_SKILL_XP_CAP).progress,1);
 assert.equal(woodcuttingLevel(WOODCUTTING_LEVEL_XP[60]-1).level,59);
 assert.equal(woodcuttingLevel(WOODCUTTING_LEVEL_XP[60]).level,60);
 assert.equal(woodcuttingProgress(WOODCUTTING_LEVEL_XP[85]).level,60);
 assert.equal(woodcuttingProgress(WOODCUTTING_LEVEL_XP[85]).maxed,true);
 const original=freshCharacterSave();
 original.xp.melee=COMBAT_SKILL_XP_CAP+8000;
 original.professions.woodcuttingXp=WOODCUTTING_LEVEL_XP[85];
 const loaded=validSave(original);
 assert.equal(loaded.xp.melee,original.xp.melee);
 assert.equal(loaded.professions.woodcuttingXp,original.professions.woodcuttingXp);
 assert.equal(levelFromXp(loaded.xp.melee).level,60);
 assert.equal(woodcuttingLevel(loaded.professions.woodcuttingXp).level,60);
});

test('every skill book shows live <=60 milestones and separate locked 60+ chapter teases',()=>{
 const save=freshCharacterSave();
 const list=skillBookSnapshot(save);
 assert.equal(list.length,CLASSIC_SKILLS.length);
 for(const s of list){
  assert.equal(s.cap,60,s.id);
  assert.ok(s.milestones.every(m=>m.level<=60),s.id+' must not count sealed content as live');
  assert.ok(s.future.length>=1,s.id+' needs an aspirational preview');
  assert.ok(s.future.every(m=>m.level>60&&m.previewOnly===true),s.id);
  assert.equal(s.available,s.milestones.filter(m=>m.level<=s.level).length);
  assert.ok(!s.next||s.next.level<=60);
 }
 const wood=list.find(x=>x.id==='woodcutting');
 assert.ok(wood.future.some(m=>m.level===70&&m.name==='Moonwood Tree'));
 assert.ok(wood.future.some(m=>m.level===70&&m.name==='Cobalt Axe'));
 assert.ok(wood.future.some(m=>m.level===85&&m.name==='Elderwood Tree'));
 assert.ok(wood.future.some(m=>m.level===85&&m.name==='Pryrite Axe'));
 assert.ok(wood.future.every(m=>m.authoritative===true),'only authored woodcutting items previewed');
 for(const [id,teasers] of Object.entries(SKILL_FUTURE_TEASERS)){
  const s=list.find(x=>x.id===id);
  assert.ok(s.future.every(x=>x.authoritative===false),id);
  assert.ok(teasers.length);
 }
});

test('future trees and axes remain unobtainable even with legacy XP above 60',()=>{
 const save=freshCharacterSave();
 save.professions.woodcuttingLearned=true;
 save.professions.woodcuttingXp=WOODCUTTING_LEVEL_XP[90];
 save.inventory.weapons.melee=['bronze-axe','cobalt-axe','pryrite-axe'];
 assert.equal(woodcuttingLevel(save.professions.woodcuttingXp).level,60);
 assert.ok(!['cobalt-axe','pryrite-axe'].includes(bestWoodcuttingAxe(save)?.id));
 for(const tree of ['moonwood','elderwood']){
  const result=canCutTree(save,tree);
  assert.equal(result.ok,false);
  assert.match(result.reason,/requires Woodcutting level/);
 }
});

test('combat and Health earn no XP above current chapter ceiling',()=>{
 const save=freshCharacterSave();
 save.xp.melee=COMBAT_SKILL_XP_CAP-5;
 save.xp.vitality=COMBAT_SKILL_XP_CAP-1;
 const first=awardMonsterVictory(save,'boar','melee',46);
 assert.equal(first.awarded,true);
 assert.equal(first.amount,5);
 assert.equal(save.xp.melee,COMBAT_SKILL_XP_CAP);
 assert.equal(save.xp.vitality,COMBAT_SKILL_XP_CAP);
 const repeat=awardMonsterVictory(save,'boar','melee',46);
 assert.equal(repeat.amount,0);
 assert.equal(save.xp.melee,COMBAT_SKILL_XP_CAP);
 assert.equal(save.xp.vitality,COMBAT_SKILL_XP_CAP);
});
