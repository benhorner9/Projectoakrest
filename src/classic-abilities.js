/** Shared Classic ability contract. No save IDs, balance or clocks live here. */
export const isUtilityAbility=a=>['shield','heal','dash','dashback'].includes(a?.kind);
export const isAreaAbility=a=>['sweep','nova'].includes(a?.kind);
export function abilityWindup(weapon,ability){
 return isUtilityAbility(ability)?0:Math.min(weapon.family==='greatsword'?.6:.45,weapon.windup);
}
export function abilitySupply(style,weapon,ability,targetCount,adventure){
 if(!adventure||style==='melee'||(style==='ranged'&&isUtilityAbility(ability)))return null;
 return {id:style==='magic'?(weapon.family==='ember'?'ember-scroll':'frost-scroll'):'field-arrows',
  amount:style==='ranged'?(ability?.kind==='burst'?(ability.count||3):isAreaAbility(ability)?targetCount:1):1};
}
export function abilityEffect(style,weapon,ability){
 if(!ability)return null;
 if(isUtilityAbility(ability))return ability.kind;
 if(style==='melee'&&ability.id==='w0'&&['sword','greatsword'].includes(weapon.family))return 'heavy-slash';
 if(style==='ranged'&&ability.id==='w0'&&['bow','shortbow'].includes(weapon.family))return 'piercing-arrow';
 if(style==='magic'&&ability.id==='w0'&&weapon.family==='frost')return 'ice-shard';
 return ability.kind;
}
export function abilityDetails(style,weapon,ability,targetCount,adventure){
 const supply=abilitySupply(style,weapon,ability,targetCount,adventure);
 const cost=supply?`${supply.amount} ${supply.id.replaceAll('-',' ')} at release`:'No consumable cost';
 const range=isUtilityAbility(ability)?'Self':`Range ${ability.reach||weapon.reach}`;
 return {note:ability.note,windup:abilityWindup(weapon,ability),reach:isUtilityAbility(ability)?0:ability.reach||weapon.reach,
  supply,effect:abilityEffect(style,weapon,ability),description:`${ability.note} ${range} · ${cost} · ${ability.cooldown}s cooldown`};
}
