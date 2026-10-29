/** Stateful adventure transactions. The combat session owns this save; no storage here. */
import {QUESTS,RECIPES,ADVENTURE_TARGETS,ADVENTURE_SPAWNS,QUEST_PREREQUISITES,WATCH_BOUNTIES,sanitizeAdventure} from './adventure-content.js';
import {woodcuttingLevel,canCutTree,newTreeState,chopOnce,respawnTree,woodcuttingCycleSeconds,WOODCUTTING_CHAPTER_XP_CAP} from './woodcutting.js';
import {inventoryKeyList} from './item-slot-layout.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const ok=reason=>({ok:true,reason}),no=reason=>({ok:false,reason});
export function createAdventure(data,{emit,grantWeapon,heal,resetDungeon,calmGuardian,sight=()=>true,random=Math.random}){
 data.adventure=sanitizeAdventure(data.adventure);
 const a=data.adventure,mats=data.inventory.materials;
 const trees=new Map(),respawns=new Map();let work=null,recentCraft=null,eatUntil=0,drinkUntil=0;
 const progress=id=>a.quests[id];
 const completed=id=>progress(id)?.status==='completed';
 const unlocked=q=>(QUEST_PREREQUISITES[q.id]||[]).every(completed);
 const readyFor=q=>progress(q.id)?.status==='active'&&q.objectives.every(o=>progress(q.id).flags.includes(o[0]));
 const questStatus=q=>{
  const p=progress(q.id);
  if(p.status==='completed')return 'completed';
  if(p.status==='active')return readyFor(q)?'ready':'active';
  return unlocked(q)?'available':'locked';
 };
 const quest=()=>QUESTS.find(q=>q.id===a.tracked&&questStatus(q)!=='locked')||
  QUESTS.find(q=>questStatus(q)==='ready')||
  QUESTS.find(q=>questStatus(q)==='active')||
  QUESTS.find(q=>questStatus(q)==='available')||null;
 const syncLegacy=()=>{
  const index=QUESTS.findIndex(q=>!completed(q.id));
  a.index=index<0?QUESTS.length:index;
  a.accepted=progress(QUESTS[a.index]?.id)?.status==='active';
  a.flags=[...(progress(QUESTS[a.index]?.id)?.flags||[])];
 };
 const flag=f=>{
  let changed=false;
  for(const q of QUESTS){
   const p=progress(q.id);
   if(p.status==='active'&&q.objectives.some(o=>o[0]===f)&&!p.flags.includes(f)){
    p.flags.push(f);changed=true;
   }
  }
  if(changed){syncLegacy();emit('adventure',{reason:'Journal updated'});}
 };
 const ready=()=>!!quest()&&readyFor(quest());
 const enough=cost=>Object.entries(cost).every(([id,n])=>(mats[id]||0)>=n);
 const spend=cost=>{for(const [id,n] of Object.entries(cost))mats[id]-=n;};
 // Validate a multi-item grant against the *post-transaction* bag, not each
 // stack independently. This prevents two new reward stacks both claiming the
 // final free slot and permits crafting when consumed materials free a slot.
 function canCarry(rewards={},cost={},equipment=[],coins=0){
  const candidate=structuredClone(data),bag=candidate.inventory.materials;
  if(!Number.isSafeInteger(coins)||coins<0||candidate.coins>10000000-coins)return false;
  candidate.coins+=coins;
  for(const [id,n] of Object.entries(cost)){
   if(!Number.isSafeInteger(n)||n<0||(bag[id]||0)<n)return false;
   bag[id]-=n;if(bag[id]===0)delete bag[id];
  }
  for(const [id,n] of Object.entries(rewards)){
   if(!Number.isSafeInteger(n)||n<0||!Number.isSafeInteger(bag[id]||0)||(bag[id]||0)+n>9999)return false;
   bag[id]=(bag[id]||0)+n;
  }
  for(const entry of equipment){
   const list=entry.kind==='weapon'?candidate.inventory.weapons[entry.style]:
    entry.kind==='armour'?candidate.inventory.armour:candidate.inventory.slotted;
   const stored=entry.kind==='weapon'?candidate.bank.weapons[entry.style]:
    entry.kind==='armour'?candidate.bank.armour:candidate.bank.slotted;
   if(!list.includes(entry.id)&&!stored.includes(entry.id))list.push(entry.id);
  }
  return inventoryKeyList(candidate).length<=Math.max(28,inventoryKeyList(data).length);
 }
 const roomFor=(id,amount=1)=>canCarry({[id]:amount});
 function add(id,n){mats[id]=(mats[id]||0)+n;}
 const reportSkillXp=(skill,before,after)=>{
  const earned=Math.max(0,(Number(after)||0)-(Number(before)||0));
  if(!skill||!Number.isFinite(earned)||earned<=0)return;
  emit('skill-xp',{skill,amount:earned});
  const from=woodcuttingLevel(before).level,to=woodcuttingLevel(after).level;
  if(to>from)emit('skill-level-up',{skill,level:to,previousLevel:from});
 };
 function event(e){
  if(e.type==='hit'&&e.id==='practice')flag('hit:'+e.style);
  if(e.type==='defeated'){
   if(e.id==='guardian')flag('resolve:guardian');
   const m=ADVENTURE_SPAWNS.find(m=>m.id===e.id);
   if(m?.room!==undefined&&a.run&&!a.run.complete&&!a.run.kills.includes(e.id)){
    a.run.kills.push(e.id);emit('adventure',{reason:m.boss?'The keeper is quiet. Restore the heartstone.':'Chamber guardian defeated'});
   }
  }
  if(e.type==='hurt'||e.type==='dead')work=null;
  if(e.type==='dead'){a.deaths++;emit('adventure',{reason:'Recovered belongings; cleared Hollow chambers remain cleared.'});}
 }
 function visit(id){flag('visit:'+id);}
 const starterAxe=()=>!data.inventory.weapons.melee.includes('bronze-axe')&&!data.bank.weapons.melee.includes('bronze-axe');
 function accept(id,choice){
  const q=QUESTS.find(q=>q.npc===id&&(!choice||q.id===choice)&&questStatus(q)==='available');
  if(!q)return no('No new quest available here.');
  if(q.id==='training'&&!canCarry({'frost-scroll':40,'field-arrows':40,ration:3},{},
   [['melee','sword'],['magic','frost'],['ranged','bow']].map(([style,id])=>({kind:'weapon',style,id}))))
   return no('Make room in your backpack for Rowan’s three weapons and supplies.');
  if(q.id==='provisions'&&starterAxe()&&!canCarry({}, {},[{kind:'weapon',style:'melee',id:'bronze-axe'}]))
   return no('Make room in your backpack for the Forester’s axe.');
  progress(q.id).status='active';progress(q.id).flags=[];a.tracked=q.id;a.autoSave=true;
  syncLegacy();
  if(q.id==='training'){
   // Existing bank ownership is still ownership: do not issue a second copy
   // or equip an item that has not been withdrawn into the backpack.
   for(const [s,w] of [['melee','sword'],['magic','frost'],['ranged','bow']])
    if(!data.bank.weapons[s].includes(w))grantWeapon(s,w);
   add('frost-scroll',40);add('field-arrows',40);add('ration',3);
  }
  if(q.id==='provisions')teach();
  emit('adventure',{reason:'Started: '+q.title});return ok(q.intro);
 }
 function finish(id,choice){
  const q=QUESTS.find(q=>q.npc===id&&(!choice||q.id===choice)&&readyFor(q));
  if(!q)return no('There is still work to do.');
  if(data.coins>10000000-q.coins)return no('Bank some coins before claiming your full quest reward.');
  if(!canCarry({}, {}, [],q.coins))return no('Make room for your quest coins before claiming the reward.');
  data.coins+=q.coins;
  progress(q.id).status='completed';progress(q.id).flags=[];
  a.tracked=QUESTS.find(x=>questStatus(x)==='ready')?.id||
   QUESTS.find(x=>questStatus(x)==='active')?.id||
   QUESTS.find(x=>questStatus(x)==='available')?.id||null;
  syncLegacy();
  emit('adventure',{reason:'Completed: '+q.title+' · '+q.coins+' coins'});return ok(q.end);
 }
 function teach(){
  if(starterAxe()&&!canCarry({}, {},[{kind:'weapon',style:'melee',id:'bronze-axe'}]))
   return no('Make room for your training axe before visiting Alden.');
  data.professions.woodcuttingLearned=true;
  if(starterAxe())data.inventory.weapons.melee.push('bronze-axe');
  emit('adventure',{reason:'Woodcutting learned · keep your axe in your bag'});return ok('Your axe is ready. Select a softwood tree to begin cutting.');
 }
 function inspect(id){
  const t=ADVENTURE_TARGETS.find(t=>t.id===id);if(!t)return no('Unknown place');
  if(t.optional&&!a.discoveries.includes(t.flag)&&t.flag==='bells'&&!canCarry({'frost-scroll':10,'field-arrows':10}))
   return no('Make room for the bellstones’ scrolls and ammunition, then inspect them again.');
  if(t.flag)flag('inspect:'+t.flag);
  if(t.optional&&!a.discoveries.includes(t.flag)){
   a.discoveries.push(t.flag);
   if(t.flag==='bells'){add('frost-scroll',10);add('field-arrows',10);}
   emit('adventure',{reason:'Discovered: '+t.name});
  }
  return ok(t.text||t.name);
 }
 function craftCheck(choice,station){
  const id=typeof choice==='string'?choice:choice?.id;
  const batches=typeof choice==='string'?1:choice?.batches;
  const original=RECIPES.find(r=>r.id===id&&r.station===station);
  if(!Number.isSafeInteger(batches)||batches<1||batches>10)return no('Choose between 1 and 10 batches.');
  if(batches>1&&!original?.result.material)return no('Equipment is made one item at a time.');
  const r=original?{...original,batches,cost:Object.fromEntries(Object.entries(original.cost).map(([key,n])=>[key,n*batches])),
   result:{...original.result,...(original.result.material?{amount:original.result.amount*batches}:{})},xp:original.xp*batches,seconds:original.seconds*batches}:null;
  if(!r)return no('This recipe needs another crafting method or workstation.');
  if(r.profession&&woodcuttingLevel(a.skills[r.profession]).level<r.level)return no(r.profession+' level '+r.level+' required.');
  if(!enough(r.cost))return no('You need all the listed materials in your backpack.');
  const o=r.result;
  if(o.weapon&&(data.inventory.weapons[o.style].includes(o.weapon)||data.bank.weapons[o.style].includes(o.weapon)))return no('You already own this weapon.');
  if(o.armour&&(data.inventory.armour.includes(o.armour)||data.bank.armour.includes(o.armour)))return no('You already own this armour.');
  if(o.slot&&(data.inventory.slotted.includes(o.slot)||data.bank.slotted.includes(o.slot)))return no('You already own this equipment.');
  const equipment=o.weapon?[{kind:'weapon',style:o.style,id:o.weapon}]:
   o.armour?[{kind:'armour',id:o.armour}]:o.slot?[{kind:'slot',id:o.slot}]:[];
  if(!canCarry(o.material?{[o.material]:o.amount}:{},r.cost,equipment))
   return no('Make room in your backpack or bank a stack before crafting.');
  return {...ok('Ready'),recipe:r};
 }
 function finishCraft(r,time){
  // Materials and inventory rules are checked again at the instant of crafting.
  const check=craftCheck({id:r.id,batches:r.batches},r.station);
  if(!check.ok)return check;
  const o=r.result;spend(r.cost);
  if(o.material)add(o.material,o.amount);
  if(o.weapon)grantWeapon(o.style,o.weapon,false);
  if(o.slot)data.inventory.slotted.push(o.slot);
  if(o.armour)data.inventory.armour.push(o.armour);
  let earnedXp=0;
  if(r.profession){
   const previous=a.skills[r.profession]||0;
   a.skills[r.profession]=Math.max(previous,Math.min(WOODCUTTING_CHAPTER_XP_CAP,previous+r.xp));
   earnedXp=a.skills[r.profession]-previous;
   reportSkillXp(r.profession,previous,a.skills[r.profession]);
  }
  if(['shield','arrows','frost','ember','seal'].includes(r.id))flag('craft:useful');
  if(Number.isFinite(time))recentCraft={skill:r.profession,time};
  const message='Made: '+r.title+(r.batches>1?' × '+r.batches+' batches':'')+(earnedXp?' · +'+earnedXp+' '+r.profession+' XP':'');
  emit('adventure',{reason:message});return ok(message);
 }
 /** No station interaction necessary; selecting two materials selects an
  * unambiguous matching craft. More complex shared inputs use the recipe book. */
 function handcraft(recipeId,threatened,time){
  if(work)return no('Finish or cancel your current work first.');
  if(threatened)return no('Cannot craft while enemies are attacking.');
  const check=craftCheck(recipeId,'inventory');
  return check.ok?finishCraft(check.recipe,time):check;
 }
 function combine(first,second,threatened,time){
  if(typeof first!=='string'||typeof second!=='string'||first===second)return no('Choose two different crafting materials.');
  const matches=RECIPES.filter(r=>r.station==='inventory'&&
   Object.hasOwn(r.cost,first)&&Object.hasOwn(r.cost,second));
  if(!matches.length)return no('These items cannot be combined. Check the Skills unlock list.');
  if(matches.length>1)return no('Several recipes use those materials. Choose a result from MAKE in your backpack.');
  return handcraft(matches[0].id,threatened,time);
 }
 function begin(target,time,recipeId){
  if(work)return no('Finish or cancel your current work first.');
  if(target.kind==='station'){
   const check=craftCheck(recipeId,target.station);if(!check.ok)return check;
   work={target,recipe:check.recipe,start:time,end:time+check.recipe.seconds};
  }else if(target.kind==='resource'||target.kind==='grove'){
   if((respawns.get(target.id)||0)>time)return no('This resource is recovering. Try another nearby deposit.');
   const repeats=recipeId?.batches??1;
   if(!Number.isSafeInteger(repeats)||repeats<1||repeats>5)return no('Gather between 1 and 5 resources at a time.');
   const material=target.material||'softwood-logs';
   if(!roomFor(material))return no('Your backpack is full. Visit Mara at the bank.');
   if(material==='softwood-logs'){
    const check=canCutTree(data,'softwood');if(!check.ok)return check;
    if(!trees.has(target.id))trees.set(target.id,newTreeState('softwood',random));
    respawnTree(trees.get(target.id),time,random);
    if(trees.get(target.id).respawnAt)return no('This tree is regrowing.');
   }
   work={target,material,remaining:repeats,start:time,
    end:time+(material==='softwood-logs'?woodcuttingCycleSeconds(random):target.seconds||1.18)};
  }else return no('Nothing to gather here.');
  return ok('Working… moving away or taking damage cancels.');
 }
 function tick(time,dt,player){
  if(a.run&&!a.run.complete&&player.z>210)a.run.seconds=Math.min(86400,a.run.seconds+dt);
  if(!work)return;
  const w=work;
  if(distance(player,w.target)>w.target.reach||!sight(player,w.target)){work=null;emit('adventure-notice',{reason:'Work cancelled: out of reach.'});return;}
  if(time<w.end)return;
  work=null;
  if(w.recipe){
   const made=finishCraft(w.recipe,time);
   if(!made.ok)emit('adventure-notice',{reason:made.reason});
  }else if(w.material==='softwood-logs'){
   const previous=data.professions.woodcuttingXp||0;
   const result=chopOnce(data,trees.get(w.target.id),time,random);
   if(result.success){
    reportSkillXp('woodcutting',previous,data.professions.woodcuttingXp);
    flag('gather:softwood-logs');
    emit('adventure',{reason:'Gathered softwood logs'+(result.xp?' · +'+result.xp+' Woodcutting XP':'')});
   }
   if(result.ok&&!result.depleted){work={...w,start:time,end:time+woodcuttingCycleSeconds(random)};}
   else emit('adventure-notice',{reason:result.depleted?'Tree depleted; try another grove.':result.reason});
  }else if(roomFor(w.material)){
   add(w.material,1);
   let earnedXp=0;
   if(w.target.profession){
    const previous=a.skills[w.target.profession]||0;
    a.skills[w.target.profession]=Math.max(previous,Math.min(WOODCUTTING_CHAPTER_XP_CAP,previous+18));
    earnedXp=a.skills[w.target.profession]-previous;
    reportSkillXp(w.target.profession,previous,a.skills[w.target.profession]);
   }
   respawns.set(w.target.id,time+3);flag('gather:'+w.material);
   emit('adventure',{reason:'Gathered '+w.material+(earnedXp?' · +'+earnedXp+' '+w.target.profession+' XP':'')});
   if(w.remaining>1)work={...w,remaining:w.remaining-1,start:time,end:time+3+(w.target.seconds||3)};
  }else emit('adventure-notice',{reason:'Gathering stopped: make room in your backpack.'});
 }
 function action(kind,{target,choice,time,player,threatened=false}={}){
  if(kind==='cancel'){work=null;return ok('Work cancelled.');}
  if(kind==='track'){
   const q=QUESTS.find(q=>q.id===choice);
   if(!q||questStatus(q)==='locked')return no('That quest is not yet available.');
   a.tracked=q.id;emit('adventure',{reason:'Tracking '+q.title});
   return ok('Tracking '+q.title);
  }
  if(kind==='craft'&&!target)return handcraft(choice,threatened,time);
  if(kind==='combine'&&!target)return combine(choice?.first,choice?.second,threatened,time);
  if(kind==='eat'){
   if(time<eatUntil)return no('Wait before eating again.');
   if((mats.ration||0)<1)return no('Make field rations from reeds in your backpack.');
   if(!heal(35))return no('You are already at full Health.');
   mats.ration--;eatUntil=time+8;emit('adventure',{reason:'Ate a ration · restored Health'});return ok('Restored up to 35 Health.');
  }
  if(kind==='drink'){
   if(time<drinkUntil)return no('The tonic is still settling.');
   if((mats['woodland-tonic']||0)<1)return no('Blend woodland tonic from moss fibre in your backpack.');
   if(!heal(20))return no('You are already at full Health.');
   mats['woodland-tonic']--;drinkUntil=time+12;
   emit('adventure',{reason:'Drank woodland tonic · recovered Health'});
   return ok('Restored up to 20 Health.');
  }
  if(!target||distance(player,target)>target.reach||!sight(player,target))return no('Move within reach first.');
  if(kind==='accept')return accept(target.id,choice);
  if(kind==='finish')return finish(target.id,choice);
  if(kind==='teach'&&target.id==='service:forester')return teach();
  if(kind==='inspect')return inspect(target.id);
  if(kind==='gather'||kind==='craft'){
   if(threatened)return no('Finish the fight before working.');
   return begin(target,time,choice);
  }
  if(kind==='rest'&&['adventure:spring','adventure:cook'].includes(target.id)){
   if(threatened)return no('You cannot rest while pursued.');
   heal(999);return ok('Rested and recovered Health.');
  }
  if(kind==='calm'&&target.id==='adventure:stump'){
   if(progress('roots').status!=='active'||progress('roots').flags.includes('resolve:guardian'))return no('The guardian is already quiet, or the investigation has not begun.');
   if(!enough({'ward-seal':1}))return no('Craft a restoration seal in your backpack using reeds and a bronze bar.');
   spend({'ward-seal':1});calmGuardian();flag('resolve:guardian');return ok('The roots loosen. You have spared the guardian.');
  }
  if(kind==='answer'&&target.id==='adventure:scout'){
   if(!progress('outpost').flags.includes('inspect:journal')||!progress('outpost').flags.includes('inspect:memorial'))return no('Read the journal and memorial before answering.');
   if(choice!=='protect')return no('Nessa shakes her head. Read the memorial again: whom did the watch serve?');
   flag('solve:watch');return ok('They kept the forest alive. The Hollow is a wound, not a treasure vault.');
  }
  if(kind==='prepare'&&target.id==='citizen:guard'){
   if(!enough({'ward-seal':1,ration:3})||Math.max(mats['frost-scroll']||0,mats['field-arrows']||0)<20)return no('Pack a seal, 3 rations, and 20 frost scrolls or arrows.');
   flag('prepare:supplies');return ok('Elowen checks your supplies. You keep them for the journey.');
  }
  if(kind==='enter'&&target.kind==='entrance'){
   if(!completed('seal'))return no('Finish preparing with Elowen before entering.');
   if(threatened)return no('Lose your pursuers before descending.');
   if(!a.run||a.run.complete){
    if(!enough({'ward-seal':1}))return no('Each new expedition needs one restoration seal.');
    spend({'ward-seal':1});a.run={kills:[],wards:[],complete:false,seconds:0};
    data.groundLoot=data.groundLoot.filter(d=>d.z<200);
   }
   resetDungeon(a.run);emit('adventure',{reason:'Entered Warden’s Hollow'});
   return {...ok('Listen for the warning bell. Restore each chamber ward after its guardians fall.'),teleport:{x:0,z:218}};
  }
  if(kind==='leave'&&target.kind==='exit')return {...ok('Returned to the forest. Your cleared chambers are remembered.'),teleport:{x:0,z:177}};
  if(kind==='ward'&&target.kind==='ward'){
   if(!a.run||a.run.complete)return no('Begin a new expedition at the entrance.');
   // A ward can only be restored after the previous chamber is secured.
   // This is enforced in gameplay state, not only through wall collision,
   // and remains safe when an old saved run is resumed mid-dungeon.
   if(target.room>0&&!a.run.wards.includes(target.room-1))
    return no('Restore the previous chamber ward first.');
   if(ADVENTURE_SPAWNS.some(m=>m.room===target.room&&!a.run.kills.includes(m.id)))return no('The chamber guardians still bind this ward.');
   if(!a.run.wards.includes(target.room)){a.run.wards.push(target.room);heal(999);emit('adventure',{reason:target.name+' restored'});}
   return ok('The next chamber opens. The restored ward replenishes your Health.');
  }
  if(kind==='heart'&&target.kind==='heart'){
   if(!a.run||a.run.complete)return no('The heart is already restored. Begin another expedition at the entrance.');
   if(!a.run.kills.includes('hollow-keeper')||![0,1,2].every(i=>a.run.wards.includes(i)))
    return no('Restore all three wards and defeat the keeper first.');
   if(!canCarry({'warden-heart':1,'hollow-shard':4}))return no('Make space for both the heart and shards before restoring it.');
   add('warden-heart',1);add('hollow-shard',4);a.run.complete=true;a.clears++;flag('dungeon:clear');emit('adventure',{reason:'Warden’s Hollow cleared · heart and 4 shards received'});
   return ok('The heart beats steadily. Return to Elowen, or ring a refuge bell to leave.');
  }
  if(kind==='timber'&&target.id==='service:store'){
   if(!enough({'softwood-logs':5}))return no('Darrin needs five softwood logs for 8 coins.');
   if(data.coins>10000000-8||!data.coins&&inventoryKeyList(data).length>=28&&(mats['softwood-logs']||0)>5)return no('Make room for the coins before selling.');
   spend({'softwood-logs':5});data.coins+=8;emit('adventure',{reason:'Sold 5 logs for 8 coins'});return ok('Good timber. Oakrest always needs repairs.');
  }
  if(kind==='bounty'&&target.id==='citizen:guard'){
   const reward=Object.hasOwn(WATCH_BOUNTIES,choice)?WATCH_BOUNTIES[choice]:null;
   if(!reward)return no('Choose a watch supply pack.');
   if(!enough({'bandit-token':5}))return no('Bring five bandit tokens for a supply pack.');
   if(!canCarry({[reward.material]:reward.amount},{'bandit-token':5}))return no('Make room for the full supply pack first.');
   spend({'bandit-token':5});add(reward.material,reward.amount);
   const reason='Watch supplies · '+reward.title+' received for 5 bandit tokens';
   emit('adventure',{reason});return ok(reason);
  }
  if(kind==='contract'&&target.id==='citizen:guard'){
   if(!completed('hollow')||a.contracts>=a.clears)return no('Complete another Hollow expedition to supply the watch.');
   if(!enough({'hollow-shard':2}))return no('Bring two Hollow shards.');
   if(data.coins>10000000-35)return no('Bank coins before supplying the watch so none of the reward is lost.');
   if(!canCarry({ration:3},{'hollow-shard':2},[],35))return no('Make room for the coins and three rations before supplying the watch.');
   spend({'hollow-shard':2});a.contracts++;data.coins+=35;add('ration',3);
   emit('adventure',{reason:'Watch supplied · 35 coins and 3 rations'});return ok('These will hold the ward until your next expedition.');
  }
  return no('That action is unavailable here.');
 }
 return {action,event,visit,tick,flag,ready,craftCheck,
  consumableCooldowns:()=>({eat:eatUntil,drink:drinkUntil}),
  state:()=>({...structuredClone(a),quest:quest(),ready:ready(),
   catalogue:QUESTS.map(q=>({...q,status:questStatus(q),flags:[...progress(q.id).flags],
    prerequisites:QUEST_PREREQUISITES[q.id]||[]})),
   work:work?{name:work.recipe?.title||work.material,start:work.start,end:work.end,
    skill:work.recipe?.profession||work.target?.profession||(work.material==='softwood-logs'?'woodcutting':null),
    targetId:work.target?.id||null,x:work.target?.x,z:work.target?.z}:null,
   recentCraft:recentCraft?{...recentCraft}:null,
   trees:[...trees].map(([id,tree])=>({id,respawnAt:tree.respawnAt,fallAt:tree.fallAt}))}),
  canPass:z=>z<241||!!a.run&&(z<269?a.run.wards.includes(0):z<297?a.run.wards.includes(1):a.run.wards.includes(2))};
}
