import test from 'node:test';
import assert from 'node:assert/strict';
import {freshCharacterSave} from '../src/rules.js';
import {createClassicCombat} from '../src/classic-combat.js';
import {findClassicInteractable} from '../src/classic-interactions.js';
import {teachWoodcutting} from '../src/town-services.js';
import {sanitizeAdventure} from '../src/adventure-content.js';
import {WOODCUTTING_LEVEL_XP} from '../src/woodcutting.js';
import {CURRENT_SKILL_CAP} from '../src/skill-cap.js';
import {skillXpLabel,skillLevelUpLabel,SKILL_LEVEL_CAP} from '../src/classic-skill-xp-floats.js';

const ready=()=>{
 const save=freshCharacterSave();
 save.onboarding.area='world';
 return save;
};
const gather=(c,id)=>{
 const target=findClassicInteractable(id);
 const player={x:target.x,z:target.z-1.6};
 return {result:c.adventureAction('gather',{target},player),player};
};

test('only supported non-combat skills create floating text or skill level banners',()=>{
 assert.equal(skillXpLabel({type:'skill-xp',skill:'woodcutting',amount:35}),'+35 Woodcutting XP');
 assert.equal(skillXpLabel({type:'skill-xp',skill:'cooking',amount:18}),'+18 Fieldcraft XP');
 assert.equal(skillXpLabel({type:'xp',skill:'woodcutting',amount:35}),null);
 assert.equal(skillXpLabel({type:'skill-xp',skill:'melee',amount:35}),null);
 assert.equal(skillXpLabel({type:'skill-xp',skill:'vitality',amount:35}),null);
 assert.equal(skillXpLabel({type:'skill-xp',skill:'mining',amount:0}),null);
 assert.equal(skillXpLabel({type:'skill-xp',skill:'foraging',amount:-1}),null);
 assert.equal(skillXpLabel({type:'skill-xp',skill:'inscription',amount:3.5}),null);
 assert.equal(skillLevelUpLabel({type:'skill-level-up',skill:'woodcutting',level:4}),`Woodcutting 4/${SKILL_LEVEL_CAP}`);
 assert.equal(skillLevelUpLabel({type:'skill-level-up',skill:'magic',level:4}),null);
 assert.equal(skillLevelUpLabel({type:'xp',skill:'woodcutting',level:4}),null);
 assert.equal(skillLevelUpLabel({type:'skill-level-up',skill:'woodcutting',level:0}),null);
 assert.equal(SKILL_LEVEL_CAP,CURRENT_SKILL_CAP);
});

test('one successful chop awards one float and a correct 3-to-4 skill level event',()=>{
 const save=ready();teachWoodcutting(save);
 save.professions.woodcuttingXp=WOODCUTTING_LEVEL_XP[4]-35;
 const c=createClassicCombat({save,adventure:true,random:()=>0});
 const {result,player}=gather(c,'adventure:softwood');
 assert.equal(result.ok,true,result.reason);
 const events=[];
 for(let i=0;i<14;i++)events.push(...c.tick(.1,player));
 const skills=events.filter(e=>e.type==='skill-xp');
 assert.equal(skills.length,1);
 assert.equal(skills[0].skill,'woodcutting');
 assert.equal(skills[0].amount,35);
 const levels=events.filter(e=>e.type==='skill-level-up');
 assert.equal(levels.length,1);
 assert.deepEqual([levels[0].skill,levels[0].previousLevel,levels[0].level],['woodcutting',3,4]);
 assert.equal(c.persistentSave().professions.woodcuttingXp,WOODCUTTING_LEVEL_XP[4]);
 assert.deepEqual(c.tick(0,player).filter(e=>e.type==='skill-xp'||e.type==='skill-level-up'),[]);
});

test('failed or interrupted work, capped XP and resource recovery never invent skill XP',()=>{
 const save=ready();teachWoodcutting(save);
 save.professions.woodcuttingXp=200000000;
 const c=createClassicCombat({save,adventure:true,random:()=>0});
 const {result,player}=gather(c,'adventure:softwood');
 assert.equal(result.ok,true,result.reason);
 const capped=c.tick(1.3,player);
 assert.equal(capped.some(e=>e.type==='skill-xp'||e.type==='skill-level-up'),false);
 assert.equal(c.persistentSave().professions.woodcuttingXp,200000000);
 // At the same target, the tree is on cooldown.
 assert.equal(gather(c,'adventure:softwood').result.ok,false);
 assert.equal(c.tick(0,player).some(e=>e.type==='skill-xp'),false);
 const another=ready();teachWoodcutting(another);
 const x=createClassicCombat({save:another,adventure:true,random:()=>0});
 const started=gather(x,'adventure:softwood');
 assert.equal(started.result.ok,true);
 const far={x:0,z:39};
 assert.equal(x.tick(2,far).some(e=>e.type==='skill-xp'),false);
 assert.equal(x.persistentSave().professions.woodcuttingXp,0);
});

test('successful backpack craft emits exact fletching gain and level event, failures emit neither',()=>{
 const save=ready();
 save.inventory.materials={'softwood-logs':1};
 save.adventure=sanitizeAdventure(save.adventure);
 save.adventure.skills.fletching=WOODCUTTING_LEVEL_XP[2]-18;
 const c=createClassicCombat({save,adventure:true,random:()=>0});
 const player={x:0,z:39};
 assert.equal(c.adventureAction('craft',{choice:'arrows'},player).ok,true);
 const events=c.tick(0,player);
 assert.deepEqual(events.filter(e=>e.type==='skill-xp').map(e=>[e.skill,e.amount]),[['fletching',18]]);
 assert.deepEqual(events.filter(e=>e.type==='skill-level-up').map(e=>[e.skill,e.level]),[['fletching',2]]);
 assert.equal(c.adventureAction('craft',{choice:'arrows'},player).ok,false);
 assert.equal(c.tick(0,player).filter(e=>e.type==='skill-xp'||e.type==='skill-level-up').length,0);
 assert.equal(c.persistentSave().adventure.skills.fletching,WOODCUTTING_LEVEL_XP[2]);
});
