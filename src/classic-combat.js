import {createClassicSimulationClock,classicWeaponInterval,nextCombatBeat,onCombatBeat,COMBAT_TICK_SECONDS} from './classic-combat-clock.js';
import {isUtilityAbility as utility,isAreaAbility as area,abilityWindup,abilitySupply,abilityEffect,abilityDetails} from './classic-abilities.js';
import {classicEnemyProfile} from './classic-combat-motion.js';
import {ADVENTURE_SPAWNS,ADVENTURE_XP_REWARDS} from './adventure-content.js';
import {createAdventure} from './adventure-state.js';
/**
 * Classic gameplay simulation. The presenter owns rendering and guarded saves.
 * Commands validate before commitment and again before release. Attack sources
 * are immutable snapshots; recovery survives cancelled windups and style changes.
 */
import {STYLE_ORDER,LOADOUTS,levelFromXp,maxHealth,damageAfterArmour,
 defenceFor,slotFamily,equippedSkills,ownsWeapon,XP_BY_MOB,combatLevelFromXp} from './rules.js';
import {maxHitForAction,accuracyFor,rollHit,inAttackRange} from './auto-combat.js';
import {projectileTravel} from './attack-rules.js';
import {equipmentModifiers} from './equipment-slots.js';
import {ENEMY_COMBAT,ENEMY_PATTERNS,enemyBehaviour,isThreatened} from './combat-feel.js';
import {abilityCooldownKey,DODGE,dodgeInvulnerable} from './combat-physics.js';
import {isOakrestSafe} from './town-services.js';
import {solidAt,slideMove,findClassicPath,clearClassicLine} from './classic-presentation.js';
import {combatSourceSnapshot,awardMonsterVictory} from './gameplay-core.js';
import {createMonsterDrops,MAX_GROUND_LOOT,closestDrop} from './loot.js';
import {classicItemAction,classicPickup,classicItemSnapshot} from './classic-item-state.js';
import {canCompleteInteraction,findClassicInteractable,interactionSight} from './classic-interactions.js';

const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const toward=(a,b)=>{const d=Math.max(.00001,dist(a,b));return {x:(b.x-a.x)/d,z:(b.z-a.z)/d};};
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const spawn=Object.freeze([
 {id:'practice',type:'dummy',x:-1,z:73,maxHp:100},
 {id:'moss-a',type:'mossling',x:-12,z:87,maxHp:58},
 {id:'moss-b',type:'mossling',x:10,z:87,maxHp:58},
 {id:'boar-a',type:'boar',x:1,z:91,maxHp:100},
 {id:'bandit-a',type:'bandit',x:26,z:89,maxHp:148}
]);
const isAlive=e=>e&&!e.hidden&&!e.dead&&e.hp>0&&!e.retreating;
const wallClear=(a,b)=>clearClassicLine(a,b,.1);
function initialMonster(def){
 return {...def,x:def.x,z:def.z,startX:def.x,startZ:def.z,
  name:def.name||ENEMY_COMBAT[def.type].name,level:def.level||ENEMY_COMBAT[def.type].level,
  hp:def.maxHp,aggro:false,retreating:false,dead:false,lastAttack:0,
  warning:null,stunUntil:0,slowUntil:0,rootUntil:0,bleedUntil:0,nextBleed:0,
  bleedSource:null,respawnAt:0,deathAt:null,noticeSuppressed:false,hitFlashUntil:0,life:0,aiState:'idle',recoverUntil:0,routeAt:0,stuckFor:0,patrolIndex:0,lastSeen:null,lostSightAt:null,releaseUntil:0};
}
function safeWeapon(data,style){
 const id=data.gear?.[style],weapon=LOADOUTS[style]?.[id];
 return weapon&&(ownsWeapon(data,style,id)||data.onboarding?.area==='tutorial')?weapon:null;
}
export function createClassicCombat({save,random=Math.random,adventure=false,monsterDefinitions=null}={}){
 const data=JSON.parse(JSON.stringify(save||{}));
 const original=JSON.parse(JSON.stringify(save||{}));
 const loaned={};
 // Session-only practice weapons for characters who have not yet completed
 // onboarding. Nothing here reaches browser storage or the source character.
 for(const s of STYLE_ORDER){
  if(adventure&&data.characterFresh===true)continue;
  if(!data.inventory?.weapons?.[s]?.length){
   const loan={melee:'sword',magic:'frost',ranged:'bow'}[s];
   // A banked weapon is real ownership. Never duplicate it with a practice
   // loan, which would otherwise strip the legitimate withdrawal on save.
   if(data.bank?.weapons?.[s]?.includes(loan))continue;
   loaned[s]=loan;
   data.inventory??={};data.inventory.weapons??={};data.inventory.weapons[s]=[loan];
   data.gear??={};data.gear[s]=loan;
  }
 }
 const monsters=(monsterDefinitions||[...spawn,...(adventure?ADVENTURE_SPAWNS:[])]).map(initialMonster),events=[],projectiles=[],cooldowns=new Map();
 data.groundLoot=Array.isArray(data.groundLoot)?data.groundLoot:[];
 // Stable within a session, unique across page reloads. Prevent saved drops
 // from colliding with IDs newly generated in later browser sessions.
 const dropSession=Date.now().toString(36);
 let nextDrop=0;
 let time=0,style='melee',targetId=null,attackUntil=0,switchUntil=0,dodgeUntil=0,dodgeStart=-Infinity;
 let action=null,lastRelease=null,queuedAbility=null,shieldUntil=0,shieldStyle=null,deadUntil=0,abilityRecoveryUntil=0,lastFailure=null;
 const clock=createClassicSimulationClock();
 let hp=maxHealth(levelFromXp(data.xp?.vitality||0).level);
 const emit=(type,details={})=>events.push({type,time,...details});
 const adventureSystem=adventure?createAdventure(data,{emit,random,sight:interactionSight,
  grantWeapon:(s,id,equip=true)=>{if(loaned[s]===id)delete loaned[s];if(!data.inventory.weapons[s].includes(id))data.inventory.weapons[s].push(id);if(equip)data.gear[s]=id;},
  heal:amount=>{if(hp<=0)return false;const prev=hp;hp=Math.min(maxHealth(levelFromXp(data.xp.vitality).level),hp+amount);return hp>prev;},
  calmGuardian:()=>{const e=monsters.find(m=>m.id==='guardian');if(e){e.dead=true;e.respawnAt=Infinity;}},
  resetDungeon:run=>{for(const e of monsters.filter(m=>m.room!==undefined)){const def=ADVENTURE_SPAWNS.find(m=>m.id===e.id);Object.assign(e,initialMonster(def),{life:e.life+1,dead:run.kills.includes(e.id),respawnAt:Infinity});}stopTarget();projectiles.length=0;}
 }):null;
 const active=()=>monsters.filter(isAlive);
 const getTarget=()=>active().find(m=>m.id===targetId)||null;
 const styleWeapon=()=>safeWeapon(data,style);
 const skills=()=>styleWeapon()?equippedSkills(data,style,data.gear[style]):[null,null,null,null];
 const canFight=()=>hp>0&&time>=deadUntil;
 const snapshot=()=>styleWeapon()?{...combatSourceSnapshot(data,style,styleWeapon()),weapon:styleWeapon()}:null;
 const fail=reason=>{lastFailure=reason;return false;};
 function stopTarget(reason='disengaged'){
  // Cancels windups and queued offensive skills immediately, but never refunds
  // an already fired projectile or bypasses the real weapon cooldown.
  if(targetId||action||queuedAbility){
   actionCancel(reason);targetId=null;
   emit('target-lost',{reason});
  }
}
 function syncVisibility(player){
  for(const e of monsters)if(e.room!==undefined)e.hidden=!data.adventure?.run||player.z<210||!adventureSystem?.canPass(e.startZ);
 }
 function chooseTarget(id,player){
  syncVisibility(player);
  const e=monsters.find(m=>m.id===id);
  if(e?.room!==undefined&&(!data.adventure?.run||!adventureSystem?.canPass(e.startZ)))return false;
  if(!e||!isAlive(e)||!canFight()||dist(e,player)>30)return false;
  playerForAction={x:player.x,z:player.z};
  if(targetId!==id)actionCancel('Target changed.');
  targetId=id;emit('target',{id,name:e.name,level:e.level});queueBasic(player);return true;
 }
 function styleSwitch(next){
  if(!STYLE_ORDER.includes(next)||next===style||!canFight())return false;
  // Appearance/loadout changes immediately; committed recovery is never reset.
  actionCancel('Style changed.');lastRelease=null;style=next;switchUntil=time+.12;
  emit('style',{style});return true;
 }
 function validTargets(player,weapon,ability,target=getTarget()){
  const reach=ability?.reach||weapon.reach;
  const reachable=e=>isAlive(e)&&inAttackRange(player,e,reach,wallClear(player,e));
  if(area(ability))return active().filter(reachable).slice(0,5);
  return reachable(target)?[target]:[];
 }
 function supplyFor(attackStyle,weapon,ability,targets){
  return abilitySupply(attackStyle,weapon,ability,targets.length,!!adventureSystem);
 }
 function validateAttack(player,attackStyle,weapon,ability,target=getTarget()){
  if(!Number.isFinite(player?.x)||!Number.isFinite(player?.z))return {ok:false,reason:'Choose a valid position.'};
  if(!canFight())return {ok:false,reason:'Wait until you recover.'};
  if(time<dodgeStart+DODGE.duration)return {ok:false,reason:'Finish dodging before attacking.'};
  if(!weapon)return {ok:false,reason:'Equip an owned weapon for this style.'};
  if(ability?.kind==='heal'&&hp>=maxHealth(levelFromXp(data.xp.vitality).level))return {ok:false,reason:'Health is already full.'};
  const targets=utility(ability)?[]:validTargets(player,weapon,ability,target);
  if(!utility(ability)&&!targets.length)return {ok:false,reason:target?'Move into range with a clear line of sight.':'Select a living target first.'};
  const supply=supplyFor(attackStyle,weapon,ability,targets);
  if(supply&&(data.inventory.materials[supply.id]||0)<supply.amount)
   return {ok:false,reason:'Not enough '+supply.id.replaceAll('-',' ')+'. Craft more or switch style.'};
  return {ok:true,targets,supply};
 }
 function queueAbility(index,player=playerForAction){
  const ability=skills()[index],weapon=styleWeapon();
  if(!ability)return fail('Ability slot locked or empty.');
  const id=abilityCooldownKey(style,slotFamily(style,data.gear[style]),ability);
  if((cooldowns.get(id)||0)>time)return fail('Ability is cooling down.');
  const validation=validateAttack(player,style,weapon,ability);
  if(!validation.ok)return fail(validation.reason);
  lastFailure=null;
  if(action||time<abilityRecoveryUntil||time<switchUntil){
   queuedAbility={index,id:ability.id,name:ability.name,style,weapon:data.gear[style],targetId};return true;
  }
  const windup=abilityWindup(weapon,ability);
  cooldowns.set(id,time+ability.cooldown);
  abilityRecoveryUntil=time+Math.max(.4,windup+.15);
  attackUntil=Math.max(attackUntil,nextCombatBeat(time+classicWeaponInterval(weapon)));
  action={type:'ability',style,ability,weapon,weaponId:data.gear[style],targetId,
   targetLife:getTarget()?.life,startedAt:time,impactAt:time+windup,source:snapshot()};
  emit('windup',{style,kind:ability.kind,name:ability.name,until:action.impactAt});
  return true;
 }
 function queueBasic(player){
  const weapon=styleWeapon(),enemy=getTarget();
  if(!weapon||!enemy||!canFight()||action||queuedAbility||time<switchUntil||
   time<abilityRecoveryUntil||!onCombatBeat(time)||time+1e-9<attackUntil)return false;
  const validation=validateAttack(player,style,weapon,null,enemy);
  if(!validation.ok){
   if(validation.supply||validation.reason.startsWith('Not enough')){
    stopTarget('supplies');emit('adventure-notice',{reason:validation.reason});
   }
   return false;
  }
  attackUntil=time+classicWeaponInterval(weapon);
  const windup=Math.min(classicWeaponInterval(weapon)*.70,weapon.windup||weapon.interval*.25);
  action={type:'basic',style,weapon,weaponId:data.gear[style],targetId:enemy.id,
   targetLife:enemy.life,startedAt:time,impactAt:time+windup,source:snapshot()};
  emit('windup',{style,kind:'basic',name:weapon.title,until:action.impactAt});
  return true;
 }
 function applyEnemyHit(enemy,damage,source,ability={}){
  if(!isAlive(enemy)||!source||!Number.isFinite(damage))return;
  // A real attack reaching the creature is a fresh hostile trigger even if
  // its accuracy roll misses. Selection alone does not provoke passive mobs.
  enemy.aggro=enemy.type!=='dummy';enemy.noticeSuppressed=false;
  const max=ability.periodic?Math.max(1,Math.floor(damage)):
    maxHitForAction(source.maxHit,source.weaponBasic,damage);
  const chance=enemy.type==='dummy'?1:
    accuracyFor(source.level,enemy.level,source.weaponBasic,
      enemy.guard??({mossling:0,boar:.04,bandit:.08}[enemy.type]||0),source.power);
  const result=ability.periodic?{hit:true,damage:max}:
    rollHit({maxHit:Math.max(1,Math.round(max*(enemy.weak===source.style?1.25:1))),accuracy:chance,random});
  if(!result.hit){emit('miss',{id:enemy.id,style:source.style});return;}
  enemy.hp=Math.max(0,enemy.hp-result.damage);
  enemy.hitFlashUntil=time+.18;
  if(ability.stun)enemy.stunUntil=time+ability.stun;
  if(ability.slow)enemy.slowUntil=time+ability.slow;
  if(ability.root)enemy.rootUntil=time+ability.root;
  if(ability.bleed){enemy.bleedUntil=time+ability.bleed;enemy.nextBleed=time+1;enemy.bleedSource=source;}
  emit('hit',{id:enemy.id,abilityId:ability.id||null,control:ability.root?'ROOTED':ability.stun?'STAGGERED':ability.slow?'SLOWED':ability.bleed?'BLEEDING':null,damage:result.damage,style:source.style,family:source.weapon?.family,periodic:!!ability.periodic,remaining:enemy.hp});
  if(enemy.hp<=0){
   if(targetId===enemy.id){targetId=null;queuedAbility=null;}
   if(enemy.type==='dummy'){enemy.hp=enemy.maxHp;emit('dummy',{id:enemy.id});return;}
   enemy.dead=true;enemy.deathAt=time;enemy.aiState='death';enemy.aggro=false;enemy.warning=null;enemy.respawnAt=enemy.room!==undefined?Infinity:time+(enemy.adventure?45:12);
   const xp=enemy.adventure?ADVENTURE_XP_REWARDS[enemy.id]??XP_BY_MOB[enemy.type]:XP_BY_MOB[enemy.type];
   const reward=awardMonsterVictory(data,enemy.type,source.style,xp);
   if(reward.awarded)emit('xp',{style:source.style,amount:reward.amount,reward});
   const drops=createMonsterDrops(enemy.type,enemy.x,enemy.z,random,
    ()=> 'classic-'+dropSession+'-'+(++nextDrop)+'-'+Math.floor(time*100));
   if(enemy.room!==undefined)drops.push({kind:'material',itemId:'hollow-shard',amount:1,id:'hollow-'+dropSession+'-'+(++nextDrop),x:enemy.x,z:enemy.z});
   data.groundLoot.push(...drops);
   if(data.groundLoot.length>MAX_GROUND_LOOT)data.groundLoot.splice(0,data.groundLoot.length-MAX_GROUND_LOOT);
   if(drops.length)emit('ground-loot',{count:drops.length,ids:drops.map(d=>d.id)});
   emit('defeated',{id:enemy.id,name:enemy.name});
  }
 }
 function addProjectile(enemy,damage,source,ability,speed,kind,delay=0){
  if(!enemy||!source)return;
  const dir=toward(playerForAction,enemy),range=source.weapon?.reach||20;
  projectiles.push({x:playerForAction.x,z:playerForAction.z,direction:dir,speed,
   remaining:ability?.reach||range,targetId:enemy.id,targetLife:enemy.life,damage,source,
   ability,kind,delay,travelled:0});
  emit('projectile',{style:source.style,kind,x:playerForAction.x,z:playerForAction.z});
 }
 let playerForAction={x:0,z:73};
 function executeAction(player){
  if(!action||time+1e-9<action.impactAt)return;
  const current=action;action=null;
  if(!canFight()||style!==current.style||data.gear[current.style]!==current.weaponId)return;
  const enemy=monsters.find(e=>e.id===current.targetId&&e.life===current.targetLife);
  const weapon=current.weapon,source=current.source,a=current.ability;
  const validation=validateAttack(player,current.style,weapon,a,enemy||null);
  if(!validation.ok){lastFailure=validation.reason;emit('action-cancelled',{name:a?.name||null,reason:validation.reason});return;}
  if(validation.supply){
   const {id,amount}=validation.supply;
   data.inventory.materials[id]-=amount;emit('adventure',{reason:'Used '+id,amount});
  }
  const targets=validation.targets;
  lastRelease={time,style:current.style,kind:a?.kind||'basic',family:weapon.family,abilityId:a?.id||null,
   name:a?.name||null,effect:abilityEffect(current.style,weapon,a),reach:a?.reach||weapon.reach,
   x:player.x,z:player.z,direction:enemy?toward(player,enemy):null};
  emit('release',{...lastRelease});
  if(current.type==='basic'){
   if(current.style==='melee')for(const target of targets)applyEnemyHit(target,weapon.basic,source,
    {kind:'hit',bleed:weapon.family==='daggers'?1.5:0});
   else for(const target of targets)addProjectile(target,weapon.basic,source,{},current.style==='magic'?21:36,'basic');
   return;
  }
  if(utility(a)){
   if(a.kind==='shield'){shieldUntil=time+a.duration;shieldStyle=current.style;emit('shield',{until:shieldUntil});}
   else if(a.kind==='heal'){
    const before=hp;hp=Math.min(maxHealth(levelFromXp(data.xp.vitality).level),hp+a.heal);emit('heal',{amount:hp-before});
   }else emit('dash',{distance:(a.kind==='dash'?1:-1)*a.distance});
  }else if(current.style==='melee'||a.kind==='nova'){
   for(const target of targets){
    const strikes=a.strikes||1;
    for(let n=0;n<strikes;n++)applyEnemyHit(target,(a.damage+(a.kind==='execute'&&target.bleedUntil>time?20:0))/strikes,source,a);
   }
   emit(a.kind==='nova'?'area':'swing',{x:player.x,z:player.z,radius:a.reach,reach:a.reach,style,kind:a.kind});
  }else{
   for(const target of targets)for(let n=0;n<(a.kind==='burst'?(a.count||3):1);n++)
    addProjectile(target,a.damage,source,a,a.speed||(current.style==='magic'?21:36),a.kind,n*.09);
   if(a.kind==='retreat')emit('dash',{distance:-4});
  }
 }
 function moveProjectiles(dt){
  for(let i=projectiles.length-1;i>=0;i--){
   const p=projectiles[i];
   if(p.delay>0){p.delay=Math.max(0,p.delay-dt);continue;}
   const target=monsters.find(e=>e.id===p.targetId);
   if(!isAlive(target)||target.life!==p.targetLife){projectiles.splice(i,1);continue;}
   p.direction=toward(p,target);
   const next=projectileTravel(p.travelled,p.speed,dt,p.remaining);
   const steps=Math.max(1,Math.ceil(next.step/.15)),oldX=p.x,oldZ=p.z;
   let blocked=false,hit=false,contact={x:p.x,z:p.z};
   for(let k=1;k<=steps;k++){
    const f=k/steps,x=oldX+p.direction.x*next.step*f,z=oldZ+p.direction.z*next.step*f;
    if(solidAt(x,z,.08)){blocked=true;contact={x,z};break;}
    if(Math.hypot(target.x-x,target.z-z)<(target.type==='boar'?.85:.67)){hit=true;break;}
   }
   if(hit){
    applyEnemyHit(target,p.damage,p.source,p.ability||{});
    if(p.ability?.explosion)for(const other of active())if(other!==target&&
     dist(other,target)<=p.ability.explosion&&wallClear(target,other))applyEnemyHit(other,p.damage*.45,p.source,{});
    projectiles.splice(i,1);
   }else if(blocked||next.expired){emit('impact',{...contact,blocked});projectiles.splice(i,1);}
   else{p.x+=p.direction.x*next.step;p.z+=p.direction.z*next.step;p.travelled=next.distance;}
  }
 }
 function enemyAttack(enemy,warning,player){
  const spec={...(enemy.pattern||ENEMY_PATTERNS[enemy.type]),...warning};
  if(!isAlive(enemy)||!canFight()||dist(enemy,player)>spec.engage+.1||
   !isThreatened(warning.kind,warning,player)||!wallClear(enemy,player)){
   emit('enemy-whiff',{id:enemy.id});return false;
  }
  if(dodgeInvulnerable(time,dodgeStart)){emit('evade',{id:enemy.id});return true;}
  const vitality=levelFromXp(data.xp.vitality).level,guard=equipmentModifiers(data,style).guard;
  const resistance=Math.min(.45,guard+defenceFor(data.armour[style]).physical*.5);
  const result=rollHit({maxHit:Math.max(1,Math.round(spec.damage)),
   accuracy:accuracyFor(enemy.level,vitality,19,resistance),random});
  if(!result.hit){emit('enemy-miss',{id:enemy.id});return true;}
  const harm=Math.max(1,Math.round(damageAfterArmour(result.damage,shieldUntil>time,
   data.armour[style])*(1-guard)));
  const guarded=shieldUntil>time;
  hp=Math.max(0,hp-harm);emit('hurt',{id:enemy.id,damage:harm,hp,guarded});
  if(hp===0){
   deadUntil=time+2.1;actionCancel('Defeated.');shieldUntil=0;shieldStyle=null;lastRelease=null;targetId=null;projectiles.length=0;
   emit('dead',{until:deadUntil});
  }
  return true;
 }
 function moveEnemy(e,destination,speed,dt){
  let goal=destination;
  if(!clearClassicLine(e,destination,.4)){
   if(!e.route||time>=e.routeAt){e.route=findClassicPath(e,destination);e.routeAt=time+.9;}
   while(e.route.length&&dist(e,e.route[0])<.08)e.route.shift();
   goal=e.route[0];
  }else e.route=null;
  const before={x:e.x,z:e.z};
  if(goal){
   const heading=toward(e,goal),distance=Math.min(dist(e,goal),speed*dt);
   const next={x:e.x+heading.x*distance,z:e.z+heading.z*distance};
   if(clearClassicLine(e,next,.4)){e.x=next.x;e.z=next.z;}
  }
  e.stuckFor=dist(before,e)<.0001?e.stuckFor+dt:0;
 }
 function returnHome(e,cfg,dt){
  if(!e.retreating){e.returnAt=time;e.route=null;e.stuckFor=0;e.noticeSuppressed=true;}
  if(!e.retreating)emit('enemy-disengaged',{id:e.id});
  e.aiState='return';e.aggro=false;e.warning=null;e.retreating=true;
  e.bleedUntil=0;e.bleedSource=null;e.rootUntil=0;e.stunUntil=0;e.slowUntil=0;
  moveEnemy(e,{x:e.startX,z:e.startZ},cfg.returnSpeed,dt);
  // A blocked dynamic route cannot leave a monster stuck forever. Returning
  // monsters are untargetable and issue no rewards when restored to spawn.
  if(dist(e,{x:e.startX,z:e.startZ})<.25||e.stuckFor>3||time-e.returnAt>12){
   e.x=e.startX;e.z=e.startZ;e.retreating=false;e.hp=e.maxHp;
   e.aiState='idle';e.route=null;e.stuckFor=0;e.recoverUntil=time+.6;
  }
 }
 function updateMonsters(player,dt){
  for(const e of monsters){
   if(e.room!==undefined){
    e.hidden=!data.adventure?.run||player.z<210||!adventureSystem.canPass(e.startZ);
    if(e.hidden)continue;
    if(!adventureSystem.canPass(e.startZ)){e.aggro=false;e.warning=null;continue;}
   }
   if(e.dead){
    if(time>=e.respawnAt){
     Object.assign(e,initialMonster({...e,x:e.startX,z:e.startZ}),{life:e.life+1,aiState:'respawn'});
     emit('respawn',{id:e.id});
    }
    continue;
   }
   if(e.bleedUntil>time&&time>=e.nextBleed){
    e.nextBleed=time+1;applyEnemyHit(e,3,e.bleedSource,{periodic:true});
   }
   if(e.type==='dummy'||e.dead)continue;
   const cfg=ENEMY_COMBAT[e.type];
   if(e.boss){const phase=e.hp/e.maxHp>.66?0:e.hp/e.maxHp>.33?1:2;if(e.phase!==phase){e.phase=phase;emit('adventure-notice',{reason:'The keeper shifts: '+['roots yield to Magic','exposed echoes yield to Ranged','cracked heart yields to Melee'][phase]+'. Watch its warning shape.'});}e.weak=['magic','ranged','melee'][phase];e.pattern=[{kind:'charge',engage:10,length:10,width:1.7,windup:1.5,cooldown:4.4,damage:24},{kind:'pounce',engage:14,radius:3,windup:1.7,cooldown:4.2,damage:22},{kind:'cleave',engage:5,radius:5,halfAngle:1.1,windup:1.3,cooldown:3.8,damage:24}][phase];}
   const spec=e.pattern||ENEMY_PATTERNS[e.type],profile=classicEnemyProfile(e,spec);
   const noticeRadius=e.room!==undefined?(e.boss?15:10):cfg.sight;
   // Returning does not itself constitute a new aggression trigger. Rearm
   // only once the player has left the notice area, or actually hits again.
   if(e.noticeSuppressed&&dist(player,{x:e.startX,z:e.startZ})>noticeRadius+1)
    e.noticeSuppressed=false;
   const safeOrDead=isOakrestSafe(player.x,player.z)||!canFight();
   if(safeOrDead){e.aggro=false;e.warning=null;}
   let decision=safeOrDead?
    (dist(e,{x:e.startX,z:e.startZ})>.1?'retreat':'idle'):
    e.room!==undefined?(Math.abs(player.z-e.startZ)>21?'retreat':e.aggro?'pursue':dist(e,player)<(e.boss?15:10)?'acquire':'idle'):
    enemyBehaviour(e.type,e,player,e.aggro);
   if(!safeOrDead&&!e.aggro&&!e.retreating&&e.patrol?.length){
    decision=dist(e,player)<=cfg.sight&&dist(player,{x:e.startX,z:e.startZ})<=cfg.leash?'acquire':'patrol';
   }
   if(decision==='patrol'){
    const goal=e.patrol[e.patrolIndex%e.patrol.length];
    if(Number.isFinite(goal?.x)&&Number.isFinite(goal?.z)&&dist(goal,{x:e.startX,z:e.startZ})<=cfg.leash){
     e.aiState='patrol';moveEnemy(e,goal,1,dt);
     if(dist(e,goal)<.25||e.stuckFor>2){e.patrolIndex++;e.route=null;e.stuckFor=0;}
    }
    continue;
   }
   if(decision==='retreat'||e.retreating||decision==='return'){
    returnHome(e,cfg,dt);
    continue;
   }
   if(decision==='idle'){e.aiState='idle';continue;}
   if(time<e.recoverUntil){e.aiState='recover';continue;}
   if(decision==='acquire'){
    if(e.noticeSuppressed||e.aggressive===false||!wallClear(e,player)){e.aiState='idle';continue;}
    e.aiState='aggro';e.aggro=true;e.lastAttack=Math.min(e.lastAttack,time-spec.cooldown+.25);
   }
   if(wallClear(e,player)){e.lastSeen={x:player.x,z:player.z};e.lostSightAt=null;}
   else if(e.lostSightAt===null)e.lostSightAt=time;
   if(e.lostSightAt!==null&&time-e.lostSightAt>3.6){returnHome(e,cfg,dt);continue;}
   if(e.stunUntil>time){e.aiState='recover';e.warning=null;continue;}
   if(e.warning){
    e.aiState='attack';
    if(time>=e.warning.end){
     const warning=e.warning;e.warning=null;e.aiState='recover';
     // The committed swing still happens when the player sidesteps it.
     // Contact is checked separately against the frozen tell and current LOS.
     const connected=enemyAttack(e,warning,player);
     e.releaseUntil=time+.22;e.recoverUntil=time+profile.recovery;
     emit('enemy-release',{id:e.id,kind:warning.kind,connected});
    }
    continue;
   }
   const gap=dist(e,player);
   if(gap<=spec.engage&&time+1e-9>=nextCombatBeat(e.lastAttack+spec.cooldown)&&onCombatBeat(time)&&wallClear(e,player)){
    const dir=toward(e,player);
    const warning={kind:spec.kind,x:spec.kind==='pounce'?player.x:e.x,
     z:spec.kind==='pounce'?player.z:e.z,direction:dir,
     radius:spec.radius||1,length:spec.length||0,width:spec.width||0,
     halfAngle:spec.halfAngle||0,engage:spec.engage,damage:spec.damage,startedAt:time,end:time+spec.windup};
    // Mosslings pounce onto a marked point; their tell is deliberately frozen.
    e.warning=warning;e.lastAttack=time;e.aiState='attack';emit('warning',{id:e.id,warning:{...warning}});
    continue;
   }
   if(e.rootUntil>time){e.aiState='rooted';continue;}
   if(gap<profile.standOff&&wallClear(e,player)){
    e.aiState='ready';
    // Existing ranged casters keep their casting space, within their territory.
    if(profile.caster&&gap<spec.engage*.38){
     const away=toward(player,e),point={x:e.x+away.x*1.5,z:e.z+away.z*1.5};
     if(dist(point,{x:e.startX,z:e.startZ})<(e.room!==undefined?20:cfg.leash)&&wallClear(e,point))
      moveEnemy(e,point,profile.speed*.65,dt);
    }
    continue;
   }
   e.aiState=e.lostSightAt===null?'chase':'investigate';
   const speed=profile.speed*(e.slowUntil>time?.42:1);
   moveEnemy(e,e.lastSeen||player,speed,dt);
   if(e.stuckFor>2||dist(e,{x:e.startX,z:e.startZ})>(e.room!==undefined?20:cfg.leash))returnHome(e,cfg,dt);

  }
 }
 function dodge(){
  if(!canFight()||time<dodgeUntil)return false;
  dodgeStart=time;dodgeUntil=time+DODGE.cooldown;actionCancel('Dodged.');lastRelease=null;
  emit('dodge',{until:dodgeUntil});return true;
 }
 function simulate(step,nextTime,player){
  time=nextTime;playerForAction={x:player.x,z:player.z};
  if(deadUntil>0&&time>=deadUntil){
   hp=maxHealth(levelFromXp(data.xp.vitality).level);
   deadUntil=0;emit('revive',{hp});
  }
  if(targetId){const target=getTarget();if(!target||dist(player,target)>30)stopTarget('target-out-of-range');}
  executeAction(player);moveProjectiles(step);updateMonsters(player,step);
  if(!action&&queuedAbility&&time>=abilityRecoveryUntil&&time>=switchUntil){
   const queued=queuedAbility;queuedAbility=null;
   if(style===queued.style&&data.gear[style]===queued.weapon&&targetId===queued.targetId&&skills()[queued.index]?.id===queued.id){
    if(!queueAbility(queued.index,player))emit('action-cancelled',{name:queued.name,reason:lastFailure});
   }
  }
  if(adventureSystem){for(const e of events.slice(eventCursor))adventureSystem.event(e);
   eventCursor=events.length;adventureSystem.tick(time,step,player);eventCursor=events.length;}
  queueBasic(player);
 }
 let eventCursor=0;
 function tick(dt,player){
  if(!Number.isFinite(player?.x)||!Number.isFinite(player?.z))return drain();
  playerForAction={x:player.x,z:player.z};syncVisibility(player);
  clock.advance(dt,(step,nextTime)=>simulate(step,nextTime,player));
  return drain();
 }
 function actionCancel(reason='Equipment changed.') {
  const name=action?.ability?.name||queuedAbility?.name;
  if(name)emit('action-cancelled',{name,reason});
  action=null;queuedAbility=null;
 }
 function itemAction(action,player){
  if(action?.type==='drop'&&Object.entries(loaned).some(([s,id])=>action.id==='weapon.'+s+'.'+id))return {ok:false,reason:'Practice weapons cannot be dropped.'};
  if(action?.type==='use'){
   const kind={'material.ration':'eat','material.woodland-tonic':'drink'}[action.id];
   if(!kind)return {ok:false,reason:'Choose an item with a usable action.'};
   if(!canFight())return {ok:false,reason:'Wait until you recover.'};
   return adventureSystem?.action(kind,{time,player})||{ok:false,reason:'Consumables are unavailable.'};
  }
  const atBank=canCompleteInteraction(player,findClassicInteractable('service:bank'));
  const atStore=canCompleteInteraction(player,findClassicInteractable('service:store'));
  if(action?.type==='bank'&&action.kind==='weapon'&&
   action.direction==='deposit'&&loaned[action.style]===action.id)
   return {ok:false,reason:'Practice weapons cannot be banked. Earn or buy your own weapon.'};
  // Session-only loaned basic weapons must never count as owned by shop logic.
  // Temporarily exclude them from this purchase, then reinstate only loans
  // that weren't truly purchased. No other transaction touches ownership.
  const unloaned=[];
  if(action?.type==='buy'){
   for(const [s,id] of Object.entries(loaned)){
    const list=data.inventory.weapons[s],index=list.indexOf(id);
    if(index>=0){list.splice(index,1);unloaned.push([s,id]);}
   }
  }
  let result;
  try{
   result=classicItemAction(data,action,{atBank,atStore,player,dropId:()=>'player-'+dropSession+'-'+(++nextDrop)});
  }finally{
   for(const [s,id] of unloaned){
    if(data.inventory.weapons[s].includes(id))delete loaned[s];
    else data.inventory.weapons[s].push(id);
   }
  }
  if(result.ok){
   if(['equip','ability'].includes(action.type)){actionCancel();}
   emit('item',{action:action.type,reason:result.reason});
  }
  return result;
 }
 function pickup(player,id){
  const drop=data.groundLoot.find(d=>d.id===id);
  if(drop&&!interactionSight(player,drop))return {ok:false,reason:'Walk around the obstacle to collect that item.'};
  const loan=drop?.kind==='weapon'&&loaned[drop.style]===drop.itemId;
  if(loan)data.inventory.weapons[drop.style]=data.inventory.weapons[drop.style].filter(w=>w!==drop.itemId);
  let result;
  try{result=classicPickup(data,player,id);}
  finally{
   if(loan){
    if(result?.ok)delete loaned[drop.style];
    else data.inventory.weapons[drop.style].push(drop.itemId);
   }
  }
  if(result.ok)emit('pickup',{reason:result.reason,id});
  return result;
 }
 function nearestLoot(player){
  return closestDrop(data.groundLoot,player.x,player.z,3.2);
 }
 function itemSnapshot(style){
  const display=classicItemSnapshot(data,style);
  // Bag shows active practice gear, but store cost/ownership is computed
  // from persistent inventory only, so loaned gear does not reduce prices.
  if(Object.keys(loaned).length)display.shop=classicItemSnapshot(persistentSave(),style).shop;
  return display;
 }
 function drain(){eventCursor=0;return events.splice(0,events.length);}
 function abilityAvailability(ability){
  const id=abilityCooldownKey(style,slotFamily(style,data.gear[style]),ability);
  const weapon=styleWeapon(),valid=validateAttack(playerForAction,style,weapon,ability);
  const reason=(cooldowns.get(id)||0)>time?'Ability is cooling down.':valid.ok?null:valid.reason;
  return {...abilityDetails(style,weapon,ability,valid.targets?.length||0,!!adventureSystem),available:!reason,unavailableReason:reason};
 }
 function getState(){
  const weapon=styleWeapon(),maxHp=maxHealth(levelFromXp(data.xp.vitality).level);
  return {time,combatTick:Math.floor((time+1e-9)/COMBAT_TICK_SECONDS),tickSeconds:COMBAT_TICK_SECONDS,
   attackInterval:weapon?classicWeaponInterval(weapon):0,maxHit:snapshot()?.maxHit||0,lastFailure,
   style,hp,maxHp,attackUntil,switchUntil,dodgeUntil,deadUntil,shieldUntil,shieldStyle,
   queuedAbility:queuedAbility?{index:queuedAbility.index,id:queuedAbility.id,name:queuedAbility.name}:null,
   consumableCooldowns:adventureSystem?.consumableCooldowns()||{eat:0,drink:0},
   targetId,target:getTarget()?{...getTarget()}:null,weapon:weapon?.title||'No equipped weapon',
   reach:weapon?.reach||0,
   abilities:skills().map((a,index)=>a?{index,id:a.id,name:a.name,kind:a.kind,
    cooldownEnd:cooldowns.get(abilityCooldownKey(style,slotFamily(style,data.gear[style]),a))||0,
    cooldown:a.cooldown||0,...abilityAvailability(a)}:null),
   monsters:monsters.map(e=>({...e,warning:e.warning?{...e.warning}:null})),
   projectiles:projectiles.filter(p=>p.delay<=0).map(p=>({x:p.x,z:p.z,direction:{...p.direction},kind:p.kind,name:p.ability?.name||null,style:p.source.style,family:p.source.weapon?.family,abilityId:p.ability?.id||null,effect:abilityEffect(p.source.style,p.source.weapon,p.ability?.id?p.ability:null),travelled:p.travelled})),
   progression:{...data.xp},defeated:data.defeated||0,
   groundLoot:data.groundLoot.map(drop=>({...drop})),coins:data.coins,
   combatLevel:combatLevelFromXp(data.xp),
   // Kept as an alias for older QA tooling; a target is an attack intent, not a movement lock.
   targetLocked:!!getTarget(),attacking:!!getTarget(),
   lastRelease:lastRelease?{...lastRelease}:null,
   action:action?{type:action.type,startedAt:action.startedAt,until:action.impactAt,style:action.style,family:action.weapon.family,abilityId:action.ability?.id||null,name:action.ability?.name||null,effect:abilityEffect(action.style,action.weapon,action.ability),reach:action.ability?.reach||action.weapon.reach}:null};
 }
 return {tick,getState,chooseTarget,stopTarget,styleSwitch,queueAbility,queueBasic,dodge,drain,
  canAttackFrom:(player,id)=>{const enemy=monsters.find(e=>e.id===id),weapon=styleWeapon();return !!weapon&&isAlive(enemy)&&inAttackRange(player,enemy,weapon.reach,wallClear(player,enemy));},
  pause:()=>{clock.resetRemainder();stopTarget('pause');},
  reset:()=>{targetId=null;action=null;queuedAbility=null;},
  adventureState:()=>adventureSystem?.state(),
  adventureVisit:id=>adventureSystem?.visit(id),
  adventureCanPass:z=>!adventureSystem||adventureSystem.canPass(z),
  adventureAction:(kind,options,player)=>{
   if(!canFight())return {ok:false,reason:'Wait until you recover.'};
   const result=adventureSystem?.action(kind,{...options,time,player,threatened:monsters.some(m=>m.aggro&&!m.dead)})||{ok:false,reason:'Adventure unavailable'};
   if(result.ok&&['gather','craft','combine','enter','leave'].includes(kind))stopTarget();
   return result;
  },
  itemAction,pickup,nearestLoot,itemSnapshot,
  sandboxSave:()=>JSON.parse(JSON.stringify(data)),
  persistentSave};
 function persistentSave(){
   const saved=JSON.parse(JSON.stringify(data));
   for(const [s,id] of Object.entries(loaned)){
    // These are session-issued, not obtained from loot or the real store.
    if(!original.inventory?.weapons?.[s]?.includes(id)){
     saved.inventory.weapons[s]=saved.inventory.weapons[s].filter(x=>x!==id);
     if(saved.gear[s]===id)saved.gear[s]=original.gear?.[s]||'none';
    }
   }
   delete saved.classicSession;return saved;
 }
}
export const CLASSIC_ENEMY_SPAWNS=spawn;
