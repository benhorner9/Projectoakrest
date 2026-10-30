import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultSave,STYLE_ORDER,XP_BY_MOB,levelFromXp} from '../src/rules.js';
import {ADVENTURE_SPAWNS,ADVENTURE_XP_REWARDS,QUESTS,QUEST_PREREQUISITES,RECIPES,ADVENTURE_TARGETS} from '../src/adventure-content.js';
import {createAdventure} from '../src/adventure-state.js';
import {createClassicCombat} from '../src/classic-combat.js';
import {awardMonsterVictory} from '../src/gameplay-core.js';

const NPC={
 guard:{id:'citizen:guard',x:0,z:0,reach:4},
 forester:{id:'service:forester',x:-30,z:46,reach:4},
 store:{id:'service:store',x:30,z:14,reach:4}
};
const target=id=>ADVENTURE_TARGETS.find(t=>t.id==='adventure:'+id)||NPC[id];

test('Block 6: eight quests have known noncyclic prerequisites, unique flags and reachable interactables',()=>{
 const byId=new Map(QUESTS.map(q=>[q.id,q]));
 assert.equal(byId.size,8);
 const seen=new Set(),visiting=new Set();
 function walk(id){
  assert.ok(byId.has(id),'prerequisite exists: '+id);
  if(seen.has(id))return;
  assert.ok(!visiting.has(id),'no circular quest gates: '+id);
  visiting.add(id);for(const parent of QUEST_PREREQUISITES[id]||[])walk(parent);
  visiting.delete(id);seen.add(id);
 }
 for(const q of QUESTS){
  assert.ok(q.objectives.length>0,'quest has playable objectives: '+q.id);
  assert.equal(new Set(q.objectives.map(o=>o[0])).size,q.objectives.length);
  walk(q.id);
 }
 assert.equal(seen.size,8);
 assert.ok(RECIPES.some(r=>r.id==='seal'&&r.result.material==='ward-seal'));
 assert.ok(RECIPES.some(r=>r.id==='rations'&&r.result.material==='ration'));
 const ids=new Set(ADVENTURE_TARGETS.map(t=>t.id));
 assert.equal(ids.size,ADVENTURE_TARGETS.length);
 assert.ok(['entrance','heart','ward-0','ward-1','ward-2'].every(id=>ids.has('adventure:'+id)));
 for(const t of ADVENTURE_TARGETS)assert.ok(Number.isFinite(t.x)&&Number.isFinite(t.z)&&t.reach>0);
});

test('Block 6: all named enemy XP rewards scale with encounter difficulty; three style ownership stays independent',()=>{
 assert.equal(new Set(ADVENTURE_SPAWNS.map(s=>s.id)).size,ADVENTURE_SPAWNS.length);
 assert.deepEqual(Object.keys(ADVENTURE_XP_REWARDS).sort(),ADVENTURE_SPAWNS.map(s=>s.id).sort());
 for(const enemy of ADVENTURE_SPAWNS){
  const xp=ADVENTURE_XP_REWARDS[enemy.id];
  assert.ok(Number.isSafeInteger(xp)&&xp>=XP_BY_MOB[enemy.type]&&xp<=10000,enemy.id);
 }
 assert.ok(ADVENTURE_XP_REWARDS['hollow-keeper']>ADVENTURE_XP_REWARDS['hollow-elite']);
 assert.ok(ADVENTURE_XP_REWARDS['hollow-elite']>ADVENTURE_XP_REWARDS['hollow-root-0']);
 for(const style of STYLE_ORDER){
  const d=defaultSave(),before=d.xp[style],other=STYLE_ORDER.filter(s=>s!==style);
  const reward=awardMonsterVictory(d,'boar',style,ADVENTURE_XP_REWARDS['hollow-keeper']);
  assert.equal(reward.amount,350);
  assert.equal(d.xp[style],before+350);
  assert.ok(other.every(s=>d.xp[s]===0),'style XP cannot leak to other combat disciplines');
  assert.equal(d.xp.vitality,Math.floor(350*.55));
  assert.equal(reward.newLevel,levelFromXp(d.xp[style]).level);
 }
 const ordinary=defaultSave();
 assert.equal(awardMonsterVictory(ordinary,'boar','melee').amount,XP_BY_MOB.boar,
  'original, non-adventure mobs retain baseline experience');
 const capped=defaultSave();capped.xp.melee=200000000;capped.xp.vitality=200000000;
 assert.equal(awardMonsterVictory(capped,'boar','melee',350).awarded,true);
 assert.equal(capped.xp.melee,200000000);
 assert.equal(capped.xp.vitality,200000000);
 assert.equal(awardMonsterVictory(capped,'boar','melee',Infinity).awarded,false);
});

test('Block 6: complete first adventure, craft and resupply, gated Hollow, repeat clear and contract',()=>{
 const data=defaultSave(),messages=[],dungeonResets=[];
 const adventure=createAdventure(data,{
  emit:(name,event)=>messages.push([name,event]),
  grantWeapon:(s,id,wear=true)=>{
   if(!data.inventory.weapons[s].includes(id))data.inventory.weapons[s].push(id);
   if(wear)data.gear[s]=id;
  },
  heal:()=>true,calmGuardian:()=>{},resetDungeon:run=>dungeonResets.push(structuredClone(run)),
  sight:()=>true,random:()=>0
 });
 let t=2;
 const interact=(kind,id,choice)=>{
  const p=target(id);assert.ok(p,'known interaction target '+id);
  const result=adventure.action(kind,{target:p,choice,time:t,player:{x:p.x,z:p.z}});
  return result;
 };
 const advance=(seconds=10)=>{t+=seconds;};
 const gather=(id)=>{
  advance();
  const p=target(id),result=interact('gather',id);
  assert.equal(result.ok,true,id+': '+result.reason);
  advance((p.seconds||1.18)+1);
  adventure.tick(t,4,{x:p.x,z:p.z});
 };
 const make=(id,at='inventory')=>{
  advance();
  const p=at==='inventory'?null:target('forge');
  const result=adventure.action('craft',{target:p,choice:id,time:t,player:p?{x:p.x,z:p.z}:{x:0,z:0}});
  assert.equal(result.ok,true,'craft '+id+': '+result.reason);
  advance(4);adventure.tick(t,4,p?{x:p.x,z:p.z}:{x:0,z:0});
 };
 assert.equal(interact('enter','entrance').ok,false,'cannot skip the first seven quests');
 assert.equal(interact('accept','guard','welcome').ok,true);
 for(const id of ['service:bank','service:store','service:forester'])adventure.visit(id);
 assert.equal(interact('finish','guard','welcome').ok,true);
 assert.equal(interact('accept','rowan','training').ok,true);
 for(const style of STYLE_ORDER)adventure.event({type:'hit',id:'practice',style});
 assert.equal(interact('finish','rowan','training').ok,true);
 assert.equal(interact('accept','smith','provisions').ok,true);
 for(let i=0;i<3;i++){gather('copper');gather('tin');}
 for(let i=0;i<6;i++)gather('reed');
 gather('softwood');
 assert.ok((data.inventory.materials['softwood-logs']||0)>=1,'real forestry harvesting returns timber');
 make('arrows');
 assert.equal(interact('finish','smith','provisions').ok,true);
 for(let i=0;i<3;i++)make('bar','forge');
 for(let i=0;i<3;i++)make('seal');
 assert.ok(data.inventory.materials['ward-seal']>=3);
 assert.equal(interact('accept','guard','road').ok,true);
 assert.equal(interact('inspect','cart').ok,true);
 assert.equal(interact('inspect','tracks').ok,true);
 assert.equal(interact('finish','guard','road').ok,true);
 assert.equal(interact('accept','forester','roots').ok,true);
 assert.equal(interact('inspect','stump').ok,true);
 assert.equal(interact('calm','stump').ok,true,'restoration seal is a viable noncombat route');
 assert.equal(interact('finish','forester','roots').ok,true);
 assert.equal(interact('accept','scout','outpost').ok,true);
 for(const id of ['journal','memorial'])assert.equal(interact('inspect',id).ok,true);
 assert.equal(interact('answer','scout','treasure').ok,false,'incorrect answer rejected');
 assert.equal(interact('answer','scout','protect').ok,true);
 assert.equal(interact('finish','scout','outpost').ok,true);
 assert.equal(interact('accept','guard','seal').ok,true);
 assert.equal(interact('prepare','guard').ok,true);
 assert.equal(interact('inspect','entrance').ok,true);
 assert.equal(interact('finish','guard','seal').ok,true);
 assert.equal(interact('accept','guard','hollow').ok,true);
 const sealCount=data.inventory.materials['ward-seal'];
 assert.equal(interact('enter','entrance').ok,true);
 assert.equal(data.inventory.materials['ward-seal'],sealCount-1,'new expedition consumes exactly one seal');
 assert.equal(interact('ward','ward-2').ok,false,'last ward cannot bypass earlier chambers');
 const clearChamber=(index,kills)=>{
  for(const id of kills)adventure.event({type:'defeated',id});
  assert.equal(interact('ward','ward-'+index).ok,true,'chamber '+index+' ward secured after kills');
 };
 clearChamber(0,['hollow-root-0','hollow-root-1']);
 const previous=structuredClone(adventure.state().run);
 assert.equal(interact('leave','exit-0').ok,true);
 assert.equal(interact('enter','entrance').ok,true,'return after refuge bell resumes dungeon');
 assert.deepEqual(adventure.state().run,previous,'cleared rooms and run time survive a refuge return');
 assert.equal(data.inventory.materials['ward-seal'],sealCount-1,'return does not consume second seal');
 clearChamber(1,['hollow-sap-0','hollow-sap-1']);
 clearChamber(2,['hollow-elite']);
 adventure.event({type:'defeated',id:'hollow-keeper'});
 assert.equal(interact('heart','heart').ok,true);
 assert.equal(interact('heart','heart').ok,false,'the heart cannot be claimed twice');
 assert.equal(data.inventory.materials['warden-heart'],1);
 assert.equal(data.inventory.materials['hollow-shard'],4);
 assert.equal(interact('finish','guard','hollow').ok,true);
 assert.ok(QUESTS.every(q=>adventure.state().quests[q.id].status==='completed'));
 assert.equal(adventure.state().clears,1);
 assert.equal(interact('contract','guard').ok,true);
 assert.equal(interact('contract','guard').ok,false,'a cleared run only pays one watch contract');
 assert.equal(data.inventory.materials['hollow-shard'],2);
 assert.ok(messages.some(([type,item])=>type==='adventure'&&/cleared/.test(item.reason)),
  'first Hollow completion announces progress');
 assert.ok(dungeonResets.length>=2);
});
