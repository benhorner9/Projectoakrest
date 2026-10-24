import test from 'node:test';
import assert from 'node:assert/strict';
import {freshCharacterSave,validSave} from '../src/rules.js';
import {createAdventure} from '../src/adventure-state.js';
import {sanitizeAdventure,QUESTS,QUEST_PREREQUISITES,ADVENTURE_SCENERY} from '../src/adventure-content.js';
import {findClassicInteractable} from '../src/classic-interactions.js';
import {availableQuestGivers,questGiverStatus} from '../src/classic-quest-indicators.js';
import {CLASSIC_MAP_FEATURES,worldToMinimap,minimapToWorld} from '../src/classic-minimap.js';
import {CLASSIC_PLAZAS,CLASSIC_STALLS,CLASSIC_ROADS,CLASSIC_PERIMETER} from '../src/classic-town-plan.js';

function game(saved=freshCharacterSave()){
 const events=[];
 const adventure=createAdventure(saved,{
  emit:(type,event)=>events.push([type,event]),
  grantWeapon(){},heal(){return true;},resetDungeon(){},calmGuardian(){}
 });
 const act=(kind,id,choice)=>{
  const target=id?findClassicInteractable(id):null;
  const player=target?{x:target.x,z:target.z-1}:{x:0,z:39};
  return adventure.action(kind,{target,choice,player,time:5});
 };
 return {adventure,act,save:saved,events};
}
function success(r){assert.equal(r?.ok,true,r?.reason);}
const find=(s,id)=>s.catalogue.find(q=>q.id===id);

test('opening quests unlock a playable parallel quest book',()=>{
 const h=game();
 let state=h.adventure.state();
 assert.equal(find(state,'welcome').status,'available');
 assert.equal(find(state,'training').status,'locked');
 assert.equal(questGiverStatus(state,'citizen:guard'),'available');
 success(h.act('accept','citizen:guard'));
 for(const id of ['service:bank','service:store','service:forester'])h.adventure.visit(id);
 success(h.act('finish','citizen:guard'));
 state=h.adventure.state();
 for(const id of ['training','provisions','road'])assert.equal(find(state,id).status,'available',id);
 assert.equal(find(state,'roots').status,'locked');
 const ids=availableQuestGivers(state,findClassicInteractable).map(g=>g.id);
 assert.ok(ids.includes('adventure:rowan'));
 assert.ok(ids.includes('adventure:smith'));
 assert.ok(ids.includes('citizen:guard'));
 success(h.act('accept','citizen:guard','road')); // Investigate before taking the tutorial.
 success(h.act('accept','adventure:rowan','training'));
 state=h.adventure.state();
 assert.equal(find(state,'road').status,'active');
 assert.equal(find(state,'training').status,'active');
 success(h.act('track',null,'road'));
 assert.equal(h.adventure.state().tracked,'road');
 success(h.act('inspect','adventure:cart'));
 success(h.act('inspect','adventure:tracks'));
 assert.equal(questGiverStatus(h.adventure.state(),'citizen:guard'),'ready');
 success(h.act('finish','citizen:guard','road'));
 state=h.adventure.state();
 assert.equal(find(state,'road').status,'completed');
 assert.equal(find(state,'roots').status,'available');
 assert.equal(find(state,'training').status,'active');
 assert.equal(state.index,1,'legacy progress index stays first unfinished');
 const restored=game(validSave(h.save)).adventure.state();
 assert.equal(find(restored,'road').status,'completed');
 assert.equal(find(restored,'training').status,'active');
 assert.equal(find(restored,'roots').status,'available');
});
test('legacy sequential saves upgrade without losing active objective flags',()=>{
 const old=sanitizeAdventure({version:1,index:4,accepted:true,flags:['inspect:stump','nonsense'],clears:2});
 assert.equal(old.version,2);
 for(let i=0;i<4;i++)assert.equal(old.quests[QUESTS[i].id].status,'completed');
 assert.equal(old.quests.roots.status,'active');
 assert.deepEqual(old.quests.roots.flags,['inspect:stump']);
 assert.equal(old.index,4);
 assert.equal(old.clears,2);
 const again=sanitizeAdventure(old);
 assert.deepEqual(again.quests,old.quests);
});
test('quest prerequisites are acyclic and NPC glow only shows usable quest hand-ins',()=>{
 for(const quest of QUESTS)for(const dependency of QUEST_PREREQUISITES[quest.id]||[]){
  assert.ok(QUESTS.indexOf(QUESTS.find(q=>q.id===dependency))<QUESTS.indexOf(quest));
 }
 const g=game(),a=g.adventure;
 assert.equal(questGiverStatus(a.state(),'adventure:rowan'),null);
 success(g.act('accept','citizen:guard'));
 assert.equal(questGiverStatus(a.state(),'citizen:guard'),null);
});
test('map shares exact town roofs, plazas, roads and adventure ground and water',()=>{
 assert.equal(CLASSIC_MAP_FEATURES.roads,CLASSIC_ROADS);
 assert.equal(CLASSIC_MAP_FEATURES.walls,CLASSIC_PERIMETER.walls);
 assert.equal(CLASSIC_MAP_FEATURES.plazas,CLASSIC_PLAZAS);
 assert.equal(CLASSIC_MAP_FEATURES.stalls,CLASSIC_STALLS);
 assert.equal(CLASSIC_MAP_FEATURES.scenery,ADVENTURE_SCENERY);
 assert.ok(ADVENTURE_SCENERY.creek.every(c=>c.w>0&&c.d>0));
 const origin={x:10,z:39};
 for(const angle of [{x:12,z:-43},{x:43,z:5},{x:-8,z:45}]){
  const pos={x:origin.x+6,z:origin.z-4};
  const at=worldToMinimap(pos,origin,160,3.45,angle);
  const back=minimapToWorld(at,origin,160,3.45,angle);
  assert.ok(Math.hypot(pos.x-back.x,pos.z-back.z)<1e-8);
 }
});
