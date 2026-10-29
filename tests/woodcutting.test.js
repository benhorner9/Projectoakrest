import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {freshCharacterSave,validSave} from '../src/rules.js';
import {teachWoodcutting,bankMaterials} from '../src/town-services.js';
import {CURRENT_SKILL_CAP} from '../src/skill-cap.js';
import {registerWorldObstacle,removeWorldObstacle,blocked,clearWorldObstacles} from '../src/terrain.js';
import {createWoodcuttingTree} from '../src/woodcutting-art.js';
import {
 TREE_SPECIES,TREE_BY_ID,WOODCUTTING_AXES,WOODCUTTING_LEVEL_XP,
 woodcuttingLevel,woodcuttingProgress,woodcuttingMilestones,bestWoodcuttingAxe,harvestChance,newTreeState,chopOnce,woodcuttingCycleSeconds,
 respawnTree,canCutTree,inventoryCanHoldLog
} from '../src/woodcutting.js';

test('seven distinct tree and axe tiers have usable progression',()=>{
 assert.deepEqual(TREE_SPECIES.map(s=>s.level),[1,10,20,35,50,70,85]);
 assert.deepEqual(WOODCUTTING_AXES.map(a=>a.level),[1,10,20,35,50,70,85]);
 assert.equal(new Set(TREE_SPECIES.map(s=>s.shape)).size,7);
 assert.equal(new Set(TREE_SPECIES.map(s=>s.logId)).size,7);
 assert.ok(WOODCUTTING_LEVEL_XP[99]>13_000_000);
 assert.equal(woodcuttingLevel(WOODCUTTING_LEVEL_XP[99]).level,CURRENT_SKILL_CAP);
 assert.equal(woodcuttingLevel(WOODCUTTING_LEVEL_XP[85]).level,CURRENT_SKILL_CAP);
 assert.equal(woodcuttingLevel(WOODCUTTING_LEVEL_XP[20]-1).level,19);
});

test('axeless woodcutters are refused, trainer gives Bronze and higher trees stay locked',()=>{
 const d=freshCharacterSave();
 assert.equal(canCutTree(d,'softwood').ok,false);
 assert.ok(teachWoodcutting(d));
 assert.equal(bestWoodcuttingAxe(d).id,'bronze-axe');
 assert.equal(canCutTree(d,'softwood').ok,true);
 assert.equal(canCutTree(d,'elderwood').ok,false);
 d.inventory.weapons.melee.push('pryrite-axe');
 assert.equal(bestWoodcuttingAxe(d).id,'bronze-axe','cannot use an advanced axe at level one');
 d.professions.woodcuttingXp=WOODCUTTING_LEVEL_XP[85];
 assert.equal(bestWoodcuttingAxe(d).id,'bronze-axe','future axes remain sealed at the chapter cap');
 assert.equal(canCutTree(d,'elderwood').ok,false);
 d.inventory.weapons.melee.push('safferite-axe');
 assert.equal(bestWoodcuttingAxe(d).id,'safferite-axe','live level-50 axe remains usable');
});

test('higher-tier axes significantly outperform bronze on familiar low-level trees',()=>{
 const softwood=TREE_BY_ID.softwood;
 const bronze=WOODCUTTING_AXES[0],pryrite=WOODCUTTING_AXES.at(-1);
 const level=85;
 assert.ok(harvestChance(level,pryrite,softwood)-harvestChance(level,bronze,softwood)>.30);
 assert.ok(harvestChance(level,bronze,softwood)>harvestChance(1,bronze,softwood));
 assert.ok(harvestChance(85,pryrite,TREE_BY_ID.elderwood)<harvestChance(85,pryrite,softwood));
});

test('Woodcutting attempt timing is bounded, variable and not tied to log drop chance',()=>{
 const low=woodcuttingCycleSeconds(()=>0),mid=woodcuttingCycleSeconds(()=>.5),
  high=woodcuttingCycleSeconds(()=>.999999);
 assert.ok(low>=.8&&high<=2);
 assert.ok(low<mid&&mid<high,'each attempt draws a fresh independent interval');
 assert.equal(woodcuttingCycleSeconds(()=>-20),low);
 assert.ok(Math.abs(woodcuttingCycleSeconds(()=>20)-high)<.00001);
 assert.ok(woodcuttingCycleSeconds(()=>NaN)>low);
});

test('a tree yields exactly 1–5 logs, falls only after final log and respawns within 15–60s',()=>{
 const d=freshCharacterSave();teachWoodcutting(d);
 const one=newTreeState('softwood',()=>0);
 const five=newTreeState('softwood',()=>.999999);
 assert.equal(one.logs,1);assert.equal(five.logs,5);
 const success=chopOnce(d,one,100,()=>0);
 assert.equal(success.ok,true);assert.equal(success.success,true);
 assert.equal(success.depleted,true);assert.equal(d.inventory.materials['softwood-logs'],1);
 assert.equal(d.professions.woodcuttingXp,TREE_BY_ID.softwood.xp);
 assert.ok(one.respawnAt>=115&&one.respawnAt<=160);
 assert.equal(chopOnce(d,one,101,()=>0).ok,false,'depleted trees cannot be exploited');
 assert.equal(respawnTree(one,114,()=>.5),false);
 assert.equal(respawnTree(one,115,()=>.5),true);
 assert.equal(one.logs,3);
 assert.equal(one.respawnAt,0);
 for(let i=0;i<4;i++)assert.equal(chopOnce(d,five,180+i,()=>0).depleted,false);
 assert.equal(five.logs,1);
 assert.equal(chopOnce(d,five,185,()=>0).depleted,true);
 assert.equal(d.inventory.materials['softwood-logs'],6);
});

test('failed chopping cycles give no log or XP',()=>{
 const d=freshCharacterSave();teachWoodcutting(d);
 const state=newTreeState('softwood',()=>0);
 assert.equal(chopOnce(d,state,3,()=>.99).success,false);
 assert.equal(state.logs,1);assert.equal(d.professions.woodcuttingXp,0);
 assert.equal(d.inventory.materials['softwood-logs'],undefined);
});

test('inventory full prevents resource duplication and persistent save retains all log types',()=>{
 const d=freshCharacterSave();teachWoodcutting(d);
 d.inventory.materials['softwood-logs']=9999;
 const tree=newTreeState('softwood',()=>0);
 assert.equal(inventoryCanHoldLog(d,'softwood-logs'),false);
 assert.equal(chopOnce(d,tree,1,()=>0).ok,false);
 assert.equal(tree.logs,1);
 delete d.inventory.materials['softwood-logs'];
 const woods=TREE_SPECIES.map(x=>x.logId);
 for(const id of woods)d.inventory.materials[id]=7;
 d.professions.woodcuttingXp=WOODCUTTING_LEVEL_XP[99];
 const loaded=validSave(JSON.parse(JSON.stringify(d)));
 for(const id of woods)assert.equal(loaded.inventory.materials[id],7);
 assert.equal(loaded.professions.woodcuttingXp,d.professions.woodcuttingXp);
 assert.equal(bankMaterials(loaded,'moonwood-logs','deposit',3),3);
 assert.equal(loaded.bank.materials['moonwood-logs'],3);
});

test('each species has a distinct low-poly 3D model and removable trunk collision',()=>{
 const treeStats=[];
 for(const s of TREE_SPECIES){
  const root=createWoodcuttingTree(s.id,1,0);
  let count=0;let maxY=0;
  root.traverse(obj=>{if(obj.isMesh){count++;maxY=Math.max(maxY,obj.position.y);assert.equal(obj.userData.animated,true);}});
  assert.ok(count>=3,s.id+' model is missing');
  treeStats.push([s.shape,count,maxY]);
 }
 assert.equal(new Set(treeStats.map(x=>x[1]+':'+x[2])).size,7,'species cannot all share the same silhouette');
 clearWorldObstacles();
 const collider=registerWorldObstacle({x:85,z:-85,r:.55,height:5});
 assert.equal(blocked(85,-85,.4),true);
 assert.equal(removeWorldObstacle(collider),true);
 assert.equal(blocked(85,-85,.4),false);
 clearWorldObstacles();
});

test('Woodcutting keeps future XP definitions while the live skill card caps at 60',()=>{
 const milestones=woodcuttingMilestones();
 assert.equal(milestones.length,14);
 assert.deepEqual(milestones.filter(e=>e.type==='Tree').map(e=>e.level),[1,10,20,35,50,70,85]);
 assert.deepEqual(milestones.filter(e=>e.type==='Axe').map(e=>e.level),[1,10,20,35,50,70,85]);
 assert.ok(milestones.some(e=>e.name==='Pryrite Axe'&&e.level===85));
 assert.ok(milestones.some(e=>e.name==='Elderwood Tree'&&e.level===85));
 assert.ok(milestones.every((m,i)=>i===0||milestones[i-1].level<=m.level));
 const levelOne=woodcuttingProgress(0);
 assert.equal(levelOne.level,1);
 assert.equal(levelOne.progress,0);
 assert.equal(levelOne.current,0);
 assert.equal(levelOne.needed,WOODCUTTING_LEVEL_XP[2]);
 const firstLog=woodcuttingProgress(TREE_BY_ID.softwood.xp);
 assert.equal(firstLog.current,TREE_BY_ID.softwood.xp);
 assert.ok(firstLog.progress>0&&firstLog.progress<1);
 const next=woodcuttingProgress(WOODCUTTING_LEVEL_XP[20]);
 assert.equal(next.level,20);
 assert.equal(next.current,0);
 assert.equal(next.progress,0);
 assert.equal(woodcuttingProgress(WOODCUTTING_LEVEL_XP[99]).maxed,true);
 assert.equal(woodcuttingProgress(WOODCUTTING_LEVEL_XP[99]).progress,1);
});
