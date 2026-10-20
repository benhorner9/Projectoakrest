import {levelFromXp} from './rules.js';
/** Equipment beyond weapons and chest armour. All three combat styles have independent saved slots. */
export const EQUIPMENT_SLOTS=Object.freeze([
  {id:'helm',label:'Helm'}, {id:'amulet',label:'Ammy'}, {id:'arrows',label:'Arrows'},
  {id:'chest',label:'Chest'}, {id:'legs',label:'Legs'}, {id:'weapon',label:'Weapon'},
  {id:'offhand',label:'Off hand'}, {id:'boots',label:'Boots'}, {id:'ring',label:'Ring'}
].map(x=>Object.freeze(x)));
export const EXTRA_SLOTS=Object.freeze(EQUIPMENT_SLOTS.map(x=>x.id).filter(id=>!['chest','weapon'].includes(id)));
const catalogue=[
  ['recruit-helm','Recruit Helm','helm','melee','A sturdy beginner helm.','helm',0,2],
  ['recruit-greaves','Recruit Greaves','legs','melee','Simple greaves that soften physical blows.','legs',0,2],
  ['recruit-shield','Wooden Shield','offhand','melee','A shield for a new swordsman.','shield',0,3],
  ['recruit-boots','Recruit Boots','boots','melee','Reinforced boots for the road.','boots',0,1],
  ['recruit-amulet','Soldier Amulet','amulet','melee','A charm that sharpens melee attacks.','amulet',2,0],
  ['recruit-ring','Soldier Ring','ring','melee','A plain fighting ring.','ring',1,0],
  ['scout-hood','Scout Hood','helm','ranged','Leather hood for quiet travellers.','helm',0,2],
  ['scout-chaps','Scout Chaps','legs','ranged','Light protection while keeping range.','legs',0,2],
  ['bronze-arrows','Bronze Arrows','arrows','ranged','A beginner quiver; boosts ranged attacks. Ammo is reusable in this prototype.','arrows',2,0],
  ['scout-boots','Scout Boots','boots','ranged','Soft boots for quick scouting.','boots',0,1],
  ['scout-amulet','Archer Amulet','amulet','ranged','A charm that improves ranged attacks.','amulet',2,0],
  ['scout-ring','Archer Ring','ring','ranged','A simple shooting ring.','ring',1,0],
  ['apprentice-hood','Apprentice Hood','helm','magic','A hood woven with protective thread.','helm',0,2],
  ['apprentice-leggings','Apprentice Leggings','legs','magic','Light mage clothing for the frontier.','legs',0,2],
  ['apprentice-orb','Apprentice Focus','offhand','magic','An off-hand focus for the Frostwood Staff.','orb',2,0],
  ['apprentice-boots','Apprentice Boots','boots','magic','Soft shoes lined with a ward.','boots',0,1],
  ['apprentice-amulet','Mage Amulet','amulet','magic','A starter spellcasting charm.','amulet',2,0],
  ['apprentice-ring','Mage Ring','ring','magic','A simple enchanted ring.','ring',1,0]
];
export const SLOT_ITEMS=Object.freeze(Object.fromEntries(catalogue.map(([id,title,slot,style,description,shape,power,guard])=>
 [id,Object.freeze({id,title,slot,style,description,shape,power,guard,requiredLevel:1})])));
export const STARTER_SETS=Object.freeze({
 melee:Object.freeze({id:'starter-melee-set',title:'Recruit Melee Set',style:'melee',price:110,weapon:'sword',chest:'starter-mail',slotted:Object.freeze(['recruit-helm','recruit-greaves','recruit-shield','recruit-boots','recruit-amulet','recruit-ring'])}),
 ranged:Object.freeze({id:'starter-ranged-set',title:'Scout Ranged Set',style:'ranged',price:110,weapon:'bow',chest:'starter-leather',slotted:Object.freeze(['scout-hood','scout-chaps','bronze-arrows','scout-boots','scout-amulet','scout-ring'])}),
 magic:Object.freeze({id:'starter-magic-set',title:'Apprentice Magic Set',style:'magic',price:110,weapon:'frost',chest:'starter-robes',slotted:Object.freeze(['apprentice-hood','apprentice-leggings','apprentice-orb','apprentice-boots','apprentice-amulet','apprentice-ring'])})
});
export function blankExtraSlots(){return Object.fromEntries(EXTRA_SLOTS.map(slot=>[slot,null]));}
export function blankEquipment(){return {melee:blankExtraSlots(),magic:blankExtraSlots(),ranged:blankExtraSlots()};}
export function canEquipSlotItem(data,style,id){
 const item=SLOT_ITEMS[id];
 return !!item&&item.style===style&&levelFromXp(data?.xp?.[style]||0).level>=item.requiredLevel&&
  (data.inventory?.slotted||[]).includes(id);
}
export function equipSlotItem(data,style,slot,id){
 if(!EXTRA_SLOTS.includes(slot)||!data.equipment?.[style])return false;
 if(id!==null&&(!canEquipSlotItem(data,style,id)||SLOT_ITEMS[id].slot!==slot))return false;
 data.equipment[style][slot]=id;return true;
}
/** Percentages are intentionally modest; they are applied to live PvE combat. */
export function equipmentModifiers(data,style){
 let power=0,guard=0;
 for(const slot of EXTRA_SLOTS){
  const id=data.equipment?.[style]?.[slot],item=SLOT_ITEMS[id];
  if(item&&item.style===style&&item.slot===slot&&(data.inventory?.slotted||[]).includes(id)){
    power+=item.power;guard+=item.guard;
  }
 }
 return {power:1+power/100,guard:Math.min(.2,guard/100)};
}
