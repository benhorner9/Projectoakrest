import test from 'node:test';
import assert from 'node:assert/strict';
import {CLASSIC_NPCS,solidAt} from '../src/classic-presentation.js';
import {OAKREST_SERVICES,OAKREST_GROVES,SHOP_STOCK} from '../src/town-services.js';
import {defaultSave} from '../src/rules.js';
import {CLASSIC_INTERACTABLES,findClassicInteractable,closestClickedInteractable,
  canCompleteInteraction,interactionSight,nearbyClassicInteraction,classicInteractionCopy} from '../src/classic-interactions.js';
import {createClassicNavigation} from '../src/classic-navigation.js';

test('bank/store/forester/trade NPCs use exact town-service coordinates and real reach',()=>{
 for(const service of OAKREST_SERVICES){
  const target=findClassicInteractable('service:'+service.id);
  assert.ok(target,service.id+' has a canonical target');
  assert.equal(target.x,service.npcX);
  assert.equal(target.z,service.npcZ);
  assert.equal(target.reach,service.reach);
  const npc=CLASSIC_NPCS.find(n=>n.targetId===target.id);
  assert.ok(npc,service.id+' has a visible person');
  assert.equal(npc.x,target.x);
  assert.equal(npc.z,target.z);
 }
 assert.ok(CLASSIC_NPCS.filter(n=>n.route?.length>=2).length>=6,'ambient workers now patrol the real streets');
 assert.ok(CLASSIC_NPCS.filter(n=>!n.route).length>=6,'bankers, merchants and static villagers remain anchored');
 assert.ok(CLASSIC_INTERACTABLES.every(t=>Number.isFinite(t.x)&&Number.isFinite(t.z)));
});

test('taps distinguish canonical NPCs, signs and training trees from empty ground',()=>{
 const bank=findClassicInteractable('service:bank');
 const tree=findClassicInteractable('grove:'+OAKREST_GROVES[0].id);
 assert.equal(closestClickedInteractable({x:bank.x+.4,z:bank.z})?.id,bank.id);
 assert.equal(closestClickedInteractable({x:tree.x,z:tree.z})?.id,tree.id);
 assert.equal(closestClickedInteractable({x:0,z:9}),null);
 assert.equal(findClassicInteractable('wrong:id'),null);
});

test('interaction may not fire through a solid building wall, or from too far away',()=>{
 const bank=findClassicInteractable('service:bank');
 assert.equal(canCompleteInteraction({x:-30,z:14},bank),true,'standing inside bank is in reach');
 assert.equal(canCompleteInteraction({x:0,z:14},bank),false,'cannot bank from the centre of town');
 const synthetic={x:-30,z:14,reach:20};
 assert.equal(interactionSight({x:-40,z:14},synthetic),false,'rear bank wall blocks line of sight');
 assert.equal(canCompleteInteraction({x:-40,z:14},synthetic),false);
 const grove=findClassicInteractable('grove:pine-west');
 assert.equal(solidAt(grove.x,grove.z),true,'training grove has actual collision');
 assert.equal(canCompleteInteraction({x:grove.x+2,z:grove.z},grove),true,'tree can be inspected from trunk distance');
});

test('existing town interaction radius is obeyed for nearby T/E controls',()=>{
 const bank=nearbyClassicInteraction({x:-30,z:14});
 assert.equal(bank?.id,'service:bank');
 const grove=nearbyClassicInteraction({x:-16,z:59});
 assert.equal(grove?.id,'grove:pine-west');
 assert.equal(nearbyClassicInteraction({x:0,z:-17}),null);
});

test('manual movement immediately cancels a previous tap destination',()=>{
 const nav=createClassicNavigation();
 const start={x:0,z:39};
 assert.equal(nav.moveTo(start,{x:0,z:52}).ok,true);
 assert.ok(nav.state().waypoints.length);
 const next=nav.step(start,{x:0,z:-1},.05);
 assert.equal(next.kind,'manual');
 assert.equal(nav.state().waypoints.length,0);
 assert.ok(next.moved);
 assert.ok(next.position.z<start.z);
});
test('tap navigation uses collision, stops on arrival and does not overshoot',()=>{
 const nav=createClassicNavigation(),pos={x:0,z:39};
 assert.equal(nav.moveTo(pos,{x:0,z:41}).ok,true);
 let current=pos;
 for(let i=0;i<30;i++){
  const event=nav.step(current,{x:0,z:0},.08);
  current=event.position;
  assert.equal(solidAt(current.x,current.z),false);
 }
 assert.ok(Math.hypot(current.x,current.z-41)<.35);
 assert.equal(nav.state().waypoints.length,0);
 assert.equal(nav.moveTo(current,{x:18,z:36}).ok,false,'well is blocked');
});

test('NPC selection completes only within reach, and emits the interaction once',()=>{
 const bank=findClassicInteractable('service:bank');
 const nav=createClassicNavigation();
 const start={x:-30,z:14};
 const immediate=nav.interactWith(start,bank);
 assert.equal(immediate.interaction?.id,bank.id);
 assert.equal(nav.state().pending,null);
 assert.equal(nav.interactWith({x:0,z:39},bank).ok,true);
 let position={x:0,z:39},interactions=0;
 for(let i=0;i<500;i++){
  const move=nav.step(position,{x:0,z:0},.08);
  position=move.position;
  if(move.interaction){interactions++;assert.equal(move.interaction.id,bank.id);}
  if(interactions)break;
 }
 assert.equal(interactions,1,'approached the bank through its real doorway');
 assert.equal(canCompleteInteraction(position,bank),true);
 assert.equal(nav.step(position,{x:0,z:0},.1).interaction,null);
});
test('all information panels are derived from existing game data and remain read-only',()=>{
 const save=defaultSave();
 save.coins=370;save.bank.coins=125;save.bank.materials['moss-fibre']=9;
 save.professions.woodcuttingLearned=true;save.professions.woodcuttingXp=180;
 const before=JSON.stringify(save);
 const banker=classicInteractionCopy(findClassicInteractable('service:bank'),save);
 assert.match(banker.body,/125/);assert.match(banker.body,/9/);
 const shop=classicInteractionCopy(findClassicInteractable('service:store'),save);
 assert.match(shop.body,/370/);
 for(const stock of SHOP_STOCK.filter(s=>s.kind==='bundle'))assert.ok(shop.body.includes(stock.label));
 const grove=classicInteractionCopy(findClassicInteractable('grove:pine-west'),save);
 assert.match(grove.body,/Woodcutting level/);
 const notice=classicInteractionCopy(findClassicInteractable('notice:heartwood-notice'),save);
 assert.match(notice.body,/oak|bank|town|Oakrest/i);
 assert.equal(JSON.stringify(save),before,'no XP, coin, bank, skill or gear change');
});
