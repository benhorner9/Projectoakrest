import {ADVENTURE_MATERIALS} from './adventure-content.js';
/** Central, stable item identity and art definitions. Legacy saves keep their existing kind/itemId/style format. */
import {LOADOUTS,ARMOUR,STYLE_ORDER} from './rules.js';
import {MATERIAL_DROPS} from './combat-feel.js';
import {SLOT_ITEMS} from './equipment-slots.js';
import {TREE_SPECIES,WOODCUTTING_AXES} from './woodcutting.js';
import {modelNameForItem} from './item-model-registry.js';
const catalogue=[];
const add=(id,kind,title,legacy,accent,shape,extra={})=>{
 catalogue.push(Object.freeze({id,kind,title,legacy:Object.freeze({...legacy}),accent,shape,dropAllowed:true,...extra}));
};
add('currency.coins','coins','Gold Coins',{kind:'coins',itemId:'coins'},'#eed077','coin');
const matColours={'moss-fibre':'#81ba73','boar-hide':'#b98560','bandit-token':'#d6aa65'};
const matShapes={'moss-fibre':'fibre','boar-hide':'hide','bandit-token':'token'};
for(const mat of Object.values(MATERIAL_DROPS))add('material.'+mat.id,'material',mat.title,{kind:'material',itemId:mat.id},matColours[mat.id]||'#8abf91',matShapes[mat.id]||'fibre',{description:({'moss-fibre':'Weave robes and an apprentice focus, inscribe ember scrolls or blend tonics.','boar-hide':'Stitch hardened leather or bind a bronze quiver.','bandit-token':'Proof of a defeated bandit. Exchange five with Elowen for field supplies.'})[mat.id]});
const armourColours={traveller:'#7ba19b',leather:'#b1835c',plate:'#b5cad0'};
for(const [id,a] of Object.entries(ARMOUR))add('armour.'+id,'armour',a.title,{kind:'armour',itemId:id},armourColours[id]||'#9cacc0','armour',{description:a.description});
const styleColours={melee:'#c3c9ca',magic:'#8aa8df',ranged:'#c99c68'};
for(const style of STYLE_ORDER){
 for(const [id,weapon] of Object.entries(LOADOUTS[style])){
  const shape=style==='magic'?'staff':style==='ranged'?'bow':id.endsWith('-axe')?'axe':'blade';
  add('weapon.'+style+'.'+id,'weapon',weapon.title,{kind:'weapon',style,itemId:id},WOODCUTTING_AXES.find(axe=>axe.id===id)?.colour||styleColours[style],shape,{description:id.endsWith('-axe')?'A forestry tool. Keep in your bag or wield it to chop trees; better axes improve successful cuts.':style+' · '+(weapon.family||id),dropAllowed:!id.endsWith('-axe')});
 }
}
// Starter-town slot equipment has unique icons and is purchased rather than randomly dropped.
for(const item of Object.values(SLOT_ITEMS)){
 add('slot.'+item.id,'slot',item.title,{kind:'slot',itemId:item.id},
  {melee:'#dfb07a',magic:'#a0b6ef',ranged:'#b4cf9b',all:'#d5c39b'}[item.style],
  item.shape,{description:item.description,dropAllowed:false});
}
// All seven logs come only from Woodcutting, never monster drops.
for(const tree of TREE_SPECIES)add('material.'+tree.logId,'material',tree.name+' Logs',
 {kind:'material',itemId:tree.logId},tree.bark,'logs',
 {dropAllowed:false,description:tree.id==='softwood'?'Fletch arrows and bows, inscribe frost scrolls, or reinforce equipment. Sell five to Darrin for eight coins.':'Timber cut from a '+tree.name+' tree. Bank it while training Woodcutting.'});
// This scroll already exists as a persisted onboarding balance, not as a general monster drop.
catalogue.push(Object.freeze({id:'scroll.teleport',kind:'scroll',title:'Teleportation Scroll',legacy:Object.freeze({kind:'scroll',itemId:'teleport'}),accent:'#9bcfe6',shape:'scroll',dropAllowed:false}));
for(const [id,[title,description,shape]] of Object.entries(ADVENTURE_MATERIALS))add('material.'+id,'material',title,{kind:'material',itemId:id},'#bdad85',shape,{description,dropAllowed:['hollow-shard','warden-heart'].includes(id)});
export const ITEM_CATALOG=Object.freeze(catalogue);
export const ITEMS_BY_ID=Object.freeze(Object.fromEntries(ITEM_CATALOG.map(item=>[item.id,item])));
export const DROPPABLE_ITEMS=Object.freeze(ITEM_CATALOG.filter(item=>item.dropAllowed));
export const getItem=id=>ITEMS_BY_ID[id]||null;
export const itemIdFromLegacy=drop=>{
 if(!drop||typeof drop!=='object')return null;
 return drop.kind==='weapon'?'weapon.'+drop.style+'.'+drop.itemId:
  drop.kind==='scroll'?'scroll.'+drop.itemId:drop.kind==='coins'?'currency.coins':drop.kind+'.'+drop.itemId;
};
export const itemFromDrop=drop=>getItem(itemIdFromLegacy(drop));
const hashKey=s=>{let v=5381;for(const ch of s)v=((v*33)^ch.charCodeAt(0))>>>0;return v;};
const shapes={
 coin:'<ellipse cx="32" cy="33" rx="20" ry="21" fill="#88642d" stroke="#fbe7a1" stroke-width="3"/><ellipse cx="32" cy="30" rx="15" ry="17" fill="#dbb84d"/><path d="M31 18V44M24 23H37M23 39H36" stroke="#fff2bc" stroke-width="3" stroke-linecap="round"/>',
 fibre:'<path d="M32 54Q9 31 23 10Q29 17 29 29Q46 10 51 17Q50 42 32 54Z" fill="#58875f" stroke="#d2e2b1" stroke-width="2"/><path d="M32 52Q33 26 45 19M32 44L22 30" fill="none" stroke="#e3f0cb" stroke-width="2"/>',
 hide:'<path d="M14 11Q23 15 31 11Q42 13 50 10L54 22Q47 30 53 45L42 54L31 47L19 54L10 44L16 31Z" fill="#a97751" stroke="#efcf9e" stroke-width="3"/><path d="M23 24Q34 30 43 21M22 39L39 45" fill="none" stroke="#d49b6b" stroke-width="2"/>',
 token:'<path d="M32 7L51 18L51 44L32 55L13 44L13 18Z" fill="#a17f48" stroke="#f9df97" stroke-width="3"/><path d="M32 16L44 32L32 47L20 32Z" fill="#e4b763" stroke="#fef1be" stroke-width="2"/>',
 armour:'<path d="M15 13L25 8L32 15L40 8L50 13L55 26L45 32L45 53L19 53L19 32L9 26Z" fill="#536c7b" stroke="#d5e0d9" stroke-width="2"/><path d="M20 19L32 25L45 19M24 46H40" fill="none" stroke="#e7dcba" stroke-width="3"/>',
 blade:'<path d="M31 7L39 15L36 38L31 43L26 38L23 15Z" fill="#b7d2d6" stroke="#ecf7f0" stroke-width="2"/><path d="M15 42L47 42M32 44V56" stroke="#bd8f52" stroke-width="6" stroke-linecap="round"/><circle cx="32" cy="41" r="4" fill="#e2bd7b"/>',
 axe:'<path d="M18 57L37 13" stroke="#8e704c" stroke-width="7" stroke-linecap="round"/><path d="M33 8Q51 4 56 17L49 29Q43 20 31 23Z" fill="#c2cfd0" stroke="#eef0e7" stroke-width="3"/>',
 staff:'<path d="M20 55L39 12" stroke="#86653f" stroke-width="7" stroke-linecap="round"/><path d="M41 5L53 17L41 29L29 17Z" fill="#87bfd8" stroke="#e3f8ff" stroke-width="3"/><path d="M33 17H49M41 9V25" stroke="#e7ffff" stroke-width="2"/>',
 bow:'<path d="M26 8Q52 30 26 54Q40 32 26 8Z" fill="#8e6242" stroke="#dbb77a" stroke-width="4"/><path d="M26 8L26 54M9 33H49M43 28L51 33L43 38" fill="none" stroke="#e9e1ca" stroke-width="2.5"/>',
 helm:'<path d="M13 32Q14 11 32 10Q50 11 51 32L46 47H18Z" fill="#b2b7bd" stroke="#efebcd" stroke-width="3"/><path d="M13 34H51M30 20V47" stroke="#5a6873" stroke-width="4"/>',
 legs:'<path d="M18 9H46L43 55H34L32 29L29 55H20Z" fill="#6d8491" stroke="#dde3d6" stroke-width="3"/><path d="M19 24H44" stroke="#bbac84" stroke-width="3"/>',
 shield:'<path d="M32 6L53 14V35Q49 50 32 59Q15 50 11 35V14Z" fill="#667b83" stroke="#dfd1ad" stroke-width="3"/><path d="M32 14V50M19 30H45" stroke="#f3e4b7" stroke-width="5"/>',
 boots:'<path d="M12 12H27V41L35 50V56H7V46L12 37ZM37 12H51V40L58 49V56H32V47L37 38Z" fill="#765b48" stroke="#ddc49c" stroke-width="2"/>',
 arrows:'<path d="M17 53L48 13M11 42L18 53L31 50M40 12L51 10L49 21" stroke="#e7dfc4" stroke-width="4" fill="none"/><path d="M23 53L53 23" stroke="#b4c29b" stroke-width="3"/>',
 amulet:'<path d="M19 11Q31 42 46 11" fill="none" stroke="#d1c398" stroke-width="5"/><path d="M32 31L44 43L32 58L20 43Z" fill="#a2c7dd" stroke="#fff1c6" stroke-width="3"/>',
 ring:'<circle cx="32" cy="35" r="17" fill="none" stroke="#e9c982" stroke-width="9"/><circle cx="32" cy="14" r="7" fill="#92c7c6" stroke="#e6f0d7" stroke-width="2"/>',
 orb:'<circle cx="32" cy="29" r="18" fill="#87bddd" stroke="#e9eacb" stroke-width="4"/><path d="M15 53L32 42L49 53M32 42V60" stroke="#d3b37e" stroke-width="4"/>',
 logs:'<rect x="14" y="13" width="13" height="38" rx="6" fill="#805a38" stroke="#e0be8a" stroke-width="2"/><rect x="30" y="10" width="14" height="42" rx="7" fill="#926e41" stroke="#e8cca0" stroke-width="2"/><path d="M18 18V46M37 14V47" stroke="#d1af78" stroke-width="2"/>',
 scroll:'<path d="M17 13H48V50H17Z" fill="#e0cb97" stroke="#f7edca" stroke-width="3"/><path d="M14 13H51M14 50H51" stroke="#c6a26a" stroke-width="7" stroke-linecap="round"/><path d="M25 25L40 25M25 32L43 32M25 39H38" stroke="#7c8da8" stroke-width="2.5"/>'
};
/** Generated SVG art remains local, stable and distinct for every registered item. */
export function itemIconSvg(itemId){
 const item=getItem(itemId);if(!item)return null;
 const seed=hashKey(itemId),tone=item.accent;
 const mark=seed%4,angle=(seed%7-3)*3;
 const emblem=mark===0?'◆':mark===1?'✦':mark===2?'◈':'•';
 const inner=shapes[item.shape]||shapes.token;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img"><rect x="2" y="2" width="60" height="60" rx="10" fill="#1a2d31" stroke="${tone}" stroke-width="2"/><circle cx="32" cy="32" r="25" fill="${tone}" opacity=".16"/><g transform="rotate(${angle} 32 32)">${inner}</g><circle cx="${12+seed%7}" cy="13" r="3.3" fill="${tone}"/><text x="50" y="56" font-size="11" font-family="serif" fill="${tone}" text-anchor="middle">${emblem}</text></svg>`;
}
export function itemIconUrl(itemId){
 const svg=itemIconSvg(itemId);if(!svg)return null;
 const model=modelNameForItem(itemId);
 return model?new URL('../assets/kaykit-adventurers/icons/'+model+'.svg',import.meta.url).href:
  'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
