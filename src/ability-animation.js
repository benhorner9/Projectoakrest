/**
 * Oakrest's authoritative animation *specification*, not an animation timer.
 * All gameplay clocks still come from main.js. No information in this module
 * is allowed to resolve damage, evade hits or alter cooldowns.
 */
import {LOADOUTS, SHARED_ABILITIES, SKILL_LEVELS} from './rules.js';

const BASE_WEAPONS={
 melee:{sword:'sword',daggers:'daggers',greatsword:'greatsword'},
 ranged:{bow:'bow',shortbow:'shortbow',crossbow:'crossbow'},
 magic:{frost:'frost',ember:'ember'}
};
// Stable cue IDs are distinct for each learnable action within a family.
// The middle text documents the BODY tell; particles are never the tell.
const ACTIONS={
 'sword:w0':['overhand','Blade draws high over the weapon shoulder','Downward committed slash'],
 'sword:w1':['cleave','Both shoulders coil horizontally','Broad outward sword sweep'],
 'sword:w2':['break','Tight grip and forward-set shoulders','Short forceful guard-breaking thrust'],
 'sword:w3':['parry','Elbows close and blade raised across torso','Protective guard'],
 'daggers:w0':['slice','Hips sink; leading dagger retracts low','Fast close-range cut'],
 'daggers:w1':['cross','Both daggers chamber in crossed guard','Two successive crossing cuts'],
 'daggers:w2':['rush','Hips lower and feet turn toward travel','Committed forward step'],
 'daggers:w3':['execute','Leading blade draws back by waist','Precise finishing stab'],
 'greatsword:w0':['overhand','Both hands lift the blade high, weight shifts back','Heavy overhead cleave'],
 'greatsword:w1':['cleave','Wide two-handed winding stance','Slow horizontal sweep'],
 'greatsword:w2':['break','Blade braces near hip, shoulders squared','Crushing forward cut'],
 'greatsword:w3':['parry','Two-handed high blade guard','Brace behind sword'],
 'bow:w0':['pierce','Arrow drawn to cheek; bow held steady','Firm straight release'],
 'bow:w1':['rapid','Compact repeated bow draws','Three quick releases'],
 'bow:w2':['pin','Bow held fully drawn with planted feet','Deliberate pinning arrow'],
 'bow:w3':['retreat','Bow raised while weight shifts onto rear foot','Backward release'],
 'shortbow:w0':['pierce','Short draw with deliberate leading-arm extension','Firm close-range shot'],
 'shortbow:w1':['rapid','Light repeated wrist and bowstring motion','Three quick releases'],
 'shortbow:w2':['pin','Compact full draw with legs braced','Pinning release'],
 'shortbow:w3':['retreat','Light-footed rearward shift with bow raised','Backward release'],
 'crossbow:w0':['reload','Crossbow butt braces hard against shoulder','Recoil-heavy bolt release'],
 'crossbow:w1':['scatter','Crossbow lowers and angles across target lane','Wide mechanical discharge'],
 'crossbow:w2':['snare','Crossbow stock steadies as aim dips','Controlled slowing bolt'],
 'crossbow:w3':['recoilstep','Weight drops to the rear and crossbow tucks in','Backward evasive roll'],
 'frost:w0':['cast','Staff tip tracks a single narrow path','Focused ice shard'],
 'frost:w1':['nova','Both hands spread outward, feet planted','Circular frost pulse'],
 'frost:w2':['bind','Staff hand draws inward as offhand closes like a fist','Constraining binding gesture'],
 'frost:w3':['barrier','Both forearms rise around the body','Protective ice stance'],
 'ember:w0':['flare','Wand arm extends, offhand draws energy in','Single firebolt release'],
 'ember:w1':['wave','Open offhand sweeps laterally','Expanding fire wave'],
 'ember:w2':['blink','Body compresses and leading hand points forward','Forward displacement'],
 'ember:w3':['heal','Both hands turn inward toward chest','Restorative gesture'],
 'melee:s0':['charge','Head lowers behind a forward shoulder','Melee Battle Rush'],
 'melee:s1':['heal','Chest rises as both hands meet near torso','Second Wind'],
 'magic:s0':['arcane','Casting hand traces a small precise arc','Arcane Bolt'],
 'magic:s1':['roll','Hands tuck in and weight shifts backward','Phase Step'],
 'ranged:s0':['roll','Bow arm folds inward, knees bend','Evasive Roll'],
 'ranged:s1':['focus','Feet brace and bowstring holds at cheek','Focus Shot']
};
const basicCues={
 sword:['sword-basic','Sword drawn behind shoulder','Timed sweeping blade contact'],
 daggers:['dagger-basic','Alternating low dagger chambers','Fast alternating slash'],
 greatsword:['greatsword-basic','Two-handed weapon slowly winds up','Heavy committed sword arc'],
 bow:['longbow-basic','Full measured bowstring draw','Arrow release from animated bow'],
 shortbow:['shortbow-basic','Compact rapid bowstring draw','Shortbow snap release'],
 crossbow:['crossbow-basic','Shoulder braces behind heavy crossbow','Mechanical bolt discharge'],
 frost:['frost-basic','Staff aims with controlled offhand','Frost energy release'],
 ember:['ember-basic','Wand flicks forward from a short chamber','Ember release']
};
const SELF=new Set(['shield','heal']);
const MOVE=new Set(['dash','dashback']);
const INSTANT=new Set(['shield','heal','dash','dashback']);
export function abilityAnimationKey(family,id){return `${family}:${id}`;}
export function familyFor(style,weaponId){return LOADOUTS[style]?.[weaponId]?.family||weaponId;}
function anchorFor(style,ability){
 if(SELF.has(ability.kind))return 'self / defending actor';
 if(MOVE.has(ability.kind))return 'hero movement origin at release';
 if(ability.kind==='nova')return 'hero root +1.1, ground area';
 if(style==='melee')return 'hero root +1.1, swept melee contact volume';
 return 'animated weapon-hand world transform + forward muzzle offset';
}
function eventFor(style,ability){
 if(SELF.has(ability.kind)||MOVE.has(ability.kind))return 'ability_effect';
 if(style==='melee')return 'contact_window_start';
 if(ability.kind==='nova')return 'ability_effect';
 return 'projectile_spawn';
}
export function abilityAnimationSpec(style,weaponId,ability){
 const family=familyFor(style,weaponId),shared=ability.id?.startsWith('s');
 const key=abilityAnimationKey(shared?style:family,ability.id);
 const cue=ACTIONS[key];
 if(!cue)return null;
 const weapon=LOADOUTS[style]?.[weaponId];if(!weapon)return null;
 const windup=INSTANT.has(ability.kind)?0:Math.min(family==='greatsword'?.6:.45,weapon.windup);
 const recovery=Math.max(.4,windup+.28);
 return Object.freeze({
  id:key,style,weaponFamily:family,abilityId:ability.id,abilityName:ability.name,
  kind:ability.kind, motionCue:cue[0],startingPose:'weapon-family ready stance',
  anticipation:{seconds:windup,source:'actual pendingAbility impactAt - start',pose:'weighted wind-up'},
  tell:cue[1],release:cue[2],
  event:eventFor(style,ability),eventAt:'pendingAbility.impactAt (simulation clock)',
  hitOrigin:anchorFor(style,ability),
  followThrough:'blend after gameplay release; keep committed direction on miss',
  recovery:{seconds:recovery,source:'actual shared attackUntil clock',interruptible:true},
  interruption:'Dodge cancels pending action; after release never replay event; cooldown is not refunded',
  vfx:'existing style-dependent in-world effects at real release/contact only',
  audio:'existing playAbility at gameplay resolution; no early impact sound',
  fallback:'preserve silhouette, body tell and timing; reduce secondary VFX only',
  instant:windup===0,
  warning:windup===0?'Instant gameplay effect: no pre-effect enemy warning is claimed':'Pose anticipates gameplay effect'
 });
}
export function basicAnimationSpec(style,weaponId){
 const weapon=LOADOUTS[style]?.[weaponId];if(!weapon)return null;
 const family=familyFor(style,weaponId),cue=basicCues[family];
 if(!cue)return null;
 return Object.freeze({
  id:abilityAnimationKey(family,'basic'),style,weaponFamily:family,abilityId:'basic',abilityName:'Basic attack',
  motionCue:cue[0],startingPose:'family ready stance',
  anticipation:{seconds:Math.min(weapon.interval*.7,weapon.windup||weapon.interval*.25),source:'pendingBasic.impactAt - start',pose:'weapon-specific draw'},
  tell:cue[1],release:cue[2],event:style==='melee'?'contact_window_start':'projectile_spawn',
  eventAt:'pendingBasic.impactAt (simulation clock)',hitOrigin:style==='melee'?'root +1.1 swept arc':'animated weapon-hand world transform + forward muzzle offset',
  followThrough:'family recovery to next start-to-start cadence',
  recovery:{seconds:weapon.interval,source:'weapon interval; shared attackUntil',interruptible:true},
  interruption:'Dodge cancels unreleased basic attack; no cadence refund',
  vfx:'only actual swing/shot effects',audio:'sound on resolved release',
  fallback:'keep attack body silhouette; reduce particles',instant:false,warning:'Readable wind-up before release'
 });
}
export function listAnimationSpecs(){
 const list=[];
 for(const [style,families] of Object.entries(BASE_WEAPONS)){
  for(const [family,weaponId] of Object.entries(families)){
   list.push(basicAnimationSpec(style,weaponId));
   const abilities=LOADOUTS[style][weaponId].abilities;
   abilities.forEach((a,i)=>list.push(abilityAnimationSpec(style,weaponId,{...a,id:`w${i}`,requiredLevel:SKILL_LEVELS[i]})));
   SHARED_ABILITIES[style].forEach((a,i)=>list.push(abilityAnimationSpec(style,weaponId,{...a,id:`s${i}`})));
  }
 }
 return list;
}
/** Ring-buffered gameplay event audit. This observes, never commands, physics. */
export function createAnimationEventJournal(capacity=128){
 const rows=[],seen=new Set();let counter=0;
 const cap=Math.max(8,Math.min(4096,capacity|0));
 function push(entry){
  if(rows.length===cap){const old=rows.shift();seen.delete(old.eventId);}
  rows.push(entry);
 }
 function begin({specId,style,family,at}){
  const id=`local-${++counter}`;
  record(id,'attack_start',at,{specId,style,family});
  return id;
 }
 function record(id,event,at,meta={}){
  if(!id||!Number.isFinite(at)||!event)return false;
  const eventId=`${id}/${event}`;
  if(seen.has(eventId))return false;
  seen.add(eventId);push({eventId,actionId:id,event,at,...meta});return true;
 }
 return {begin,record,latest:()=>rows.map(r=>({...r})),get count(){return rows.length;}};
}
