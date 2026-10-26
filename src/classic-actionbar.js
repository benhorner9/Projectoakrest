/** Eight real action buttons. The first four are the weapon-family ability
 * slots already persisted by Oakrest; the remaining four are real supply /
 * movement / attack actions. All equip and cooldown rules remain in combat.
 */
import {bindClassicPress} from './classic-touch-press.js';

const MARK=Object.freeze({
 hit:'⚔',sweep:'✶',shield:'⬡',dash:'➟',dashback:'↶',bolt:'✦',
 burst:'≋',root:'⟡',nova:'❄',heal:'✚',execute:'✹',retreat:'➶',
 basic:'⚔',other:'✧'
});
const STYLE_MARK=Object.freeze({melee:'⚔',ranged:'➶',magic:'✧'});
export function setupClassicActionBar({doc=document,combat,consume,feedback=()=>{}}){
 const $=id=>doc.getElementById(id);
 const deck=$('oakrest-action-deck');
 if(!deck)return {update(){},activate(){}};
 const buttons=[...doc.querySelectorAll('[data-ability]')];
 const styles=$('classic-styles');
 const heading=doc.createElement('div');heading.className='oakrest-action-heading';
 const title=doc.createElement('strong');title.className='oakrest-action-title';heading.append(title);
 const instructions=doc.createElement('span');instructions.className='oakrest-action-hint';
 instructions.textContent='1–8 · actions  ·  Tab · switch style';
 heading.append(instructions);
 deck.insertBefore(heading,deck.firstChild);
 const kinds=[...buttons.map((_,index)=>'ability'+index)];
 const utilityBtns=[$('oakrest-food-slot'),$('oakrest-potion-slot'),$('classic-dodge'),$('classic-attack')];
 const all=[...buttons,...utilityBtns];
 // Only the four utility positions may be rearranged. The first four slots
 // remain authoritative equipped abilities for the current combat style.
 const defaults=['eat','drink','dodge','attack'];
 const utilityByName=Object.fromEntries(defaults.map((name,i)=>[name,utilityBtns[i]]));
 const scope=doc.defaultView?.location?.pathname?.split('/').includes('oakrest-dev')?'oakrest-dev':'oakrest';
 const preferenceKey=scope+'-ui-action-slots-v1';
 const validOrder=order=>Array.isArray(order)&&order.length===4&&
  new Set(order).size===4&&order.every(name=>defaults.includes(name));
 let utilityOrder=defaults.slice();
 try{
  const previous=JSON.parse(doc.defaultView.localStorage.getItem(preferenceKey)||'null');
  if(validOrder(previous))utilityOrder=previous;
 }catch{}
 const applyUtilityOrder=()=>{
  utilityOrder.forEach((name,i)=>{
   const element=utilityByName[name],slot=i+5;
   element.style.gridColumn=String(slot);
   element.dataset.hotbarSlot=String(slot);
   element.setAttribute('aria-keyshortcuts',String(slot));
  });
 };
 const saveUtilityOrder=()=>{
  try{doc.defaultView?.localStorage?.setItem(preferenceKey,JSON.stringify(utilityOrder));}catch{}
 };
 // Appearance only: input handling, combat authority and persisted
 // equipped abilities remain unchanged. Each icon is a reusable SVG sprite.
 const iconByKind={hit:'slash',sweep:'sweep',shield:'shield',dash:'dash',
  dashback:'retreat',bolt:'bolt',burst:'burst',root:'root',nova:'nova',
  heal:'heal',execute:'execute',retreat:'retreat',basic:'melee',other:'strike'};
 const spriteBase='./src/oakrest-ui-icons.svg#';
 const setTitle=(element,main,sub,description,iconName='empty')=>{
  if(!element)return;
  let icon=element.querySelector(':scope > svg.oakrest-action-icon');
  if(!icon){
   // Remove only the old decorative Unicode icon; the existing button,
   // listeners, small label and gameplay activation remain intact.
   for(const child of element.childNodes)if(child.nodeType===3)child.textContent='';
   icon=doc.createElementNS('http://www.w3.org/2000/svg','svg');
   icon.setAttribute('viewBox','0 0 32 32');
   icon.setAttribute('fill','none');
   icon.setAttribute('stroke','currentColor');
   icon.setAttribute('stroke-width','1.9');
   icon.setAttribute('stroke-linecap','round');
   icon.setAttribute('stroke-linejoin','round');
   icon.setAttribute('aria-hidden','true');
   icon.classList.add('oakrest-action-icon');
   const ref=doc.createElementNS('http://www.w3.org/2000/svg','use');
   icon.append(ref);element.prepend(icon);
  }
  const target=spriteBase+iconName;
  // Older WebKit may expose SVG firstElementChild late even after append.
  // Reuse or recreate the <use> safely; a missing sprite must never prevent
  // world initialization, movement, inventory or character creation.
  let ref=icon.querySelector('use');
  if(!ref){
   ref=doc.createElementNS('http://www.w3.org/2000/svg','use');
   icon.append(ref);
  }
  if(ref.getAttribute('href')!==target)ref.setAttribute('href',target);
  const small=element.querySelector('small');if(small)small.textContent=sub;
  element.title=description;
  element.setAttribute('aria-label',description);
 };
 const use=index=>{
  if(index<0||index>7)return false;
  if(index<4){
   if(all[index].disabled){feedback('Ability unavailable or on cooldown.');return false;}
   all[index].click();return true;
  }
  const action=utilityOrder[index-4],element=utilityByName[action];
  if(!element||element.disabled){
   if(action==='eat')feedback('No rations available or Health is full.');
   if(action==='drink')feedback('No woodland tonic available or Health is full.');
   return false;
  }
  if(action==='eat'||action==='drink')return consume(action);
  element.click();return true;
 };
 bindClassicPress(utilityBtns[0],()=>{consume('eat');});
 bindClassicPress(utilityBtns[1],()=>{consume('drink');});
 const first=doc.querySelector('.classic-ability-buttons');
 first.setAttribute('aria-label','Four equipped abilities for the current combat style');
 for(let i=0;i<4;i++)all[i].dataset.hotbarSlot=String(i+1);
 applyUtilityOrder();
 function update(snapshot){
  if(!snapshot)return;
  const style=snapshot.style||'melee';
  title.textContent=STYLE_MARK[style]+' '+style.toUpperCase()+' · EQUIPPED ACTIONS';
  deck.dataset.combatStyle=style;
  for(let i=0;i<4;i++){
   const btn=buttons[i],ability=snapshot.abilities?.[i];
   const seconds=ability?Math.max(0,(ability.cooldownEnd||0)-snapshot.time):0;
   setTitle(btn,ability?MARK[ability.kind]||'✧':'◇',seconds>0?seconds.toFixed(1)+'s':' '+(i+1),
    ability?style.toUpperCase()+' · '+ability.name+(seconds>0?' · '+seconds.toFixed(1)+' seconds cooldown':''):
     'Empty '+style+' ability slot '+(i+1)+' · set in Abilities',
    ability?iconByKind[ability.kind]||style:'empty');
   btn.dataset.abilityKind=ability?.kind||'empty';
   btn.dataset.combatStyle=style;
   btn.classList.toggle('is-empty',!ability);
   btn.classList.toggle('on-cooldown',seconds>0);
  }
  const mats=combat.sandboxSave()?.inventory?.materials||{};
  const food=Math.max(0,Math.floor(mats.ration||0)),tonic=Math.max(0,Math.floor(mats['woodland-tonic']||0));
  const available=snapshot.hp>0&&snapshot.hp<snapshot.maxHp;
  const meal=utilityBtns[0],drink=utilityBtns[1];
  setTitle(meal,'♨',food?'×'+food:'FOOD','Field ration · heals 35 Health · '+food+' available','ration');
  setTitle(drink,'✚',tonic?'×'+tonic:'TONIC','Woodland tonic · heals 20 Health · '+tonic+' available','tonic');
  meal.disabled=!available||food===0;drink.disabled=!available||tonic===0;
  setTitle(utilityBtns[2],'↶','DODGE','Dodge · avoid incoming attack','dodge');
  setTitle(utilityBtns[3],'⚔','ATTACK','Attack selected or nearest enemy','strike');
 }
 const styleHead=doc.createElement('div');styleHead.className='oakrest-combat-stance';
 deck.insertBefore(styleHead,deck.querySelector('.classic-action-footer'));
 styleHead.append(styles);
 // iPad-friendly edit surface: choose an action for slots 5–8. Assigning an
 // action automatically swaps it with its current position. No in-combat
 // handler or character inventory/save record is changed.
 const edit=doc.createElement('button');
 edit.type='button';edit.id='oakrest-hotbar-edit';
 edit.className='oakrest-hotbar-edit';
 edit.textContent='ARRANGE';edit.setAttribute('aria-controls','oakrest-hotbar-editor');
 edit.setAttribute('aria-expanded','false');
 edit.title='Rearrange food, potion, dodge and attack across slots 5–8';
 heading.append(edit);
 const editor=doc.createElement('div');
 editor.id='oakrest-hotbar-editor';editor.className='oakrest-hotbar-editor';
 editor.setAttribute('role','group');
 editor.setAttribute('aria-label','Arrange utility action slots 5 through 8');
 editor.hidden=true;deck.append(editor);
 const selects=[];
 const labels={eat:'Food',drink:'Potion',dodge:'Dodge',attack:'Attack'};
 for(let i=0;i<4;i++){
  const label=doc.createElement('label');
  label.className='oakrest-hotbar-choice';label.textContent='SLOT '+(i+5);
  const select=doc.createElement('select');
  select.id='oakrest-hotbar-select-'+(i+5);
  select.setAttribute('aria-label','Action for quick slot '+(i+5));
  for(const name of defaults){
   const option=doc.createElement('option');
   option.value=name;option.textContent=labels[name];select.append(option);
  }
  select.addEventListener('change',()=>{
   const other=utilityOrder.indexOf(select.value);
   if(other<0||other===i)return;
   [utilityOrder[i],utilityOrder[other]]=[utilityOrder[other],utilityOrder[i]];
   applyUtilityOrder();saveUtilityOrder();
   selects.forEach((node,index)=>{node.value=utilityOrder[index];});
  });
  label.append(select);editor.append(label);selects.push(select);
 }
 const reset=doc.createElement('button');
 reset.type='button';reset.className='oakrest-hotbar-reset';
 reset.textContent='RESET';
 reset.title='Restore default utility slot order';
 reset.addEventListener('click',()=>{
  utilityOrder=defaults.slice();applyUtilityOrder();saveUtilityOrder();
  selects.forEach((node,index)=>{node.value=utilityOrder[index];});
 });
 editor.append(reset);
 edit.addEventListener('click',()=>{
  editor.hidden=!editor.hidden;
  edit.setAttribute('aria-expanded',String(!editor.hidden));
  if(!editor.hidden)selects.forEach((node,index)=>{node.value=utilityOrder[index];});
 });
 return {update,activate:use,slots:()=>[...kinds,...utilityOrder]};
}
