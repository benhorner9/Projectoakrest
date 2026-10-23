export const MODEL_NAMES=Object.freeze([
 'sword_1handed','sword_2handed','dagger','axe_1handed','crossbow_2handed',
 'staff','wand','quiver','shield_square','arrow'
]);
export const MODEL_ITEMS=Object.freeze({
 'weapon.melee.sword':'sword_1handed',
 'weapon.melee.forged_sword':'sword_1handed',
 'weapon.melee.greatsword':'sword_2handed',
 'weapon.melee.daggers':'dagger',
 'weapon.magic.frost':'staff',
 'weapon.magic.ember':'wand',
 'weapon.ranged.crossbow':'crossbow_2handed',
 'slot.recruit-shield':'shield_square',
 'slot.bronze-arrows':'quiver'
});
export function modelNameForItem(itemId){
 if(typeof itemId!=='string')return null;
 if(MODEL_ITEMS[itemId])return MODEL_ITEMS[itemId];
 if(/^weapon\.melee\.[a-z0-9-]+-axe$/.test(itemId))return 'axe_1handed';
 return null;
}
