import {LOADOUTS,ARMOUR,STYLE_ORDER,levelFromXp} from './rules.js';
import {woodcuttingLevel,WOODCUTTING_LEVEL_XP} from './woodcutting.js';
import {SLOT_ITEMS,STARTER_SETS} from './equipment-slots.js';
import {getItem,itemIconUrl} from './items.js';
import {SHOP_STOCK,missingStarterSetPieces,starterSetPrice,TOWN_MATERIALS,STARTER_GROVE_XP_CAP,townInteraction,townBank,bankCoins,bankMaterials,bankEquipment,buyStarterStock,teachWoodcutting,claimTrainingAxe} from './town-services.js';
import {positionedEntries,reorderSlot,positionTransfer,BAG_MIN_SLOTS,VAULT_MIN_SLOTS,BAG_MAX_SLOTS,VAULT_MAX_SLOTS} from './item-slot-layout.js';
import {bindSlotDrag} from './slot-drag.js';

/**
 * Classic RPG interfaces: item-icon grids, a selected-item inspection panel
 * and explicit transaction controls. The existing save, shop and bank logic
 * remain authoritative; no separate inventory or economy is introduced.
 */
const $=id=>document.getElementById(id);
const node=(tag,value,parent,cls)=>{
 const e=document.createElement(tag);
 if(value!==null&&value!==undefined)e.textContent=value;
 if(cls)e.className=cls;
 if(parent)parent.append(e);
 return e;
};
const button=(parent,label,fn,cls='',disabled=false)=>{
 const b=node('button',label,parent,cls);b.type='button';b.disabled=disabled;
 if(fn)b.addEventListener('click',fn);
 return b;
};
const icon=(parent,id)=>{
 const src=itemIconUrl(id);
 if(src){const img=node('img',null,parent,'oak-town-item-icon');img.src=src;img.alt='';img.width=48;img.height=48;img.loading='lazy';img.decoding='async';}
};
const normal=id=>id.replaceAll('-',' ').replace(/\b\w/g,c=>c.toUpperCase());
const canonical=(kind,id,style)=>kind==='weapon'?'weapon.'+style+'.'+id:
 kind==='armour'?'armour.'+id:kind==='slot'?'slot.'+id:kind==='material'?'material.'+id:'currency.coins';
const quantity=n=>n>=10000000?Math.floor(n/1000000)+'M':n>=100000?Math.floor(n/1000)+'K':String(n);
const groupFor=e=>e.kind==='material'||e.kind==='coins'?'supplies':'gear';

/** Real item contents of either bank or backpack; no manufactured ownership. */
export function bankGridEntries(data,scope){
 const bag=scope==='vault'?townBank(data):data.inventory;
 const entries=[];
 const push=(kind,id,qty,style)=>{
  const key=canonical(kind,id,style),item=getItem(key);
  if(!item||qty<=0)return;
  entries.push({scope,kind,id,style,canonical:key,title:item.title,qty});
 };
 if(scope==='vault'){push('coins','coins',townBank(data).coins);}
 else push('coins','coins',data.coins);
 for(const style of STYLE_ORDER)for(const id of bag.weapons?.[style]||[])if(LOADOUTS[style]?.[id])push('weapon',id,1,style);
 for(const id of bag.armour||[])if(ARMOUR[id])push('armour',id,1);
 for(const id of bag.slotted||[])if(SLOT_ITEMS[id])push('slot',id,1,SLOT_ITEMS[id].style);
 for(const id of TOWN_MATERIALS)if(bag.materials?.[id]>0)push('material',id,bag.materials[id]);
 return entries;
}
export function shopGridEntries(data){
 const bank=townBank(data);
 return SHOP_STOCK.map(stock=>{
  if(stock.kind==='bundle'){
   const missing=missingStarterSetPieces(data,stock.style);
   return {...stock,icon:'weapon.'+stock.style+'.'+STARTER_SETS[stock.style].weapon,
    missing:missing.length,cost:starterSetPrice(data,stock.style),
    owned:missing.length===0,banked:false};
  }
  const icon=canonical(stock.kind,stock.itemId,stock.style);
  const owned=stock.kind==='weapon'?data.inventory.weapons[stock.style].includes(stock.itemId):
   data.inventory.armour.includes(stock.itemId);
  const banked=stock.kind==='weapon'?bank.weapons[stock.style].includes(stock.itemId):
   bank.armour.includes(stock.itemId);
  return {...stock,icon,cost:stock.price,owned,banked,missing:0};
 });
}

export function setupTownUI({getData,getTime,getVillager=()=>null,getTree=()=>null,onCutTree=()=>false,onChange,onEquipmentChange,notify,onOpen}){
 const panel=$('town-panel'),prompt=$('town-interact'),body=$('town-content');
 let service=null,lastPosition=null,tab='all',search='',selected=null;
 const entryKey=e=>[e.scope,e.kind,e.style||'',e.id].join('/');
 const stockKey=s=>'stock/'+s.id;
 function close(){panel.hidden=true;service=null;selected=null;}
 $('town-close').addEventListener('click',close);
 function changed(message,equipment=false){
  onChange();
  if(equipment)onEquipmentChange();
  if(message)notify(message);
  render();
  // Transactions rebuild the slot grids. Never leave them hidden beneath the
  // modal header after the panel's previous scroll position is restored.
  body.scrollTop=0;
 }
 const visible=(entry)=> (tab==='all'||groupFor(entry)===tab)&&
  (!search||entry.title.toLowerCase().includes(search));
 function filterTiles(){
  for(const tile of body.querySelectorAll('.town-item-tile')){
   tile.classList.toggle('town-tile-filtered',!((tab==='all'||tile.dataset.group===tab)&&
    (!search||tile.dataset.search.includes(search))));
  }
  for(const grid of body.querySelectorAll('.town-item-grid')){
   const empty=grid.nextElementSibling;
   if(empty?.classList.contains('town-grid-empty'))empty.hidden=[...grid.querySelectorAll('.town-item-tile')].some(c=>!c.classList.contains('town-tile-filtered'));
  }
 }
 function tabs(host,choices){
  const nav=node('nav',null,host,'town-item-tabs');nav.setAttribute('aria-label','Item categories');
  for(const [key,label] of choices){
   const b=button(nav,label,()=>{tab=key;search='';selected=null;render();},'town-tab'+(tab===key?' is-active':''));
   b.setAttribute('aria-pressed',String(tab===key));
  }
 }
 function searchBox(host){
  const label=node('label','Find an item',host,'town-search-label');
  const input=node('input',null,label,'town-search');
  input.type='search';input.placeholder='Search items';input.value=search;
  input.setAttribute('aria-label','Find a bank item');
  input.addEventListener('input',()=>{search=input.value.trim().toLowerCase();filterTiles();});
 }
 function tile(grid,{name,canonicalId,group='gear',qty=1,key,scope,slotIndex,onChoose,selectedNow,iconIds=[]}){
  const b=button(grid,null,onChoose,'town-item-tile'+(selectedNow?' is-selected':''));
  b.dataset.search=name.toLowerCase();b.dataset.group=group;
  if(scope){b.classList.add('oak-drag-slot');b.dataset.scope=scope;b.dataset.canonical=canonicalId;b.dataset.slotIndex=String(slotIndex);}
  b.title=name+(qty>1?' · '+qty:'');
  b.setAttribute('aria-label','Select '+name+(scope?' in '+(scope==='vault'?'bank':'backpack'):'')+(qty>1?', quantity '+qty:''));
  b.setAttribute('aria-pressed',String(!!selectedNow));
  const art=node('span',null,b,'town-tile-art');
  icon(art,canonicalId);
  for(const id of iconIds)icon(art,id);
  if(qty>1)node('span',quantity(qty),b,'town-tile-qty');
  return b;
 }
 function grid(host,entries,scope=''){
  const g=node('div',null,host,'town-item-grid'+(scope==='bag'?' town-bag-grid':''));
  g.dataset.columns=scope==='bag'?'4':scope==='vault'?'8':'6';
  g.setAttribute('role','group');g.setAttribute('aria-label',scope==='vault'?'Stored bank items':scope==='bag'?'Backpack items':'Shop stock');
  const data=getData(),isBank=scope==='vault'||scope==='bag';
  const placed=isBank?positionedEntries(entries,data[scope==='vault'?'bankSlots':'inventorySlots'],
    scope==='vault'?VAULT_MIN_SLOTS:BAG_MIN_SLOTS,
    scope==='vault'?VAULT_MAX_SLOTS:BAG_MAX_SLOTS):entries;
  for(let i=0;i<placed.length;i++){
   const e=placed[i];
   if(!e){
    const empty=node('button',null,g,'town-item-empty oak-drag-slot');
    empty.type='button';empty.dataset.scope=scope;empty.dataset.slotIndex=String(i);
    empty.setAttribute('aria-label','Empty '+(scope==='vault'?'bank':'backpack')+' slot '+(i+1));
    empty.tabIndex=-1;continue;
   }
   if(isBank){
    tile(g,{name:e.title,canonicalId:e.canonical,group:groupFor(e),qty:e.qty,scope,
      slotIndex:i,key:entryKey(e),selectedNow:selected===entryKey(e),onChoose:()=>{selected=entryKey(e);render();}});
   }else{
    tile(g,{name:e.label,canonicalId:e.icon,group:e.kind==='bundle'?'sets':'gear',
      iconIds:e.kind==='bundle'?['armour.'+STARTER_SETS[e.style].chest]:[],
      selectedNow:selected===stockKey(e),onChoose:()=>{selected=stockKey(e);render();}});
   }
  }
  if(!isBank)for(let i=entries.length;i<24;i++)node('span',null,g,'town-item-empty').setAttribute('aria-hidden','true');
  const empty=node('p','No items match this view.',host,'town-grid-empty');empty.hidden=true;
  return g;
 }
 function inspectHeader(host,item,title){
  const head=node('div',null,host,'town-selected-head');
  const iconBox=node('span',null,head,'town-selected-icon');icon(iconBox,item);
  node('strong',title,head);
 }
 function details(host,name,description,facts=[]){
  node('h3','SELECTED ITEM',host);
  if(description)node('p',description,host,'town-item-description');
  for(const [label,value] of facts){
   const line=node('div',null,host,'town-item-fact');
   node('span',label,line);node('strong',value,line);
  }
 }
 function bankTransfer(entry,amount,targetIndex=null){
  const dir=entry.scope==='vault'?'withdraw':'deposit',data=getData();
  const sourceEntries=targetIndex!==null?bankGridEntries(data,entry.scope):null;
  const destScope=entry.scope==='vault'?'bag':'vault';
  const destEntries=targetIndex!==null?bankGridEntries(data,destScope):null;
  let moved=0,equipment=false;
  if(entry.kind==='coins')moved=bankCoins(data,dir,amount);
  else if(entry.kind==='material')moved=bankMaterials(data,entry.id,dir,amount);
  else {equipment=true;moved=bankEquipment(data,entry.kind,entry.id,dir,entry.style)?1:0;}
  if(!moved){notify(equipment?'Unequip this item before storing it, or clear space in your backpack.':'Nothing to transfer.');return;}
  if(targetIndex!==null){
   // Ownership is changed only by the existing validated bank functions.
   const remains=bankGridEntries(data,entry.scope).some(e=>e.canonical===entry.canonical);
   if(!remains)positionTransfer(data,entry.scope,destScope,entry.canonical,targetIndex,sourceEntries,destEntries);
  }
  selected=entryKey({...entry,scope:dir==='deposit'?'vault':'bag'});
  changed((dir==='deposit'?'Stored ':'Withdrew ')+(moved>1?moved+' ':'')+entry.title,equipment);
 }
 function bankDetail(host,entry){
  const item=getItem(entry.canonical);
  inspectHeader(host,entry.canonical,entry.title);
  const description=item?.description||(entry.kind==='coins'?'Coins for adventuring and shopping.':
   entry.kind==='material'?'A useful resource for crafting and trading.':
   'Equipment for your adventure.');
  details(host,entry.title,description,[
   ['Location',entry.scope==='vault'?'Bank':'Backpack'],
   ['Quantity',String(entry.qty)],
   ...(entry.style?[['Style',normal(entry.style)]]:[])
  ]);
  const action=entry.scope==='vault'?'TAKE':'STORE';
  const actions=node('div',null,host,'town-transfer-actions');
  let equipped=false;
  const data=getData();
  if(entry.scope==='bag'){
   if(entry.kind==='weapon')equipped=data.gear?.[entry.style]===entry.id;
   else if(entry.kind==='armour')equipped=Object.values(data.armour||{}).includes(entry.id);
   else if(entry.kind==='slot')equipped=Object.values(data.equipment||{}).some(s=>Object.values(s||{}).includes(entry.id));
  }
  if(entry.kind==='coins'||entry.kind==='material'){
   for(const amount of [1,5,10,Infinity]){
    button(actions,action+' '+(amount===Infinity?'ALL':amount),()=>bankTransfer(entry,amount),'town-transfer-btn',equipped);
   }
  }else button(actions,action,()=>bankTransfer(entry,1),'town-transfer-btn',equipped);
  if(equipped)node('p','Unequip this item before storing it.',host,'town-notice');
 }
 function bankView(data){
  const bank=townBank(data),frame=node('div',null,body,'town-items-view town-bank-view');
  const top=node('div',null,frame,'town-item-toolbar');
  node('span','VAULT '+bankGridEntries(data,'vault').length+' slots · '+quantity(bank.coins)+' coins',top);
  node('span','ON YOU '+quantity(data.coins)+' coins',top);
  node('p','Drag items from your backpack into the vault to deposit, or from the vault to withdraw. Drag within either grid to rearrange. Tap for quantity controls.',frame,'town-bank-drag-hint');
  tabs(frame,[['all','ALL'],['gear','EQUIPMENT'],['supplies','SUPPLIES']]);
  searchBox(frame);
  const content=node('div',null,frame,'town-bank-layout');
  const vault=node('section',null,content,'town-vault');
  node('h3','BANK VAULT',vault);
  const stored=bankGridEntries(data,'vault');
  grid(vault,stored,'vault');
  const bag=node('section',null,content,'town-backpack');
  node('h3','YOUR BACKPACK',bag);
  const carried=bankGridEntries(data,'bag');
  grid(bag,carried,'bag');
  const inspect=node('aside',null,frame,'town-item-detail');
  const entry=[...stored,...carried].find(e=>entryKey(e)===selected);
  if(entry)bankDetail(inspect,entry);
  else {node('h3','SELECT AN ITEM',inspect);node('p','Tap an item in your bank to withdraw it, or in your backpack to store it.',inspect);}
  filterTiles();
 }
 function shopView(data){
  const frame=node('div',null,body,'town-items-view town-shop-view');
  const top=node('div',null,frame,'town-item-toolbar');
  node('span','DARRIN’S GENERAL STORE',top);
  node('span',quantity(data.coins)+' COINS',top);
  tabs(frame,[['all','ALL'],['sets','STARTER SETS'],['gear','EQUIPMENT']]);
  const content=node('div',null,frame,'town-shop-layout');
  const shelf=node('section',null,content,'town-shop-shelf');
  node('h3','ITEMS FOR SALE',shelf);
  const stock=shopGridEntries(data);grid(shelf,stock);
  const inspect=node('aside',null,content,'town-item-detail town-shop-detail');
  const item=stock.find(e=>stockKey(e)===selected);
  if(item){
   inspectHeader(inspect,item.icon,item.label);
   const detail=getItem(item.icon);
   const missing=item.kind==='bundle'?item.missing:0;
   details(inspect,item.label,item.kind==='bundle'?'A beginner '+normal(item.style)+' outfit. Only the missing pieces are charged.':detail?.description||'An essential for your journey.',[
    ['Price',item.cost+' coins'],
    ['Style',item.style?normal(item.style):'General'],
    ...(item.kind==='bundle'?[['Still needed',missing+' pieces']]:[]),
    ['Status',item.owned?'Owned':item.banked?'In bank':data.coins<item.cost?'Not enough coins':'Available']
   ]);
   const actionLabel=item.kind==='bundle'?'BUY SET':'BUY';
   button(inspect,item.owned?'OWNED':item.banked?'BANKED':actionLabel,()=>{
    const result=buyStarterStock(data,item.id);
    if(result.ok){changed('Purchased '+item.label,true);}
    else notify(result.reason);
   },'town-buy-button',item.owned||item.banked||data.coins<item.cost);
  }else {node('h3','EXAMINE AN ITEM',inspect);node('p','Tap an item to see what it is, its price and whether you can buy it.',inspect);}
  filterTiles();
 }
 function tradeHouseView(){
  node('h3','THE OAKREST EXCHANGE',body);
  node('p','Welcome to the Trade House. The merchant galleries and auction registry are being prepared for future player trading.',body);
  node('p','The auction house is not open yet. No listings, bids, purchases or item transfers can be made here.',body,'town-notice');
  node('p','For now, visit the General Store for starter equipment or the Bank to keep your belongings safe.',body);
 }
 function foresterView(data){
  const info=woodcuttingLevel(data.professions?.woodcuttingXp||0);
  node('p','Alden teaches Woodcutting. Find an axe, select a tree and your character will keep chopping until it falls or you move.',body);
  node('h3','Woodcutting — Level '+info.level,body);
  node('p',info.maxed?'Master Woodcutter · Level 99':info.remaining.toLocaleString()+' XP to the next level · '+Math.floor(info.progress*100)+'% progress',body);
  const learned=data.professions?.woodcuttingLearned===true;
  button(body,learned?'LESSON COMPLETE':'LEARN WOODCUTTING + BRONZE AXE',()=>{
   if(teachWoodcutting(data))changed('Woodcutting learned · Bronze Axe received');
  },'town-lesson-button',learned);
  if(learned)button(body,'CLAIM REPLACEMENT BRONZE AXE',()=>{
   if(claimTrainingAxe(data))changed('Received Bronze Axe');else notify('You already have an axe in your bag or bank');
  },'town-lesson-button');
  node('p','Seven tree species: Softwood (1), Pine (10), Oak (20), Willow (35), Ironbark (50), Moonwood (70), Elderwood (85). Upgrade axes to cut familiar trees faster.',body,'town-notice');
 }
 function render(){
  if(!service||panel.hidden)return;
  const data=getData();body.replaceChildren();$('town-title').textContent=service.label;
  if(service.id==='bank')bankView(data);
  else if(service.id==='store')shopView(data);
  else if(service.id==='trade-house')tradeHouseView();
  else foresterView(data);
 }
 function interact({x,z,allowed,time}){
  if(!allowed||!panel.hidden)return false;
  const candidate=townInteraction(x,z)||getTree(x,z)||getVillager(x,z);if(!candidate)return false;
  if(candidate.type==='citizen'||candidate.type==='notice'){notify(candidate.label+' · '+candidate.line);return true;}
  if(candidate.type==='grove'){
   onCutTree(candidate.id);
   return true;
  }
  service=candidate;tab='all';search='';selected=null;panel.hidden=false;onOpen();render();return true;
 }
 function update({x,z,allowed}){
  lastPosition={x,z};
  const target=allowed&&panel.hidden?(townInteraction(x,z)||getTree(x,z)||getVillager(x,z)):null;
  prompt.hidden=!target;
  if(target){
   $('town-interact-description').textContent=target.type==='citizen'?target.label+' · '+target.role:
    target.type==='notice'?target.label+' · Read town news':
    target.type==='grove'?target.label+' · Lv '+(target.level||1)+' · Cut with axe':
    target.label+' · Speak to '+target.attendant;
   $('town-interact-button').textContent=target.type==='grove'?'CUT WOOD':target.type==='notice'?'READ · T':target.type==='citizen'?'TALK · T':'SPEAK · T';
  }
 }
 // One delegated handler survives bank panel rerenders on both iPad and desktop.
 bindSlotDrag(body,({fromScope,toScope,fromIndex,toIndex,canonical})=>{
  if(service?.id!=='bank'||panel.hidden)return;
  const data=getData();
  const list=bankGridEntries(data,fromScope);
  const cells=positionedEntries(list,data[fromScope==='vault'?'bankSlots':'inventorySlots'],
    fromScope==='vault'?VAULT_MIN_SLOTS:BAG_MIN_SLOTS,
    fromScope==='vault'?VAULT_MAX_SLOTS:BAG_MAX_SLOTS);
  const entry=cells[fromIndex];
  if(!entry||entry.canonical!==canonical)return;
  if(fromScope===toScope){
   if(reorderSlot(data,fromScope,list,fromIndex,toIndex)){onChange();render();}
  }else if(['bag','vault'].includes(fromScope)&&['bag','vault'].includes(toScope)){
   bankTransfer(entry,Infinity,toIndex);
  }
 });
 $('town-interact-button').addEventListener('click',()=>{
  if(lastPosition)interact({...lastPosition,allowed:true,time:getTime()});
 });
 return {interact,update,close,isOpen:()=>!panel.hidden};
}
