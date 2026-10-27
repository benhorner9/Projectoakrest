/** Eight character-owned bindings in the existing Oakrest action deck. */
import {bindClassicPress} from './classic-touch-press.js';
import {DEFAULT_QUICK_SLOTS,assignQuickSlot} from './quick-slots.js';
import {classicItemDetails,quickBindable} from './classic-item-state.js';
import {inventoryEntries} from './equipment-ui.js';
import {getItem,itemIconUrl} from './items.js';
const ICON={hit:'slash',sweep:'sweep',shield:'shield',dash:'dash',dashback:'retreat',bolt:'bolt',burst:'burst',root:'root',nova:'nova',heal:'heal',execute:'execute',retreat:'retreat'};
const LABEL={eat:'Food',drink:'Potion',dodge:'Dodge',attack:'Attack',inventory:'Backpack',equipment:'Equipment',quests:'Quests',skills:'Skills',map:'Map'};
const ACTION_ID={eat:'oakrest-food-slot',drink:'oakrest-potion-slot',dodge:'classic-dodge',attack:'classic-attack'};
export function setupClassicActionBar({doc=document,combat,activateBinding,changed=()=>{},feedback=()=>{},legacyPreferences=false}){
 const $=id=>doc.getElementById(id),deck=$('oakrest-action-deck');
 if(!deck)return {update(){},activate(){},slots:()=>DEFAULT_QUICK_SLOTS.slice()};
 const buttons=[...doc.querySelectorAll('[data-ability]'),$('oakrest-food-slot'),$('oakrest-potion-slot'),$('classic-dodge'),$('classic-attack')];
 const scope=doc.defaultView?.location?.pathname?.split('/').includes('oakrest-dev')?'oakrest-dev':'oakrest';
 const preferenceKey=scope+'-ui-action-slots-v1';
 const validLegacy=raw=>Array.isArray(raw)&&raw.length===4&&new Set(raw).size===4&&raw.every(v=>['eat','drink','dodge','attack'].includes(v));
 // Import old UI order once; new assignments live in the selected character.
 if(!combat.sandboxSave().quickSlots){
  try{const old=JSON.parse(doc.defaultView.localStorage.getItem(preferenceKey)||'null');
   if(validLegacy(old))combat.itemAction({type:'quick-slots',bindings:[...DEFAULT_QUICK_SLOTS.slice(0,4),...old]},{x:0,z:39});
  }catch{}
 }
 const slots=()=>combat.sandboxSave().quickSlots||DEFAULT_QUICK_SLOTS.slice();
 const heading=doc.createElement('div');heading.className='oakrest-action-heading';
 const title=doc.createElement('strong');title.className='oakrest-action-title';heading.append(title);
 const hint=doc.createElement('span');hint.className='oakrest-action-hint';hint.textContent='1–8 · quick actions · Tab · style';heading.append(hint);
 deck.insertBefore(heading,deck.firstChild);
 const styleHead=doc.createElement('div');styleHead.className='oakrest-combat-stance';
 deck.insertBefore(styleHead,deck.querySelector('.classic-action-footer'));styleHead.append($('classic-styles'));
 const edit=doc.createElement('button');edit.type='button';edit.id='oakrest-hotbar-edit';edit.className='oakrest-hotbar-edit';edit.textContent='ARRANGE';
 edit.setAttribute('aria-controls','oakrest-hotbar-editor');edit.setAttribute('aria-expanded','false');edit.title='Assign items or actions to any of eight quick slots';heading.append(edit);
 const editor=doc.createElement('div');editor.id='oakrest-hotbar-editor';editor.className='oakrest-hotbar-editor';editor.hidden=true;
 editor.setAttribute('role','group');editor.setAttribute('aria-label','Assign eight quick slots');deck.append(editor);
 const selects=[];let editorKey='',lastRefresh=-Infinity,lastStyle='',lastHp=-1,lastButtonBindings='';
 const knownActions=[...DEFAULT_QUICK_SLOTS,'inventory','equipment','quests','skills','map'];
 function assign(index,binding){
  if(binding!==null&&!knownActions.includes(binding)&&!quickBindable(binding)){feedback("This item has no quick action.");return false;}
  const bindings=assignQuickSlot(slots(),index,binding);if(!bindings)return false;
  const result=combat.itemAction({type:'quick-slots',bindings},{x:0,z:39});
  feedback(result.reason);if(!result.ok)return false;
  if(legacyPreferences&&validLegacy(bindings.slice(4))&&bindings.slice(0,4).every((v,i)=>v===DEFAULT_QUICK_SLOTS[i])){
   try{doc.defaultView.localStorage.setItem(preferenceKey,JSON.stringify(bindings.slice(4)));}catch{}
  }
  changed();editorKey='';update(combat.getState());return true;
 }
 for(let i=0;i<8;i++){
  const label=doc.createElement('label');label.className='oakrest-hotbar-choice';label.textContent='SLOT '+(i+1);
  const select=doc.createElement('select');select.id='oakrest-hotbar-select-'+(i+1);select.setAttribute('aria-label','Action for quick slot '+(i+1));
  select.addEventListener('change',()=>assign(i,select.value||null));label.append(select);editor.append(label);selects.push(select);
 }
 const reset=doc.createElement('button');reset.type='button';reset.className='oakrest-hotbar-reset';reset.textContent='RESET';editor.append(reset);
 reset.addEventListener('click',()=>{const r=combat.itemAction({type:'quick-slots',bindings:DEFAULT_QUICK_SLOTS.slice()},{x:0,z:39});if(r.ok){if(legacyPreferences)try{doc.defaultView.localStorage.setItem(preferenceKey,JSON.stringify(DEFAULT_QUICK_SLOTS.slice(4)));}catch{}changed();editorKey='';update(combat.getState());}});
 edit.addEventListener('click',()=>{editor.hidden=!editor.hidden;edit.setAttribute('aria-expanded',String(!editor.hidden));editorKey='';update(combat.getState());});
 function describe(binding,state,data){
  if(!binding)return {name:'Empty slot',icon:'empty',ready:false,reason:'Assign an item or action with Arrange.'};
  if(/^ability[0-3]$/.test(binding)){
   const a=state.abilities[Number(binding.at(-1))],remaining=Math.max(0,(a?.cooldownEnd||0)-state.time);
   return {name:a?.name||'Empty ability slot',icon:ICON[a?.kind]||'empty',ready:!!a?.available,remaining,reason:a?.unavailableReason||'Choose an unlocked ability in Combat.'};
  }
  const use=binding==='material.ration'?'eat':binding==='material.woodland-tonic'?'drink':binding;
  if(use==='eat'||use==='drink'){
   const id=use==='eat'?'ration':'woodland-tonic',quantity=data.inventory.materials[id]||0,remaining=Math.max(0,(state.consumableCooldowns?.[use]||0)-state.time);
   return {name:use==='eat'?'Field ration · heals 35 Health':'Woodland tonic · heals 20 Health',icon:use==='eat'?'ration':'tonic',quantity,remaining,
    ready:quantity>0&&state.hp>0&&state.hp<state.maxHp&&remaining===0,
    reason:remaining>0?'Recovering.':!quantity?'None in backpack.':state.hp<=0?'Wait until you recover.':'Health is already full.'};
  }
  if(use==='dodge')return {name:'Dodge',icon:'dodge',remaining:Math.max(0,state.dodgeUntil-state.time),ready:state.hp>0&&state.time>=state.dodgeUntil,reason:'Dodge is recovering.'};
  if(use==='attack')return {name:'Attack selected or nearest enemy',icon:'strike',ready:state.hp>0,reason:'Wait until you recover.'};
  if(LABEL[use])return {name:LABEL[use],icon:use==='equipment'?'gear':use==='inventory'?'bag':use,ready:true};
  const details=classicItemDetails(data,binding,state.style);
  return {name:details?.title||'Unavailable item',icon:'empty',item:binding,ready:!!details?.allowed,reason:'Item not in backpack, incompatible or level locked.'};
 }
 function activate(index){
  const binding=slots()[index],info=describe(binding,combat.getState(),combat.sandboxSave());
  if(!info.ready){feedback(info.reason);return false;}
  const result=activateBinding(binding);update(combat.getState());return result!==false;
 }
 for(let i=0;i<8;i++){
  buttons[i].dataset.scope='quick';buttons[i].dataset.slotIndex=String(i);
  buttons[i].dataset.hotbarSlot=String(i+1);buttons[i].style.gridColumn=String(i+1);buttons[i].style.gridRow='1';
  buttons[i].setAttribute('aria-keyshortcuts',String(i+1));bindClassicPress(buttons[i],()=>activate(i));
 }
 function update(state,force=true){
  if(!state)return;
  if(!force&&state.time-lastRefresh<.08&&state.style===lastStyle&&state.hp===lastHp)return;
  lastRefresh=state.time;lastStyle=state.style;lastHp=state.hp;
  const data=combat.sandboxSave(),bindings=slots();
  if(deck.dataset.combatStyle!==state.style)deck.dataset.combatStyle=state.style;
  const titleText=({melee:'⚔',ranged:'➶',magic:'✧'}[state.style])+' '+state.style.toUpperCase()+' · QUICK ACTIONS';
  if(title.textContent!==titleText)title.textContent=titleText;
  // Stable button IDs are essential on Safari: resetting IDs every simulation
  // update invalidates selectors and repaints the entire action row. Only
  // reassign them when the saved quick-slot bindings actually change.
  const bindingKey=JSON.stringify(bindings);
  if(bindingKey!==lastButtonBindings){
   buttons.forEach((button,i)=>{const id='classic-quick-'+i;if(button.id!==id)button.id=id;});
   buttons.forEach((button,i)=>{const id=ACTION_ID[bindings[i]];if(id&&button.id!==id)button.id=id;});
   lastButtonBindings=bindingKey;
  }
  buttons.forEach((button,i)=>{
   const binding=bindings[i],info=describe(binding,state,data);
   const setData=(key,value)=>{if(button.dataset[key]!==value)button.dataset[key]=value;};
   setData('binding',binding||'');setData('canonical',info.item||'');
   setData('combatStyle',state.style);
   if(button.disabled===!!info.ready)button.disabled=!info.ready;
   const toggle=(name,value)=>{if(button.classList.contains(name)!==value)button.classList.toggle(name,value);};
   toggle('attacking',binding==='attack'&&!!state.target);
   toggle('is-empty',!binding);toggle('on-cooldown',info.remaining>0);
   for(const child of button.childNodes)if(child.nodeType===3&&child.textContent)child.textContent='';
   let svg=button.querySelector('svg.oakrest-action-icon');
   if(!svg){svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('oakrest-action-icon');svg.setAttribute('viewBox','0 0 32 32');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.9');svg.setAttribute('aria-hidden','true');button.prepend(svg);}
   let use=svg.querySelector('use');if(!use){use=doc.createElementNS('http://www.w3.org/2000/svg','use');svg.append(use);}
   const iconHref='./src/oakrest-ui-icons.svg#'+info.icon;
   // Reassigning an external SVG <use> href on every frame causes iPad
   // WebKit to unload/repaint the glyph, visibly flashing the quick bar.
   if(use.getAttribute('href')!==iconHref)use.setAttribute('href',iconHref);
   const iconDisplay=info.item?'none':'';
   if(svg.style.display!==iconDisplay)svg.style.display=iconDisplay;
   let image=button.querySelector('img.classic-quick-item');
   if(info.item){
    if(!image){image=doc.createElement('img');image.className='classic-quick-item';image.alt='';button.prepend(image);}
    const src=itemIconUrl(info.item)||'';
    if(image.getAttribute('src')!==src)image.setAttribute('src',src);
   }else image?.remove();
   const small=button.querySelector('small');
   const smallText=info.remaining>0?info.remaining.toFixed(1)+'s':info.quantity!==undefined?'×'+info.quantity:binding?.startsWith('ability')?String(i+1):LABEL[binding]?.toUpperCase()||' ';
   if(small&&small.textContent!==smallText)small.textContent=smallText;
   const caption=info.name+(info.quantity!==undefined?' · '+info.quantity+' available':'')+(!info.ready?' · '+info.reason:'');
   if(button.title!==caption)button.title=caption;
   if(button.getAttribute('aria-label')!==caption)button.setAttribute('aria-label',caption);
  });
  if(!editor.hidden){
   const items=inventoryEntries(data).filter(e=>quickBindable(e.canonical));
   const key=JSON.stringify([state.style,bindings,items.map(e=>e.canonical),state.abilities.map(a=>a?.name)]);
   if(key!==editorKey){
    const options=[['','Empty'],...knownActions.map(k=>[k,/^ability/.test(k)?'Ability '+(Number(k.at(-1))+1)+' · '+(state.abilities[Number(k.at(-1))]?.name||'empty'):LABEL[k]]),...items.map(e=>[e.canonical,getItem(e.canonical).title])];
    for(let i=0;i<8;i++){
     selects[i].replaceChildren();const list=options.some(([id])=>id===bindings[i])?options:[...options,[bindings[i],getItem(bindings[i])?.title||'Unavailable item']];
     for(const [id,label] of list){const opt=doc.createElement('option');opt.value=id||'';opt.textContent=label;selects[i].append(opt);}selects[i].value=bindings[i]||'';
    }
    editorKey=key;
   }
  }
 }
 return {update,activate,slots,assign};
}
