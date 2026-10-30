import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultSave,validSave,LOADOUTS,STYLE_ORDER} from '../src/rules.js';
import {createClassicCombat} from '../src/classic-combat.js';
import {createAdventure} from '../src/adventure-state.js';
import {ADVENTURE_TARGETS,ADVENTURE_SPAWNS,RECIPES,sanitizeAdventure,WATCH_BOUNTIES} from '../src/adventure-content.js';
import {classicItemDetails,classicPickup} from '../src/classic-item-state.js';
import {hollowGoals,materialUses,materialSource} from '../src/classic-progression.js';
import {DEFAULT_DROP_TABLES,rollDropTable} from '../src/drop-tables.js';
import {inventoryKeyList} from '../src/item-slot-layout.js';
import {SLOT_ITEMS} from '../src/equipment-slots.js';
import {combatSourceSnapshot} from '../src/gameplay-core.js';
import {sampleFight,xpAtLevel} from '../scripts/measure-progression.mjs';
function harness(data=defaultSave()){
 const events=[];
 const adventure=createAdventure(data,{emit:(type,e)=>events.push({type,...e}),grantWeapon:(s,id)=>data.inventory.weapons[s].push(id),heal:()=>true,resetDungeon(){},calmGuardian(){}});
 const act=(kind,choice,id)=>{const target=id?ADVENTURE_TARGETS.find(t=>t.id===id)||{id,x:0,z:0,reach:3}:null;
  return adventure.action(kind,{choice,target,player:target?{x:target.x,z:target.z-1}:{x:0,z:39},time:0});};
 return {data,adventure,events,act};
}
function fillBag(d){
 for(const id of Object.keys(SLOT_ITEMS)){if(inventoryKeyList(d).length>=28)break;if(!d.inventory.slotted.includes(id))d.inventory.slotted.push(id);}
 for(const style of STYLE_ORDER)for(const id of Object.keys(LOADOUTS[style])){
  if(inventoryKeyList(d).length>=28)break;if(!d.inventory.weapons[style].includes(id))d.inventory.weapons[style].push(id);
 }
 assert.equal(inventoryKeyList(d).length,28);
}
test('five craft batches debit and grant exactly once, train per batch, and survive reload',()=>{
 const h=harness();Object.assign(h.data.inventory.materials,{'softwood-logs':5});
 assert.ok(h.act('craft',{id:'arrows',batches:5}).ok);
 assert.equal(h.data.inventory.materials['field-arrows']||0,0,'no free materials on button press');
 h.adventure.tick(3,3,{x:0,z:39});
 assert.equal(h.data.inventory.materials['field-arrows'],30,'first completed cycle awards output');
 assert.equal(h.data.adventure.skills.fletching,18,'first completed cycle grants its own XP');
 h.adventure.tick(15,12,{x:0,z:39});
 assert.equal(h.data.inventory.materials['field-arrows'],150);
 assert.equal(h.data.inventory.materials['softwood-logs'],0);
 assert.equal(h.data.adventure.skills.fletching,90);
 assert.equal(h.act('craft',{id:'arrows',batches:5}).ok,false);
 const loaded=validSave(h.data);assert.equal(loaded.inventory.materials['field-arrows'],150);
 assert.equal(loaded.adventure.skills.fletching,90);
});
test('batch count validation and supply stack overflow never spend resources or grant XP',()=>{
 const h=harness();Object.assign(h.data.inventory.materials,{'softwood-logs':99,'field-arrows':9900});
 for(const batches of [0,-1,1.5,100,Infinity,'5']){
  const before=structuredClone(h.data);assert.equal(h.act('craft',{id:'arrows',batches}).ok,false);assert.deepEqual(h.data,before);
 }
 const before=structuredClone(h.data);assert.equal(h.act('craft',{id:'arrows',batches:5}).ok,false);assert.deepEqual(h.data,before);
});
test('timed crafting requires enough free capacity for each new output stack',()=>{
 const h=harness();Object.assign(h.data.inventory.materials,{'softwood-logs':5});fillBag(h.data);
 const before=structuredClone(h.data);
 assert.equal(h.act('craft',{id:'arrows',batches:5}).ok,false,'consuming only one of five logs cannot free the stack for the first output');
 assert.deepEqual(h.data,before,'failed order leaves every material and XP unchanged');
 h.data.inventory.slotted.pop();
 assert.equal(inventoryKeyList(h.data).length,27);
 assert.ok(h.act('craft',{id:'arrows',batches:5}).ok);
 assert.equal(inventoryKeyList(h.data).length,27,'start does not grant output');
 h.adventure.tick(15,15,{x:0,z:39});
 assert.equal(h.data.inventory.materials['field-arrows'],150);
 assert.equal(inventoryKeyList(h.data).length,27,'consumed logs and new arrows leave the freed slot open');
});
test('forge batch is timed, revalidates at completion, and interruption spends nothing',()=>{
 const h=harness();Object.assign(h.data.inventory.materials,{'copper-ore':5,'tin-ore':5});
 const forge=ADVENTURE_TARGETS.find(t=>t.station==='forge'),p={x:forge.x,z:forge.z-1};
 assert.ok(h.act('craft',{id:'bar',batches:5},forge.id).ok);
 h.adventure.tick(7,7,p);
 assert.equal(h.data.inventory.materials['bronze-bar'],2,'each of two finished cycles awards bars');
 assert.equal(h.data.adventure.skills.blacksmithing,36,'each finished cycle awards 18 XP');
 h.adventure.event({type:'hurt'});h.adventure.tick(9,2,p);
 assert.equal(h.data.inventory.materials['copper-ore'],3,'unfinished third cycle spends nothing');
 assert.ok(h.act('craft',{id:'bar',batches:3},forge.id).ok);
 h.adventure.tick(9,9,p);
 assert.equal(h.data.inventory.materials['bronze-bar'],5);
 assert.equal(h.data.adventure.skills.blacksmithing,90);
 assert.equal(h.data.inventory.materials['copper-ore'],0);
});
for(const id of ['leather','robes','quiver','focus','amulet','forged','reinforced','runic'])test(id+' recipe preserves ownership and rejects bag/bank duplicates without spending',()=>{
 const r=RECIPES.find(r=>r.id===id),h=harness();h.data.adventure.skills[r.profession]=1000;Object.assign(h.data.inventory.materials,{...r.cost});
 assert.equal(h.act('craft',{id,batches:2},r.station==='forge'?'adventure:forge':null).ok,false);
 const made=h.act('craft',id,r.station==='forge'?'adventure:forge':null);assert.ok(made.ok,made.reason);
 if(r.station==='forge'){const t=ADVENTURE_TARGETS.find(t=>t.station==='forge');h.adventure.tick(4,4,{x:t.x,z:t.z-1});}
 else h.adventure.tick(4,4,{x:0,z:39});
 const o=r.result,key=o.weapon?'weapons':o.armour?'armour':'slotted',item=o.weapon||o.armour||o.slot;
 const bag=o.weapon?h.data.inventory.weapons[o.style]:h.data.inventory[key],bank=o.weapon?h.data.bank.weapons[o.style]:h.data.bank[key];
 assert.ok(bag.includes(item));Object.assign(h.data.inventory.materials,{...r.cost});
 let before=structuredClone(h.data);assert.equal(h.act('craft',id,r.station==='forge'?'adventure:forge':null).ok,false);assert.deepEqual(h.data,before);
 bag.splice(bag.indexOf(item),1);bank.push(item);before=structuredClone(h.data);
 assert.equal(h.act('craft',id,r.station==='forge'?'adventure:forge':null).ok,false);assert.deepEqual(h.data,before);
 const restored=validSave(h.data);assert.ok((o.weapon?restored.bank.weapons[o.style]:restored.bank[key]).includes(item));
});
for(const choice of Object.keys(WATCH_BOUNTIES))test(choice+' bounty exchanges only actual tokens, caps safely, and cannot replay after reload',()=>{
 const h=harness(),r=WATCH_BOUNTIES[choice];Object.assign(h.data.inventory.materials,{'bandit-token':5,[r.material]:9999-r.amount+1});
 const before=structuredClone(h.data);assert.equal(h.act('bounty',choice,'citizen:guard').ok,false);assert.deepEqual(h.data,before);
 h.data.inventory.materials[r.material]=0;assert.ok(h.act('bounty',choice,'citizen:guard').ok);
 assert.equal(h.data.inventory.materials[r.material],r.amount);assert.equal(h.data.inventory.materials['bandit-token'],0);
 const loaded=harness(validSave(h.data));assert.equal(loaded.act('bounty',choice,'citizen:guard').ok,false);
 assert.equal(loaded.data.inventory.materials[r.material],r.amount);
});
test('bounty rejects unknown pack and full bag, then consumes final token stack to free a slot',()=>{
 const h=harness();Object.assign(h.data.inventory.materials,{'bandit-token':6});fillBag(h.data);
 const before=structuredClone(h.data);
 for(const choice of ['constructor','not-a-pack','frost']){assert.equal(h.act('bounty',choice,'citizen:guard').ok,false);assert.deepEqual(h.data,before);}
 h.data.inventory.materials['bandit-token']=5;assert.ok(h.act('bounty','frost','citizen:guard').ok);assert.equal(inventoryKeyList(h.data).length,28);
});
for(const id of ['copper','tin','reed'])test(id+' five-resource gathering honours time/recovery and interruption',()=>{
 const h=harness(),target=ADVENTURE_TARGETS.find(t=>t.id==='adventure:'+id),p={x:target.x,z:target.z-1};
 assert.ok(h.act('gather',{batches:5},target.id).ok);
 h.adventure.tick(target.seconds-.1,target.seconds-.1,p);assert.equal(h.data.inventory.materials[target.material],undefined);
 h.adventure.tick(target.seconds,.1,p);assert.equal(h.data.inventory.materials[target.material],1);
 h.adventure.tick(target.seconds*2+2,4,p);assert.equal(h.data.inventory.materials[target.material],1,'deposit recovery is preserved');
 h.adventure.event({type:'hurt'});h.adventure.tick(50,40,p);assert.equal(h.data.inventory.materials[target.material],1);
 assert.ok(h.adventure.action('gather',{target,choice:{batches:5},time:60,player:p}).ok);
 for(let n=0;n<5;n++)h.adventure.tick(60+target.seconds+n*(target.seconds+3),target.seconds+3,p);
 assert.equal(h.data.inventory.materials[target.material],6);assert.equal(h.data.adventure.skills[target.profession],108);
 assert.equal(h.adventure.state().work,null);
});
test('clear rewards, goals and repeat contracts survive reload without duplicate rewards',()=>{
 const d=defaultSave();d.adventure=sanitizeAdventure({index:8,run:{kills:ADVENTURE_SPAWNS.filter(m=>m.room!==undefined).map(m=>m.id),wards:[0,1,2],complete:false}});
 const h=harness(d);assert.ok(h.act('heart',null,'adventure:heart').ok);assert.equal(h.act('heart',null,'adventure:heart').ok,false);
 const loaded=harness(validSave(h.data));assert.equal(loaded.act('heart',null,'adventure:heart').ok,false);
 assert.equal(loaded.data.inventory.materials['warden-heart'],1);assert.equal(loaded.data.inventory.materials['hollow-shard'],4);
 assert.ok(loaded.act('contract',null,'citizen:guard').ok);assert.equal(loaded.act('contract',null,'citizen:guard').ok,false);
 loaded.data.bank.weapons.magic.push('runic_frost');loaded.data.bank.materials['hollow-shard']=6;
 const goals=hollowGoals(loaded.data);assert.equal(goals.find(g=>g.style==='magic').owned,true);
 assert.equal(goals[0].materials.find(m=>m.id==='hollow-shard').bank,6);
});
test('all three upgraded weapons have equivalent drop opportunity and measurable power gains',()=>{
 const d=defaultSave();for(const style of STYLE_ORDER)d.xp[style]=xpAtLevel(6);
 for(const [style,base,upgrade] of [['melee','sword','forged_sword'],['magic','frost','runic_frost'],['ranged','bow','reinforced_bow']]){
  assert.equal(DEFAULT_DROP_TABLES.bandit.find(r=>r.itemId==='weapon.'+style+'.'+upgrade).chancePercent,9);
  assert.ok(combatSourceSnapshot(d,style,LOADOUTS[style][upgrade]).maxHit>combatSourceSnapshot(d,style,LOADOUTS[style][base]).maxHit);
  d.inventory.weapons[style].push(upgrade);assert.ok(classicItemDetails(d,'weapon.'+style+'.'+upgrade,style).facts.some(([k,v])=>k==='Max basic hit'&&v.includes('+')));
 }
 const drops=rollDropTable('bandit',()=>0);assert.ok(drops.some(d=>d.style==='magic'&&d.itemId==='ember'));
 assert.ok(materialUses('boar-hide').length);assert.match(materialSource('hollow-shard'),/heartstone/);
});
test('duplicate banked equipment salvage and material quantities are explicit without duplicating ownership',()=>{
 const d=defaultSave();d.bank.weapons.magic.push('runic_frost');
 d.groundLoot=[{id:'gear',kind:'weapon',style:'magic',itemId:'runic_frost',amount:1,x:0,z:0},{id:'coins',kind:'coins',itemId:'coins',amount:13,x:0,z:0}];
 assert.match(classicPickup(d,{x:0,z:0},'gear').reason,/salvaged for 8 coins/);
 assert.equal(d.inventory.weapons.magic.includes('runic_frost'),false);assert.equal(d.coins,8);
 assert.match(classicPickup(d,{x:0,z:0},'coins').reason,/13 ×/);
 assert.equal(d.coins,21);assert.equal(classicPickup(d,{x:0,z:0},'gear').ok,false);
});
for(const style of STYLE_ORDER)test(style+' actual combat awards progression and an earned upgrade shortens representative fights',()=>{
 const enemy={id:'balance-bandit',type:'bandit',level:8,maxHp:148};
 const base=[],better=[];
 for(let i=0;i<8;i++){
  base.push(sampleFight({style,level:6,enemy,seed:167000+i}));better.push(sampleFight({style,level:6,upgraded:true,enemy,seed:167000+i}));
 }
 for(const r of [...base,...better]){assert.equal(r.won,true);assert.equal(r.xp,75);assert.equal(r.vitalityXp,41);}
 assert.ok(better.reduce((s,r)=>s+r.seconds,0)<base.reduce((s,r)=>s+r.seconds,0),style+' upgrade improves mean kill time');
});

test('quest coin rewards and Hollow contracts reserve a new coin slot atomically',()=>{
 const d=defaultSave();d.adventure=sanitizeAdventure({index:0,accepted:true,flags:['visit:service:bank','visit:service:store','visit:service:forester']});
 const h=harness(d);fillBag(d);let before=structuredClone(d);
 assert.equal(h.act('finish','welcome','citizen:guard').ok,false);assert.deepEqual(d,before);
 d.inventory.slotted.pop();assert.ok(h.act('finish','welcome','citizen:guard').ok);assert.equal(d.coins,20);
 const d2=defaultSave();d2.adventure=sanitizeAdventure({index:8,clears:1});d2.inventory.materials={'hollow-shard':3,ration:1};
 const h2=harness(d2);fillBag(d2);before=structuredClone(d2);
 assert.equal(h2.act('contract',null,'citizen:guard').ok,false);assert.deepEqual(d2,before);
 d2.inventory.materials['hollow-shard']=2;assert.ok(h2.act('contract',null,'citizen:guard').ok);
 assert.equal(inventoryKeyList(d2).length,28);assert.equal(d2.coins,35);
});
test('gathering batches stop on distance or capacity without inventing resources',()=>{
 const h=harness(),t=ADVENTURE_TARGETS.find(t=>t.id==='adventure:reed');
 Object.assign(h.data.inventory.materials,{reed:9998});assert.ok(h.act('gather',{batches:5},t.id).ok);
 h.adventure.tick(3,3,{x:t.x,z:t.z-1});assert.equal(h.data.inventory.materials.reed,9999);
 h.adventure.tick(9,6,{x:t.x,z:t.z-1});assert.equal(h.adventure.state().work,null);assert.equal(h.data.adventure.skills.foraging,18);
 h.data.inventory.materials.reed=0;
 assert.ok(h.adventure.action('gather',{target:t,choice:{batches:5},player:{x:t.x,z:t.z-1},time:12}).ok);
 h.adventure.tick(15,3,{x:0,z:39});assert.equal(h.data.inventory.materials.reed,0);assert.equal(h.adventure.state().work,null);
});

test('training reward never duplicates already banked weapons or equips them remotely',()=>{
 const d=defaultSave();d.characterFresh=true;d.adventure=sanitizeAdventure({index:1});
 d.inventory.materials={'field-arrows':1,'frost-scroll':1,ration:1};
 for(const [style,id] of [['melee','sword'],['magic','frost'],['ranged','bow']]){d.inventory.weapons[style]=[];d.bank.weapons[style]=[id];d.gear[style]=null;}
 const original=validSave(d),c=createClassicCombat({save:original,adventure:true}),target=ADVENTURE_TARGETS.find(t=>t.id==='adventure:rowan');
 const result=c.adventureAction('accept',{target,choice:'training'},{x:target.x,z:target.z-1.5});assert.ok(result.ok,result.reason);
 const saved=c.persistentSave();
 for(const [style,id] of [['melee','sword'],['magic','frost'],['ranged','bow']]){
  assert.equal(saved.inventory.weapons[style].includes(id),false);assert.deepEqual(saved.bank.weapons[style],[id]);assert.equal(saved.gear[style],original.gear[style]);
 }
 assert.equal(saved.inventory.materials['frost-scroll'],41);
 const reloaded=createClassicCombat({save:validSave(saved),adventure:true});
 assert.equal(reloaded.adventureAction('accept',{target,choice:'training'},{x:target.x,z:target.z-1.5}).ok,false);
 assert.deepEqual(reloaded.persistentSave().bank,saved.bank);
});
