/** Combat and progression rules stay independent from Three.js so they can be tested. */
export const STYLE_ORDER = ['melee', 'magic', 'ranged'];
export const STYLE_COLOURS = { melee:'#db9a72', magic:'#9cacf6', ranged:'#9edbb1' };
export const LOADOUTS = {
  melee: {
    sword: { title:'Iron Longsword', icon:'⚔', reach:2.9, basic:15, interval:0.68, abilities:[
      { name:'Heavy Slash', icon:'⚔', kind:'hit', damage:30, reach:3, cooldown:5, note:'A strong forward strike.' },
      { name:'Cleave', icon:'◈', kind:'sweep', damage:19, reach:3.2, cooldown:7, note:'Hit nearby enemies in an arc.' },
      { name:'Guard Break', icon:'⬡', kind:'hit', damage:14, reach:3, cooldown:9, stun:1.3, note:'Stagger an enemy.' },
      { name:'Counterguard', icon:'✣', kind:'shield', duration:4, cooldown:13, note:'Reduce the next incoming hits.' },
    ]},
    daggers: { title:'Twin Daggers', icon:'⌁', reach:2.3, basic:9, interval:0.34, abilities:[
      { name:'Quick Slice', icon:'⌁', kind:'hit', damage:15, reach:2.5, bleed:4, cooldown:4, note:'Fast slash that causes bleeding.' },
      { name:'Twin Strike', icon:'✕', kind:'hit', damage:24, reach:2.5, cooldown:6, note:'Strike twice in quick succession.' },
      { name:'Shadow Step', icon:'»', kind:'dash', distance:5, cooldown:9, note:'Dash quickly toward the target.' },
      { name:'Open Wound', icon:'✦', kind:'execute', damage:23, reach:2.6, cooldown:10, note:'Bonus damage if the target is bleeding.' },
    ]},
  },
  magic: {
    frost: { title:'Frostwood Staff', icon:'✦', reach:18, basic:11, interval:0.8, abilities:[
      { name:'Ice Shard', icon:'❄', kind:'bolt', damage:25, speed:19, cooldown:4, slow:2.8, note:'A slowing frost projectile.' },
      { name:'Frost Nova', icon:'✺', kind:'nova', damage:13, reach:5.5, cooldown:9, slow:3.5, note:'Freeze the ground around you.' },
      { name:'Frozen Binding', icon:'◇', kind:'bolt', damage:8, speed:15, cooldown:13, root:2, swapLock:3, note:'Root the enemy; blocks style switches in PvP later.' },
      { name:'Ice Barrier', icon:'⬡', kind:'shield', duration:5, cooldown:16, note:'Take less damage for a short time.' },
    ]},
    ember: { title:'Ember Wand', icon:'✧', reach:17, basic:13, interval:0.72, abilities:[
      { name:'Firebolt', icon:'✧', kind:'bolt', damage:29, speed:22, cooldown:4, note:'Launch a fiery projectile.' },
      { name:'Flame Wave', icon:'≋', kind:'sweep', damage:21, reach:6.5, cooldown:8, note:'A close-range wave of fire.' },
      { name:'Blink', icon:'»', kind:'dash', distance:6, cooldown:12, note:'Quickly surge forward.' },
      { name:'Warmth', icon:'✚', kind:'heal', heal:30, cooldown:18, note:'Restore a little health.' },
    ]},
  },
  ranged: {
    bow: { title:'Oak Longbow', icon:'➶', reach:22, basic:13, interval:0.72, abilities:[
      { name:'Piercing Arrow', icon:'➶', kind:'bolt', damage:29, speed:28, cooldown:5, note:'Fire a powerful straight arrow.' },
      { name:'Rapid Shot', icon:'≡', kind:'burst', damage:11, speed:26, count:3, cooldown:8, note:'Release three arrows in quick succession.' },
      { name:'Pinning Shot', icon:'⊙', kind:'bolt', damage:13, speed:25, root:1.6, cooldown:10, note:'Temporarily root your target.' },
      { name:'Retreating Shot', icon:'«', kind:'retreat', damage:15, cooldown:12, note:'Fire as you leap backwards.' },
    ]},
    crossbow: { title:'Light Crossbow', icon:'➴', reach:23, basic:18, interval:1.05, abilities:[
      { name:'Crack Shot', icon:'➴', kind:'bolt', damage:35, speed:32, cooldown:6, note:'A heavy hitting crossbow bolt.' },
      { name:'Scattershot', icon:'✷', kind:'sweep', damage:22, reach:9, cooldown:8, note:'A spread of close-range bolts.' },
      { name:'Snare Bolt', icon:'⊗', kind:'bolt', damage:12, speed:27, slow:4, cooldown:10, note:'Slow your enemy.' },
      { name:'Roll Back', icon:'«', kind:'dashback', distance:5, cooldown:11, note:'Tumble away from danger.' },
    ]},
  },
};
export const XP_BY_MOB = {dummy:0,mossling:30,boar:46,bandit:75};
export function nextStyle(style) { const i=STYLE_ORDER.indexOf(style); return STYLE_ORDER[(i+1)%STYLE_ORDER.length]; }
export function xpToLevel(level) { return 65 + level*45; }
export function levelFromXp(xp) { let level=1; while(level<99 && xp>=xpToLevel(level)){xp-=xpToLevel(level);level++;} return {level,progress:xp/xpToLevel(level),remaining:xp}; }
export function maxHealth(vitalityLevel) { return 100 + (vitalityLevel-1)*8; }
export function damageAfterArmour(damage,shield=false) { return Math.max(1, Math.round(damage*(shield ? 0.42:1))); }
export function meleeTarget(origin,heading,enemies,reach,minDot=0.24) {
  return enemies.filter(e=>!e.dead && e.hp>0).map(e=>{
    const dx=e.x-origin.x, dz=e.z-origin.z, dist=Math.hypot(dx,dz);
    const dot=(dx*heading.x+dz*heading.z)/(dist||1);
    return {enemy:e,dist,dot};
  }).filter(e=>e.dist<=reach && e.dot>=minDot).sort((a,b)=>a.dist-b.dist)[0]?.enemy || null;
}
export function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
export function defaultSave(){return { xp:{melee:0,magic:0,ranged:0,vitality:0}, coins:0, defeated:0, gear:{melee:'sword',magic:'frost',ranged:'bow'} }; }
export function validSave(raw){ const d=defaultSave(); if(!raw||typeof raw!=='object')return d; for(const k of Object.keys(d.xp))if(Number.isFinite(raw.xp?.[k]))d.xp[k]=clamp(raw.xp[k],0,10000000); d.coins=clamp(Number(raw.coins)||0,0,10000000); d.defeated=clamp(Number(raw.defeated)||0,0,10000000); for(const style of STYLE_ORDER)if(raw.gear?.[style] in LOADOUTS[style])d.gear[style]=raw.gear[style]; return d; }