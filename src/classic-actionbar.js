/** Four equipped combat skills plus four fixed utility controls; no item quick-slot assignments. */
import {bindClassicPress} from './classic-touch-press.js';
import {DEFAULT_QUICK_SLOTS} from './quick-slots.js';
const ICON={hit:'slash',sweep:'sweep',shield:'shield',dash:'dash',dashback:'retreat',bolt:'bolt',burst:'burst',root:'root',nova:'nova',heal:'heal',execute:'execute',retreat:'retreat'};
const LABEL={eat:'Food',drink:'Potion',dodge:'Dodge',attack:'Attack',inventory:'Backpack',equipment:'Equipment',quests:'Quests',skills:'Skills',map:'Map'};
const ACTION_ID={eat:'oakrest-food-slot',drink:'oakrest-potion-slot',dodge:'classic-dodge',attack:'classic-attack'};
export function setupClassicActionBar({doc=document,combat,activateBinding,feedback=()=>{}}){
 const $=id=>doc.getElementById(id),deck=$('oakrest-action-deck');
 if(!deck)return {update(){},activate(){},slots:()=>DEFAULT_QUICK_SLOTS.slice()};
 const buttons=[...doc.querySelectorAll('[data-ability]'),$('oakrest-food-slot'),$('oakrest-potion-slot'),$('classic-dodge'),$('classic-attack')];
 // Old saves can contain gear quick-slot bindings; ignore those bindings in the HUD.
 const slots=()=>DEFAULT_QUICK_SLOTS.slice();
 const heading=doc.createElement('div');heading.className='oakrest-action-heading';
 const title=doc.createElement('strong');title.className='oakrest-action-title';heading.append(title);
 const hint=doc.createElement('span');hint.className='oakrest-action-hint';hint.textContent='1–4 skills · 5 ration · 6 tonic · 7 dodge · 8 attack';heading.append(hint);
 deck.insertBefore(heading,deck.firstChild);
 const styleHead=doc.createElement('div');styleHead.className='oakrest-combat-stance';
 deck.insertBefore(styleHead,deck.querySelector('.classic-action-footer'));styleHead.append($('classic-styles'));
 let lastRefresh=-Infinity,lastStyle='',lastHp=-1,lastButtonBindings='';
 function assign(){feedback('Equip weapons from your backpack. Choose combat skills in the COMBAT panel.');return false;}
 function describe(binding,state,data){
  if(!binding)return {name:'Empty skill slot',icon:'empty',ready:false,reason:'Choose a combat skill in COMBAT.'};
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
  return {name:'Unavailable action',icon:'empty',ready:false,reason:'Select combat skills in COMBAT; weapons belong in GEAR.'};
 }
 function activate(index){
  const binding=slots()[index],info=describe(binding,combat.getState(),combat.sandboxSave());
  if(!info.ready){feedback(info.reason);return false;}
  const result=activateBinding(binding);update(combat.getState());return result!==false;
 }
 for(let i=0;i<8;i++){
  buttons[i].dataset.hotbarSlot=String(i+1);buttons[i].style.gridColumn=String(i+1);buttons[i].style.gridRow='1';
  buttons[i].setAttribute('aria-keyshortcuts',String(i+1));bindClassicPress(buttons[i],()=>activate(i));
 }
 function update(state,force=true){
  if(!state)return;
  if(!force&&state.time-lastRefresh<.08&&state.style===lastStyle&&state.hp===lastHp)return;
  lastRefresh=state.time;lastStyle=state.style;lastHp=state.hp;
  const data=combat.sandboxSave(),bindings=slots();
  if(deck.dataset.combatStyle!==state.style)deck.dataset.combatStyle=state.style;
  const titleText=({melee:'⚔',ranged:'➶',magic:'✧'}[state.style])+' '+state.style.toUpperCase()+' · COMBAT SKILLS';
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
   setData('binding',binding||'');
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
   const small=button.querySelector('small');
   const smallText=info.remaining>0?info.remaining.toFixed(1)+'s':info.quantity!==undefined?'×'+info.quantity:binding?.startsWith('ability')?String(i+1):LABEL[binding]?.toUpperCase()||' ';
   if(small&&small.textContent!==smallText)small.textContent=smallText;
   const caption=info.name+(info.quantity!==undefined?' · '+info.quantity+' available':'')+(!info.ready?' · '+info.reason:'');
   if(button.title!==caption)button.title=caption;
   if(button.getAttribute('aria-label')!==caption)button.setAttribute('aria-label',caption);
  });

 }
 return {update,activate,slots,assign};
}
