import test from 'node:test';
import assert from 'node:assert/strict';
import {CURRENT_SKILL_CAP,futureSkillTeasers} from '../src/skill-cap.js';
import {freshCharacterSave,levelFromXp,xpProgress,COMBAT_SKILL_XP_CAP} from '../src/rules.js';
import {WOODCUTTING_LEVEL_XP,woodcuttingLevel,WOODCUTTING_CHAPTER_XP_CAP,canCutTree} from '../src/woodcutting.js';
import {CLASSIC_SKILLS,skillBookSnapshot} from '../src/classic-skill-catalogue.js';
import {createClassicCombat} from '../src/classic-combat.js';
import {sanitizeAdventure} from '../src/adventure-content.js';

test('current chapter caps every combat and noncombat skill at 60 and preserves older XP',()=>{
 assert.equal(CURRENT_SKILL_CAP,60);
 assert.equal(woodcuttingLevel(WOODCUTTING_LEVEL_XP[60]).level,60);
 assert.equal(woodcuttingLevel(200000000).level,60);
 assert.equal(woodcuttingLevel(200000000).totalXp,200000000);
 assert.equal(woodcuttingLevel(200000000).maxed,true);
 assert.equal(levelFromXp(COMBAT_SKILL_XP_CAP).level,60);
 assert.equal(levelFromXp(200000000).level,60);
 assert.equal(xpProgress(200000000).maxed,true);
 assert.equal(WOODCUTTING_CHAPTER_XP_CAP,WOODCUTTING_LEVEL_XP[60]);
});

test('all skills preview future chapters without implying an unlock beyond the live cap',()=>{
 const save=freshCharacterSave();
 const skills=skillBookSnapshot(save);
 assert.deepEqual(skills.map(s=>s.id),CLASSIC_SKILLS.map(s=>s.id));
 for(const skill of skills){
  assert.equal(skill.cap,60,skill.id);
  assert.ok(skill.milestones.every(m=>m.level<=60),skill.id);
  assert.ok(skill.future.length,skill.id);
  assert.ok(skill.future.every(m=>m.level>60&&m.previewOnly===true),skill.id);
  assert.ok(!skill.next||skill.next.level<=60,skill.id);
 }
 const wood=skills.find(s=>s.id==='woodcutting');
 assert.ok(wood.future.some(m=>m.name.includes('Moonwood')&&m.level===70));
 assert.ok(wood.future.some(m=>m.name.includes('Elderwood')&&m.level===85));
 assert.ok(!wood.milestones.some(m=>m.name.includes('Elderwood')));
 assert.ok(futureSkillTeasers('mining')[0].authoritative===false);
});

test('capped woodcutting never unlocks future tree tiers or banks new XP',()=>{
 const save=freshCharacterSave();
 save.professions.woodcuttingLearned=true;
 save.inventory.weapons.melee.push('bronze-axe');
 save.professions.woodcuttingXp=WOODCUTTING_LEVEL_XP[60];
 assert.equal(canCutTree(save,'moonwood').ok,false);
 assert.equal(canCutTree(save,'elderwood').ok,false);
 const combat=createClassicCombat({save,adventure:true,random:()=>0});
 const player={x:-20,z:101.4};
 const target={id:'adventure:softwood',x:-20,z:103,kind:'resource',reach:3.1,material:'softwood-logs',profession:'woodcutting',seconds:1.18};
 assert.equal(combat.adventureAction('gather',{target},player).ok,true);
 for(let i=0;i<90;i++)combat.tick(1/60,player);
 assert.equal(combat.persistentSave().professions.woodcuttingXp,WOODCUTTING_LEVEL_XP[60]);
});

test('a capped combat-style victory never banks XP past the chapter',()=>{
 const save=freshCharacterSave();
 save.xp.melee=COMBAT_SKILL_XP_CAP;
 save.xp.vitality=COMBAT_SKILL_XP_CAP;
 const combat=createClassicCombat({save,adventure:true,random:()=>0});
 assert.equal(combat.getState().progression.melee,COMBAT_SKILL_XP_CAP);
 assert.equal(combat.getState().progression.vitality,COMBAT_SKILL_XP_CAP);
});
