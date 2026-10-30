import {findClassicInteractable} from './classic-interactions.js';
import {RECIPES} from './adventure-content.js';
/** Classic 2.5D inventory and economy presentation.
 * DOM concerns stay here. All mutations use combat.itemAction and combat.pickup.
 */
import {getItem,itemIconUrl,itemFromDrop} from './items.js';
import {STYLE_ORDER,LOADOUTS,levelFromXp} from './rules.js';
import {classicBookIcon,classicBookStyleName} from './classic-combat-book.js';
import {abilityDetails} from './classic-abilities.js';
import {SLOT_ITEMS} from './equipment-slots.js';
import {classicItemDetails,classicAbilityCatalogue,usableItem,canDropItem} from './classic-item-state.js';
import {inventoryEntries} from './equipment-ui.js';
import {bankGridEntries} from './town-ui.js';
import {positionedEntries,BAG_MIN_SLOTS,VAULT_MIN_SLOTS} from './item-slot-layout.js';
import {setupClassicItemPopups} from './classic-item-popups.js';
const q=(root,id)=>root.querySelector('#'+id);
function element(parent,tag,cls,text){
 const n=document.createElement(tag);if(cls)n.className=cls;
 if(text!==undefined&&text!==null)n.textContent=String(text);
 parent.append(n);return n;
}
const button=(parent,cls,label,fn,disabled=false)=>{
 const b=element(parent,'button',cls,label);b.type='button';b.disabled=disabled;
 if(fn)b.addEventListener('click',fn);return b;
};
function icon(parent,id){
 const src=itemIconUrl(id);if(!src)return;
 const img=element(parent,'img','classic-item-icon');img.alt='';img.src=src;img.width=42;img.height=42;
}
export function setupClassicItems({combat,player,style,notify,changed,onOpen=()=>{},onClose=()=>{}}){
 const host=document.getElementById('classic-item-window');
 const title=q(host,'classic-item-title'),subtitle=q(host,'classic-item-summary');
 const content=q(host,'classic-item-content'),close=q(host,'classic-item-close');
 const tabs=[...host.querySelectorAll('[data-item-tab]')];
 let mode='inventory',detailId=null,selectedBank=null,selectedShop=null;
 let abilitySlot=0,inspectedAbilityId=null,lastCombatBookKey='';
 let combineSource=null;
 const save=()=>combat.sandboxSave();
 const view=()=>combat.itemSnapshot(style());
 function transact(action){
  const result=combat.itemAction(action,player());
  notify(result.reason||(result.ok?'Action completed':'Action unavailable'));
  if(result.ok){
   // The weapon determines the style; equipping it changes the active style
   // and reloads that weapon family's four chosen combat skills.
   if(action.type==='equip'&&action.kind==='weapon'&&action.id&&action.style!==style())changed(action.style);
   else changed();
  }
  render();return result.ok;
 }
 function craftFromBag(kind,choice){
  const result=combat.adventureAction(kind,{choice},player());
  notify(result?.reason||'Unable to make that.');
  if(result?.ok)changed();
  detailId=null;combineSource=null;render();
  return result;
 }
 const popups=setupClassicItemPopups({
  doc:document,save,style,combat,
  inspect:(parent,id)=>examine(parent,id,false),
  transact,craft:craftFromBag,
  onUseWith:id=>{combineSource=id;render();content.scrollTop=0;}
 });
 function showDetails(id){detailId=id;render();}
 function tile(grid,entry,index,scope){
  if(!entry){
   const empty=button(grid,'classic-item-cell empty','');
   empty.dataset.scope=scope;empty.dataset.slotIndex=String(index);
   empty.title='Empty slot '+(index+1);empty.setAttribute('aria-label','Empty item slot '+(index+1));
   return;
  }
  const item=getItem(entry.canonical);
  const cell=button(grid,'classic-item-cell',null,()=>{
  // Tap always examines. Drag/Alt+arrow always rearranges without a mode.
   if(mode==='inventory'&&combineSource){
    if(entry.kind==='material'&&entry.id!==combineSource){
     const ingredients=[combineSource,entry.id];
     const matches=RECIPES.filter(r=>r.station==='inventory'&&ingredients.every(id=>Object.hasOwn(r.cost,id)));
     if(matches.length>1){combineSource=null;detailId=null;render();popups.openCraft(ingredients);}
    else {
     const first=combineSource;
     const result=craftFromBag('combine',{first,second:entry.id});
     if(result?.ok)popups.openCraft([first,entry.id]);
    }
    }
    else {combineSource=null;notify('Choose a different material to combine.');render();}
    return;
   }
   if(mode==='bank'){
    selectedBank={...entry,scope};
    detailId=entry.canonical;render();
   }else if(mode==='inventory')popups.openItem(cell,entry.canonical);
   else showDetails(entry.canonical);
  });
  cell.dataset.scope=scope;cell.dataset.slotIndex=String(index);cell.dataset.canonical=entry.canonical;
  cell.setAttribute('aria-label','Open actions for '+(item?.title||entry.id));
  icon(cell,entry.canonical);
  if(entry.qty>1)element(cell,'span','classic-item-qty',entry.qty);
  cell.title=item?.title||entry.id;
 }
 function grid(parent,entries,scope,label,min=28){
  element(parent,'h3','classic-section-title',label);
  const wrapper=element(parent,'div','classic-four-grid');
  const slots=positionedEntries(entries,save()[scope==='vault'?'bankSlots':'inventorySlots'],min,
   scope==='vault'?240:96);
  slots.forEach((entry,i)=>tile(wrapper,entry,i,scope));
  return wrapper;
 }
 function examine(parent,id,includeActions=true){
  const data=save(),details=classicItemDetails(data,id,style());
  if(!details)return;
  const ex=element(parent,'div','classic-examine');
  element(ex,'h3',null,'EXAMINE');
  const header=element(ex,'div','classic-examine-name');
  icon(header,id);element(header,'strong',null,details.title);
  element(ex,'p',null,details.description);
  for(const [key,value] of details.facts){
   const fact=element(ex,'div','classic-item-fact');
   element(fact,'span',null,key);element(fact,'strong',null,value);
  }
  if(!includeActions)return;
  if(mode==='inventory'&&usableItem(id)){
   const state=combat.getState(),kind=id==='material.ration'?'eat':'drink',remaining=Math.max(0,(state.consumableCooldowns?.[kind]||0)-state.time);
   const use=button(ex,'classic-item-action',remaining>0?'READY IN '+remaining.toFixed(1)+'s':kind==='eat'?'EAT':'DRINK',()=>transact({type:'use',id}),remaining>0||state.hp<=0||state.hp>=state.maxHp||!data.inventory.materials[details.item.legacy.itemId]);use.dataset.consumable=kind;use.dataset.quantity=String(data.inventory.materials[details.item.legacy.itemId]||0);
  }
  if(mode==='inventory'&&details.item.kind==='weapon')
   element(ex,'p','classic-muted','Equip this weapon to use its combat style. Choose your four techniques in COMBAT; weapons are never assigned to the skill bar.');
  if(mode==='inventory'&&canDropItem(details.item)){
   const entry=inventoryEntries(data).find(e=>e.canonical===id);
   if(entry){
    const line=element(ex,'div','classic-item-actions'),amount=element(line,'input','classic-item-quantity');
    amount.type='number';amount.min='1';amount.max=String(entry.qty);amount.step='1';amount.value='1';amount.inputMode='numeric';
    amount.setAttribute('aria-label','Drop quantity');
    button(line,'classic-item-action','DROP',()=>transact({type:'drop',id,quantity:Number(amount.value)}),details.equipped);
   }
  }
  if(details.action)button(ex,'classic-item-action',
   details.equipped?'UNEQUIP':'EQUIP',
   ()=>transact(details.action),!details.allowed);
  if(details.action&&!details.allowed)element(ex,'p','classic-item-warning','You must own this item and meet its requirements.');
 }
 function renderInventory(){
  const data=save(),s=view();
  // The bag occupies the panel immediately beneath Oakrest's main game tabs.
  // Inventory utilities remain available after the slots without a second
  // navigation row, explanatory banner or always-visible toolbar.
  if(combineSource){
   const item=getItem('material.'+combineSource);
   const prompt=element(content,'div','classic-combine-prompt',
    'Using '+(item?.title||combineSource)+' with… Tap a second material in your bag.');
   button(prompt,'classic-item-action','CANCEL',()=>{combineSource=null;render();});
  }
  const capacity=element(content,'span','classic-bag-capacity',s.capacity.bag+' / '+s.capacity.limit+' slots');
  capacity.title='Equipped gear remains owned in your backpack. Existing over-capacity saves are preserved.';
  grid(content,inventoryEntries(data),'bag','',BAG_MIN_SLOTS);
  // Item actions and recipes are available without scrolling the bag.

 }
 function renderEquip(){
  const s=view(),panel=element(content,'section','classic-gear-panel');
  panel.setAttribute('aria-label','Equipped gear and combat statistics');
  // Style selector, nine equipment slots and all bonuses stay visible together.
  // Long inventories never push the paper doll or the statistics off-screen.
  const styles=element(panel,'div','classic-item-style-list classic-gear-styles');
  for(const key of STYLE_ORDER)button(styles,key===style()?'selected':'',key.toUpperCase(),()=>{
   // Previewing other styles uses the existing authoritative style switch.
   changed(key);render();
  });
  const main=element(panel,'div','classic-gear-main');
  const doll=element(main,'div','classic-paperdoll classic-gear-doll');
  doll.setAttribute('aria-label','Nine equipment slots');
  for(const [i,slot] of s.equipment.entries()){
   const tile=button(doll,'classic-paper-slot classic-paper-'+slot.id,
    slot.label,()=>{if(slot.itemId)showDetails(slot.itemId);else notify('Choose an owned item for '+slot.label+'.');});
   tile.dataset.scope='equipment';tile.dataset.slotIndex=String(i);tile.dataset.equipmentSlot=slot.id;
   tile.title=slot.label+(slot.itemId?' · '+(getItem(slot.itemId)?.title||'Equipped'):' · Empty');
   if(slot.itemId)icon(tile,slot.itemId);
   else element(tile,'span','classic-plus','+');
  }
  const summary=element(main,'section','classic-equipment-bonuses classic-gear-stats');
  summary.setAttribute('aria-label','Current equipment bonuses');
  element(summary,'strong','classic-gear-stat-title',style().toUpperCase()+' · GEAR STATS');
  for(const [label,value] of [
   ['Maximum hit',s.bonuses.maxHit],
   ['Attack interval',s.bonuses.interval.toFixed(1)+' s'],
   ['Range',s.bonuses.reach+' m'],
   ['Physical armour',Math.round(s.bonuses.physical*100)+'%'],
   ['Magic armour',Math.round(s.bonuses.magical*100)+'%'],
   ['Equipment power','+'+Math.round((s.bonuses.power-1)*100)+'%'],
   ['Equipment guard',Math.round(s.bonuses.guard*100)+'%']
  ]){
   const row=element(summary,'div','classic-item-fact');
   element(row,'span',null,label);element(row,'strong',null,value);
  }
  if(!s.equipment.find(e=>e.id==='weapon')?.itemId)
   element(summary,'p','classic-gear-empty-warning','No weapon equipped');
  const owned=element(panel,'section','classic-gear-owned');
  const ownedTitle=element(owned,'strong','classic-gear-owned-title','AVAILABLE GEAR');
  const data=save();
  const items=inventoryEntries(data).filter(e=>e.kind==='armour'||
   (e.kind==='weapon'||e.kind==='slot')&&(e.style===style()||e.style==='all'));
  // A style-neutral amulet can already be equipped in Melee, but must remain
  // assignable in Magic/Ranged. Offer its shared reference here without
  // putting a second physical copy back into the backpack.
  for(const id of data.inventory?.slotted||[]){
   if(SLOT_ITEMS[id]?.style!=='all')continue;
   const canonical='slot.'+id;
   if(!items.some(entry=>entry.canonical===canonical))
    items.push({canonical,kind:'slot',id,style:'all',qty:1,sharedEquipped:true});
  }
  ownedTitle.textContent+=' · '+items.length;
  const list=element(owned,'div','classic-equip-choices classic-gear-choices');
  list.setAttribute('aria-label','Owned equipment available to equip');
  for(const e of items){
   const name=getItem(e.canonical)?.title||e.id;
   const tile=button(list,'classic-equip-choice classic-gear-choice',name,()=>showDetails(e.canonical));
   const bagIndex=s.bag.findIndex(x=>x?.canonical===e.canonical);
   // Only genuine backpack items are draggable; a shared equipped item is
   // an assignment shortcut, not a second bag instance.
   if(bagIndex>=0){tile.dataset.scope='bag';tile.dataset.slotIndex=String(bagIndex);}
   tile.dataset.canonical=e.canonical;
   tile.title=e.sharedEquipped?'Assign shared '+name+' to '+style().toUpperCase():'Inspect or equip '+name;
   icon(tile,e.canonical);
  }
  if(!items.length)element(list,'span','classic-gear-no-items','Find or buy gear to fill your equipment slots.');
  if(detailId){
   // Inspect/equip is a bounded overlay. The overview behind it never shifts,
   // and closing the overlay restores all nine slots without a scroll jump.
   const overlay=element(content,'section','classic-gear-detail');
   overlay.setAttribute('role','dialog');overlay.setAttribute('aria-label','Equipment details');
   const toolbar=element(overlay,'div','classic-gear-detail-toolbar');
   element(toolbar,'strong',null,'EQUIPMENT DETAILS');
   button(toolbar,'classic-gear-detail-close','BACK TO GEAR',()=>{detailId=null;render();});
   examine(overlay,detailId);
  }
 }
 function renderBank(){
  const data=save(),s=view();
  element(content,'p','classic-muted','Banking is available beside Mara in Oakrest Bank. No stored item is duplicated.');
  const controls=element(content,'div','classic-item-actions');
  for(const count of [1,10,'all'])button(controls,'classic-item-action','COINS '+(count==='all'?'ALL':count),()=>{
   transact({type:'bank',kind:'coins',direction:'deposit',quantity:count});
  });
  button(controls,'classic-item-action','WITHDRAW ALL COINS',()=>transact({
   type:'bank',kind:'coins',direction:'withdraw',quantity:'all'
  }));
  element(content,'p','classic-muted','Bag: '+s.coins+' coins · Vault: '+s.bankCoins+' coins');
  const columns=element(content,'div','classic-bank-columns');
  for(const scope of ['bag','vault']){
   const col=element(columns,'div','classic-bank-column');
   const entries=bankGridEntries(data,scope);
   grid(col,entries,scope,scope==='bag'?'BACKPACK':'BANK VAULT',scope==='bag'?BAG_MIN_SLOTS:VAULT_MIN_SLOTS);
  }
  if(selectedBank){
   const item=getItem(selectedBank.canonical);
   const box=element(content,'div','classic-selected-item');
   element(box,'strong',null,item?.title||selectedBank.id);
   const direction=selectedBank.scope==='bag'?'deposit':'withdraw';
   const kind=selectedBank.kind;
   for(const amount of (kind==='material'||kind==='coins'?[1,10,'all']:['all'])){
    button(box,'classic-item-action',direction.toUpperCase()+' '+(amount==='all'?'ALL':amount),()=>transact({
     type:'bank',direction,kind,id:selectedBank.id,style:selectedBank.style,quantity:amount
    }));
   }
   const custom=element(box,'div','classic-item-actions'),quantity=element(custom,'input','classic-item-quantity');
   quantity.type='number';quantity.min='1';quantity.step='1';quantity.value='1';quantity.inputMode='numeric';quantity.setAttribute('aria-label','Bank transfer quantity');
   button(custom,'classic-item-action',direction.toUpperCase()+' QUANTITY',()=>transact({type:'bank',direction,kind,id:selectedBank.id,style:selectedBank.style,quantity:Number(quantity.value)}));
   if(detailId)examine(content,detailId);
  }
 }
 function renderShop(){
  if(combat.adventureState?.())button(content,'classic-item-action','SELL 5 LOGS · 8 COINS',()=>{
   const result=combat.adventureAction('timber',{target:findClassicInteractable('service:store')},player());notify(result.reason);if(result.ok)changed();render();
  });
  const rows=view().shop;
  element(content,'p','classic-muted','Darrin sells the existing starter equipment at the exact Oakrest prices.');
  const gridShop=element(content,'div','classic-shop-grid');
  for(const stock of rows){
   const tile=button(gridShop,selectedShop===stock.id?'classic-shop-choice selected':'classic-shop-choice',
    '',()=>{selectedShop=stock.id;render();});
   icon(tile,stock.icon);
   element(tile,'span',null,stock.label);
   element(tile,'small',null,stock.owned?'OWNED':stock.banked?'BANKED':stock.cost+' coins');
  }
  const selected=rows.find(x=>x.id===selectedShop);
  if(selected){
   const actions=element(content,'div','classic-selected-item');
   element(actions,'strong',null,selected.label);
   element(actions,'p',null,selected.kind==='bundle'?
    selected.missing+' missing pieces · price adjusts to the actual pieces you need.':
    'One starter item. Buying an already owned or banked item is blocked.');
   button(actions,'classic-item-action',selected.owned?'OWNED':'BUY · '+selected.cost+' COINS',
    ()=>transact({type:'buy',id:selected.id}),selected.owned||selected.banked);
  }
 }
 function renderAbilities(){
  const data=save(),current=style(),weaponId=data.gear[current],weapon=LOADOUTS[current]?.[weaponId],
   state=combat.getState(),level=levelFromXp(data.xp[current]||0).level;
  const bookKey=current+':'+weaponId;
  if(lastCombatBookKey!==bookKey){abilitySlot=0;inspectedAbilityId=null;lastCombatBookKey=bookKey;}
  const book=element(content,'section','oakrest-combat-book');
  book.dataset.combatStyle=current;
  book.setAttribute('aria-label',classicBookStyleName(current)+' ability book');
  const head=element(book,'div','oakrest-combat-book-heading');
  element(head,'strong',null,classicBookStyleName(current));
  element(head,'span','oakrest-combat-book-level','Level '+level);
  element(book,'p','oakrest-combat-book-weapon',weapon?.title||'Equip a weapon');
  if(!weapon){
   element(book,'p','classic-muted','Equip a '+current+' weapon to prepare abilities.');
   return;
  }
  const list=classicAbilityCatalogue(data,current);
  const slots=data.slots?.[current]?.[weapon.family]||[];
  element(book,'p','oakrest-combat-book-hint','Choose a slot, then tap an ability to equip it.');
  const bar=element(book,'div','oakrest-combat-book-slots');
  bar.setAttribute('role','group');bar.setAttribute('aria-label','Four equipped ability slots');
  for(let i=0;i<4;i++){
   const skill=list.find(s=>s.id===slots[i]),status=state.abilities[i];
   const selected=i===abilitySlot;
   const tile=button(bar,'oakrest-combat-slot'+(selected?' selected':''),'',()=>{
    abilitySlot=i;
    inspectedAbilityId=slots[i]||null;
    render();
   });
   tile.dataset.slot=String(i+1);
   tile.setAttribute('aria-pressed',String(selected));
   tile.setAttribute('aria-label','Ability slot '+(i+1)+': '+(skill?.name||'Empty')+(selected?', selected':''));
   element(tile,'span','oakrest-combat-slot-number',String(i+1));
   element(tile,'span','oakrest-combat-slot-name',skill?.name||'Empty');
   const runtime=element(tile,'span','classic-ability-status',status?(status.available?'Ready':status.unavailableReason):'Empty or locked');
   runtime.dataset.slotIndex=String(i);
  }
  const gridHead=element(book,'div','oakrest-combat-book-grid-head');
  element(gridHead,'strong',null,current==='magic'?'SPELLS':current==='ranged'?'SHOTS & TECHNIQUES':'COMBAT TECHNIQUES');
  element(gridHead,'span',null,list.filter(s=>s.unlocked).length+' / '+list.length+' unlocked');
  const grid=element(book,'div','oakrest-combat-book-grid');
  grid.setAttribute('role','group');grid.setAttribute('aria-label','Available '+current+' abilities');
  if(!list.length)element(book,'p','classic-muted','There are no abilities for the equipped weapon.');
  for(const skill of list){
   const assigned=slots.indexOf(skill.id),inspected=inspectedAbilityId===skill.id;
   const tile=button(grid,'oakrest-spell-tile'+(skill.unlocked?'':' locked')+(inspected?' inspected':'')+(assigned>=0?' assigned':''),'',()=>{
    inspectedAbilityId=skill.id;
    if(skill.unlocked)transact({type:'ability',style:current,weapon:weaponId,index:abilitySlot,id:skill.id});
    else render();
   });
   tile.dataset.abilityId=skill.id;
   tile.dataset.abilityName=skill.name;
   // Locked tiles are still interactive for inspecting their unlock requirements.
   tile.dataset.locked=String(!skill.unlocked);
   tile.setAttribute('aria-label',skill.name+', level '+skill.requiredLevel+(skill.unlocked?', equip to slot '+(abilitySlot+1):', locked'));
   tile.title=skill.name+' — '+skill.note;
   const sigil=element(tile,'span','oakrest-spell-sigil');
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
   svg.setAttribute('viewBox','0 0 32 32');
   svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');
   svg.setAttribute('stroke-width','1.8');svg.setAttribute('aria-hidden','true');
   const use=document.createElementNS('http://www.w3.org/2000/svg','use');
   use.setAttribute('href','./src/oakrest-ui-icons.svg#'+classicBookIcon(skill.kind));
   svg.append(use);sigil.append(svg);
   element(tile,'span','oakrest-spell-name',skill.name);
   if(!skill.unlocked)element(tile,'span','oakrest-spell-level','Lv '+skill.requiredLevel);
   else if(assigned>=0)element(tile,'span','oakrest-spell-equipped',''+(assigned+1));
  }
  const shown=list.find(s=>s.id===inspectedAbilityId)||list.find(s=>s.id===slots[abilitySlot])||list[0];
  if(shown){
   const info=element(book,'section','oakrest-spell-info');
   info.setAttribute('aria-label','Selected ability details');
   const infoHead=element(info,'div','oakrest-spell-info-head');
   element(infoHead,'strong',null,shown.name);
   element(infoHead,'span',null,shown.unlocked?'UNLOCKED':'LEVEL '+shown.requiredLevel+' REQUIRED');
   element(info,'p',null,abilityDetails(current,weapon,shown,1,true).description);
   element(info,'p','oakrest-spell-info-meta','Cooldown '+shown.cooldown+'s · Unlocks at '+classicBookStyleName(current)+' level '+shown.requiredLevel);
   const assigned=slots.indexOf(shown.id);
   if(assigned>=0)element(info,'small','oakrest-spell-info-equipped','Equipped in slot '+(assigned+1));
   else if(shown.unlocked)element(info,'small','oakrest-spell-info-available','Tap the ability above to assign it to slot '+(abilitySlot+1));
   else element(info,'small','oakrest-spell-info-locked','Train '+classicBookStyleName(current)+' to unlock this ability.');
  }
  const foot=element(book,'div','oakrest-combat-book-footer');
  button(foot,'oakrest-combat-clear','CLEAR SLOT '+(abilitySlot+1),
   ()=>transact({type:'ability',style:current,weapon:weaponId,index:abilitySlot,id:null}),!slots[abilitySlot]);
  element(foot,'span',null,'Saved per weapon family · changes update your combat bar');
 }
 function render(){
  if(host.hidden)return;
  for(const tab of tabs){
   tab.classList.toggle('active',tab.dataset.itemTab===mode);
   tab.setAttribute('aria-selected',String(tab.dataset.itemTab===mode));
  }
  title.textContent=mode==='abilities'?classicBookStyleName(style()):{inventory:'Backpack',equipment:'Equipment',bank:'Oakrest Bank',shop:'General Store'}[mode];
  subtitle.textContent=mode==='abilities'?'OAKREST · STYLE COMBAT BOOK':'OAKREST · CHARACTER INVENTORY';
  const scroll=content.scrollTop;
  content.dataset.view=mode;
  content.replaceChildren();
  if(mode==='inventory')renderInventory();
  else if(mode==='equipment')renderEquip();
  else if(mode==='bank')renderBank();
  else if(mode==='shop')renderShop();
  else renderAbilities();
  content.scrollTop=scroll;
 }
 function open(next='inventory'){
  popups.closeItem();popups.closeCraft({cancel:true});
  if(!['inventory','equipment','bank','shop','abilities'].includes(next))return;
  mode=next;detailId=null;selectedBank=null;selectedShop=null;combineSource=null;
  host.hidden=false;content.scrollTop=0;render();onOpen(next);
 }
 function hide(){popups.closeCraft({cancel:true});popups.close();host.hidden=true;detailId=null;combineSource=null;onClose();}
 for(const tab of tabs)tab.addEventListener('click',()=>open(tab.dataset.itemTab));
 close.addEventListener('click',hide);
 return {open,hide,render,isOpen:()=>!host.hidden,
  drop:payload=>{
   if(payload.toScope==='equipment'){
    if(payload.fromScope!=='bag'){notify('Withdraw this item before equipping it.');return false;}
    const details=classicItemDetails(save(),payload.canonical,style()),item=details?.item;
    const slot=item?.kind==='weapon'?'weapon':item?.kind==='armour'?'chest':details?.action?.slot;
    if(!details?.action||slot!==payload.slot||details.action.style!==style()){notify('That item does not fit this equipment slot.');return false;}
    return transact({...details.action,id:item.legacy.itemId});
   }
   return transact({type:'drag',...payload});
  },
  tick:()=>{popups.tick();if(!host.hidden&&mode==='inventory'){
   const state=combat.getState();
   for(const node of content.querySelectorAll('[data-consumable]')){
    const kind=node.dataset.consumable,remaining=Math.max(0,(state.consumableCooldowns?.[kind]||0)-state.time);
    node.disabled=remaining>0||state.hp<=0||state.hp>=state.maxHp||Number(node.dataset.quantity)<=0;
    node.textContent=remaining>0?'READY IN '+remaining.toFixed(1)+'s':kind==='eat'?'EAT':'DRINK';
   }
  }else if(!host.hidden&&mode==='abilities'){
   const state=combat.getState(),nodes=content.querySelectorAll('.classic-ability-status');
   nodes.forEach((node,i)=>{const a=state.abilities[i],remaining=Math.max(0,(a?.cooldownEnd||0)-state.time);node.textContent=!a?'Empty or locked':remaining>0?'Ready in '+remaining.toFixed(1)+'s':a.available?'Ready':a.unavailableReason;});
  }}
 };
}
