/**
 * Block 4: pure gameplay simulation for the 2.5D combat proof.
 * All weapon timings, damage and accuracy come from Oakrest's existing rules.
 * NO DOM, Three.js, storage, or persistent inventory modifications.
 * Clones the character save: rewards are SESSION-ONLY until the full migration.
 */
import {STYLE_ORDER,LOADOUTS,levelFromXp,maxHealth,damageAfterArmour,
 defenceFor,slotFamily,equippedSkills,ownsWeapon,XP_BY_MOB,combatLevelFromXp} from './rules.js';
import {maxHitForAction,accuracyFor,rollHit,inAttackRange,targetValid} from './auto-combat.js';
import {basicAttackReady,projectileTravel} from './attack-rules.js';
import {equipmentModifiers} from './equipment-slots.js';
import {ENEMY_COMBAT,ENEMY_PATTERNS,enemyBehaviour,isThreatened} from './combat-feel.js';
import {abilityCooldownKey,DODGE,dodgeInvulnerable} from './combat-physics.js';
import {isOakrestSafe} from './town-services.js';
import {solidAt,slideMove} from './classic-presentation.js';
import {combatSourceSnapshot,awardMonsterVictory} from './gameplay-core.js';

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
const isAlive=e=>e&&!e.dead&&e.hp>0&&!e.retreating;
const wallClear=(a,b)=>{
 const distance=dist(a,b),n=Math.ceil(distance/.23);
 for(let i=1;i<n;i++){
  const f=i/n;
  if(solidAt(a.x+(b.x-a.x)*f,a.z+(b.z-a.z)*f,.1))return false;
 }
 return true;
};
function initialMonster(def){
 return {...def,x:def.x,z:def.z,startX:def.x,startZ:def.z,
  name:ENEMY_COMBAT[def.type].name,level:ENEMY_COMBAT[def.type].level,
  hp:def.maxHp,aggro:false,retreating:false,dead:false,lastAttack:0,
  warning:null,stunUntil:0,slowUntil:0,rootUntil:0,bleedUntil:0,nextBleed:0,
  bleedSource:null,respawnAt:0,hitFlashUntil:0};
}
function safeWeapon(data,style){
 const id=data.gear?.[style],weapon=LOADOUTS[style]?.[id];
 return weapon&&(ownsWeapon(data,style,id)||data.onboarding?.area==='tutorial')?weapon:null;
}
export function createClassicCombat({save,random=Math.random}={}){
 const data=JSON.parse(JSON.stringify(save||{}));
 const monsters=spawn.map(initialMonster),events=[],projectiles=[],cooldowns=new Map();
 let time=0,style='melee',targetId=null,attackUntil=0,switchUntil=0,dodgeUntil=0,dodgeStart=-Infinity;
 let action=null,queuedAbility=null,queuedStyle=null,shieldUntil=0,deadUntil=0;
 let hp=maxHealth(levelFromXp(data.xp?.vitality||0).level);
 const emit=(type,details={})=>events.push({type,time,...details});
 const active=()=>monsters.filter(isAlive);
 const getTarget=()=>active().find(m=>m.id===targetId)||null;
 const styleWeapon=()=>safeWeapon(data,style);
 const skills=()=>styleWeapon()?equippedSkills(data,style,data.gear[style]):[null,null,null,null];
 const canFight=()=>hp>0&&time>=deadUntil;
 const snapshot=()=>styleWeapon()?combatSourceSnapshot(data,style,styleWeapon()):null;
 function stopTarget(){targetId=null;action=null;queuedAbility=null;emit('target-lost');}
 function chooseTarget(id,player){
  const e=monsters.find(m=>m.id===id);
  if(!e||!isAlive(e)||dist(e,player)>30||!wallClear(player,e))return false;
  targetId=id;emit('target',{id,name:e.name,level:e.level});return true;
 }
 function styleSwitch(next){
  if(!STYLE_ORDER.includes(next)||next===style)return false;
  if(time<switchUntil||action||time<attackUntil){
   queuedStyle=next;emit('style-queued',{style:next});return true;
  }
  style=next;switchUntil=time+.12;
  emit('style',{style});return true;
 }
 function queueAbility(index){
  const ability=skills()[index];
  if(!ability||!canFight())return false;
  const id=abilityCooldownKey(style,slotFamily(style,data.gear[style]),ability);
  if((cooldowns.get(id)||0)>time)return false;
  if(action||time<attackUntil||time<switchUntil){
   queuedAbility={index,style,weapon:data.gear[style]};return true;
  }
  const weapon=styleWeapon();
  const windup=['shield','heal','dash','dashback'].includes(ability.kind)?0:
    Math.min(slotFamily(style,data.gear[style])==='greatsword'?.6:.45,weapon.windup);
  cooldowns.set(id,time+ability.cooldown);
  attackUntil=time+Math.max(.4,windup+.28);
  action={type:'ability',style,ability,weapon,impactAt:time+windup};
  emit('windup',{style,kind:ability.kind,name:ability.name,until:action.impactAt});
  return true;
 }
 function queueBasic(player){
  const weapon=styleWeapon(),enemy=getTarget();
  if(!weapon||!enemy||!canFight()||action||time<switchUntil||
    !basicAttackReady(time,attackUntil,false))return false;
  if(!inAttackRange(player,enemy,weapon.reach,wallClear(player,enemy)))return false;
  attackUntil=time+weapon.interval;
  const windup=Math.min(weapon.interval*.70,weapon.windup||weapon.interval*.25);
  action={type:'basic',style,weapon,impactAt:time+windup,source:snapshot()};
  emit('windup',{style,kind:'basic',name:weapon.title,until:action.impactAt});
  return true;
 }
 function applyEnemyHit(enemy,damage,source,ability={}){
  if(!isAlive(enemy)||!source||!Number.isFinite(damage))return;
  const max=ability.periodic?Math.max(1,Math.floor(damage)):
    maxHitForAction(source.maxHit,source.weaponBasic,damage);
  const chance=enemy.type==='dummy'?1:
    accuracyFor(source.level,enemy.level,source.weaponBasic,
      {mossling:0,boar:.04,bandit:.08}[enemy.type]||0,source.power);
  const result=ability.periodic?{hit:true,damage:max}:
    rollHit({maxHit:max,accuracy:chance,random});
  if(!result.hit){emit('miss',{id:enemy.id});return;}
  enemy.hp=Math.max(0,enemy.hp-result.damage);
  enemy.hitFlashUntil=time+.18;
  if(ability.stun)enemy.stunUntil=time+ability.stun;
  if(ability.slow)enemy.slowUntil=time+ability.slow;
  if(ability.root)enemy.rootUntil=time+ability.root;
  if(ability.bleed){enemy.bleedUntil=time+ability.bleed;enemy.nextBleed=time+1;enemy.bleedSource=source;}
  enemy.aggro=enemy.type!=='dummy';
  emit('hit',{id:enemy.id,damage:result.damage,style:source.style,remaining:enemy.hp});
  if(enemy.hp<=0){
   if(targetId===enemy.id){targetId=null;queuedAbility=null;}
   if(enemy.type==='dummy'){enemy.hp=enemy.maxHp;emit('dummy',{id:enemy.id});return;}
   enemy.dead=true;enemy.aggro=false;enemy.warning=null;enemy.respawnAt=time+12;
   const reward=awardMonsterVictory(data,enemy.type,source.style);
   if(reward.awarded)emit('xp',{style:source.style,amount:XP_BY_MOB[enemy.type],reward});
   emit('defeated',{id:enemy.id,name:enemy.name});
  }
 }
 function addProjectile(enemy,damage,source,ability,speed,kind){
  if(!enemy||!source)return;
  const dir=toward(playerForAction,enemy),range=style==='ranged'?source.weapon?.reach||30:source.weapon?.reach||20;
  projectiles.push({x:playerForAction.x,z:playerForAction.z,direction:dir,speed,
   remaining:ability?.reach||range,targetId:enemy.id,damage,source,
   ability,kind,travelled:0});
  emit('projectile',{style:source.style,kind,x:playerForAction.x,z:playerForAction.z});
 }
 let playerForAction={x:0,z:73};
 function strike(player,damage,source,ability={}){
  const reach=ability.reach||source.weapon.reach;
  const hits=active().filter(e=>dist(player,e)<=reach&&wallClear(player,e));
  const selected=getTarget();
  const targets=ability.kind==='sweep'||ability.kind==='nova'?hits:
   selected&&hits.includes(selected)?[selected]:[];
  for(const e of targets)applyEnemyHit(e,damage,source,ability);
  emit('swing',{style:source.style,reach,kind:ability.kind||'hit'});
 }
 function executeAction(player){
  if(!action||time<action.impactAt)return;
  const current=action;action=null;
  if(!canFight()||style!==current.style)return;
  const weapon=current.weapon,source={
   ...combatSourceSnapshot(data,current.style,weapon),weapon};
  const enemy=getTarget(),ability=current.ability||{};
  emit('release',{style:current.style,kind:ability.kind||'basic'});
  if(current.type==='basic'){
   if(current.style==='melee')strike(player,weapon.basic,source,{kind:'hit',reach:weapon.reach,
    bleed:slotFamily(current.style,data.gear[current.style])==='daggers'?1.5:0});
   else if(enemy)addProjectile(enemy,weapon.basic,source,{},current.style==='magic'?21:36,'basic');
   return;
  }
  const a=current.ability;
  if(['hit','execute','sweep'].includes(a.kind)){
   if(current.style==='melee')strike(player,a.damage,source,a);
   else if(enemy)for(let i=0;i<5;i++)addProjectile(enemy,a.damage,source,a,
    current.style==='magic'?13:30,'sweep');
  }else if(['bolt','burst','retreat'].includes(a.kind)){
   if(enemy){const count=a.kind==='burst'?(a.count||3):1;
    for(let i=0;i<count;i++)addProjectile(enemy,a.damage,source,a,a.speed||26,a.kind);}
   if(a.kind==='retreat')emit('dash',{distance:-4});
  }else if(a.kind==='nova'){
   strike(player,a.damage,source,a);
   emit('area',{x:player.x,z:player.z,radius:a.reach,style});
  }else if(a.kind==='shield'){
   shieldUntil=time+a.duration;emit('shield',{until:shieldUntil});
  }else if(a.kind==='heal'){
   const before=hp;
   hp=Math.min(maxHealth(levelFromXp(data.xp.vitality).level),hp+a.heal);
   emit('heal',{amount:hp-before});
  }else if(a.kind==='dash'||a.kind==='dashback'){
   emit('dash',{distance:(a.kind==='dash'?1:-1)*a.distance});
  }
 }
 function moveProjectiles(dt){
  for(let i=projectiles.length-1;i>=0;i--){
   const p=projectiles[i],next=projectileTravel(p.travelled,p.speed,dt,p.remaining);
   const steps=Math.max(1,Math.ceil(next.step/.2)),oldX=p.x,oldZ=p.z;
   let blocked=false,hit=null;
   for(let k=1;k<=steps;k++){
    const frac=k/steps;
    const x=oldX+p.direction.x*next.step*frac,z=oldZ+p.direction.z*next.step*frac;
    if(solidAt(x,z,.08)){blocked=true;break;}
    hit=active().find(e=>Math.hypot(e.x-x,e.z-z)<(e.type==='boar'?.85:.67));
    if(hit)break;
   }
   if(hit){applyEnemyHit(hit,p.damage,p.source,p.ability||{});projectiles.splice(i,1);}
   else if(blocked||next.expired){emit('impact',{x:p.x,z:p.z,blocked});projectiles.splice(i,1);}
   else{p.x+=p.direction.x*next.step;p.z+=p.direction.z*next.step;p.travelled=next.distance;}
  }
 }
 function enemyAttack(enemy,warning,player){
  if(!isThreatened(warning.kind,warning,player)||!wallClear(enemy,player))return;
  if(dodgeInvulnerable(time,dodgeStart)){emit('evade',{id:enemy.id});return;}
  const vitality=levelFromXp(data.xp.vitality).level,guard=equipmentModifiers(data,style).guard;
  const resistance=Math.min(.45,guard+defenceFor(data.armour[style]).physical*.5);
  const result=rollHit({maxHit:Math.max(1,Math.round(ENEMY_PATTERNS[enemy.type].damage)),
   accuracy:accuracyFor(enemy.level,vitality,19,resistance),random});
  if(!result.hit){emit('enemy-miss',{id:enemy.id});return;}
  const harm=Math.max(1,Math.round(damageAfterArmour(result.damage,shieldUntil>time,
   data.armour[style])*(1-guard)));
  hp=Math.max(0,hp-harm);emit('hurt',{damage:harm,hp});
  if(hp===0){
   deadUntil=time+2.1;action=null;queuedAbility=null;targetId=null;
   emit('dead',{until:deadUntil});
  }
 }
 function updateMonsters(player,dt){
  for(const e of monsters){
   if(e.dead){
    if(time>=e.respawnAt){
     Object.assign(e,initialMonster({id:e.id,type:e.type,x:e.startX,z:e.startZ,maxHp:e.maxHp}));
     emit('respawn',{id:e.id});
    }
    continue;
   }
   if(e.bleedUntil>time&&time>=e.nextBleed){
    e.nextBleed=time+1;applyEnemyHit(e,3,e.bleedSource,{periodic:true});
   }
   if(e.type==='dummy'||e.dead)continue;
   const cfg=ENEMY_COMBAT[e.type],spec=ENEMY_PATTERNS[e.type];
   if(isOakrestSafe(player.x,player.z)||!canFight()){
    e.aggro=false;e.warning=null;e.retreating=dist(e,{x:e.startX,z:e.startZ})>.1;
   }
   const decision=enemyBehaviour(e.type,e,player,e.aggro);
   if(decision==='retreat'||e.retreating||decision==='return'){
    e.aggro=false;e.warning=null;e.retreating=true;
    const toHome=toward(e,{x:e.startX,z:e.startZ});
    const move=slideMove(e,toHome.x*cfg.returnSpeed*dt,toHome.z*cfg.returnSpeed*dt);
    e.x=move.x;e.z=move.z;
    if(dist(e,{x:e.startX,z:e.startZ})<.25){
     e.x=e.startX;e.z=e.startZ;e.retreating=false;e.hp=e.maxHp;
    }
    continue;
   }
   if(decision==='idle')continue;
   if(decision==='acquire'){
    if(!wallClear(e,player))continue;
    e.aggro=true;e.lastAttack=Math.min(e.lastAttack,time-spec.cooldown+.25);
   }
   if(e.stunUntil>time){e.warning=null;continue;}
   if(e.warning){
    if(time>=e.warning.end){
     const warning=e.warning;e.warning=null;enemyAttack(e,warning,player);
     emit('enemy-release',{id:e.id,kind:spec.kind});
    }
    continue;
   }
   const gap=dist(e,player);
   if(gap<=spec.engage&&time-e.lastAttack>=spec.cooldown&&wallClear(e,player)){
    const dir=toward(e,player);
    const warning={kind:spec.kind,x:e.x,z:e.z,direction:dir,
     radius:spec.radius||1,length:spec.length||0,width:spec.width||0,
     halfAngle:spec.halfAngle||0,end:time+spec.windup};
    // Mosslings pounce onto a marked point; their tell is deliberately frozen.
    e.warning=warning;e.lastAttack=time;emit('warning',{id:e.id,warning:{...warning}});
    continue;
   }
   if(e.rootUntil>time||gap<Math.min(2.5,spec.engage*.75))continue;
   const heading=toward(e,player),moveDist=Math.min(gap-.7,(e.type==='bandit'?2.5:e.type==='boar'?2.2:1.75)*
     (e.slowUntil>time?.42:1)*dt);
   if(moveDist<=0)continue;
   const next=slideMove(e,heading.x*moveDist,heading.z*moveDist,.40);
   if(dist(next,{x:e.startX,z:e.startZ})<=cfg.leash){e.x=next.x;e.z=next.z;}
  }
 }
 function dodge(){
  if(!canFight()||time<dodgeUntil)return false;
  dodgeStart=time;dodgeUntil=time+DODGE.cooldown;action=null;
  emit('dodge',{until:dodgeUntil});return true;
 }
 function tick(dt,player){
  const step=clamp(Number(dt)||0,0,.1);
  playerForAction={x:player.x,z:player.z};time+=step;
  if(deadUntil>0&&time>=deadUntil){
   hp=maxHealth(levelFromXp(data.xp.vitality).level);
   deadUntil=0;emit('revive',{hp});
  }
  if(targetId&&!getTarget())targetId=null;
  if(!action&&time>=attackUntil&&time>=switchUntil){
   if(queuedStyle){const next=queuedStyle;queuedStyle=null;styleSwitch(next);}
   else if(queuedAbility){
    const queued=queuedAbility;queuedAbility=null;
    if(style===queued.style&&data.gear[style]===queued.weapon)queueAbility(queued.index);
   }
  }
  executeAction(player);moveProjectiles(step);updateMonsters(player,step);
  const enemy=getTarget(),weapon=styleWeapon();
  if(enemy&&weapon&&inAttackRange(player,enemy,weapon.reach,wallClear(player,enemy)))
   queueBasic(player);
  return drain();
 }
 function drain(){return events.splice(0,events.length);}
 function getState(){
  const weapon=styleWeapon(),maxHp=maxHealth(levelFromXp(data.xp.vitality).level);
  return {time,style,hp,maxHp,attackUntil,switchUntil,dodgeUntil,deadUntil,
   targetId,target:getTarget(),weapon:weapon?.title||'No equipped weapon',
   abilities:skills().map((a,index)=>a?{index,id:a.id,name:a.name,kind:a.kind,
    cooldownEnd:cooldowns.get(abilityCooldownKey(style,slotFamily(style,data.gear[style]),a))||0,
    cooldown:a.cooldown||0}:null),
   monsters:monsters.map(e=>({...e,warning:e.warning?{...e.warning}:null})),
   projectiles:projectiles.map(p=>({x:p.x,z:p.z,kind:p.kind,style:p.source.style})),
   progression:{...data.xp},defeated:data.defeated||0,
   combatLevel:combatLevelFromXp(data.xp),targetLocked:!!getTarget(),
   action:action?{type:action.type,until:action.impactAt,style:action.style}:null};
 }
 return {tick,getState,chooseTarget,stopTarget,styleSwitch,queueAbility,queueBasic,dodge,drain,
  reset:()=>{targetId=null;action=null;queuedAbility=null;},
  sandboxSave:()=>JSON.parse(JSON.stringify(data))};
}
export const CLASSIC_ENEMY_SPAWNS=spawn;
