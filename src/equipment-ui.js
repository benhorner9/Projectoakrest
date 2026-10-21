import {STYLE_ORDER,LOADOUTS,ARMOUR,canEquipWeapon,canEquipArmour,ownsWeapon,ownsArmour} from './rules.js';
import {EQUIPMENT_SLOTS,EXTRA_SLOTS,SLOT_ITEMS,canEquipSlotItem} from './equipment-slots.js';
import {getItem,itemIconUrl} from './items.js';
import {weaponDisplay} from './attack-rules.js';
const node=(tag,text,parent,cls)=>{
 const e=document.createElement(tag);if(cls)e.className=cls;
 if(text!==null&&text!==undefined)e.textContent=text;
 if(parent)parent.append(e);return e;
};
const button=(parent,title,fn,cls,disabled=false)=>{
 const b=node('button',null,parent,cls);b.type='button';b.disabled=disabled;b.title=title;
 if(fn)b.addEventListener('click',fn);
 return b;
};
const icon=(parent,id)=>{
 const uri=itemIconUrl(id);if(!uri)return;
 const img=node('img',null,parent,'oak-item-icon');img.src=uri;img.alt='';img.width=43;img.height=43;
};
const canonical=(kind,id,style)=>kind==='weapon'?'weapon.'+style+'.'+id:kind==='armour'?'armour.'+id:
 kind==='slot'?'slot.'+id:kind==='material'?'material.'+id:kind==='coins'?'currency.coins':'scroll.teleport';
export function inventoryEntries(data){
 const list=[];
 for(const style of STYLE_ORDER)
  for(const id of data.inventory?.weapons?.[style]||[])if(LOADOUTS[style]?.[id])list.push({canonical:canonical('weapon',id,style),kind:'weapon',id,style,qty:1});
 for(const id of data.inventory?.armour||[])if(ARMOUR[id])list.push({canonical:canonical('armour',id),kind:'armour',id,qty:1});
 for(const id of data.inventory?.slotted||[])if(SLOT_ITEMS[id])list.push({canonical:canonical('slot',id),kind:'slot',id,style:SLOT_ITEMS[id].style,qty:1});
 for(const [id,qty] of Object.entries(data.inventory?.materials||{}))
  if(qty>0&&getItem(canonical('material',id)))list.push({canonical:canonical('material',id),kind:'material',id,qty});
 if(data.onboarding?.teleportScrolls>0)list.push({canonical:'scroll.teleport',kind:'scroll',id:'teleport',qty:data.onboarding.teleportScrolls});
 if(data.coins>0)list.push({canonical:'currency.coins',kind:'coins',id:'coins',qty:Math.floor(data.coins)});
 return list;
}
export function renderInventoryGrid(host,data,examine){
 const head=node('div',null,host,'oak-inventory-heading');
 node('strong','INVENTORY',head);
 node('span',inventoryEntries(data).length+' items · '+data.coins+' coins',head);
 node('p','Tap an item to examine its use, bonuses and requirements. From there you can equip it.',host,'oak-inventory-hint');
 const grid=node('div',null,host,'oak-inventory-grid');
 const entries=inventoryEntries(data);
 for(let i=0;i<Math.max(28,entries.length);i++){
  const entry=entries[i];
  if(!entry){node('div',null,grid,'oak-inventory-empty').setAttribute('aria-hidden','true');continue;}
  const item=getItem(entry.canonical);if(!item)continue;
  const tile=button(grid,'Examine '+item.title,()=>examine(entry.canonical),'oak-inventory-item');
  tile.dataset.kind=item.kind;
  tile.setAttribute('aria-label','Examine '+item.title+(entry.qty>1?', quantity '+entry.qty:''));
  icon(tile,entry.canonical);
  if(entry.qty>1)node('span',String(entry.qty),tile,'oak-item-quantity');
 }
}
const activeSlot=(data,style,slot)=>{
 if(slot==='weapon'){const id=data.gear?.[style];return ownsWeapon(data,style,id)?canonical('weapon',id,style):null;}
 if(slot==='chest'){const id=data.armour?.[style];return ownsArmour(data,id)?canonical('armour',id):null;}
 const id=data.equipment?.[style]?.[slot];
 return id&&SLOT_ITEMS[id]?.slot===slot&&SLOT_ITEMS[id]?.style===style&&(data.inventory?.slotted||[]).includes(id)?canonical('slot',id):null;
};
export function renderEquipmentPaperDoll(host,data,style,examine){
 node('h3','Equipped · '+style.toUpperCase(),host);
 node('p','Each combat style has its own saved nine-slot equipment layout. Switch combat styles above to inspect its set.',host);
 const shell=node('div',null,host,'oak-gear-layout');
 const doll=node('div',null,shell,'oak-gear-paperdoll');
 for(const {id,label} of EQUIPMENT_SLOTS){
  const equipped=activeSlot(data,style,id);
  const tile=button(doll,equipped?'Examine '+getItem(equipped)?.title:label+' empty',equipped?()=>examine(equipped):null,'oak-gear-slot oak-gear-'+id,!equipped);
  node('span',label,tile,'oak-slot-label');
  if(equipped)icon(tile,equipped);
  else node('span','+',tile,'oak-slot-empty-mark');
 }
 node('h3','Items you can equip',host);
 node('p','Choose an owned item below to examine and equip it. Empty slots remain empty until you acquire equipment.',host);
 const list=node('div',null,host,'oak-gear-choices');
 const candidates=inventoryEntries(data).filter(x=>x.kind==='weapon'&&x.style===style||
  x.kind==='armour'||x.kind==='slot'&&x.style===style);
 if(!candidates.length)node('p','No equipment in your bag yet. Visit the general store in Oakrest.',host);
 for(const entry of candidates){
  const item=getItem(entry.canonical);if(!item)continue;
  const tile=button(list,'Examine '+item.title,()=>examine(entry.canonical),'oak-gear-choice');
  tile.setAttribute('aria-label','Examine '+item.title);
  icon(tile,entry.canonical);
 }
}
export function renderExamine(host,data,currentStyle,itemId,{onGear,onSlot,onTravel}){
 const item=getItem(itemId);
 if(!item){node('p','Unknown item.',host);return;}
 const header=node('div',null,host,'oak-examine-head');
 icon(header,itemId);
 const heading=node('div',null,header);
 node('strong',item.title,heading);
 node('small',item.kind.toUpperCase(),heading);
 node('p',item.description||(
   item.kind==='material'?'A material collected while adventuring. Save it for future crafting or keep it in the bank.':
   item.kind==='coins'?'Coins are used to purchase equipment from shops.':
   item.kind==='scroll'?'A travel scroll that opens the route to the portal realm.':
   'Equipment for one of Oakrest’s three combat styles.'
 ),host,'oak-examine-description');
 const facts=node('div',null,host,'oak-examine-stats');
 const fact=(label,value)=>{const r=node('div',null,facts);node('span',label,r);node('strong',value,r);};
 if(item.kind==='weapon'){
  const {style,itemId:id}=item.legacy,w=LOADOUTS[style]?.[id];
  fact('Slot','Weapon');fact('Style',style.toUpperCase());
  fact('Requires',style.toUpperCase()+' level '+w.requiredLevel);
  fact('Basic attack',weaponDisplay(w));fact('Attack interval',w.interval+' seconds');fact('Range',w.reach+' metres');
  const owned=ownsWeapon(data,style,id),active=data.gear?.[style]===id;
  const ready=canEquipWeapon(style,id,data.xp);
  const act=button(host,active?'Unequip':'Equip to '+style.toUpperCase(),()=>onGear('weapon',active?null:id,style),'oak-examine-action',!owned||!ready||(active&&data.onboarding?.area==='tutorial'));
  act.textContent=active?'UNEQUIP':!ready?'LEVEL '+w.requiredLevel+' REQUIRED':'EQUIP';
 }else if(item.kind==='armour'){
  const id=item.legacy.itemId,a=ARMOUR[id];
  fact('Slot','Chest');fact('Requires','Vitality level '+a.requiredVitality);
  fact('Physical protection',Math.round(a.physical*100)+'%');
  fact('Magic protection',Math.round(a.magical*100)+'%');
  fact('Mobility',a.mobility.toFixed(2)+'×');
  if(a.bonusStyle)fact('Style bonus',a.bonusStyle+' damage +'+Math.round(a.bonusPower*100)+'%');
  fact('Equip to',currentStyle.toUpperCase());
  const ready=canEquipArmour(id,data.xp),active=data.armour?.[currentStyle]===id;
  const act=button(host,active?'Unequip':'Equip chest armour',()=>onGear('armour',active?null:id,currentStyle),'oak-examine-action',!ready||!ownsArmour(data,id));
  act.textContent=active?'UNEQUIP':!ready?'VITALITY '+a.requiredVitality+' REQUIRED':'EQUIP';
 }else if(item.kind==='slot'){
  const id=item.legacy.itemId,def=SLOT_ITEMS[id],active=data.equipment?.[def.style]?.[def.slot]===id;
  fact('Slot',EQUIPMENT_SLOTS.find(s=>s.id===def.slot)?.label||def.slot);
  fact('Style',def.style.toUpperCase());
  fact('Requires',def.style.toUpperCase()+' level '+def.requiredLevel);
  if(def.power)fact('Attack damage','+'+def.power+'%');
  if(def.guard)fact('Incoming damage','-'+def.guard+'%');
  if(def.slot==='arrows')fact('Ammunition','Reusable starter quiver');
  const act=button(host,active?'Unequip':'Equip',()=>onSlot(def.style,def.slot,active?null:id),'oak-examine-action',!canEquipSlotItem(data,def.style,id));
  act.textContent=active?'UNEQUIP':'EQUIP';
 }else if(item.kind==='scroll'){
  const canTravel=data.onboarding?.teleportScrolls>0&&data.onboarding?.area!=='realm'&&
   (data.onboarding?.area!=='tutorial'||data.onboarding.tutorial?.hitStyles?.length===3&&data.onboarding.tutorial?.skillsRead);
  const act=button(host,'Travel via portal scroll',onTravel,'oak-examine-action',!canTravel);
  act.textContent='USE SCROLL';
 }else if(item.kind==='material'){
  fact('Owned',String(data.inventory?.materials?.[item.legacy.itemId]||0));fact('Use','Future crafting or bank storage');
 }else if(item.kind==='coins'){
  fact('Owned',String(data.coins));fact('Use','Purchasing supplies');
 }
}
