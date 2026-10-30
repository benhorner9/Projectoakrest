import {ADVENTURE_MATERIALS} from './adventure-content.js';
/** Central, stable item identity and art definitions. Legacy saves keep their existing kind/itemId/style format. */
import {LOADOUTS,ARMOUR,STYLE_ORDER} from './rules.js';
import {MATERIAL_DROPS} from './combat-feel.js';
import {SLOT_ITEMS} from './equipment-slots.js';
import {TREE_SPECIES,WOODCUTTING_AXES} from './woodcutting.js';
import {classicItemIconSvg} from './classic-item-art.js';
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
/** The same unified Oakrest item icon is used in equipment, backpack, bank,
 * shop, inspect, and the compact sidebar. Never infer item ownership here. */
const iconCache=new Map(),iconUrlCache=new Map();
export function itemIconSvg(itemId){
 if(!getItem(itemId))return null;
 if(!iconCache.has(itemId))iconCache.set(itemId,classicItemIconSvg(getItem(itemId)));
 return iconCache.get(itemId);
}
export function itemIconUrl(itemId){
 const svg=itemIconSvg(itemId);if(!svg)return null;
 if(!iconUrlCache.has(itemId))iconUrlCache.set(itemId,'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg));
 return iconUrlCache.get(itemId);
}
