import test from 'node:test';
import assert from 'node:assert/strict';
import {skillVisualFrame,applySkillTreeVisual,VISUAL_SKILLS} from '../src/classic-skill-visuals.js';

test('every existing making and gathering profession has a real visual frame',()=>{
 assert.deepEqual(VISUAL_SKILLS,[
  'woodcutting','mining','foraging','blacksmithing','fletching','inscription','cooking'
 ]);
 for(const skill of VISUAL_SKILLS){
  const work={skill,start:10,end:12,targetId:'resource:one',x:3,z:4};
  assert.equal(skillVisualFrame({work},10.1).pose,'work-raise');
  assert.equal(skillVisualFrame({work},11).pose,'work-contact');
  assert.equal(skillVisualFrame({work},11.9).pose,'work-recover');
  assert.equal(skillVisualFrame({work},11).skill,skill);
  assert.deepEqual(skillVisualFrame({work},11).target,{x:3,z:4});
 }
});

test('a cancelled or expired work action immediately restores idle visuals',()=>{
 const work={skill:'woodcutting',start:4,end:5,targetId:'grove:tree'};
 assert.equal(skillVisualFrame({work},4.5).kind,'working');
 assert.equal(skillVisualFrame({work:null},4.5),null);
 assert.equal(skillVisualFrame({work},5.01),null);
 assert.equal(skillVisualFrame({work:{skill:'unknown',start:4,end:5}},4.5),null);
});

test('successful instant backpack crafts have an 850ms visual without affecting saved state',()=>{
 const event={recentCraft:{skill:'inscription',time:30}};
 assert.equal(skillVisualFrame(event,29.9),null);
 assert.equal(skillVisualFrame(event,30.1).pose,'work-raise');
 assert.equal(skillVisualFrame(event,30.4).pose,'work-contact');
 assert.equal(skillVisualFrame(event,30.8).pose,'work-recover');
 assert.equal(skillVisualFrame(event,30.86),null);
 assert.deepEqual(event,{recentCraft:{skill:'inscription',time:30}});
});

test('trees shake while chopping, tip from the base on final log, then regrow',()=>{
 const tree={userData:{interactId:'grove:one'},visible:true,rotation:{x:0,z:0}};
 const stump={visible:false};
 const active={skill:'woodcutting',targetId:'grove:one',pose:'work-contact',progress:.53};
 applySkillTreeVisual(tree,stump,null,active,4);
 assert.notEqual(tree.rotation.z,0);
 assert.equal(stump.visible,false);
 const status={fallAt:5,respawnAt:30};
 applySkillTreeVisual(tree,stump,status,null,5.5);
 assert.equal(tree.visible,true);
 assert.ok(tree.rotation.z>.2);
 applySkillTreeVisual(tree,stump,status,null,6);
 assert.equal(tree.visible,false);
 assert.equal(stump.visible,true);
 applySkillTreeVisual(tree,stump,status,null,30);
 assert.equal(tree.visible,true);
 assert.equal(stump.visible,false);
 assert.equal(tree.rotation.z,0);
});
