import {findClassicInteractable} from './classic-interactions.js';
import {RECIPES,ADVENTURE_MATERIALS} from './adventure-content.js';
import {woodcuttingLevel} from './woodcutting.js';
/** Classic 2.5D inventory and economy presentation.
 * DOM concerns stay here. All mutations use combat.itemAction and combat.pickup.
 */
import {getItem,itemIconUrl,itemFromDrop} from './items.js';
import {STYLE_ORDER,LOADOUTS} from './rules.js';
import {classicItemDetails,classicAbilityCatalogue} from './classic-item-state.js';
import {inventoryEntries} from './equipment-ui.js';
import {bankGridEntries} from './town-ui.js';
import {positionedEntries,BAG_MIN_SLOTS,VAULT_MIN_SLOTS} from './item-slot-layout.js';
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
 let mode='inventory',detailId=null,arrange=false,moveStart=null,selectedBank=null,selectedShop=null;
 let combineSource=null,showMaking=false;
 const save=()=>combat.sandboxSave();
 const view=()=>combat.itemSnapshot(style());
 function transact(action){
  const result=combat.itemAction(action,player());
  notify(result.reason||(result.ok?'Action completed':'Action unavailable'));
  if(result.ok)changed();
  render();return result.ok;
 }
 function craftFromBag(kind,choice){
  const result=combat.adventureAction(kind,{choice},player());
  notify(result?.reason||'Unable to make that.');
  if(result?.ok)changed();
  detailId=null;combineSource=null;render();
  return result?.ok===true;
 }
 function showDetails(id){detailId=id;render();}
 function tile(grid,entry,index,scope){
  if(!entry){
   const empty=button(grid,'classic-item-cell empty','',()=>{
    if(arrange&&moveStart&&moveStart.scope===scope){
     transact({type:'reorder',scope,from:moveStart.index,to:index});moveStart=null;
    }
   });
   empty.title='Empty slot '+(index+1);empty.setAttribute('aria-label','Empty item slot '+(index+1));
   return;
  }
  const item=getItem(entry.canonical);
  const cell=button(grid,'classic-item-cell',null,()=>{
   if(arrange){
    if(!moveStart){moveStart={scope,index};render();return;}
    if(moveStart.scope===scope)transact({type:'reorder',scope,from:moveStart.index,to:index});
    moveStart=null;render();return;
   }
   if(mode==='inventory'&&combineSource){
    if(entry.kind==='material'&&entry.id!==combineSource)craftFromBag('combine',{first:combineSource,second:entry.id});
    else {combineSource=null;notify('Choose a different material to combine.');render();}
    return;
   }
   if(mode==='bank'){
    selectedBank={...entry,scope};
    detailId=entry.canonical;render();
   }else showDetails(entry.canonical);
  });
  cell.setAttribute('aria-label','Examine '+(item?.title||entry.id));
  if(moveStart?.scope===scope&&moveStart.index===index)cell.classList.add('move-start');
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
 function examine(parent,id){
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
  if(details.item.kind==='material'&&RECIPES.some(r=>r.station==='inventory'&&Object.hasOwn(r.cost,details.item.legacy.itemId))){
   button(ex,'classic-item-action','USE WITH…',()=>{
    combineSource=details.item.legacy.itemId;detailId=null;render();
   });
  }
  if(details.action)button(ex,'classic-item-action',
   details.equipped?'UNEQUIP':'EQUIP',
   ()=>transact(details.action),!details.allowed);
  if(details.action&&!details.allowed)element(ex,'p','classic-item-warning','You must own this item and meet its requirements.');
 }
 function renderInventory(){
  const data=save(),s=view();
  element(content,'p','classic-muted','Your backpack · '+s.coins+' coins · Tap an item to examine or use materials together.');
  const actions=element(content,'div','classic-item-actions');
  button(actions,arrange?'classic-item-action selected':'classic-item-action',
   arrange?'FINISH ARRANGING':'ARRANGE SLOTS',()=>{
    arrange=!arrange;moveStart=null;render();
   });
  const make=button(actions,'classic-item-action',showMaking?'HIDE RECIPES':'MAKE FROM BAG',()=>{
   showMaking=!showMaking;combineSource=null;render();
  });
  make.setAttribute('aria-expanded',String(showMaking));
  if(combineSource){
   const item=getItem('material.'+combineSource);
   const prompt=element(content,'div','classic-combine-prompt',
    'Using '+(item?.title||combineSource)+' with… Tap a second material in your bag.');
   button(prompt,'classic-item-action','CANCEL',()=>{combineSource=null;render();});
  }
  if(showMaking){
   const maker=element(content,'section','classic-handcraft');
   element(maker,'h3',null,'MAKE FROM YOUR BACKPACK');
   element(maker,'p','classic-muted','Fletching, Inscription and Fieldcraft are made by hand. Metalwork still requires a forge.');
   const materials=data.inventory.materials,progress=data.adventure?.skills||{};
   for(const recipe of RECIPES.filter(r=>r.station==='inventory')){
    const row=element(maker,'div','craft-option');
    element(row,'strong',null,recipe.title);
    element(row,'small',null,Object.entries(recipe.cost).map(([id,n])=>
     (ADVENTURE_MATERIALS[id]?.[0]||getItem('material.'+id)?.title||id)+
     ' '+(materials[id]||0)+'/'+n).join(' · '));
    const level=recipe.profession?woodcuttingLevel(progress[recipe.profession]||0).level:99;
    const ready=Object.entries(recipe.cost).every(([id,n])=>(materials[id]||0)>=n);
    element(row,'small',null,(recipe.profession?recipe.profession+' level '+recipe.level+' · ':'')+
     (ready?'Materials ready':'Gather more materials'));
    button(row,'classic-item-action',ready&&level>=recipe.level?'MAKE':'LOCKED / MATERIALS',
     ()=>craftFromBag('craft',recipe.id),!ready||level<recipe.level);
   }
  }
  grid(content,inventoryEntries(data),'bag','BACKPACK · SIX COLUMNS',BAG_MIN_SLOTS);
  if(detailId)examine(content,detailId);

 }
 function renderEquip(){
  const s=view();
  element(content,'p','classic-muted','Each style remembers a separate nine-slot loadout. Tap a slot to Examine.');
  const styles=element(content,'div','classic-item-style-list');
  for(const key of STYLE_ORDER)button(styles,key===style()?'selected':'',key.toUpperCase(),()=>{
   // Previewing other styles must use the existing style switch controls.
   changed(key);render();
  });
  const doll=element(content,'div','classic-paperdoll');
  for(const slot of s.equipment){
   const tile=button(doll,'classic-paper-slot classic-paper-'+slot.id,
    slot.label,()=>slot.itemId&&showDetails(slot.itemId),!slot.itemId);
   if(slot.itemId)icon(tile,slot.itemId);
   else element(tile,'span','classic-plus','+');
  }
  element(content,'h3','classic-section-title','EQUIPMENT IN BACKPACK');
  const items=inventoryEntries(save()).filter(e=>e.kind==='armour'||
   (e.kind==='weapon'||e.kind==='slot')&&e.style===style());
  const list=element(content,'div','classic-equip-choices');
  for(const e of items){const name=getItem(e.canonical)?.title||e.id;
   const tile=button(list,'classic-equip-choice',name,()=>showDetails(e.canonical));
   icon(tile,e.canonical);
  }
  if(detailId)examine(content,detailId);
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
  const data=save(),current=style(),weapon=data.gear[current];
  element(content,'p','classic-muted','Only unlocked skills can be slotted. Four abilities are saved separately per weapon family.');
  if(!LOADOUTS[current]?.[weapon]){element(content,'p',null,'Equip a weapon first.');return;}
  const list=classicAbilityCatalogue(data,current);
  const slots=data.slots?.[current]?.[LOADOUTS[current][weapon].family]||[];
  for(let i=0;i<4;i++){
   const row=element(content,'div','classic-ability-row');
   element(row,'strong',null,'SLOT '+(i+1)+' · '+(list.find(x=>x.id===slots[i])?.name||'Empty'));
   const select=element(row,'select','classic-ability-select');
   const empty=element(select,'option',null,'— Empty —');empty.value='';
   for(const skill of list){const opt=element(select,'option',null,skill.name+' · Lv '+skill.requiredLevel);
    opt.value=skill.id;opt.disabled=!skill.unlocked;
   }
   select.value=slots[i]||'';
   select.addEventListener('change',()=>transact({type:'ability',style:current,weapon,index:i,id:select.value||null}));
  }
 }
 function render(){
  if(host.hidden)return;
  for(const tab of tabs){
   tab.classList.toggle('active',tab.dataset.itemTab===mode);
   tab.setAttribute('aria-selected',String(tab.dataset.itemTab===mode));
  }
  title.textContent={inventory:'Backpack',equipment:'Equipment',bank:'Oakrest Bank',shop:'General Store',abilities:'Abilities'}[mode];
  subtitle.textContent='OAKREST · CHARACTER INVENTORY';
  content.replaceChildren();
  if(mode==='inventory')renderInventory();
  else if(mode==='equipment')renderEquip();
  else if(mode==='bank')renderBank();
  else if(mode==='shop')renderShop();
  else renderAbilities();
 }
 function open(next='inventory'){
  if(!['inventory','equipment','bank','shop','abilities'].includes(next))return;
  mode=next;detailId=null;selectedBank=null;selectedShop=null;arrange=false;moveStart=null;combineSource=null;
  host.hidden=false;render();onOpen(next);
 }
 function hide(){host.hidden=true;detailId=null;arrange=false;moveStart=null;combineSource=null;onClose();}
 for(const tab of tabs)tab.addEventListener('click',()=>open(tab.dataset.itemTab));
 close.addEventListener('click',hide);
 return {open,hide,render,isOpen:()=>!host.hidden};
}
