import {blankEquipment,EXTRA_SLOTS,SLOT_ITEMS,canEquipSlotItem} from './equipment-slots.js';
/** Combat and progression rules stay independent from Three.js so they can be tested. */
export const STYLE_ORDER = ['melee', 'magic', 'ranged'];
export const STYLE_COLOURS = { melee:'#db9a72', magic:'#9cacf6', ranged:'#9edbb1' };
export const LOADOUTS = {
  melee: {
    sword: { title:'Iron Longsword', icon:'⚔', reach:3.1, basic:19, interval:0.95, windup:0.26, abilities:[
      { name:'Heavy Slash', icon:'⚔', kind:'hit', damage:30, reach:3, cooldown:5, note:'A strong forward strike.' },
      { name:'Cleave', icon:'◈', kind:'sweep', damage:19, reach:3.2, cooldown:7, note:'Hit nearby enemies in an arc.' },
      { name:'Guard Break', icon:'⬡', kind:'hit', damage:14, reach:3, cooldown:9, stun:1.3, note:'Stagger an enemy.' },
      { name:'Counterguard', icon:'✣', kind:'shield', duration:4, cooldown:13, note:'Reduce the next incoming hits.' },
    ]},
    daggers: { title:'Twin Daggers', icon:'⌁', reach:2.1, basic:9, interval:0.40, windup:0.09, abilities:[
      { name:'Quick Slice', icon:'⌁', kind:'hit', damage:15, reach:2.5, bleed:4, cooldown:4, note:'Fast slash that causes bleeding.' },
      { name:'Twin Strike', icon:'✕', kind:'hit', damage:24, reach:2.5, cooldown:6, note:'Strike twice in quick succession.' },
      { name:'Shadow Step', icon:'»', kind:'dash', distance:5, cooldown:9, note:'Dash quickly toward the target.' },
      { name:'Open Wound', icon:'✦', kind:'execute', damage:23, reach:2.6, cooldown:10, note:'Bonus damage if the target is bleeding.' },
    ]},
  },
  magic: {
    frost: { title:'Frostwood Staff', icon:'✦', reach:18, basic:12, interval:0.92, windup:0.24, abilities:[
      { name:'Ice Shard', icon:'❄', kind:'bolt', damage:25, speed:19, cooldown:4, slow:2.8, note:'A slowing frost projectile.' },
      { name:'Frost Nova', icon:'✺', kind:'nova', damage:13, reach:5.5, cooldown:9, slow:3.5, note:'Freeze the ground around you.' },
      { name:'Frozen Binding', icon:'◇', kind:'bolt', damage:8, speed:15, cooldown:13, root:2, swapLock:3, note:'Root the enemy; blocks style switches in PvP later.' },
      { name:'Ice Barrier', icon:'⬡', kind:'shield', duration:5, cooldown:16, note:'Take less damage for a short time.' },
    ]},
    ember: { title:'Ember Wand', icon:'✧', reach:17, basic:13, interval:0.75, windup:0.18, abilities:[
      { name:'Firebolt', icon:'✧', kind:'bolt', damage:29, speed:22, cooldown:4, note:'Launch a fiery projectile.' },
      { name:'Flame Wave', icon:'≋', kind:'sweep', damage:21, reach:6.5, cooldown:8, note:'A close-range wave of fire.' },
      { name:'Blink', icon:'»', kind:'dash', distance:6, cooldown:12, note:'Quickly surge forward.' },
      { name:'Warmth', icon:'✚', kind:'heal', heal:30, cooldown:18, note:'Restore a little health.' },
    ]},
  },
  ranged: {
    bow: { title:'Oak Longbow', icon:'➶', reach:30, basic:22, interval:1.40, windup:0.46, abilities:[
      { name:'Piercing Arrow', icon:'➶', kind:'bolt', damage:29, speed:28, cooldown:5, note:'Fire a powerful straight arrow.' },
      { name:'Rapid Shot', icon:'≡', kind:'burst', damage:11, speed:26, count:3, cooldown:8, note:'Release three arrows in quick succession.' },
      { name:'Pinning Shot', icon:'⊙', kind:'bolt', damage:13, speed:25, root:1.6, cooldown:10, note:'Temporarily root your target.' },
      { name:'Retreating Shot', icon:'«', kind:'retreat', damage:15, cooldown:12, note:'Fire as you leap backwards.' },
    ]},
    crossbow: { title:'Heavy Crossbow', icon:'➴', reach:12, basic:39, interval:2.05, windup:0.67, abilities:[
      { name:'Crack Shot', icon:'➴', kind:'bolt', damage:35, speed:32, cooldown:6, note:'A heavy hitting crossbow bolt.' },
      { name:'Scattershot', icon:'✷', kind:'sweep', damage:22, reach:9, cooldown:8, note:'A spread of close-range bolts.' },
      { name:'Snare Bolt', icon:'⊗', kind:'bolt', damage:12, speed:27, slow:4, cooldown:10, note:'Slow your enemy.' },
      { name:'Roll Back', icon:'«', kind:'dashback', distance:5, cooldown:11, note:'Tumble away from danger.' },
    ]},
  },
};
// Distinct weapon families and better gear require actual training in that discipline.
for(const [style,otherFamily,forgedFirst,forgedSecond] of [
  ['melee','daggers',['forged_sword','Forged Longsword'],['honed_daggers','Honed Daggers']],
  ['magic','ember',['runic_frost','Runic Frost Staff'],['inferno_wand','Inferno Wand']],
  ['ranged','crossbow',['reinforced_bow','Reinforced Longbow'],['hunter_crossbow','Hunter Crossbow']],
]){
  const base=Object.keys(LOADOUTS[style])[0];
  LOADOUTS[style][base].requiredLevel=1;LOADOUTS[style][base].family=base;
  LOADOUTS[style][otherFamily].requiredLevel=4;LOADOUTS[style][otherFamily].family=otherFamily;
  for(const [source,config,requirement,boost] of [
    [base,forgedFirst,6,1.30],[otherFamily,forgedSecond,9,1.34]
  ]){
    const w=LOADOUTS[style][source];
    LOADOUTS[style][config[0]]={...w, title:config[1],family:source,requiredLevel:requirement,
      basic:Math.round(w.basic*boost)};
  }
}
// Extra starter weapon choices: genuinely different basic-attack pacing and reach.
// Abilities reuse existing family kits for now; the cooldown/speed pass targets basics.
LOADOUTS.melee.greatsword={
  ...LOADOUTS.melee.sword,
  title:'Heavy Greatsword',icon:'🗡',reach:3.7,basic:39,interval:1.70,windup:0.55,
  requiredLevel:7,family:'greatsword'
};
LOADOUTS.ranged.shortbow={
  ...LOADOUTS.ranged.bow,
  title:'Hunter Shortbow',icon:'➹',reach:16,basic:13,interval:0.68,windup:0.17,
  requiredLevel:3,family:'shortbow'
};
export const ARMOUR={
  'starter-mail':{title:'Recruit Mail',requiredVitality:1,physical:.12,magical:.04,mobility:.98,bonusStyle:'melee',bonusPower:.02,description:'Beginner melee chest armour: improved physical protection and a small melee bonus.'},
  'starter-leather':{title:'Scout Leather',requiredVitality:1,physical:.09,magical:.07,mobility:1.02,bonusStyle:'ranged',bonusPower:.02,description:'Beginner ranged chest armour: lightweight protection and a small ranged bonus.'},
  'starter-robes':{title:'Apprentice Robes',requiredVitality:1,physical:.04,magical:.12,mobility:1.03,bonusStyle:'magic',bonusPower:.02,description:'Beginner magical chest armour: spell protection and a small magic bonus.'},
  traveller:{title:'Traveller Wraps',requiredVitality:1,physical:.06,magical:.15,mobility:1.05,bonusStyle:'magic',bonusPower:.05,
    description:'Quick movement, light protection and a little extra spell power.'},
  leather:{title:'Hardened Leather',requiredVitality:3,physical:.17,magical:.10,mobility:1.01,bonusStyle:'ranged',bonusPower:.06,
    description:'Balanced protection and a slight ranged damage bonus.'},
  plate:{title:'Forged Plate',requiredVitality:6,physical:.30,magical:.04,mobility:.90,bonusStyle:'melee',bonusPower:.07,
    description:'Strong physical protection and melee power, but reduced movement speed.'}
};
export const SHARED_ABILITIES={
  melee:[
    {name:'Battle Rush',icon:'»',kind:'dash',distance:3.5,cooldown:10,requiredLevel:2,note:'Advance quickly into melee range.'},
    {name:'Second Wind',icon:'✚',kind:'heal',heal:22,cooldown:20,requiredLevel:6,note:'Recover some health.'}
  ],
  magic:[
    {name:'Arcane Bolt',icon:'✧',kind:'bolt',damage:17,speed:24,cooldown:5,requiredLevel:2,note:'A reliable magic projectile.'},
    {name:'Phase Step',icon:'»',kind:'dashback',distance:4,cooldown:12,requiredLevel:6,note:'Step away from danger.'}
  ],
  ranged:[
    {name:'Evasive Roll',icon:'«',kind:'dashback',distance:4,cooldown:9,requiredLevel:2,note:'Retreat from close threats.'},
    {name:'Focus Shot',icon:'➶',kind:'bolt',damage:33,speed:29,cooldown:9,requiredLevel:6,note:'Concentrate for a precise hit.'}
  ]
};
export const SKILL_LEVELS=[1,3,5,8];
export function skillCatalogue(style,weaponId){
  const w=LOADOUTS[style]?.[weaponId];if(!w)return[];
  return [
    ...w.abilities.map((ability,index)=>({...ability,id:`w${index}`,requiredLevel:SKILL_LEVELS[index]})),
    ...SHARED_ABILITIES[style].map((ability,index)=>({...ability,id:`s${index}`}))
  ];
}
export function canEquipWeapon(style,weaponId,xp){const w=LOADOUTS[style]?.[weaponId];return !!w&&levelFromXp(xp?.[style]||0).level>=w.requiredLevel;}
export function canEquipArmour(id,xp){return !!ARMOUR[id]&&levelFromXp(xp?.vitality||0).level>=ARMOUR[id].requiredVitality;}
export const UNARMOURED={title:'Starter clothing',physical:0,magical:0,mobility:1,bonusStyle:null,bonusPower:0,description:'Ordinary clothes, with no armour protection.'};
export function defenceFor(id){return id==='none'?UNARMOURED:ARMOUR[id]||ARMOUR.traveller;}
export function outgoingMultiplier(armourId,style){const a=defenceFor(armourId);return a.bonusStyle===style?1+a.bonusPower:1;}
export function slotFamily(style,weaponId){return LOADOUTS[style]?.[weaponId]?.family||weaponId;}
export function equippedSkills(data,style,weaponId){
  const family=slotFamily(style,weaponId),selected=data.slots?.[style]?.[family]||[];
  const level=levelFromXp(data.xp?.[style]||0).level;
  const catalog=skillCatalogue(style,weaponId);
  return [0,1,2,3].map(i=>{
    const id=selected[i],skill=catalog.find(a=>a.id===id);
    return skill&&level>=skill.requiredLevel?skill:null;
  });
}
export function equipSkill(data,style,weaponId,slot,id){
  if(!Number.isInteger(slot)||slot<0||slot>3||!data.slots?.[style])return false;
  const family=slotFamily(style,weaponId),slots=data.slots[style]?.[family];
  if(!Array.isArray(slots))return false;
  if(id!==null){
    const skill=skillCatalogue(style,weaponId).find(a=>a.id===id);
    if(!skill||levelFromXp(data.xp?.[style]||0).level<skill.requiredLevel)return false;
  }
  // Each unlocked skill may occupy only one hotbar position.
  for(let i=0;i<4;i++)if(i!==slot&&slots[i]===id&&id!==null)slots[i]=null;
  slots[slot]=id;return true;
}

export const SKILLS_OVERVIEW=[
  {id:'melee',label:'Melee',icon:'⚔',description:'Swords, daggers and close combat'},
  {id:'ranged',label:'Ranged',icon:'➶',description:'Bows, crossbows and ranged combat'},
  {id:'magic',label:'Magic',icon:'✦',description:'Spells, staffs and magical combat'},
  {id:'vitality',label:'Vitality',icon:'✚',description:'Health, armour and survival'}
];
export function starterInventory(){
 return {weapons:{melee:['sword'],magic:['frost'],ranged:['bow']},armour:['traveller'],slotted:[],materials:{}};
}
export function awardTrainingGear(data){
 if(!data.inventory||typeof data.inventory!=='object')data.inventory=starterInventory();
 if(!data.inventory.weapons||typeof data.inventory.weapons!=='object')data.inventory.weapons={};
 for(const style of STYLE_ORDER){
  if(!Array.isArray(data.inventory.weapons[style]))data.inventory.weapons[style]=[];
  const owned=new Set(data.inventory.weapons[style].filter(id=>Object.hasOwn(LOADOUTS[style],id)));
  for(const [id,w] of Object.entries(LOADOUTS[style])){
   if(canEquipWeapon(style,id,data.xp))owned.add(id);
  }
  data.inventory.weapons[style]=[...owned];
 }
 const ownedArmour=new Set((Array.isArray(data.inventory.armour)?data.inventory.armour:[]).filter(id=>Object.hasOwn(ARMOUR,id)));
 for(const id of Object.keys(ARMOUR))if(canEquipArmour(id,data.xp))ownedArmour.add(id);
 data.inventory.armour=[...ownedArmour];
 return data.inventory;
}
export function ownsWeapon(data,style,id){return !!data.inventory?.weapons?.[style]?.includes(id);}
export function ownsArmour(data,id){return !!data.inventory?.armour?.includes(id);}
export function skillMilestones(skill){
 const result=[];
 if(skill==='vitality'){
  result.push({level:2,type:'Progression',name:'+8 maximum health',detail:'Every Vitality level grants +8 maximum health.'});
  for(const a of Object.values(ARMOUR))result.push({level:a.requiredVitality,type:'Wear',name:a.title,detail:a.description});
 }else if(STYLE_ORDER.includes(skill)){
  const seen=new Set();
  for(const [id,w] of Object.entries(LOADOUTS[skill])){
   result.push({level:w.requiredLevel,type:'Wield',name:w.title,detail:'Weapon level requirement'});
   for(const a of skillCatalogue(skill,id)){
    // A weapon-family ability can be used only after that weapon family is wieldable.
    const level=Math.max(w.requiredLevel,a.requiredLevel);
    const key=a.id.startsWith('s')?'shared:'+a.id:w.family+':'+a.id;
    if(seen.has(key))continue;seen.add(key);
    result.push({level,type:'Learn',name:a.name,detail:a.note});
   }
  }
 }
 return result.sort((a,b)=>a.level-b.level||a.type.localeCompare(b.type)||a.name.localeCompare(b.name));
}
export function validGroundLoot(list){
 if(!Array.isArray(list))return [];
 const out=[],seen=new Set();
 for(const d of list.slice(-36)){
  if(!d||typeof d!=='object'||typeof d.id!=='string'||!d.id||d.id.length>64||seen.has(d.id)||!Number.isFinite(d.x)||!Number.isFinite(d.z)||Math.abs(d.x)>70||Math.abs(d.z)>70||!Number.isSafeInteger(d.amount)||d.amount<1||d.amount>99)continue;
  if(d.kind==='coins'&&d.itemId!=='coins')continue;
  if(d.kind==='material'&&!['moss-fibre','boar-hide','bandit-token'].includes(d.itemId))continue;
  if(d.kind==='armour'&&(!Object.hasOwn(ARMOUR,d.itemId)||d.amount!==1))continue;
  if(d.kind==='weapon'&&(!STYLE_ORDER.includes(d.style)||!Object.hasOwn(LOADOUTS[d.style],d.itemId)||d.amount!==1))continue;
  if(!['coins','material','armour','weapon'].includes(d.kind))continue;
  seen.add(d.id);out.push({...d});
 }
 return out;
}
export const XP_BY_MOB = {dummy:0,mossling:30,boar:46,bandit:75};
export function nextStyle(style) { const i=STYLE_ORDER.indexOf(style); return STYLE_ORDER[(i+1)%STYLE_ORDER.length]; }
export function xpToLevel(level) { return 65 + level*45; }
export function levelFromXp(xp) { let level=1; while(level<99 && xp>=xpToLevel(level)){xp-=xpToLevel(level);level++;} return {level,progress:xp/xpToLevel(level),remaining:xp}; }
/** Per-skill current XP, remaining XP and percentage, consistent with existing level rules. */
export function xpProgress(totalXp){
 const xp=Number.isFinite(totalXp)?Math.max(0,Math.floor(totalXp)):0;
 const {level,remaining}=levelFromXp(xp);
 const maxed=level===99;
 const required=maxed?0:xpToLevel(level);
 const current=maxed?0:remaining;
 return {level,totalXp:xp,current,required,needed:maxed?0:required-current,progress:maxed?1:Math.min(1,current/required),maxed};
}
/** Derived overall strength: one primary attack style, Vitality and limited hybrid credit.
 *  Caps at 99 and never grants XP itself. */
export function combatLevelFromXp(xp){
 const attacks=['melee','ranged','magic'].map(key=>levelFromXp(Math.max(0,Number(xp?.[key])||0)).level).sort((a,b)=>b-a);
 const vitality=levelFromXp(Math.max(0,Number(xp?.vitality)||0)).level;
 return Math.max(1,Math.min(99,Math.floor(attacks[0]*.65+vitality*.25+(attacks[1]+attacks[2])*.05+1e-9)));
}
export function maxHealth(vitalityLevel) { return 100 + (vitalityLevel-1)*8; }
export function damageAfterArmour(damage,shield=false,armourId='traveller',type='physical') { const armour=defenceFor(armourId);const mitigation=type==='magical'?armour.magical:armour.physical;return Math.max(1,Math.round(damage*(1-mitigation)*(shield?.42:1))); }
export function meleeTarget(origin,heading,enemies,reach,minDot=0.24) {
  return enemies.filter(e=>!e.dead && e.hp>0).map(e=>{
    const dx=e.x-origin.x, dz=e.z-origin.z, dist=Math.hypot(dx,dz);
    const dot=(dx*heading.x+dz*heading.z)/(dist||1);
    return {enemy:e,dist,dot};
  }).filter(e=>e.dist<=reach && e.dot>=minDot).sort((a,b)=>a.dist-b.dist)[0]?.enemy || null;
}
export function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
export function defaultSave(){
  const gear={melee:'sword',magic:'frost',ranged:'bow'};
  const armour={melee:'traveller',magic:'traveller',ranged:'traveller'};
  const slots={};
  for(const style of STYLE_ORDER){
    slots[style]={};
    for(const w of Object.values(LOADOUTS[style]))slots[style][w.family]=['w0',null,null,null];
  }
  return {xp:{melee:0,magic:0,ranged:0,vitality:0},coins:0,defeated:0,gear,armour,slots,inventory:starterInventory(),equipment:blankEquipment(),groundLoot:[],lootVersion:1,bank:{coins:0,materials:{},weapons:{melee:[],magic:[],ranged:[]},armour:[],slotted:[]},professions:{woodcuttingLearned:false,woodcuttingXp:0}};
}
export function freshCharacterSave(){
 const d=defaultSave();
 d.characterFresh=true;
 d.inventory={weapons:{melee:[],magic:[],ranged:[]},armour:[],slotted:[],materials:{}};
 d.armour={melee:'none',magic:'none',ranged:'none'};
 d.onboarding={
  area:'tutorial',
  tutorial:{hitStyles:[],skillsRead:false},
  teleportScrolls:0,
  activatedPortals:[]
 };
 return d;
}
export function validSave(raw){
  const d=raw?.characterFresh===true?freshCharacterSave():defaultSave();if(!raw||typeof raw!=='object')return d;
  for(const k of Object.keys(d.xp))if(Number.isFinite(raw.xp?.[k]))d.xp[k]=clamp(raw.xp[k],0,10000000);
  d.coins=clamp(Number(raw.coins)||0,0,10000000);
  d.defeated=clamp(Number(raw.defeated)||0,0,10000000);
  // Sanitize ownership; a legacy save receives earned equipment for its existing levels.
  if(raw.inventory?.weapons){
   for(const style of STYLE_ORDER){
    const owned=raw.inventory.weapons[style];
    if(Array.isArray(owned))d.inventory.weapons[style]=owned.filter(id=>typeof id==='string'&&Object.hasOwn(LOADOUTS[style],id));
   }
  }
  if(Array.isArray(raw.inventory?.armour))d.inventory.armour=raw.inventory.armour.filter(id=>typeof id==='string'&&Object.hasOwn(ARMOUR,id));
  if(Array.isArray(raw.inventory?.slotted))d.inventory.slotted=[...new Set(raw.inventory.slotted.filter(id=>Object.hasOwn(SLOT_ITEMS,id)))];
  if(raw.inventory?.materials&&typeof raw.inventory.materials==='object')for(const id of ['moss-fibre','boar-hide','bandit-token','softwood-logs']){
    const n=raw.inventory.materials[id];if(Number.isSafeInteger(n)&&n>0)d.inventory.materials[id]=Math.min(9999,n);
  }
  // Bank and profession data live in each character save and must survive reloads.
  if(raw.bank&&typeof raw.bank==='object'){
    d.bank.coins=Number.isSafeInteger(raw.bank.coins)?clamp(raw.bank.coins,0,10000000):0;
    for(const id of ['moss-fibre','boar-hide','bandit-token','softwood-logs']){
      const value=raw.bank.materials?.[id];if(Number.isSafeInteger(value)&&value>0)d.bank.materials[id]=clamp(value,0,9999);
    }
    for(const style of STYLE_ORDER){
      const held=raw.bank.weapons?.[style];
      if(Array.isArray(held))d.bank.weapons[style]=[...new Set(held.filter(id=>typeof id==='string'&&Object.hasOwn(LOADOUTS[style],id)))].filter(id=>!d.inventory.weapons[style].includes(id));
    }
    if(Array.isArray(raw.bank.armour))d.bank.armour=[...new Set(raw.bank.armour.filter(id=>typeof id==='string'&&Object.hasOwn(ARMOUR,id)))].filter(id=>!d.inventory.armour.includes(id));
    if(Array.isArray(raw.bank.slotted))d.bank.slotted=[...new Set(raw.bank.slotted.filter(id=>Object.hasOwn(SLOT_ITEMS,id)))].filter(id=>!d.inventory.slotted.includes(id));
  }
  if(raw.professions&&typeof raw.professions==='object'){
    d.professions.woodcuttingLearned=raw.professions.woodcuttingLearned===true;
    const xp=raw.professions.woodcuttingXp;
    d.professions.woodcuttingXp=Number.isSafeInteger(xp)?clamp(xp,0,710):0;
  }
  // The previous prototype granted gear at level milestones. Preserve that legacy gear
  // exactly once on migration; in this build new gear is earned from physical drops.
  if(raw.lootVersion!==1&&!d.characterFresh)awardTrainingGear(d);
  d.groundLoot=validGroundLoot(raw.groundLoot);
  // Only brand-new characters use the tutorial flow. Older saves without this
  // field remain in the existing world and keep their progression intact.
  if(raw.onboarding&&typeof raw.onboarding==='object'){
   const o=raw.onboarding;
   const area=['tutorial','realm','world'].includes(o.area)?o.area:'world';
   const hitStyles=Array.isArray(o.tutorial?.hitStyles)?[...new Set(o.tutorial.hitStyles.filter(s=>STYLE_ORDER.includes(s)))]:[];
   const scrolls=Number.isSafeInteger(o.teleportScrolls)?clamp(o.teleportScrolls,0,999):0;
   const activatedPortals=Array.isArray(o.activatedPortals)&&o.activatedPortals.includes('oakrest')?['oakrest']:[];
   d.onboarding={area,tutorial:{hitStyles,skillsRead:o.tutorial?.skillsRead===true},teleportScrolls:scrolls,activatedPortals};
   // Never let a corrupt/incomplete save jump to the realm without completing training.
   if(area==='realm'&&(!d.onboarding.tutorial.skillsRead||hitStyles.length<3))d.onboarding.area='tutorial';
  }else if(d.characterFresh){
   d.onboarding={area:'world',tutorial:{hitStyles:[],skillsRead:false},teleportScrolls:0,activatedPortals:['oakrest']};
  }
  for(const style of STYLE_ORDER){
    for(const slot of EXTRA_SLOTS){
      const id=raw.equipment?.[style]?.[slot];
      if(canEquipSlotItem(d,style,id)&&SLOT_ITEMS[id].slot===slot)d.equipment[style][slot]=id;
    }
    if(canEquipWeapon(style,raw.gear?.[style],d.xp)&&ownsWeapon(d,style,raw.gear[style]))d.gear[style]=raw.gear[style];
    if(canEquipArmour(raw.armour?.[style],d.xp)&&ownsArmour(d,raw.armour[style]))d.armour[style]=raw.armour[style];
    const level=levelFromXp(d.xp[style]).level;
    for(const [family,slots] of Object.entries(d.slots[style])){
      const incoming=raw.slots?.[style]?.[family];
      if(!Array.isArray(incoming))continue;const validIds=new Set(skillCatalogue(style,family).filter(a=>a.requiredLevel<=level).map(a=>a.id));
      const seen=new Set();
      d.slots[style]=d.slots[style]||{};
      d.slots[style][family]=[0,1,2,3].map(i=>{
        const id=incoming[i];if(typeof id!=='string'||!validIds.has(id)||seen.has(id))return null;
        seen.add(id);return id;
      });
    }
  }
  return d;
}