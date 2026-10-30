import test from 'node:test';
import assert from 'node:assert/strict';
import {freshCharacterSave,validSave} from '../src/rules.js';
import {createClassicCombat} from '../src/classic-combat.js';
import {createClassicNavigation} from '../src/classic-navigation.js';
import {findClassicInteractable} from '../src/classic-interactions.js';
import {ADVENTURE_TARGETS,ADVENTURE_SPAWNS,RECIPES,sanitizeAdventure} from '../src/adventure-content.js';
import {solidAt,slideMove} from '../src/classic-presentation.js';
import {createAdventure} from '../src/adventure-state.js';

function fresh(){const d=freshCharacterSave();d.onboarding.area='world';d.gear={melee:'none',magic:'none',ranged:'none'};return d;}
function harness(save=fresh()){
 let combat=createClassicCombat({save,adventure:true,random:()=>.15}),player={x:0,z:39},time=0;
 function step(seconds){for(let i=0;i<Math.ceil(seconds/.1);i++){combat.tick(.1,player);time+=.1;}}
 function act(kind,id,choice){const target=findClassicInteractable(id);if(target)player={x:target.x,z:target.z-1.6};const r=combat.adventureAction(kind,{target,choice},player);if(r?.teleport)player={...r.teleport};return r;}
 return {get combat(){return combat;},get player(){return player;},set player(p){player=p;},step,act,
  reload(){const saved=validSave(combat.persistentSave());combat=createClassicCombat({save:saved,adventure:true,random:()=>.15});return saved;}};
}
const success=r=>{assert.equal(r?.ok,true,r?.reason);return r;};

test('every adventure target has a traversable approach; routes do not pass through walls',()=>{
 for(const target of ADVENTURE_TARGETS){
  let player={x:0,z:target.z<200?82:218};const nav=createClassicNavigation();
  let r=nav.interactWith(player,target);success(r);
  for(let i=0;i<7000&&!r.interaction;i++){r=nav.step(player,{},.1);player=r.position;assert.equal(solidAt(player.x,player.z),false,target.id);assert.ok(!r.failed,target.id+': '+r.failed);}
  assert.equal(r.interaction?.id,target.id,target.id);
 }
});

test('fresh character completes all eight quests using real resources, combat, and round-trip saves',()=>{
 const h=harness();success(h.act('accept','citizen:guard'));
 for(const id of ['service:bank','service:store','service:forester'])h.combat.adventureVisit(id);
 const firstReward=success(h.act('finish','citizen:guard'));
 assert.deepEqual(firstReward.completion,{
  id:'welcome',title:'A Place Behind the Walls',
  ending:firstReward.reason,
  rewards:[{kind:'coins',label:'Coins',amount:20}]
 });
 assert.equal(h.combat.persistentSave().coins,20);
 assert.equal(h.act('finish','citizen:guard','welcome').ok,false,'same quest cannot award twice');
 assert.equal(h.combat.persistentSave().coins,20,'failed hand-in cannot change coins');
 assert.equal(h.combat.adventureState().index,1);
 success(h.act('accept','adventure:rowan'));
 for(const style of ['melee','magic','ranged']){
  h.combat.stopTarget();h.step(3);h.combat.styleSwitch(style);h.step(1);h.player={x:-1,z:71};
  assert.ok(h.combat.chooseTarget('practice',h.player));h.step(4);h.combat.stopTarget();
 }
 assert.equal(h.combat.adventureState().flags.length,3);success(h.act('finish','adventure:rowan'));
 h.reload();assert.equal(h.combat.persistentSave().inventory.weapons.magic.includes('frost'),true,'issued weapons survive reload, not session loans');
 success(h.act('accept','adventure:smith'));
 for(const id of ['adventure:copper','adventure:tin','adventure:softwood']){success(h.act('gather',id));h.step(8);h.act('cancel');}
 success(h.act('craft',null,'arrows'));h.step(4);
 success(h.act('finish','adventure:smith'));assert.equal(h.combat.adventureState().index,3);
 success(h.act('accept','citizen:guard'));success(h.act('inspect','adventure:cart'));success(h.act('inspect','adventure:tracks'));success(h.act('finish','citizen:guard'));
 success(h.act('accept','service:forester'));success(h.act('inspect','adventure:stump'));
 success(h.act('craft','adventure:forge','bar'));h.step(4);
 for(let i=0;i<2;i++){success(h.act('gather','adventure:reed'));h.step(7);}
 success(h.act('craft',null,'seal'));h.step(4);
 success(h.act('calm','adventure:stump'));assert.ok(h.combat.getState().monsters.find(m=>m.id==='guardian').dead);
 success(h.act('finish','service:forester'));
 success(h.act('accept','adventure:scout'));success(h.act('inspect','adventure:journal'));success(h.act('inspect','adventure:memorial'));
 assert.equal(h.act('answer','adventure:scout','treasure').ok,false);success(h.act('answer','adventure:scout','protect'));success(h.act('finish','adventure:scout'));
 success(h.act('accept','citizen:guard'));
 assert.equal(h.act('prepare','citizen:guard').ok,false,'consumed seal is no longer owned');
 for(const id of ['adventure:copper','adventure:tin']){success(h.act('gather',id));h.step(8);}
 success(h.act('craft','adventure:forge','bar'));h.step(4);
 for(let i=0;i<2;i++){success(h.act('gather','adventure:reed'));h.step(7);}
 success(h.act('craft',null,'seal'));h.step(4);
 success(h.act('prepare','citizen:guard'));success(h.act('inspect','adventure:entrance'));success(h.act('finish','citizen:guard'));
 assert.equal(h.reload().adventure.index,7);
 success(h.act('accept','citizen:guard'));success(h.act('enter','adventure:entrance'));
 assert.equal(h.combat.adventureCanPass(245),false);assert.equal(h.act('ward','adventure:ward-0').ok,false);
 assert.equal(h.combat.chooseTarget('hollow-keeper',{x:0,z:310}),false,'cannot attack unopened rooms');
 // Prepare a full ranged expedition from actual gathered timber, not injected items.
 success(h.act('leave','adventure:exit-0'));
 for(let batch=0;batch<40;batch++){
  success(h.act('gather','adventure:softwood'));h.step(8);h.act('cancel');h.step(65);
  success(h.act('craft',null,'arrows'));h.step(4);
 }
 h.reload();success(h.act('enter','adventure:entrance'));h.combat.styleSwitch('ranged');h.step(.3);
 let elapsed=0;
 for(let room=0;room<4;room++){
  const center=[229,256,282,313][room];h.player={x:7,z:center};
  let cleared=false;
  for(let i=0;i<20000;i++){
   const state=h.combat.getState(),living=state.monsters.filter(m=>m.room===room&&!m.dead);
   if(!living.length){cleared=true;break;}
   if(!state.target)h.combat.chooseTarget(living[0].id,h.player);
   const angle=elapsed*.65,dest={x:Math.cos(angle)*7,z:center+Math.sin(angle)*7};
   const dx=dest.x-h.player.x,dz=dest.z-h.player.z,d=Math.hypot(dx,dz),scale=Math.min(1,.53/Math.max(.001,d));
   h.player=slideMove(h.player,dx*scale,dz*scale);h.combat.tick(.1,h.player);elapsed+=.1;
   assert.ok(h.combat.getState().hp>0,'positioning avoids telegraphed damage');
  }
  assert.ok(cleared,'room '+room+' cleared with starter bow and earned ammunition');
  if(room<3)success(h.act('ward','adventure:ward-'+room));
  if(room===1){const before=h.combat.adventureState().run.kills;h.reload();success(h.act('enter','adventure:entrance'));assert.deepEqual(h.combat.adventureState().run.kills,before);h.combat.styleSwitch('ranged');h.step(.3);}
 }
 success(h.act('heart','adventure:heart'));success(h.act('leave','adventure:exit-3'));success(h.act('finish','citizen:guard'));
 const final=h.reload();assert.equal(final.adventure.index,8);assert.equal(final.adventure.clears,1);assert.equal(final.inventory.materials['warden-heart'],1);
 console.log('New-character dungeon combat seconds:',Math.round(elapsed));
});

test('dungeon state rewards once, persists cleared rooms, and starts a clean repeat run',()=>{
 const data=fresh();data.adventure=sanitizeAdventure({index:7,accepted:true});data.inventory.materials['ward-seal']=2;
 const events=[];const a=createAdventure(data,{emit:(type,e)=>events.push({type,...e}),grantWeapon(){},heal(){return true;},resetDungeon(){},calmGuardian(){}});
 const act=(kind,id)=>{const target=findClassicInteractable(id);return a.action(kind,{target,player:{x:target.x,z:target.z-1.5},time:10});};
 success(act('enter','adventure:entrance'));
 for(let room=0;room<4;room++){
  for(const mob of ADVENTURE_SPAWNS.filter(m=>m.room===room))a.event({type:'defeated',id:mob.id});
  if(room<3)success(act('ward','adventure:ward-'+room));
 }
 success(act('heart','adventure:heart'));assert.equal(data.adventure.clears,1);assert.equal(data.inventory.materials['warden-heart'],1);
 assert.equal(act('heart','adventure:heart').ok,false);assert.equal(data.inventory.materials['warden-heart'],1);
 success(act('finish','citizen:guard'));assert.equal(data.adventure.index,8);
 const reload=validSave(data);assert.equal(reload.adventure.run.kills.length,6);assert.equal(reload.adventure.run.wards.length,3);
 success(act('enter','adventure:entrance'));assert.deepEqual(data.adventure.run.kills,[]);assert.equal(data.inventory.materials['ward-seal'],0);
 a.event({type:'dead'});assert.equal(data.adventure.deaths,1);assert.equal(data.inventory.materials['warden-heart'],1);
});

test('every spell including defensive abilities consumes one appropriate scroll, empty supply blocks damage',()=>{
 const d=fresh();d.inventory.weapons.magic=['frost'];d.gear.magic='frost';d.inventory.materials['frost-scroll']=1;
 const h=harness(d);h.combat.styleSwitch('magic');h.step(.3);h.player={x:-1,z:71};h.combat.chooseTarget('practice',h.player);h.step(1.1);
 assert.equal(h.combat.persistentSave().inventory.materials['frost-scroll'],0);
 const before=h.combat.getState().monsters[0].hp;h.step(5);assert.equal(h.combat.getState().monsters[0].hp,before);
 assert.equal(h.combat.getState().targetId,null);
});

test('crafting checks quantities at completion, cancels out of reach and preserves all old character fields',()=>{
 const d=fresh();d.inventory.materials={'copper-ore':1,'tin-ore':1};d.xp.melee=845;d.bank.coins=321;
 const h=harness(d);success(h.act('craft','adventure:forge','bar'));h.player={x:0,z:39};h.step(5);
 assert.equal(h.combat.persistentSave().inventory.materials['copper-ore'],1);
 success(h.act('craft','adventure:forge','bar'));h.step(4);
 assert.equal(h.combat.persistentSave().inventory.materials['bronze-bar'],1);
 assert.equal(h.act('craft','adventure:forge','bar').ok,false);
 const restored=h.reload();assert.equal(restored.xp.melee,845);assert.equal(restored.bank.coins,321);assert.equal(restored.adventure.skills.blacksmithing,18);
 assert.equal(restored.inventory.materials['bronze-bar'],1);
 for(const recipe of RECIPES)assert.ok(Object.keys(recipe.cost).length>0);
});

test('starting resource work releases an old combat target instead of walking back to it',()=>{
 const h=harness();h.player={x:-1,z:71};assert.ok(h.combat.chooseTarget('practice',h.player));
 success(h.act('gather','adventure:copper'));
 assert.equal(h.combat.getState().targetId,null);
 h.step(5);assert.equal(h.combat.persistentSave().inventory.materials['copper-ore'],1);
});

test('actual combat death preserves inventory and chamber kills, then re-entry does not charge another seal',()=>{
 const d=fresh();d.adventure=sanitizeAdventure({index:7,accepted:true,run:{kills:['hollow-root-0','hollow-root-1'],wards:[0],complete:false}});
 d.inventory.materials={'ward-seal':2,'bronze-bar':3};
 const c=createClassicCombat({save:d,adventure:true,random:()=>.3});
 const entrance=findClassicInteractable('adventure:entrance');
 success(c.adventureAction('enter',{target:entrance},{x:0,z:179}));
 let player={x:-8,z:254},died=false,revived=false;
 for(let i=0;i<5000&&!revived;i++){
  const events=c.tick(.1,player);
  if(events.some(e=>e.type==='dead'))died=true;
  if(events.some(e=>e.type==='revive')){player={x:0,z:39};revived=true;}
 }
 assert.ok(died&&revived);assert.equal(c.adventureState().deaths,1);
 assert.equal(c.persistentSave().inventory.materials['bronze-bar'],3);
 const restored=validSave(c.persistentSave());
 const again=createClassicCombat({save:restored,adventure:true});
 success(again.adventureAction('enter',{target:entrance},{x:0,z:179}));
 assert.equal(again.persistentSave().inventory.materials['ward-seal'],2);
 assert.ok(again.getState().monsters.filter(m=>m.room===0).every(m=>m.dead));
});
