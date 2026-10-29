/** Oakrest Classic 2.5D visual materials: driven by genuinely worn item IDs.
 * No gameplay stat/item ownership/required-level changes and no schema changes.
 * Entire module is pure, reusable by live sprite, creator and visual QA.
 */
export const CLASSIC_VISUAL_TIERS=Object.freeze([
 ['bronze','#aa7646','#e2be84','#6a4c35'],
 ['iron','#929d9d','#d0d4cb','#596b70'],
 ['steel','#a6b8bd','#f0e5d6','#647c85'],
 ['verdite','#6a9880','#b2d3af','#3c6a5f'],
 ['safferite','#7096b8','#c4d6e6','#496982'],
 ['cobalt','#536fa4','#a6bce0','#394d7e'],
 ['pryrite','#a88f57','#f2d89a','#66513e']
].map(([name,base,shine,shadow])=>Object.freeze({name,base,shine,shadow})));
export const CLASSIC_HERITAGE_ART=Object.freeze({
 metal:Object.freeze({base:'#94a5a5',shine:'#d6d7c7',shadow:'#576d6d',trim:'#d2b77c'}),
 leather:Object.freeze({base:'#94704f',shine:'#cfaa77',shadow:'#604831',trim:'#b3a17e'}),
 cloth:Object.freeze({base:'#62798a',shine:'#b3c9cc',shadow:'#405363',trim:'#d8c39a'}),
 bone:Object.freeze({base:'#d1c9ae',shine:'#f2e8cf',shadow:'#797564',trim:'#b7a076'})
});
const wornId=value=>typeof value==='string'&&value.trim()&&value!=='none'?value.trim().toLowerCase():null;
export function classicVisualItem(id,slot='chest'){
 const key=wornId(id);if(!key)return null;
 const tier=CLASSIC_VISUAL_TIERS.find(t=>new RegExp('(?:^|[-_])'+t.name+'(?:[-_]|$)').test(key));
 const leather=/hide|leather|scout|archer|stalker|phantom|carapace|dread/.test(key);
 const cloth=/robe|cloth|silk|linen|satin|velvet|apprentice|mage|magus|archmage|novice|adept/.test(key);
 const material=tier?'metal':leather?'leather':cloth?'cloth':
  /recruit|mail|plate|greave|armour|helm|sword|axe|dagger|shield/.test(key)?'metal':
  /bow|quiver|crossbow|boot|chaps/.test(key)?'leather':slot==='weapon'?'bone':'cloth';
 const standard=CLASSIC_HERITAGE_ART[material];
 const colors=tier?{base:tier.base,shine:tier.shine,shadow:tier.shadow,trim:standard.trim}:standard;
 return Object.freeze({id:key,slot,material,tier:tier?.name||'starter',...colors});
}
export function classicVisualLoadout(worn={}){
 const slots=['helm','chest','legs','boots','weapon','offhand','arrows','amulet','ring'];
 return Object.freeze(Object.fromEntries(slots.map(slot=>[slot,classicVisualItem(worn?.[slot],slot)])));
}
/** Weapon family comes from the equipped item ID, not the selected style.
 * This intentionally returns 'none' for an empty style loadout.
 */
export function classicVisualWeaponFamily(id){
 const key=wornId(id);
 if(!key)return 'none';
 if(/crossbow/.test(key))return 'crossbow';
 if(/shortbow|longbow|bow/.test(key))return 'bow';
 if(/wand/.test(key))return 'wand';
 if(/staff|frost|ember|inferno|arcane/.test(key))return 'staff';
 if(/dagger|knife/.test(key))return 'daggers';
 if(/greatsword|two-handed|2h/.test(key))return 'greatsword';
 if(/axe|hatchet/.test(key))return 'axe';
 return 'sword';
}
export function classicGarmentSilhouette(worn={}){
 const chest=classicVisualItem(worn.chest,'chest');
 if(!chest)return 'starter';
 if(chest.material==='metal')return 'armoured';
 if(chest.material==='leather')return 'fitted';
 return 'robed';
}
